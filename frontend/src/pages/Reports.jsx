// Reports.jsx — Final Stable Version with Pagination and Local Sync
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
  const [excelData, setExcelData] = useState([]);
  const [message, setMessage] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const rowsPerPage = 20; // ✅ हर पेज पर 20 rows दिखेंगी

  useEffect(() => {
    loadLatestData();
  }, []);

  // ✅ Backend से latest data लोड करना
  const loadLatestData = async () => {
    try {
      const res = await axios.get(`${config.BACKEND_URL}/api/imports/latest`, {
        headers: { "Content-Type": "application/json" },
      });

      let flat = res.data.flatRows || [];
      if (!flat.length && res.data.rows) {
        flat = [
          ...(res.data.rows.sales || []),
          ...(res.data.rows.purchase || []),
          ...(res.data.rows.masters || []),
          ...(res.data.rows.outstanding || []),
        ];
      }

      // खाली या duplicate rows निकाल दो
      const cleanData = flat.filter(
        (r) => r && Object.values(r).join("").trim() !== ""
      );

      setExcelData(cleanData);
      localStorage.setItem("uploadedExcelData", JSON.stringify(cleanData));
      setMessage(`✅ ${cleanData.length} rows loaded successfully!`);
    } catch (err) {
      console.error("Load error:", err);
      const saved = localStorage.getItem("uploadedExcelData");
      if (saved) {
        setExcelData(JSON.parse(saved));
        setMessage("⚠️ Loaded data from local storage.");
      } else {
        setMessage("❌ Error loading data from backend.");
      }
    }
  };

  // ✅ Pagination logic
  const totalPages = Math.ceil(excelData.length / rowsPerPage);
  const start = (currentPage - 1) * rowsPerPage;
  const end = start + rowsPerPage;
  const currentRows = excelData.slice(start, end);

  const handleNext = () => {
    if (currentPage < totalPages) setCurrentPage(currentPage + 1);
  };

  const handlePrev = () => {
    if (currentPage > 1) setCurrentPage(currentPage - 1);
  };

  // ✅ Export to Excel
  const handleExport = () => {
    if (excelData.length === 0) return alert("No data to export!");
    const ws = XLSX.utils.json_to_sheet(excelData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Report");
    XLSX.writeFile(wb, "Tally_Report.xlsx");
  };

  // ✅ Export to PDF
  const handlePDF = () => {
    if (excelData.length === 0) return alert("No data to export!");
    const doc = new jsPDF();
    doc.text("Master Tally Data Report", 14, 15);
    doc.autoTable({
      head: [Object.keys(excelData[0])],
      body: excelData.map((r) => Object.values(r)),
      startY: 20,
      styles: { fontSize: 7 },
    });
    doc.save("Tally_Report.pdf");
  };

  return (
    <div className="min-h-screen bg-[#0a1628] text-white p-6">
      <div className="max-w-7xl mx-auto bg-[#12243d] rounded-2xl p-8 shadow-xl border border-[#1e3553]">
        <h2 className="text-2xl font-bold text-[#00f5ff] mb-4">
          📊 MASTER TALLY DATA (ROW VIEW)
        </h2>

        <div className="flex flex-wrap gap-3 items-center mb-6">
          <button
            onClick={loadLatestData}
            className="bg-gradient-to-r from-cyan-500 to-blue-500 px-5 py-2 rounded-lg font-semibold hover:opacity-90"
          >
            🔄 Reload
          </button>
          <button
            onClick={handleExport}
            className="bg-green-600 px-5 py-2 rounded-lg font-semibold hover:opacity-90"
          >
            📗 Export Excel
          </button>
          <button
            onClick={handlePDF}
            className="bg-orange-500 px-5 py-2 rounded-lg font-semibold hover:opacity-90"
          >
            📘 Export PDF
          </button>
        </div>

        {message && (
          <p className="text-[#4ee1ec] mb-4 font-medium">{message}</p>
        )}

        {excelData.length > 0 ? (
          <>
            <div className="overflow-x-auto bg-[#0f1e33] p-4 rounded-lg border border-[#1e3553]">
              <table className="min-w-full border border-[#1e3553] text-sm">
                <thead className="bg-[#132a4a] text-[#00f5ff]">
                  <tr>
                    {Object.keys(excelData[0] || {}).map((key, i) => (
                      <th
                        key={i}
                        className="px-3 py-2 border border-[#1e3553] text-left uppercase text-xs tracking-wider"
                      >
                        {key}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {currentRows.map((row, i) => (
                    <tr
                      key={i}
                      className={`hover:bg-[#1b355d] ${
                        i % 2 === 0 ? "bg-[#0f1e33]" : "bg-[#132a4a]"
                      }`}
                    >
                      {Object.keys(row).map((k, j) => (
                        <td
                          key={j}
                          className="px-3 py-2 border border-[#1e3553] text-gray-200 whitespace-nowrap"
                        >
                          {row[k]}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* ✅ Pagination Controls */}
            <div className="flex justify-between items-center mt-4 text-sm text-gray-300">
              <button
                onClick={handlePrev}
                disabled={currentPage === 1}
                className={`px-4 py-1 rounded-lg ${
                  currentPage === 1
                    ? "bg-gray-600 cursor-not-allowed"
                    : "bg-[#00f5ff] text-black"
                }`}
              >
                ⬅ Prev
              </button>
              <span>
                Page {currentPage} of {totalPages}
              </span>
              <button
                onClick={handleNext}
                disabled={currentPage === totalPages}
                className={`px-4 py-1 rounded-lg ${
                  currentPage === totalPages
                    ? "bg-gray-600 cursor-not-allowed"
                    : "bg-[#00f5ff] text-black"
                }`}
              >
                Next ➡
              </button>
            </div>
          </>
        ) : (
          <p className="text-gray-400 italic text-center py-8">
            No data found. Please load or upload data.
          </p>
        )}
      </div>
    </div>
  );
}
