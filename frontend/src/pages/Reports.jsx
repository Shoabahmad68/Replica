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
  const [hiddenColumns, setHiddenColumns] = useState([]); // future use (optional hide/show)
  const [currentPage, setCurrentPage] = useState(1);
  const rowsPerPage = 20;
  const [selectedType, setSelectedType] = useState("All");

  useEffect(() => {
    loadLatestData();
  }, []);

  // ✅ Backend से full structured data load करना (FINAL WORKING FIX)
const loadLatestData = async () => {
  try {
    const res = await axios.get(`${config.BACKEND_URL}/api/imports/latest`, {
      headers: { "Content-Type": "application/json" },
    });

    console.log("Backend response:", res.data);

    // If backend sends structured rows
    if (res.data?.rows?.length) {
      setExcelData(res.data.rows);
      setMessage(`✅ Loaded ${res.data.rows.length} rows successfully.`);
      return;
    }

    // If backend sends compressed RAW_DATA JSON
    const raw = res.data?.RAW_DATA || res.data || {};
    let parsed = typeof raw === "string" ? JSON.parse(raw) : raw;

    async function decompressBase64(b64) {
      const binary = Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
      const ds = new DecompressionStream("gzip");
      const ab = await new Response(new Blob([binary]).stream().pipeThrough(ds)).arrayBuffer();
      return new TextDecoder().decode(ab);
    }

    const salesXml = parsed.salesXml ? await decompressBase64(parsed.salesXml) : "";
    const purchaseXml = parsed.purchaseXml ? await decompressBase64(parsed.purchaseXml) : "";
    const mastersXml = parsed.mastersXml ? await decompressBase64(parsed.mastersXml) : "";

    function parseXML(xml) {
      if (!xml || !xml.includes("<VOUCHER")) return [];
      const vouchers = xml.match(/<VOUCHER[\s\S]*?<\/VOUCHER>/gi) || [];
      const rows = [];
      for (const v of vouchers) {
        const getTag = (t) => {
          const m = v.match(new RegExp(`<${t}[^>]*>([\\s\\S]*?)<\\/${t}>`, "i"));
          return m ? m[1].trim() : "";
        };
        rows.push({
          VoucherType: getTag("VOUCHERTYPENAME"),
          Date: getTag("DATE"),
          Party: getTag("PARTYNAME"),
          Item: getTag("STOCKITEMNAME"),
          Amount: getTag("AMOUNT"),
        });
      }
      return rows;
    }

    const rows = [
      ...parseXML(salesXml),
      ...parseXML(purchaseXml),
      ...parseXML(mastersXml),
    ];

    if (rows.length) {
      setExcelData(rows);
      setMessage(`✅ Loaded ${rows.length} vouchers from backend.`);
    } else {
      setMessage("⚠️ No vouchers found after parsing backend data.");
    }
  } catch (err) {
    console.error("❌ Load error:", err.message);
    setMessage("❌ Failed to load data from backend.");
  }
};

  // ✅ Upload file manually
  const handleFileChange = (e) => setFile(e.target.files[0]);
  const handleUpload = async () => {
    if (!file) return setMessage("⚠️ पहले एक file select करें!");
    const formData = new FormData();
    formData.append("file", file);
    try {
      setUploading(true);
      const res = await axios.post(`${config.BACKEND_URL}/api/imports/upload`, formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      if (res.data && res.data.count) {
        setMessage(`✅ Upload सफल रहा। Parsed ${res.data.count} rows.`);
        setTimeout(() => loadLatestData(), 1000);
      } else setMessage("⚠️ Upload हो गया लेकिन rows नहीं मिली।");
    } catch {
      setMessage("❌ Upload विफल। Backend logs चेक करें।");
    } finally {
      setUploading(false);
    }
  };

  // ✅ Apply filter and pagination
  const filtered =
    selectedType === "All" ? excelData : excelData.filter((r) => r.__type === selectedType);

  const totalPages = Math.ceil(filtered.length / rowsPerPage) || 1;
  const start = (currentPage - 1) * rowsPerPage;
  const end = start + rowsPerPage;
  const currentRows = filtered.slice(start, end);

  // ✅ Column keys: सभी rows से unique keys निकालना (मुख्य FIX)
  const allKeys = Array.from(new Set(filtered.flatMap((row) => Object.keys(row)))).filter(
    (k) => !hiddenColumns.includes(k)
  );

  // ✅ Exporters
  const handleExport = () => {
    if (!excelData.length) return alert("Export करने के लिए data उपलब्ध नहीं!");
    const ws = XLSX.utils.json_to_sheet(excelData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Report");
    XLSX.writeFile(wb, "Exported_Report.xlsx");
  };
  const handlePDF = () => {
    if (!excelData.length) return alert("PDF के लिए data उपलब्ध नहीं!");
    const doc = new jsPDF();
    doc.text("Master Analysis Report", 14, 15);
    doc.autoTable({
      head: [allKeys],
      body: excelData.map((r) => allKeys.map((k) => (r[k] !== undefined ? String(r[k]) : ""))),
      startY: 20,
      styles: { fontSize: 8 },
    });
    doc.save("Report.pdf");
  };
  const handleClear = () => {
    setExcelData([]);
    setMessage("🧹 View clear कर दिया गया (backend data जस का तस है)।");
    setCurrentPage(1);
  };

  // ✅ Chart summaries (structured data होने पर काम करेगा)
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
        <h2 className="text-3xl font-bold text-[#00f5ff] mb-6 text-start">📊 IMPORT EXCEL REPORT DATASHEET</h2>

        {/* Buttons */}
        <div className="flex flex-wrap gap-3 mb-6">
          <input
            type="file"
            accept=".xls,.xlsx,.csv"
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
          <button onClick={loadLatestData} className="bg-blue-600 px-5 py-2 rounded-lg hover:opacity-90">
            Reload
          </button>
          <button onClick={handleExport} className="bg-green-600 px-5 py-2 rounded-lg hover:opacity-90">
            Export
          </button>
          <button onClick={handlePDF} className="bg-orange-500 px-5 py-2 rounded-lg hover:opacity-90">
            PDF
          </button>
          <button onClick={handleClear} className="bg-red-600 px-5 py-2 rounded-lg hover:opacity-90">
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
                  onClick={() => {
                    setSelectedType(t);
                    setCurrentPage(1);
                  }}
                  className={`px-4 py-1 rounded-lg border ${
                    selectedType === t ? "bg-[#00f5ff] text-black" : "bg-[#0f1e33] text-gray-200"
                  }`}
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
                    {allKeys.length > 0 ? (
                      allKeys.map((k, i) => (
                        <th
                          key={i}
                          className="px-4 py-2 border border-[#1e3553] text-left uppercase text-xs tracking-wider"
                        >
                          {k}
                        </th>
                      ))
                    ) : (
                      <th className="px-4 py-2 border border-[#1e3553] text-left uppercase text-xs tracking-wider">
                        No columns
                      </th>
                    )}
                  </tr>
                </thead>
                <tbody>
                  {currentRows.length > 0 ? (
                    currentRows.map((r, i) => (
                      <tr
                        key={i}
                        className={`hover:bg-[#1b355d] ${i % 2 ? "bg-[#132a4a]" : "bg-[#0f1e33]"}`}
                      >
                        {allKeys.map((k, j) => {
                          const val = r[k];
                          const shown =
                            val === null || val === undefined
                              ? ""
                              : typeof val === "object"
                              ? JSON.stringify(val)
                              : String(val);
                          return (
                            <td key={j} className="px-4 py-2 border border-[#1e3553] text-gray-200">
                              {shown}
                            </td>
                          );
                        })}
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td className="px-4 py-2 border border-[#1e3553] text-gray-200" colSpan={allKeys.length || 1}>
                        No data available
                      </td>
                    </tr>
                  )}
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
              <p className="text-right text-xs text-gray-400 mt-2">
                Showing {currentRows.length} of {filtered.length} rows
              </p>
            </div>
          </>
        ) : (
          <p className="text-gray-400 italic text-center py-8">
            Data अभी उपलब्ध नहीं है। कृपया upload करें या reload करें।
          </p>
        )}
      </div>
    </div>
  );
}
