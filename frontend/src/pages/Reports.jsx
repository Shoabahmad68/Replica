import React, { useState, useEffect, createContext, useContext } from "react";
import axios from "axios";
import jsPDF from "jspdf";
import "jspdf-autotable";
import * as XLSX from "xlsx";
import config from "../config.js";

// Global Data Context
export const DataContext = createContext();
export function useReportData() {
  return useContext(DataContext);
}

export default function Reports() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [page, setPage] = useState(1);
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [rowsPerPage, setRowsPerPage] = useState(50);

  // Exact columns
  const EXCEL_COLUMNS = [
    "Sr.No", "Date", "Vch No.", "Party Name", "City/Area",
    "Party Group", "State", "ItemName", "Item Group", "Item Category",
    "Qty", "Alt Qty", "Rate", "UOM", "Salesman", "Vch Type", "Amount"
  ];

  // Load from localStorage if available (refresh persistence)
  useEffect(() => {
    const saved = localStorage.getItem("savedReportData");
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setData(parsed);
          setMessage("📁 Local data restored after refresh.");
        }
      } catch {}
    }
  }, []);

  useEffect(() => {
    loadLatestData();
  }, []);

  // Load data from backend
  async function loadLatestData() {
    setLoading(true);
    setMessage("⏳ Tally से डेटा लोड हो रहा है...");

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

        const withSrNo = combined.map((row, i) => ({
          "Sr.No": i + 1,
          ...row
        }));

        setData(withSrNo);
        localStorage.setItem("savedReportData", JSON.stringify(withSrNo));
        setMessage(`✅ ${withSrNo.length} records successfully loaded!`);
      } else {
        setMessage("⚠️ कोई डेटा नहीं मिला।");
        setData([]);
      }
    } catch (err) {
      setMessage(`❌ Error: ${err.message}`);
    } finally {
      setLoading(false);
    }
  }

  const handleFileChange = (e) => setFile(e.target.files[0]);

  // Excel Upload
  const handleUpload = async () => {
    if (!file) return alert("⚠️ Excel file चुनें!");

    try {
      setUploading(true);
      setMessage("⏳ Excel file process हो रही है...");

      const fileData = await file.arrayBuffer();
      const workbook = XLSX.read(fileData);
      const sheet = workbook.Sheets[workbook.SheetNames[0]];
      const jsonData = XLSX.utils.sheet_to_json(sheet);

      const withSrNo = jsonData.map((row, i) => ({
        "Sr.No": i + 1,
        ...row
      }));

      setData(withSrNo);
      localStorage.setItem("savedReportData", JSON.stringify(withSrNo));

      setMessage(`✅ Upload successful! ${withSrNo.length} rows loaded.`);
      setFile(null);
    } catch (error) {
      setMessage(`❌ ${error.message}`);
    } finally {
      setUploading(false);
    }
  };

  // XML Upload
  const handleUploadXML = async () => {
    if (!file) return alert("⚠️ XML file चुनें!");

    try {
      setUploading(true);
      setMessage("⏳ XML process हो रही है...");

      const xmlText = await file.text();
      const parser = new DOMParser();
      const xmlDoc = parser.parseFromString(xmlText, "text/xml");

      const rows = [...xmlDoc.getElementsByTagName("ROW")].map((node, i) => {
        const obj = { "Sr.No": i + 1 };

        EXCEL_COLUMNS.forEach((col) => {
          if (col === "Sr.No") return;
          const tag = col.replace(/\s+/g, "_").toUpperCase();
          const el = node.getElementsByTagName(tag)[0];
          obj[col] = el ? el.textContent : "";
        });

        return obj;
      });

      setData(rows);
      localStorage.setItem("savedReportData", JSON.stringify(rows));

      setMessage(`✅ XML upload successful! ${rows.length} rows loaded.`);
      setFile(null);
    } catch (err) {
      setMessage(`❌ XML Error: ${err.message}`);
    } finally {
      setUploading(false);
    }
  };

  // Export Excel
  const handleExportExcel = () => {
    if (!data.length) return alert("कोई डेटा नहीं है!");
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Data");
    XLSX.writeFile(wb, `Report_${Date.now()}.xlsx`);
    setMessage("✅ Excel export हो गया!");
  };

  // Export PDF
  const handleExportPDF = () => {
    if (!data.length) return alert("कोई डेटा नहीं है!");
    const doc = new jsPDF("l", "mm", "a3");
    doc.text("Master Report", 14, 15);

    const pdfColumns = EXCEL_COLUMNS.slice(0, 12);

    doc.autoTable({
      head: [pdfColumns],
      body: data.slice(0, 500).map((r) => pdfColumns.map((k) => r[k] ?? "")),
      startY: 20,
      styles: { fontSize: 6 },
    });

    doc.save(`Report_${Date.now()}.pdf`);
    setMessage("✅ PDF export हो गया!");
  };

  // Clear data
  const handleClear = () => {
    if (confirm("सारा data clear करना है?")) {
      setData([]);
      localStorage.removeItem("savedReportData");
      setMessage("🧹 Data cleared!");
    }
  };

  // Pagination
  const totalPages = Math.ceil(data.length / rowsPerPage) || 1;
  const start = (page - 1) * rowsPerPage;
  const pageRows = data.slice(start, start + rowsPerPage);

  // Summary
  const summary = {
    total: data.length,
    totalAmount: data.reduce((sum, r) => sum + (parseFloat(r["Amount"]) || 0), 0),
    sales: data.filter(r => r["Vch Type"]?.toLowerCase().includes("sales")).length,
    purchase: data.filter(r => r["Vch Type"]?.toLowerCase().includes("purchase")).length,
    uniqueParties: new Set(data.map(r => r["Party Name"])).size,
  };

  return (
    <DataContext.Provider value={{ data, setData, loading }}>
      <div className="min-h-screen bg-[#0a1628] text-white p-6">
        <div className="max-w-[98%] mx-auto bg-[#12243d] rounded-2xl p-6 shadow-xl border border-[#1e3553]">

          {/* HEADER */}
          <div className="flex justify-between items-center mb-6 border-b border-[#1e3553] pb-4">
            <h2 className="text-3xl font-bold text-[#00f5ff]">📊 MASTER DATA REPORT</h2>
            <div className="text-right">
              <p className="text-sm text-gray-400">Total Records</p>
              <p className="text-2xl font-bold text-[#00f5ff]">{data.length}</p>
            </div>
          </div>

          {/* SUMMARY */}
          {data.length > 0 && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
              <div className="bg-[#0f1e33] p-4 rounded-lg border border-[#1e3553]">
                <p className="text-gray-400 text-sm">Total Amount</p>
                <p className="text-xl font-bold text-green-400">
                  ₹{summary.totalAmount.toLocaleString("en-IN")}
                </p>
              </div>
              <div className="bg-[#0f1e33] p-4 rounded-lg border border-[#1e3553]">
                <p className="text-gray-400 text-sm">Sales</p>
                <p className="text-xl font-bold text-blue-400">{summary.sales}</p>
              </div>
              <div className="bg-[#0f1e33] p-4 rounded-lg border border-[#1e3553]">
                <p className="text-gray-400 text-sm">Purchase</p>
                <p className="text-xl font-bold text-orange-400">{summary.purchase}</p>
              </div>
              <div className="bg-[#0f1e33] p-4 rounded-lg border border-[#1e3553]">
                <p className="text-gray-400 text-sm">Unique Parties</p>
                <p className="text-xl font-bold text-purple-400">{summary.uniqueParties}</p>
              </div>
            </div>
          )}

          {/* ACTION BUTTONS */}
          <div className="flex flex-wrap gap-3 mb-4 items-center bg-[#0f1e33] p-4 rounded-lg border border-[#1e3553]">

            {/* XML Upload */}
            <div className="flex gap-2 items-center border-r border-[#1e3553] pr-4">
              <input
                type="file"
                accept=".xml"
                onChange={handleFileChange}
                className="text-sm border border-[#00f5ff] rounded-lg bg-[#0a1628] p-2 text-gray-300"
              />
              <button
                onClick={handleUploadXML}
                disabled={uploading || !file}
                className="bg-purple-600 px-5 py-2 rounded-lg font-semibold hover:bg-purple-700 disabled:opacity-50"
              >
                {uploading ? "⏳ Uploading..." : "📤 Upload XML"}
              </button>
            </div>

            {/* Excel Upload */}
            <div className="flex gap-2 items-center border-r border-[#1e3553] pr-4">
              <input
                type="file"
                accept=".xls,.xlsx"
                onChange={handleFileChange}
                className="text-sm border border-[#00f5ff] rounded-lg bg-[#0a1628] p-2 text-gray-300"
              />
              <button
                onClick={handleUpload}
                disabled={uploading || !file}
                className="bg-blue-600 px-5 py-2 rounded-lg font-semibold hover:bg-blue-700 disabled:opacity-50"
              >
                {uploading ? "⏳ Uploading..." : "📤 Upload Excel"}
              </button>
            </div>

            <button onClick={loadLatestData} className="bg-[#00f5ff] text-black px-5 py-2 rounded-lg font-semibold">
              🔄 Reload from Tally
            </button>
            <button onClick={handleExportExcel} className="bg-green-600 px-5 py-2 rounded-lg font-semibold">
              📊 Export Excel
            </button>
            <button onClick={handleExportPDF} className="bg-orange-500 px-5 py-2 rounded-lg font-semibold">
              📄 Export PDF
            </button>
            <button onClick={handleClear} className="bg-red-600 px-5 py-2 rounded-lg font-semibold">
              🧹 Clear
            </button>
          </div>

          {message && (
            <div className="text-center py-3 px-4 mb-4 bg-[#0f1e33] rounded-lg border border-[#1e3553]">
              <p className="text-[#4ee1ec]">{message}</p>
            </div>
          )}

          {/* TABLE */}
          {data.length > 0 ? (
            <div className="bg-[#0f1e33] rounded-lg border border-[#1e3553] overflow-hidden">
              <div className="p-4 border-b border-[#1e3553] flex justify-between items-center">
                <p className="text-sm text-gray-400">
                  Showing {start + 1} to {Math.min(start + rowsPerPage, data.length)} of {data.length} records
                </p>

                <div className="flex gap-2 items-center">
                  <span className="text-sm text-gray-400">Rows:</span>
                  <select
                    className="bg-[#0a1628] border border-[#1e3553] rounded px-2 py-1 text-sm"
                    value={rowsPerPage}
                    onChange={(e) => setRowsPerPage(Number(e.target.value))}
                  >
                    <option value={25}>25</option>
                    <option value={50}>50</option>
                    <option value={100}>100</option>
                    <option value={500}>500</option>
                  </select>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="min-w-full border-collapse text-sm">
                  <thead className="bg-[#132a4a] text-[#00f5ff] sticky top-0">
                    <tr>
                      {EXCEL_COLUMNS.map((col) => (
                        <th key={col} className="px-3 py-3 border border-[#1e3553] whitespace-nowrap">
                          {col}
                        </th>
                      ))}
                    </tr>
                  </thead>

                  <tbody>
                    {pageRows.map((row, i) => (
                      <tr key={i} className={i % 2 ? "bg-[#132a4a]" : "bg-[#0f1e33]"}>
                        {EXCEL_COLUMNS.map((col) => (
                          <td key={col} className="px-3 py-2 border border-[#1e3553] whitespace-nowrap">
                            {col === "Amount" && row[col]
                              ? `₹${parseFloat(row[col]).toLocaleString("en-IN")}`
                              : row[col] || "—"}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="flex justify-between items-center p-4 border-t border-[#1e3553]">
                <button
                  onClick={() => setPage((p) => Math.max(p - 1, 1))}
                  disabled={page === 1}
                  className="px-5 py-2 rounded-lg bg-[#00f5ff] text-black font-semibold disabled:bg-gray-600"
                >
                  ⬅ Previous
                </button>

                <span className="font-semibold text-gray-300">
                  Page {page} / {totalPages}
                </span>

                <button
                  onClick={() => setPage((p) => Math.min(p + 1, totalPages))}
                  disabled={page === totalPages}
                  className="px-5 py-2 rounded-lg bg-[#00f5ff] text-black font-semibold disabled:bg-gray-600"
                >
                  Next ➡
                </button>
              </div>
            </div>
          ) : (
            <div className="text-center py-16 bg-[#0f1e33] rounded-lg border border-[#1e3553]">
              <p className="text-gray-400 text-xl mb-3">📭 कोई डेटा उपलब्ध नहीं है</p>
              <button
                onClick={loadLatestData}
                className="bg-[#00f5ff] px-6 py-3 rounded-lg text-black font-semibold hover:bg-[#00d4e6]"
              >
                🔄 Reload Data
              </button>
            </div>
          )}
        </div>
      </div>
    </DataContext.Provider>
  );
}
