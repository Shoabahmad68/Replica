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
  const [data, setData] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const rowsPerPage = 20;

  useEffect(() => {
    loadLatestData();
  }, []);

  // ✅ Load latest data from backend
  const loadLatestData = async () => {
    try {
      const res = await axios.get(`${config.BACKEND_URL}/api/imports/latest`, {
        headers: { "Content-Type": "application/json" },
      });

      let parsed;
      if (typeof res.data === "string") parsed = JSON.parse(res.data);
      else parsed = res.data;

      // If rows exist directly
      if (parsed?.rows?.length) {
        setData(parsed.rows);
        setMessage(`✅ Loaded ${parsed.rows.length} rows from backend.`);
        return;
      }

      // Otherwise assume it is compressed base64 JSON
      if (parsed?.compressed && parsed?.salesXml) {
        const binary = Uint8Array.from(atob(parsed.salesXml), (c) => c.charCodeAt(0));
        const ds = new DecompressionStream("gzip");
        const ab = await new Response(new Blob([binary]).stream().pipeThrough(ds)).arrayBuffer();
        const text = new TextDecoder().decode(ab);
        const json = JSON.parse(text);
        setData(json);
        setMessage(`✅ Loaded ${json.length} records from compressed backend.`);
      } else {
        setMessage("⚠️ No recognizable data structure found.");
      }
    } catch (err) {
      console.error(err);
      setMessage("❌ Failed to load data.");
    }
  };

  // ✅ Upload Excel / CSV / JSON file
  const handleFileChange = (e) => setFile(e.target.files[0]);
  const handleUpload = async () => {
    if (!file) return setMessage("⚠️ Please select a file first.");

    const formData = new FormData();
    formData.append("file", file);

    try {
      setUploading(true);
      const res = await axios.post(`${config.BACKEND_URL}/api/imports/upload`, formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      if (res.data?.rows?.length) {
        setData(res.data.rows);
        setMessage(`✅ Upload successful. Parsed ${res.data.rows.length} rows.`);
      } else setMessage("⚠️ Upload done but rows not found.");
    } catch (err) {
      console.error(err);
      setMessage("❌ Upload failed. Check backend logs.");
    } finally {
      setUploading(false);
    }
  };

  // ✅ Auto column detection
  const allKeys = Array.from(new Set(data.flatMap((row) => Object.keys(row))));

  // ✅ Pagination
  const totalPages = Math.ceil(data.length / rowsPerPage);
  const start = (currentPage - 1) * rowsPerPage;
  const currentRows = data.slice(start, start + rowsPerPage);

  // ✅ Export to Excel
  const handleExport = () => {
    if (!data.length) return alert("No data to export!");
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Report");
    XLSX.writeFile(wb, "Exported_Report.xlsx");
  };

  // ✅ Export to PDF
  const handlePDF = () => {
    if (!data.length) return alert("No data for PDF!");
    const doc = new jsPDF();
    doc.text("Master Analysis Report", 14, 15);
    doc.autoTable({
      head: [allKeys],
      body: data.map((r) => allKeys.map((k) => r[k] ?? "")),
      startY: 20,
      styles: { fontSize: 8 },
    });
    doc.save("Report.pdf");
  };

  // ✅ Simple chart summary
  const productTotals = {};
  data.forEach((r) => {
    const prod = r["Item"] || r["Product"] || "Unknown";
    const amt = parseFloat(r["Amount"] || r["Value"] || 0);
    productTotals[prod] = (productTotals[prod] || 0) + amt;
  });

  const productChartData = {
    labels: Object.keys(productTotals),
    datasets: [{ label: "Product Sales (₹)", data: Object.values(productTotals) }],
  };

  return (
    <div className="min-h-screen bg-[#0a1628] text-white p-6">
      <div className="max-w-6xl mx-auto bg-[#12243d] rounded-2xl p-8 shadow-xl border border-[#1e3553]">
        <h2 className="text-3xl font-bold text-[#00f5ff] mb-6 text-start">
          📊 MASTER REPORT DATASHEET
        </h2>

        {/* Buttons */}
        <div className="flex flex-wrap gap-3 mb-6">
          <input
            type="file"
            accept=".xls,.xlsx,.csv,.json"
            onChange={handleFileChange}
            className="text-sm text-gray-300 border border-[#00f5ff] rounded-lg bg-[#0a1628] p-2"
          />
          <button
            onClick={handleUpload}
            disabled={uploading}
            className="bg-gradient-to-r from-cyan-500 to-blue-500 px-5 py-2 rounded-lg font-semibold hover:opacity-90"
          >
            {uploading ? "Uploading..." : "Upload"}
          </button>
          <button
            onClick={loadLatestData}
            className="bg-blue-600 px-5 py-2 rounded-lg hover:opacity-90"
          >
            Reload
          </button>
          <button
            onClick={handleExport}
            className="bg-green-600 px-5 py-2 rounded-lg hover:opacity-90"
          >
            Export
          </button>
          <button
            onClick={handlePDF}
            className="bg-orange-500 px-5 py-2 rounded-lg hover:opacity-90"
          >
            PDF
          </button>
        </div>

        {message && <p className="text-center mb-4 text-[#4ee1ec] font-medium">{message}</p>}

        {data.length > 0 ? (
          <>
            <div className="bg-[#0f1e33] p-6 rounded-xl h-[280px] overflow-hidden mb-6">
              <h3 className="text-lg font-semibold text-[#00f5ff] mb-2">📦 Product Summary</h3>
              <Pie data={productChartData} options={{ maintainAspectRatio: false }} />
            </div>

            <div className="overflow-x-auto bg-[#0f1e33] p-4 rounded-lg border border-[#1e3553]">
              <table className="min-w-full border border-[#1e3553] text-sm">
                <thead className="bg-[#132a4a] text-[#00f5ff]" style={{ position: "sticky", top: 0 }}>
                  <tr>
                    {allKeys.map((k, i) => (
                      <th key={i} className="px-4 py-2 border border-[#1e3553] text-left uppercase text-xs tracking-wider">
                        {k}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {currentRows.map((r, i) => (
                    <tr key={i} className={`hover:bg-[#1b355d] ${i % 2 ? "bg-[#132a4a]" : "bg-[#0f1e33]"}`}>
                      {allKeys.map((k, j) => (
                        <td key={j} className="px-4 py-2 border border-[#1e3553] text-gray-200">
                          {r[k] ?? ""}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>

              {/* Pagination */}
              <div className="flex justify-between items-center mt-3 text-sm text-gray-300">
                <button
                  onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))}
                  disabled={currentPage === 1}
                  className={`px-4 py-1 rounded-lg ${
                    currentPage === 1 ? "bg-gray-600 cursor-not-allowed" : "bg-[#00f5ff] text-black"
                  }`}
                >
                  ⬅ Prev
                </button>
                <span>
                  Page {currentPage} of {totalPages}
                </span>
                <button
                  onClick={() => setCurrentPage((p) => Math.min(p + 1, totalPages))}
                  disabled={currentPage === totalPages}
                  className={`px-4 py-1 rounded-lg ${
                    currentPage === totalPages ? "bg-gray-600 cursor-not-allowed" : "bg-[#00f5ff] text-black"
                  }`}
                >
                  Next ➡
                </button>
              </div>
            </div>
          </>
        ) : (
          <p className="text-gray-400 italic text-center py-8">No data available. Please upload or reload.</p>
        )}
      </div>
    </div>
  );
}
