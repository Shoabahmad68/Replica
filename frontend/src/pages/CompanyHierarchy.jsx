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
  const [compareOpen, setCompareOpen] = useState(false);
  const [loading, setLoading] = useState(true);

  // FUNCTION — Detect TOTAL rows (same logic as Dashboard.jsx)
  const isTotalRow = (r) => {
    if (!r) return true;
    try {
      const vals = Object.values(r).map(v => String(v || "").toLowerCase());
      if (vals.some(v => ["total", "grand total", "sub total", "summary"].some(w => v.includes(w)))) return true;
      if (vals.every(v => v.trim() === "")) return true;
      return false;
    } catch {
      return true;
    }
  };

  // CLEAN VALUE helper
  const clean = (v) => {
    if (!v) return "";
    v = String(v).trim();
    if (["", "na", "n/a", "undefined"].includes(v.toLowerCase())) return "";
    return v;
  };

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {

        const backendURL = window.location.hostname.includes("localhost")
          ? "http://127.0.0.1:8787"
          : "https://selt-t-backend.selt-3232.workers.dev";

        const res = await fetch(`${backendURL}/api/vouchers?limit=50000`);
        const json = await res.json();

        if (json.success && Array.isArray(json.data)) {

          const processed = json.data
            .filter((row) => row && !isTotalRow(row))   // remove TOTAL rows
            .map((v) => ({
              Date: clean(v.date),
              Party: clean(v.party_name),
              Salesman: clean(v.party_group),                 // salesman = PARTY GROUP
              Item: clean(v.name_item || v.item_name),
              Category: clean(v.item_category),
              Group: clean(v.item_group),
              City: clean(v.city_area),
              Qty: Number(v.qty) || 0,
              Amount: Number(v.amount) || 0,
            }))
            .filter(r => r.Amount !== 0); // remove rubbish rows

          setExcelData(processed);
          localStorage.setItem("hierarchy_data", JSON.stringify(processed));

        } else {
          const saved = localStorage.getItem("hierarchy_data");
          if (saved) setExcelData(JSON.parse(saved));
        }

      } catch (err) {
        console.error("❌ Error:", err);
        const saved = localStorage.getItem("hierarchy_data");
        if (saved) setExcelData(JSON.parse(saved));
      }
      finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0A192F] flex justify-center items-center text-[#64FFDA] animate-pulse">
        Loading Hierarchy Data...
      </div>
    );
  }

  // AGGREGATIONS
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
    .slice(0, 3);

  const topCities = Object.entries(totals.city)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3);

  // CHART DATA
  const chartColors = ["#64FFDA", "#3B82F6", "#F59E0B", "#EF4444", "#8B5CF6", "#22D3EE"];

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
      datasets: [{ label: "Net Sales (₹)", data, backgroundColor: chartColors }]
    };
  };

  return (
    <div className="p-6 min-h-screen bg-gradient-to-br from-[#0A192F] via-[#112240] to-[#0A192F] text-gray-100 animate-fadeIn">
      <div className="max-w-7xl mx-auto bg-[#1B2A4A] rounded-2xl shadow-2xl border border-[#223355] p-6">

        {/* HEADER */}
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-[#64FFDA] flex items-center gap-2 tracking-wide">
            🏢 Company Hierarchy & Pivot Summary
          </h2>

          <button
            onClick={() => setCompareOpen(true)}
            className="px-4 py-2 bg-[#64FFDA]/10 border border-[#64FFDA]/40 text-[#64FFDA] font-semibold rounded-lg shadow hover:bg-[#64FFDA]/20 transition-all"
          >
            🔁 Compare Mode
          </button>
        </div>

        {/* SUMMARY CARDS */}
        <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-4 mb-6">

          <div className="bg-[#112240] rounded-xl p-4 shadow-lg border border-[#223355]">
            <h3 className="text-[#64FFDA] font-semibold mb-2 text-sm uppercase">🧑‍💼 Top Salesmen</h3>
            <ul className="text-gray-300 space-y-1 text-sm">
              {topSalesmen.map(([name, val], i) => (
                <li key={i}>{i + 1}. {name} — <span className="text-[#64FFDA] font-semibold">₹{val.toLocaleString("en-IN")}</span></li>
              ))}
            </ul>
          </div>

          <div className="bg-[#112240] rounded-xl p-4 shadow-lg border border-[#223355]">
            <h3 className="text-[#64FFDA] font-semibold mb-2 text-sm uppercase">📍 Top Cities</h3>
            <ul className="text-gray-300 space-y-1 text-sm">
              {topCities.map(([city, val], i) => (
                <li key={i}>{i + 1}. {city} — <span className="text-[#64FFDA] font-semibold">₹{val.toLocaleString("en-IN")}</span></li>
              ))}
            </ul>
          </div>

          <div className="bg-[#112240] rounded-xl p-4 shadow-lg border border-[#223355] text-center flex flex-col justify-center">
            <h3 className="text-[#64FFDA] font-semibold mb-1 text-sm uppercase">💰 Net Total Sales</h3>
            <p className="text-2xl font-bold text-white">₹{netTotal.toLocaleString("en-IN")}</p>
          </div>
        </div>

        {/* CHARTS */}
        <div className="grid md:grid-cols-2 xl:grid-cols-4 gap-4 mb-6">
          <ChartCard title="Item Category Wise" type="line" data={makeChart(totals.category)} />
          <ChartCard title="Salesman Wise" type="bar" data={makeChart(totals.salesman)} />
          <ChartCard title="City Wise" type="doughnut" data={makeChart(totals.city)} />
          <ChartCard title="Company Summary" type="pie" data={makeChart(totals.category)} />
        </div>

        {/* HIERARCHY TREE */}
        <div className="mt-8 bg-[#0D1B34] border border-[#1E2D50] rounded-2xl shadow-xl p-5">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-xl font-bold text-[#64FFDA] flex items-center gap-2">🌳 Detailed Company Hierarchy</h3>
            <button onClick={() => window.print()} className="px-4 py-2 bg-[#64FFDA]/10 border border-[#64FFDA]/40 text-[#64FFDA] font-semibold rounded-lg shadow hover:bg-[#64FFDA]/20 transition-all">📄 Export PDF</button>
          </div>

          {/** build structure similar exactly like your old file */}
          {Object.entries(
            excelData.reduce((acc, row) => {
              const category = row.Category || "Other";
              const salesman = row.Salesman || "Unknown";
              const city = row.City || "Unknown";

              if (!acc[category]) acc[category] = {};
              if (!acc[category][salesman]) acc[category][salesman] = { total: 0, qty: 0, cities: {} };
              if (!acc[category][salesman].cities[city]) acc[category][salesman].cities[city] = { total: 0, qty: 0 };

              acc[category][salesman].total += row.Amount;
              acc[category][salesman].qty += row.Qty;
              acc[category][salesman].cities[city].total += row.Amount;
              acc[category][salesman].cities[city].qty += row.Qty;

              return acc;
            }, {})
          ).map(([category, salesmen]) => {

            const catTotal = Object.values(salesmen)
              .reduce((sum, s) => sum + s.total, 0);

            if (catTotal === 0) return null;

            return (
              <details key={category} className="group bg-[#112240] rounded-lg mb-4 border-l-4 border-[#64FFDA] shadow-md overflow-hidden">

                <summary className="cursor-pointer text-[#64FFDA] font-semibold text-lg flex justify-between items-center p-3 hover:bg-[#1a335f]">
                  <span>{category}</span>
                  <span className="text-[#64FFDA] font-medium">₹{catTotal.toLocaleString("en-IN")}</span>
                </summary>

                <div className="pl-5 mt-2 relative border-l border-[#1E2D50] ml-2 pb-2 pr-2">

                  {Object.entries(salesmen).map(([salesman, data]) => (
                    <details
                      key={salesman}
                      className="group bg-[#0A192F] rounded-lg p-3 my-3 ml-4 border-l-2 border-[#3B82F6] transition-all hover:border-[#64FFDA]"
                    >
                      <summary className="cursor-pointer text-[#3B82F6] font-medium flex justify-between items-center">
                        <span className="flex items-center gap-2"><User size={16} />{salesman}</span>
                        <span className="text-[#64FFDA] font-medium text-sm">
                          ₹{data.total.toLocaleString("en-IN")} ({data.qty} pcs)
                        </span>
                        <ChevronDown className="w-4 h-4 transition-transform group-open:rotate-180" />
                      </summary>

                      <ul className="ml-6 mt-3 flex flex-wrap gap-3">
                        {Object.entries(data.cities).map(([city, val], i) => (
                          <li
                            key={i}
                            className="relative p-2 w-full md:w-[48%] bg-gradient-to-r from-[#102240] to-[#143450] rounded border border-[#1E2D50] flex justify-between items-center hover:border-[#64FFDA] transition-all"
                          >
                            <div className="flex items-center gap-2 text-xs text-gray-300"><MapPin size={12} className="text-[#64FFDA]" /> <span>{city}</span></div>
                            <span className="text-gray-200 text-xs font-mono">₹{val.total.toLocaleString("en-IN")}</span>
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
    </div>
  );
}



function ChartCard({ title, type, data }) {
  const ChartComp =
    type === "bar" ? Bar :
    type === "pie" ? Pie :
    type === "doughnut" ? Doughnut :
    Line;

  return (
    <div className="bg-[#112240] rounded-xl p-3 h-[250px] shadow-lg border border-[#223355] hover:border-[#64FFDA]/50 transition">
      <h3 className="text-sm font-semibold mb-2 text-[#64FFDA]">{title}</h3>
      <div className="h-[180px]">
        <ChartComp data={data} options={{ maintainAspectRatio: false, responsive: true }} />
      </div>
    </div>
  );
}
