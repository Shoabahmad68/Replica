// src/pages/Dashboard.jsx
import React, { useEffect, useState, useMemo, useRef } from "react";
import { Line, Bar, Pie } from "react-chartjs-2";
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
  const [allData, setAllData] = useState([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [selectedRowDetail, setSelectedRowDetail] = useState(null);
  const [modalContent, setModalContent] = useState({ title: "", columns: [], data: [] });
  const [filterCategory, setFilterCategory] = useState("");
  const [filterPartyGroup, setFilterPartyGroup] = useState("");
  const [dateFilter, setDateFilter] = useState("all");
  const [customDateRange, setCustomDateRange] = useState({ start: '', end: '' });
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("overview");
  const [stats, setStats] = useState({
    total_vouchers: 0,
    total_amount: 0,
    total_parties: 0,
    total_types: 0
  });

  const [partyFilter, setPartyFilter] = useState("");
  const [salesmanFilter, setSalesmanFilter] = useState("");
  const [areaFilter, setAreaFilter] = useState("");
  const [productFilter, setProductFilter] = useState("");
  const [itemGroupFilter, setItemGroupFilter] = useState("");

  const { user, token } = useAuth();
  const isLoggedIn = !!user;

  const modalRef = useRef();

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        
        const backendURL = window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1"
          ? "http://127.0.0.1:8787"
          : "https://selt-t-backend.selt-3232.workers.dev";

        let vouchersURL = `${backendURL}/api/vouchers?limit=10000`;

        const vouchersRes = await fetch(vouchersURL);
        const vouchersJson = await vouchersRes.json();

        if (vouchersJson.success && vouchersJson.data) {
          const normalized = vouchersJson.data.map(v => ({
            "Date": v.date || '',
            "Voucher Number": v.vch_no || v.voucher_number || '',
            "Voucher Type": v.vch_type || v.voucher_type || 'Sales',
            "Party Name": v.party_name || 'N/A',
            "Party Group": v.party_group || 'N/A',
            "ItemName": v.name_item || v.item_name || 'N/A',
            "Item Group": v.item_group || 'N/A',
            "Item Category": v.item_category || 'Sales',
            "Salesman": v.salesman || 'N/A',
            "City/Area": v.city_area || 'N/A',
            "Amount": parseFloat(v.amount) || 0,
            "Qty": parseFloat(v.qty) || 0,
            "Narration": v.narration || ''
          }));

          setAllData(normalized);
          setExcelData(normalized);
        } else {
          setAllData([]);
          setExcelData([]);
        }

        const statsRes = await fetch(`${backendURL}/api/dashboard/stats`);
        const statsJson = await statsRes.json();

        if (statsJson.success && statsJson.data) {
          setStats(statsJson.data);
        }

        setLoading(false);
      } catch (err) {
        console.error("❌ Error:", err);
        setAllData([]);
        setExcelData([]);
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  useEffect(() => {
    if (!allData.length) return;

    let filtered = [...allData];

    if (dateFilter !== "all") {
      const today = new Date();
      let startDate = null;
      let endDate = null;

      switch(dateFilter) {
        case "today":
          startDate = new Date(today.setHours(0,0,0,0));
          endDate = new Date(today.setHours(23,59,59,999));
          break;
        case "yesterday":
          const yesterday = new Date();
          yesterday.setDate(yesterday.getDate() - 1);
          startDate = new Date(yesterday.setHours(0,0,0,0));
          endDate = new Date(yesterday.setHours(23,59,59,999));
          break;
        case "this_week":
          const startOfWeek = new Date(today);
          const day = startOfWeek.getDay();
          const diff = startOfWeek.getDate() - day;
          startDate = new Date(startOfWeek.setDate(diff));
          startDate.setHours(0,0,0,0);
          endDate = new Date();
          endDate.setHours(23,59,59,999);
          break;
        case "this_month":
          startDate = new Date(today.getFullYear(), today.getMonth(), 1);
          startDate.setHours(0,0,0,0);
          endDate = new Date();
          endDate.setHours(23,59,59,999);
          break;
        case "last_month":
          startDate = new Date(today.getFullYear(), today.getMonth() - 1, 1);
          startDate.setHours(0,0,0,0);
          endDate = new Date(today.getFullYear(), today.getMonth(), 0);
          endDate.setHours(23,59,59,999);
          break;
        case "this_quarter":
          const currentQuarter = Math.floor(today.getMonth() / 3);
          startDate = new Date(today.getFullYear(), currentQuarter * 3, 1);
          startDate.setHours(0,0,0,0);
          endDate = new Date();
          endDate.setHours(23,59,59,999);
          break;
        case "this_year":
          startDate = new Date(today.getFullYear(), 0, 1);
          startDate.setHours(0,0,0,0);
          endDate = new Date();
          endDate.setHours(23,59,59,999);
          break;
        case "last_year":
          startDate = new Date(today.getFullYear() - 1, 0, 1);
          startDate.setHours(0,0,0,0);
          endDate = new Date(today.getFullYear() - 1, 11, 31);
          endDate.setHours(23,59,59,999);
          break;
        case "custom":
          if (customDateRange.start) {
            startDate = new Date(customDateRange.start);
            startDate.setHours(0,0,0,0);
          }
          if (customDateRange.end) {
            endDate = new Date(customDateRange.end);
            endDate.setHours(23,59,59,999);
          }
          break;
      }

      if (startDate || endDate) {
        filtered = filtered.filter(row => {
          const rowDate = new Date(row.Date);
          if (isNaN(rowDate)) return false;
          
          if (startDate && endDate) {
            return rowDate >= startDate && rowDate <= endDate;
          } else if (startDate) {
            return rowDate >= startDate;
          } else if (endDate) {
            return rowDate <= endDate;
          }
          return true;
        });
      }
    }

    setExcelData(filtered);

  }, [dateFilter, customDateRange, allData]);

  const toNumber = (v) => parseFloat(String(v || "").replace(/[^0-9.-]/g, "")) || 0;
  const fmt = (v) => `₹${Number(v || 0).toLocaleString("en-IN", { maximumFractionDigits: 0 })}`;

  const isTotalRow = (r) => {
    try {
      const checkValues = Object.values(r || {}).map((v) => String(v || "").toLowerCase().trim());
      if (checkValues.some((v) => ["total", "grand total", "sub total", "overall total"].some((w) => v.includes(w)))) return true;
      if (checkValues.every((v) => v === "")) return true;
      return false;
    } catch {
      return false;
    }
  };

  const cleanData = useMemo(() => {
    let filtered = excelData.filter((r) => !isTotalRow(r));
    if (filterCategory) {
      filtered = filtered.filter(r => r["Item Category"] === filterCategory);
    }
    if (filterPartyGroup) {
      filtered = filtered.filter(r => r["Party Group"] === filterPartyGroup);
    }
    return filtered;
  }, [excelData, filterCategory, filterPartyGroup]);

  const colValue = (r, col) => {
    if (!r) return "";
    const val = r[col];
    if (val !== undefined && val !== null && String(val).trim() !== "" && String(val).trim() !== "N/A") {
      return String(val).trim();
    }
    return "";
  };

  const aggregateData = (col1, col2, filter1 = "", filter2 = "") => {
    const rows = cleanData;
    
    const combined = {};
    rows.forEach((r) => {
      const c1 = colValue(r, col1) || "-";
      const c2 = colValue(r, col2) || "-";
      
      if (filter1 && c1 !== filter1) return;
      if (filter2 && c2 !== filter2) return;
      
      const amt = toNumber(r["Amount"] || 0);
      const qty = toNumber(r["Qty"] || 0);
      const key = `${c1}||${c2}`;
      if (!combined[key]) {
        combined[key] = { [col1]: c1, [col2]: c2, Amount: 0, Qty: 0, Count: 0 };
      }
      combined[key].Amount += amt;
      combined[key].Qty += qty;
      combined[key].Count += 1;
    });

    const finalData = Object.values(combined);
    return finalData.sort((a, b) => b.Amount - a.Amount);
  };

  const totalSales = useMemo(() => cleanData.reduce((s, r) => s + toNumber(r["Amount"] || 0), 0), [cleanData]);

  const uniqueVoucherNumbers = useMemo(() => {
    return new Set(cleanData.map(r => r["Voucher Number"]).filter(v => v && v !== 'N/A')).size;
  }, [cleanData]);

  const totalProducts = useMemo(() => {
    return new Set(cleanData.map(r => r["ItemName"]).filter(v => v && v !== 'N/A')).size;
  }, [cleanData]);

  const exportCSV = (title, columns, data) => {
    const csv = [columns.join(","), ...data.map((r) => columns.map((c) => (r[c] || "").toString().replace(/,/g, " ")).join(","))].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${title}.csv`;
    a.click();
  };

  const exportExcel = (title, columns, data) => {
    const ws = XLSX.utils.json_to_sheet(data.map((row) => {
      const out = {};
      columns.forEach((c) => (out[c] = row[c] || ""));
      return out;
    }));
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

  // ==============================
// LOGIN FLOW FIX
// ==============================
// Case 1: No user + No token → user is logged out
if (!user && !token) {
  return (
    <div className="flex items-center justify-center min-h-screen bg-[#0A192F] text-white">
      <button
        onClick={() => window.dispatchEvent(new CustomEvent("openLogin"))}
        className="px-6 py-3 bg-[#64FFDA] text-[#0A192F] rounded-lg font-bold"
      >
        Login
      </button>
    </div>
  );
}

// Case 2: Token exists but user not loaded yet → Prevent auto logout
if (!user && token) {
  return (
    <div className="flex items-center justify-center min-h-screen bg-[#0A192F] text-white">
      <div>
        <div className="w-12 h-12 border-4 border-[#64FFDA] border-t-transparent rounded-full animate-spin mx-auto mb-4" />
        <p className="text-[#64FFDA]">Loading your account…</p>
      </div>
    </div>
  );
}

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0A192F] via-[#112240] to-[#0A192F] text-gray-100 p-2 sm:p-4 md:p-6">
      <div className="max-w-[1450px] mx-auto bg-[#1B2A4A] rounded-2xl shadow-xl border border-[#1E2D45] p-4 md:p-6 space-y-6">
        <h2 className="text-xl sm:text-2xl font-bold text-[#64FFDA] mb-4 sm:mb-6">📊 DASHBOARD</h2>

        {/* COMPACT FILTERS */}
        <div className="mb-4 bg-[#0D1B2A] border border-[#1E2D45] rounded-lg p-3 space-y-3">
          {/* Date Filter Row */}
          <div className="flex flex-wrap items-center gap-2">
            <label className="text-[#64FFDA] text-xs font-semibold whitespace-nowrap">📅 Date:</label>
            <select 
              className="flex-1 min-w-[120px] bg-[#112A45] text-gray-200 border border-[#1E2D45] rounded px-2 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-[#64FFDA]" 
              value={dateFilter} 
              onChange={(e) => setDateFilter(e.target.value)}
            >
              <option value="today">Today</option>
              <option value="yesterday">Yesterday</option>
              <option value="this_week">This Week</option>
              <option value="this_month">This Month</option>
              <option value="last_month">Last Month</option>
              <option value="this_quarter">This Quarter</option>
              <option value="this_year">This Year</option>
              <option value="last_year">Last Year</option>
              <option value="all">All</option>
              <option value="custom">Custom</option>
            </select>

            {dateFilter === "custom" && (
              <>
                <input 
                  type="date" 
                  className="flex-1 min-w-[120px] bg-[#112A45] text-gray-200 border border-[#1E2D45] rounded px-2 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-[#64FFDA]" 
                  value={customDateRange.start} 
                  onChange={(e) => setCustomDateRange({...customDateRange, start: e.target.value})} 
                />
                <input 
                  type="date" 
                  className="flex-1 min-w-[120px] bg-[#112A45] text-gray-200 border border-[#1E2D45] rounded px-2 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-[#64FFDA]" 
                  value={customDateRange.end} 
                  onChange={(e) => setCustomDateRange({...customDateRange, end: e.target.value})} 
                />
              </>
            )}
          </div>

          {/* Category & Party Group Row */}
          <div className="flex flex-wrap items-center gap-2">
            <label className="text-[#64FFDA] text-xs font-semibold whitespace-nowrap">🏷️ Category:</label>
            <select 
              className="flex-1 min-w-[100px] bg-[#112A45] text-gray-200 border border-[#1E2D45] rounded px-2 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-[#64FFDA]" 
              value={filterCategory || ""} 
              onChange={(e) => setFilterCategory(e.target.value)}
            >
              <option value="">All</option>
              {Array.from(new Set(allData.map((r) => r["Item Category"]).filter(v => v && v !== 'N/A'))).map((cat, i) => (
                <option key={i} value={cat}>{cat}</option>
              ))}
            </select>
            
            {filterCategory && (
              <button onClick={() => setFilterCategory('')} className="bg-red-500 text-white px-2 py-1 rounded text-xs hover:bg-red-600">×</button>
            )}

            <label className="text-[#64FFDA] text-xs font-semibold whitespace-nowrap">👥 Group:</label>
            <select 
              className="flex-1 min-w-[100px] bg-[#112A45] text-gray-200 border border-[#1E2D45] rounded px-2 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-[#64FFDA]" 
              value={filterPartyGroup || ""} 
              onChange={(e) => setFilterPartyGroup(e.target.value)}
            >
              <option value="">All</option>
              {Array.from(new Set(allData.map((r) => r["Party Group"]).filter(v => v && v !== 'N/A'))).map((grp, i) => (
                <option key={i} value={grp}>{grp}</option>
              ))}
            </select>
            
            {filterPartyGroup && (
              <button onClick={() => setFilterPartyGroup('')} className="bg-red-500 text-white px-2 py-1 rounded text-xs hover:bg-red-600">×</button>
            )}
          </div>
        </div>

        {/* TAB MENU */}
        <div className="flex gap-3 sm:gap-6 mb-6 border-b border-[#1E2D45] pb-2 overflow-x-auto scrollbar-hide">
          <button onClick={() => setActiveTab("overview")} className={`px-4 sm:px-6 py-2 font-semibold rounded-lg hover:bg-[#0F1E33] transition text-xs sm:text-base whitespace-nowrap ${activeTab === "overview" ? "text-[#64FFDA] border-b-2 border-[#64FFDA]" : "text-gray-400 hover:text-gray-200"}`}>📈 Overview</button>
          <button onClick={() => setActiveTab("performers")} className={`px-4 sm:px-6 py-2 font-semibold rounded-lg hover:bg-[#0F1E33] transition text-xs sm:text-base whitespace-nowrap ${activeTab === "performers" ? "text-[#64FFDA] border-b-2 border-[#64FFDA]" : "text-gray-400 hover:text-gray-200"}`}>🏆 Top</button>
          <button onClick={() => setActiveTab("reports")} className={`px-4 sm:px-6 py-2 font-semibold rounded-lg hover:bg-[#0F1E33] transition text-xs sm:text-base whitespace-nowrap ${activeTab === "reports" ? "text-[#64FFDA] border-b-2 border-[#64FFDA]" : "text-gray-400 hover:text-gray-200"}`}>📊 Reports</button>
        </div>

        {/* OVERVIEW TAB */}
        {activeTab === "overview" && (
          <>
            {/* Summary Cards - Responsive Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-4 gap-3 mb-4">
              <div className="bg-[#0F1E33] border border-[#1E2D45] rounded-xl p-4 shadow-lg hover:shadow-2xl hover:scale-[1.02] transition-all duration-300">
                <p className="text-[10px] sm:text-xs opacity-90">Total Sales</p>
                <h3 className="text-sm sm:text-xl md:text-2xl font-bold mt-1">{fmt(totalSales)}</h3>
                <p className="text-[8px] sm:text-[10px] opacity-75 mt-1">{cleanData.length} trans</p>
              </div>

              <div className="bg-[#12263F] border border-[#1E2D45] rounded-xl p-4 shadow-lg hover:shadow-2xl hover:scale-[1.02] transition-all duration-300">
                <p className="text-[10px] sm:text-xs opacity-90">Parties</p>
                <h3 className="text-sm sm:text-xl md:text-2xl font-bold mt-1">{new Set(cleanData.map(r => r["Party Name"]).filter(v => v && v !== 'N/A')).size}</h3>
                <p className="text-[8px] sm:text-[10px] opacity-75 mt-1">Customers</p>
              </div>

              <div className="bg-[#12263F] border border-[#1E2D45] rounded-xl p-4 shadow-lg hover:shadow-2xl hover:scale-[1.02] transition-all duration-300">
                <p className="text-[10px] sm:text-xs opacity-90">Vouchers</p>
                <h3 className="text-sm sm:text-xl md:text-2xl font-bold mt-1">{uniqueVoucherNumbers}</h3>
                <p className="text-[8px] sm:text-[10px] opacity-75 mt-1">Bills</p>
              </div>

              <div className="bg-[#12263F] border border-[#1E2D45] rounded-xl p-4 shadow-lg hover:shadow-2xl hover:scale-[1.02] transition-all duration-300">
                <p className="text-[10px] sm:text-xs opacity-90">Products</p>
                <h3 className="text-sm sm:text-xl md:text-2xl font-bold mt-1">{totalProducts}</h3>
                <p className="text-[8px] sm:text-[10px] opacity-75 mt-1">Items</p>
              </div>
            </div>

            {/* Charts - Responsive Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3 sm:gap-4 mb-4 sm:mb-6">
              {/* Sales Trend */}
              {(() => {
                const monthlyAgg = {};
                cleanData.forEach((r) => {
                  const dateStr = r["Date"] || '';
                  const d = new Date(dateStr);
                  if (isNaN(d)) return;
                  const monthYear = d.toLocaleString("en-IN", { month: "short", year: "numeric" });
                  monthlyAgg[monthYear] = (monthlyAgg[monthYear] || 0) + toNumber(r["Amount"]);
                });

                const entries = Object.entries(monthlyAgg).sort((a, b) => new Date(a[0]) - new Date(b[0]));
                const labels = entries.map(([k]) => k);
                const values = entries.map(([, v]) => v);

                return (
                  <div className="bg-[#0F1E33] border border-[#1E2D45] rounded-xl p-4 shadow-lg h-[260px] overflow-hidden">
                    <h4 className="text-xs sm:text-sm font-bold text-[#64FFDA] mb-2 sm:mb-3">📈 Sales Trend</h4>
                    <Line
                      data={{
                        labels,
                        datasets: [{
                          label: "Sales",
                          data: values,
                          borderColor: "#64FFDA",
                          backgroundColor: "rgba(100,255,218,0.1)",
                          borderWidth: 2,
                          tension: 0.4,
                          fill: true,
                          pointRadius: 2,
                          pointHoverRadius: 4,
                        }],
                      }}
                      options={{
                        responsive: true,
                        maintainAspectRatio: false,
                        plugins: {
                          legend: { display: false },
                          tooltip: {
                            backgroundColor: "rgba(0,0,0,0.8)",
                            padding: 8,
                            titleColor: "#64FFDA",
                            bodyColor: "#fff",
                            callbacks: { label: (ctx) => `₹${ctx.raw.toLocaleString("en-IN")}` }
                          }
                        },
                        scales: {
                          x: { ticks: { color: "#9CA3AF", font: { size: 9 } }, grid: { color: "#1E293B", drawBorder: false } },
                          y: { ticks: { color: "#9CA3AF", font: { size: 9 }, callback: (val) => `₹${(val/1000).toFixed(0)}K` }, grid: { color: "#1E293B", drawBorder: false } },
                        },
                      }}
                    />
                  </div>
                );
              })()}

              {/* Category Pie */}
              {(() => {
                const categoryAgg = {};
                cleanData.forEach((r) => {
                  const cat = r["Item Category"] || "Unknown";
                  if (cat === 'N/A') return;
                  categoryAgg[cat] = (categoryAgg[cat] || 0) + toNumber(r["Amount"]);
                });

                const labels = Object.keys(categoryAgg).slice(0, 6);
                const values = Object.values(categoryAgg).slice(0, 6);
                const colors = ["#60A5FA", "#10B981", "#F59E0B", "#A78BFA", "#F472B6", "#4ADE80"];

                return (
                  <div className="bg-[#0F1E33] border border-[#1E2D45] rounded-xl p-4 shadow-lg h-[260px] overflow-hidden">
                    <h4 className="text-xs sm:text-sm font-bold text-[#64FFDA] mb-2 sm:mb-3">🎯 Category</h4>
                    <Pie
                      data={{
                        labels,
                        datasets: [{
                          data: values,
                          backgroundColor: colors,
                          borderColor: "#1B2A4A",
                          borderWidth: 2,
                        }],
                      }}
                      options={{
                        responsive: true,
                        maintainAspectRatio: false,
                        plugins: {
                          legend: {
                            position: 'bottom',
                            labels: {
                              color: "#FFFFFF",
                              padding: 6,
                              font: { size: 9 },
                              boxWidth: 12,
                              generateLabels: (chart) => {
                                const data = chart.data;
                                return data.labels.map((label, i) => ({
                                  text: `${label}: ₹${(data.datasets[0].data[i]/1000).toFixed(0)}K`,
                                  fillStyle: data.datasets[0].backgroundColor[i],
                                  hidden: false,
                                  index: i
                                }));
                              }
                            }
                          },
                          tooltip: {
                            backgroundColor: "rgba(0,0,0,0.8)",
                            padding: 8,
                            titleColor: "#64FFDA",
                            bodyColor: "#fff",
                            callbacks: { label: (ctx) => `${ctx.label}: ₹${ctx.raw.toLocaleString("en-IN")}` }
                          }
                        },
                      }}
                    />
                  </div>
                );
              })()}

              {/* Top 5 Products */}
              {(() => {
                const prodAgg = {};
                cleanData.forEach((r) => {
                  const item = r["ItemName"] || "";
                  if (item === 'N/A' || !item) return;
                  prodAgg[item] = (prodAgg[item] || 0) + toNumber(r["Amount"]);
                });

                const sorted = Object.entries(prodAgg).sort((a, b) => b[1] - a[1]).slice(0, 5);
                const labels = sorted.map(([name]) => name);
                const values = sorted.map(([, val]) => val);

                return (
                  <div className="bg-[#0F1E33] border border-[#1E2D45] rounded-xl p-4 shadow-lg h-[260px] overflow-hidden">
                    <h4 className="text-xs sm:text-sm font-bold text-[#64FFDA] mb-2 sm:mb-3">📦 Top Products (Sales)</h4>
                    <Bar
                      data={{
                        labels,
                        datasets: [{
                          data: values,
                          backgroundColor: "rgba(59,130,246,0.8)",
                          borderColor: "#60A5FA",
                          borderWidth: 1,
                          borderRadius: 6,
                          barThickness: 20,
                        }],
                      }}
                      options={{
                        indexAxis: 'y',
                        responsive: true,
                        maintainAspectRatio: false,
                        plugins: {
                          legend: { display: false },
                          tooltip: {
                            backgroundColor: "rgba(0,0,0,0.8)",
                            padding: 8,
                            callbacks: { label: (ctx) => `₹${ctx.raw.toLocaleString("en-IN")}` }
                          }
                        },
                        scales: {
                          x: { ticks: { color: "#9CA3AF", font: { size: 9 }, callback: (val) => `₹${(val/1000).toFixed(0)}K` }, grid: { color: "#1E2A40", drawBorder: false } },
                          y: { ticks: { color: "#E5E7EB", font: { size: 9 } }, grid: { display: false } },
                        },
                      }}
                    />
                  </div>
                );
              })()}

              {/* Top 5 Quantity */}
              {(() => {
                const qtyAgg = {};
                cleanData.forEach((r) => {
                  const item = r["ItemName"] || "";
                  if (item === 'N/A' || !item) return;
                  qtyAgg[item] = (qtyAgg[item] || 0) + toNumber(r["Qty"]);
                });

                const sorted = Object.entries(qtyAgg).sort((a, b) => b[1] - a[1]).slice(0, 5);
                const labels = sorted.map(([name]) => name);
                const values = sorted.map(([, val]) => val);

                return (
                  <div className="bg-[#0F1E33] border border-[#1E2D45] rounded-xl p-4 shadow-lg h-[260px] overflow-hidden">
                    <h4 className="text-xs sm:text-sm font-bold text-[#64FFDA] mb-2 sm:mb-3">📊 Top Products (Qty)</h4>
                    <Bar
                      data={{
                        labels,
                        datasets: [{
                          data: values,
                          backgroundColor: "rgba(16,185,129,0.8)",
                          borderColor: "#10B981",
                          borderWidth: 1,
                          borderRadius: 6,
                          barThickness: 20,
                        }],
                      }}
                      options={{
                        indexAxis: 'y',
                        responsive: true,
                        maintainAspectRatio: false,
                        plugins: {
                          legend: { display: false },
                          tooltip: {
                            backgroundColor: "rgba(0,0,0,0.8)",
                            padding: 8,
                            callbacks: { label: (ctx) => `${ctx.raw.toLocaleString("en-IN")} units` }
                          }
                        },
                        scales: {
                          x: { ticks: { color: "#9CA3AF", font: { size: 9 } }, grid: { color: "#1E2A40", drawBorder: false } },
                          y: { ticks: { color: "#E5E7EB", font: { size: 9 } }, grid: { display: false } },
                        },
                      }}
                    />
                  </div>
                );
              })()}
            </div>
          </>
        )}

        {/* TOP PERFORMERS TAB */}
        {activeTab === "performers" && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            {/* Top Companies */}
            {(() => {
              const companyAgg = {};
              cleanData.forEach((r) => {
                const comp = r["Item Category"] || "Unknown";
                if (comp === 'N/A' || comp === 'Unknown') return;
                companyAgg[comp] = (companyAgg[comp] || 0) + toNumber(r["Amount"]);
              });
              const topCompanies = Object.entries(companyAgg).sort((a, b) => b[1] - a[1]).slice(0, 5);

              return (
                <div className="bg-gradient-to-br from-[#0D1B2A] to-[#112240] rounded-lg p-3 border border-[#1E2D45] shadow-lg">
                  <h4 className="text-[#64FFDA] font-bold text-xs sm:text-sm mb-2">🏢 Companies</h4>
                  {topCompanies.length === 0 && <p className="text-gray-400 text-xs">No data</p>}
                  <ul className="space-y-1.5 text-gray-200 text-[10px] sm:text-xs">
                    {topCompanies.map(([name, val], i) => (
                      <li key={i} className="flex justify-between items-center border-b border-[#1E2D45]/50 pb-1.5">
                        <span className="truncate flex-1">{i + 1}. {name}</span>
                        <span className="text-[#64FFDA] font-bold ml-2">₹{(val/1000).toFixed(0)}K</span>
                      </li>
                    ))}
                  </ul>
                </div>
              );
            })()}

            {/* Top Products */}
            {(() => {
              const prodAgg = {};
              cleanData.forEach((r) => {
                const prod = r["ItemName"] || "Unknown";
                if (prod === 'N/A' || prod === 'Unknown') return;
                prodAgg[prod] = (prodAgg[prod] || 0) + toNumber(r["Amount"]);
              });
              const topProducts = Object.entries(prodAgg).sort((a, b) => b[1] - a[1]).slice(0, 5);

              return (
                <div className="bg-gradient-to-br from-[#0D1B2A] to-[#112240] rounded-lg p-3 border border-[#1E2D45] shadow-lg">
                  <h4 className="text-[#64FFDA] font-bold text-xs sm:text-sm mb-2">📦 Products</h4>
                  {topProducts.length === 0 && <p className="text-gray-400 text-xs">No data</p>}
                  <ul className="space-y-1.5 text-gray-200 text-[10px] sm:text-xs">
                    {topProducts.map(([name, val], i) => (
                      <li key={i} className="flex justify-between items-center border-b border-[#1E2D45]/50 pb-1.5">
                        <span className="truncate flex-1">{i + 1}. {name}</span>
                        <span className="text-[#64FFDA] font-bold ml-2">₹{(val/1000).toFixed(0)}K</span>
                      </li>
                    ))}
                  </ul>
                </div>
              );
            })()}

            {/* Top Party Groups */}
            {(() => {
              const groupAgg = {};
              cleanData.forEach((r) => {
                const grp = r["Party Group"] || "Unknown";
                if (grp === 'N/A' || grp === 'Unknown') return;
                groupAgg[grp] = (groupAgg[grp] || 0) + toNumber(r["Amount"]);
              });
              const topGroups = Object.entries(groupAgg).sort((a, b) => b[1] - a[1]).slice(0, 5);

              return (
                <div className="bg-gradient-to-br from-[#0D1B2A] to-[#112240] rounded-lg p-3 border border-[#1E2D45] shadow-lg">
                  <h4 className="text-[#64FFDA] font-bold text-xs sm:text-sm mb-2">👥 Groups</h4>
                  {topGroups.length === 0 && <p className="text-gray-400 text-xs">No data</p>}
                  <ul className="space-y-1.5 text-gray-200 text-[10px] sm:text-xs">
                    {topGroups.map(([name, val], i) => (
                      <li key={i} className="flex justify-between items-center border-b border-[#1E2D45]/50 pb-1.5">
                        <span className="truncate flex-1">{i + 1}. {name}</span>
                        <span className="text-[#64FFDA] font-bold ml-2">₹{(val/1000).toFixed(0)}K</span>
                      </li>
                    ))}
                  </ul>
                </div>
              );
            })()}

            {/* Top Areas */}
            {(() => {
              const areaAgg = {};
              cleanData.forEach((r) => {
                const city = r["City/Area"] || "Unknown";
                if (city === 'N/A' || city === 'Unknown') return;
                areaAgg[city] = (areaAgg[city] || 0) + toNumber(r["Amount"]);
              });
              const topAreas = Object.entries(areaAgg).sort((a, b) => b[1] - a[1]).slice(0, 5);

              return (
                <div className="bg-gradient-to-br from-[#0D1B2A] to-[#112240] rounded-lg p-3 border border-[#1E2D45] shadow-lg">
                  <h4 className="text-[#64FFDA] font-bold text-xs sm:text-sm mb-2">🌆 Areas</h4>
                  {topAreas.length === 0 && <p className="text-gray-400 text-xs">No data</p>}
                  <ul className="space-y-1.5 text-gray-200 text-[10px] sm:text-xs">
                    {topAreas.map(([name, val], i) => (
                      <li key={i} className="flex justify-between items-center border-b border-[#1E2D45]/50 pb-1.5">
                        <span className="truncate flex-1">{i + 1}. {name}</span>
                        <span className="text-[#64FFDA] font-bold ml-2">₹{(val/1000).toFixed(0)}K</span>
                      </li>
                    ))}
                  </ul>
                </div>
              );
            })()}
          </div>
        )}

        {/* REPORTS TAB */}
        {activeTab === "reports" && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 sm:gap-4 mb-4 sm:mb-6 gap-3 sm:gap-4">
            <ReportCard
              title="Party Wise"
              columns={["Party Name", "Item Category", "Qty", "Amount"]}
              data={aggregateData("Party Name", "Item Category", partyFilter, "")}
              onView={() => openViewModal("Party Wise Sales Report", ["Party Name", "Item Category", "Qty", "Amount", "Count"], aggregateData("Party Name", "Item Category"))}
              onRowClick={(row) => openDetailModal(row, ["Party Name", "Item Category", "Qty", "Amount", "Count"])}
              filter1Value={partyFilter}
              filter1Options={Array.from(new Set(cleanData.map(r => r["Party Name"]).filter(v => v && v !== 'N/A')))}
              onFilter1Change={setPartyFilter}
              filter1Label="Party"
            />
            <ReportCard
              title="Salesman Wise"
              columns={["Salesman", "Item Category", "Qty", "Amount"]}
              data={aggregateData("Party Group", "Item Category", salesmanFilter, "").map(row => ({...row, Salesman: row["Party Group"]}))}
              onView={() => openViewModal("Salesman Wise Sales Report", ["Salesman", "Item Category", "Qty", "Amount", "Count"], aggregateData("Party Group", "Item Category").map(row => ({...row, Salesman: row["Party Group"]})))}
              onRowClick={(row) => openDetailModal(row, ["Salesman", "Item Category", "Qty", "Amount", "Count"])}
              filter1Value={salesmanFilter}
              filter1Options={Array.from(new Set(cleanData.map(r => r["Party Group"]).filter(v => v && v !== 'N/A')))}
              onFilter1Change={setSalesmanFilter}
              filter1Label="Salesman"
            />
            <ReportCard
              title="Area Wise"
              columns={["City/Area", "Item Category", "Qty", "Amount"]}
              data={aggregateData("City/Area", "Item Category", areaFilter, "")}
              onView={() => openViewModal("Area Wise Sales Report", ["City/Area", "Item Category", "Qty", "Amount", "Count"], aggregateData("City/Area", "Item Category"))}
              onRowClick={(row) => openDetailModal(row, ["City/Area", "Item Category", "Qty", "Amount", "Count"])}
              filter1Value={areaFilter}
              filter1Options={Array.from(new Set(cleanData.map(r => r["City/Area"]).filter(v => v && v !== 'N/A')))}
              onFilter1Change={setAreaFilter}
              filter1Label="Area"
            />
            <ReportCard
              title="Product Wise"
              columns={["Product", "Item Group", "Qty", "Amount"]}
              data={aggregateData("ItemName", "Item Group", productFilter, "").map(row => ({...row, Product: row["ItemName"]}))}
              onView={() => openViewModal("Product Wise Sales Report", ["Product", "Item Group", "Qty", "Amount", "Count"], aggregateData("ItemName", "Item Group").map(row => ({...row, Product: row["ItemName"]})))}
              onRowClick={(row) => openDetailModal(row, ["Product", "Item Group", "Qty", "Amount", "Count"])}
              filter1Value={productFilter}
              filter1Options={Array.from(new Set(cleanData.map(r => r["ItemName"]).filter(v => v && v !== 'N/A')))}
              onFilter1Change={setProductFilter}
              filter1Label="Product"
            />
            <ReportCard
              title="Group Wise"
              columns={["Item Group", "Item Category", "Qty", "Amount"]}
              data={aggregateData("Item Group", "Item Category", itemGroupFilter, "")}
              onView={() => openViewModal("Item Group Wise Sales Report", ["Item Group", "Item Category", "Qty", "Amount", "Count"], aggregateData("Item Group", "Item Category"))}
              onRowClick={(row) => openDetailModal(row, ["Item Group", "Item Category", "Qty", "Amount", "Count"])}
              filter1Value={itemGroupFilter}
              filter1Options={Array.from(new Set(cleanData.map(r => r["Item Group"]).filter(v => v && v !== 'N/A')))}
              onFilter1Change={setItemGroupFilter}
              filter1Label="Group"
            />
          </div>
        )}
      </div>

      {/* MODALS */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-start justify-center pt-4 sm:pt-10 px-2">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setModalOpen(false)} />
          <div ref={modalRef} className="relative w-full max-w-6xl bg-[#0D1B2A]/90 backdrop-blur-lg rounded-xl shadow-2xl border border-[#1E2D45] p-3 sm:p-6 z-60 text-gray-100 max-h-[90vh] overflow-hidden flex flex-col">
            <div className="flex justify-between items-center mb-3 sm:mb-4 border-b border-[#1E2D45] pb-2 sm:pb-3">
              <h3 className="text-base sm:text-2xl font-bold text-[#64FFDA]">{modalContent.title}</h3>
              <button onClick={() => setModalOpen(false)} className="bg-red-500 text-white rounded-full w-7 h-7 sm:w-9 sm:h-9 flex items-center justify-center hover:bg-red-600">✕</button>
            </div>

            <div className="flex flex-col md:flex-row gap-3 sm:gap-6 flex-1 overflow-hidden">
              <div id="modal-scroll" className="flex-1 overflow-auto border border-[#1E2D45] rounded-lg p-2 sm:p-4 bg-[#0F1E33]">
                <table className="w-full text-xs sm:text-sm border-collapse">
                  <thead className="bg-[#0B2545] text-[#64FFDA] sticky top-0 z-20">
                    <tr>
                      {modalContent.columns.map((col, i) => (
                        <th key={i} className={`px-2 py-1.5 sm:px-3 sm:py-2 text-[10px] sm:text-xs ${i === modalContent.columns.length - 1 ? 'text-right' : 'text-left'}`}>{col}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {(modalContent.data || []).map((r, i) => (
                      <tr key={i} onClick={() => openDetailModal(r, modalContent.columns)} className={`${i % 2 === 0 ? "bg-[#13253E]" : "bg-[#1A2E4A]"} hover:bg-[#1B3C55] cursor-pointer border-b border-[#1E2D45]/30`}>
                        {modalContent.columns.map((col, j) => (
                          <td key={j} className={`px-2 py-1 sm:px-3 sm:py-2 text-[10px] sm:text-xs ${j === modalContent.columns.length - 1 ? 'text-right text-[#64FFDA]' : ''}`}>
                            {col === "Amount" ? fmt(r[col]) : col === "Qty" ? r[col]?.toLocaleString("en-IN") : r[col] || "-"}
                          </td>
                        ))}
                      </tr>
                    ))}
                    
                    {modalContent.data && modalContent.data.length > 0 && (
                      <tr className="bg-[#0F1E33] font-bold text-yellow-300 border-t-2 border-yellow-400 sticky bottom-0 z-20 shadow-lg">
                        <td className="px-3 py-2 text-xs sm:text-sm" colSpan={modalContent.columns.length - 1}>TOTAL ({modalContent.data.length})</td>
                        <td className="px-3 py-2 text-right text-xs sm:text-base">{fmt(modalContent.data.reduce((sum, r) => sum + toNumber(r.Amount || 0), 0))}</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              <aside className="w-full md:w-[200px] bg-[#102C46] border border-[#1E2D45] rounded-lg p-3 sm:p-4">
                <h4 className="font-semibold text-[#64FFDA] mb-2 text-xs sm:text-sm">⚙️ Export</h4>
                <div className="flex flex-col gap-2">
                  <button onClick={() => exportPDF(modalContent.title)} className="w-full bg-[#059669] text-white py-1.5 sm:py-2 rounded text-xs hover:bg-[#047857]">📄 PDF</button>
                  <button onClick={() => exportExcel(modalContent.title, modalContent.columns, modalContent.data)} className="w-full bg-[#2563EB] text-white py-1.5 sm:py-2 rounded text-xs hover:bg-[#1D4ED8]">📊 Excel</button>
                  <button onClick={() => exportCSV(modalContent.title, modalContent.columns, modalContent.data)} className="w-full bg-[#334155] text-white py-1.5 sm:py-2 rounded text-xs hover:bg-[#1E293B]">📁 CSV</button>
                </div>

                <div className="text-xs text-gray-300 mt-3 border-t border-[#1E2D45] pt-3 space-y-1">
                  <div className="flex justify-between"><strong>Rows:</strong> <span>{modalContent.data ? modalContent.data.length : 0}</span></div>
                  <div className="flex justify-between"><strong>Total:</strong><span className="text-[#64FFDA]">{fmt(modalContent.data ? modalContent.data.reduce((sum, r) => sum + toNumber(r.Amount || 0), 0) : 0)}</span></div>
                </div>
              </aside>
            </div>
          </div>
        </div>
      )}

      {detailModalOpen && selectedRowDetail && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-3 sm:p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setDetailModalOpen(false)} />
          <div className="relative bg-[#0D1B2A] border border-[#64FFDA]/30 rounded-xl p-4 sm:p-6 max-w-2xl w-full shadow-2xl z-[71] max-h-[80vh] overflow-auto">
            <div className="flex justify-between items-center mb-3 sm:mb-4 border-b border-[#1E2D45] pb-2 sm:pb-3 sticky top-0 bg-[#0D1B2A] z-10">
              <h3 className="text-base sm:text-xl font-bold text-[#64FFDA]">📋 Details</h3>
              <button onClick={() => setDetailModalOpen(false)} className="bg-red-500 text-white rounded-full w-7 h-7 sm:w-8 sm:h-8 flex items-center justify-center hover:bg-red-600">✕</button>
            </div>

            <div className="space-y-2 sm:space-y-3">
              {selectedRowDetail.columns.map((col, i) => (
                <div key={i} className="flex justify-between border-b border-[#1E2D45]/50 pb-2">
                  <span className="font-semibold text-gray-300 text-xs sm:text-sm">{col}:</span>
                  <span className="text-[#64FFDA] text-right ml-4 text-xs sm:text-sm">{col === "Amount" ? fmt(selectedRowDetail.row[col]) : selectedRowDetail.row[col] || "-"}</span>
                </div>
              ))}
            </div>

            <button onClick={() => setDetailModalOpen(false)} className="mt-4 sm:mt-6 w-full bg-gradient-to-r from-[#3B82F6] to-[#2563EB] text-white py-2 rounded-lg hover:shadow-lg text-sm">Close</button>
          </div>
        </div>
      )}
    </div>
  );
}

// COMPACT REPORT CARD
function ReportCard({ title, columns, data, onView, onRowClick, filter1Value, filter1Options, onFilter1Change, filter1Label }) {
  const [searchTerm, setSearchTerm] = useState("");
  
  const fmt = (v) => `₹${Number(v || 0).toLocaleString("en-IN", { maximumFractionDigits: 0 })}`;
  const toNumber = (v) => parseFloat(String(v || "").replace(/[^0-9.-]/g, "")) || 0;

  const exportCSV = () => {
    const csv = [columns.join(","), ...filteredData.map((r) => columns.map((c) => (r[c] || "").toString().replace(/,/g, " ")).join(","))].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${title}.csv`;
    a.click();
  };

  const exportExcel = () => {
    const ws = XLSX.utils.json_to_sheet(filteredData.map((row) => {
      const out = {};
      columns.forEach((c) => (out[c] = row[c] || ""));
      return out;
    }));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Report");
    XLSX.writeFile(wb, `${title}.xlsx`);
  };

  const filteredData = useMemo(() => {
    if (!searchTerm) return data;
    return data.filter(row => {
      return columns.some(col => {
        const val = String(row[col] || "").toLowerCase();
        return val.includes(searchTerm.toLowerCase());
      });
    });
  }, [data, searchTerm, columns]);

  const totalAmount = filteredData.reduce((sum, r) => sum + toNumber(r.Amount || 0), 0);
  const totalQty = filteredData.reduce((sum, r) => sum + toNumber(r.Qty || 0), 0);

  return (
    <div className="bg-gradient-to-br from-[#0D1B2A] to-[#112240] rounded-lg p-3 shadow-lg border border-[#1E2D45]">
      <div className="flex justify-between items-center mb-2 border-b border-[#1E2D45] pb-2">
        <h4 className="text-[#64FFDA] font-bold text-xs sm:text-sm">{title}</h4>
        <div className="flex gap-1">
          <button onClick={exportCSV} className="bg-indigo-600 text-white text-[9px] sm:text-[10px] px-1.5 sm:px-2 py-1 rounded hover:bg-indigo-700">CSV</button>
          <button onClick={exportExcel} className="bg-blue-600 text-white text-[9px] sm:text-[10px] px-1.5 sm:px-2 py-1 rounded hover:bg-blue-700">XLS</button>
          <button onClick={onView} className="bg-rose-500 text-white text-[9px] sm:text-[10px] px-1.5 sm:px-2 py-1 rounded hover:bg-rose-600">View</button>
        </div>
      </div>

      {/* COMPACT SEARCH */}
      <div className="mb-2">
        <input
          type="text"
          placeholder="🔍 Search..."
          className="w-full bg-[#112A45] text-gray-200 border border-[#1E2D45] rounded px-2 py-1.5 text-[10px] sm:text-xs focus:outline-none focus:ring-1 focus:ring-[#64FFDA]"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      {/* COMPACT FILTER */}
      <div className="flex gap-1 mb-2">
        <select value={filter1Value} onChange={(e) => onFilter1Change(e.target.value)} className="flex-1 bg-[#112A45] text-gray-200 border border-[#1E2D45] rounded px-1.5 py-1 text-[10px] sm:text-xs focus:outline-none focus:ring-1 focus:ring-[#64FFDA]">
          <option value="">All {filter1Label}</option>
          {filter1Options.map((opt, i) => <option key={i} value={opt}>{opt}</option>)}
        </select>
        {filter1Value && (
          <button onClick={() => onFilter1Change("")} className="bg-red-500 text-white text-[10px] px-2 py-1 rounded hover:bg-red-600">×</button>
        )}
      </div>

      {/* COMPACT TABLE */}
      <div className="overflow-auto max-h-[220px] border border-[#1E2D45] rounded">
        <table className="w-full text-[9px] sm:text-[10px]">
          <thead className="bg-[#0B2545] text-[#64FFDA] sticky top-0 z-10">
            <tr>
              {columns.map((c, i) => (
                <th key={i} className={`px-1.5 sm:px-2 py-1.5 text-left font-semibold ${i === columns.length - 1 ? "text-right" : ""}`}>{c}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filteredData.length === 0 && (
              <tr><td colSpan={columns.length} className="text-center py-3 text-gray-400 text-[10px]">No Data</td></tr>
            )}
            {filteredData.slice(0, 20).map((row, i) => (
              <tr key={i} onClick={() => onRowClick && onRowClick(row)} className={`${i % 2 === 0 ? "bg-[#0F1E33]" : "bg-[#13253E]"} hover:bg-[#1C3F57] cursor-pointer border-b border-[#1E2D45]`}>
                {columns.map((c, j) => (
                  <td key={j} className={`px-1.5 sm:px-2 py-1.5 ${j === columns.length - 1 ? "text-right text-[#64FFDA] font-semibold" : ""}`}>
                    {c === "Amount" ? fmt(row[c]) : c === "Qty" ? row[c]?.toLocaleString("en-IN") : row[c] || "-"}
                  </td>
                ))}
              </tr>
            ))}

            {filteredData.length > 0 && (
              <tr className="bg-[#0F1E33] font-bold text-yellow-300 border-t-2 border-yellow-400 sticky bottom-0 z-20 shadow-lg">
                <td className="px-1.5 sm:px-2 py-1.5 text-[9px] sm:text-[10px]" colSpan={columns.length - 2}>TOTAL</td>
                <td className="px-1.5 sm:px-2 py-1.5 text-right text-[9px] sm:text-[10px]">{totalQty.toLocaleString("en-IN")}</td>
                <td className="px-1.5 sm:px-2 py-1.5 text-right text-[10px] sm:text-xs">{fmt(totalAmount)}</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
