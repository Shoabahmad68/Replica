// src/pages/CompanyHierarchy.jsx
import React, { useEffect, useState } from "react";
import { Pie, Bar, Doughnut, Line } from "react-chartjs-2";
import { ChevronDown, User, MapPin } from "lucide-react";

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
  const [excelData, setExcelData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [compareOpen, setCompareOpen] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    setLoading(true);
    try {
      const BACKEND = window.location.hostname.includes("localhost")
        ? "http://127.0.0.1:8787"
        : "https://selt-t-backend.selt-3232.workers.dev";

      const res = await fetch(`${BACKEND}/api/vouchers?limit=50000`);
      const json = await res.json();

      const raw = json.data || json.rows || [];

      // --- EXACT SAME MAPPING AS Reports.jsx (NO FILTERING) ---
      const mapped = raw.map((row) => ({
        Date: row.date || "",
        PartyName: row.party_name || "",
        ItemName: row.ItemName || row.item_name || "",
        ItemCategory: row.item_category || "Unknown",
        CityArea: row.city_area || "Unknown",
        ItemGroup: row.item_group || "Unknown",

        // SALESMAN = PARTY GROUP
        Salesman: row.party_group || "Unknown",

        Qty: Number(row.qty) || 0,
        Amount: Number(row.amount) || 0,
      }));

      setExcelData(mapped);
      localStorage.setItem("CompanyHierarchyData", JSON.stringify(mapped));

    } catch (err) {
      console.error("ERR:", err);
      const saved = localStorage.getItem("CompanyHierarchyData");
      if (saved) setExcelData(JSON.parse(saved));
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0A192F] flex justify-center items-center text-[#64FFDA] animate-pulse">
        Loading...
      </div>
    );
  }

  // ---------------- Aggregations --------------------
  const salesmanTotals = {};
  const cityTotals = {};
  const itemTotals = {};

  let grandTotal = 0;

  excelData.forEach((r) => {
    const sm = r.Salesman || "Unknown";
    const ct = r.CityArea || "Unknown";
    const it = r.ItemCategory || "Unknown";

    salesmanTotals[sm] = (salesmanTotals[sm] || 0) + r.Amount;
    cityTotals[ct] = (cityTotals[ct] || 0) + r.Amount;
    itemTotals[it] = (itemTotals[it] || 0) + r.Amount;

    grandTotal += r.Amount;
  });

  const topSalesman = Object.entries(salesmanTotals)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3);

  const topCities = Object.entries(cityTotals)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3);

  const COLORS = [
    "#64FFDA",
    "#3B82F6",
    "#8B5CF6",
    "#F59E0B",
    "#EF4444",
    "#10B981",
  ];

  const itemChart = {
    labels: Object.keys(itemTotals),
    datasets: [
      {
        label: "Net Sales (₹)",
        data: Object.values(itemTotals),
        backgroundColor: COLORS,
      },
    ],
  };

  const salesmanChart = {
    labels: Object.keys(salesmanTotals),
    datasets: [
      {
        label: "Net Sales (₹)",
        data: Object.values(salesmanTotals),
        backgroundColor: "#8B5CF6",
      },
    ],
  };

  const cityChart = {
    labels: Object.keys(cityTotals),
    datasets: [
      {
        label: "Net Sales (₹)",
        data: Object.values(cityTotals),
        backgroundColor: "#10B981",
      },
    ],
  };

  // ---------------- UI --------------------
  return (
    <div className="p-6 min-h-screen bg-gradient-to-br from-[#0A192F] via-[#112240] to-[#0A192F] text-gray-100">
      <div className="max-w-7xl mx-auto bg-[#1B2A4A] rounded-2xl shadow-2xl p-6 border border-[#223355]">

        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-[#64FFDA]">🏢 Company Hierarchy & Pivot Summary</h2>

          <button
            onClick={() => setCompareOpen(true)}
            className="px-4 py-2 bg-[#64FFDA]/10 border border-[#64FFDA]/40 text-[#64FFDA] rounded-lg"
          >
            🔁 Compare Mode
          </button>
        </div>

        {/* Summary Cards */}
        <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-4 mb-6">
          {/* Top Salesmen */}
          <div className="bg-[#112240] rounded-xl p-4 border border-[#223355]">
            <h3 className="text-[#64FFDA] text-sm mb-2 uppercase">🧑‍💼 Top Salesmen</h3>
            <ul className="text-gray-300 text-sm space-y-1">
              {topSalesman.map(([name, val], i) => (
                <li key={i}>
                  {i + 1}. {name} —{" "}
                  <span className="text-[#64FFDA]">₹{val.toLocaleString("en-IN")}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Top Cities */}
          <div className="bg-[#112240] rounded-xl p-4 border border-[#223355]">
            <h3 className="text-[#64FFDA] text-sm mb-2 uppercase">📍 Top Cities</h3>
            <ul className="text-gray-300 text-sm space-y-1">
              {topCities.map(([name, val], i) => (
                <li key={i}>
                  {i + 1}. {name} —{" "}
                  <span className="text-[#64FFDA]">₹{val.toLocaleString("en-IN")}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Total Sales */}
          <div className="bg-[#112240] rounded-xl p-4 border border-[#223355] text-center flex flex-col justify-center">
            <h3 className="text-[#64FFDA] text-sm uppercase">💰 Net Total Sales</h3>
            <p className="text-2xl font-bold text-white">
              ₹{grandTotal.toLocaleString("en-IN")}
            </p>
          </div>
        </div>

        {/* Charts */}
        <div className="grid md:grid-cols-2 xl:grid-cols-4 gap-4 mb-8">
          <ChartCard title="Item Category Wise" type="bar" data={itemChart} />
          <ChartCard title="Salesman Wise" type="line" data={salesmanChart} />
          <ChartCard title="City Wise" type="doughnut" data={cityChart} />
          <ChartCard title="Company Summary" type="pie" data={itemChart} />
        </div>

        {/* Hierarchy Section */}
        <div className="bg-[#0D1B34] rounded-2xl border border-[#1E2D50] p-6">
          <h3 className="text-xl mb-4 text-[#64FFDA] font-bold">🌳 Detailed Company Hierarchy</h3>

          {Object.entries(
            excelData.reduce((acc, r) => {
              const cat = r.ItemCategory;
              const sm = r.Salesman;
              const ct = r.CityArea;

              if (!acc[cat]) acc[cat] = {};
              if (!acc[cat][sm]) acc[cat][sm] = { total: 0, qty: 0, cities: {} };
              if (!acc[cat][sm].cities[ct])
                acc[cat][sm].cities[ct] = { total: 0, qty: 0 };

              acc[cat][sm].total += r.Amount;
              acc[cat][sm].qty += r.Qty;
              acc[cat][sm].cities[ct].total += r.Amount;
              acc[cat][sm].cities[ct].qty += r.Qty;

              return acc;
            }, {})
          ).map(([cat, salesmen]) => {
            const sum = Object.values(salesmen).reduce((a, b) => a + b.total, 0);
            if (sum === 0) return null;

            return (
              <details
                key={cat}
                className="group bg-[#112240] rounded-lg mb-4 border-l-4 border-[#64FFDA]"
              >
                <summary className="p-3 cursor-pointer text-[#64FFDA] font-semibold flex justify-between items-center">
                  <span>{cat}</span>
                  <span>₹{sum.toLocaleString("en-IN")}</span>
                </summary>

                <div className="ml-6 mt-2 border-l border-gray-700 pl-4">
                  {Object.entries(salesmen).map(([sm, data]) => (
                    <details
                      key={sm}
                      className="group bg-[#0A192F] p-3 my-3 rounded-lg border-l-2 border-[#3B82F6]"
                    >
                      <summary className="cursor-pointer flex justify-between items-center text-[#3B82F6]">
                        <span className="flex items-center gap-2">
                          <User size={16} /> {sm}
                        </span>
                        <span className="text-[#64FFDA]">
                          ₹{data.total.toLocaleString("en-IN")} ({data.qty} pcs)
                        </span>
                        <ChevronDown className="group-open:rotate-180 transition" />
                      </summary>

                      <ul className="ml-6 mt-2 flex flex-wrap gap-3">
                        {Object.entries(data.cities).map(([city, val], i) => (
                          <li
                            key={i}
                            className="w-full md:w-[48%] p-2 bg-[#102240] rounded border border-[#1E2D50] flex justify-between"
                          >
                            <span className="text-xs text-gray-300 flex items-center gap-2">
                              <MapPin size={12} className="text-[#64FFDA]" />
                              {city}
                            </span>
                            <span className="text-xs text-gray-200">
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
      </div>
    </div>
  );
}

function ChartCard({ title, type, data }) {
  const Comp =
    type === "bar" ? Bar : type === "pie" ? Pie : type === "doughnut" ? Doughnut : Line;

  return (
    <div className="bg-[#112240] rounded-xl border border-[#223355] p-3 h-[250px]">
      <h3 className="text-sm font-semibold text-[#64FFDA] mb-2">{title}</h3>
      <div className="h-[180px]">
        <Comp data={data} options={{ responsive: true, maintainAspectRatio: false }} />
      </div>
    </div>
  );
}
