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
  const [page, setPage] = useState(1);
  const rowsPerPage = 20;

  useEffect(() => {
    loadLatestData();
  }, []);

  async function loadLatestData() {
    setMessage("⏳ Loading data...");
    try {
      const backend = config.BACKEND_URL || "https://replica-backend.shoabahmad68.workers.dev";
      const res = await axios.get(`${backend}/api/imports/latest`);
      const d = res.data;

      if (d?.rows) {
        const combined = [
          ...(d.rows.sales || []),
          ...(d.rows.purchase || []),
          ...(d.rows.receipt || []),
          ...(d.rows.payment || []),
          ...(d.rows.journal || []),
          ...(d.rows.debit || []),
          ...(d.rows.credit || []),
        ].filter((r) => r.type === "item_row" || Object.keys(r).length > 3);
        setData(combined);
        setMessage(`✅ Loaded ${combined.length} records.`);
      } else {
        setMessage("⚠️ No valid rows found in backend data.");
      }
    } catch (err) {
      console.error(err);
      setMessage("❌ Backend fetch failed.");
    }
  }

  const handleFileChange = (e) => setFile(e.target.files[0]);
  const handleUpload = async () => {
    if (!file) return alert("⚠️ पहले एक Excel file चुनें!");
    const formData = new FormData();
    formData.append("file", file);
    try {
      setUploading(true);
      const backend = config.BACKEND_URL || "https://replica-backend.shoabahmad68.workers.dev";
      const res = await axios.post(`${backend}/api/imports/upload`, formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      if (res.data?.count) {
        setMessage(`✅ Upload successful. ${res.data.count} rows parsed.`);
        loadLatestData();
      }
    } catch {
      setMessage("❌ Upload failed.");
    } finally {
      setUploading(false);
    }
  };

  const allKeys = Array.from(new Set(data.flatMap((r) => Object.keys(r))));
  const totalPages = Math.ceil(data.length / rowsPerPage) || 1;
  const start = (page - 1) * rowsPerPage;
  const pageRows = data.slice(start, start + rowsPerPage);

  const handleExport = () => {
    if (!data.length) return alert("No data!");
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Report");
    XLSX.writeFile(wb, "Exported_Report.xlsx");
  };

  const handlePDF = () => {
    if (!data.length) return alert("No data!");
    const doc = new jsPDF("l", "mm", "a4");
    doc.text("Master Analysis Report", 14, 15);
    doc.autoTable({
      head: [allKeys],
      body: data.map((r) => allKeys.map((k) => r[k] ?? "")),
      startY: 20,
      styles: { fontSize: 7 },
    });
    doc.save("MasterReport.pdf");
  };

  const handleClear = () => {
    setData([]);
    setMessage("🧹 Data cleared from view.");
  };

  // Chart summaries
  const productTotals = {};
  const salesmanTotals = {};
  data.forEach((r) => {
    const prod = r.StockItemName || r.Item || "Unknown";
    const sales = r.Salesman || "Unknown";
    const amt = parseFloat(r.Amount || 0);
    productTotals[prod] = (productTotals[prod] || 0) + amt;
    salesmanTotals[sales] = (salesmanTotals[sales] || 0) + amt;
  });

  const productChartData = {
    labels: Object.keys(productTotals).slice(0, 12),
    datasets: [{ label: "Product Sales (₹)", data: Object.values(productTotals).slice(0, 12) }],
  };
  const salesmanChartData = {
    labels: Object.keys(salesmanTotals).slice(0, 12),
    datasets: [{ label: "Salesman Sales (₹)", data: Object.values(salesmanTotals).slice(0, 12) }],
  };

  return (
    <div className="min-h-screen bg-[#0a1628] text-white p-6">
      <div className="max-w-6xl mx-auto bg-[#12243d] rounded-2xl p-8 shadow-lg border border-[#1e3553]">
        <h2 className="text-2xl font-bold text-[#00f5ff] mb-4">📊 MASTER REPORT</h2>

        {/* Buttons */}
        <div className="flex flex-wrap gap-3 mb-4">
          <input
            type="file"
            accept=".xls,.xlsx,.csv"
            onChange={handleFileChange}
            className="text-sm border border-[#00f5ff] rounded-lg bg-[#0a1628] p-2"
          />
          <button onClick={handleUpload} disabled={uploading} className="bg-blue-600 px-5 py-2 rounded-lg">
            {uploading ? "Uploading..." : "Upload"}
          </button>
          <button onClick={loadLatestData} className="bg-[#00f5ff] px-5 py-2 rounded-lg text-black">
            Reload
          </button>
          <button onClick={handleExport} className="bg-green-600 px-5 py-2 rounded-lg">
            Export
          </button>
          <button onClick={handlePDF} className="bg-orange-500 px-5 py-2 rounded-lg">
            PDF
          </button>
          <button onClick={handleClear} className="bg-red-600 px-5 py-2 rounded-lg">
            Clear
          </button>
        </div>

        {message && <p className="text-center text-[#4ee1ec] mb-4">{message}</p>}

        {data.length > 0 ? (
          <>
            <div className="grid md:grid-cols-2 gap-6 mb-6">
              <div className="bg-[#0f1e33] p-6 rounded-xl h-[260px]">
                <h3 className="text-lg font-semibold text-[#00f5ff] mb-2">📦 Product Summary</h3>
                <Pie data={productChartData} options={{ maintainAspectRatio: false }} />
              </div>
              <div className="bg-[#0f1e33] p-6 rounded-xl h-[260px]">
                <h3 className="text-lg font-semibold text-[#00f5ff] mb-2">👨‍💼 Salesman Summary</h3>
                <Bar data={salesmanChartData} options={{ maintainAspectRatio: false }} />
              </div>
            </div>

            {/* Table */}
            <div className="overflow-x-auto bg-[#0f1e33] p-4 rounded-lg border border-[#1e3553]">
              <table className="min-w-full border border-[#1e3553] text-sm">
                <thead className="bg-[#132a4a] text-[#00f5ff]">
                  <tr>
                    {allKeys.map((k) => (
                      <th key={k} className="px-4 py-2 border border-[#1e3553] text-left">
                        {k}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {pageRows.map((r, i) => (
                    <tr key={i} className={i % 2 ? "bg-[#132a4a]" : "bg-[#0f1e33]"}>
                      {allKeys.map((k) => (
                        <td key={k} className="px-4 py-2 border border-[#1e3553]">
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
                  onClick={() => setPage((p) => Math.max(p - 1, 1))}
                  disabled={page === 1}
                  className={`px-4 py-1 rounded-lg ${
                    page === 1 ? "bg-gray-600" : "bg-[#00f5ff] text-black"
                  }`}
                >
                  ⬅ Prev
                </button>
                <span>
                  Page {page} of {totalPages}
                </span>
                <button
                  onClick={() => setPage((p) => Math.min(p + 1, totalPages))}
                  disabled={page === totalPages}
                  className={`px-4 py-1 rounded-lg ${
                    page === totalPages ? "bg-gray-600" : "bg-[#00f5ff] text-black"
                  }`}
                >
                  Next ➡
                </button>
              </div>
            </div>
          </>
        ) : (
          <p className="text-gray-400 italic text-center py-8">
            Data अभी उपलब्ध नहीं है। कृपया Upload करें या Reload करें।
          </p>
        )}
      </div>
    </div>
  );
}
