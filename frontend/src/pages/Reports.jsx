// src/pages/Reports.jsx
import React, { useState, useEffect } from "react";
import jsPDF from "jspdf";
import "jspdf-autotable";
import * as XLSX from "xlsx";
import { FaSave, FaUndo, FaRedo, FaBold, FaItalic, FaUnderline, FaAlignLeft, FaAlignCenter, FaAlignRight, FaFillDrip, FaTable } from "react-icons/fa"; // Icons ke liye (agar installed nahi hai to npm install react-icons kar lena, ya fir niche wala code bina icons ke bhi chalega)

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

  // --- FIX: TOTAL CALCULATION LOGIC ---
  // Ye check karega ki agar Party Name ya Item Name me "Total" likha hai to use count nahi karega
  const cleanRowsForTotal = filtered.filter(r => {
    const pName = String(r["Party Name"]).toLowerCase();
    const iName = String(r["Item Name"]).toLowerCase();
    return !pName.includes("total") && !iName.includes("total");
  });

  const totalQty = cleanRowsForTotal.reduce((a, b) => a + (b.Qty || 0), 0);
  const totalAmount = cleanRowsForTotal.reduce((a, b) => a + (b.Amount || 0), 0);

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
    <div className="min-h-screen bg-[#0a1628] text-white p-3 overflow-hidden"> 
    {/* overflow-hidden on main container helps prevent body scroll */}

      {/* HEADER */}
      <h2 className="text-2xl font-bold text-[#00f5ff] mb-3">
        📊 MASTER REPORT
      </h2>

      {/* TOP BAR */}
      <div className="flex flex-wrap gap-2 bg-[#112233] p-3 rounded-xl border border-[#1e3553]">

        <button
          onClick={loadData}
          className="px-4 py-2 rounded-lg bg-[#00f5ff] text-black font-bold text-xs hover:bg-[#00d1da] transition"
        >
          🔄 Reload
        </button>

        <button
          onClick={exportExcel}
          className="px-4 py-2 rounded-lg bg-green-600 text-white font-bold text-xs hover:bg-green-500 transition"
        >
          📊 Excel
        </button>

        <button
          onClick={exportPDF}
          className="px-4 py-2 rounded-lg bg-orange-500 text-white font-bold text-xs hover:bg-orange-400 transition"
        >
          📄 PDF
        </button>

        <button
          onClick={() => setExcelOpen(true)}
          className="px-4 py-2 rounded-lg bg-blue-600 text-white font-bold text-xs hover:bg-blue-500 transition"
        >
          🧾 Excel View
        </button>

        {/* SEARCH */}
        <input
          placeholder="Search..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="px-3 py-2 rounded-lg text-xs bg-[#0a1628] border border-[#1e3553] w-40 text-white focus:outline-none focus:border-[#00f5ff]"
        />

        {/* FILTERS */}
        <select
          value={partyFilter}
          onChange={(e) => setPartyFilter(e.target.value)}
          className="px-2 py-2 bg-[#0a1628] border border-[#1e3553] rounded-lg text-xs w-40 text-white focus:outline-none"
        >
          <option value="">All Parties</option>
          {parties.map((p) => (
            <option key={p}>{p}</option>
          ))}
        </select>

        <select
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
          className="px-2 py-2 bg-[#0a1628] border border-[#1e3553] rounded-lg text-xs w-36 text-white focus:outline-none"
        >
          <option value="">All Categories</option>
          {categories.map((c) => (
            <option key={c}>{c}</option>
          ))}
        </select>

        <select
          value={salesmanFilter}
          onChange={(e) => setSalesmanFilter(e.target.value)}
          className="px-2 py-2 bg-[#0a1628] border border-[#1e3553] rounded-lg text-xs w-36 text-white focus:outline-none"
        >
          <option value="">All Salesmen</option>
          {salesmen.map((s) => (
            <option key={s}>{s}</option>
          ))}
        </select>
      </div>

      {/* --- FIX: TABLE CONTAINER LAYOUT --- */}
      {/* w-full and overflow-x-auto ensures scroll stays inside */}
      <div
        className="mt-4 w-full overflow-x-auto overflow-y-auto rounded-xl border border-[#1e3553] custom-scrollbar"
        style={{ height: "65vh" }}
      >
        <table className="min-w-max text-xs text-left border-collapse">
          <thead className="bg-[#132a4a] text-[#00f5ff] sticky top-0 z-10 shadow-sm">
            <tr>
              {EXCEL_COLUMNS.map((col) => (
                <th key={col} className="px-4 py-3 border-b border-[#1e3553] whitespace-nowrap font-semibold uppercase tracking-wider">
                  {col}
                </th>
              ))}
            </tr>
          </thead>

          <tbody>
            {loading ? (
               <tr><td colSpan={EXCEL_COLUMNS.length} className="text-center p-10">Loading Data...</td></tr>
            ) : (
              pageRows.map((row) => (
                <tr
                  key={row.SrNo}
                  className="odd:bg-[#0f1e33] even:bg-[#132a4a] hover:bg-[#1b3a5c] transition-colors"
                >
                  {EXCEL_COLUMNS.map((c) => (
                    <td key={c} className="px-4 py-2 border-b border-[#1e3553] whitespace-nowrap text-gray-300">
                      {c === "Amount"
                        ? "₹ " + row[c].toLocaleString("en-IN", { minimumFractionDigits: 2 })
                        : row[c]}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* PAGINATION */}
      <div className="mt-3 flex justify-between items-center text-xs">
        <button
          disabled={page === 1}
          onClick={() => setPage(page - 1)}
          className="px-4 py-2 bg-[#00f5ff] text-black font-bold rounded-lg disabled:opacity-40 hover:bg-[#00d1da]"
        >
          Previous
        </button>

        <span className="text-[#00f5ff] font-bold bg-[#112233] px-4 py-2 rounded-lg border border-[#1e3553]">
          Page {page} of {totalPages}
        </span>

        <button
          disabled={page === totalPages}
          onClick={() => setPage(page + 1)}
          className="px-4 py-2 bg-[#00f5ff] text-black font-bold rounded-lg disabled:opacity-40 hover:bg-[#00d1da]"
        >
          Next
        </button>
      </div>

      {/* SUMMARY */}
      <div className="mt-3 flex gap-4 text-xs">
        <div className="px-4 py-3 bg-[#112233] rounded-lg border border-[#1e3553] text-gray-300 shadow-lg">
          Records: <span className="text-white font-bold text-sm ml-1">{filtered.length}</span>
        </div>
        <div className="px-4 py-3 bg-[#112233] rounded-lg border border-[#1e3553] text-gray-300 shadow-lg">
          Total Qty: <span className="text-[#00f5ff] font-bold text-sm ml-1">{totalQty.toLocaleString("en-IN")}</span>
        </div>
        <div className="px-4 py-3 bg-[#112233] rounded-lg border border-[#1e3553] text-gray-300 shadow-lg">
          Total Amount: <span className="text-green-400 font-bold text-sm ml-1">₹ {totalAmount.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</span>
        </div>
      </div>

      {/* --- FIX: EXCEL POPUP WITH FEATURES --- */}
      {excelOpen && (
        <div className="fixed inset-0 bg-black/80 flex justify-center items-center p-4 z-50 backdrop-blur-sm">
          <div className="bg-white w-full max-w-7xl h-[85vh] rounded-sm shadow-2xl flex flex-col overflow-hidden animate-fade-in">

            {/* Excel Header Color Bar */}
            <div className="bg-[#217346] text-white px-4 py-1 flex justify-between items-center text-xs select-none">
                <div className="flex gap-4">
                    <span className="cursor-pointer font-semibold">AutoSave <span className="opacity-50">Off</span></span>
                    <span className="font-bold">Master_Report.xlsx - Excel</span>
                </div>
                <div className="flex gap-4">
                    <span>Selt-T User</span>
                    <button onClick={() => setExcelOpen(false)} className="hover:bg-red-500 px-2 rounded">✕</button>
                </div>
            </div>

            {/* Excel Menu Tabs */}
            <div className="bg-[#217346] text-white px-2 pt-2 flex gap-1 text-xs select-none">
                {["File", "Home", "Insert", "Page Layout", "Formulas", "Data", "Review", "View", "Help"].map((menu, idx) => (
                    <div key={menu} className={`px-4 py-1 rounded-t-sm cursor-pointer ${idx === 1 ? 'bg-[#f3f2f1] text-black font-semibold' : 'hover:bg-[#1a5c38]'}`}>
                        {menu}
                    </div>
                ))}
            </div>

            {/* Excel Ribbon Toolbar (Fake) */}
            <div className="bg-[#f3f2f1] border-b border-gray-300 p-2 flex items-center gap-4 text-gray-700 h-24 select-none">
                <div className="flex flex-col items-center border-r pr-3 border-gray-300">
                    <div className="text-xl mb-1 text-gray-500"><FaSave /></div>
                    <span className="text-[10px]">Paste</span>
                </div>
                
                <div className="flex flex-col gap-1 border-r pr-3 border-gray-300">
                    <div className="flex gap-1 bg-white border border-gray-300 p-0.5 rounded text-xs w-32 justify-between px-2"><span>Calibri</span><span>v</span></div>
                    <div className="flex gap-1">
                         <div className="p-1 hover:bg-gray-200 cursor-pointer rounded"><FaBold size={10} /></div>
                         <div className="p-1 hover:bg-gray-200 cursor-pointer rounded"><FaItalic size={10} /></div>
                         <div className="p-1 hover:bg-gray-200 cursor-pointer rounded"><FaUnderline size={10} /></div>
                         <div className="p-1 hover:bg-gray-200 cursor-pointer border-l ml-1 pl-2"><FaFillDrip size={10} /></div>
                    </div>
                </div>

                <div className="flex flex-col gap-1 border-r pr-3 border-gray-300">
                    <div className="flex gap-1">
                        <div className="p-1 hover:bg-gray-200 cursor-pointer rounded"><FaAlignLeft size={10} /></div>
                        <div className="p-1 hover:bg-gray-200 cursor-pointer rounded"><FaAlignCenter size={10} /></div>
                        <div className="p-1 hover:bg-gray-200 cursor-pointer rounded"><FaAlignRight size={10} /></div>
                    </div>
                     <span className="text-[10px] text-center">Alignment</span>
                </div>

                 <div className="flex flex-col items-center border-r pr-3 border-gray-300 text-green-700 cursor-pointer hover:bg-gray-200 p-1 rounded">
                    <div className="text-2xl mb-1"><FaTable /></div>
                    <span className="text-[10px]">Format Table</span>
                </div>

                <div className="flex-1"></div>
            </div>

            {/* Formula Bar */}
            <div className="flex items-center gap-2 px-2 py-1 bg-white border-b border-gray-300 text-xs">
                <span className="font-bold text-gray-500 border border-gray-300 bg-gray-50 px-2 py-0.5 rounded">A1</span>
                <span className="text-gray-400">✕ ✓ ƒx</span>
                <div className="flex-1 border border-gray-300 p-1 h-6 bg-white"></div>
            </div>

            {/* Excel Table Area */}
            <div className="flex-1 overflow-auto bg-[#e6e6e6] relative">
              <table className="w-full text-xs border-collapse bg-white cursor-default select-none">
                <thead className="bg-[#f3f2f1] text-gray-700 sticky top-0 z-10">
                  <tr>
                    <th className="w-8 border border-gray-300 bg-[#e6e6e6]"></th> {/* Row Number Header */}
                    {EXCEL_COLUMNS.map((c, i) => (
                      <th key={c} className="px-2 py-1 border border-gray-300 font-normal text-center min-w-[100px] relative group">
                        {String.fromCharCode(65 + i)} {/* A, B, C... */}
                        <span className="block text-[10px] text-gray-400 font-bold">{c}</span>
                      </th>
                    ))}
                  </tr>
                </thead>

                <tbody>
                  {filtered.map((row, index) => (
                    <tr key={row.SrNo} className="hover:bg-gray-100 h-6">
                      <td className="border border-gray-300 bg-[#f3f2f1] text-center w-8 text-gray-500 font-semibold">
                        {index + 1}
                      </td>
                      {EXCEL_COLUMNS.map((c) => (
                        <td key={c} className={`px-2 py-0.5 border border-gray-200 text-black whitespace-nowrap ${c === 'Amount' || c === 'Qty' ? 'text-right' : 'text-left'}`}>
                          {c === "Amount"
                            ? row[c].toLocaleString("en-IN", { minimumFractionDigits: 2 })
                            : row[c]}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Bottom Sheet Tabs */}
            <div className="bg-[#f3f2f1] border-t border-gray-300 px-2 py-1 flex items-center gap-4 text-xs h-8">
                <div className="flex gap-4">
                     <span className="font-bold text-green-700 border-b-2 border-green-700 px-2 bg-white">Sheet1</span>
                     <span className="text-gray-500 hover:bg-gray-200 px-2 rounded-full cursor-pointer">+</span>
                </div>
                <div className="flex-1"></div>
                <div className="flex gap-2 text-gray-500">
                    <span>Normal View</span>
                </div>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
