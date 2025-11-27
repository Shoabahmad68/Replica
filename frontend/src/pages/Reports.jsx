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

  // ─────────────────────────────────────────────────────────
  // INITIAL LOAD
  // ─────────────────────────────────────────────────────────
  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    const saved = localStorage.getItem(LOCAL_KEY);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed && parsed.length > 0) {
          setData(parsed);
          setMessage(`✅ Loaded ${parsed.length} rows from saved data`);
          return;
        }
      } catch (e) {
        console.error("localStorage parse error:", e);
      }
    }
    await loadLatestData();
  }

  // ─────────────────────────────────────────────────────────
  // LOAD FROM BACKEND
  // ─────────────────────────────────────────────────────────
  async function loadLatestData() {
    setLoading(true);
    setMessage("⏳ Loading from Tally…");

    try {
      const backend = config.BACKEND_URL || "https://replica-backend.shoabahmad68.workers.dev";
      const res = await axios.get(`${backend}/api/imports/latest`, { timeout: 30000 });
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
          EXCEL_COLUMNS.forEach(col => { 
            obj[col] = row[col] !== undefined && row[col] !== null ? String(row[col]).trim() : ""; 
          });
          obj["Sr.No"] = i + 1;
          return obj;
        });

        setData(mapped);
        try {
          localStorage.setItem(LOCAL_KEY, JSON.stringify(mapped));
        } catch (storageError) {
          console.error("localStorage save error:", storageError);
        }
        setMessage(`✅ Loaded ${mapped.length} rows from Tally`);
      } else {
        setMessage("⚠️ No data found in response");
        setData([]);
      }
    } catch (err) {
      console.error("Load error:", err);
      setMessage(`❌ Error: ${err.message}`);
      const saved = localStorage.getItem(LOCAL_KEY);
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          setData(parsed);
          setMessage(`⚠️ Using cached data (${parsed.length} rows)`);
        } catch (e) {}
      }
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
    setMessage("✅ Excel exported");
  };

  const handleExportPDF = () => {
    const doc = new jsPDF("l", "mm", "a3");
    doc.setFontSize(16);
    doc.text("MASTER REPORT", 14, 15);
    doc.setFontSize(9);
    doc.text(`Generated: ${new Date().toLocaleString()}`, 14, 22);
    doc.autoTable({
      head: [EXCEL_COLUMNS],
      body: filtered.map(r => EXCEL_COLUMNS.map(c => r[c])),
      startY: 28,
      styles: { fontSize: 6, cellPadding: 1 },
      headStyles: { fillColor: [0, 245, 255], textColor: [0, 0, 0] }
    });
    doc.save(`Master_Report_${new Date().toISOString().split('T')[0]}.pdf`);
    setMessage("✅ PDF exported");
  };

  // ─────────────────────────────────────────────────────────
  // CLEAR
  // ─────────────────────────────────────────────────────────
  const handleClear = () => {
    if (!confirm("Clear all data?")) return;
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
  const totalAmount = filtered.reduce((sum, row) => sum + (parseFloat(row["Amount"]) || 0), 0);
  const totalQty = filtered.reduce((sum, row) => sum + (parseFloat(row["Qty"]) || 0), 0);

  // ─────────────────────────────────────────────────────────
  // UI - COMPLETELY FIXED LAYOUT
  // ─────────────────────────────────────────────────────────
  return (
    <DataContext.Provider value={{ data, setData }}>
      <div className="min-h-screen bg-gradient-to-br from-[#0a1628] to-[#1a2332] text-white p-3 sm:p-4 lg:p-6">
        <div className="max-w-[1600px] mx-auto bg-gradient-to-br from-[#12243d] to-[#0f1e33] rounded-2xl p-4 sm:p-5 lg:p-6 border border-[#1e3553] shadow-2xl">

          {/* HEADER */}
          <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center mb-5 pb-4 border-b-2 border-[#00f5ff]/30 gap-3">
            <div>
              <h2 className="text-2xl sm:text-3xl font-bold bg-gradient-to-r from-[#00f5ff] to-[#00d4e6] bg-clip-text text-transparent flex items-center gap-2">
                📊 MASTER REPORT
              </h2>
              <p className="text-xs sm:text-sm text-gray-400 mt-1">
                Total Records: <span className="text-[#00f5ff] font-bold">{filtered.length}</span> 
                {filtered.length !== data.length && <span className="ml-2">(of {data.length})</span>}
              </p>
            </div>
            <div className="bg-gradient-to-br from-[#0f1e33] to-[#1a2a45] px-4 py-3 rounded-xl border-2 border-[#00f5ff]/50 shadow-lg">
              <p className="text-xs text-gray-400">Total Amount</p>
              <p className="text-xl sm:text-2xl font-bold bg-gradient-to-r from-green-400 to-emerald-400 bg-clip-text text-transparent">
                ₹{totalAmount.toLocaleString("en-IN", {maximumFractionDigits: 2})}
              </p>
            </div>
          </div>

          {/* CONTROLS */}
          <div className="flex flex-wrap gap-2 bg-gradient-to-r from-[#0f1e33] to-[#1a2a45] p-3 mb-4 rounded-xl border border-[#1e3553] shadow-inner">
            <input
              type="file"
              accept=".xml,.xls,.xlsx,.csv"
              onChange={(e)=>setFile(e.target.files[0])}
              className="text-xs border-2 border-[#00f5ff] rounded-lg bg-[#0a1628] p-2 flex-1 min-w-[180px] focus:outline-none focus:ring-2 focus:ring-[#00f5ff]"
            />
            <button 
              onClick={handleUpload} 
              disabled={uploading}
              className="bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800 disabled:from-gray-600 disabled:to-gray-700 px-4 py-2 rounded-lg font-bold text-xs sm:text-sm transition-all shadow-lg hover:shadow-xl">
              {uploading ? "⏳ Uploading…" : "📤 Upload"}
            </button>
            <button 
              onClick={loadLatestData} 
              disabled={loading}
              className="bg-gradient-to-r from-[#00f5ff] to-[#00d4e6] hover:from-[#00d4e6] hover:to-[#00b8cc] disabled:from-gray-600 disabled:to-gray-700 text-black px-4 py-2 rounded-lg font-bold text-xs sm:text-sm transition-all shadow-lg hover:shadow-xl">
              {loading ? "⏳ Loading…" : "🔄 Reload"}
            </button>
            <button onClick={handleExportExcel} className="bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 px-4 py-2 rounded-lg font-bold text-xs sm:text-sm transition-all shadow-lg">📊 Excel</button>
            <button onClick={handleExportPDF} className="bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 px-4 py-2 rounded-lg font-bold text-xs sm:text-sm transition-all shadow-lg">📄 PDF</button>
            <button onClick={handleClear} className="bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 px-4 py-2 rounded-lg font-bold text-xs sm:text-sm transition-all shadow-lg">🧹 Clear</button>
          </div>

          {/* MESSAGE BAR */}
          {message && (
            <div className="bg-gradient-to-r from-[#0f1e33] to-[#1a2a45] border-l-4 border-green-400 rounded-lg p-3 mb-4 shadow-md">
              <p className="text-xs sm:text-sm text-green-300 font-medium">{message}</p>
            </div>
          )}

          {/* SEARCH / FILTER */}
          <div className="flex flex-col sm:flex-row gap-2 mb-4">
            <input
              value={searchText}
              onChange={(e)=>{ setSearchText(e.target.value); setPage(1); }}
              placeholder="🔍 Search across all columns..."
              className="flex-1 p-3 bg-[#0a1628] border-2 border-[#1e3553] rounded-lg focus:border-[#00f5ff] focus:outline-none focus:ring-2 focus:ring-[#00f5ff]/50 text-sm transition-all"
            />
            <select
              value={filterParty}
              onChange={(e)=>{ setFilterParty(e.target.value); setPage(1); }}
              className="p-3 bg-[#0a1628] border-2 border-[#1e3553] rounded-lg focus:border-[#00f5ff] focus:outline-none focus:ring-2 focus:ring-[#00f5ff]/50 text-sm w-full sm:w-auto min-w-[200px] transition-all"
            >
              <option value="">🏢 All Parties ({parties.length})</option>
              {parties.map(p => <option key={p} value={p}>{p}</option>)}
            </select>
            {(searchText || filterParty) && (
              <button 
                onClick={()=>{ setSearchText(''); setFilterParty(''); setPage(1); }}
                className="bg-gradient-to-r from-gray-600 to-gray-700 hover:from-gray-700 hover:to-gray-800 px-4 py-3 rounded-lg text-sm font-bold transition-all shadow-md whitespace-nowrap">
                ✖ Clear Filters
              </button>
            )}
          </div>

          {/* TABLE - PERFECT FIXED CONTAINER */}
          <div className="bg-gradient-to-br from-[#0a1628] to-[#0f1e33] rounded-xl border-2 border-[#1e3553] shadow-2xl overflow-hidden">
            <div 
              className="overflow-auto custom-scrollbar"
              style={{ 
                maxHeight: "500px",
                width: "100%"
              }}
            >
              <table className="w-full text-[10px] sm:text-xs border-collapse table-fixed">
                <thead className="sticky top-0 bg-gradient-to-r from-[#1a3d5e] to-[#132a4a] text-[#00f5ff] z-10 shadow-lg">
                  <tr>
                    <th className="w-[60px] px-2 py-3 border-r border-[#1e3553] cursor-pointer hover:bg-[#234a6e] transition-colors" onClick={() => handleSort("Sr.No")}>
                      <div className="flex items-center justify-between gap-1">
                        <span>Sr.No</span>
                        {sortConfig.key === "Sr.No" && <span>{sortConfig.direction === 'asc' ? '↑' : '↓'}</span>}
                      </div>
                    </th>
                    <th className="w-[90px] px-2 py-3 border-r border-[#1e3553] cursor-pointer hover:bg-[#234a6e] transition-colors" onClick={() => handleSort("Date")}>
                      <div className="flex items-center justify-between gap-1">
                        <span>Date</span>
                        {sortConfig.key === "Date" && <span>{sortConfig.direction === 'asc' ? '↑' : '↓'}</span>}
                      </div>
                    </th>
                    <th className="w-[100px] px-2 py-3 border-r border-[#1e3553] cursor-pointer hover:bg-[#234a6e] transition-colors" onClick={() => handleSort("Vch No.")}>
                      <div className="flex items-center justify-between gap-1">
                        <span>Vch No.</span>
                        {sortConfig.key === "Vch No." && <span>{sortConfig.direction === 'asc' ? '↑' : '↓'}</span>}
                      </div>
                    </th>
                    <th className="w-[200px] px-2 py-3 border-r border-[#1e3553] cursor-pointer hover:bg-[#234a6e] transition-colors" onClick={() => handleSort("Party Name")}>
                      <div className="flex items-center justify-between gap-1">
                        <span>Party Name</span>
                        {sortConfig.key === "Party Name" && <span>{sortConfig.direction === 'asc' ? '↑' : '↓'}</span>}
                      </div>
                    </th>
                    <th className="w-[120px] px-2 py-3 border-r border-[#1e3553] cursor-pointer hover:bg-[#234a6e] transition-colors" onClick={() => handleSort("City/Area")}>
                      <div className="flex items-center justify-between gap-1">
                        <span>City/Area</span>
                        {sortConfig.key === "City/Area" && <span>{sortConfig.direction === 'asc' ? '↑' : '↓'}</span>}
                      </div>
                    </th>
                    <th className="w-[150px] px-2 py-3 border-r border-[#1e3553] cursor-pointer hover:bg-[#234a6e] transition-colors" onClick={() => handleSort("Party Group")}>
                      <div className="flex items-center justify-between gap-1">
                        <span>Party Group</span>
                        {sortConfig.key === "Party Group" && <span>{sortConfig.direction === 'asc' ? '↑' : '↓'}</span>}
                      </div>
                    </th>
                    <th className="w-[100px] px-2 py-3 border-r border-[#1e3553] cursor-pointer hover:bg-[#234a6e] transition-colors" onClick={() => handleSort("State")}>
                      <div className="flex items-center justify-between gap-1">
                        <span>State</span>
                        {sortConfig.key === "State" && <span>{sortConfig.direction === 'asc' ? '↑' : '↓'}</span>}
                      </div>
                    </th>
                    <th className="w-[200px] px-2 py-3 border-r border-[#1e3553] cursor-pointer hover:bg-[#234a6e] transition-colors" onClick={() => handleSort("ItemName")}>
                      <div className="flex items-center justify-between gap-1">
                        <span>ItemName</span>
                        {sortConfig.key === "ItemName" && <span>{sortConfig.direction === 'asc' ? '↑' : '↓'}</span>}
                      </div>
                    </th>
                    <th className="w-[130px] px-2 py-3 border-r border-[#1e3553] cursor-pointer hover:bg-[#234a6e] transition-colors" onClick={() => handleSort("Item Group")}>
                      <div className="flex items-center justify-between gap-1">
                        <span>Item Group</span>
                        {sortConfig.key === "Item Group" && <span>{sortConfig.direction === 'asc' ? '↑' : '↓'}</span>}
                      </div>
                    </th>
                    <th className="w-[140px] px-2 py-3 border-r border-[#1e3553] cursor-pointer hover:bg-[#234a6e] transition-colors" onClick={() => handleSort("Item Category")}>
                      <div className="flex items-center justify-between gap-1">
                        <span>Item Category</span>
                        {sortConfig.key === "Item Category" && <span>{sortConfig.direction === 'asc' ? '↑' : '↓'}</span>}
                      </div>
                    </th>
                    <th className="w-[80px] px-2 py-3 border-r border-[#1e3553] cursor-pointer hover:bg-[#234a6e] transition-colors" onClick={() => handleSort("Qty")}>
                      <div className="flex items-center justify-between gap-1">
                        <span>Qty</span>
                        {sortConfig.key === "Qty" && <span>{sortConfig.direction === 'asc' ? '↑' : '↓'}</span>}
                      </div>
                    </th>
                    <th className="w-[80px] px-2 py-3 border-r border-[#1e3553] cursor-pointer hover:bg-[#234a6e] transition-colors" onClick={() => handleSort("Alt Qty")}>
                      <div className="flex items-center justify-between gap-1">
                        <span>Alt Qty</span>
                        {sortConfig.key === "Alt Qty" && <span>{sortConfig.direction === 'asc' ? '↑' : '↓'}</span>}
                      </div>
                    </th>
                    <th className="w-[90px] px-2 py-3 border-r border-[#1e3553] cursor-pointer hover:bg-[#234a6e] transition-colors" onClick={() => handleSort("Rate")}>
                      <div className="flex items-center justify-between gap-1">
                        <span>Rate</span>
                        {sortConfig.key === "Rate" && <span>{sortConfig.direction === 'asc' ? '↑' : '↓'}</span>}
                      </div>
                    </th>
                    <th className="w-[70px] px-2 py-3 border-r border-[#1e3553] cursor-pointer hover:bg-[#234a6e] transition-colors" onClick={() => handleSort("UOM")}>
                      <div className="flex items-center justify-between gap-1">
                        <span>UOM</span>
                        {sortConfig.key === "UOM" && <span>{sortConfig.direction === 'asc' ? '↑' : '↓'}</span>}
                      </div>
                    </th>
                    <th className="w-[120px] px-2 py-3 border-r border-[#1e3553] cursor-pointer hover:bg-[#234a6e] transition-colors" onClick={() => handleSort("Salesman")}>
                      <div className="flex items-center justify-between gap-1">
                        <span>Salesman</span>
                        {sortConfig.key === "Salesman" && <span>{sortConfig.direction === 'asc' ? '↑' : '↓'}</span>}
                      </div>
                    </th>
                    <th className="w-[100px] px-2 py-3 border-r border-[#1e3553] cursor-pointer hover:bg-[#234a6e] transition-colors" onClick={() => handleSort("Vch Type")}>
                      <div className="flex items-center justify-between gap-1">
                        <span>Vch Type</span>
                        {sortConfig.key === "Vch Type" && <span>{sortConfig.direction === 'asc' ? '↑' : '↓'}</span>}
                      </div>
                    </th>
                    <th className="w-[120px] px-2 py-3 cursor-pointer hover:bg-[#234a6e] transition-colors" onClick={() => handleSort("Amount")}>
                      <div className="flex items-center justify-between gap-1">
                        <span>Amount</span>
                        {sortConfig.key === "Amount" && <span>{sortConfig.direction === 'asc' ? '↑' : '↓'}</span>}
                      </div>
                    </th>
                  </tr>
                </thead>

                <tbody>
                  {pageRows.length === 0 ? (
                    <tr>
                      <td colSpan={17} className="text-center py-12 text-gray-400 text-sm">
                        {loading ? "⏳ Loading data..." : "📭 No data found"}
                      </td>
                    </tr>
                  ) : (
                    pageRows.map((row, i) => (
                      <tr key={i} className={`${i % 2 ? "bg-[#0f1e33]" : "bg-[#132a4a]"} hover:bg-[#1a3d5e] transition-colors`}>
                        <td className="px-2 py-2 border-r border-[#1e3553] text-center">{row["Sr.No"]}</td>
                        <td className="px-2 py-2 border-r border-[#1e3553] truncate" title={row["Date"]}>{row["Date"] || "—"}</td>
                        <td className="px-2 py-2 border-r border-[#1e3553] truncate" title={row["Vch No."]}>{row["Vch No."] || "—"}</td>
                        <td className="px-2 py-2 border-r border-[#1e3553] truncate font-medium" title={row["Party Name"]}>{row["Party Name"] || "—"}</td>
                        <td className="px-2 py-2 border-r border-[#1e3553] truncate" title={row["City/Area"]}>{row["City/Area"] || "—"}</td>
                        <td className="px-2 py-2 border-r border-[#1e3553] truncate" title={row["Party Group"]}>{row["Party Group"] || "—"}</td>
                        <td className="px-2 py-2 border-r border-[#1e3553] truncate" title={row["State"]}>{row["State"] || "—"}</td>
                        <td className="px-2 py-2 border-r border-[#1e3553] truncate text-blue-300" title={row["ItemName"]}>{row["ItemName"] || "—"}</td>
                        <td className="px-2 py-2 border-r border-[#1e3553] truncate" title={row["Item Group"]}>{row["Item Group"] || "—"}</td>
                        <td className="px-2 py-2 border-r border-[#1e3553] truncate" title={row["Item Category"]}>{row["Item Category"] || "—"}</td>
                        <td className="px-2 py-2 border-r border-[#1e3553] text-right font-medium text-blue-300">{row["Qty"] || "—"}</td>
                        <td className="px-2 py-2 border-r border-[#1e3553] text-right font-medium text-blue-300">{row["Alt Qty"] || "—"}</td>
                        <td className="px-2 py-2 border-r border-[#1e3553] text-right font-medium text-yellow-300">{row["Rate"] || "—"}</td>
                        <td className="px-2 py-2 border-r border-[#1e3553] text-center" title={row["UOM"]}>{row["UOM"] || "—"}</td>
                        <td className="px-2 py-2 border-r border-[#1e3553] truncate" title={row["Salesman"]}>{row["Salesman"] || "—"}</td>
                        <td className="px-2 py-2 border-r border-[#1e3553] truncate" title={row["Vch Type"]}>{row["Vch Type"] || "—"}</td>
                        <td className="px-2 py-2 text-right font-bold text-green-400">
                          ₹{Number(row["Amount"] || 0).toLocaleString("en-IN", {maximumFractionDigits: 2})}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* PAGINATION */}
          <div className="flex flex-col sm:flex-row justify-between items-center mt-4 gap-3">
            <button
              onClick={()=>setPage(Math.max(1, page-1))}
              disabled={page===1}
              className="w-full sm:w-auto px-6 py-3 bg-gradient-to-r from-[#00f5ff] to-[#00d4e6] hover:from-[#00d4e6] hover:to-[#00b8cc] text-black rounded-xl font-bold disabled:from-gray-600 disabled:to-gray-700 disabled:cursor-not-allowed transition-all shadow-lg text-sm">
              ⬅ Previous
            </button>
            <div className="flex flex-col sm:flex-row items-center gap-2 text-xs sm:text-sm">
              <span>Page <span className="font-bold text-[#00f5ff] text-base">{page}</span> of <span className="font-bold text-[#00f5ff] text-base">{totalPages}</span></span>
              <span className="text-xs text-gray-400">({start + 1}-{Math.min(start + rowsPerPage, filtered.length)} of {filtered.length})</span>
            </div>
            <button
              onClick={()=>setPage(Math.min(totalPages, page+1))}
              disabled={page===totalPages}
              className="w-full sm:w-auto px-6 py-3 bg-gradient-to-r from-[#00f5ff] to-[#00d4e6] hover:from-[#00d4e6] hover:to-[#00b8cc] text-black rounded-xl font-bold disabled:from-gray-600 disabled:to-gray-700 disabled:cursor-not-allowed transition-all shadow-lg text-sm">
              Next ➡
            </button>
          </div>

          {/* SUMMARY STATS */}
          <div className="mt-5 grid grid-cols-2 lg:grid-cols-4 gap-3">
            <div className="bg-gradient-to-br from-[#0f1e33] to-[#1a2a45] border-2 border-[#00f5ff]/30 rounded-xl p-3 shadow-lg hover:shadow-xl transition-all">
              <p className="text-[10px] text-gray-400">Total Records</p>
              <p className="text-lg sm:text-2xl font-bold text-[#00f5ff]">{filtered.length}</p>
            </div>
            <div className="bg-gradient-to-br from-[#0f1e33] to-[#1a2a45] border-2 border-blue-400/30 rounded-xl p-3 shadow-lg hover:shadow-xl transition-all">
              <p className="text-[10px] text-gray-400">Total Quantity</p>
              <p className="text-lg sm:text-2xl font-bold text-blue-400">{totalQty.toLocaleString("en-IN")}</p>
            </div>
            <div className="bg-gradient-to-br from-[#0f1e33] to-[#1a2a45] border-2 border-purple-400/30 rounded-xl p-3 shadow-lg hover:shadow-xl transition-all">
              <p className="text-[10px] text-gray-400">Unique Parties</p>
              <p className="text-lg sm:text-2xl font-bold text-purple-400">{parties.length}</p>
            </div>
            <div className="bg-gradient-to-br from-[#0f1e33] to-[#1a2a45] border-2 border-green-400/30 rounded-xl p-3 shadow-lg hover:shadow-xl transition-all">
              <p className="text-[10px] text-gray-400">Total Value</p>
              <p className="text-lg sm:text-2xl font-bold text-green-400">₹{totalAmount.toLocaleString("en-IN", {maximumFractionDigits: 2})}</p>
            </div>
          </div>
        </div>
      </div>

      <style jsx>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 8px;
          height: 8px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: #0a1628;
          border-radius: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: #00f5ff;
          border-radius: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: #00d4e6;
        }
      `}</style>
    </DataContext.Provider>
  );
}
