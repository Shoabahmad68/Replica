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
  const [sortConfig, setSortConfig] = useState({ key: null, direction: 'asc' });

  const rowsPerPage = 50;
  const LOCAL_KEY = "sel_t_reports_master_v3";

  // visible columns
  const EXCEL_COLUMNS = [
    "Sr.No", "Date", "Vch No.", "Party Name", "City/Area",
    "Party Group", "State", "ItemName", "Item Group", "Item Category",
    "Qty", "Alt Qty", "Rate", "UOM", "Salesman", "Vch Type", "Amount"
  ];

  // Column widths for better layout
  const columnWidths = {
    "Sr.No": 80,
    "Date": 110,
    "Vch No.": 120,
    "Party Name": 280,
    "City/Area": 150,
    "Party Group": 180,
    "State": 130,
    "ItemName": 250,
    "Item Group": 150,
    "Item Category": 150,
    "Qty": 90,
    "Alt Qty": 90,
    "Rate": 110,
    "UOM": 80,
    "Salesman": 140,
    "Vch Type": 120,
    "Amount": 140
  };

  // ─────────────────────────────────────────────────────────
  // INITIAL LOAD
  // ─────────────────────────────────────────────────────────
  useEffect(() => {
    const saved = localStorage.getItem(LOCAL_KEY);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        setData(parsed);
        setMessage(`✅ Loaded ${parsed.length} rows from saved data`);
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
    setMessage("⏳ Loading from Tally…");

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
        setMessage(`✅ Loaded ${mapped.length} rows from Tally`);
      } else {
        setMessage("⚠️ No data found");
        setData([]);
      }
    } catch (err) {
      setMessage(`❌ Error: ${err.message}`);
    } finally {
      setLoading(false);
    }
  }

  // ─────────────────────────────────────────────────────────
  // XML PARSER
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

      if (name === "IWSPQRSNO") {
        pushItem();
        started = true;
        base = {};
        base["Sr.No"] = value;
        return;
      }

      if (name === "IWSPQRPARTYDATE") base["Date"] = value;
      else if (name === "IWSPQRPARTYVCHNO") base["Vch No."] = value;
      else if (name === "IWSPQRPARTYNAME") base["Party Name"] = value;
      else if (name === "IWSPQRPARTYCITY") base["City/Area"] = value;
      else if (name === "IWSPQRPARTYGRP") base["Party Group"] = value;
      else if (name === "IWSPQRPARTYSTATE") base["State"] = value;
      else if (name === "IWSPQRPARTYSALESMAN") base["Salesman"] = value;
      else if (name === "IWSPQRPARTYVCHTYPE") base["Vch Type"] = value;
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
    setMessage("⏳ Uploading...");
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
      setMessage(`✅ Loaded ${rows.length} rows from ${file.name}`);
    } catch (e) {
      setMessage(`❌ Parse error: ${e.message}`);
    } finally {
      setUploading(false);
    }
  };

  // ─────────────────────────────────────────────────────────
  // SORTING
  // ─────────────────────────────────────────────────────────
  const handleSort = (key) => {
    let direction = 'asc';
    if (sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  // ─────────────────────────────────────────────────────────
  // EXPORTS
  // ─────────────────────────────────────────────────────────
  const handleExportExcel = () => {
    const ws = XLSX.utils.json_to_sheet(filtered);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Data");
    XLSX.writeFile(wb, `Master_Report_${new Date().toISOString().split('T')[0]}.xlsx`);
    setMessage("✅ Excel exported successfully");
  };

  const handleExportPDF = () => {
    const doc = new jsPDF("l", "mm", "a3");
    doc.setFontSize(18);
    doc.text("Master Report", 14, 15);
    doc.setFontSize(10);
    doc.text(`Generated: ${new Date().toLocaleString()}`, 14, 22);
    
    doc.autoTable({
      head: [EXCEL_COLUMNS],
      body: filtered.map(r => EXCEL_COLUMNS.map(c => r[c])),
      startY: 28,
      styles: { fontSize: 6, cellPadding: 1 },
      headStyles: { fillColor: [0, 245, 255], textColor: [0, 0, 0] }
    });
    doc.save(`Master_Report_${new Date().toISOString().split('T')[0]}.pdf`);
    setMessage("✅ PDF exported successfully");
  };

  // ─────────────────────────────────────────────────────────
  // CLEAR
  // ─────────────────────────────────────────────────────────
  const handleClear = () => {
    if (!confirm("Clear all data? This cannot be undone.")) return;
    setData([]);
    localStorage.removeItem(LOCAL_KEY);
    setMessage("✅ Data cleared");
    setPage(1);
  };

  // ─────────────────────────────────────────────────────────
  // SEARCH + FILTER + SORT + PAGINATION
  // ─────────────────────────────────────────────────────────
  let filtered = data.filter(r => {
    const s = searchText.toLowerCase();
    if (filterParty && r["Party Name"] !== filterParty) return false;
    if (!s) return true;
    return EXCEL_COLUMNS.some(c => String(r[c]).toLowerCase().includes(s));
  });

  // Apply sorting
  if (sortConfig.key) {
    filtered = [...filtered].sort((a, b) => {
      const aVal = a[sortConfig.key] || '';
      const bVal = b[sortConfig.key] || '';
      
      if (sortConfig.key === 'Amount' || sortConfig.key === 'Qty' || sortConfig.key === 'Rate') {
        const aNum = parseFloat(aVal) || 0;
        const bNum = parseFloat(bVal) || 0;
        return sortConfig.direction === 'asc' ? aNum - bNum : bNum - aNum;
      }
      
      if (aVal < bVal) return sortConfig.direction === 'asc' ? -1 : 1;
      if (aVal > bVal) return sortConfig.direction === 'asc' ? 1 : -1;
      return 0;
    });
  }

  const totalPages = Math.max(1, Math.ceil(filtered.length / rowsPerPage));
  const start = (page - 1) * rowsPerPage;
  const pageRows = filtered.slice(start, start + rowsPerPage);

  const parties = [...new Set(data.map(r => r["Party Name"]).filter(Boolean))].sort();

  // Calculate totals
  const totalAmount = filtered.reduce((sum, row) => sum + (parseFloat(row["Amount"]) || 0), 0);
  const totalQty = filtered.reduce((sum, row) => sum + (parseFloat(row["Qty"]) || 0), 0);

  // ─────────────────────────────────────────────────────────
  // UI
  // ─────────────────────────────────────────────────────────
  return (
    <DataContext.Provider value={{ data, setData }}>
      <div className="min-h-screen bg-[#0a1628] text-white p-4 md:p-6">
        <div className="max-w-full mx-auto bg-[#12243d] rounded-2xl p-4 md:p-6 border border-[#1e3553] shadow-2xl">

          {/* HEADER */}
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 border-b border-[#1e3553] pb-4 gap-3">
            <div>
              <h2 className="text-2xl md:text-3xl font-bold text-[#00f5ff] flex items-center gap-2">
                📊 MASTER REPORT
              </h2>
              <p className="text-sm text-gray-400 mt-1">
                Total Records: <span className="text-[#00f5ff] font-bold">{filtered.length}</span> 
                {filtered.length !== data.length && <span className="ml-2">(of {data.length})</span>}
              </p>
            </div>
            <div className="bg-[#0f1e33] px-4 py-2 rounded-lg border border-[#00f5ff]">
              <p className="text-xs text-gray-400">Total Amount</p>
              <p className="text-xl font-bold text-green-400">₹{totalAmount.toLocaleString("en-IN", {maximumFractionDigits: 2})}</p>
            </div>
          </div>

          {/* CONTROLS */}
          <div className="flex flex-wrap gap-2 md:gap-3 bg-[#0f1e33] p-3 md:p-4 mb-4 rounded-lg border border-[#1e3553]">
            <input
              type="file"
              accept=".xml,.xls,.xlsx,.csv"
              onChange={(e)=>setFile(e.target.files[0])}
              className="text-xs md:text-sm border border-[#00f5ff] rounded bg-[#0a1628] p-2 flex-1 min-w-[200px]"
            />
            <button 
              onClick={handleUpload} 
              disabled={uploading}
              className="bg-purple-600 hover:bg-purple-700 disabled:bg-gray-600 px-4 py-2 rounded font-semibold text-sm transition-all">
              {uploading ? "⏳ Uploading…" : "📤 Upload"}
            </button>

            <button 
              onClick={loadLatestData} 
              disabled={loading}
              className="bg-[#00f5ff] hover:bg-[#00d4e6] disabled:bg-gray-600 text-black px-4 py-2 rounded font-semibold text-sm transition-all">
              {loading ? "⏳ Loading…" : "🔄 Reload Tally"}
            </button>

            <button onClick={handleExportExcel} className="bg-green-600 hover:bg-green-700 px-4 py-2 rounded font-semibold text-sm transition-all">
              📊 Excel
            </button>
            <button onClick={handleExportPDF} className="bg-orange-500 hover:bg-orange-600 px-4 py-2 rounded font-semibold text-sm transition-all">
              📄 PDF
            </button>
            <button onClick={handleClear} className="bg-red-600 hover:bg-red-700 px-4 py-2 rounded font-semibold text-sm transition-all">
              🧹 Clear
            </button>
          </div>

          {/* MESSAGE BAR */}
          {message && (
            <div className="bg-[#0f1e33] border border-[#1e3553] rounded-lg p-3 mb-4">
              <p className="text-sm text-green-300">{message}</p>
            </div>
          )}

          {/* SEARCH / FILTER */}
          <div className="flex flex-col md:flex-row gap-3 mb-4">
            <input
              value={searchText}
              onChange={(e)=>{ setSearchText(e.target.value); setPage(1); }}
              placeholder="🔍 Search across all columns..."
              className="flex-1 p-2 md:p-3 bg-[#0a1628] border border-[#1e3553] rounded-lg focus:border-[#00f5ff] focus:outline-none text-sm"
            />

            <select
              value={filterParty}
              onChange={(e)=>{ setFilterParty(e.target.value); setPage(1); }}
              className="p-2 md:p-3 bg-[#0a1628] border border-[#1e3553] rounded-lg focus:border-[#00f5ff] focus:outline-none text-sm min-w-[200px]"
            >
              <option value="">🏢 All Parties ({parties.length})</option>
              {parties.map(p => <option key={p} value={p}>{p}</option>)}
            </select>

            {(searchText || filterParty) && (
              <button 
                onClick={()=>{ setSearchText(''); setFilterParty(''); setPage(1); }}
                className="bg-gray-600 hover:bg-gray-700 px-4 py-2 rounded-lg text-sm transition-all"
              >
                ✖ Clear Filters
              </button>
            )}
          </div>

          {/* TABLE WRAPPER - FIXED LAYOUT */}
          <div className="bg-[#0f1e33] rounded-lg border border-[#1e3553] shadow-lg">
            <div 
              className="overflow-auto"
              style={{ 
                maxHeight: "calc(100vh - 450px)",
                minHeight: "400px"
              }}
            >
              <table className="w-full text-xs md:text-sm border-collapse">
                <thead className="sticky top-0 bg-gradient-to-r from-[#132a4a] to-[#1a3d5e] text-[#00f5ff] z-10 shadow-md">
                  <tr>
                    {EXCEL_COLUMNS.map((col, i) => (
                      <th
                        key={col}
                        onClick={() => handleSort(col)}
                        className="px-2 md:px-3 py-3 border-r border-[#1e3553] whitespace-nowrap cursor-pointer hover:bg-[#1a4d6e] transition-colors"
                        style={{ 
                          minWidth: columnWidths[col],
                          maxWidth: columnWidths[col]
                        }}
                      >
                        <div className="flex items-center justify-between gap-1">
                          <span>{col}</span>
                          {sortConfig.key === col && (
                            <span className="text-xs">
                              {sortConfig.direction === 'asc' ? '↑' : '↓'}
                            </span>
                          )}
                        </div>
                      </th>
                    ))}
                  </tr>
                </thead>

                <tbody>
                  {pageRows.length === 0 ? (
                    <tr>
                      <td colSpan={EXCEL_COLUMNS.length} className="text-center py-10 text-gray-400">
                        📭 No data found
                      </td>
                    </tr>
                  ) : (
                    pageRows.map((row, i) => (
                      <tr 
                        key={i} 
                        className={`${i % 2 ? "bg-[#0f1e33]" : "bg-[#132a4a]"} hover:bg-[#1a3d5e] transition-colors`}
                      >
                        {EXCEL_COLUMNS.map((col) => (
                          <td
                            key={col}
                            className="px-2 md:px-3 py-2 border-r border-[#1e3553] whitespace-nowrap overflow-hidden text-ellipsis"
                            style={{ 
                              minWidth: columnWidths[col],
                              maxWidth: columnWidths[col]
                            }}
                            title={row[col]}
                          >
                            {col === "Amount" ? (
                              <span className="font-semibold text-green-400">
                                ₹{Number(row[col] || 0).toLocaleString("en-IN", {maximumFractionDigits: 2})}
                              </span>
                            ) : col === "Qty" || col === "Alt Qty" ? (
                              <span className="font-medium text-blue-300">
                                {Number(row[col] || 0).toLocaleString("en-IN")}
                              </span>
                            ) : (
                              row[col] || "—"
                            )}
                          </td>
                        ))}
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* PAGINATION + STATS */}
          <div className="flex flex-col md:flex-row justify-between items-center mt-4 gap-3">
            <button
              onClick={()=>setPage(Math.max(1, page-1))}
              className="w-full md:w-auto px-5 py-2 bg-[#00f5ff] hover:bg-[#00d4e6] text-black rounded-lg font-semibold disabled:bg-gray-600 disabled:cursor-not-allowed transition-all"
              disabled={page===1}
            >
              ⬅ Previous
            </button>

            <div className="flex items-center gap-3">
              <span className="text-sm">
                Page <span className="font-bold text-[#00f5ff]">{page}</span> of{" "}
                <span className="font-bold text-[#00f5ff]">{totalPages}</span>
              </span>
              <span className="text-xs text-gray-400">
                (Showing {start + 1}-{Math.min(start + rowsPerPage, filtered.length)} of {filtered.length})
              </span>
            </div>

            <button
              onClick={()=>setPage(Math.min(totalPages, page+1))}
              className="w-full md:w-auto px-5 py-2 bg-[#00f5ff] hover:bg-[#00d4e6] text-black rounded-lg font-semibold disabled:bg-gray-600 disabled:cursor-not-allowed transition-all"
              disabled={page===totalPages}
            >
              Next ➡
            </button>
          </div>

          {/* SUMMARY STATS */}
          <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="bg-[#0f1e33] border border-[#1e3553] rounded-lg p-3">
              <p className="text-xs text-gray-400">Total Records</p>
              <p className="text-lg font-bold text-[#00f5ff]">{filtered.length}</p>
            </div>
            <div className="bg-[#0f1e33] border border-[#1e3553] rounded-lg p-3">
              <p className="text-xs text-gray-400">Total Quantity</p>
              <p className="text-lg font-bold text-blue-400">{totalQty.toLocaleString("en-IN")}</p>
            </div>
            <div className="bg-[#0f1e33] border border-[#1e3553] rounded-lg p-3">
              <p className="text-xs text-gray-400">Unique Parties</p>
              <p className="text-lg font-bold text-purple-400">{parties.length}</p>
            </div>
            <div className="bg-[#0f1e33] border border-[#1e3553] rounded-lg p-3">
              <p className="text-xs text-gray-400">Total Value</p>
              <p className="text-lg font-bold text-green-400">₹{totalAmount.toLocaleString("en-IN", {maximumFractionDigits: 2})}</p>
            </div>
          </div>
        </div>
      </div>
    </DataContext.Provider>
  );
}
