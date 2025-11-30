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

  const rowsPerPage = 60;

  const EXCEL_COLUMNS = [
    "Sr.No","Date","Voucher Number","Voucher Type",
    "Party Name","Item Name","Item Group","Item Category",
    "Salesman","City/Area","Qty","Amount","Narration"
  ];

  useEffect(() => {
    loadLatestData();
  }, [dateFilter]);

  async function loadLatestData() {
    setLoading(true);
    setMessage("Loading latest data...");

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
          "Date": row.date || "",
          "Voucher Number": row.voucher_number || "",
          "Voucher Type": row.voucher_type || "Sales",
          "Party Name": row.party_name || "N/A",
          "Item Name": row.item_name || "N/A",
          "Item Group": row.item_group || "N/A",
          "Item Category": row.item_category || "N/A",
          "Salesman": row.salesman || "N/A",
          "City/Area": row.city_area || "N/A",
          "Qty": parseFloat(row.qty) || 0,
          "Amount": parseFloat(row.amount) || 0,
          "Narration": row.narration || "",
        }));
        setData(mapped);
        setMessage(`Loaded ${mapped.length} records`);
      } else {
        setMessage("No data found");
      }
    } catch (err) {
      setMessage("Error loading data");
    } finally {
      setLoading(false);
    }
  }

  // FILTERING
  let filtered = data.filter((r) => {
    const s = searchText.toLowerCase();

    if (filterParty && r["Party Name"] !== filterParty) return false;
    if (filterCategory && r["Item Category"] !== filterCategory) return false;
    if (filterSalesman && r["Salesman"] !== filterSalesman) return false;

    if (!s) return true;
    return EXCEL_COLUMNS.some((c) =>
      String(r[c]).toLowerCase().includes(s)
    );
  });

  // PAGINATION
  const totalPages = Math.max(1, Math.ceil(filtered.length / rowsPerPage));
  const start = (page - 1) * rowsPerPage;
  const pageRows = filtered.slice(start, start + rowsPerPage);

  const parties = [...new Set(data.map((r) => r["Party Name"]).filter((v) => v !== "N/A"))].sort();
  const categories = [...new Set(data.map((r) => r["Item Category"]).filter((v) => v !== "N/A"))].sort();
  const salesmen = [...new Set(data.map((r) => r["Salesman"]).filter((v) => v !== "N/A"))].sort();

  const totalAmount = filtered.reduce((s, r) => s + (r["Amount"] || 0), 0);
  const totalQty = filtered.reduce((s, r) => s + (r["Qty"] || 0), 0);

  return (
    <DataContext.Provider value={{ data, setData }}>
      <div className="min-h-screen bg-[#0C1624] text-white p-3">

        {/* HEADER */}
        <div className="bg-[#122032] rounded-xl border border-[#1c2d42] p-4 shadow-lg mb-4">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center">
            <div>
              <h2 className="text-2xl font-bold text-[#53d7ff]">
                MASTER REPORTS
              </h2>
              <p className="text-xs text-gray-400 mt-1">
                Total Records: <span className="text-[#53d7ff]">{filtered.length}</span>
              </p>
            </div>

            <div className="flex gap-2 mt-3 sm:mt-0">
              <button
                onClick={loadLatestData}
                className="bg-[#2f90ff] hover:bg-[#1c6bd6] text-white px-4 py-1 text-sm rounded-lg"
              >
                Reload
              </button>
              <button
                onClick={() => handleExportExcel(filtered)}
                className="bg-green-600 hover:bg-green-700 text-white px-4 py-1 text-sm rounded-lg"
              >
                Excel
              </button>
              <button
                onClick={() => handleExportPDF(filtered)}
                className="bg-orange-500 hover:bg-orange-600 text-white px-4 py-1 text-sm rounded-lg"
              >
                PDF
              </button>
            </div>
          </div>
        </div>

        {/* FILTERS */}
        <div className="bg-[#122032] border border-[#1c2d42] rounded-xl p-3 mb-4 space-y-2">

          {/* Date Filter */}
          <div className="flex flex-wrap gap-3 items-center">
            <label className="text-xs text-gray-300">Date:</label>

            <input
              type="date"
              className="bg-[#0C1624] border border-[#1c2d42] rounded px-2 py-1 text-xs"
              value={dateFilter.start}
              onChange={(e) => setDateFilter({ ...dateFilter, start: e.target.value })}
            />

            <input
              type="date"
              className="bg-[#0C1624] border border-[#1c2d42] rounded px-2 py-1 text-xs"
              value={dateFilter.end}
              onChange={(e) => setDateFilter({ ...dateFilter, end: e.target.value })}
            />

            {(dateFilter.start || dateFilter.end) && (
              <button
                onClick={() => setDateFilter({ start: "", end: "" })}
                className="bg-red-600 hover:bg-red-700 text-white px-3 py-1 text-xs rounded"
              >
                Clear
              </button>
            )}
          </div>

          {/* Search */}
          <input
            value={searchText}
            onChange={(e) => {
              setSearchText(e.target.value);
              setPage(1);
            }}
            placeholder="Search all columns..."
            className="w-full bg-[#0C1624] border border-[#1c2d42] rounded px-2 py-2 text-xs"
          />

          {/* Dropdown Filters */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            <select
              value={filterParty}
              onChange={(e) => {
                setFilterParty(e.target.value);
                setPage(1);
              }}
              className="bg-[#0C1624] border border-[#1c2d42] rounded px-2 py-2 text-xs"
            >
              <option value="">All Parties ({parties.length})</option>
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
              className="bg-[#0C1624] border border-[#1c2d42] rounded px-2 py-2 text-xs"
            >
              <option value="">All Categories ({categories.length})</option>
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
              className="bg-[#0C1624] border border-[#1c2d42] rounded px-2 py-2 text-xs"
            >
              <option value="">All Salesmen ({salesmen.length})</option>
              {salesmen.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* TABLE */}
        <div className="bg-[#122032] rounded-xl border border-[#1c2d42] shadow-xl">

          <div className="overflow-x-auto w-full border-b border-[#1c2d42]">
            <table className="min-w-full text-xs">
              <thead className="bg-[#1b2c44] text-[#53d7ff] sticky top-0 z-10 select-none">
                <tr>
                  {EXCEL_COLUMNS.map((col) => (
                    <th key={col} className="px-3 py-3 text-left border-r border-[#26384f] whitespace-nowrap">
                      {col}
                    </th>
                  ))}
                </tr>
              </thead>
            </table>
          </div>

          <div className="overflow-auto" style={{ maxHeight: "60vh" }}>
            <table className="min-w-full text-xs">
              <tbody>
                {pageRows.length === 0 ? (
                  <tr>
                    <td colSpan={EXCEL_COLUMNS.length} className="text-center py-10 text-gray-400">
                      No Records Found
                    </td>
                  </tr>
                ) : (
                  pageRows.map((row, idx) => (
                    <tr key={idx} className={`${idx % 2 ? "bg-[#0f1b2e]" : "bg-[#132235]"} hover:bg-[#1b2c44]`}>
                      {EXCEL_COLUMNS.map((col) => (
                        <td
                          key={col}
                          className="px-3 py-2 border-r border-[#26384f] whitespace-nowrap"
                        >
                          {col === "Amount"
                            ? `₹${Number(row[col]).toLocaleString("en-IN")}`
                            : row[col]}
                        </td>
                      ))}
                    </tr>
                  ))
                )}

                {/* TOTAL ROW */}
                {pageRows.length > 0 && (
                  <tr className="bg-[#1b2c44] text-[#53d7ff] font-bold sticky bottom-0">
                    <td colSpan={10} className="px-3 py-3 text-right">
                      TOTAL
                    </td>
                    <td className="px-3 py-3 text-right">{totalQty.toLocaleString("en-IN")}</td>
                    <td className="px-3 py-3 text-right">
                      ₹{totalAmount.toLocaleString("en-IN")}
                    </td>
                    <td></td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* PAGINATION */}
        <div className="flex justify-between items-center mt-4 text-xs">
          <button
            onClick={() => setPage(Math.max(1, page - 1))}
            disabled={page === 1}
            className="bg-[#2f90ff] text-white px-4 py-1 rounded disabled:bg-gray-600"
          >
            Prev
          </button>

          <p>
            Page <span className="text-[#53d7ff]">{page}</span> of{" "}
            <span className="text-[#53d7ff]">{totalPages}</span>
          </p>

          <button
            onClick={() => setPage(Math.min(totalPages, page + 1))}
            disabled={page === totalPages}
            className="bg-[#2f90ff] text-white px-4 py-1 rounded disabled:bg-gray-600"
          >
            Next
          </button>
        </div>
      </div>
    </DataContext.Provider>
  );
}

