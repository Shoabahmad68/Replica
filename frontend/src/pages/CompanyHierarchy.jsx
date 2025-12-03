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

  // Popup
  const [popupOpen, setPopupOpen] = useState(false);
  const [popupData, setPopupData] = useState([]);
  const [popupTitle, setPopupTitle] = useState("");

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

    if (dateRange === "Today")
      return d.toDateString() === today.toDateString();

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

    if (dateRange === "This Month")
      return (
        d.getMonth() === today.getMonth() &&
        d.getFullYear() === today.getFullYear()
      );

    if (dateRange === "Last Month") {
      const last = new Date(today);
      last.setMonth(today.getMonth() - 1);
      return (
        d.getMonth() === last.getMonth() &&
        d.getFullYear() === last.getFullYear()
      );
    }

    if (dateRange === "This Quarter") {
      const q = Math.floor((today.getMonth() + 3) / 3);
      const dq = Math.floor((d.getMonth() + 3) / 3);
      return q === dq && today.getFullYear() === d.getFullYear();
    }

    if (dateRange === "This Year")
      return d.getFullYear() === today.getFullYear();

    if (dateRange === "Last Year")
      return d.getFullYear() === today.getFullYear() - 1;

    if (dateRange === "Custom") {
      if (!customStart || !customEnd) return true;
      const st = new Date(customStart);
      const en = new Date(customEnd);
      en.setHours(23, 59, 59);
      return d >= st && d <= en;
    }

    return true;
  };

  // FETCH DATA
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
            .map((v) => ({
              Date: clean(v.date),
              Party: clean(v.party_name),
              Salesman: clean(v.party_group),
              Item: clean(v.name_item || v.item_name),
              Category: clean(v.item_category),
              Group: clean(v.item_group),
              City: clean(v.city_area),
              Qty: Number(v.qty) || 0,
              Amount: Number(v.amount) || 0,
            }))
            .filter((r) => r.Amount !== 0);

          setRawData(rows);
        }
      } catch {
        setRawData([]);
      }

      setLoading(false);
    };

    load();
  }, []);

  // APPLY FILTERS
  useEffect(() => {
    let rows = [...rawData];

    rows = rows.filter((r) => checkDate(r.Date));

    if (salesmanFilter)
      rows = rows.filter((r) => r.Salesman === salesmanFilter);

    setExcelData(rows);
  }, [rawData, dateRange, customStart, customEnd, salesmanFilter]);

  const salesmanOptions = useMemo(
    () =>
      Array.from(new Set(rawData.map((r) => r.Salesman))).filter(
        (r) => r && r !== "N/A"
      ),
    [rawData]
  );

  // AGGREGATION
  const totals = { salesman: {}, city: {}, category: {} };
  let netTotal = 0;

  excelData.forEach((r) => {
    totals.salesman[r.Salesman] =
      (totals.salesman[r.Salesman] || 0) + r.Amount;
    totals.city[r.City] = (totals.city[r.City] || 0) + r.Amount;
    totals.category[r.Category] =
      (totals.category[r.Category] || 0) + r.Amount;
    netTotal += r.Amount;
  });

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
      labels.push(k);
      data.push(v);
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

  // CITY POPUP → PARTYWISE + ITEMWISE CHART
  const openCityPopup = (category, salesman, city) => {
    let rec = excelData.filter(
      (r) =>
        r.Category === category &&
        r.Salesman === salesman &&
        r.City === city
    );

    setPopupData(rec);
    setPopupTitle(`${category} → ${salesman} → ${city}`);
    setPopupOpen(true);
  };

  const partyChart = useMemo(() => {
    const p = {};
    popupData.forEach((r) => {
      p[r.Party] = (p[r.Party] || 0) + r.Amount;
    });
    return makeChart(p);
  }, [popupData]);

  const itemChart = useMemo(() => {
    const it = {};
    popupData.forEach((r) => {
      it[r.Item] = (it[r.Item] || 0) + r.Amount;
    });
    return makeChart(it);
  }, [popupData]);

  // HIERARCHY MAP
  const hierarchy = useMemo(() => {
    const acc = {};
    excelData.forEach((r) => {
      const cat = r.Category;
      const sm = r.Salesman;
      const ct = r.City;

      if (!acc[cat]) acc[cat] = {};
      if (!acc[cat][sm])
        acc[cat][sm] = { total: 0, qty: 0, cities: {} };
      if (!acc[cat][sm].cities[ct])
        acc[cat][sm].cities[ct] = { total: 0, qty: 0 };

      acc[cat][sm].total += r.Amount;
      acc[cat][sm].qty += r.Qty;
      acc[cat][sm].cities[ct].total += r.Amount;
      acc[cat][sm].cities[ct].qty += r.Qty;
    });
    return acc;
  }, [excelData]);

  if (loading)
    return (
      <div className="min-h-screen flex justify-center items-center text-[#64FFDA]">
        Loading...
      </div>
    );

  return (
    <div className="p-6 min-h-screen bg-[#0A192F] text-gray-100">
      <div className="max-w-7xl mx-auto">

        {/* FILTERS */}
        <div className="flex flex-wrap gap-2 mb-6">

          <select
            value={dateRange}
            onChange={(e) => setDateRange(e.target.value)}
            className="bg-[#112240] text-gray-200 px-3 py-1 rounded border border-[#223355]"
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
                value={customStart}
                onChange={(e) => setCustomStart(e.target.value)}
                className="bg-[#112240] text-gray-200 px-3 py-1 rounded border border-[#223355]"
              />
              <input
                type="date"
                value={customEnd}
                onChange={(e) => setCustomEnd(e.target.value)}
                className="bg-[#112240] text-gray-200 px-3 py-1 rounded border border-[#223355]"
              />
            </>
          )}

          <select
            value={salesmanFilter}
            onChange={(e) => setSalesmanFilter(e.target.value)}
            className="bg-[#112240] text-gray-200 px-3 py-1 rounded border border-[#223355]"
          >
            <option value="">All Salesmen</option>
            {salesmanOptions.map((s) => (
              <option key={s}>{s}</option>
            ))}
          </select>
        </div>

        {/* SUMMARY */}
        <div className="grid md:grid-cols-3 gap-4 mb-6">
          <div className="p-4 bg-[#112240] rounded-xl border border-[#223355]">
            <h3 className="text-[#64FFDA] mb-2 text-sm font-bold">Top Salesmen</h3>
            {Object.entries(totals.salesman)
              .sort((a, b) => b[1] - a[1])
              .slice(0, 3)
              .map(([s, v], i) => (
                <p key={i} className="text-sm">
                  {i + 1}. {s} —{" "}
                  <span className="text-[#64FFDA]">
                    ₹{v.toLocaleString("en-IN")}
                  </span>
                </p>
              ))}
          </div>

          <div className="p-4 bg-[#112240] rounded-xl border border-[#223355]">
            <h3 className="text-[#64FFDA] mb-2 text-sm font-bold">Top Cities</h3>
            {Object.entries(totals.city)
              .sort((a, b) => b[1] - a[1])
              .slice(0, 3)
              .map(([c, v], i) => (
                <p key={i} className="text-sm">
                  {i + 1}. {c} —{" "}
                  <span className="text-[#64FFDA]">
                    ₹{v.toLocaleString("en-IN")}
                  </span>
                </p>
              ))}
          </div>

          <div className="p-4 bg-[#112240] text-center rounded-xl border border-[#223355]">
            <h3 className="text-[#64FFDA] mb-1 text-sm font-bold">Net Total</h3>
            <p className="text-xl text-white">
              ₹{netTotal.toLocaleString("en-IN")}
            </p>
          </div>
        </div>

        {/* CHARTS */}
        <div className="grid md:grid-cols-2 xl:grid-cols-4 gap-4 mb-6">
          <ChartCard title="Item Category Wise" type="bar" data={makeChart(totals.category)} />
          <ChartCard title="Salesman Wise" type="bar" data={makeChart(totals.salesman)} />
          <ChartCard title="City Wise" type="doughnut" data={makeChart(totals.city)} />
          <ChartCard title="Company Summary" type="pie" data={makeChart(totals.category)} />
        </div>

        {/* HIERARCHY */}
        <div className="mt-10">
          {Object.entries(hierarchy).map(([cat, salesmen]) => {
            const catTotal = Object.values(salesmen).reduce(
              (a, b) => a + b.total,
              0
            );
            if (!catTotal) return null;

            return (
              <details
                key={cat}
                className="mb-4 bg-[#112240] border-l-4 border-[#64FFDA] rounded shadow"
              >
                <summary className="cursor-pointer px-4 py-3 text-[#64FFDA] text-lg flex justify-between">
                  <span>{cat}</span>
                  <span>₹{catTotal.toLocaleString("en-IN")}</span>
                </summary>

                <div className="pl-6 py-2 border-l border-[#1d2d4a]">
                  {Object.entries(salesmen).map(([sm, d]) => (
                    <details
                      key={sm}
                      className="ml-4 mt-3 bg-[#0A192F] rounded border-l-2 border-[#3B82F6] p-3"
                    >
                      <summary className="cursor-pointer flex justify-between text-[#3B82F6]">
                        <span className="flex gap-2 items-center">
                          <User size={16} /> {sm}
                        </span>
                        <span className="text-[#64FFDA]">
                          ₹{d.total.toLocaleString("en-IN")} ({d.qty} pcs)
                        </span>
                      </summary>

                      <ul className="ml-4 mt-3 flex flex-wrap gap-3">
                        {Object.entries(d.cities).map(([ct, v], i) => (
                          <li
                            key={i}
                            onClick={() => openCityPopup(cat, sm, ct)}
                            className="cursor-pointer p-2 rounded bg-[#102447] hover:bg-[#1b3a6a] border border-[#1e2d50] w-full md:w-[48%] flex justify-between"
                          >
                            <div className="flex gap-2 items-center text-xs">
                              <MapPin size={12} className="text-[#64FFDA]" />
                              {ct}
                            </div>
                            <span className="text-xs text-gray-200">
                              ₹{v.total.toLocaleString("en-IN")}
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
      </div>

      {/* POPUP */}
      {popupOpen && (
        <div className="fixed inset-0 flex items-center justify-center bg-black/60 p-4 z-50">
          <div className="bg-[#0A192F] w-full max-w-3xl border border-[#64FFDA]/40 rounded-xl p-4">
            <div className="flex justify-between items-center mb-3">
              <h2 className="text-[#64FFDA] text-sm font-bold">{popupTitle}</h2>
              <button onClick={() => setPopupOpen(false)}>
                <XCircle size={18} className="text-red-400" />
              </button>
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              <ChartCard title="Partywise Sales" type="bar" data={partyChart} />
              <ChartCard title="Itemwise Sales" type="pie" data={itemChart} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// CHART COMPONENT
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
        labels: { color: "#fff", font: { size: 11 } },
      },
      tooltip: {
        titleColor: "#64FFDA",
        bodyColor: "#fff",
        backgroundColor: "rgba(15,23,42,0.95)",
      },
    },
    scales:
      type === "pie" || type === "doughnut"
        ? {}
        : {
            x: {
              ticks: { color: "#e2e8f0", font: { size: 10 } },
              grid: { color: "rgba(255,255,255,0.1)" },
            },
            y: {
              ticks: { color: "#e2e8f0", font: { size: 10 } },
              grid: { color: "rgba(255,255,255,0.1)" },
            },
          },
  };

  return (
    <div className="bg-[#112240] rounded-xl border border-[#223355] p-3 h-[250px]">
      <h3 className="text-sm mb-2 text-[#64FFDA]">{title}</h3>
      <div className="h-[180px]">
        <ChartComp data={data} options={options} />
      </div>
    </div>
  );
}
