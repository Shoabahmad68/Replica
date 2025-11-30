import React, { useState, useEffect, createContext, useContext } from "react";
import jsPDF from "jspdf";
import "jspdf-autotable";
import * as XLSX from "xlsx";

// Context
export const DataContext = createContext();
export function useReportData() {
  return useContext(DataContext);
}

export default function Reports() {
  // State
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [page, setPage] = useState(1);
  const [searchText, setSearchText] = useState("");
  const [filterParty, setFilterParty] = useState("");
  const [filterCategory, setFilterCategory] = useState("");
  const [filterSalesman, setFilterSalesman] = useState("");
  const [dateFilter, setDateFilter] = useState({ start: '', end: '' });
  const [sortConfig, setSortConfig] = useState({ key: null, direction: 'asc' });

  const rowsPerPage = 50;

  // Visible columns
  const EXCEL_COLUMNS = [
    "Sr.No", "Date", "Voucher Number", "Voucher Type", "Party Name",
    "Item Name", "Item Group", "Item Category", "Salesman", "City/Area",
    "Qty", "Amount", "Narration"
  ];

  // ─────────────────────────────────────────────────────────
  // INITIAL LOAD
  // ─────────────────────────────────────────────────────────
  useEffect(() => {
    loadLatestData();
  }, [dateFilter]);

  async function loadLatestData() {
    setLoading(true);
    setMessage("⏳ Loading from backend...");

    try {
      const backendURL =
        window.location.hostname === "localhost" ||
        window.location.hostname === "127.0.0.1"
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
          "Date": row.date || "",
          "Voucher Number": row.voucher_number || "",
          "Voucher Type": row.voucher_type || "Sales",
          "Party Name": row.party_name || "N/A",
          "Item Name": row.item_name || "N/A",
          "Item Group": row.item_group || "N/A",
          "Item Category": row.item_category || "Sales",
          "Salesman": row.salesman || "N/A",
          "City/Area": row.city_area || "N/A",
          "Qty": parseFloat(row.qty) || 0,
          "Amount": parseFloat(row.amount) || 0,
          "Narration": row.narration || ""
        }));

        setData(mapped);
        setMessage(`✅ Loaded ${mapped.length} records from backend`);
      } else {
        setMessage("⚠️ No data found");
        setData([]);
      }
    } catch (err) {
      console.error("❌ Error:", err);
      setMessage(`❌ Error: ${err.message}`);
      setData([]);
    } finally {
      setLoading(false);
    }
  }

  // ─────────────────────────────────────────────────────────
  // SORT
  // ─────────────────────────────────────────────────────────
  const handleSort = (key) => {
    let direction = "asc";
    if (sortConfig.key === key && sortConfig.direction === "asc") {
      direction = "desc";
    }
    setSortConfig({ key, direction });
  };

  // ─────────────────────────────────────────────────────────
  // EXPORT
  // ─────────────────────────────────────────────────────────
  const handleExportExcel = () => {
    const ws = XLSX.utils.json_to_sheet(filtered);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Data");
    XLSX.writeFile(wb, `Master_Report_${new Date().toISOString().split("T")[0]}.xlsx`);
    setMessage("✅ Excel exported");
  };

  const handleExportPDF = () => {
    const doc = new jsPDF("l", "mm", "a3");
    doc.setFontSize(16);
    doc.text("MASTER REPORT", 14, 15);
    doc.setFontSize(9);
    doc.text(`Generated: ${new Date().toLocaleString()}`, 14, 22);

    if (dateFilter.start || dateFilter.end) {
      doc.text(
        `Date Range: ${dateFilter.start || "Start"} to ${dateFilter.end || "End"}`,
        14,
        28
      );
    }

    doc.autoTable({
      head: [EXCEL_COLUMNS],
      body: filtered.map((r) => EXCEL_COLUMNS.map((c) => r[c])),
      startY: dateFilter.start || dateFilter.end ? 34 : 28,
      styles: { fontSize: 6, cellPadding: 1 },
      headStyles: { fillColor: [0, 245, 255], textColor: [0, 0, 0] }
    });
    doc.save(`Master_Report_${new Date().toISOString().split("T")[0]}.pdf`);
    setMessage("✅ PDF exported");
  };

  // ─────────────────────────────────────────────────────────
  // FILTER & SORT
  // ─────────────────────────────────────────────────────────
  let filtered = data.filter((r) => {
    const s = searchText.toLowerCase();

    if (filterParty && r["Party Name"] !== filterParty) return false;
    if (filterCategory && r["Item Category"] !== filterCategory) return false;
    if (filterSalesman && r["Salesman"] !== filterSalesman) return false;

    if (!s) return true;
    return EXCEL_COLUMNS.some((c) => String(r[c]).toLowerCase().includes(s));
  });

  if (sortConfig.key) {
    filtered = [...filtered].sort((a, b) => {
      const aVal = a[sortConfig.key] || "";
      const bVal = b[sortConfig.key] || "";

      if (sortConfig.key === "Amount" || sortConfig.key === "Qty") {
        const aNum = parseFloat(aVal) || 0;
        const bNum = parseFloat(bVal) || 0;
        return sortConfig.direction === "asc" ? aNum - bNum : bNum - aNum;
      }

      if (aVal < bVal) return sortConfig.direction === "asc" ? -1 : 1;
      if (aVal > bVal) return sortConfig.direction === "asc" ? 1 : -1;
      return 0;
    });
  }

  // Pagination
  const totalPages = Math.max(1, Math.ceil(filtered.length / rowsPerPage));
  const start = (page - 1) * rowsPerPage;
  const pageRows = filtered.slice(start, start + rowsPerPage);

  const parties = [...new Set(data.map(r => r["Party Name"]).filter(v => v && v !== "N/A"))].sort();
  const categories = [...new Set(data.map(r => r["Item Category"]).filter(v => v && v !== "N/A"))].sort();
  const salesmen = [...new Set(data.map(r => r["Salesman"]).filter(v => v && v !== "N/A"))].sort();

  const totalAmount = filtered.reduce((sum, r) => sum + (parseFloat(r["Amount"]) || 0), 0);
  const totalQty = filtered.reduce((sum, r) => sum + (parseFloat(r["Qty"]) || 0), 0);

  // ─────────────────────────────────────────────────────────
  // UI
  // ─────────────────────────────────────────────────────────
  return (
    <DataContext.Provider value={{ data, setData }}>

      <div className="min-h-screen bg-gradient-to-br from-[#0a1628] to-[#1a2332] text-white p-2 sm:p-4">

        <div className="max-w-full mx-auto bg-gradient-to-br from-[#12243d] to-[#0f1e33] rounded-2xl p-3 sm:p-5 border border-[#1e3553] shadow-2xl">

          {/* HEADER */}
          <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center mb-4 pb-3 border-b-2 border-[#00f5ff]/30 gap-2">
            <div>
              <h2 className="text-xl sm:text-2xl lg:text-3xl font-bold bg-gradient-to-r from-[#00f5ff] to-[#00d4e6] bg-clip-text text-transparent flex items-center gap-2">
                📊 MASTER REPORT
              </h2>
              <p className="text-xs text-gray-400 mt-1">
                Total Records: <span className="text-[#00f5ff] font-bold">{filtered.length}</span>
                {filtered.length !== data.length && (
                  <span className="ml-2">(of {data.length})</span>
                )}
              </p>
            </div>

            <div className="bg-gradient-to-br from-[#0f1e33] to-[#1a2a45] px-3 py-2 rounded-xl border-2 border-[#00f5ff]/50 shadow-lg">
              <p className="text-[10px] text-gray-400">Total Amount</p>
              <p className="text-base sm:text-xl font-bold bg-gradient-to-r from-green-400 to-emerald-400 bg-clip-text text-transparent">
                ₹{totalAmount.toLocaleString("en-IN", { maximumFractionDigits: 2 })}
              </p>
            </div>
          </div>

          {/* CONTROLS */}
          <div className="flex flex-wrap gap-2 bg-gradient-to-r from-[#0f1e33] to-[#1a2a45] p-2 mb-3 rounded-xl border border-[#1e3553]">
            <button
              onClick={loadLatestData}
              disabled={loading}
              className="bg-gradient-to-r from-[#00f5ff] to-[#00d4e6] hover:from-[#00d4e6] hover:to-[#00b8cc] disabled:from-gray-600 disabled:to-gray-700 text-black px-4 py-2 rounded-lg font-bold text-xs transition-all shadow-lg whitespace-nowrap"
            >
              {loading ? "⏳ Loading…" : "🔄 Reload Data"}
            </button>

            <button
              onClick={handleExportExcel}
              className="bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 px-4 py-2 rounded-lg font-bold text-xs transition-all shadow-lg"
            >
              📊 Excel
            </button>

            <button
              onClick={handleExportPDF}
              className="bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 px-4 py-2 rounded-lg font-bold text-xs transition-all shadow-lg"
            >
              📄 PDF
            </button>
          </div>

          {/* MESSAGE BAR */}
          {message && (
            <div className="bg-gradient-to-r from-[#0f1e33] to-[#1a2a45] border-l-4 border-green-400 rounded-lg p-2 mb-3">
              <p className="text-xs text-green-300 font-medium">{message}</p>
            </div>
          )}

          {/* DATE FILTER */}
          <div className="mb-3 flex flex-wrap items-center gap-2 bg-gradient-to-r from-[#0f1e33] to-[#1a2a45] p-3 rounded-xl border border-[#1e3553]">

            <label className="text-xs font-semibold text-[#00f5ff]">📅 Date Filter:</label>

            <div className="flex items-center gap-2">
              <label className="text-xs text-gray-300">From:</label>
              <input
                type="date"
                className="bg-[#0a1628] text-white border-2 border-[#1e3553] rounded-lg px-2 py-1 focus:border-[#00f5ff] focus:outline-none text-xs"
                value={dateFilter.start}
                onChange={(e) => setDateFilter({ ...dateFilter, start: e.target.value })}
              />
            </div>

            <div className="flex items-center gap-2">
              <label className="text-xs text-gray-300">To:</label>
              <input
                type="date"
                className="bg-[#0a1628] text-white border-2 border-[#1e3553] rounded-lg px-2 py-1 focus:border-[#00f5ff] focus:outline-none text-xs"
                value={dateFilter.end}
                onChange={(e) => setDateFilter({ ...dateFilter, end: e.target.value })}
              />
            </div>

            {(dateFilter.start || dateFilter.end) && (
              <button
                onClick={() => setDateFilter({ start: "", end: "" })}
                className="bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 px-3 py-1 rounded-lg text-xs font-bold transition-all whitespace-nowrap"
              >
                ✖ Clear Dates
              </button>
            )}

          </div>

          {/* SEARCH & FILTERS */}
          <div className="flex flex-col gap-2 mb-3">

            <input
              value={searchText}
              onChange={(e) => {
                setSearchText(e.target.value);
                setPage(1);
              }}
              placeholder="🔍 Search across all columns..."
              className="flex-1 p-2 bg-[#0a1628] border-2 border-[#1e3553] rounded-lg focus:border-[#00f5ff] focus:outline-none text-xs transition-all"
            />

            <div className="flex flex-wrap gap-2">

              <select
                value={filterParty}
                onChange={(e) => {
                  setFilterParty(e.target.value);
                  setPage(1);
                }}
                className="flex-1 min-w-[150px] p-2 bg-[#0a1628] border-2 border-[#1e3553] rounded-lg focus:border-[#00f5ff] focus:outline-none text-xs transition-all"
              >
                <option value="">🏢 All Parties ({parties.length})</option>
                {parties.map((p) => (
                  <option key={p} value={p}>
                    {p}
                  </option>
                ))}
              </select>

              <select
                value={filterCategory}
                onChange={(e) => {
                  setFilterCategory(e.target.value);
                  setPage(1);
                }}
                className="flex-1 min-w-[150px] p-2 bg-[#0a1628] border-2 border-[#1e3553] rounded-lg focus:border-[#00f5ff] focus:outline-none text-xs transition-all"
              >
                <option value="">🏷️ All Categories ({categories.length})</option>
                {categories.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>

              <select
                value={filterSalesman}
                onChange={(e) => {
                  setFilterSalesman(e.target.value);
                  setPage(1);
                }}
                className="flex-1 min-w-[150px] p-2 bg-[#0a1628] border-2 border-[#1e3553] rounded-lg focus:border-[#00f5ff] focus:outline-none text-xs transition-all"
              >
                <option value="">🧑‍💼 All Salesmen ({salesmen.length})</option>
                {salesmen.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>

              {(searchText || filterParty || filterCategory || filterSalesman) && (
                <button
                  onClick={() => {
                    setSearchText("");
                    setFilterParty("");
                    setFilterCategory("");
                    setFilterSalesman("");
                    setPage(1);
                  }}
                  className="bg-gradient-to-r from-gray-600 to-gray-700 hover:from-gray-700 hover:to-gray-800 px-4 py-2 rounded-lg text-xs font-bold transition-all whitespace-nowrap"
                >
                  ✖ Clear All Filters
                </button>
              )}

            </div>

          </div>

          {/* TABLE */}
          <div
            className="bg-gradient-to-br from-[#0a1628] to-[#0f1e33] rounded-xl border-2 border-[#1e3553] shadow-2xl"
            style={{ maxWidth: "100%", overflow: "hidden" }}
          >
            <div
              className="overflow-auto"
              style={{
                maxHeight: "calc(100vh - 500px)",
                minHeight: "400px",
                width: "100%"
              }}
            >

              {/* ⭐ FIXED WRAPPER ADDED HERE ⭐ */}
              <div className="overflow-x-auto w-full">
                <table className="border-collapse text-[10px] sm:text-xs min-w-max w-full">

                  <thead className="sticky top-0 bg-gradient-to-r from-[#1a3d5e] to-[#132a4a] text-[#00f5ff] z-10">
                    <tr>
                      {EXCEL_COLUMNS.map((col) => (
                        <th
                          key={col}
                          onClick={() => handleSort(col)}
                          className="px-3 py-3 border-r border-[#1e3553] cursor-pointer hover:bg-[#234a6e] transition-colors whitespace-nowrap"
                        >
                          <div className="flex items-center justify-between gap-2">
                            <span>{col}</span>
                            {sortConfig.key === col && (
                              <span className="text-xs">
                                {sortConfig.direction === "asc" ? "↑" : "↓"}
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
                        <td
                          colSpan={EXCEL_COLUMNS.length}
                          className="text-center py-12 text-gray-400 text-sm"
                        >
                          {loading ? "⏳ Loading data..." : "📭 No data found"}
                        </td>
                      </tr>
                    ) : (
                      <>
                        {pageRows.map((row, i) => (
                          <tr
                            key={i}
                            className={`${
                              i % 2 ? "bg-[#0f1e33]" : "bg-[#132a4a]"
                            } hover:bg-[#1a3d5e] transition-colors`}
                          >
                            <td className="px-3 py-2 border-r border-[#1e3553] text-center whitespace-nowrap">
                              {row["Sr.No"]}
                            </td>

                            <td className="px-3 py-2 border-r border-[#1e3553] whitespace-nowrap">
                              {row["Date"] || "—"}
                            </td>

                            <td className="px-3 py-2 border-r border-[#1e3553] whitespace-nowrap">
                              {row["Voucher Number"] || "—"}
                            </td>

                            <td className="px-3 py-2 border-r border-[#1e3553] whitespace-nowrap">
                              {row["Voucher Type"] || "—"}
                            </td>

                            <td
                              className="px-3 py-2 border-r border-[#1e3553] font-medium whitespace-nowrap"
                              style={{ maxWidth: "200px" }}
                              title={row["Party Name"]}
                            >
                              {row["Party Name"] || "—"}
                            </td>

                            <td
                              className="px-3 py-2 border-r border-[#1e3553] text-blue-300 whitespace-nowrap"
                              style={{ maxWidth: "200px" }}
                              title={row["Item Name"]}
                            >
                              {row["Item Name"] || "—"}
                            </td>

                            <td className="px-3 py-2 border-r border-[#1e3553] whitespace-nowrap">
                              {row["Item Group"] || "—"}
                            </td>

                            <td className="px-3 py-2 border-r border-[#1e3553] whitespace-nowrap">
                              {row["Item Category"] || "—"}
                            </td>

                            <td className="px-3 py-2 border-r border-[#1e3553] whitespace-nowrap">
                              {row["Salesman"] || "—"}
                            </td>

                            <td className="px-3 py-2 border-r border-[#1e3553] whitespace-nowrap">
                              {row["City/Area"] || "—"}
                            </td>

                            <td className="px-3 py-2 border-r border-[#1e3553] text-right font-medium text-blue-300 whitespace-nowrap">
                              {row["Qty"] || "—"}
                            </td>

                            <td className="px-3 py-2 border-r border-[#1e3553] text-right font-bold text-green-400 whitespace-nowrap">
                              ₹
                              {Number(row["Amount"] || 0).toLocaleString("en-IN", {
                                maximumFractionDigits: 2
                              })}
                            </td>

                            <td
                              className="px-3 py-2 text-xs text-gray-400 whitespace-nowrap"
                              style={{ maxWidth: "200px" }}
                              title={row["Narration"]}
                            >
                              {row["Narration"] || "—"}
                            </td>
                          </tr>
                        ))}

                        {/* TOTAL ROW */}
                        <tr className="bg-[#00f5ff]/20 font-bold text-[#00f5ff] border-t-2 border-[#00f5ff] sticky bottom-0">
                          <td colSpan={10} className="px-3 py-3 text-right">
                            📊 TOTAL ({filtered.length} records)
                          </td>

                          <td className="px-3 py-3 text-right border-r border-[#1e3553]">
                            {totalQty.toLocaleString("en-IN")}
                          </td>

                          <td className="px-3 py-3 text-right text-lg border-r border-[#1e3553]">
                            ₹
                            {totalAmount.toLocaleString("en-IN", {
                              maximumFractionDigits: 2
                            })}
                          </td>

                          <td className="px-3 py-3"></td>
                        </tr>
                      </>
                    )}
                  </tbody>

                </table>
              </div>

            </div>
          </div>

          {/* PAGINATION */}
          <div className="flex flex-col sm:flex-row justify-between items-center mt-3 gap-2">
            <button
              onClick={() => setPage(Math.max(1, page - 1))}
              disabled={page === 1}
              className="w-full sm:w-auto px-5 py-2 bg-gradient-to-r from-[#00f5ff] to-[#00d4e6] hover:from-[#00d4e6] hover:to-[#00b8cc] text-black rounded-xl font-bold disabled:from-gray-600 disabled:to-gray-700 disabled:cursor-not-allowed transition-all text-xs"
            >
              ⬅ Prev
            </button>

            <div className="text-xs text-center">
              <span>
                Page <span className="font-bold text-[#00f5ff]">{page}</span> of{" "}
                <span className="font-bold text-[#00f5ff]">{totalPages}</span>
              </span>

              <span className="text-gray-400 ml-2">
                ({start + 1}-
                {Math.min(start + rowsPerPage, filtered.length)} of{" "}
                {filtered.length})
              </span>
            </div>

            <button
              onClick={() => setPage(Math.min(totalPages, page + 1))}
              disabled={page === totalPages}
              className="w-full sm:w-auto px-5 py-2 bg-gradient-to-r from-[#00f5ff] to-[#00d4e6] hover:from-[#00d4e6] hover:to-[#00b8cc] text-black rounded-xl font-bold disabled:from-gray-600 disabled:to-gray-700 disabled:cursor-not-allowed transition-all text-xs"
            >
              Next ➡
            </button>
          </div>

          {/* SUMMARY STATS */}
          <div className="mt-4 grid grid-cols-2 lg:grid-cols-4 gap-2">
            <div className="bg-gradient-to-br from-[#0f1e33] to-[#1a2a45] border-2 border-[#00f5ff]/30 rounded-xl p-2">
              <p className="text-[9px] text-gray-400">Records</p>
              <p className="text-base sm:text-lg font-bold text-[#00f5ff]">
                {filtered.length}
              </p>
            </div>

            <div className="bg-gradient-to-br from-[#0f1e33] to-[#1a2a45] border-2 border-blue-400/30 rounded-xl p-2">
              <p className="text-[9px] text-gray-400">Total Qty</p>
              <p className="text-base sm:text-lg font-bold text-blue-400">
                {totalQty.toLocaleString("en-IN")}
              </p>
            </div>

            <div className="bg-gradient-to-br from-[#0f1e33] to-[#1a2a45] border-2 border-purple-400/30 rounded-xl p-2">
              <p className="text-[9px] text-gray-400">Parties</p>
              <p className="text-base sm:text-lg font-bold text-purple-400">
                {parties.length}
              </p>
            </div>

            <div className="bg-gradient-to-br from-[#0f1e33] to-[#1a2a45] border-2 border-green-400/30 rounded-xl p-2">
              <p className="text-[9px] text-gray-400">Total Value</p>
              <p className="text-base sm:text-lg font-bold text-green-400">
                ₹
                {totalAmount.toLocaleString("en-IN", {
                  maximumFractionDigits: 2
                })}
              </p>
            </div>
          </div>

        </div>

      </div>

    </DataContext.Provider>
  );
}
