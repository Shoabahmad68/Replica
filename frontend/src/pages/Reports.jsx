// src/pages/Reports.jsx
import React, { useState, useEffect, createContext, useContext } from "react";
import jsPDF from "jspdf";
import "jspdf-autotable";
import * as XLSX from "xlsx";

export const DataContext = createContext();
export function useReportData() {
  return useContext(DataContext);
}

export default function Reports() {
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

  const [excelPopup, setExcelPopup] = useState(false);

  const COLUMNS = [
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
    "Narration"
  ];

  const rowsPerPage = 50;

  const isTotalRow = (row) => {
    const values = Object.values(row || {}).map((v) =>
      String(v || "").toLowerCase().trim()
    );
    const keywords = ["total", "grand", "subtotal", "overall"];
    if (values.some((v) => keywords.some((k) => v.includes(k)))) return true;
    if (values.every((v) => v === "" || v === "n/a")) return true;
    return false;
  };

  useEffect(() => {
    loadData();
  }, [dateFilter]);

  async function loadData() {
    setLoading(true);
    setMessage("⏳ Loading from backend...");

    try {
      const backendURL =
        window.location.hostname === "localhost"
          ? "http://127.0.0.1:8787"
          : "https://selt-t-backend.selt-3232.workers.dev";

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
          Narration: row.narration || ""
        }));

        setData(mapped);
        setMessage(`✅ Loaded ${mapped.length} records`);
      } else {
        setMessage("⚠ No data found");
        setData([]);
      }
    } catch (err) {
      setMessage(`❌ Error: ${err.message}`);
      setData([]);
    } finally {
      setLoading(false);
      setPage(1);
    }
  }

  const handleSort = (key) => {
    setSortConfig((prev) => ({
      key,
      direction: prev.key === key && prev.direction === "asc" ? "desc" : "asc"
    }));
  };

  // FILTERING
  let filtered = data.filter((r) => !isTotalRow(r));

  filtered = filtered.filter((r) => {
    const s = searchText.toLowerCase();

    if (filterParty && r["Party Name"] !== filterParty) return false;
    if (filterCategory && r["Item Category"] !== filterCategory) return false;
    if (filterSalesman && r["Salesman"] !== filterSalesman) return false;

    if (!s) return true;
    return COLUMNS.some((c) => String(r[c] || "").toLowerCase().includes(s));
  });

  // SORTING
  if (sortConfig.key) {
    filtered = [...filtered].sort((a, b) => {
      let aVal = a[sortConfig.key] ?? "";
      let bVal = b[sortConfig.key] ?? "";

      if (sortConfig.key === "Amount" || sortConfig.key === "Qty") {
        aVal = parseFloat(aVal) || 0;
        bVal = parseFloat(bVal) || 0;
      }

      if (aVal < bVal) return sortConfig.direction === "asc" ? -1 : 1;
      if (aVal > bVal) return sortConfig.direction === "asc" ? 1 : -1;
      return 0;
    });
  }

  const totalPages = Math.max(1, Math.ceil(filtered.length / rowsPerPage));
  const start = (page - 1) * rowsPerPage;
  const pageRows = filtered.slice(start, start + rowsPerPage);

  const parties = [...new Set(data.map((r) => r["Party Name"]).filter((v) => v !== "N/A"))].sort();
  const categories = [...new Set(data.map((r) => r["Item Category"]).filter((v) => v !== "N/A"))].sort();
  const salesmen = [...new Set(data.map((r) => r["Salesman"]).filter((v) => v !== "N/A"))].sort();

  const totalAmount = filtered.reduce((a, b) => a + (b.Amount || 0), 0);
  const totalQty = filtered.reduce((a, b) => a + (b.Qty || 0), 0);

  const exportExcel = () => {
    const ws = XLSX.utils.json_to_sheet(filtered.map((r) => {
      const out = {};
      COLUMNS.forEach((c) => (out[c] = r[c]));
      return out;
    }));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Report");
    XLSX.writeFile(wb, "MASTER_REPORT.xlsx");
  };

  const exportPDF = () => {
    const doc = new jsPDF("l", "mm", "a3");
    doc.setFontSize(14);
    doc.text("MASTER REPORT", 14, 15);
    doc.autoTable({
      head: [COLUMNS],
      body: filtered.map((r) => COLUMNS.map((c) => r[c])),
      startY: 20,
      styles: { fontSize: 7 },
      headStyles: { fillColor: [0, 255, 255], textColor: [0, 0, 0] }
    });
    doc.save("MASTER_REPORT.pdf");
  };

  return (
    <DataContext.Provider value={{ data, setData }}>
      <div className="min-h-screen bg-gradient-to-br from-[#0A192F] via-[#112240] to-[#0A192F] text-gray-100 p-3 sm:p-5">

        {/* TOP HEADER */}
        <div className="max-w-full mx-auto bg-[#112A45]/40 border border-[#1E3A5F] rounded-2xl backdrop-blur-xl p-4 shadow-xl">

          <div className="flex flex-col md:flex-row justify-between items-start md:items-center pb-3 border-b border-[#1E3A5F]">
            <div>
              <h2 className="text-2xl font-bold text-[#64FFDA] tracking-wide">
                📊 MASTER REPORT
              </h2>
              <p className="text-xs text-gray-300">
                Records: <span className="text-[#64FFDA]">{filtered.length}</span>
                {filtered.length !== data.length && (
                  <span className="ml-1 text-gray-400">(of {data.length})</span>
                )}
              </p>
            </div>

            <div className="mt-2 md:mt-0 bg-[#0F1E33] px-4 py-2 rounded-xl border border-[#1E3A5F] shadow-lg">
              <p className="text-[10px]">Total Amount</p>
              <p className="text-xl font-bold text-[#64FFDA]">
                ₹{totalAmount.toLocaleString("en-IN")}
              </p>
            </div>
          </div>

          {/* CONTROLS BAR – ALL IN ONE LINE */}
          <div className="mt-3 flex flex-wrap gap-2 bg-[#0F1E33]/70 p-3 rounded-xl border border-[#1E3A5F] shadow-lg">

            <button
              onClick={loadData}
              className="bg-[#64FFDA] text-black px-3 py-2 rounded-lg font-semibold text-xs hover:bg-[#3BE9C4]"
            >
              🔄 Reload
            </button>

            <button
              onClick={exportExcel}
              className="bg-green-600 text-white px-3 py-2 rounded-lg font-semibold text-xs hover:bg-green-700"
            >
              📊 Excel
            </button>

            <button
              onClick={exportPDF}
              className="bg-orange-600 text-white px-3 py-2 rounded-lg font-semibold text-xs hover:bg-orange-700"
            >
              📄 PDF
            </button>

            <button
              onClick={() => setExcelPopup(true)}
              className="bg-blue-600 text-white px-3 py-2 rounded-lg font-semibold text-xs hover:bg-blue-700"
            >
              🧾 Excel View
            </button>

            {/* SEARCH */}
            <input
              className="flex-1 bg-[#0A192F] border border-[#1E3A5F] rounded-lg px-3 py-2 text-xs focus:ring-1 ring-[#64FFDA]"
              placeholder="🔍 Search..."
              value={searchText}
              onChange={(e) => {
                setSearchText(e.target.value);
                setPage(1);
              }}
            />
          </div>

          {/* FILTERS */}
          <div className="mt-3 grid grid-cols-1 sm:grid-cols-3 gap-2">

            <select
              className="bg-[#0F1E33] border border-[#1E3A5F] rounded-lg px-3 py-2 text-xs"
              value={filterParty}
              onChange={(e) => {
                setFilterParty(e.target.value);
                setPage(1);
              }}
            >
              <option value="">🏢 All Parties</option>
              {parties.map((p) => (
                <option key={p}>{p}</option>
              ))}
            </select>

            <select
              className="bg-[#0F1E33] border border-[#1E3A5F] rounded-lg px-3 py-2 text-xs"
              value={filterCategory}
              onChange={(e) => {
                setFilterCategory(e.target.value);
                setPage(1);
              }}
            >
              <option value="">🏷 All Categories</option>
              {categories.map((c) => (
                <option key={c}>{c}</option>
              ))}
            </select>

            <select
              className="bg-[#0F1E33] border border-[#1E3A5F] rounded-lg px-3 py-2 text-xs"
              value={filterSalesman}
              onChange={(e) => {
                setFilterSalesman(e.target.value);
                setPage(1);
              }}
            >
              <option value="">🧑‍💼 All Salesmen</option>
              {salesmen.map((s) => (
                <option key={s}>{s}</option>
              ))}
            </select>
          </div>

          {/* TABLE */}
          {/* CONTROLS – COMPACT & SINGLE LINE */}
<div className="flex flex-wrap items-center gap-2 bg-[#0F1E33]/70 p-2 rounded-xl border border-[#1E3A5F] shadow-lg">

  <button
    onClick={loadData}
    className="px-3 py-1.5 bg-[#64FFDA] text-black rounded-lg font-semibold text-[10px] hover:bg-[#3BE9C4]"
  >
    🔄 Reload
  </button>

  <button
    onClick={exportExcel}
    className="px-3 py-1.5 bg-green-600 text-white rounded-lg font-semibold text-[10px] hover:bg-green-700"
  >
    📊 Excel
  </button>

  <button
    onClick={exportPDF}
    className="px-3 py-1.5 bg-orange-600 text-white rounded-lg font-semibold text-[10px] hover:bg-orange-700"
  >
    📄 PDF
  </button>

  <button
    onClick={() => setExcelPopup(true)}
    className="px-3 py-1.5 bg-blue-600 text-white rounded-lg font-semibold text-[10px] hover:bg-blue-700"
  >
    🧾 Excel View
  </button>

  {/* compact search */}
  <input
    className="bg-[#0A192F] border border-[#1E3A5F] rounded-md px-2 py-1 text-[11px] w-[150px] focus:ring-1 ring-[#64FFDA]"
    placeholder="Search..."
    value={searchText}
    onChange={(e) => {
      setSearchText(e.target.value);
      setPage(1);
    }}
  />
</div>


{/* COMPACT FILTER ROW – ALL SMALL INPUTS */}
<div className="mt-2 flex flex-wrap gap-2">

  <select
    value={filterParty}
    onChange={(e) => { setFilterParty(e.target.value); setPage(1); }}
    className="px-2 py-1 text-[11px] bg-[#0F1E33] border border-[#1E3A5F] rounded-md w-[150px]"
  >
    <option value="">All Parties</option>
    {parties.map((p) => <option key={p}>{p}</option>)}
  </select>

  <select
    value={filterCategory}
    onChange={(e) => { setFilterCategory(e.target.value); setPage(1); }}
    className="px-2 py-1 text-[11px] bg-[#0F1E33] border border-[#1E3A5F] rounded-md w-[150px]"
  >
    <option value="">All Categories</option>
    {categories.map((c) => <option key={c}>{c}</option>)}
  </select>

  <select
    value={filterSalesman}
    onChange={(e) => { setFilterSalesman(e.target.value); setPage(1); }}
    className="px-2 py-1 text-[11px] bg-[#0F1E33] border border-[#1E3A5F] rounded-md w-[150px]"
  >
    <option value="">All Salesmen</option>
    {salesmen.map((s) => <option key={s}>{s}</option>)}
  </select>

</div>


{/* FINAL TABLE FIX — 100% NO OVERFLOW, NO BREAKING */}
<div className="mt-3 border border-[#1E3A5F] rounded-xl overflow-hidden shadow-xl bg-[#0A192F]">

  <div className="px-3 py-1.5 text-[10px] text-gray-300 border-b border-[#1E3A5F] bg-[#0F1E33] flex justify-between">
    <span>Showing {pageRows.length} rows (Page {page} of {totalPages})</span>
    <span>
      Qty: <span className="text-blue-300">{totalQty}</span> |
      Amount: <span className="text-[#64FFDA]">₹{totalAmount.toLocaleString("en-IN")}</span>
    </span>
  </div>

  {/* dual-scroll wrapper */}
  <div className="overflow-x-auto">
    <div
      className="overflow-y-auto"
      style={{ maxHeight: "calc(100vh - 330px)" }}
    >
      <table className="min-w-full text-[11px]">

        <thead className="sticky top-0 bg-[#0B2545] text-[#64FFDA] shadow-md">
          <tr>
            {COLUMNS.map((col) => (
              <th
                key={col}
                onClick={() => handleSort(col)}
                className="px-3 py-2 border-r border-[#11355F] cursor-pointer hover:bg-[#123A6B] whitespace-nowrap"
              >
                <div className="flex items-center justify-between">
                  {col}
                  {sortConfig.key === col && (
                    <span>{sortConfig.direction === "asc" ? "↑" : "↓"}</span>
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
              className={`${i % 2 ? "bg-[#10263F]" : "bg-[#0F1E33]"} hover:bg-[#123A6B]`}
            >
              {COLUMNS.map((c, j) => (
                <td
                  key={j}
                  className={`px-3 py-2 border-r border-[#1E3A5F] whitespace-nowrap ${
                    c === "Amount"
                      ? "text-right text-[#64FFDA] font-semibold"
                      : c === "Qty"
                      ? "text-right text-blue-300"
                      : ""
                  }`}
                >
                  {c === "Amount"
                    ? `₹${(row[c] || 0).toLocaleString("en-IN")}`
                    : row[c] || "—"}
                </td>
              ))}
            </tr>
          ))}
        </tbody>

      </table>
    </div>
  </div>
</div>

          {/* PAGINATION */}
          <div className="mt-3 flex justify-between items-center">
            <button
              disabled={page === 1}
              onClick={() => setPage(page - 1)}
              className="px-4 py-2 bg-[#64FFDA] text-black rounded-lg font-bold text-xs disabled:bg-gray-600"
            >
              ⬅ Prev
            </button>

            <p className="text-xs">
              Page <span className="text-[#64FFDA]">{page}</span> / {totalPages}
            </p>

            <button
              disabled={page === totalPages}
              onClick={() => setPage(page + 1)}
              className="px-4 py-2 bg-[#64FFDA] text-black rounded-lg font-bold text-xs disabled:bg-gray-600"
            >
              Next ➡
            </button>
          </div>
        </div>

        {/* EXCEL POPUP */}
        {excelPopup && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center px-3">
            <div className="bg-[#020617] rounded-xl w-full max-w-6xl h-[70vh] shadow-2xl border border-[#38bdf8]/40 overflow-hidden">
              <div className="flex justify-between items-center px-4 py-3 border-b border-[#1e293b] bg-[#0f172a]">
                <h3 className="text-sm text-gray-200">
                  Excel View — {filtered.length} rows
                </h3>
                <div className="flex gap-2">
                  <button
                    onClick={exportExcel}
                    className="px-3 py-1.5 text-xs font-bold bg-green-600 text-black rounded hover:bg-green-700"
                  >
                    Excel
                  </button>
                  <button
                    onClick={exportPDF}
                    className="px[3] py-1.5 text-xs font-bold bg-orange-600 rounded hover:bg-orange-700"
                  >
                    PDF
                  </button>
                  <button
                    onClick={() => setExcelPopup(false)}
                    className="w-8 h-8 bg-red-500 text-white rounded-full flex items-center justify-center hover:bg-red-600"
                  >
                    ✕
                  </button>
                </div>
              </div>

              <div className="h-[calc(70vh-55px)] overflow-auto bg-white">
                <table className="min-w-[1100px] text-[11px]">
                  <thead className="bg-[#e8f5ff] border-b border-[#cbd5e1]">
                    <tr>
                      {COLUMNS.map((c) => (
                        <th
                          key={c}
                          className="px-2 py-2 text-left border-r border-[#d9e4ef]"
                        >
                          {c}
                        </th>
                      ))}
                    </tr>
                  </thead>

                  <tbody>
                    {filtered.map((r, i) => (
                      <tr
                        key={i}
                        className={i % 2 ? "bg-[#f8fafc]" : "bg-white"}
                      >
                        {COLUMNS.map((c) => (
                          <td
                            key={c}
                            className="px-2 py-1 border-r border-[#e2e8f0] whitespace-nowrap"
                          >
                            {c === "Amount"
                              ? r[c].toLocaleString("en-IN")
                              : r[c]}
                          </td>
                        ))}
                      </tr>
                    ))}

                    <tr className="bg-[#dcfce7] border-t border-green-600 font-semibold">
                      <td colSpan={10} className="px-2 py-2 text-right">
                        TOTAL ({filtered.length})
                      </td>
                      <td className="px-2 py-2 text-right">
                        {totalQty.toLocaleString("en-IN")}
                      </td>
                      <td className="px-2 py-2 text-right">
                        {totalAmount.toLocaleString("en-IN")}
                      </td>
                      <td />
                    </tr>
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
