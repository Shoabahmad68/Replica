// src/pages/Reports.jsx
import React, { useState, useEffect, createContext, useContext } from "react";
import jsPDF from "jspdf";
import "jspdf-autotable";
import * as XLSX from "xlsx";

// CONTEXT
export const DataContext = createContext();
export function useReportData() {
  return useContext(DataContext);
}

export default function Reports() {
  // STATES
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  const [page, setPage] = useState(1);
  const [searchText, setSearchText] = useState("");

  const [filterParty, setFilterParty] = useState("");
  const [filterCategory, setFilterCategory] = useState("");
  const [filterSalesman, setFilterSalesman] = useState("");

  const [dateFilter, setDateFilter] = useState({ start: "", end: "" });

  const [sortConfig, setSortConfig] = useState({ key: null, direction: "asc" });

  const [excelViewOpen, setExcelViewOpen] = useState(false);

  const rowsPerPage = 50;

  const EXCEL_COLUMNS = [
    "Sr.No",
    "Date",
    "Voucher Number",
    "Voucher Type",
    "Party Name",
    "Item Name",
    "Item Group",
    "Item Category",
    "Salesman",
    "City/Area",
    "Qty",
    "Amount",
    "Narration",
  ];

  // IDENTIFY TOTAL ROWS
  const isTotalRow = (row) => {
    try {
      const values = Object.values(row || {}).map(String);
      const keyWords = ["total", "grand", "subtotal", "overall"];
      if (values.some((v) => keyWords.some((kw) => v.toLowerCase().includes(kw)))) return true;
      return false;
    } catch {
      return false;
    }
  };

  // LOAD DATA
  useEffect(() => loadLatestData(), [dateFilter]);

  const loadLatestData = async () => {
    setLoading(true);
    setMessage("Loading…");

    try {
      const backendURL =
        window.location.hostname === "localhost" ? "http://127.0.0.1:8787" : 
        "https://selt-t-backend.selt-3232.workers.dev";

      let url = `${backendURL}/api/vouchers?limit=10000`;

      if (dateFilter.start) url += `&start_date=${dateFilter.start}`;
      if (dateFilter.end) url += `&end_date=${dateFilter.end}`;

      const res = await fetch(url);
      const json = await res.json();

      if (json.success && json.data) {
        const mapped = json.data.map((row, i) => ({
          "Sr.No": i + 1,
          Date: row.date || "",
          "Voucher Number": row.voucher_number || "",
          "Voucher Type": row.voucher_type || "Sales",
          "Party Name": row.party_name || "N/A",
          "Item Name": row.item_name || "N/A",
          "Item Group": row.item_group || "N/A",
          "Item Category": row.item_category || "Sales",
          Salesman: row.salesman || "N/A",
          "City/Area": row.city_area || "N/A",
          Qty: parseFloat(row.qty) || 0,
          Amount: parseFloat(row.amount) || 0,
          Narration: row.narration || "",
        }));

        setData(mapped);
        setMessage(`Loaded ${mapped.length} records`);
      } else {
        setData([]);
        setMessage("No data found");
      }
    } catch (e) {
      setData([]);
      setMessage("Error loading data");
    }

    setLoading(false);
    setPage(1);
  };

  // SORT
  const handleSort = (key) => {
    let direction = "asc";
    if (sortConfig.key === key && sortConfig.direction === "asc") direction = "desc";
    setSortConfig({ key, direction });
  };

  // FILTER
  let filtered = data.filter((r) => !isTotalRow(r));

  filtered = filtered.filter((r) => {
    const s = searchText.toLowerCase();

    if (filterParty && r["Party Name"] !== filterParty) return false;
    if (filterCategory && r["Item Category"] !== filterCategory) return false;
    if (filterSalesman && r["Salesman"] !== filterSalesman) return false;

    if (!s) return true;

    return EXCEL_COLUMNS.some((col) => String(r[col] || "").toLowerCase().includes(s));
  });

  // SORT LOGIC
  if (sortConfig.key) {
    filtered = [...filtered].sort((a, b) => {
      const aVal = a[sortConfig.key];
      const bVal = b[sortConfig.key];

      if (["Qty", "Amount"].includes(sortConfig.key)) {
        return sortConfig.direction === "asc" ? aVal - bVal : bVal - aVal;
      }

      return sortConfig.direction === "asc"
        ? String(aVal).localeCompare(String(bVal))
        : String(bVal).localeCompare(String(aVal));
    });
  }

  // PAGINATION
  const totalPages = Math.max(1, Math.ceil(filtered.length / rowsPerPage));
  const start = (page - 1) * rowsPerPage;
  const pageRows = filtered.slice(start, start + rowsPerPage);

  // FILTER OPTIONS
  const parties = [...new Set(data.map((r) => r["Party Name"]))].filter((v) => v && v !== "N/A");
  const categories = [...new Set(data.map((r) => r["Item Category"]))].filter((v) => v && v !== "N/A");
  const salesmen = [...new Set(data.map((r) => r["Salesman"]))].filter((v) => v && v !== "N/A");

  // TOTALS
  const totalQty = filtered.reduce((a, b) => a + (b.Qty || 0), 0);
  const totalAmount = filtered.reduce((a, b) => a + (b.Amount || 0), 0);

  // EXPORTS
  const handleExportExcel = () => {
    const ws = XLSX.utils.json_to_sheet(filtered);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Report");
    XLSX.writeFile(wb, "Master_Report.xlsx");
  };

  const handleExportPDF = () => {
    const doc = new jsPDF("l", "mm", "a3");

    doc.text("MASTER REPORT", 14, 12);

    doc.autoTable({
      head: [EXCEL_COLUMNS],
      body: filtered.map((row) => EXCEL_COLUMNS.map((c) => row[c])),
      styles: { fontSize: 6 },
    });

    doc.save("Master_Report.pdf");
  };

  return (
    <DataContext.Provider value={{ data }}>
      <div className="p-2 sm:p-4 bg-[#0A1628] text-white min-h-screen">

        {/* HEADER */}
        <div className="bg-[#12243D] p-4 rounded-xl border border-[#1E3553] shadow-xl mb-3">
          <h2 className="text-2xl font-bold text-[#64FFDA] flex items-center gap-2">
            📘 MASTER REPORT
          </h2>
          <p className="text-xs text-gray-400 mt-1">
            Records: <span className="text-[#64FFDA]">{filtered.length}</span>
          </p>
        </div>

        {/* TOP CONTROLS */}
        <div className="flex flex-wrap items-center gap-2 bg-[#12243D] p-3 rounded-xl border border-[#1E3553] mb-3">

          {/* Buttons */}
          <button
            onClick={loadLatestData}
            className="px-3 py-1.5 rounded-lg bg-[#00E5FF] text-black text-xs font-bold shadow"
          >
            🔄 Reload
          </button>

          <button
            onClick={handleExportExcel}
            className="px-3 py-1.5 rounded-lg bg-green-600 hover:bg-green-700 text-xs font-bold"
          >
            📊 Excel
          </button>

          <button
            onClick={handleExportPDF}
            className="px-3 py-1.5 rounded-lg bg-orange-500 hover:bg-orange-600 text-xs font-bold"
          >
            📄 PDF
          </button>

          <button
            onClick={() => setExcelViewOpen(true)}
            className="px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-xs font-bold"
          >
            🧾 Excel View
          </button>

          {/* Search */}
          <input
            value={searchText}
            onChange={(e) => {
              setSearchText(e.target.value);
              setPage(1);
            }}
            placeholder="Search…"
            className="px-2 py-1.5 text-xs rounded-lg bg-[#0A1628] border border-[#1E3553] focus:border-[#00E5FF]"
            style={{ width: "140px" }}
          />
        </div>

        {/* FILTERS */}
        <div className="flex flex-wrap items-center gap-2 bg-[#12243D] p-3 rounded-xl border border-[#1E3553] mb-3">
          
          <select
            value={filterParty}
            onChange={(e) => setFilterParty(e.target.value)}
            className="px-2 py-1.5 text-xs rounded-lg bg-[#0A1628] border border-[#1E3553] w-[150px]"
          >
            <option value="">All Parties</option>
            {parties.map((p) => (
              <option key={p}>{p}</option>
            ))}
          </select>

          <select
            value={filterCategory}
            onChange={(e) => setFilterCategory(e.target.value)}
            className="px-2 py-1.5 text-xs rounded-lg bg-[#0A1628] border border-[#1E3553] w-[150px]"
          >
            <option value="">All Categories</option>
            {categories.map((p) => (
              <option key={p}>{p}</option>
            ))}
          </select>

          <select
            value={filterSalesman}
            onChange={(e) => setFilterSalesman(e.target.value)}
            className="px-2 py-1.5 text-xs rounded-lg bg-[#0A1628] border border-[#1E3553] w-[150px]"
          >
            <option value="">All Salesmen</option>
            {salesmen.map((p) => (
              <option key={p}>{p}</option>
            ))}
          </select>

          {(filterParty || filterCategory || filterSalesman) && (
            <button
              onClick={() => {
                setFilterParty("");
                setFilterCategory("");
                setFilterSalesman("");
              }}
              className="px-3 py-1.5 rounded-lg bg-gray-600 text-xs font-bold"
            >
              ✖ Clear
            </button>
          )}
        </div>

        {/* TABLE */}
        <div className="bg-[#12243D] rounded-xl border border-[#1E3553] overflow-hidden shadow-xl">
          
          {/* Info row */}
          <div className="px-3 py-2 text-[11px] text-gray-300 border-b border-[#1E3553] flex justify-between">
            <span>
              Showing {pageRows.length} rows — Page {page}/{totalPages}
            </span>

            <span>
              Qty:{" "}
              <span className="text-blue-400 font-semibold">
                {totalQty.toLocaleString("en-IN")}
              </span>{" "}
              | Amount:{" "}
              <span className="text-green-400 font-semibold">
                ₹{totalAmount.toLocaleString("en-IN")}
              </span>
            </span>
          </div>

          {/* SCROLL */}
          <div
            className="overflow-auto"
            style={{
              maxHeight: "calc(100vh - 360px)",
            }}
          >
            <table className="min-w-[1300px] w-full text-[11px]">
              <thead className="sticky top-0 bg-[#0B2545] text-[#64FFDA] z-20">
                <tr>
                  {EXCEL_COLUMNS.map((col) => (
                    <th
                      key={col}
                      onClick={() => handleSort(col)}
                      className="px-3 py-2 border-r border-[#1E3553] cursor-pointer whitespace-nowrap hover:bg-[#12385A]"
                    >
                      <div className="flex justify-between">
                        {col}
                        {sortConfig.key === col && (
                          <span>{sortConfig.direction === "asc" ? "▲" : "▼"}</span>
                        )}
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>

              <tbody>
                {pageRows.map((row, i) => (
                  <tr
                    key={i}
                    className={`${
                      i % 2 ? "bg-[#0F1E33]" : "bg-[#13253E]"
                    } hover:bg-[#1A3D5E]`}
                  >
                    {EXCEL_COLUMNS.map((col) => (
                      <td
                        key={col}
                        className={`px-3 py-2 border-r border-[#1E3553] ${
                          col === "Amount"
                            ? "text-right text-green-400 font-bold"
                            : col === "Qty"
                            ? "text-right text-blue-300"
                            : ""
                        }`}
                      >
                        {col === "Amount"
                          ? `₹${Number(row[col]).toLocaleString("en-IN")}`
                          : row[col]}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* PAGINATION */}
        <div className="flex justify-between items-center mt-3">
          <button
            onClick={() => setPage(Math.max(1, page - 1))}
            disabled={page === 1}
            className="px-4 py-2 rounded-lg bg-[#00E5FF] text-black text-xs disabled:bg-gray-600"
          >
            ◀ Prev
          </button>

          <span className="text-xs text-gray-300">
            Page <span className="text-[#64FFDA]">{page}</span> / {totalPages}
          </span>

          <button
            onClick={() => setPage(Math.min(totalPages, page + 1))}
            disabled={page === totalPages}
            className="px-4 py-2 rounded-lg bg-[#00E5FF] text-black text-xs disabled:bg-gray-600"
          >
            Next ▶
          </button>
        </div>

        {/* EXCEL VIEW POPUP */}
        {excelViewOpen && (
          <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-2">
            <div className="bg-[#020617] w-full max-w-6xl h-[75vh] rounded-xl border border-[#00E5FF] shadow-xl overflow-hidden">

              {/* top */}
              <div className="flex justify-between items-center px-4 py-3 bg-[#0F172A] border-b border-[#243447]">
                <h3 className="text-white font-semibold text-sm">Excel View</h3>

                <div className="flex gap-2">
                  <button
                    onClick={handleExportExcel}
                    className="px-3 py-1.5 bg-green-500 rounded text-xs font-bold"
                  >
                    Excel
                  </button>

                  <button
                    onClick={handleExportPDF}
                    className="px-3 py-1.5 bg-orange-500 text-white rounded text-xs font-bold"
                  >
                    PDF
                  </button>

                  <button
                    onClick={() => setExcelViewOpen(false)}
                    className="px-3 py-1.5 bg-red-500 rounded-full text-white text-xs"
                  >
                    ✖
                  </button>
                </div>
              </div>

              {/* content */}
              <div className="h-[calc(75vh-52px)] overflow-auto bg-white">
                <table className="min-w-[1100px] text-[11px]">
                  <thead className="bg-[#E5F4FF] border-b border-[#CBD5E1]">
                    <tr>
                      {EXCEL_COLUMNS.map((col) => (
                        <th key={col} className="px-2 py-1 border-r border-[#CBD5E1] text-left">
                          {col}
                        </th>
                      ))}
                    </tr>
                  </thead>

                  <tbody>
                    {filtered.map((row, idx) => (
                      <tr
                        key={idx}
                        className={idx % 2 ? "bg-[#F8FAFC]" : "bg-white"}
                      >
                        {EXCEL_COLUMNS.map((col) => (
                          <td
                            key={col}
                            className="px-2 py-1 border-r border-[#E2E8F0]"
                          >
                            {col === "Amount"
                              ? Number(row[col]).toLocaleString("en-IN")
                              : row[col]}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

            </div>
          </div>
        )}

      </div>
    </DataContext.Provider>
  );
}
