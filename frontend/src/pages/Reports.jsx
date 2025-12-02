// src/pages/Reports.jsx
import React, { useState, useEffect } from "react";
import jsPDF from "jspdf";
import "jspdf-autotable";
import * as XLSX from "xlsx";

export default function Reports() {
  const [data, setData] = useState([]);
  const [filtered, setFiltered] = useState([]);
  const [loading, setLoading] = useState(false);

  // Filters
  const [search, setSearch] = useState("");
  const [partyFilter, setPartyFilter] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [salesmanFilter, setSalesmanFilter] = useState("");
  const [dateFilter, setDateFilter] = useState("all");
  const [customFrom, setCustomFrom] = useState("");
  const [customTo, setCustomTo] = useState("");

  const rowsPerPage = 50;
  const [page, setPage] = useState(1);

  const EXCEL_COLUMNS = [
    "Sr.No", "Date", "Party Name", "Item Name", "Item Category",
    "City/Area", "Item Group", "Salesman", "Qty", "Amount", "Percentage Sales"
  ];

  useEffect(() => { loadData(); }, []);

  async function loadData() {
    setLoading(true);
    try {
      const backendURL = window.location.hostname.includes("localhost")
        ? "http://127.0.0.1:8787"
        : "https://selt-t-backend.selt-3232.workers.dev";

      const res = await fetch(`${backendURL}/api/vouchers?limit=10000`);
      const json = await res.json();

      if (json.success && json.data) {
        const mapped = json.data.map((row, i) => ({
          "Sr.No": i + 1,
          Date: row.date || "",
          "Party Name": row.party_name || "N/A",
          "Item Name": row.item_name || "N/A",
          "Item Category": row.item_category || "N/A",
          "City/Area": row.city_area || "N/A",
          "Item Group": row.item_group || "N/A",
          Salesman: row.salesman || "N/A",
          Qty: parseFloat(row.qty) || 0,
          Amount: parseFloat(row.amount) || 0,
          "Percentage Sales": 0,
        }));

        const totalAmt = mapped.reduce((a, b) => a + (b.Amount || 0), 0);
        mapped.forEach(r => {
          r["Percentage Sales"] = totalAmt ? ((r.Amount / totalAmt) * 100).toFixed(2) + "%" : "0%";
        });

        setData(mapped);
        setFiltered(mapped);
      }
    } catch (e) {
      console.error("Error loading data:", e);
      setData([]);
      setFiltered([]);
    }
    setLoading(false);
  }

  // --- HEADER + FILTER BAR ---
  return (
    <div className="flex flex-col h-[calc(100vh-20px)] w-full bg-[#0a1628] text-white p-2 sm:p-3 overflow-hidden">
      <h2 className="text-xl sm:text-2xl font-bold text-[#00f5ff] mb-2 sm:mb-3">📊 MASTER REPORT</h2>

      <div className="flex flex-wrap items-center gap-2 bg-[#112233] p-2 rounded-xl border border-[#1e3553] mb-3">
        <button onClick={loadData} className="px-3 py-1.5 rounded-lg bg-[#00f5ff] text-black font-bold text-xs">🔄 Reload</button>
        <button onClick={() => {
          const ws = XLSX.utils.json_to_sheet(filtered);
          const wb = XLSX.utils.book_new();
          XLSX.utils.book_append_sheet(wb, ws, "Report");
          XLSX.writeFile(wb, "Master_Report.xlsx");
        }} className="px-3 py-1.5 rounded-lg bg-green-600 text-white font-bold text-xs">📊 Excel</button>
        <button onClick={() => {
          const doc = new jsPDF("l", "mm", "a3");
          doc.text("MASTER REPORT", 14, 15);
          doc.autoTable({
            head: [EXCEL_COLUMNS],
            body: filtered.map((r) => EXCEL_COLUMNS.map((c) => r[c])),
            startY: 20,
            styles: { fontSize: 7 },
          });
          doc.save("Master_Report.pdf");
        }} className="px-3 py-1.5 rounded-lg bg-orange-500 text-white font-bold text-xs">📄 PDF</button>

        <input placeholder="Search..." value={search} onChange={(e) => setSearch(e.target.value)}
          className="px-2 py-1.5 rounded-lg text-xs bg-[#0a1628] border border-[#1e3553] w-32 text-white focus:border-[#00f5ff]" />

        <select value={partyFilter} onChange={(e) => setPartyFilter(e.target.value)} className="px-2 py-1.5 bg-[#0a1628] border border-[#1e3553] rounded-lg text-xs w-32 text-white">
          <option value="">All Parties</option>
          {[...new Set(data.map(d => d["Party Name"]))].map((p) => <option key={p}>{p}</option>)}
        </select>

        <select value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)} className="px-2 py-1.5 bg-[#0a1628] border border-[#1e3553] rounded-lg text-xs w-32 text-white">
          <option value="">All Categories</option>
          {[...new Set(data.map(d => d["Item Category"]))].map((c) => <option key={c}>{c}</option>)}
        </select>

        <select value={salesmanFilter} onChange={(e) => setSalesmanFilter(e.target.value)} className="px-2 py-1.5 bg-[#0a1628] border border-[#1e3553] rounded-lg text-xs w-32 text-white">
          <option value="">All Salesman</option>
          {[...new Set(data.map(d => d["Salesman"]))].map((s) => <option key={s}>{s}</option>)}
        </select>

        {/* Date Filter */}
        <select value={dateFilter} onChange={(e) => setDateFilter(e.target.value)} className="px-2 py-1.5 bg-[#0a1628] border border-[#1e3553] rounded-lg text-xs w-40 text-white">
          <option value="all">All Dates</option>
          <option value="today">Today</option>
          <option value="yesterday">Yesterday</option>
          <option value="thisweek">This Week</option>
          <option value="thismonth">This Month</option>
          <option value="lastmonth">Last Month</option>
          <option value="thisquarter">This Quarter</option>
          <option value="thisyear">This Year</option>
          <option value="lastyear">Last Year</option>
          <option value="custom">Custom</option>
        </select>

        {dateFilter === "custom" && (
          <>
            <input type="date" value={customFrom} onChange={(e) => setCustomFrom(e.target.value)}
              className="px-2 py-1.5 bg-[#0a1628] border border-[#1e3553] rounded-lg text-xs text-white" />
            <input type="date" value={customTo} onChange={(e) => setCustomTo(e.target.value)}
              className="px-2 py-1.5 bg-[#0a1628] border border-[#1e3553] rounded-lg text-xs text-white" />
          </>
        )}
      </div>
      {/* TABLE */}
      <div className="flex-1 w-full overflow-auto rounded-xl border border-[#1e3553] bg-[#112233] custom-scrollbar relative">
        <div className="min-w-[1200px]">
          <table className="w-full text-left border-collapse table-fixed">
            <thead className="bg-[#132a4a] text-[#00f5ff] sticky top-0 z-10 shadow-md">
              <tr>
                {EXCEL_COLUMNS.map((col) => (
                  <th
                    key={col}
                    className="px-3 py-2 border-b border-[#1e3553] whitespace-nowrap font-semibold uppercase tracking-wider text-[10px] sm:text-[11px] text-left"
                    style={{ width: "120px", minWidth: "100px" }}
                  >
                    {col}
                  </th>
                ))}
              </tr>
            </thead>

            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={EXCEL_COLUMNS.length} className="text-center p-10">
                    Loading Data...
                  </td>
                </tr>
              ) : (
                pageRows.map((row) => (
                  <tr
                    key={row["Sr.No"]}
                    className="odd:bg-[#0f1e33] even:bg-[#132a4a] hover:bg-[#1b3a5c] transition-colors"
                  >
                    {EXCEL_COLUMNS.map((c) => (
                      <td
                        key={c}
                        className="px-3 py-1.5 border-b border-[#1e3553] whitespace-nowrap text-gray-300 text-[10px] sm:text-[11px] text-left"
                        style={{ width: "120px", minWidth: "100px" }}
                      >
                        {c === "Amount"
                          ? "₹ " +
                            row[c].toLocaleString("en-IN", {
                              minimumFractionDigits: 2,
                            })
                          : row[c]}
                      </td>
                    ))}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
      {/* PAGINATION */}
      <div className="mt-3 flex-shrink-0 flex justify-between items-center text-[10px] sm:text-xs">
        <button disabled={page === 1} onClick={() => setPage(page - 1)}
          className="px-3 py-1.5 bg-[#00f5ff] text-black font-bold rounded-lg disabled:opacity-40">
          Previous
        </button>
        <span className="text-[#00f5ff] font-bold">Page {page} of {totalPages}</span>
        <button disabled={page === totalPages} onClick={() => setPage(page + 1)}
          className="px-3 py-1.5 bg-[#00f5ff] text-black font-bold rounded-lg disabled:opacity-40">
          Next
        </button>
      </div>

      {/* SUMMARY BAR */}
      <div className="mt-2 flex-shrink-0 flex flex-wrap gap-2 text-[10px] sm:text-xs w-full">
        <div className="px-3 py-2 bg-[#112233] rounded-lg border border-[#1e3553] text-gray-300 flex-1 min-w-[80px] text-center">
          Rec: <span className="text-white font-bold ml-1">{filtered.length}</span>
        </div>
        <div className="px-3 py-2 bg-[#112233] rounded-lg border border-[#1e3553] text-gray-300 flex-1 min-w-[80px] text-center">
          Qty: <span className="text-[#00f5ff] font-bold ml-1">{totalQty.toLocaleString("en-IN")}</span>
        </div>
        <div className="px-3 py-2 bg-[#112233] rounded-lg border border-[#1e3553] text-gray-300 flex-1 min-w-[120px] text-center">
          Amt: <span className="text-green-400 font-bold ml-1">₹ {totalAmount.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</span>
        </div>
      </div>
      {/* --- EXCEL POPUP MODAL --- */}
      {excelOpen && (
        <div className="fixed inset-0 bg-black/80 flex justify-center items-center p-2 sm:p-4 z-50 backdrop-blur-sm">
          <div className="bg-white w-full max-w-7xl h-[90vh] sm:h-[85vh] rounded-sm shadow-2xl flex flex-col overflow-hidden">

            {/* Excel Header */}
            <div className="bg-[#217346] text-white px-3 py-1 flex justify-between items-center text-xs select-none">
              <span className="font-bold truncate">Master_Report.xlsx</span>
              <button onClick={() => setExcelOpen(false)} className="hover:bg-red-500 px-3 py-0.5 rounded font-bold">✕</button>
            </div>

            {/* Toolbar */}
            <div className="bg-[#f3f2f1] border-b border-gray-300 p-2 flex items-center gap-2 text-gray-700 h-16 sm:h-20 select-none overflow-x-auto whitespace-nowrap">
              <div onClick={exportExcel} className="flex flex-col items-center cursor-pointer hover:bg-gray-200 p-1 rounded min-w-[40px]">
                <span className="text-lg">💾</span>
                <span className="text-[9px]">Save</span>
              </div>
            </div>

            {/* Excel Table Content */}
            <div className="flex-1 overflow-auto bg-[#e6e6e6] relative">
              <table className="w-full text-xs border-collapse bg-white cursor-default select-none table-fixed">
                <thead className="bg-[#f3f2f1] text-gray-700 sticky top-0 z-10">
                  <tr>
                    <th className="w-8 sm:w-10 border border-gray-300 bg-[#e6e6e6]"></th>
                    {EXCEL_COLUMNS.map((c, i) => (
                      <th key={c} className="px-1 sm:px-2 py-1 border border-gray-300 font-normal text-center w-24 sm:w-32 bg-[#f3f2f1]">
                        {String.fromCharCode(65 + i)}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((row, rIndex) => (
                    <tr key={rIndex} className="h-6">
                      <td className="border border-gray-300 bg-[#f3f2f1] text-center w-8 sm:w-10 text-gray-500 font-semibold">{rIndex + 1}</td>
                      {EXCEL_COLUMNS.map((c) => (
                        <td key={c} className="px-1 sm:px-2 py-0.5 border border-gray-200 text-black whitespace-nowrap overflow-hidden text-ellipsis">
                          {c === "Amount" && typeof row[c] === 'number'
                            ? row[c].toLocaleString("en-IN", { minimumFractionDigits: 2 })
                            : row[c]}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Footer */}
            <div className="bg-[#f3f2f1] border-t border-gray-300 px-2 py-1 flex items-center text-[10px] sm:text-xs h-8">
              <span className="font-bold text-green-700 border-b-2 border-green-700 px-2 bg-white">Sheet1</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
