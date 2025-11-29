// src/pages/Dashboard.jsx
import React, { useEffect, useState, useMemo, useRef } from "react";
import { Line, Bar, Pie, Doughnut } from "react-chartjs-2";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
} from "chart.js";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";
import * as XLSX from "xlsx";

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend
);

import { useAuth } from "../context/AuthContext";

export default function Dashboard() {
  const [excelData, setExcelData] = useState([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [selectedRowDetail, setSelectedRowDetail] = useState(null);
  const [modalContent, setModalContent] = useState({ title: "", columns: [], data: [] });
  const [filterCategory, setFilterCategory] = useState("");
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    total_vouchers: 0,
    total_amount: 0,
    total_parties: 0,
    total_types: 0
  });

  const { user } = useAuth();
  const isLoggedIn = !!user;

  const modalRef = useRef();

  // ============================================
  // FETCH DATA FROM CLOUDFLARE D1 BACKEND
  // ============================================
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        
        const backendURL = window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1"
          ? "http://127.0.0.1:8787"
          : "https://selt-t-backend.selt-3232.workers.dev";

        console.log("📡 Fetching from:", `${backendURL}/api/vouchers`);

        // Fetch vouchers
        const vouchersRes = await fetch(`${backendURL}/api/vouchers?limit=5000`);
        const vouchersJson = await vouchersRes.json();

        if (vouchersJson.success && vouchersJson.data) {
          console.log(`✅ Fetched ${vouchersJson.data.length} vouchers`);
          
          // Transform D1 data to match existing format
          const normalized = vouchersJson.data.map(v => ({
            "Date": v.date,
            "Voucher Number": v.voucher_number,
            "Voucher Type": v.voucher_type,
            "Party Name": v.party_name,
            "Amount": parseFloat(v.amount) || 0,
            "Narration": v.narration,
            // Additional mappings for compatibility
            "ItemName": v.party_name, // Fallback
            "Item Category": v.voucher_type,
            "Salesman": "N/A", // Add if available in your data
            "City/Area": "N/A", // Add if available
            "Qty": 0 // Add if available
          }));

          setExcelData(normalized);
        }

        // Fetch dashboard stats
        const statsRes = await fetch(`${backendURL}/api/dashboard/stats`);
        const statsJson = await statsRes.json();

        if (statsJson.success && statsJson.data) {
          setStats(statsJson.data);
          console.log("✅ Stats loaded:", statsJson.data);
        }

        setLoading(false);
      } catch (err) {
        console.error("❌ Error loading dashboard data:", err);
        setExcelData([]);
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  // ============================================
  // HELPER FUNCTIONS
  // ============================================
  const toNumber = (v) => parseFloat(String(v || "").replace(/[^0-9.-]/g, "")) || 0;
  const fmt = (v) => `₹${Number(v || 0).toLocaleString("en-IN", { maximumFractionDigits: 0 })}`;

  const isTotalRow = (r) => {
    try {
      const checkValues = Object.values(r || {}).map((v) =>
        String(v || "").toLowerCase().trim()
      );
      if (
        checkValues.some((v) =>
          ["total", "grand total", "sub total", "overall total"].some((w) =>
            v.includes(w)
          )
        )
      ) {
        return true;
      }
      if (checkValues.every((v) => v === "")) return true;
      return false;
    } catch {
      return false;
    }
  };

  const cleanData = useMemo(() => excelData.filter((r) => !isTotalRow(r)), [excelData]);

  const colValue = (r, col) => {
    if (!r) return "";
    const mapNames = {
      "ItemName": ["Item Name", "ItemName", "Item", "Product Name", "Party Name"],
      "Item Group": ["Item Group", "ItemGroup", "Item Category Group", "Item Group Name"],
      "Item Category": ["Item Category", "Product Name", "Item Category ", "Voucher Type"],
      "Party Name": ["Party Name", "Party", "Dealer"],
      "Salesman": ["Salesman", "ASM"],
      "City/Area": ["City/Area", "City", "Area"],
    };
    if (mapNames[col]) {
      for (const k of mapNames[col]) {
        if (r[k] !== undefined && r[k] !== null && String(r[k]).toString().trim() !== "")
          return String(r[k]).toString().trim();
      }
    }
    return (r[col] !== undefined && r[col] !== null) ? String(r[col]).toString().trim() : "";
  };

  const aggregateData = (col1, col2) => {
    const rows = cleanData.filter((r) =>
      filterCategory
        ? (colValue(r, "Item Category") || "").trim() === filterCategory
        : true
    );
    
    const combined = {};
    rows.forEach((r) => {
      const c1 = colValue(r, col1) || "-";
      const c2 = colValue(r, col2) || "-";
      const amt = toNumber(r["Amount"] || r["Amt"] || 0);
      const key = `${c1}||${c2}`;
      if (!combined[key]) {
        combined[key] = { [col1]: c1, [col2]: c2, Amount: 0, Count: 0 };
      }
      combined[key].Amount += amt;
      combined[key].Count += 1;
    });

    const merged = {};
    Object.values(combined).forEach((row) => {
      const party = row[col1];
      const cat = row[col2];
      const amt = row.Amount;
      const count = row.Count;
      if (!merged[party]) merged[party] = {};
      if (!merged[party][cat]) merged[party][cat] = { amount: 0, count: 0 };
      merged[party][cat].amount += amt;
      merged[party][cat].count += count;
    });

    const finalData = [];
    for (const [party, cats] of Object.entries(merged)) {
      for (const [cat, data] of Object.entries(cats)) {
        finalData.push({
          [col1]: party,
          [col2]: cat,
          Amount: data.amount,
          Count: data.count
        });
      }
    }

    return finalData.sort((a, b) => b.Amount - a.Amount);
  };

  const totalSales = useMemo(
    () => stats.total_amount || cleanData.reduce((s, r) => s + toNumber(r["Amount"] || 0), 0),
    [cleanData, stats]
  );

  const uniqueProducts = useMemo(
    () =>
      Array.from(
        new Set(
          cleanData
            .map((r) => (colValue(r, "Item Category") || "").toString().trim())
            .filter(Boolean)
        )
      ),
    [cleanData]
  );

  // ============================================
  // EXPORT FUNCTIONS
  // ============================================
  const exportCSV = (title, columns, data) => {
    const csv = [
      columns.join(","),
      ...data.map((r) => columns.map((c) => (r[c] || "").toString().replace(/,/g, " ")).join(",")),
    ].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${title}.csv`;
    a.click();
  };

  const exportExcel = (title, columns, data) => {
    const ws = XLSX.utils.json_to_sheet(
      data.map((row) => {
        const out = {};
        columns.forEach((c) => (out[c] = row[c] || ""));
        return out;
      })
    );
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Report");
    XLSX.writeFile(wb, `${title}.xlsx`);
  };

  const exportPDF = async (title) => {
    if (!modalRef.current) return;
    const el = modalRef.current;
    const canvas = await html2canvas(el, { scale: 2 });
    const img = canvas.toDataURL("image/png");
    const pdf = new jsPDF("l", "mm", "a4");
    const width = pdf.internal.pageSize.getWidth();
    const height = (canvas.height * width) / canvas.width;
    pdf.addImage(img, "PNG", 0, 8, width, height);
    pdf.save(`${title}.pdf`);
  };

  const openViewModal = (title, columns, data) => {
    setModalContent({ title, columns, data });
    setModalOpen(true);
    setTimeout(() => {
      const el = document.getElementById("modal-scroll");
      if (el) el.scrollTop = 0;
    }, 40);
  };

  const openDetailModal = (row, columns) => {
    setSelectedRowDetail({ row, columns });
    setDetailModalOpen(true);
  };

  // ============================================
  // LOGIN GATE
  // ============================================
  if (!isLoggedIn) {
    return (
      <div className="relative flex items-center justify-center min-h-screen overflow-hidden bg-gradient-to-br from-[#0A192F] via-[#112240] to-[#0A192F] px-4">
        
        {/* Animated Particles */}
        <div className="absolute inset-0">
          {[...Array(15)].map((_, i) => (
            <div
              key={i}
              className="absolute w-1 h-1 md:w-2 md:h-2 bg-[#64FFDA]/30 rounded-full animate-float"
              style={{
                left: `${Math.random() * 100}%`,
                top: `${Math.random() * 100}%`,
                animationDelay: `${Math.random() * 5}s`,
                animationDuration: `${5 + Math.random() * 10}s`
              }}
            />
          ))}
        </div>

        {/* Main Content */}
        <div className="relative z-10 text-center w-full max-w-md animate-fadeInScale">
          
          {/* Logo with Shockwave */}
          <div className="relative inline-block mb-6 md:mb-8">
            <div className="absolute inset-0 -inset-10 md:-inset-20">
              <div className="absolute inset-0 border-2 md:border-4 border-[#64FFDA]/40 rounded-full animate-shockwave"></div>
              <div className="absolute inset-0 border-2 md:border-4 border-[#64FFDA]/30 rounded-full animate-shockwave animation-delay-300"></div>
            </div>
            
            <img 
              src="/logo.png" 
              alt="Sel-T Logo" 
              className="w-48 md:w-80 relative z-10 drop-shadow-[0_0_40px_rgba(100,255,218,0.6)] animate-pulse-glow"
            />
          </div>

          {/* Welcome Text */}
          <div className="space-y-3 mb-8 animate-slideUp">
            <h1 className="text-3xl md:text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r from-[#64FFDA] via-[#3B82F6] to-[#8B5CF6] animate-gradient">
              Welcome to Sel-T
            </h1>
            <p className="text-base md:text-xl text-gray-300 font-light px-4">
              Your Ultimate Business Intelligence Dashboard
            </p>
            <div className="flex items-center justify-center gap-2 text-xs md:text-sm text-gray-400">
              <span className="w-2 h-2 bg-green-500 rounded-full animate-ping"></span>
              <span>Powered by Tally • Real-time Analytics</span>
            </div>
          </div>

          {/* Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center animate-slideUp animation-delay-300 px-4">
            <button
              onClick={() => window.dispatchEvent(new CustomEvent('openLogin'))}
              className="w-full sm:w-auto group relative px-8 md:px-10 py-3 md:py-4 bg-gradient-to-r from-[#64FFDA] to-[#3B82F6] text-[#0A192F] font-bold text-base md:text-lg rounded-xl shadow-[0_0_30px_rgba(100,255,218,0.3)] hover:shadow-[0_0_50px_rgba(100,255,218,0.6)] transition-all duration-300 hover:scale-105"
            >
              <span className="flex items-center justify-center gap-2">
                🔑 Login Now
              </span>
            </button>
            
            <button
              onClick={() => window.dispatchEvent(new CustomEvent('openSignup'))}
              className="w-full sm:w-auto group relative px-8 md:px-10 py-3 md:py-4 bg-gradient-to-r from-[#3B82F6] to-[#8B5CF6] text-white font-bold text-base md:text-lg rounded-xl shadow-[0_0_30px_rgba(59,130,246,0.3)] hover:shadow-[0_0_50px_rgba(59,130,246,0.6)] transition-all duration-300 hover:scale-105"
            >
              <span className="flex items-center justify-center gap-2">
                ✨ Create Account
              </span>
            </button>
          </div>

          {/* Feature Badges */}
          <div className="mt-8 flex flex-wrap justify-center gap-2 md:gap-4 animate-slideUp animation-delay-600 px-2">
            {['📊 Live Reports', '🔒 Secure', '⚡ Real-time', '📈 Analytics'].map((text, i) => (
              <div
                key={i}
                className="px-3 py-1.5 bg-[#112240]/50 backdrop-blur-sm border border-[#64FFDA]/20 rounded-full text-xs text-gray-300"
              >
                {text}
              </div>
            ))}
          </div>
        </div>

        {/* CSS Animations */}
        <style jsx>{`
          @keyframes fadeInScale {
            0% { opacity: 0; transform: scale(0.8); }
            100% { opacity: 1; transform: scale(1); }
          }
          @keyframes shockwave {
            0% { transform: scale(0.5); opacity: 1; }
            100% { transform: scale(2.5); opacity: 0; }
          }
          @keyframes slideUp {
            0% { opacity: 0; transform: translateY(30px); }
            100% { opacity: 1; transform: translateY(0); }
          }
          @keyframes float {
            0%, 100% { transform: translateY(0) translateX(0); }
            50% { transform: translateY(-20px) translateX(20px); }
          }
          @keyframes pulse-glow {
            0%, 100% { filter: drop-shadow(0 0 30px rgba(100,255,218,0.6)); }
            50% { filter: drop-shadow(0 0 60px rgba(100,255,218,0.9)); }
          }
          @keyframes gradient {
            0%, 100% { background-position: 0% 50%; }
            50% { background-position: 100% 50%; }
          }
          .animate-fadeInScale { animation: fadeInScale 1s ease-out forwards; }
          .animate-shockwave { animation: shockwave 2s ease-out infinite; }
          .animate-slideUp { animation: slideUp 0.8s ease-out forwards; opacity: 0; }
          .animate-float { animation: float linear infinite; }
          .animate-pulse-glow { animation: pulse-glow 3s ease-in-out infinite; }
          .animate-gradient { background-size: 200% 200%; animation: gradient 3s ease infinite; }
          .animation-delay-300 { animation-delay: 0.3s; }
          .animation-delay-600 { animation-delay: 0.6s; }
        `}</style>
      </div>
    );
  }

  // ============================================
  // LOADING STATE
  // ============================================
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-[#0A192F] via-[#112240] to-[#0A192F]">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-[#64FFDA] border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-[#64FFDA] text-xl font-semibold">Loading Dashboard...</p>
        </div>
      </div>
    );
  }

  // ============================================
  // MAIN DASHBOARD UI
  // ============================================
  return (
    <div className="p-6 min-h-screen bg-gradient-to-br from-[#0A192F] via-[#112240] to-[#0A192F] text-gray-100 animate-fadeIn">
      <div className="max-w-7xl mx-auto bg-[#1B2A4A] rounded-2xl shadow-2xl border border-[#223355] p-6">
        <h2 className="text-2xl font-bold text-[#64FFDA] mb-6 tracking-wide">
          📊 DASHBOARD OVERVIEW
        </h2>

        {/* Summary Cards */}
        <div className="grid sm:grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-gradient-to-r from-[#3B82F6] to-[#2563EB] text-white p-4 rounded-xl shadow-lg border border-[#334155] animate-slideUp">
            <p className="text-sm opacity-90">Total Sales</p>
            <h3 className="text-2xl font-bold mt-1">{fmt(totalSales)}</h3>
            <p className="text-xs opacity-75 mt-1">{stats.total_vouchers} vouchers</p>
          </div>

          <div className="bg-gradient-to-r from-[#059669] to-[#10B981] text-white p-4 rounded-xl shadow-lg border border-[#334155] animate-slideUp">
            <p className="text-sm opacity-90">Total Parties</p>
            <h3 className="text-2xl font-bold mt-1">{stats.total_parties}</h3>
            <p className="text-xs opacity-75 mt-1">Active customers</p>
          </div>

          <div className="bg-gradient-to-r from-[#0EA5A4] to-[#14B8A6] text-white p-4 rounded-xl shadow-lg border border-[#334155] animate-slideUp">
            <p className="text-sm opacity-90">Voucher Types</p>
            <h3 className="text-2xl font-bold mt-1">{stats.total_types}</h3>
            <p className="text-xs opacity-75 mt-1">Transaction categories</p>
          </div>

          <div className="bg-gradient-to-r from-[#F43F5E] to-[#EC4899] text-white p-4 rounded-xl shadow-lg border border-[#334155] animate-slideUp">
            <p className="text-sm opacity-90">Average Value</p>
            <h3 className="text-2xl font-bold mt-1">{fmt(totalSales / Math.max(1, stats.total_vouchers))}</h3>
            <p className="text-xs opacity-75 mt-1">Per transaction</p>
          </div>
        </div>

        {/* Charts Row */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          {/* Sales Trend (Month-wise Line Chart) */}
          {(() => {
            const monthlyAgg = {};
            cleanData.forEach((r) => {
              const dateStr = r["Date"] || r["Voucher Date"] || r["Inv Date"] || "";
              const d = new Date(dateStr);
              if (isNaN(d)) return;
              const month = d.toLocaleString("en-IN", { month: "short" });
              monthlyAgg[month] = (monthlyAgg[month] || 0) + toNumber(r["Amount"]);
            });

            const labels = Object.keys(monthlyAgg).length ? Object.keys(monthlyAgg) : ["Jan", "Feb", "Mar", "Apr", "May", "Jun"];
            const values = Object.keys(monthlyAgg).length ? Object.values(monthlyAgg) : [15, 25, 20, 32, 28, 35];

            return (
              <div className="bg-[#16223B] rounded-xl p-4 shadow-lg border border-[#223355] h-[230px] md:col-span-1">
                <h4 className="text-sm font-semibold text-[#64FFDA] mb-2 flex items-center gap-1">
                  📈 Sales Trend
                </h4>
                <Line
                  data={{
                    labels,
                    datasets: [
                      {
                        label: "Total Sales (₹)",
                        data: values,
                        borderColor: "#64FFDA",
                        backgroundColor: "rgba(100,255,218,0.15)",
                        tension: 0.4,
                        fill: true,
                      },
                    ],
                  }}
                  options={{
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: { legend: { display: false } },
                    scales: {
                      x: { ticks: { color: "#9CA3AF" }, grid: { color: "#1E293B" } },
                      y: { ticks: { color: "#9CA3AF" }, grid: { color: "#1E293B" } },
                    },
                  }}
                />
              </div>
            );
          })()}

          {/* Company-wise Sales (Bar Chart) */}
          {(() => {
            const companyAgg = {};
            cleanData.forEach((r) => {
              const comp = colValue(r, "Item Category") || "Unknown";
              companyAgg[comp] = (companyAgg[comp] || 0) + toNumber(r["Amount"]);
            });

            const labels = Object.keys(companyAgg);
            const values = Object.values(companyAgg);

            return (
              <div className="bg-[#16223B] rounded-xl p-4 shadow-lg border border-[#223355] h-[230px] md:col-span-3">
                <h4 className="text-sm font-semibold text-[#64FFDA] mb-2 flex items-center gap-1">
                  🏢 Company-wise Sales
                </h4>
                <Bar
                  data={{
                    labels,
                    datasets: [
                      {
                        label: "Amount (₹)",
                        data: values,
                        backgroundColor: [
                          "#60A5FA",
                          "#10B981",
                          "#F59E0B",
                          "#A78BFA",
                          "#F472B6",
                          "#F87171",
                          "#4ADE80",
                        ],
                        borderRadius: 6,
                      },
                    ],
                  }}
                  options={{
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                      legend: { display: false },
                      tooltip: {
                        callbacks: {
                          label: (ctx) => `₹${ctx.raw.toLocaleString("en-IN")}`,
                        },
                      },
                    },
                    scales: {
                      x: { ticks: { color: "#E5E7EB" }, grid: { color: "#1E293B" } },
                      y: { ticks: { color: "#E5E7EB" }, grid: { color: "#1E293B" } },
                    },
                  }}
                />
              </div>
            );
          })()}
        </div>

        {/* Product-wise Sales + Quantity */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          {/* Product-wise Sales */}
          {(() => {
            const prodAgg = {};
            cleanData.forEach((r) => {
              const item = colValue(r, "ItemName");
              prodAgg[item] = (prodAgg[item] || 0) + toNumber(r["Amount"]);
            });

            const labels = Object.keys(prodAgg).slice(0, 20);
            const values = Object.values(prodAgg).slice(0, 20);

            return (
              <div className="bg-[#0F1E33] rounded-xl p-4 shadow-lg border border-[#1E2D45] h-[300px]">
                <h4 className="text-sm font-semibold text-[#64FFDA] mb-3 flex items-center gap-1">
                  📦 Product-wise Sales
                </h4>
                <Bar
                  data={{
                    labels,
                    datasets: [
                      {
                        label: "Amount (₹)",
                        data: values,
                        backgroundColor: "rgba(59,130,246,0.8)",
                        borderColor: "#60A5FA",
                        borderWidth: 1,
                        borderRadius: 5,
                      },
                    ],
                  }}
                  options={{
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: { legend: { display: false } },
                    scales: {
                      x: { ticks: { color: "#9CA3AF" }, grid: { color: "#1E2A40" } },
                      y: { ticks: { color: "#9CA3AF" }, grid: { color: "#1E2A40" } },
                    },
                  }}
                />
              </div>
            );
          })()}

          {/* Product-wise Quantity */}
          {(() => {
            const qtyAgg = {};
            cleanData.forEach((r) => {
              const item = colValue(r, "ItemName");
              qtyAgg[item] = (qtyAgg[item] || 0) + toNumber(r["Qty"] || r["Quantity"]);
            });

            const labels = Object.keys(qtyAgg).slice(0, 20);
            const values = Object.values(qtyAgg).slice(0, 20);

            return (
              <div className="bg-[#0F1E33] rounded-xl p-4 shadow-lg border border-[#1E2D45] h-[300px]">
                <h4 className="text-sm font-semibold text-[#64FFDA] mb-3 flex items-center gap-1">
                  📊 Product-wise Quantity
                </h4>
                <Bar
                  data={{
                    labels,
                    datasets: [
                      {
                        label: "Quantity",
                        data: values,
                        backgroundColor: "rgba(16,185,129,0.85)",
                        borderColor: "#10B981",
                        borderRadius: 5,
                      },
                    ],
                  }}
                  options={{
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: { legend: { display: false } },
                    scales: {
                      x: { ticks: { color: "#9CA3AF" }, grid: { color: "#1E2A40" } },
                      y: { ticks: { color: "#9CA3AF" }, grid: { color: "#1E2A40" } },
                    },
                  }}
                />
              </div>
            );
          })()}
        </div>

        {/* TOP PERFORMERS SUMMARY SECTION */}
        <div className="mt-8">
          <h2 className="text-2xl font-bold text-[#64FFDA] mb-4 tracking-wide border-b border-[#1E2D45] pb-2">
            🏆 TOP PERFORMERS SUMMARY
          </h2>

          <div className="grid md:grid-cols-2 xl:grid-cols-4 gap-6">
            {/* Top 3 Companies */}
            {(() => {
              const companyAgg = {};
              cleanData.forEach((r) => {
                const comp = colValue(r, "Item Category") || "Unknown";
                companyAgg[comp] = (companyAgg[comp] || 0) + toNumber(r["Amount"]);
              });
              const topCompanies = Object.entries(companyAgg)
                .sort((a, b) => b[1] - a[1])
                .slice(0, 3);

              return (
                <div className="bg-[#0D1B2A] rounded-xl p-4 border border-[#1E2D45] shadow-lg hover:shadow-[#64FFDA]/30 transition">
                  <h4 className="text-[#64FFDA] font-semibold text-sm mb-3">🏢 Top Companies</h4>
                  {topCompanies.length === 0 && <p className="text-gray-400 text-sm">No data</p>}
                  <ul className="space-y-1 text-gray-200 text-sm">
                    {topCompanies.map(([name, val], i) => (
                      <li key={i} className="flex justify-between border-b border-[#1E2D45]/50 pb-1">
                        <span className="truncate w-2/3">{i + 1}. {name}</span>
                        <span className="text-[#64FFDA] font-semibold">₹{val.toLocaleString("en-IN")}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              );
            })()}

            {/* Top 3 Products */}
            {(() => {
              const prodAgg = {};
              cleanData.forEach((r) => {
                const prod = colValue(r, "ItemName") || "Unknown";
                prodAgg[prod] = (prodAgg[prod] || 0) + toNumber(r["Amount"]);
              });
              const topProducts = Object.entries(prodAgg)
                .sort((a, b) => b[1] - a[1])
                .slice(0, 3);

              return (
                <div className="bg-[#0D1B2A] rounded-xl p-4 border border-[#1E2D45] shadow-lg hover:shadow-[#64FFDA]/30 transition">
                  <h4 className="text-[#64FFDA] font-semibold text-sm mb-3">📦 Top Products</h4>
                  {topProducts.length === 0 && <p className="text-gray-400 text-sm">No data</p>}
                  <ul className="space-y-1 text-gray-200 text-sm">
                    {topProducts.map(([name, val], i) => (
                      <li key={i} className="flex justify-between border-b border-[#1E2D45]/50 pb-1">
                        <span className="truncate w-2/3">{i + 1}. {name}</span>
                        <span className="text-[#64FFDA] font-semibold">₹{val.toLocaleString("en-IN")}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              );
            })()}

            {/* Top 3 Salesmen */}
            {(() => {
              const salesAgg = {};
              cleanData.forEach((r) => {
                const sm = colValue(r, "Salesman") || "Unknown";
                salesAgg[sm] = (salesAgg[sm] || 0) + toNumber(r["Amount"]);
              });
              const topSalesmen = Object.entries(salesAgg)
                .sort((a, b) => b[1] - a[1])
                .slice(0, 3);

              return (
                <div className="bg-[#0D1B2A] rounded-xl p-4 border border-[#1E2D45] shadow-lg hover:shadow-[#64FFDA]/30 transition">
                  <h4 className="text-[#64FFDA] font-semibold text-sm mb-3">🧑‍💼 Top Salesmen</h4>
                  {topSalesmen.length === 0 && <p className="text-gray-400 text-sm">No data</p>}
                  <ul className="space-y-1 text-gray-200 text-sm">
                    {topSalesmen.map(([name, val], i) => (
                      <li key={i} className="flex justify-between border-b border-[#1E2D45]/50 pb-1">
                        <span className="truncate w-2/3">{i + 1}. {name}</span>
                        <span className="text-[#64FFDA] font-semibold">₹{val.toLocaleString("en-IN")}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              );
            })()}

            {/* Top 3 Areas */}
            {(() => {
              const areaAgg = {};
              cleanData.forEach((r) => {
                const city = colValue(r, "City/Area") || "Unknown";
                areaAgg[city] = (areaAgg[city] || 0) + toNumber(r["Amount"]);
              });
              const topAreas = Object.entries(areaAgg)
                .sort((a, b) => b[1] - a[1])
                .slice(0, 3);

              return (
                <div className="bg-[#0D1B2A] rounded-xl p-4 border border-[#1E2D45] shadow-lg hover:shadow-[#64FFDA]/30 transition">
                  <h4 className="text-[#64FFDA] font-semibold text-sm mb-3">🌆 Top Areas</h4>
                  {topAreas.length === 0 && <p className="text-gray-400 text-sm">No data</p>}
                  <ul className="space-y-1 text-gray-200 text-sm">
                    {topAreas.map(([name, val], i) => (
                      <li key={i} className="flex justify-between border-b border-[#1E2D45]/50 pb-1">
                        <span className="truncate w-2/3">{i + 1}. {name}</span>
                        <span className="text-[#64FFDA] font-semibold">₹{val.toLocaleString("en-IN")}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              );
            })()}
          </div>
        </div>

        {/* SUMMARISED REPORTS */}
        <div className="mt-8">
          <h2 className="text-2xl font-bold text-[#64FFDA] mb-4 tracking-wide border-b border-[#1E2D45] pb-2">
            📊 SUMMARISED REPORTS
          </h2>

          {/* Filter */}
          <div className="mb-6 flex items-center gap-3 bg-[#0D1B2A] border border-[#1E2D45] rounded-lg p-3 shadow-inner">
            <label className="font-semibold text-[#64FFDA]">Filter by Item Category:</label>
            <select
              className="bg-[#112A45] text-gray-200 border border-[#1E2D45] rounded px-3 py-1 focus:outline-none focus:ring-2 focus:ring-[#64FFDA] transition"
              value={filterCategory || ""}
              onChange={(e) => setFilterCategory(e.target.value)}
            >
              <option value="">All</option>
              {Array.from(
                new Set(cleanData.map((r) => colValue(r, "Item Category")).filter(Boolean))
              ).map((cat, i) => (
                <option key={i} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
          </div>

          <div className="grid md:grid-cols-2 xl:grid-cols-2 gap-6 mb-6">
            <ReportCard
              title="Party Wise Sales Report"
              columns={["Party Name", "Item Category", "Amount"]}
              data={aggregateData("Party Name", "Item Category")}
              onView={() => openViewModal("Party Wise Sales Report", ["Party Name", "Item Category", "Amount"], aggregateData("Party Name", "Item Category"))}
              onRowClick={(row) => openDetailModal(row, ["Party Name", "Item Category", "Amount", "Count"])}
            />
            <ReportCard
              title="ASM Wise Sales Report"
              columns={["Salesman", "Item Category", "Amount"]}
              data={aggregateData("Salesman", "Item Category")}
              onView={() => openViewModal("ASM Wise Sales Report", ["Salesman", "Item Category", "Amount"], aggregateData("Salesman", "Item Category"))}
              onRowClick={(row) => openDetailModal(row, ["Salesman", "Item Category", "Amount", "Count"])}
            />
          </div>
          <div className="grid md:grid-cols-2 xl:grid-cols-2 gap-6 mb-6">
            <ReportCard
              title="Area Wise Sales Report"
              columns={["City/Area", "Item Category", "Amount"]}
              data={aggregateData("City/Area", "Item Category")}
              onView={() => openViewModal("Area Wise Sales Report", ["City/Area", "Item Category", "Amount"], aggregateData("City/Area", "Item Category"))}
              onRowClick={(row) => openDetailModal(row, ["City/Area", "Item Category", "Amount", "Count"])}
            />
            <ReportCard
              title="Product Wise Sales Report"
              columns={["ItemName", "Item Group", "Amount"]}
              data={aggregateData("ItemName", "Item Group")}
              onView={() => openViewModal("Product Wise Sales Report", ["ItemName", "Item Group", "Amount"], aggregateData("ItemName", "Item Group"))}
              onRowClick={(row) => openDetailModal(row, ["ItemName", "Item Group", "Amount", "Count"])}
            />
          </div>
          <div className="grid md:grid-cols-1 xl:grid-cols-1 gap-6 mb-6">
            <ReportCard
              title="Item Group Wise Sales Report"
              columns={["Item Group", "Item Category", "Amount"]}
              data={aggregateData("Item Group", "Item Category")}
              onView={() => openViewModal("Item Group Wise Sales Report", ["Item Group", "Item Category", "Amount"], aggregateData("Item Group", "Item Category"))}
              onRowClick={(row) => openDetailModal(row, ["Item Group", "Item Category", "Amount", "Count"])}
            />
          </div>
        </div>
      </div>

      {/* VIEW MODAL */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-start justify-center pt-10">
          <div
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={() => setModalOpen(false)}
          />
          <div
            ref={modalRef}
            className="relative w-[94%] max-w-6xl bg-[#0D1B2A]/90 backdrop-blur-lg rounded-2xl shadow-[0_0_30px_rgba(100,255,218,0.2)] border border-[#1E2D45] p-6 z-60 text-gray-100"
          >
            {/* Header */}
            <div className="flex justify-between items-center mb-4 border-b pb-3">
              <h3 className="text-2xl font-bold text-[#64FFDA] tracking-wide">
                {modalContent.title}
              </h3>
              <button
                onClick={() => setModalOpen(false)}
                className="bg-red-500 text-white rounded-full w-9 h-9 flex items-center justify-center hover:bg-red-600 transition"
              >
                ✕
              </button>
            </div>

            {/* Table View */}
            <div className="flex flex-col md:flex-row gap-6">
              <div
                id="modal-scroll"
                className="flex-1 max-h-[65vh] overflow-auto border border-[#1E2D45] rounded-xl p-4 bg-[#0F1E33] shadow-inner"
              >
                <table className="w-full text-sm border-collapse">
                  <thead className="bg-[#102C46] text-[#64FFDA] sticky top-0">
                    <tr>
                      {modalContent.columns.map((col, i) => (
                        <th key={i} className={`px-3 py-2 ${i === modalContent.columns.length - 1 ? 'text-right' : 'text-left'}`}>
                          {col}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {(modalContent.data || []).map((r, i) => (
                      <tr
                        key={i}
                        onClick={() => openDetailModal(r, modalContent.columns)}
                        className={`${
                          i % 2 === 0 ? "bg-[#13253E]" : "bg-[#1A2E4A]"
                        } hover:bg-[#1B3C55] text-gray-100 cursor-pointer transition`}
                      >
                        {modalContent.columns.map((col, j) => (
                          <td
                            key={j}
                            className={`px-3 py-2 ${j === modalContent.columns.length - 1 ? 'text-right text-[#64FFDA]' : ''}`}
                          >
                            {col === "Amount" ? fmt(r[col]) : r[col] || "-"}
                          </td>
                        ))}
                      </tr>
                    ))}
                    
                    {/* TOTAL ROW */}
                    {modalContent.data && modalContent.data.length > 0 && (
                      <tr className="bg-[#64FFDA]/20 font-bold text-[#64FFDA] border-t-2 border-[#64FFDA]">
                        <td className="px-3 py-2" colSpan={modalContent.columns.length - 1}>
                          TOTAL
                        </td>
                        <td className="px-3 py-2 text-right">
                          {fmt(modalContent.data.reduce((sum, r) => sum + toNumber(r.Amount || 0), 0))}
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              {/* Options Panel */}
              <aside className="w-[280px] bg-[#102C46] border border-[#1E2D45] rounded-xl p-4 shadow-md text-gray-100">
                <h4 className="font-semibold text-[#64FFDA] mb-3 flex items-center gap-2">
                  ⚙️ Export Options
                </h4>
                <div className="flex flex-col gap-3">
                  <button 
                    onClick={() => exportPDF(modalContent.title)}
                    className="w-full bg-[#059669] text-white py-2 rounded hover:bg-[#047857] transition"
                  >
                    📄 Export PDF
                  </button>
                  <button 
                    onClick={() => exportExcel(modalContent.title, modalContent.columns, modalContent.data)}
                    className="w-full bg-[#2563EB] text-white py-2 rounded hover:bg-[#1D4ED8] transition"
                  >
                    📊 Export Excel
                  </button>
                  <button 
                    onClick={() => exportCSV(modalContent.title, modalContent.columns, modalContent.data)}
                    className="w-full bg-[#334155] text-white py-2 rounded hover:bg-[#1E293B] transition"
                  >
                    📁 Export CSV
                  </button>
                </div>

                <div className="text-sm text-gray-300 mt-4 border-t border-[#1E2D45] pt-3">
                  <strong>Total Rows:</strong> {modalContent.data ? modalContent.data.length : 0}
                  <br />
                  <strong>Total Amount:</strong> {fmt(modalContent.data ? modalContent.data.reduce((sum, r) => sum + toNumber(r.Amount || 0), 0) : 0)}
                  <br />
                  <strong>Filter:</strong> {filterCategory || "All"}
                </div>
              </aside>
            </div>
          </div>
        </div>
      )}

      {/* DETAIL MODAL (Click on row to see details) */}
      {detailModalOpen && selectedRowDetail && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => setDetailModalOpen(false)}
          />
          <div className="relative bg-[#0D1B2A] border border-[#64FFDA]/30 rounded-2xl p-6 max-w-2xl w-full shadow-[0_0_40px_rgba(100,255,218,0.3)] z-[71]">
            <div className="flex justify-between items-center mb-4 border-b border-[#1E2D45] pb-3">
              <h3 className="text-xl font-bold text-[#64FFDA]">📋 Row Details</h3>
              <button
                onClick={() => setDetailModalOpen(false)}
                className="bg-red-500 text-white rounded-full w-8 h-8 flex items-center justify-center hover:bg-red-600 transition"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3">
              {selectedRowDetail.columns.map((col, i) => (
                <div key={i} className="flex justify-between border-b border-[#1E2D45]/50 pb-2">
                  <span className="font-semibold text-gray-300">{col}:</span>
                  <span className="text-[#64FFDA]">
                    {col === "Amount" 
                      ? fmt(selectedRowDetail.row[col]) 
                      : selectedRowDetail.row[col] || "-"}
                  </span>
                </div>
              ))}
            </div>

            <button
              onClick={() => setDetailModalOpen(false)}
              className="mt-4 w-full bg-gradient-to-r from-[#3B82F6] to-[#2563EB] text-white py-2 rounded-lg hover:shadow-lg transition"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ============================================
