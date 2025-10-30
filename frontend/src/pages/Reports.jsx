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
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [page, setPage] = useState(1);
  const [summary, setSummary] = useState(null);
  const rowsPerPage = 50;

  useEffect(() => {
    loadLatestData();
  }, []);

async function loadLatestData() {
  setLoading(true);
  setMessage("⏳ Tally से डेटा लोड हो रहा है...");
  
  try {
    const backend = config.BACKEND_URL || "https://replica-backend.shoabahmad68.workers.dev";
    const res = await axios.get(`${backend}/api/imports/latest`);
    const d = res.data;

    console.log("📥 Backend से डेटा आया:", d);

    // ✅ अब flat arrays expect करो
    const combined = [
      ...(d.sales || []),
      ...(d.purchase || []),
      ...(d.receipt || []),
      ...(d.payment || []),
      ...(d.journal || []),
      ...(d.debit || []),
      ...(d.credit || []),
    ];

    console.log(`✅ कुल ${combined.length} rows मिली`);

    setData(combined);
    setSummary({
      total: combined.length,
      sales: d.sales?.length || 0,
      purchase: d.purchase?.length || 0,
      receipt: d.receipt?.length || 0,
      payment: d.payment?.length || 0,
      journal: d.journal?.length || 0,
      debit: d.debit?.length || 0,
      credit: d.credit?.length || 0,
    });

    if (combined.length > 0) {
      setMessage(`✅ ${combined.length} records लोड हो गए!`);
    } else {
      setMessage("⚠️ कोई डेटा नहीं मिला। Pusher चला हुआ है क्या?");
    }
  } catch (err) {
    console.error("❌ Error:", err);
    setMessage(`❌ Error: ${err.message}`);
    setData([]);
  } finally {
    setLoading(false);
  }
}

  // सभी unique columns निकालो
  const allKeys = data.length > 0 
    ? Array.from(new Set(data.flatMap((r) => Object.keys(r))))
    : [];
  
  const totalPages = Math.ceil(data.length / rowsPerPage) || 1;
  const start = (page - 1) * rowsPerPage;
  const pageRows = data.slice(start, start + rowsPerPage);

  const handleExport = () => {
    if (!data.length) return alert("कोई डेटा नहीं है!");
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Tally Report");
    XLSX.writeFile(wb, `Tally_Export_${new Date().toISOString().split('T')[0]}.xlsx`);
    setMessage("✅ Excel export हो गया!");
  };

  const handlePDF = () => {
    if (!data.length) return alert("कोई डेटा नहीं है!");
    const doc = new jsPDF("l", "mm", "a4");
    doc.text("Tally Master Report", 14, 15);
    
    // पहले 10 columns ही लो (PDF में सब नहीं आएंगे)
    const limitedKeys = allKeys.slice(0, 10);
    
    doc.autoTable({
      head: [limitedKeys],
      body: data.map((r) => limitedKeys.map((k) => r[k] ?? "")),
      startY: 20,
      styles: { fontSize: 6 },
    });
    doc.save(`Tally_Report_${new Date().toISOString().split('T')[0]}.pdf`);
    setMessage("✅ PDF export हो गया!");
  };

  const handleClear = () => {
    setData([]);
    setSummary(null);
    setMessage("🧹 View से data clear हो गया।");
  };

  // Charts के लिए data
  const productTotals = {};
  const voucherTypeTotals = {};
  
  data.forEach((r) => {
    // Product wise
    const prod = r.StockItemName || r.Item || r.ledgerName || "Unknown";
    const amt = parseFloat(r.amount || r.itemAmount || r.ledgerAmount || 0);
    productTotals[prod] = (productTotals[prod] || 0) + Math.abs(amt);
    
    // Voucher type wise
    const vType = r.voucherType || "Unknown";
    voucherTypeTotals[vType] = (voucherTypeTotals[vType] || 0) + Math.abs(amt);
  });

  const productChartData = {
    labels: Object.keys(productTotals).slice(0, 10),
    datasets: [{
      label: "Amount (₹)",
      data: Object.values(productTotals).slice(0, 10),
      backgroundColor: [
        '#FF6384', '#36A2EB', '#FFCE56', '#4BC0C0', '#9966FF',
        '#FF9F40', '#FF6384', '#C9CBCF', '#4BC0C0', '#FF6384'
      ]
    }],
  };

  const voucherChartData = {
    labels: Object.keys(voucherTypeTotals),
    datasets: [{
      label: "Voucher Amount (₹)",
      data: Object.values(voucherTypeTotals),
      backgroundColor: ['#36A2EB', '#FF6384', '#FFCE56', '#4BC0C0', '#9966FF', '#FF9F40', '#C9CBCF']
    }],
  };

  return (
    <div className="min-h-screen bg-[#0a1628] text-white p-6">
      <div className="max-w-7xl mx-auto bg-[#12243d] rounded-2xl p-8 shadow-lg border border-[#1e3553]">
        <h2 className="text-3xl font-bold text-[#00f5ff] mb-6">📊 TALLY MASTER REPORT</h2>

        {/* Summary Cards */}
        {summary && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <div className="bg-[#0f1e33] p-4 rounded-lg border border-[#1e3553]">
              <p className="text-gray-400 text-sm">Total Records</p>
              <p className="text-2xl font-bold text-[#00f5ff]">{summary.total}</p>
            </div>
            <div className="bg-[#0f1e33] p-4 rounded-lg border border-[#1e3553]">
              <p className="text-gray-400 text-sm">Sales</p>
              <p className="text-2xl font-bold text-green-400">{summary.sales}</p>
            </div>
            <div className="bg-[#0f1e33] p-4 rounded-lg border border-[#1e3553]">
              <p className="text-gray-400 text-sm">Purchase</p>
              <p className="text-2xl font-bold text-orange-400">{summary.purchase}</p>
            </div>
            <div className="bg-[#0f1e33] p-4 rounded-lg border border-[#1e3553]">
              <p className="text-gray-400 text-sm">Receipts</p>
              <p className="text-2xl font-bold text-blue-400">{summary.receipt}</p>
            </div>
          </div>
        )}

        {/* Buttons */}
        <div className="flex flex-wrap gap-3 mb-4">
          <button 
            onClick={loadLatestData} 
            disabled={loading}
            className="bg-[#00f5ff] px-6 py-2 rounded-lg text-black font-semibold hover:bg-[#00d4e6] disabled:opacity-50"
          >
            {loading ? "⏳ Loading..." : "🔄 Reload Tally Data"}
          </button>
          <button 
            onClick={handleExport} 
            className="bg-green-600 px-6 py-2 rounded-lg font-semibold hover:bg-green-700"
          >
            📊 Export Excel
          </button>
          <button 
            onClick={handlePDF} 
            className="bg-orange-500 px-6 py-2 rounded-lg font-semibold hover:bg-orange-600"
          >
            📄 Export PDF
          </button>
          <button 
            onClick={handleClear} 
            className="bg-red-600 px-6 py-2 rounded-lg font-semibold hover:bg-red-700"
          >
            🧹 Clear View
          </button>
        </div>

        {message && (
          <div className="text-center py-3 px-4 mb-4 bg-[#0f1e33] rounded-lg border border-[#1e3553]">
            <p className="text-[#4ee1ec]">{message}</p>
          </div>
        )}

        {data.length > 0 ? (
          <>
            {/* Charts */}
            <div className="grid md:grid-cols-2 gap-6 mb-6">
              <div className="bg-[#0f1e33] p-6 rounded-xl border border-[#1e3553] h-[300px]">
                <h3 className="text-lg font-semibold text-[#00f5ff] mb-3">📦 Top Items/Ledgers</h3>
                <Pie data={productChartData} options={{ maintainAspectRatio: false }} />
              </div>
              <div className="bg-[#0f1e33] p-6 rounded-xl border border-[#1e3553] h-[300px]">
                <h3 className="text-lg font-semibold text-[#00f5ff] mb-3">📝 Voucher Types</h3>
                <Bar data={voucherChartData} options={{ maintainAspectRatio: false }} />
              </div>
            </div>

            {/* Excel-style Table */}
            <div className="overflow-x-auto bg-[#0f1e33] p-4 rounded-lg border border-[#1e3553]">
              <p className="text-sm text-gray-400 mb-3">
                Showing {start + 1} to {Math.min(start + rowsPerPage, data.length)} of {data.length} records
              </p>
              
              <table className="min-w-full border-collapse text-sm">
                <thead className="bg-[#132a4a] text-[#00f5ff] sticky top-0">
                  <tr>
                    <th className="px-3 py-2 border border-[#1e3553] text-left font-semibold">#</th>
                    {allKeys.map((k) => (
                      <th key={k} className="px-3 py-2 border border-[#1e3553] text-left font-semibold whitespace-nowrap">
                        {k}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {pageRows.map((r, i) => (
                    <tr 
                      key={i} 
                      className={`${i % 2 ? "bg-[#132a4a]" : "bg-[#0f1e33]"} hover:bg-[#1a3a5a] transition-colors`}
                    >
                      <td className="px-3 py-2 border border-[#1e3553] text-gray-400">
                        {start + i + 1}
                      </td>
                      {allKeys.map((k) => (
                        <td key={k} className="px-3 py-2 border border-[#1e3553] whitespace-nowrap">
                          {r[k] !== undefined && r[k] !== null && r[k] !== "" 
                            ? String(r[k]) 
                            : "—"}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>

              {/* Pagination */}
              <div className="flex justify-between items-center mt-4 text-sm text-gray-300">
                <button
                  onClick={() => setPage((p) => Math.max(p - 1, 1))}
                  disabled={page === 1}
                  className={`px-5 py-2 rounded-lg font-semibold ${
                    page === 1 
                      ? "bg-gray-700 text-gray-500 cursor-not-allowed" 
                      : "bg-[#00f5ff] text-black hover:bg-[#00d4e6]"
                  }`}
                >
                  ⬅ Previous
                </button>
                <span className="font-semibold">
                  Page {page} of {totalPages}
                </span>
                <button
                  onClick={() => setPage((p) => Math.min(p + 1, totalPages))}
                  disabled={page === totalPages}
                  className={`px-5 py-2 rounded-lg font-semibold ${
                    page === totalPages 
                      ? "bg-gray-700 text-gray-500 cursor-not-allowed" 
                      : "bg-[#00f5ff] text-black hover:bg-[#00d4e6]"
                  }`}
                >
                  Next ➡
                </button>
              </div>
            </div>
          </>
        ) : (
          <div className="text-center py-12 bg-[#0f1e33] rounded-lg border border-[#1e3553]">
            <p className="text-gray-400 text-lg mb-2">
              📭 अभी कोई डेटा उपलब्ध नहीं है
            </p>
            <p className="text-gray-500 text-sm">
              कृपया सुनिश्चित करें कि Tally Pusher चल रहा है और डेटा भेज रहा है
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
