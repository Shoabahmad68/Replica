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

ChartJS.register(ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement, Title);

export default function Reports() {
  const [file, setFile] = useState(null);
  const [fileName, setFileName] = useState("");
  const [excelData, setExcelData] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState("");
  const [hiddenColumns, setHiddenColumns] = useState([]);

  useEffect(() => {
    loadLatestData();
  }, []);

  // ✅ Backend से data लोड करना + fallback
  const loadLatestData = async () => {
    try {
      const backendURL =
        window.location.hostname === "localhost"
          ? "http://localhost:4000"
          : "http://" + window.location.hostname + ":4000";

      const res = await axios.get(`${backendURL}/api/imports/latest`);
      const rawData = res.data?.data || res.data?.rows || [];

      // ✅ Remove "total", "grand total", "sub total" rows globally
      const cleanData = rawData.filter((row) => {
        if (!row) return false;
        const values = Object.values(row || {})
          .join(" ")
          .toLowerCase();
        const skipWords = ["total", "grand total", "sub total", "overall total"];
        return !skipWords.some((word) => values.includes(word)) && values.trim() !== "";
      });

      if (cleanData.length > 0) {
        setExcelData(cleanData);
        localStorage.setItem("uploadedExcelData", JSON.stringify(cleanData));
        setMessage("✅ Latest data loaded successfully!");
      } else {
        setMessage("⚠️ No valid data found (totals skipped).");
      }
    } catch (err) {
      console.error("Load error:", err);
      const saved = localStorage.getItem("uploadedExcelData");
      if (saved) {
        setExcelData(JSON.parse(saved));
        setMessage("⚠️ Loaded data from local storage (backend not reachable).");
      } else {
        setMessage("❌ Error loading data from backend.");
      }
    }
  };

  // ✅ File Upload Logic
  const handleFileChange = (e) => {
    setFile(e.target.files[0]);
    setFileName(e.target.files[0]?.name || "");
  };

  const handleUpload = async () => {
    if (!file) {
      setMessage("⚠️ Please select an Excel file first!");
      return;
    }

    const formData = new FormData();
    formData.append("file", file);

    try {
      setUploading(true);
      setMessage("⏳ Uploading file...");

      const res = await axios.post("http://localhost:4000/api/imports/upload", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      if (res.data && res.data.count) {
        setMessage(`✅ Uploaded successfully! Parsed ${res.data.count} rows.`);
        loadLatestData();
      } else {
        setMessage("⚠️ File uploaded, but no rows found.");
      }
    } catch (err) {
      console.error("Upload error:", err);
      setMessage("❌ Upload failed. Check backend logs.");
    } finally {
      setUploading(false);
    }
  };

  // ✅ Export as Excel
  const handleExport = () => {
    if (excelData.length === 0) {
      alert("No data to export!");
      return;
    }
    const ws = XLSX.utils.json_to_sheet(excelData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Report");
    XLSX.writeFile(wb, "Exported_Report.xlsx");
  };

  // ✅ Export as PDF
  const handlePDF = () => {
    if (excelData.length === 0) {
      alert("No data to export as PDF!");
      return;
    }
    const doc = new jsPDF();
    doc.text("Master Analysis Report", 14, 15);
    doc.autoTable({
      head: [Object.keys(excelData[0])],
      body: excelData.map((row) => Object.values(row)),
      startY: 20,
      styles: { fontSize: 8 },
    });
    doc.save("Report.pdf");
  };

  const handleClear = () => {
    setExcelData([]);
    setMessage("🧹 Cleared data view (data still stored in backend)");
  };

  // ✅ Chart Summaries (only clean data)
  const productTotals = {};
  const salesmanTotals = {};

  excelData.forEach((row) => {
    const product = row["Item Category"] || "Unknown";
    const salesman = row["Salesman"] || "Unknown";
    const amount = parseFloat(row["Amount"]) || 0;
    productTotals[product] = (productTotals[product] || 0) + amount;
    salesmanTotals[salesman] = (salesmanTotals[salesman] || 0) + amount;
  });

  const productChartData = {
    labels: Object.keys(productTotals),
    datasets: [
      {
        label: "Product Sales (₹)",
        data: Object.values(productTotals),
        backgroundColor: [
          "#4F46E5",
          "#10B981",
          "#F59E0B",
          "#EF4444",
          "#3B82F6",
          "#8B5CF6",
          "#22D3EE",
        ],
      },
    ],
  };

  const salesmanChartData = {
    labels: Object.keys(salesmanTotals),
    datasets: [
      {
        label: "Salesman-wise Sales (₹)",
        data: Object.values(salesmanTotals),
        backgroundColor: "#6366F1",
      },
    ],
  };

  // ✅ Table Row Limit = 20
  const limitedData = excelData.slice(0, 20);

  return (
    <div className="min-h-screen bg-[#0a1628] text-white p-6">
      <div className="max-w-6xl mx-auto bg-[#12243d] rounded-2xl p-8 shadow-xl border border-[#1e3553]">
        <h2 className="text-3xl font-bold text-[#00f5ff] mb-6 text-start">
          📊 IMPORT EXCEL REPORT DATASHEET
        </h2>

        {/* Buttons */}
        <div className="flex flex-wrap gap-3 items-center justify-start mb-6">
          <input
            type="file"
            accept=".xls,.xlsx,.csv"
            onChange={handleFileChange}
            className="text-sm text-gray-300 border border-[#00f5ff] rounded-lg bg-[#0a1628] p-2 w-full sm:w-auto"
          />
          <button
            onClick={handleUpload}
            disabled={uploading}
            className="bg-gradient-to-r from-cyan-500 to-blue-500 text-white px-5 py-2 rounded-lg font-semibold shadow-md hover:opacity-90 transition"
          >
            {uploading ? "Uploading..." : "Upload"}
          </button>
          <button
            onClick={handleExport}
            className="bg-green-600 text-white px-5 py-2 rounded-lg hover:opacity-90"
          >
            Export
          </button>
          <button
            onClick={handlePDF}
            className="bg-orange-500 text-white px-5 py-2 rounded-lg hover:opacity-90"
          >
            PDF
          </button>
          <button
            onClick={handleClear}
            className="bg-red-600 text-white px-5 py-2 rounded-lg hover:opacity-90"
          >
            Clear
          </button>
        </div>

        {message && (
          <p className="text-center mb-4 text-[#4ee1ec] font-medium">{message}</p>
        )}

        {/* Summary Charts */}
        {excelData.length > 0 ? (
          <>
            <div className="grid md:grid-cols-2 gap-6 mb-6">
              <div className="bg-[#0f1e33] p-6 rounded-xl h-[280px] overflow-hidden">
                <h3 className="text-lg font-semibold text-[#00f5ff] mb-2">
                  📦 Product-wise Summary
                </h3>
                <Pie
                  data={productChartData}
                  options={{
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                      legend: { position: "right", labels: { color: "#fff" } },
                    },
                  }}
                />
              </div>

              <div className="bg-[#0f1e33] p-6 rounded-xl h-[280px] overflow-hidden">
                <h3 className="text-lg font-semibold text-[#00f5ff] mb-2">
                  👨‍💼 Salesman-wise Summary
                </h3>
                <Bar
                  data={salesmanChartData}
                  options={{
                    responsive: true,
                    maintainAspectRatio: false,
                    scales: {
                      x: { ticks: { color: "#fff" } },
                      y: { ticks: { color: "#fff" } },
                    },
                    plugins: { legend: { labels: { color: "#fff" } } },
                  }}
                />
              </div>
            </div>

            {/* ✅ Table with 20-row limit */}
            <div className="overflow-x-auto bg-[#0f1e33] p-4 rounded-lg border border-[#1e3553]">
              <table className="min-w-full border border-[#1e3553] text-sm">
                <thead className="bg-[#132a4a] text-[#00f5ff]">
                  <tr>
                    {Object.keys(limitedData[0])
                      .filter((col) => !hiddenColumns.includes(col))
                      .map((key, i) => (
                        <th
                          key={i}
                          className="px-4 py-2 border border-[#1e3553] text-left uppercase text-xs tracking-wider"
                        >
                          {key}
                        </th>
                      ))}
                  </tr>
                </thead>
                <tbody>
                  {limitedData.map((row, i) => (
                    <tr
                      key={i}
                      className={`hover:bg-[#1b355d] ${
                        i % 2 === 0 ? "bg-[#0f1e33]" : "bg-[#132a4a]"
                      }`}
                    >
                      {Object.keys(row)
                        .filter((col) => !hiddenColumns.includes(col))
                        .map((key, j) => (
                          <td
                            key={j}
                            className="px-4 py-2 border border-[#1e3553] text-gray-200"
                          >
                            {row[key]}
                          </td>
                        ))}
                    </tr>
                  ))}
                </tbody>
              </table>

              {/* ✅ Row Count Info */}
              <p className="text-right text-xs text-gray-400 mt-2">
                Showing {limitedData.length} of {excelData.length} rows
              </p>
            </div>
          </>
        ) : (
          <p className="text-gray-400 italic text-center py-8">
            No data uploaded yet. Please upload an Excel file to view reports.
          </p>
        )}
      </div>
    </div>
  );
}
