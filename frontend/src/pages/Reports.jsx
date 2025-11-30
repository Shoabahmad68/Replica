// src/pages/Reports.jsx
import React, { useState, useEffect } from "react";
import jsPDF from "jspdf";
import "jspdf-autotable";
import * as XLSX from "xlsx";

export default function Reports() {
  const [data, setData] = useState([]);
  const [filtered, setFiltered] = useState([]);
  const [loading, setLoading] = useState(false);

  const [search, setSearch] = useState("");
  const [partyFilter, setPartyFilter] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [salesmanFilter, setSalesmanFilter] = useState("");
  const [excelOpen, setExcelOpen] = useState(false);

  const rowsPerPage = 50;
  const [page, setPage] = useState(1);

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
    "Narration"
  ];

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    setLoading(true);

    try {
      const backendURL =
        window.location.hostname.includes("localhost")
          ? "http://127.0.0.1:8787"
          : "https://selt-t-backend.selt-3232.workers.dev";

      const res = await fetch(`${backendURL}/api/vouchers?limit=10000`);
      const json = await res.json();

      if (json.success && json.data) {
        const mapped = json.data.map((row, i) => ({
          SrNo: i + 1,
          "Sr.No": i + 1,
          Date: row.date || "",
          "Voucher Number": row.voucher_number || "",
          "Voucher Type": row.voucher_type || "Sales",
          "Party Name": row.party_name || "N/A",
          "Item Name": row.item_name || "N/A",
          "Item Group": row.item_group || "N/A",
          "Item Category": row.item_category || "N/A",
          Salesman: row.salesman || "N/A",
          "City/Area": row.city_area || "N/A",
          Qty: parseFloat(row.qty) || 0,
          Amount: parseFloat(row.amount) || 0,
          Narration: row.narration || "",
        }));

        setData(mapped);
        setFiltered(mapped);
      }
    } catch (e) {
      console.log("Error loading data:", e);
      setData([]);
      setFiltered([]);
    }

    setLoading(false);
  }

  // FILTER HANDLING
  useEffect(() => {
    let rows = [...data];

    if (search.trim()) {
      const s = search.toLowerCase();
      rows = rows.filter((r) =>
        EXCEL_COLUMNS.some((c) => String(r[c]).toLowerCase().includes(s))
      );
    }

    if (partyFilter) rows = rows.filter((r) => r["Party Name"] === partyFilter);
    if (categoryFilter)
      rows = rows.filter((r) => r["Item Category"] === categoryFilter);
    if (salesmanFilter) rows = rows.filter((r) => r["Salesman"] === salesmanFilter);

    setFiltered(rows);
    setPage(1);
  }, [search, partyFilter, categoryFilter, salesmanFilter, data]);

  const pageStart = (page - 1) * rowsPerPage;
  const pageRows = filtered.slice(pageStart, pageStart + rowsPerPage);
  const totalPages = Math.max(1, Math.ceil(filtered.length / rowsPerPage));

  const parties = [...new Set(data.map((d) => d["Party Name"]))].filter((v) => v !== "N/A");
  const categories = [...new Set(data.map((d) => d["Item Category"]))].filter((v) => v !== "N/A");
  const salesmen = [...new Set(data.map((d) => d["Salesman"]))].filter((v) => v !== "N/A");

  const totalQty = filtered.reduce((a, b) => a + (b.Qty || 0), 0);
  const totalAmount = filtered.reduce((a, b) => a + (b.Amount || 0), 0);

  const exportExcel = () => {
    const ws = XLSX.utils.json_to_sheet(filtered);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Report");
    XLSX.writeFile(wb, "Master_Report.xlsx");
  };

  const exportPDF = () => {
    const doc = new jsPDF("l", "mm", "a3");
    doc.text("MASTER REPORT", 14, 15);
    doc.autoTable({
      head: [EXCEL_COLUMNS],
      body: filtered.map((r) => EXCEL_COLUMNS.map((c) => r[c])),
      startY: 20,
      styles: { fontSize: 7 },
    });
    doc.save("Master_Report.pdf");
  };

  return (
    <div className="min-h-screen bg-[#0a1628] text-white p-3">

      {/* HEADER */}
      <h2 className="text-2xl font-bold text-[#00f5ff] mb-3">
        📊 MASTER REPORT
      </h2>

      {/* TOP BAR */}
      <div className="flex flex-wrap gap-2 bg-[#112233] p-3 rounded-xl border border-[#1e3553]">

        <button
          onClick={loadData}
          className="px-4 py-2 rounded-lg bg-[#00f5ff] text-black font-bold text-xs"
        >
          🔄 Reload
        </button>

        <button
          onClick={exportExcel}
          className="px-4 py-2 rounded-lg bg-green-600 text-white font-bold text-xs"
        >
          📊 Excel
        </button>

        <button
          onClick={exportPDF}
          className="px-4 py-2 rounded-lg bg-orange-500 text-white font-bold text-xs"
        >
          📄 PDF
        </button>

        <button
          onClick={() => setExcelOpen(true)}
          className="px-4 py-2 rounded-lg bg-blue-600 text-white font-bold text-xs"
        >
          🧾 Excel View
        </button>

        {/* SEARCH */}
        <input
          placeholder="Search..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="px-3 py-2 rounded-lg text-xs bg-[#0a1628] border border-[#1e3553] w-40"
        />

        {/* FILTERS SAME LINE */}
        <select
          value={partyFilter}
          onChange={(e) => setPartyFilter(e.target.value)}
          className="px-2 py-2 bg-[#0a1628] border border-[#1e3553] rounded-lg text-xs w-40"
        >
          <option value="">All Parties</option>
          {parties.map((p) => (
            <option key={p}>{p}</option>
          ))}
        </select>

        <select
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
          className="px-2 py-2 bg-[#0a1628] border border-[#1e3553] rounded-lg text-xs w-36"
        >
          <option value="">All Categories</option>
          {categories.map((c) => (
            <option key={c}>{c}</option>
          ))}
        </select>

        <select
          value={salesmanFilter}
          onChange={(e) => setSalesmanFilter(e.target.value)}
          className="px-2 py-2 bg-[#0a1628] border border-[#1e3553] rounded-lg text-xs w-36"
        >
          <option value="">All Salesmen</option>
          {salesmen.map((s) => (
            <option key={s}>{s}</option>
          ))}
        </select>
      </div>

      {/* TABLE */}
      <div
        className="mt-4 overflow-auto rounded-xl border border-[#1e3553]"
        style={{ maxHeight: "68vh", maxWidth: "100%" }}
      >
        <table className="min-w-full text-xs">
          <thead className="bg-[#132a4a] text-[#00f5ff] sticky top-0 z-10">
            <tr>
              {EXCEL_COLUMNS.map((col) => (
                <th key={col} className="px-3 py-2 border-r border-[#1e3553] whitespace-nowrap">
                  {col}
                </th>
              ))}
            </tr>
          </thead>

          <tbody>
            {pageRows.map((row) => (
              <tr
                key={row.SrNo}
                className="odd:bg-[#0f1e33] even:bg-[#132a4a] hover:bg-[#1b3a5c]"
              >
                {EXCEL_COLUMNS.map((c) => (
                  <td key={c} className="px-3 py-2 border-r border-[#1e3553] whitespace-nowrap">
                    {c === "Amount"
                      ? "₹" + row[c].toLocaleString("en-IN")
                      : row[c]}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* PAGINATION */}
      <div className="mt-3 flex justify-between text-xs">
        <button
          disabled={page === 1}
          onClick={() => setPage(page - 1)}
          className="px-4 py-2 bg-[#00f5ff] text-black rounded-lg disabled:opacity-40"
        >
          Prev
        </button>

        <span className="text-[#00f5ff] font-bold">
          Page {page} / {totalPages}
        </span>

        <button
          disabled={page === totalPages}
          onClick={() => setPage(page + 1)}
          className="px-4 py-2 bg-[#00f5ff] text-black rounded-lg disabled:opacity-40"
        >
          Next
        </button>
      </div>

      {/* SUMMARY */}
      <div className="mt-3 flex gap-3 text-xs">
        <div className="p-3 bg-[#112233] rounded-lg border border-[#1e3553]">
          Records: {filtered.length}
        </div>
        <div className="p-3 bg-[#112233] rounded-lg border border-[#1e3553]">
          Qty: {totalQty}
        </div>
        <div className="p-3 bg-[#112233] rounded-lg border border-[#1e3553]">
          Amount: ₹{totalAmount.toLocaleString("en-IN")}
        </div>
      </div>

      {/* EXCEL POPUP */}
      {excelOpen && (
        <div className="fixed inset-0 bg-black/70 flex justify-center items-center p-3 z-50">
          <div className="bg-[#0b1220] w-full max-w-6xl h-[70vh] rounded-xl border border-[#38bdf8] overflow-hidden">

            <div className="p-3 flex justify-between items-center bg-[#112233]">
              <span className="text-[#00f5ff] font-bold">Excel View</span>
              <button
                onClick={() => setExcelOpen(false)}
                className="px-3 py-1 bg-red-500 text-white rounded-lg"
              >
                Close
              </button>
            </div>

            <div className="overflow-auto h-full">
              <table className="min-w-full text-xs bg-[#ffffff]">
                <thead className="bg-[#e5f4ff] text-black">
                  <tr>
                    {EXCEL_COLUMNS.map((c) => (
                      <th key={c} className="px-2 py-2 border">{c}</th>
                    ))}
                  </tr>
                </thead>

                <tbody>
                  {filtered.map((row) => (
                    <tr key={row.SrNo} className="odd:bg-white even:bg-[#f2f7ff]">
                      {EXCEL_COLUMNS.map((c) => (
                        <td key={c} className="px-2 py-2 border text-black">
                          {c === "Amount"
                            ? row[c].toLocaleString("en-IN")
                            : row[c]}
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
  );
}
