// src/pages/Reports.jsx
import React, { useState, useEffect } from "react";
import jsPDF from "jspdf";
import "jspdf-autotable";
import * as XLSX from "xlsx";

export default function Reports() {
  const [data, setData] = useState([]);
  const [filtered, setFiltered] = useState([]);
  const [loading, setLoading] = useState(false);

  // Filter States
  const [search, setSearch] = useState("");
  const [partyFilter, setPartyFilter] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [salesmanFilter, setSalesmanFilter] = useState("");
  
  // Excel View States
  const [excelOpen, setExcelOpen] = useState(false);
  const [selectedCell, setSelectedCell] = useState(null); 
  const [cellStyles, setCellStyles] = useState({}); 
  const [activeTab, setActiveTab] = useState("Home");
  const [zoomLevel, setZoomLevel] = useState(100);

  const rowsPerPage = 50;
  const [page, setPage] = useState(1);

  const EXCEL_COLUMNS = [
    "Sr.No", "Date", "Voucher Number", "Voucher Type", "Party Name", 
    "Item Name", "Item Group", "Item Category", "Salesman", 
    "City/Area", "Qty", "Amount", "Narration"
  ];

  useEffect(() => {
    loadData();
  }, []);

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

  // Filter Logic
  useEffect(() => {
    let rows = [...data];
    if (search.trim()) {
      const s = search.toLowerCase();
      rows = rows.filter((r) => EXCEL_COLUMNS.some((c) => String(r[c]).toLowerCase().includes(s)));
    }
    if (partyFilter) rows = rows.filter((r) => r["Party Name"] === partyFilter);
    if (categoryFilter) rows = rows.filter((r) => r["Item Category"] === categoryFilter);
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

  // Total Calculation Logic (Fixes double counting)
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

  // --- EXCEL VIEW FUNCTIONS ---
  const handleCellClick = (rowIndex, colKey) => {
    setSelectedCell({ row: rowIndex, col: colKey });
  };

  const toggleStyle = (style) => {
    if (!selectedCell) return;
    const key = `${selectedCell.row}-${selectedCell.col}`;
    setCellStyles(prev => {
      const current = prev[key] || {};
      if (['left', 'center', 'right'].includes(style)) {
        return { ...prev, [key]: { ...current, align: style } };
      } else {
        return { ...prev, [key]: { ...current, [style]: !current[style] } };
      }
    });
  };

  const handleSort = (direction) => {
    if (!selectedCell) return;
    const col = selectedCell.col;
    const sorted = [...filtered].sort((a, b) => {
      if (a[col] < b[col]) return direction === 'asc' ? -1 : 1;
      if (a[col] > b[col]) return direction === 'asc' ? 1 : -1;
      return 0;
    });
    setFiltered(sorted);
  };

  const handleInsertRow = () => {
    const newRow = {};
    EXCEL_COLUMNS.forEach(c => newRow[c] = c === 'Amount' || c === 'Qty' ? 0 : "");
    const index = selectedCell ? selectedCell.row : 0;
    const newData = [...filtered];
    newData.splice(index + 1, 0, newRow);
    setFiltered(newData);
  };

  const getCellStyle = (rowIndex, colKey) => {
    const key = `${rowIndex}-${colKey}`;
    const style = cellStyles[key] || {};
    return {
      fontWeight: style.bold ? 'bold' : 'normal',
      fontStyle: style.italic ? 'italic' : 'normal',
      textDecoration: style.underline ? 'underline' : 'none',
      textAlign: style.align || (colKey === 'Amount' || colKey === 'Qty' ? 'right' : 'left'),
      backgroundColor: (selectedCell?.row === rowIndex && selectedCell?.col === colKey) ? '#e6f2ff' : 'transparent',
      border: (selectedCell?.row === rowIndex && selectedCell?.col === colKey) ? '2px solid #217346' : '1px solid #e0e0e0'
    };
  };

  return (
    // FIX: Using Flexbox for full height layout without overflow issues
    <div className="flex flex-col h-[calc(100vh-20px)] w-full bg-[#0a1628] text-white p-2 sm:p-3 overflow-hidden"> 
      
      {/* HEADER */}
      <h2 className="text-xl sm:text-2xl font-bold text-[#00f5ff] mb-2 sm:mb-3 flex-shrink-0">
        📊 MASTER REPORT
      </h2>

      {/* TOP BAR (Filters & Buttons) */}
      <div className="flex flex-wrap items-center gap-2 bg-[#112233] p-2 sm:p-3 rounded-xl border border-[#1e3553] flex-shrink-0 mb-3">
        
        <div className="flex gap-2">
            <button onClick={loadData} className="px-3 py-1.5 rounded-lg bg-[#00f5ff] text-black font-bold text-[10px] sm:text-xs hover:bg-[#00d1da]">🔄 Reload</button>
            <button onClick={exportExcel} className="px-3 py-1.5 rounded-lg bg-green-600 text-white font-bold text-[10px] sm:text-xs hover:bg-green-500">📊 Excel</button>
            <button onClick={exportPDF} className="px-3 py-1.5 rounded-lg bg-orange-500 text-white font-bold text-[10px] sm:text-xs hover:bg-orange-400">📄 PDF</button>
            <button onClick={() => setExcelOpen(true)} className="px-3 py-1.5 rounded-lg bg-blue-600 text-white font-bold text-[10px] sm:text-xs hover:bg-blue-500">🧾 View</button>
        </div>

        <input placeholder="Search..." value={search} onChange={(e) => setSearch(e.target.value)} 
          className="px-2 py-1.5 rounded-lg text-[10px] sm:text-xs bg-[#0a1628] border border-[#1e3553] w-28 sm:w-32 text-white focus:border-[#00f5ff]" />

        <select value={partyFilter} onChange={(e) => setPartyFilter(e.target.value)} className="px-2 py-1.5 bg-[#0a1628] border border-[#1e3553] rounded-lg text-[10px] sm:text-xs w-28 sm:w-32 text-white">
          <option value="">All Parties</option>
          {parties.map((p) => <option key={p}>{p}</option>)}
        </select>

        <select value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)} className="px-2 py-1.5 bg-[#0a1628] border border-[#1e3553] rounded-lg text-[10px] sm:text-xs w-28 sm:w-32 text-white">
          <option value="">All Categories</option>
          {categories.map((c) => <option key={c}>{c}</option>)}
        </select>
      </div>

      {/* TABLE CONTAINER - This ensures the table fits and scrolls correctly on both Mobile and PC */}
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
              key={row.SrNo}
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
        <button disabled={page === 1} onClick={() => setPage(page - 1)} className="px-3 py-1.5 bg-[#00f5ff] text-black font-bold rounded-lg disabled:opacity-40">Previous</button>
        <span className="text-[#00f5ff] font-bold">Page {page} of {totalPages}</span>
        <button disabled={page === totalPages} onClick={() => setPage(page + 1)} className="px-3 py-1.5 bg-[#00f5ff] text-black font-bold rounded-lg disabled:opacity-40">Next</button>
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

            {/* Menu Tabs */}
            <div className="bg-[#217346] text-white px-2 pt-2 flex gap-1 text-xs select-none overflow-x-auto">
                {["Home", "Insert", "Data", "View"].map((menu) => (
                    <div key={menu} onClick={() => setActiveTab(menu)}
                        className={`px-3 sm:px-4 py-1 rounded-t-sm cursor-pointer whitespace-nowrap ${activeTab === menu ? 'bg-[#f3f2f1] text-black font-semibold' : 'hover:bg-[#1a5c38]'}`}>
                        {menu}
                    </div>
                ))}
            </div>

            {/* Toolbar Ribbon */}
            <div className="bg-[#f3f2f1] border-b border-gray-300 p-2 flex items-center gap-2 sm:gap-4 text-gray-700 h-16 sm:h-20 select-none overflow-x-auto whitespace-nowrap">
                
                {activeTab === "Home" && (
                    <>
                        <div onClick={exportExcel} className="flex flex-col items-center border-r pr-2 border-gray-300 cursor-pointer hover:bg-gray-200 p-1 rounded min-w-[40px]">
                            <span className="text-lg">💾</span>
                            <span className="text-[9px]">Save</span>
                        </div>
                        <div className="flex flex-col gap-1 border-r pr-2 border-gray-300">
                             <div className="flex gap-1 text-sm">
                                <button onClick={() => toggleStyle('bold')} className="px-2 bg-white border rounded font-bold hover:bg-gray-200">B</button>
                                <button onClick={() => toggleStyle('italic')} className="px-2 bg-white border rounded italic font-serif hover:bg-gray-200">I</button>
                                <button onClick={() => toggleStyle('underline')} className="px-2 bg-white border rounded underline hover:bg-gray-200">U</button>
                            </div>
                            <span className="text-[9px] text-center">Font</span>
                        </div>
                        <div className="flex flex-col gap-1 border-r pr-3 border-gray-300">
                            <div className="flex gap-1 text-xs">
                                <button onClick={() => toggleStyle('left')} className="px-2 py-0.5 bg-white border rounded hover:bg-gray-200">Left</button>
                                <button onClick={() => toggleStyle('center')} className="px-2 py-0.5 bg-white border rounded hover:bg-gray-200">Center</button>
                                <button onClick={() => toggleStyle('right')} className="px-2 py-0.5 bg-white border rounded hover:bg-gray-200">Right</button>
                            </div>
                            <span className="text-[10px] text-center">Alignment</span>
                        </div>
                    </>
                )}

                {activeTab === "Insert" && (
                    <div onClick={handleInsertRow} className="flex flex-col items-center border-r pr-2 border-gray-300 cursor-pointer hover:bg-gray-200 p-1 rounded">
                        <span className="text-lg">➕</span>
                        <span className="text-[9px]">Row</span>
                    </div>
                )}

                {activeTab === "Data" && (
                    <>
                        <div onClick={() => handleSort('asc')} className="flex flex-col items-center border-r pr-2 border-gray-300 cursor-pointer hover:bg-gray-200 p-1 rounded">
                            <span className="text-lg">⬇️</span>
                            <span className="text-[9px]">A-Z</span>
                        </div>
                        <div onClick={() => handleSort('desc')} className="flex flex-col items-center border-r pr-2 border-gray-300 cursor-pointer hover:bg-gray-200 p-1 rounded">
                            <span className="text-lg">⬆️</span>
                            <span className="text-[9px]">Z-A</span>
                        </div>
                    </>
                )}

                {activeTab === "View" && (
                     <>
                        <div onClick={() => setZoomLevel(prev => Math.min(prev + 10, 150))} className="flex flex-col items-center border-r pr-2 border-gray-300 cursor-pointer hover:bg-gray-200 p-1 rounded">
                            <span className="text-lg">🔍+</span>
                            <span className="text-[9px]">In</span>
                        </div>
                        <div onClick={() => setZoomLevel(prev => Math.max(prev - 10, 50))} className="flex flex-col items-center border-r pr-2 border-gray-300 cursor-pointer hover:bg-gray-200 p-1 rounded">
                            <span className="text-lg">🔍-</span>
                            <span className="text-[9px]">Out</span>
                        </div>
                        <div onClick={() => setZoomLevel(100)} className="flex flex-col items-center border-r pr-2 border-gray-300 cursor-pointer hover:bg-gray-200 p-1 rounded">
                            <span className="text-lg">↺</span>
                            <span className="text-[9px]">Reset</span>
                        </div>
                    </>
                )}
            </div>

            {/* Formula Bar */}
            <div className="flex items-center gap-2 px-2 py-1 bg-white border-b border-gray-300 text-xs">
                <span className="font-bold text-gray-500 border border-gray-300 bg-gray-50 px-2 py-0.5 rounded min-w-[30px] text-center">
                    {selectedCell ? `${String.fromCharCode(65 + EXCEL_COLUMNS.indexOf(selectedCell.col))}${selectedCell.row + 1}` : "A1"}
                </span>
                <span className="text-gray-400">ƒx</span>
                <div className="flex-1 border border-gray-300 p-1 h-6 bg-white flex items-center px-2 text-gray-600 truncate">
                    {selectedCell ? filtered[selectedCell.row][selectedCell.col] : ""}
                </div>
            </div>

            {/* Excel Table Content */}
            <div className="flex-1 overflow-auto bg-[#e6e6e6] relative">
              <table className="w-full text-xs border-collapse bg-white cursor-default select-none table-fixed"
                style={{ transform: `scale(${zoomLevel / 100})`, transformOrigin: 'top left', minWidth: '100%' }}
              >
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
                        <td key={c} onClick={() => handleCellClick(rIndex, c)} style={getCellStyle(rIndex, c)}
                            className="px-1 sm:px-2 py-0.5 border border-gray-200 text-black whitespace-nowrap overflow-hidden text-ellipsis">
                          {c === "Amount" && typeof row[c] === 'number' ? row[c].toLocaleString("en-IN", { minimumFractionDigits: 2 }) : row[c]}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

             {/* Footer Status Bar */}
            <div className="bg-[#f3f2f1] border-t border-gray-300 px-2 py-1 flex items-center gap-2 sm:gap-4 text-[10px] sm:text-xs h-8">
                <span className="font-bold text-green-700 border-b-2 border-green-700 px-2 bg-white">Sheet1</span>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
