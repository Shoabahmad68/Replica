import React, { useState, useEffect, createContext, useContext } from "react";
import axios from "axios";
import jsPDF from "jspdf";
import "jspdf-autotable";
import * as XLSX from "xlsx";
import config from "../config.js";

// Context
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
  const LOCAL_KEY = "sel_t_reports_master_v3";

  // visible columns
  const EXCEL_COLUMNS = [
    "Sr.No", "Date", "Vch No.", "Party Name", "City/Area",
    "Party Group", "State", "ItemName", "Item Group", "Item Category",
    "Qty", "Alt Qty", "Rate", "UOM", "Salesman", "Vch Type", "Amount"
  ];

  // ─────────────────────────────────────────────────────────
  // INITIAL LOAD
  // ─────────────────────────────────────────────────────────
  useEffect(() => {
    const saved = localStorage.getItem(LOCAL_KEY);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        setData(parsed);
        setMessage(`Loaded ${parsed.length} rows from saved data`);
        return;
      } catch (e) {}
    }
    loadLatestData();
  }, []);

  // ─────────────────────────────────────────────────────────
  // LOAD FROM BACKEND
  // ─────────────────────────────────────────────────────────
  async function loadLatestData() {
    setLoading(true);
    setMessage("Loading from Tally…");

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

        const mapped = combined.map((row, i) => {
          const obj = {};
          EXCEL_COLUMNS.forEach(col => { obj[col] = row[col] ?? ""; });
          obj["Sr.No"] = i + 1;
          return obj;
        });

        setData(mapped);
        localStorage.setItem(LOCAL_KEY, JSON.stringify(mapped));
        setMessage(`Loaded ${mapped.length} rows from server`);
      } else {
        setMessage("No data found");
        setData([]);
      }
    } catch (err) {
      setMessage(err.message);
    } finally {
      setLoading(false);
    }
  }

  // ─────────────────────────────────────────────────────────
  // XML PARSER (Full working multi-item logic)
  // ─────────────────────────────────────────────────────────
  const parseXmlText = (xmlText) => {
    const parser = new DOMParser();
    const xml = parser.parseFromString(xmlText, "text/xml");
    const nodes = [...xml.documentElement.childNodes].filter(n => n.nodeType === 1);

    let rows = [];
    let base = {};
    let item = null;
    let started = false;

    function pushItem() {
      if (!item) return;
      const row = EXCEL_COLUMNS.reduce((acc, k) => {
        acc[k] = item[k] ?? base[k] ?? "";
        return acc;
      }, {});
      rows.push(row);
      item = null;
    }

    nodes.forEach(n => {
      const name = n.nodeName;
      const value = n.textContent.trim();

      // New row trigger
      if (name === "IWSPQRSNO") {
        pushItem();
        started = true;
        base = {};
        base["Sr.No"] = value;
        return;
      }

      // Base fields
      if (name === "IWSPQRPARTYDATE") base["Date"] = value;
      else if (name === "IWSPQRPARTYVCHNO") base["Vch No."] = value;
      else if (name === "IWSPQRPARTYNAME") base["Party Name"] = value;
      else if (name === "IWSPQRPARTYCITY") base["City/Area"] = value;
      else if (name === "IWSPQRPARTYGRP") base["Party Group"] = value;
      else if (name === "IWSPQRPARTYSTATE") base["State"] = value;
      else if (name === "IWSPQRPARTYSALESMAN") base["Salesman"] = value;
      else if (name === "IWSPQRPARTYVCHTYPE") base["Vch Type"] = value;

      // Item block
      else if (name === "IWSITEMNAME") {
        pushItem();
        item = { "ItemName": value };
      } else if (name === "IWSITEMGRP") {
        if (!item) item = {};
        item["Item Group"] = value;
      } else if (name === "IWSITEMCTG") {
        if (!item) item = {};
        item["Item Category"] = value;
      } else if (name === "IWSITEMQTY") {
        if (!item) item = {};
        item["Qty"] = value;
      } else if (name === "IWSITEMALTQTY") {
        if (!item) item = {};
        item["Alt Qty"] = value;
      } else if (name === "IWSITEMRATE") {
        if (!item) item = {};
        item["Rate"] = value;
      } else if (name === "IWSITEMRATEUNITS") {
        if (!item) item = {};
        item["UOM"] = value;
      } else if (name === "IWSPQRPARTYAMOUNT") {
        if (item) item["Amount"] = value;
        else base["Amount"] = value;
      }
    });

    if (item) pushItem();
    if (!rows.length && started) rows.push(base);

    return rows.map((r, i) => ({ ...r, "Sr.No": i + 1 }));
  };

  // ─────────────────────────────────────────────────────────
  // Excel parser
  // ─────────────────────────────────────────────────────────
  const parseExcelFile = async (fileObj) => {
    const buffer = await fileObj.arrayBuffer();
    const wb = XLSX.read(buffer);
    const sheet = wb.Sheets[wb.SheetNames[0]];
    const json = XLSX.utils.sheet_to_json(sheet);

    return json.map((r, i) => {
      const temp = {};
      EXCEL_COLUMNS.forEach(col => temp[col] = r[col] ?? "");
      temp["Sr.No"] = i + 1;
      return temp;
    });
  };

  // ─────────────────────────────────────────────────────────
  // UPLOAD HANDLER
  // ─────────────────────────────────────────────────────────
  const handleUpload = async () => {
    if (!file) return alert("Choose a file first!");

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
      setMessage(`Loaded ${rows.length} rows from ${file.name}`);
    } catch (e) {
      setMessage("Parse error");
    } finally {
      setUploading(false);
    }
  };

  // ─────────────────────────────────────────────────────────
  // EXPORTS
  // ─────────────────────────────────────────────────────────
  const handleExportExcel = () => {
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Data");
    XLSX.writeFile(wb, "Master_Report.xlsx");
  };

  const handleExportPDF = () => {
    const doc = new jsPDF("l", "mm", "a3");
    doc.autoTable({
      head: [EXCEL_COLUMNS],
      body: data.map(r => EXCEL_COLUMNS.map(c => r[c])),
      styles: { fontSize: 6 }
    });
    doc.save("Master_Report.pdf");
  };

  // ─────────────────────────────────────────────────────────
  // CLEAR
  // ─────────────────────────────────────────────────────────
  const handleClear = () => {
    if (!confirm("Clear all data?")) return;
    setData([]);
    localStorage.removeItem(LOCAL_KEY);
    setMessage("Cleared");
  };

  // ─────────────────────────────────────────────────────────
  // SEARCH + FILTER + GROUP + PAGINATION
  // ─────────────────────────────────────────────────────────
  const filtered = data.filter(r => {
    const s = searchText.toLowerCase();
    if (filterParty && r["Party Name"] !== filterParty) return false;
    if (!s) return true;
    return EXCEL_COLUMNS.some(c => String(r[c]).toLowerCase().includes(s));
  });

  const totalPages = Math.max(1, Math.ceil(filtered.length / rowsPerPage));
  const start = (page - 1) * rowsPerPage;
  const pageRows = filtered.slice(start, start + rowsPerPage);

  const parties = [...new Set(data.map(r => r["Party Name"]).filter(Boolean))].sort();

  // ─────────────────────────────────────────────────────────
  // UI
  // ─────────────────────────────────────────────────────────
  return (
    <DataContext.Provider value={{ data, setData }}>
      <div className="min-h-screen bg-[#0a1628] text-white p-6">
        <div className="max-w-[98%] mx-auto bg-[#12243d] rounded-2xl p-6 border border-[#1e3553]">

          {/* HEADER */}
          <div className="flex justify-between items-center mb-6 border-b border-[#1e3553] pb-4">
            <h2 className="text-3xl font-bold text-[#00f5ff]">📊 MASTER REPORT</h2>
            <p className="text-xl text-[#00f5ff] font-bold">{data.length}</p>
          </div>

          {/* CONTROLS */}
          <div className="flex flex-wrap gap-3 bg-[#0f1e33] p-4 mb-4 rounded border border-[#1e3553]">
            <input
              type="file"
              accept=".xml,.xls,.xlsx,.csv"
              onChange={(e)=>setFile(e.target.files[0])}
              className="text-sm border border-[#00f5ff] rounded bg-[#0a1628] p-2"
            />
            <button onClick={handleUpload} className="bg-purple-600 px-5 py-2 rounded font-semibold">
              {uploading ? "Uploading…" : "📤 Upload XML/Excel"}
            </button>

            <button onClick={loadLatestData} className="bg-[#00f5ff] text-black px-5 py-2 rounded font-semibold">
              🔄 Reload Tally
            </button>

            <button onClick={handleExportExcel} className="bg-green-600 px-5 py-2 rounded font-semibold">📊 Excel</button>
            <button onClick={handleExportPDF} className="bg-orange-500 px-5 py-2 rounded font-semibold">📄 PDF</button>
            <button onClick={handleClear} className="bg-red-600 px-5 py-2 rounded font-semibold">🧹 Clear</button>

            <span className="ml-auto text-green-300">{message}</span>
          </div>

          {/* SEARCH / FILTER */}
          <div className="flex gap-3 mb-4">
            <input
              value={searchText}
              onChange={(e)=>{ setSearchText(e.target.value); setPage(1); }}
              placeholder="Search…"
              className="w-1/3 p-2 bg-[#0a1628] border border-[#1e3553] rounded"
            />

            <select
              value={filterParty}
              onChange={(e)=>{ setFilterParty(e.target.value); setPage(1); }}
              className="p-2 bg-[#0a1628] border border-[#1e3553] rounded"
            >
              <option value="">Filter by Party</option>
              {parties.map(p => <option key={p} value={p}>{p}</option>)}
            </select>
          </div>

          {/* TABLE WRAPPER (FULL FIX) */}
          <div
  className="bg-[#0f1e33] rounded border border-[#1e3553] 
             overflow-x-auto overflow-y-auto 
             w-full max-w-full relative"
  style={{ maxHeight: "70vh" }}
>

            <table className="min-w-fit w-max text-sm border-collapse table-auto">
              <thead className="sticky top-0 bg-[#132a4a] text-[#00f5ff]">
                <tr>
                  {EXCEL_COLUMNS.map((col, i) => (
                    <th
                      key={col}
                      className={`px-3 py-3 border border-[#1e3553] whitespace-nowrap ${
                        i === 0 ? "sticky left-0 bg-[#132a4a] z-20" : ""
                      }`}
                      style={{ minWidth: 140 }}
                    >
                      {col}
                    </th>
                  ))}
                </tr>
              </thead>

              <tbody>
                {pageRows.map((row, i) => (
                  <tr key={i} className={`${i % 2 ? "bg-[#132a4a]" : "bg-[#0f1e33]"}`}>
                    {EXCEL_COLUMNS.map((col, cindex) => (
                      <td
                        key={col}
                        className={`px-3 py-2 border border-[#1e3553] whitespace-nowrap ${
                          cindex===0 ? "sticky left-0 bg-[#0f1e33] z-10" : ""
                        }`}
                        style={{ minWidth: 140 }}
                      >
                        {col === "Amount"
                          ? `₹${Number(row[col] || 0).toLocaleString("en-IN")}`
                          : row[col] || "—"}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* PAGINATION */}
          <div className="flex justify-between items-center mt-4">
            <button
              onClick={()=>setPage(Math.max(1, page-1))}
              className="px-5 py-2 bg-[#00f5ff] text-black rounded font-semibold"
              disabled={page===1}
            >
              ⬅ Prev
            </button>

            <span>Page {page} of {totalPages}</span>

            <button
              onClick={()=>setPage(Math.min(totalPages, page+1))}
              className="px-5 py-2 bg-[#00f5ff] text-black rounded font-semibold"
              disabled={page===totalPages}
            >
              Next ➡
            </button>
          </div>
        </div>
      </div>
    </DataContext.Provider>
  );
}
