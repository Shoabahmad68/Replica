import React, { useState, useEffect, createContext, useContext } from "react";
import axios from "axios";
import jsPDF from "jspdf";
import "jspdf-autotable";
import * as XLSX from "xlsx";
import config from "../config.js";

// Global context (kept same)
export const DataContext = createContext();
export function useReportData() {
  return useContext(DataContext);
}

export default function Reports() {
  // state
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [page, setPage] = useState(1);
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [searchText, setSearchText] = useState("");
  const [filterParty, setFilterParty] = useState("");
  const [groupByCol, setGroupByCol] = useState("");
  const rowsPerPage = 20;
  const LOCAL_KEY = "savedReportData_v2";

  // required visible columns (kept to match your UI)
  const EXCEL_COLUMNS = [
    "Sr.No","Date","Vch No.","Party Name","City/Area","Party Group",
    "State","ItemName","Item Group","Item Category","Qty","Alt Qty",
    "Rate","UOM","Salesman","Vch Type","Amount"
  ];

  useEffect(() => {
    // load from localStorage if present, else call backend
    const saved = localStorage.getItem(LOCAL_KEY);
    if (saved) {
      try { const parsed = JSON.parse(saved); setData(parsed); setMessage(`✅ Loaded ${parsed.length} rows from localStorage`); return; }
      catch(e){ console.warn("localStorage parse failed", e); }
    }
    loadLatestData();
    // eslint-disable-next-line
  }, []);

  // ---------- Backend loader (unchanged behavior) ----------
  async function loadLatestData() {
    setLoading(true);
    setMessage("⏳ Tally से डेटा लोड हो रहा है...");
    try {
      const backend = config.BACKEND_URL || "https://replica-backend.shoabahmad68.workers.dev";
      const res = await axios.get(`${backend}/api/imports/latest`);
      const d = res.data;

      if (d && (d.sales || d.purchase || d.receipt)) {
        const combined = [
          ...(d.sales || []),
          ...(d.purchase || []),
          ...(d.receipt || []),
          ...(d.payment || []),
          ...(d.journal || []),
          ...(d.debit || []),
          ...(d.credit || []),
        ];

        const withSrNo = combined.map((row, i) => {
          // normalize to EXCEL_COLUMNS keys where possible
          const normalized = {};
          EXCEL_COLUMNS.forEach(col => { normalized[col] = row[col] ?? row[col.replace(/\./g, "")] ?? ""; });
          return { "Sr.No": i + 1, ...normalized };
        });

        setData(withSrNo);
        localStorage.setItem(LOCAL_KEY, JSON.stringify(withSrNo));
        setMessage(`✅ ${withSrNo.length} records loaded from backend`);
      } else {
        setMessage("⚠️ कोई डेटा नहीं मिला।");
        setData([]);
      }
    } catch (err) {
      console.error(err);
      setMessage(`❌ Error: ${err.message}`);
      setData([]);
    } finally {
      setLoading(false);
    }
  }

  // ---------------- XML PARSER (robust multi-item handling) ----------------
  // Parses the flat ENVELOPE structure where tags repeat. Outputs rows array mapped to EXCEL_COLUMNS keys.
  const parseXmlText = (xmlText) => {
    const parser = new DOMParser();
    const xml = parser.parseFromString(xmlText, "text/xml");
    // all element children of root
    const nodes = Array.from(xml.documentElement.childNodes).filter(n => n.nodeType === 1);

    let rows = [];
    let party = {};      // party-level fields (Date, Vch No., Party Name, etc.) - reused across items of same invoice
    let currentItem = null;
    let seenAny = false;

    const pushItemIfExists = () => {
      if (currentItem) {
        // merge party-level fields with item-level (prefer item-level when present)
        const merged = {
          ...EXCEL_COLUMNS.reduce((acc, c) => { acc[c] = ""; return acc; }, {}),
          ...party,
          ...currentItem
        };
        rows.push(merged);
        currentItem = null;
      }
    };

    nodes.forEach(n => {
      const name = n.nodeName.trim();
      const value = (n.textContent || "").trim();

      // When a new serial number encountered, that means new record block begins.
      // But sometimes IWSPQRSNO appears multiple times for each item — we treat it as "start of new item within possibly same voucher".
      if (name === "IWSPQRSNO") {
        // If there is a currentItem waiting, push it first
        pushItemIfExists();
        // Update party Sr.No as well, but we will reassign final Sr.No after mapping
        party["Sr.No"] = value || party["Sr.No"] || "";
        seenAny = true;
        return;
      }

      // party-level fields mapping -> put into 'party' object using EXACT columns as keys
      if (name === "IWSPQRPARTYDATE") party["Date"] = value;
      else if (name === "IWSPQRPARTYVCHNO") party["Vch No."] = value;
      else if (name === "IWSPQRPARTYNAME") party["Party Name"] = value;
      else if (name === "IWSPQRPARTYCITY") party["City/Area"] = value;
      else if (name === "IWSPQRPARTYGRP") party["Party Group"] = value;
      else if (name === "IWSPQRPARTYSTATE") party["State"] = value;
      else if (name === "IWSPQRPARTYSALESMAN") party["Salesman"] = value;
      else if (name === "IWSPQRPARTYVCHTYPE") party["Vch Type"] = value;

      // item-level fields: when a new item name appears we treat as start of new currentItem
      else if (name === "IWSITEMNAME") {
        // if previous item exists, push it (we treat multiple item names as separate rows)
        pushItemIfExists();
        currentItem = { "ItemName": value };
      } else if (name === "IWSITEMGRP") {
        if (!currentItem) currentItem = {};
        currentItem["Item Group"] = value;
      } else if (name === "IWSITEMCTG") {
        if (!currentItem) currentItem = {};
        currentItem["Item Category"] = value;
      } else if (name === "IWSITEMQTY") {
        if (!currentItem) currentItem = {};
        currentItem["Qty"] = value;
      } else if (name === "IWSITEMALTQTY") {
        if (!currentItem) currentItem = {};
        currentItem["Alt Qty"] = value;
      } else if (name === "IWSITEMRATE") {
        if (!currentItem) currentItem = {};
        currentItem["Rate"] = value;
      } else if (name === "IWSITEMRATEUNITS") {
        if (!currentItem) currentItem = {};
        currentItem["UOM"] = value;
      } else if (name === "IWSPQRPARTYAMOUNT") {
        // amount could be per-item or invoice-level. Prefer to assign to currentItem if exists, else to party.
        if (currentItem) currentItem["Amount"] = value;
        else party["Amount"] = value;
      } else if (name === "IWSPQRPARTYALIAS") {
        // alias not in visible columns; ignore or could be appended to Party Name if needed
        // skip
      } else if (name === "IWSPQRPARTYCONTACTPER") {
        // not visible but could be stored in Party Name suffix if needed
      } else {
        // ignore unknown tags
      }
    });

    // push last pending item or, if no item occurred but party present, push party as row
    if (currentItem) pushItemIfExists();
    else if (seenAny && Object.keys(party).length) {
      // create a party-only row (no item)
      const merged = {
        ...EXCEL_COLUMNS.reduce((acc, c) => { acc[c] = ""; return acc; }, {}),
        ...party
      };
      rows.push(merged);
    }

    // final normalize: ensure columns exist and Sr.No sequential
    const cleaned = rows.map((r, i) => {
      const obj = {};
      EXCEL_COLUMNS.forEach(col => {
        obj[col] = r[col] ?? "";
      });
      // ensure Sr.No incremental (use index+1 to avoid duplicates)
      obj["Sr.No"] = i + 1;
      return obj;
    });

    return cleaned;
  };

  // ---------------- Excel parser ----------------
  const parseExcelFile = async (fileObj) => {
    const buffer = await fileObj.arrayBuffer();
    const workbook = XLSX.read(buffer);
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const json = XLSX.utils.sheet_to_json(sheet);
    const mapped = json.map((r, i) => {
      // try to map keys to EXCEL_COLUMNS; if keys match roughly accept them
      const obj = {};
      EXCEL_COLUMNS.forEach(col => {
        // permissive mapping: exact or without dots or lowercased keys
        const candidates = [col, col.replace(/\./g, ""), col.toLowerCase(), col.replace(/\s/g, "").toLowerCase()];
        let val = "";
        for (const c of candidates) {
          if (r[c] !== undefined) { val = r[c]; break; }
          // also check original object's keys
          const foundKey = Object.keys(r).find(k => k.replace(/\s|\./g,"").toLowerCase() === c);
          if (foundKey) { val = r[foundKey]; break; }
        }
        obj[col] = val ?? "";
      });
      obj["Sr.No"] = i + 1;
      return obj;
    });
    return mapped;
  };

  // ---------------- handle file upload button click ----------------
  const handleUpload = async () => {
    if (!file) return alert("पहले फ़ाइल चुनें।");
    setUploading(true);
    try {
      const ext = file.name.split(".").pop().toLowerCase();
      let rows = [];
      if (ext === "xml") {
        const txt = await file.text();
        rows = parseXmlText(txt);
      } else {
        rows = await parseExcelFile(file);
      }
      setData(rows);
      localStorage.setItem(LOCAL_KEY, JSON.stringify(rows));
      setPage(1);
      setMessage(`✅ ${rows.length} rows loaded from ${file.name}`);
    } catch (err) {
      console.error(err);
      setMessage("❌ Upload/Parse error");
    } finally {
      setUploading(false);
    }
  };

  // -------------- Export Excel/PDF --------------
  const handleExportExcel = () => {
    if (!data.length) return alert("कोई डेटा नहीं है!");
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Report");
    XLSX.writeFile(wb, `Master_Report_${new Date().toISOString().slice(0,10)}.xlsx`);
  };

  const handleExportPDF = () => {
    if (!data.length) return alert("कोई डेटा नहीं है!");
    const doc = new jsPDF("l", "mm", "a3");
    doc.text("Master Report", 14, 15);
    doc.autoTable({
      head: [EXCEL_COLUMNS],
      body: data.map(r => EXCEL_COLUMNS.map(c => r[c] ?? "")),
      startY: 20,
      styles: { fontSize: 6 },
    });
    doc.save(`Master_Report_${new Date().toISOString().slice(0,10)}.pdf`);
  };

  // -------------- Clear --------------
  const handleClear = () => {
    if (!confirm("सारा डेटा हटाना है?")) return;
    setData([]);
    localStorage.removeItem(LOCAL_KEY);
    setMessage("🧹 Data cleared");
    setPage(1);
  };

  // -------------- Filtering / Searching / Grouping --------------
  const partiesList = Array.from(new Set(data.map(r => (r["Party Name"]||"").trim()).filter(Boolean))).sort();

  // filter + search applied
  const filtered = data.filter(r => {
    const text = searchText.trim().toLowerCase();
    if (filterParty && r["Party Name"] !== filterParty) return false;
    if (!text) return true;
    // search across main visible columns
    return EXCEL_COLUMNS.some(c => String(r[c] || "").toLowerCase().includes(text));
  });

  // grouping summary if selected
  const grouping = {};
  if (groupByCol) {
    filtered.forEach(r => {
      const key = r[groupByCol] || "—";
      if (!grouping[key]) grouping[key] = { count: 0, amount: 0 };
      grouping[key].count += 1;
      const amt = parseFloat(String(r["Amount"] || "").replace(/[^0-9.\-]/g,"")) || 0;
      grouping[key].amount += amt;
    });
  }

  // pagination
  const totalPages = Math.max(1, Math.ceil(filtered.length / rowsPerPage));
  const start = (page - 1) * rowsPerPage;
  const pageRows = filtered.slice(start, start + rowsPerPage);

  // -------------- UI render --------------
  return (
    <DataContext.Provider value={{ data, setData }}>
      <div className="min-h-screen bg-[#0a1628] text-white p-6">
        <div className="max-w-[98%] mx-auto bg-[#12243d] rounded-2xl p-6 shadow-2xl border border-[#1e3553]">
          {/* Header */}
          <div className="flex justify-between items-center mb-6 border-b border-[#1e3553] pb-4">
            <h2 className="text-3xl font-bold text-[#00f5ff]">📊 MASTER REPORT</h2>
            <div className="text-right">
              <p className="text-sm text-gray-400">Total Records</p>
              <p className="text-2xl font-bold text-[#00f5ff]">{data.length}</p>
            </div>
          </div>

          {/* Controls */}
          <div className="flex flex-wrap gap-3 mb-4 items-center bg-[#0f1e33] p-4 rounded-lg border border-[#1e3553]">
            <input
              type="file"
              accept=".xml,.xls,.xlsx,.csv"
              onChange={(e)=>setFile(e.target.files[0])}
              className="text-sm border border-[#00f5ff] rounded-lg bg-[#0a1628] p-2 text-gray-300 file:mr-2 file:py-1 file:px-3 file:rounded file:border-0 file:bg-[#00f5ff] file:text-black file:font-semibold"
            />
            <button onClick={handleUpload}
              disabled={uploading || !file}
              className="bg-purple-600 px-5 py-2 rounded-lg font-semibold hover:bg-purple-700 disabled:opacity-50">
              {uploading ? "⏳ Uploading..." : "📤 Upload XML/Excel"}
            </button>

            <button onClick={loadLatestData} disabled={loading}
              className="bg-[#00f5ff] px-5 py-2 rounded-lg text-black font-semibold hover:bg-[#00d4e6] disabled:opacity-50">
              {loading ? "⏳ Loading..." : "🔄 Reload Tally"}
            </button>

            <button onClick={handleExportExcel} className="bg-green-600 px-5 py-2 rounded-lg font-semibold hover:bg-green-700">📊 Export Excel</button>

            <button onClick={handleExportPDF} className="bg-orange-500 px-5 py-2 rounded-lg font-semibold hover:bg-orange-600">📄 Export PDF</button>

            <button onClick={handleClear} className="bg-red-600 px-5 py-2 rounded-lg font-semibold hover:bg-red-700">🧹 Clear</button>

            <div className="ml-auto text-sm text-green-300 font-medium">
              {message && <span>✅ {message}</span>}
            </div>
          </div>

          {/* Search / Filter / Group */}
          <div className="flex gap-3 items-center mb-4">
            <input
              placeholder="Search across columns..."
              value={searchText}
              onChange={(e)=>{ setSearchText(e.target.value); setPage(1); }}
              className="w-1/3 p-2 rounded border border-[#1e3553] bg-[#0a1628] text-sm"
            />

            <select value={filterParty} onChange={(e)=>{ setFilterParty(e.target.value); setPage(1); }}
              className="p-2 rounded border border-[#1e3553] bg-[#0a1628] text-sm">
              <option value="">— Filter by Party —</option>
              {partiesList.map(p => <option key={p} value={p}>{p}</option>)}
            </select>

            <select value={groupByCol} onChange={(e)=>setGroupByCol(e.target.value)}
              className="p-2 rounded border border-[#1e3553] bg-[#0a1628] text-sm">
              <option value="">— Group / Pivot —</option>
              {EXCEL_COLUMNS.map(c => <option key={c} value={c}>{c}</option>)}
            </select>

            <div className="ml-auto text-sm text-gray-300">Showing {start + 1} to {Math.min(start + rowsPerPage, filtered.length)} of {filtered.length} records</div>
          </div>

          {/* Group summary (if any) */}
          {groupByCol && (
            <div className="mb-4 p-3 bg-[#0f1e33] rounded border border-[#1e3553]">
              <strong className="text-[#4ee1ec]">Group by: </strong>
              <span className="font-semibold">{groupByCol}</span>
              <div className="mt-2 grid grid-cols-3 gap-2">
                {Object.keys(grouping).map(k => (
                  <div key={k} className="p-2 bg-[#122a42] rounded">
                    <div className="text-sm text-gray-300">{k}</div>
                    <div className="text-lg font-bold">{grouping[k].count} rows</div>
                    <div className="text-sm text-green-300">₹{Number(grouping[k].amount).toLocaleString('en-IN')}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Table */}
          <div className="bg-[#0f1e33] rounded-lg border border-[#1e3553] overflow-auto">
            <table className="min-w-full text-sm border-collapse">
              <thead className="bg-[#132a4a] text-[#00f5ff] sticky top-0">
                <tr>
                  {EXCEL_COLUMNS.map((col, idx) => (
                    <th key={col}
                      className={`px-3 py-3 border border-[#1e3553] text-left font-semibold whitespace-nowrap ${idx===0 ? "sticky left-0 bg-[#132a4a] z-20" : ""}`}
                      style={ idx===0 ? { minWidth: 80 } : { minWidth: 140 } }
                    >
                      {col}
                    </th>
                  ))}
                </tr>
              </thead>

              <tbody>
                {pageRows.length > 0 ? pageRows.map((row, i) => (
                  <tr key={i} className={`${i % 2 ? "bg-[#132a4a]" : "bg-[#0f1e33]"} hover:bg-[#1a3a5a]`}>
                    {EXCEL_COLUMNS.map((col, idx) => (
                      <td key={col} className={`px-3 py-2 border border-[#1e3553] whitespace-nowrap ${idx===0? "sticky left-0 bg-inherit z-10": ""}`}
                        style={ idx===0 ? { minWidth: 80 } : {} }
                      >
                        {col === "Amount" && row[col] ? `₹${Number(String(row[col]).replace(/[^0-9.\-]/g,"") || 0).toLocaleString('en-IN')}` : (row[col] || "—")}
                      </td>
                    ))}
                  </tr>
                )) : (
                  <tr>
                    <td colSpan={EXCEL_COLUMNS.length} className="text-center py-8 text-gray-400">📭 कोई डेटा उपलब्ध नहीं है</td>
                  </tr>
                )}
              </tbody>
            </table>

            {/* Pagination */}
            <div className="flex justify-between items-center p-4 border-t border-[#1e3553]">
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                className={`px-5 py-2 rounded-lg font-semibold ${page===1 ? "bg-gray-700 text-gray-500 cursor-not-allowed" : "bg-[#00f5ff] text-black hover:bg-[#00d4e6]"}`}
              >
                ⬅ Previous
              </button>

              <span className="font-semibold text-gray-300">Page {page} of {totalPages}</span>

              <button
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className={`px-5 py-2 rounded-lg font-semibold ${page===totalPages ? "bg-gray-700 text-gray-500 cursor-not-allowed" : "bg-[#00f5ff] text-black hover:bg-[#00d4e6]"}`}
              >
                Next ➡
              </button>
            </div>
          </div>
        </div>
      </div>
    </DataContext.Provider>
  );
}
