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

  const { user } = useAuth();
  const isLoggedIn = !!user;

  const modalRef = useRef();

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);

        const backendURL =
          window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1"
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

      switch (dateFilter) {
        case "today":
          startDate = new Date(today.setHours(0, 0, 0, 0));
          endDate = new Date(today.setHours(23, 59, 59, 999));
          break;
        case "yesterday":
          const y = new Date();
          y.setDate(y.getDate() - 1);
          startDate = new Date(y.setHours(0, 0, 0, 0));
          endDate = new Date(y.setHours(23, 59, 59, 999));
          break;
        case "this_week":
          const startOfWeek = new Date(today);
          const day = startOfWeek.getDay();
          const diff = startOfWeek.getDate() - day;
          startDate = new Date(startOfWeek.setDate(diff));
          startDate.setHours(0, 0, 0, 0);
          endDate = new Date();
          endDate.setHours(23, 59, 59, 999);
          break;
        case "this_month":
          startDate = new Date(today.getFullYear(), today.getMonth(), 1);
          startDate.setHours(0, 0, 0, 0);
          endDate = new Date();
          endDate.setHours(23, 59, 59, 999);
          break;
        case "last_month":
          startDate = new Date(today.getFullYear(), today.getMonth() - 1, 1);
          startDate.setHours(0, 0, 0, 0);
          endDate = new Date(today.getFullYear(), today.getMonth(), 0);
          endDate.setHours(23, 59, 59, 999);
          break;
        case "this_quarter":
          const q = Math.floor(today.getMonth() / 3);
          startDate = new Date(today.getFullYear(), q * 3, 1);
          startDate.setHours(0, 0, 0, 0);
          endDate = new Date();
          endDate.setHours(23, 59, 59, 999);
          break;
        case "this_year":
          startDate = new Date(today.getFullYear(), 0, 1);
          startDate.setHours(0, 0, 0, 0);
          endDate = new Date();
          endDate.setHours(23, 59, 59, 999);
          break;
        case "last_year":
          startDate = new Date(today.getFullYear() - 1, 0, 1);
          startDate.setHours(0, 0, 0, 0);
          endDate = new Date(today.getFullYear() - 1, 11, 31);
          endDate.setHours(23, 59, 59, 999);
          break;
        case "custom":
          if (customDateRange.start) {
            startDate = new Date(customDateRange.start);
            startDate.setHours(0, 0, 0, 0);
          }
          if (customDateRange.end) {
            endDate = new Date(customDateRange.end);
            endDate.setHours(23, 59, 59, 999);
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
  const toNumber = (v) =>
    parseFloat(String(v || "").replace(/[^0-9.-]/g, "")) || 0;

  const fmt = (v) =>
    `₹${Number(v || 0).toLocaleString("en-IN", {
      maximumFractionDigits: 0,
    })}`;

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
      )
        return true;
      if (checkValues.every((v) => v === "")) return true;
      return false;
    } catch {
      return false;
    }
  };

  const cleanData = useMemo(() => {
    let filtered = excelData.filter((r) => !isTotalRow(r));
    if (filterCategory) {
      filtered = filtered.filter((r) => r["Item Category"] === filterCategory);
    }
    if (filterPartyGroup) {
      filtered = filtered.filter((r) => r["Party Group"] === filterPartyGroup);
    }
    return filtered;
  }, [excelData, filterCategory, filterPartyGroup]);

  const colValue = (r, col) => {
    if (!r) return "";
    const val = r[col];
    if (
      val !== undefined &&
      val !== null &&
      String(val).trim() !== "" &&
      String(val).trim() !== "N/A"
    ) {
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
        combined[key] = {
          [col1]: c1,
          [col2]: c2,
          Amount: 0,
          Qty: 0,
          Count: 0,
        };
      }
      combined[key].Amount += amt;
      combined[key].Qty += qty;
      combined[key].Count += 1;
    });

    const finalData = Object.values(combined);
    return finalData.sort((a, b) => b.Amount - a.Amount);
  };

  const totalSales = useMemo(
    () =>
      cleanData.reduce(
        (s, r) => s + toNumber(r["Amount"] || 0),
        0
      ),
    [cleanData]
  );

  const uniqueVoucherNumbers = useMemo(() => {
    return new Set(
      cleanData
        .map((r) => r["Voucher Number"])
        .filter((v) => v && v !== "N/A")
    ).size;
  }, [cleanData]);

  const totalProducts = useMemo(() => {
    return new Set(
      cleanData
        .map((r) => r["ItemName"])
        .filter((v) => v && v !== "N/A")
    ).size;
  }, [cleanData]);

  if (!isLoggedIn) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0A192F]">
        <p className="text-white">Please Login</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0A192F]">
        <div className="text-center text-[#64FFDA] text-xl">
          Loading Dashboard...
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0A1628] text-gray-100 p-3 sm:p-4 md:p-6">
      <div className="max-w-[1400px] mx-auto bg-[#132034] rounded-xl border border-[#1E2D45] shadow-lg p-4 space-y-6">

        <h2 className="text-xl sm:text-2xl font-bold text-[#64FFDA] mb-2">
          📊 DASHBOARD
        </h2>

        {/* -------- FILTER BAR | COMPACT | SMALL HEIGHT -------- */}
        <div className="bg-[#0F1B2D] border border-[#1E2D45] rounded-xl p-3 space-y-2">
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex flex-col text-xs">
              <span className="text-gray-300 mb-1">Date</span>
              <select
                value={dateFilter}
                onChange={(e) => setDateFilter(e.target.value)}
                className="bg-[#112A45] text-gray-200 border border-[#1E2D45] rounded px-2 py-1 text-xs"
              >
                <option value="all">All</option>
                <option value="today">Today</option>
                <option value="yesterday">Yesterday</option>
                <option value="this_week">This Week</option>
                <option value="this_month">This Month</option>
                <option value="last_month">Last Month</option>
                <option value="this_quarter">This Quarter</option>
                <option value="this_year">This Year</option>
                <option value="last_year">Last Year</option>
                <option value="custom">Custom</option>
              </select>
            </div>

            {dateFilter === "custom" && (
              <>
                <input
                  type="date"
                  className="bg-[#112A45] text-gray-200 border border-[#1E2D45] rounded px-2 py-1 text-xs"
                  value={customDateRange.start}
                  onChange={(e) =>
                    setCustomDateRange({
                      ...customDateRange,
                      start: e.target.value,
                    })
                  }
                />

                <input
                  type="date"
                  className="bg-[#112A45] text-gray-200 border border-[#1E2D45] rounded px-2 py-1 text-xs"
                  value={customDateRange.end}
                  onChange={(e) =>
                    setCustomDateRange({
                      ...customDateRange,
                      end: e.target.value,
                    })
                  }
                />
              </>
            )}

            {/* Category */}
            <div className="flex flex-col text-xs">
              <span className="text-gray-300 mb-1">Category</span>
              <select
                value={filterCategory}
                onChange={(e) => setFilterCategory(e.target.value)}
                className="bg-[#112A45] text-gray-200 border border-[#1E2D45] rounded px-2 py-1 text-xs"
              >
                <option value="">All</option>
                {Array.from(
                  new Set(
                    allData
                      .map((r) => r["Item Category"])
                      .filter((v) => v && v !== "N/A")
                  )
                ).map((cat, i) => (
                  <option key={i} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>

            {/* Party Group */}
            <div className="flex flex-col text-xs">
              <span className="text-gray-300 mb-1">Group</span>
              <select
                value={filterPartyGroup}
                onChange={(e) => setFilterPartyGroup(e.target.value)}
                className="bg-[#112A45] text-gray-200 border border-[#1E2D45] rounded px-2 py-1 text-xs"
              >
                <option value="">All</option>
                {Array.from(
                  new Set(
                    allData
                      .map((r) => r["Party Group"])
                      .filter((v) => v && v !== "N/A")
                  )
                ).map((grp, i) => (
                  <option key={i} value={grp}>
                    {grp}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* -------- TAB MENU -------- */}
        <div className="flex gap-4 border-b border-[#1E2D45] pb-2 overflow-x-auto">
          <button
            onClick={() => setActiveTab("overview")}
            className={`px-4 py-2 text-sm font-semibold ${
              activeTab === "overview"
                ? "text-[#64FFDA] border-b-2 border-[#64FFDA]"
                : "text-gray-400"
            }`}
          >
            Overview
          </button>

          <button
            onClick={() => setActiveTab("performers")}
            className={`px-4 py-2 text-sm font-semibold ${
              activeTab === "performers"
                ? "text-[#64FFDA] border-b-2 border-[#64FFDA]"
                : "text-gray-400"
            }`}
          >
            Top
          </button>

          <button
            onClick={() => setActiveTab("reports")}
            className={`px-4 py-2 text-sm font-semibold ${
              activeTab === "reports"
                ? "text-[#64FFDA] border-b-2 border-[#64FFDA]"
                : "text-gray-400"
            }`}
          >
            Reports
          </button>
        </div>

        {/* -------- OVERVIEW TAB -------- */}
        {activeTab === "overview" && (
          <>
            {/* SMALL, PROFESSIONAL CARDS */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div className="bg-[#0F1B2D] rounded-lg p-3 border border-[#26364D] shadow">
                <p className="text-[11px] text-gray-300">Total Sales</p>
                <h3 className="text-lg font-bold mt-1">{fmt(totalSales)}</h3>
                <p className="text-[10px] text-gray-400">
                  {cleanData.length} trans
                </p>
              </div>

              <div className="bg-[#0F1B2D] rounded-lg p-3 border border-[#26364D] shadow">
                <p className="text-[11px] text-gray-300">Parties</p>
                <h3 className="text-lg font-bold mt-1">
                  {
                    new Set(
                      cleanData
                        .map((r) => r["Party Name"])
                        .filter((v) => v && v !== "N/A")
                    ).size
                  }
                </h3>
                <p className="text-[10px] text-gray-400">Customers</p>
              </div>

              <div className="bg-[#0F1B2D] rounded-lg p-3 border border-[#26364D] shadow">
                <p className="text-[11px] text-gray-300">Vouchers</p>
                <h3 className="text-lg font-bold mt-1">
                  {uniqueVoucherNumbers}
                </h3>
                <p className="text-[10px] text-gray-400">Bills</p>
              </div>

              <div className="bg-[#0F1B2D] rounded-lg p-3 border border-[#26364D] shadow">
                <p className="text-[11px] text-gray-300">Products</p>
                <h3 className="text-lg font-bold mt-1">{totalProducts}</h3>
                <p className="text-[10px] text-gray-400">Items</p>
              </div>
            </div>

            {/* ---------- SALES TREND (SMALL CHART) ---------- */}
            <div className="bg-[#0F1B2D] rounded-lg p-3 border border-[#26364D] shadow">
              <h3 className="text-sm font-semibold text-[#64FFDA] mb-2">
                Sales Trend
              </h3>

              <div className="h-[220px] sm:h-[260px]">
                <Line
                  data={{
                    labels: cleanData.slice(0, 12).map((r) => r.Date),
                    datasets: [
                      {
                        label: "Sales",
                        data: cleanData.slice(0, 12).map((r) =>
                          toNumber(r.Amount)
                        ),
                        borderColor: "#64FFDA",
                        backgroundColor: "rgba(100,255,218,0.15)",
                      },
                    ],
                  }}
                  options={{
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                      legend: { display: false },
                    },
                    scales: {
                      x: {
                        ticks: { color: "#9db2cc", font: { size: 10 } },
                      },
                      y: {
                        ticks: { color: "#9db2cc", font: { size: 10 } },
                        grid: { color: "rgba(255,255,255,0.05)" },
                      },
                    },
                  }}
                />
              </div>
            </div>

            {/* ---------- CATEGORY WISE SALES (SMALL BAR CHART) ---------- */}
            <div className="bg-[#0F1B2D] rounded-lg p-3 border border-[#26364D] shadow">
              <h3 className="text-sm font-semibold text-[#64FFDA] mb-2">
                Category Sales
              </h3>

              <div className="h-[220px] sm:h-[260px]">
                <Bar
                  data={{
                    labels: Array.from(
                      new Set(cleanData.map((r) => r["Item Category"]))
                    ),
                    datasets: [
                      {
                        label: "Amount",
                        data: Array.from(
                          new Set(cleanData.map((r) => r["Item Category"]))
                        ).map((cat) =>
                          cleanData
                            .filter((r) => r["Item Category"] === cat)
                            .reduce(
                              (sum, x) => sum + toNumber(x.Amount),
                              0
                            )
                        ),
                        backgroundColor: "rgba(100,255,218,0.4)",
                        borderColor: "#64FFDA",
                        borderWidth: 1,
                        barThickness: 20,
                      },
                    ],
                  }}
                  options={{
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                      legend: { display: false },
                    },
                    scales: {
                      x: {
                        ticks: { color: "#9db2cc", font: { size: 10 } },
                      },
                      y: {
                        ticks: { color: "#9db2cc", font: { size: 10 } },
                        grid: { color: "rgba(255,255,255,0.05)" },
                      },
                    },
                  }}
                />
              </div>
            </div>

            {/* ---------- COMPANY WISE SALES PIE ---------- */}
            <div className="bg-[#0F1B2D] rounded-lg p-3 border border-[#26364D] shadow">
              <h3 className="text-sm font-semibold text-[#64FFDA] mb-2">
                Company Sales
              </h3>

              <div className="h-[220px] sm:h-[260px] flex items-center justify-center">
                <Pie
                  data={{
                    labels: Array.from(
                      new Set(cleanData.map((r) => r["Item Group"]))
                    ),
                    datasets: [
                      {
                        data: Array.from(
                          new Set(cleanData.map((r) => r["Item Group"]))
                        ).map((grp) =>
                          cleanData
                            .filter((r) => r["Item Group"] === grp)
                            .reduce(
                              (sum, x) => sum + toNumber(x.Amount),
                              0
                            )
                        ),
                        backgroundColor: [
                          "rgba(100,255,218,0.4)",
                          "rgba(100,150,255,0.4)",
                          "rgba(255,200,100,0.4)",
                          "rgba(255,100,150,0.4)",
                          "rgba(200,255,100,0.4)",
                        ],
                        borderColor: "#64FFDA",
                      },
                    ],
                  }}
                  options={{
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: { legend: { position: "bottom" } },
                  }}
                />
              </div>
            </div>
          </>
        )}

        {/* =====================================================
                     TOP PERFORMERS TAB
        ===================================================== */}
        {activeTab === "performers" && (
          <div className="space-y-4">
            {/* ------------ TOP CUSTOMERS ---------------- */}
            <div className="bg-[#0F1B2D] rounded-lg p-3 border border-[#26364D] shadow">
              <h3 className="text-sm font-semibold text-[#64FFDA] mb-2">
                Top Customers
              </h3>

              <table className="w-full text-xs">
                <thead className="bg-[#13283F] text-[#64FFDA] sticky top-0 z-10">
                  <tr>
                    <th className="px-3 py-2 text-left">Customer</th>
                    <th className="px-3 py-2 text-right">Amount</th>
                  </tr>
                </thead>

                <tbody>
                  {aggregateData("Party Name", "ItemName")
                    .slice(0, 8)
                    .map((row, idx) => (
                      <tr
                        key={idx}
                        className="border-b border-[#1E2D45] hover:bg-[#12263C]"
                      >
                        <td className="px-3 py-2">{row["Party Name"]}</td>
                        <td className="px-3 py-2 text-right">
                          {fmt(row.Amount)}
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>

            {/* ------------ TOP PRODUCTS ---------------- */}
            <div className="bg-[#0F1B2D] rounded-lg p-3 border border-[#26364D] shadow">
              <h3 className="text-sm font-semibold text-[#64FFDA] mb-2">
                Top Products
              </h3>

              <table className="w-full text-xs">
                <thead className="bg-[#13283F] text-[#64FFDA] sticky top-0 z-10">
                  <tr>
                    <th className="px-3 py-2 text-left">Product</th>
                    <th className="px-3 py-2 text-right">Amount</th>
                  </tr>
                </thead>

                <tbody>
                  {aggregateData("ItemName", "Party Name")
                    .slice(0, 10)
                    .map((row, idx) => (
                      <tr
                        key={idx}
                        className="border-b border-[#1E2D45] hover:bg-[#12263C]"
                      >
                        <td className="px-3 py-2">{row["ItemName"]}</td>
                        <td className="px-3 py-2 text-right">
                          {fmt(row.Amount)}
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* =====================================================
                        REPORTS TAB
        ===================================================== */}
        {activeTab === "reports" && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <ReportCard
              title="Party Wise"
              columns={["Party Name", "Item Category", "Qty", "Amount"]}
              data={aggregateData("Party Name", "Item Category", partyFilter, "")}
              onView={() =>
                openViewModal(
                  "Party Wise Sales Report",
                  ["Party Name", "Item Category", "Qty", "Amount", "Count"],
                  aggregateData("Party Name", "Item Category")
                )
              }
              onRowClick={(row) =>
                openDetailModal(row, [
                  "Party Name",
                  "Item Category",
                  "Qty",
                  "Amount",
                  "Count",
                ])
              }
              filter1Value={partyFilter}
              filter1Options={Array.from(
                new Set(
                  cleanData
                    .map((r) => r["Party Name"])
                    .filter((v) => v && v !== "N/A")
                )
              )}
              onFilter1Change={setPartyFilter}
              filter1Label="Party"
            />

            <ReportCard
              title="Salesman Wise"
              columns={["Salesman", "Item Category", "Qty", "Amount"]}
              data={aggregateData(
                "Party Group",
                "Item Category",
                salesmanFilter,
                ""
              ).map((row) => ({ ...row, Salesman: row["Party Group"] }))}
              onView={() =>
                openViewModal(
                  "Salesman Wise Sales Report",
                  ["Salesman", "Item Category", "Qty", "Amount", "Count"],
                  aggregateData("Party Group", "Item Category").map((row) => ({
                    ...row,
                    Salesman: row["Party Group"],
                  }))
                )
              }
              onRowClick={(row) =>
                openDetailModal(row, [
                  "Salesman",
                  "Item Category",
                  "Qty",
                  "Amount",
                  "Count",
                ])
              }
              filter1Value={salesmanFilter}
              filter1Options={Array.from(
                new Set(
                  cleanData
                    .map((r) => r["Party Group"])
                    .filter((v) => v && v !== "N/A")
                )
              )}
              onFilter1Change={setSalesmanFilter}
              filter1Label="Salesman"
            />

            <ReportCard
              title="Area Wise"
              columns={["City/Area", "Item Category", "Qty", "Amount"]}
              data={aggregateData("City/Area", "Item Category", areaFilter, "")}
              onView={() =>
                openViewModal(
                  "Area Wise Sales Report",
                  ["City/Area", "Item Category", "Qty", "Amount", "Count"],
                  aggregateData("City/Area", "Item Category")
                )
              }
              onRowClick={(row) =>
                openDetailModal(row, [
                  "City/Area",
                  "Item Category",
                  "Qty",
                  "Amount",
                  "Count",
                ])
              }
              filter1Value={areaFilter}
              filter1Options={Array.from(
                new Set(
                  cleanData
                    .map((r) => r["City/Area"])
                    .filter((v) => v && v !== "N/A")
                )
              )}
              onFilter1Change={setAreaFilter}
              filter1Label="Area"
            />

            <ReportCard
              title="Product Wise"
              columns={["Product", "Item Group", "Qty", "Amount"]}
              data={aggregateData(
                "ItemName",
                "Item Group",
                productFilter,
                ""
              ).map((row) => ({ ...row, Product: row["ItemName"] }))}
              onView={() =>
                openViewModal(
                  "Product Wise Sales Report",
                  ["Product", "Item Group", "Qty", "Amount", "Count"],
                  aggregateData("ItemName", "Item Group").map((row) => ({
                    ...row,
                    Product: row["ItemName"],
                  }))
                )
              }
              onRowClick={(row) =>
                openDetailModal(row, [
                  "Product",
                  "Item Group",
                  "Qty",
                  "Amount",
                  "Count",
                ])
              }
              filter1Value={productFilter}
              filter1Options={Array.from(
                new Set(
                  cleanData
                    .map((r) => r["ItemName"])
                    .filter((v) => v && v !== "N/A")
                )
              )}
              onFilter1Change={setProductFilter}
              filter1Label="Product"
            />

            <ReportCard
              title="Group Wise"
              columns={["Item Group", "Item Category", "Qty", "Amount"]}
              data={aggregateData(
                "Item Group",
                "Item Category",
                itemGroupFilter,
                ""
              )}
              onView={() =>
                openViewModal(
                  "Item Group Wise Sales Report",
                  ["Item Group", "Item Category", "Qty", "Amount", "Count"],
                  aggregateData("Item Group", "Item Category")
                )
              }
              onRowClick={(row) =>
                openDetailModal(row, [
                  "Item Group",
                  "Item Category",
                  "Qty",
                  "Amount",
                  "Count",
                ])
              }
              filter1Value={itemGroupFilter}
              filter1Options={Array.from(
                new Set(
                  cleanData
                    .map((r) => r["Item Group"])
                    .filter((v) => v && v !== "N/A")
                )
              )}
              onFilter1Change={setItemGroupFilter}
              filter1Label="Group"
            />
          </div>
        )}
      </div>

      {/* =====================================================
                     MODAL FOR FULL TABLE VIEW
      ===================================================== */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-start justify-center pt-10 px-3">
          <div
            className="absolute inset-0 bg-black/60"
            onClick={() => setModalOpen(false)}
          />

          <div
            ref={modalRef}
            className="relative w-full max-w-6xl bg-[#0D1B2A] rounded-xl border border-[#1E2D45] shadow-2xl p-4 max-h-[85vh] overflow-hidden"
          >
            <div className="flex justify-between items-center mb-3 border-b border-[#1E2D45] pb-2">
              <h2 className="text-lg font-bold text-[#64FFDA]">
                {modalContent.title}
              </h2>

              <button
                onClick={() => setModalOpen(false)}
                className="bg-red-500 text-white rounded-full px-3 py-1"
              >
                ✕
              </button>
            </div>

            <div className="flex gap-4 h-full overflow-hidden">
              {/* TABLE */}
              <div
                id="modal-scroll"
                className="flex-1 overflow-auto bg-[#0F1B2D] border border-[#22334A] rounded-lg p-2"
              >
                <table className="w-full text-xs">
                  <thead className="bg-[#13283F] sticky top-0 text-[#64FFDA]">
                    <tr>
                      {modalContent.columns.map((col, idx) => (
                        <th
                          key={idx}
                          className={`px-2 py-2 ${
                            idx === modalContent.columns.length - 1
                              ? "text-right"
                              : "text-left"
                          }`}
                        >
                          {col}
                        </th>
                      ))}
                    </tr>
                  </thead>

                  <tbody>
                    {modalContent.data.map((row, rIdx) => (
                      <tr
                        key={rIdx}
                        className="border-b border-[#1E2D45] hover:bg-[#12263C] cursor-pointer"
                        onClick={() =>
                          openDetailModal(row, modalContent.columns)
                        }
                      >
                        {modalContent.columns.map((col, cIdx) => (
                          <td
                            key={cIdx}
                            className={`px-2 py-2 ${
                              cIdx === modalContent.columns.length - 1
                                ? "text-right text-[#64FFDA]"
                                : ""
                            }`}
                          >
                            {col === "Amount"
                              ? fmt(row[col])
                              : col === "Qty"
                              ? row[col]?.toLocaleString("en-IN")
                              : row[col] || "-"}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* EXPORT PANEL */}
              <div className="w-48 bg-[#10263C] border border-[#1E2D45] rounded-lg p-3 flex-shrink-0">
                <h3 className="text-sm font-semibold text-[#64FFDA] mb-3">
                  Export
                </h3>

                <button
                  onClick={() => exportPDF(modalContent.title)}
                  className="w-full bg-green-600 text-white rounded py-1.5 text-xs mb-2"
                >
                  PDF
                </button>

                <button
                  onClick={() =>
                    exportExcel(
                      modalContent.title,
                      modalContent.columns,
                      modalContent.data
                    )
                  }
                  className="w-full bg-blue-600 text-white rounded py-1.5 text-xs mb-2"
                >
                  Excel
                </button>

                <button
                  onClick={() =>
                    exportCSV(
                      modalContent.title,
                      modalContent.columns,
                      modalContent.data
                    )
                  }
                  className="w-full bg-gray-600 text-white rounded py-1.5 text-xs mb-4"
                >
                  CSV
                </button>

                <div className="text-xs text-gray-300 space-y-1 border-t border-[#1E2D45] pt-2">
                  <div className="flex justify-between">
                    <span>Rows:</span>
                    <span>{modalContent.data.length}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Total:</span>
                    <span className="text-[#64FFDA]">
                      {fmt(
                        modalContent.data.reduce(
                          (s, r) => s + toNumber(r.Amount || 0),
                          0
                        )
                      )}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* =====================================================
                     DETAIL MODAL (ROW DETAILS)
      ===================================================== */}
      {detailModalOpen && selectedRowDetail && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/60"
            onClick={() => setDetailModalOpen(false)}
          />

          <div className="relative bg-[#0D1B2A] border border-[#1E2D45] rounded-xl p-5 max-w-xl w-full shadow-2xl max-h-[80vh] overflow-auto">
            <h2 className="text-lg font-bold text-[#64FFDA] mb-4">
              Row Details
            </h2>

            <div className="space-y-2">
              {selectedRowDetail.columns.map((col, idx) => (
                <div
                  key={idx}
                  className="flex justify-between border-b border-[#1E2D45] pb-1"
                >
                  <span className="text-gray-300">{col}</span>
                  <span className="text-[#64FFDA] ml-2 text-right">
                    {col === "Amount"
                      ? fmt(selectedRowDetail.row[col])
                      : selectedRowDetail.row[col] || "-"}
                  </span>
                </div>
              ))}
            </div>

            <button
              onClick={() => setDetailModalOpen(false)}
              className="w-full bg-blue-600 text-white mt-4 py-2 rounded"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}


