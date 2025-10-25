import React, { useState, useEffect } from "react";
import axios from "axios";
import jsPDF from "jspdf";
import "jspdf-autotable";
import * as XLSX from "xlsx";
import {
  Chart as ChartJS,
  ArcElement,
  Tooltip,
  Legend,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
} from "chart.js";
import { Pie, Bar } from "react-chartjs-2";
import config from "../config.js";

ChartJS.register(ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement, Title);

export default function Reports() {
  const [file, setFile] = useState(null);
  const [excelData, setExcelData] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState("");
  const [hiddenColumns, setHiddenColumns] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const rowsPerPage = 20;
const [selectedType, setSelectedType] = useState("All");


  useEffect(() => {
    loadLatestData();
  }, []);


// ✅ Backend से full structured data load करना (fixed)
const loadLatestData = async () => {
  try {
    const res = await axios.get(`${config.BACKEND_URL}/api/imports/latest`, {
      headers: { "Content-Type": "application/json" },
    });

    // कुछ backend responses में data.rows JSON string के रूप में आता है
// double-layer parse fix
let raw = res.data?.rows;
if (typeof raw === "string") {
  try {
    raw = JSON.parse(raw);
    if (typeof raw === "string") {
      // second-level parse (Cloudflare KV double-stringified)
      raw = JSON.parse(raw);
    }
  } catch (e) {
    console.warn("⚠️ rows double-parse failed:", e.message);
    raw = {};
  }
}


    // अब sales/purchase/masters/outstanding flatten करके combine करो
    const allData = [
      ...(raw?.sales || []).map(r => ({ ...r, __type: "Sales" })),
      ...(raw?.purchase || []).map(r => ({ ...r, __type: "Purchase" })),
      ...(raw?.masters || []).map(r => ({ ...r, __type: "Masters" })),
      ...(raw?.outstanding || []).map(r => ({ ...r, __type: "Outstanding" })),
    ];

    const clean = allData.filter(r => r && Object.values(r).join("").trim() !== "");

    if (!clean.length) {
      setMessage("⚠️ No records found in backend (check if data push completed).");
    } else {
      setMessage(`✅ Loaded ${clean.length} rows successfully.`);
    }

    setExcelData(clean);
    localStorage.setItem("uploadedExcelData", JSON.stringify(clean));
  } catch (err) {
    console.error("❌ Load error:", err.message);
    const saved = localStorage.getItem("uploadedExcelData");
    if (saved) {
      const local = JSON.parse(saved);
      setExcelData(local);
      setMessage("⚠️ Loaded from local storage (backend offline).");
    } else {
      setMessage("❌ Backend unreachable and no local data found.");
    }
  }
};


  // ✅ Upload file manually
  const handleFileChange = (e) => setFile(e.target.files[0]);
  const handleUpload = async () => {
    if (!file) return setMessage("⚠️ Please select a file first!");
    const formData = new FormData();
    formData.append("file", file);
    try {
      setUploading(true);
      const res = await axios.post(`${config.BACKEND_URL}/api/imports/upload`, formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      if (res.data && res.data.count) {
        setMessage(`✅ Uploaded successfully. Parsed ${res.data.count} rows.`);
        setTimeout(() => loadLatestData(), 1000);
      } else setMessage("⚠️ Upload done but no rows found.");
    } catch {
      setMessage("❌ Upload failed. Check backend logs.");
    } finally {
      setUploading(false);
    }
  };

// ✅ Apply filter and pagination
const filtered = selectedType === "All"
  ? excelData
  : excelData.filter((r) => r.__type === selectedType);

const totalPages = Math.ceil(filtered.length / rowsPerPage);
const start = (currentPage - 1) * rowsPerPage;
const end = start + rowsPerPage;
const currentRows = filtered.slice(start, end);

  // ✅ Exporters
  const handleExport = () => {
    if (!excelData.length) return alert("No data to export!");
    const ws = XLSX.utils.json_to_sheet(excelData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Report");
    XLSX.writeFile(wb, "Exported_Report.xlsx");
  };
  const handlePDF = () => {
    if (!excelData.length) return alert("No data to export as PDF!");
    const doc = new jsPDF();
    doc.text("Master Analysis Report", 14, 15);
    doc.autoTable({
      head: [Object.keys(excelData[0])],
      body: excelData.map((r) => Object.values(r)),
      startY: 20,
      styles: { fontSize: 8 },
    });
    doc.save("Report.pdf");
  };
  const handleClear = () => {
    setExcelData([]);
    setMessage("🧹 Cleared view (backend data remains).");
  };

  // ✅ Chart summaries
  const productTotals = {};
  const salesmanTotals = {};
  excelData.forEach((r) => {
    const prod = r["Item Category"] || r["Category"] || r["Item"] || "Unknown";
    const sales = r["Salesman"] || r["Agent"] || "Unknown";
    const amt = parseFloat(r["Amount"] || r["Value"] || 0) || 0;
    productTotals[prod] = (productTotals[prod] || 0) + amt;
    salesmanTotals[sales] = (salesmanTotals[sales] || 0) + amt;
  });

  const productChartData = {
    labels: Object.keys(productTotals),
    datasets: [{ label: "Product Sales (₹)", data: Object.values(productTotals) }],
  };
  const salesmanChartData = {
    labels: Object.keys(salesmanTotals),
    datasets: [{ label: "Salesman Sales (₹)", data: Object.values(salesmanTotals) }],
  };

  return (
    <div className="min-h-screen bg-[#0a1628] text-white p-6">
      <div className="max-w-6xl mx-auto bg-[#12243d] rounded-2xl p-8 shadow-xl border border-[#1e3553]">
        <h2 className="text-3xl font-bold text-[#00f5ff] mb-6 text-start">
          📊 IMPORT EXCEL REPORT DATASHEET
        </h2>

        {/* Buttons */}
        <div className="flex flex-wrap gap-3 mb-6">
          <input
            type="file"
            accept=".xls,.xlsx,.csv"
            onChange={handleFileChange}
            className="text-sm text-gray-300 border border-[#00f5ff] rounded-lg bg-[#0a1628] p-2"
          />
          <button onClick={handleUpload} disabled={uploading}
            className="bg-gradient-to-r from-cyan-500 to-blue-500 px-5 py-2 rounded-lg font-semibold hover:opacity-90">
            {uploading ? "Uploading..." : "Upload"}
          </button>
          <button onClick={loadLatestData}
            className="bg-blue-600 px-5 py-2 rounded-lg hover:opacity-90">
            Reload
          </button>
          <button onClick={handleExport}
            className="bg-green-600 px-5 py-2 rounded-lg hover:opacity-90">
            Export
          </button>
          <button onClick={handlePDF}
            className="bg-orange-500 px-5 py-2 rounded-lg hover:opacity-90">
            PDF
          </button>
          <button onClick={handleClear}
            className="bg-red-600 px-5 py-2 rounded-lg hover:opacity-90">
            Clear
          </button>
        </div>

        {message && <p className="text-center mb-4 text-[#4ee1ec] font-medium">{message}</p>}

        {excelData.length > 0 ? (
          <>
            {/* Charts */}
            <div className="grid md:grid-cols-2 gap-6 mb-6">
              <div className="bg-[#0f1e33] p-6 rounded-xl h-[280px] overflow-hidden">
                <h3 className="text-lg font-semibold text-[#00f5ff] mb-2">📦 Product Summary</h3>
                <Pie data={productChartData} options={{ maintainAspectRatio: false }} />
              </div>
              <div className="bg-[#0f1e33] p-6 rounded-xl h-[280px] overflow-hidden">
                <h3 className="text-lg font-semibold text-[#00f5ff] mb-2">👨‍💼 Salesman Summary</h3>
                <Bar data={salesmanChartData} options={{ maintainAspectRatio: false }} />
              </div>
            </div>


{/* ✅ Filter Controls */}
<div className="flex gap-2 mb-4">
  {["All", "Sales", "Purchase", "Masters", "Outstanding"].map((t) => (
    <button
      key={t}
      onClick={() => { setSelectedType(t); setCurrentPage(1); }}
      className={`px-4 py-1 rounded-lg border ${selectedType === t ? "bg-[#00f5ff] text-black" : "bg-[#0f1e33] text-gray-200"}`}
    >
      {t}
    </button>
  ))}
</div>



            {/* Table */}
            <div className="overflow-x-auto bg-[#0f1e33] p-4 rounded-lg border border-[#1e3553]">
              <table className="min-w-full border border-[#1e3553] text-sm">
                <thead className="bg-[#132a4a] text-[#00f5ff]" style={{ position: "sticky", top: 0, zIndex: 5 }}>

                  <tr>
                    {Object.keys(currentRows[0] || {}).map((k, i) => (
                      <th key={i} className="px-4 py-2 border border-[#1e3553] text-left uppercase text-xs tracking-wider">{k}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {currentRows.map((r, i) => (
                    <tr key={i} className={`hover:bg-[#1b355d] ${i % 2 ? "bg-[#132a4a]" : "bg-[#0f1e33]"}`}>
                      {Object.keys(r).map((k, j) => (
                        <td key={j} className="px-4 py-2 border border-[#1e3553] text-gray-200">{r[k]}</td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>

              {/* Pagination */}
              <div className="flex justify-between items-center mt-3 text-sm text-gray-300">
                <button onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))}
                  disabled={currentPage === 1}
                  className={`px-4 py-1 rounded-lg ${currentPage === 1 ? "bg-gray-600 cursor-not-allowed" : "bg-[#00f5ff] text-black"}`}>
                  ⬅ Prev
                </button>
                <span>Page {currentPage} of {totalPages}</span>
                <button onClick={() => setCurrentPage((p) => Math.min(p + 1, totalPages))}
                  disabled={currentPage === totalPages}
                  className={`px-4 py-1 rounded-lg ${currentPage === totalPages ? "bg-gray-600 cursor-not-allowed" : "bg-[#00f5ff] text-black"}`}>
                  Next ➡
                </button>
              </div>
              <p className="text-right text-xs text-gray-400 mt-2">
                Showing {currentRows.length} of {filtered.length} rsssssssssssows
              </p>
            </div>
          </>
        ) : (
          <p className="text-gray-400 italic text-center py-8">
            No data uploaded yet. Please upload or reload.
          </p>
        )}
      </div>
    </div>
  );
}