// REUSABLE REPORT CARD COMPONENT
// ============================================
function ReportCard({ title, columns, data, onView, onRowClick }) {
  const fmt = (v) => `₹${Number(v || 0).toLocaleString("en-IN", { maximumFractionDigits: 0 })}`;
  const toNumber = (v) => parseFloat(String(v || "").replace(/[^0-9.-]/g, "")) || 0;

  const exportCSV = () => {
    const csv = [
      columns.join(","),
      ...data.map((r) => columns.map((c) => (r[c] || "").toString().replace(/,/g, " ")).join(",")),
    ].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${title}.csv`;
    a.click();
  };

  const exportExcel = () => {
    const ws = XLSX.utils.json_to_sheet(data.map((row) => {
      const out = {};
      columns.forEach((c) => (out[c] = row[c] || ""));
      return out;
    }));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Report");
    XLSX.writeFile(wb, `${title}.xlsx`);
  };

  const totalAmount = data.reduce((sum, r) => sum + toNumber(r.Amount || 0), 0);

  return (
    <div className="bg-[#0D1B2A] rounded-xl p-4 shadow-[0_0_10px_rgba(100,255,218,0.15)] border border-[#1E2D45] hover:shadow-[0_0_20px_rgba(100,255,218,0.25)] transition-transform duration-300 hover:scale-[1.01]">
      <div className="flex justify-between items-center mb-3 border-b border-[#1E2D45] pb-2">
        <h4 className="text-[#64FFDA] font-semibold tracking-wide">{title}</h4>
        <div className="flex gap-2">
          <button onClick={exportCSV} className="bg-indigo-600 text-white text-xs px-3 py-1 rounded hover:bg-indigo-700 transition">CSV</button>
          <button onClick={exportExcel} className="bg-blue-600 text-white text-xs px-3 py-1 rounded hover:bg-blue-700 transition">XLSX</button>
          <button onClick={onView} className="bg-rose-500 text-white text-xs px-3 py-1 rounded hover:bg-rose-600 transition">View</button>
        </div>
      </div>

      <div className="overflow-auto max-h-64 border rounded">
        <table className="w-full text-sm">
          <thead className="bg-[#0B2545] text-[#64FFDA] uppercase text-xs tracking-wider sticky top-0 shadow-lg">
            <tr>
              {columns.map((c, i) => (
                <th
                  key={i}
                  className={`px-3 py-2 text-left font-semibold ${i === columns.length - 1 ? "text-right" : ""}`}
                >
                  {c}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.length === 0 && (
              <tr>
                <td colSpan={columns.length} className="text-center py-3 text-gray-400">
                  No Data Found
                </td>
              </tr>
            )}
            {data.slice(0, 20).map((row, i) => (
              <tr
                key={i}
                onClick={() => onRowClick && onRowClick(row)}
                className={`${
                  i % 2 === 0 ? "bg-[#0F1E33]" : "bg-[#13253E]"
                } hover:bg-[#1C3F57] transition text-gray-100 border-b border-[#1E2D45] cursor-pointer`}
              >
                {columns.map((c, j) => (
                  <td
                    key={j}
                    className={`px-3 py-2 ${
                      j === columns.length - 1 ? "text-right text-[#64FFDA]" : ""
                    }`}
                  >
                    {c === "Amount" ? fmt(row[c]) : row[c] || "-"}
                  </td>
                ))}
              </tr>
            ))}

            {/* TOTAL ROW */}
            {data.length > 0 && (
              <tr className="bg-[#64FFDA]/20 font-bold text-[#64FFDA] border-t-2 border-[#64FFDA] sticky bottom-0">
                <td className="px-3 py-2" colSpan={columns.length - 1}>
                  TOTAL
                </td>
                <td className="px-3 py-2 text-right">
                  {fmt(totalAmount)}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
