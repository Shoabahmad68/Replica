// src/pages/CompanyHierarchy.jsx
import React, { useEffect, useState, useMemo } from "react";
import { Pie, Bar, Doughnut, Line } from "react-chartjs-2";
import { ChevronDown, User, MapPin, XCircle } from "lucide-react";

import {
  Chart as ChartJS,
  ArcElement,
  Tooltip,
  Legend,
  CategoryScale,
  LinearScale,
  BarElement,
  PointElement,
  LineElement,
  Title,
} from "chart.js";

ChartJS.register(
  ArcElement,
  Tooltip,
  Legend,
  CategoryScale,
  LinearScale,
  BarElement,
  PointElement,
  LineElement,
  Title
);

export default function CompanyHierarchy() {
  const [rawData, setRawData] = useState([]);
  const [excelData, setExcelData] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [dateRange, setDateRange] = useState("This Month");
  const [customStart, setCustomStart] = useState("");
  const [customEnd, setCustomEnd] = useState("");
  const [salesmanFilter, setSalesmanFilter] = useState("");

  // Popup state (city line click)
  const [popupOpen, setPopupOpen] = useState(false);
  const [popupRecords, setPopupRecords] = useState([]);
  const [popupTitle, setPopupTitle] = useState("");

  const [compareOpen, setCompareOpen] = useState(false); // सिर्फ button के लिए रखा है

  // Helpers
  const clean = (v) => {
    if (!v) return "";
    v = String(v).trim();
    if (["", "na", "n/a", "undefined"].includes(v.toLowerCase())) return "";
    return v;
  };

  const checkDate = (dateStr) => {
    if (!dateStr) return false;
    const d = new Date(dateStr);
    if (isNaN(d)) return false;

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (dateRange === "All") return true;

    if (dateRange === "Today") {
      return d.toDateString() === today.toDateString();
    }

    if (dateRange === "Yesterday") {
      const y = new Date(today);
      y.setDate(today.getDate() - 1);
      return d.toDateString() === y.toDateString();
    }

    if (dateRange === "This Week") {
      const firstDay = new Date(today);
      const day = today.getDay() || 7;
      if (day !== 1) firstDay.setHours(-24 * (day - 1));
      return d >= firstDay;
    }

    if (dateRange === "This Month") {
      return (
        d.getMonth() === today.getMonth() &&
        d.getFullYear() === today.getFullYear()
      );
    }

    if (dateRange === "Last Month") {
      const lastMonth = new Date(today);
      lastMonth.setMonth(today.getMonth() - 1);
      return (
        d.getMonth() === lastMonth.getMonth() &&
        d.getFullYear() === lastMonth.getFullYear()
      );
    }

    if (dateRange === "This Quarter") {
      const currentQuarter = Math.floor((today.getMonth() + 3) / 3);
      const dateQuarter = Math.floor((d.getMonth() + 3) / 3);
      return currentQuarter === dateQuarter && d.getFullYear() === today.getFullYear();
    }

    if (dateRange === "This Year") {
      return d.getFullYear() === today.getFullYear();
    }

    if (dateRange === "Last Year") {
      return d.getFullYear() === today.getFullYear() - 1;
    }

    if (dateRange === "Custom") {
      if (!customStart || !customEnd) return true;
      const start = new Date(customStart);
      const end = new Date(customEnd);
      end.setHours(23, 59, 59, 999);
      return d >= start && d <= end;
    }

    return true;
  };

  // FETCH DATA ONCE
  // FETCH DATA ONCE — NO LOCALSTORAGE 🚫
useEffect(() => {
  const load = async () => {
    setLoading(true);

    try {
      const backendURL = window.location.hostname.includes("localhost")
        ? "http://127.0.0.1:8787"
        : "https://selt-t-backend.selt-3232.workers.dev";

      const res = await fetch(`${backendURL}/api/vouchers?limit=50000`);
      const json = await res.json();

      if (json.success && Array.isArray(json.data)) {
        
        const rows = json.data
          .filter((r) => r && !String(r.party_name || "").toLowerCase().includes("total"))
          .map((v) => ({
            Date: clean(v.date),
            Party: clean(v.party_name),
            Salesman: clean(v.party_group || v.salesman),
            Item: clean(v.name_item || v.item_name),
            Category: clean(v.item_category),
            Group: clean(v.item_group),
            City: clean(v.city_area),
            Qty: Number(v.qty) || 0,
            Amount: Number(v.amount) || 0,
          }))
          .filter((r) => r.Amount !== 0);

        setRawData(rows);   // ---> final storage (RAM)

      } else {
        setRawData([]);     // fallback empty
      }

    } catch (err) {
      console.error("Hierarchy fetch error:", err);
      setRawData([]);       // fallback empty
    }

    setLoading(false);
  };

  load();
}, []);

  // APPLY FILTERS (date + salesman)
  useEffect(() => {
    let rows = [...rawData];

    rows = rows.filter((r) => checkDate(r.Date));

    if (salesmanFilter) {
      rows = rows.filter((r) => r.Salesman === salesmanFilter);
    }

    setExcelData(rows);
  }, [rawData, dateRange, customStart, customEnd, salesmanFilter]);

  // UNIQUE SALESMEN FOR DROPDOWN
  const salesmanOptions = useMemo(
    () =>
      Array.from(
        new Set(
          rawData
            .map((r) => r.Salesman)
            .filter((v) => v && v !== "N/A")
        )
      ).sort(),
    [rawData]
  );

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0A192F] flex justify-center items-center text-[#64FFDA] animate-pulse">
        Loading Hierarchy Data...
      </div>
    );
  }

  // ============= AGGREGATIONS =============
  const totals = {
    salesman: {},
    city: {},
    category: {},
  };
  let netTotal = 0;

  excelData.forEach((row) => {
    const s = row.Salesman || "Unknown";
    const c = row.City || "Unknown";
    const cat = row.Category || "Unknown";

    totals.salesman[s] = (totals.salesman[s] || 0) + row.Amount;
    totals.city[c] = (totals.city[c] || 0) + row.Amount;
    totals.category[cat] = (totals.category[cat] || 0) + row.Amount;

    netTotal += row.Amount;
  });

  const topSalesmen = Object.entries(totals.salesman)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);

  const topCities = Object.entries(totals.city)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);

  const chartColors = [
    "#64FFDA",
    "#3B82F6",
    "#F59E0B",
    "#EF4444",
    "#8B5CF6",
    "#22D3EE",
    "#10B981",
  ];

  const makeChart = (src) => {
    const labels = [];
    const data = [];
    Object.entries(src).forEach(([k, v]) => {
      if (v > 0) {
        labels.push(k);
        data.push(v);
      }
    });

    return {
      labels,
      datasets: [
        {
          label: "Net Sales (₹)",
          data,
          backgroundColor: chartColors,
          borderColor: chartColors,
        },
      ],
    };
  };

  if (!excelData || excelData.length === 0) {
  return (
    <div className="text-center text-gray-300 mt-10">No Data Found</div>
  );
}

  // HIERARCHY MAP (Category -> Salesman -> City)
  const hierarchy = useMemo(() => {
  if (!excelData || !Array.isArray(excelData)) return {};   // ← crash block
  const acc = {};
  excelData.forEach((row) => {
      const category = row.Category || "Other";
      const salesman = row.Salesman || "Unknown";
      const city = row.City || "Unknown";

      if (!acc[category]) acc[category] = {};
      if (!acc[category][salesman])
        acc[category][salesman] = { total: 0, qty: 0, cities: {} };
      if (!acc[category][salesman].cities[city])
        acc[category][salesman].cities[city] = { total: 0, qty: 0 };

      acc[category][salesman].total += row.Amount;
      acc[category][salesman].qty += row.Qty;
      acc[category][salesman].cities[city].total += row.Amount;
      acc[category][salesman].cities[city].qty += row.Qty;
    });
    return acc;
  }, [excelData]);

  // City click -> popup
  const openCityPopup = (category, salesman, city) => {
    const recs = excelData.filter(
      (r) =>
        (r.Category || "Other") === category &&
        (r.Salesman || "Unknown") === salesman &&
        (r.City || "Unknown") === city
    );
    setPopupRecords(recs);
    setPopupTitle(`${category} → ${salesman} → ${city}`);
    setPopupOpen(true);
  };

  return (
    <div className="p-6 min-h-screen bg-gradient-to-br from-[#0A192F] via-[#112240] to-[#0A192F] text-gray-100 animate-fadeIn">
      <div className="max-w-7xl mx-auto bg-[#1B2A4A] rounded-2xl shadow-2xl border border-[#223355] p-6">

        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
          <h2 className="text-2xl font-bold text-[#64FFDA] flex items-center gap-2 tracking-wide">
            🏢 Company Hierarchy & Pivot Summary
          </h2>

          {/* Filters row */}
          <div className="flex flex-wrap gap-2 items-center">
            {/* Date filter */}
            <select
              className="bg-[#0D1B34] border border-[#1E2D50] text-xs text-gray-200 rounded-lg px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-[#64FFDA]"
              value={dateRange}
              onChange={(e) => setDateRange(e.target.value)}
            >
              <option>Today</option>
              <option>Yesterday</option>
              <option>This Week</option>
              <option>This Month</option>
              <option>Last Month</option>
              <option>This Quarter</option>
              <option>This Year</option>
              <option>Last Year</option>
              <option>All</option>
              <option>Custom</option>
            </select>

            {dateRange === "Custom" && (
              <>
                <input
                  type="date"
                  className="bg-[#0D1B34] border border-[#1E2D50] text-xs text-gray-200 rounded px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-[#64FFDA]"
                  value={customStart}
                  onChange={(e) => setCustomStart(e.target.value)}
                />
                <input
                  type="date"
                  className="bg-[#0D1B34] border border-[#1E2D50] text-xs text-gray-200 rounded px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-[#64FFDA]"
                  value={customEnd}
                  onChange={(e) => setCustomEnd(e.target.value)}
                />
              </>
            )}

            {/* Salesman filter (Party Group) */}
            <select
              className="bg-[#0D1B34] border border-[#1E2D50] text-xs text-gray-200 rounded-lg px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-[#64FFDA]"
              value={salesmanFilter}
              onChange={(e) => setSalesmanFilter(e.target.value)}
            >
              <option value="">All Salesmen</option>
              {salesmanOptions.map((s) => (
                <option key={s}>{s}</option>
              ))}
            </select>

            {salesmanFilter && (
              <button
                onClick={() => setSalesmanFilter("")}
                className="text-xs px-2 py-1 bg-red-500 rounded text-white"
              >
                Clear
              </button>
            )}

            <button
              onClick={() => setCompareOpen(true)}
              className="ml-auto px-4 py-1.5 bg-[#64FFDA]/10 border border-[#64FFDA]/40 text-[#64FFDA] text-xs font-semibold rounded-lg shadow hover:bg-[#64FFDA]/20 transition-all"
            >
              🔁 Compare Mode
            </button>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-4 mb-6">
          {/* Top Salesmen */}
          <div className="bg-[#112240] rounded-xl p-4 shadow-lg border border-[#223355]">
            <h3 className="text-[#64FFDA] font-semibold mb-2 text-sm uppercase">
              🧑‍💼 Top Salesmen
            </h3>
            <ul className="text-gray-300 space-y-1 text-sm">
              {topSalesmen.map(([name, val], i) => (
                <li key={name}>
                  {i + 1}. {name} —{" "}
                  <span className="text-[#64FFDA] font-semibold">
                    ₹{val.toLocaleString("en-IN")}
                  </span>
                </li>
              ))}
            </ul>
          </div>

          {/* Top Cities */}
          <div className="bg-[#112240] rounded-xl p-4 shadow-lg border border-[#223355]">
            <h3 className="text-[#64FFDA] font-semibold mb-2 text-sm uppercase">
              📍 Top Cities
            </h3>
            <ul className="text-gray-300 space-y-1 text-sm">
              {topCities.map(([city, val], i) => (
                <li key={city}>
                  {i + 1}. {city} —{" "}
                  <span className="text-[#64FFDA] font-semibold">
                    ₹{val.toLocaleString("en-IN")}
                  </span>
                </li>
              ))}
            </ul>
          </div>

          {/* Net Total */}
          <div className="bg-[#112240] rounded-xl p-4 shadow-lg border border-[#223355] text-center flex flex-col justify-center">
            <h3 className="text-[#64FFDA] font-semibold mb-1 text-sm uppercase">
              💰 Net Total Sales
            </h3>
            <p className="text-2xl font-bold text-white">
              ₹{netTotal.toLocaleString("en-IN")}
            </p>
          </div>
        </div>

        {/* Charts Row */}
        <div className="grid md:grid-cols-2 xl:grid-cols-4 gap-4 mb-6">
          <ChartCard
            title="Item Category Wise"
            type="line"
            data={makeChart(totals.category)}
          />
          <ChartCard
            title="Salesman Wise"
            type="bar"
            data={makeChart(totals.salesman)}
          />
          <ChartCard
            title="City Wise"
            type="doughnut"
            data={makeChart(totals.city)}
          />
          <ChartCard
            title="Company Summary"
            type="pie"
            data={makeChart(totals.category)}
          />
        </div>

        {/* Hierarchy Section */}
        <div className="mt-8 bg-[#0D1B34] border border-[#1E2D50] rounded-2xl shadow-xl p-5">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-xl font-bold text-[#64FFDA] flex items-center gap-2">
              🌳 Detailed Company Hierarchy
            </h3>
            <button
              onClick={() => window.print()}
              className="px-4 py-2 bg-[#64FFDA]/10 border border-[#64FFDA]/40 text-[#64FFDA] font-semibold rounded-lg shadow hover:bg-[#64FFDA]/20 transition-all"
            >
              📄 Export PDF
            </button>
          </div>

if (!hierarchy || Object.keys(hierarchy).length === 0) {
  return (
    <div className="text-center text-gray-300 mt-4">
      No data available for selected filters.
    </div>
  );
}

          
          {Object.entries(hierarchy).map(([category, salesmen]) => {
            const catTotal = Object.values(salesmen).reduce(
              (sum, s) => sum + s.total,
              0
            );
            if (catTotal === 0) return null;

            return (
              <details
                key={category}
                className="group bg-[#112240] rounded-lg mb-4 border-l-4 border-[#64FFDA] shadow-md overflow-hidden"
              >
                <summary className="cursor-pointer text-[#64FFDA] font-semibold text-lg flex justify-between items-center p-3 hover:bg-[#1a335f]">
                  <span>{category}</span>
                  <span className="text-[#64FFDA] font-medium">
                    ₹{catTotal.toLocaleString("en-IN")}
                  </span>
                </summary>

                <div className="pl-5 mt-2 relative border-l border-[#1E2D50] ml-2 pb-2 pr-2">
                  {Object.entries(salesmen).map(([salesman, data]) => (
                    <details
                      key={salesman}
                      className="group bg-[#0A192F] rounded-lg p-3 my-3 ml-4 border-l-2 border-[#3B82F6] transition-all hover:border-[#64FFDA]"
                    >
                      <summary className="cursor-pointer text-[#3B82F6] font-medium flex justify-between items-center">
                        <span className="flex items-center gap-2">
                          <User size={16} />
                          {salesman}
                        </span>
                        <span className="text-[#64FFDA] font-medium text-sm">
                          ₹{data.total.toLocaleString("en-IN")} (
                          {data.qty.toLocaleString("en-IN")} pcs)
                        </span>
                        <ChevronDown className="w-4 h-4 transition-transform group-open:rotate-180" />
                      </summary>

                      <ul className="ml-6 mt-3 flex flex-wrap gap-3">
                        {Object.entries(data.cities).map(([city, val], i) => (
                          <li
                            key={i}
                            onClick={() =>
                              openCityPopup(category, salesman, city)
                            }
                            className="relative p-2 w-full md:w-[48%] bg-gradient-to-r from-[#102240] to-[#143450] rounded border border-[#1E2D50] flex justify-between items-center hover:border-[#64FFDA] hover:bg-[#102a5a] transition-all cursor-pointer"
                          >
                            <div className="flex items-center gap-2 text-xs text-gray-300">
                              <MapPin
                                size={12}
                                className="text-[#64FFDA] flex-shrink-0"
                              />
                              <span>{city}</span>
                            </div>
                            <span className="text-gray-200 text-xs font-mono">
                              ₹{val.total.toLocaleString("en-IN")}
                            </span>
                          </li>
                        ))}
                      </ul>
                    </details>
                  ))}
                </div>
              </details>
            );
          })}
        </div>

        <div className="text-center text-xs text-gray-500 mt-6 border-t border-[#1E2D50] pt-3">
          Auto-generated dynamic hierarchy & pivot insights from Sel-T Database.
        </div>
      </div>

      {/* City Detail Popup */}
      {popupOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
          <div
            className="absolute inset-0 bg-black/60"
            onClick={() => setPopupOpen(false)}
          />
          <div className="relative max-w-3xl w-full bg-[#0D1B34] border border-[#64FFDA]/40 rounded-xl shadow-2xl p-4 max-h-[80vh] overflow-auto">
            <div className="flex justify-between items-center mb-3 border-b border-[#1E2D50] pb-2">
              <h4 className="text-[#64FFDA] font-semibold text-sm">
                📌 {popupTitle}
              </h4>
              <button
                onClick={() => setPopupOpen(false)}
                className="text-red-400 hover:text-red-500"
              >
                <XCircle size={20} />
              </button>
            </div>
            {popupRecords.length === 0 ? (
              <p className="text-xs text-gray-300">No details available.</p>
            ) : (
              <div className="overflow-auto border border-[#1E2D50] rounded">
                <table className="w-full text-xs">
                  <thead className="bg-[#112240] text-[#64FFDA] sticky top-0">
                    <tr>
                      <th className="px-2 py-1 text-left">Date</th>
                      <th className="px-2 py-1 text-left">Party</th>
                      <th className="px-2 py-1 text-left">Item</th>
                      <th className="px-2 py-1 text-right">Qty</th>
                      <th className="px-2 py-1 text-right">Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    {popupRecords.map((r, i) => (
                      <tr
                        key={i}
                        className={
                          i % 2 === 0 ? "bg-[#0F1E33]" : "bg-[#13253E]"
                        }
                      >
                        <td className="px-2 py-1 whitespace-nowrap">
                          {r.Date}
                        </td>
                        <td className="px-2 py-1">{r.Party}</td>
                        <td className="px-2 py-1">{r.Item}</td>
                        <td className="px-2 py-1 text-right">
                          {r.Qty.toLocaleString("en-IN")}
                        </td>
                        <td className="px-2 py-1 text-right text-[#64FFDA] font-mono">
                          ₹{r.Amount.toLocaleString("en-IN")}
                        </td>
                      </tr>
                    ))}
                    <tr className="bg-[#081427] border-t border-[#64FFDA]/60 font-semibold text-[#64FFDA]">
                      <td
                        className="px-2 py-1"
                        colSpan={3}
                      >
                        TOTAL ({popupRecords.length} rows)
                      </td>
                      <td className="px-2 py-1 text-right">
                        {popupRecords
                          .reduce((s, r) => s + r.Qty, 0)
                          .toLocaleString("en-IN")}
                      </td>
                      <td className="px-2 py-1 text-right">
                        ₹
                        {popupRecords
                          .reduce((s, r) => s + r.Amount, 0)
                          .toLocaleString("en-IN")}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// Chart card with bright fonts inside charts
function ChartCard({ title, type, data }) {
  const ChartComp =
    type === "bar"
      ? Bar
      : type === "pie"
      ? Pie
      : type === "doughnut"
      ? Doughnut
      : Line;

  const options = {
    maintainAspectRatio: false,
    responsive: true,
    plugins: {
      legend: {
        labels: {
          color: "#ffffff",
          font: { size: 11 },
        },
      },
      tooltip: {
        titleColor: "#64FFDA",
        bodyColor: "#ffffff",
        backgroundColor: "rgba(15,23,42,0.95)",
      },
    },
    scales:
      type === "pie" || type === "doughnut"
        ? {}
        : {
            x: {
              ticks: { color: "#E5E7EB", font: { size: 10 } },
              grid: { color: "rgba(148,163,184,0.2)" },
            },
            y: {
              ticks: {
                color: "#E5E7EB",
                font: { size: 10 },
                callback: (val) => {
                  if (val >= 10000000)
                    return `₹${(val / 10000000).toFixed(0)}Cr`;
                  if (val >= 100000)
                    return `₹${(val / 100000).toFixed(0)}L`;
                  return `₹${(val / 1000).toFixed(0)}K`;
                },
              },
              grid: { color: "rgba(148,163,184,0.2)" },
            },
          },
  };

  return (
    <div className="bg-[#112240] rounded-xl p-3 h-[250px] shadow-lg border border-[#223355] hover:border-[#64FFDA]/50 transition">
      <h3 className="text-sm font-semibold mb-2 text-[#64FFDA]">{title}</h3>
      <div className="h-[180px]">
        <ChartComp data={data} options={options} />
      </div>
    </div>
  );
}
