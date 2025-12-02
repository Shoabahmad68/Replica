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

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    setLoading(true);
    try {
      const backendURL = window.location.hostname.includes("localhost")
        ? "http://127.0.0.1:8787"
        : "https://selt-t-backend.selt-3232.workers.dev";

      const res = await fetch(`${backendURL}/api/vouchers?limit=50000`);
      const json = await res.json();

      const raw = json.data || [];

      // ***** REMOVE TOTAL/GRAND ROWS + MAP SAME AS REPORTS.JSX *****
      const mapped = raw
        .filter((row) => {
          const p = String(row.party_name || "").toLowerCase();
          const g = String(row.party_group || "").toLowerCase();
          const i = String(row.item_name || "").toLowerCase();
          const c = String(row.item_category || "").toLowerCase();

          if (
            p.includes("total") ||
            p.includes("grand") ||
            p.includes("summary") ||
            p.includes("closing") ||
            g.includes("total") ||
            i.includes("total") ||
            c.includes("total")
          )
            return false;

          return true;
        })
        .map((row) => ({
          Date: row.date || "",
          PartyName: row.party_name || "",
          ItemName: row.ItemName || row.item_name || "",
          ItemCategory: row.item_category || "Unknown",
          CityArea: row.city_area || "Unknown",
          ItemGroup: row.item_group || "Unknown",

          // ✔ SALESMAN = PARTY GROUP
          Salesman: row.party_group || "Unknown",

          Qty: Number(row.qty) || 0,
          Amount: Number(row.amount) || 0,
        }));

      setExcelData(mapped);
      localStorage.setItem("uploadedExcelData", JSON.stringify(mapped));
    } catch (error) {
      console.error("Hierarchy error:", error);

      const saved = localStorage.getItem("uploadedExcelData");
      if (saved) setExcelData(JSON.parse(saved));
    }

    setLoading(false);
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0A192F] flex justify-center items-center text-[#64FFDA] animate-pulse">
        Loading Hierarchy Data...
      </div>
    );
  }

  // ***** AGGREGATIONS *****
  const salesmanTotals = {};
  const cityTotals = {};
  const itemTotals = {};
  let grandTotal = 0;

  excelData.forEach((row) => {
    salesmanTotals[row.Salesman] =
      (salesmanTotals[row.Salesman] || 0) + row.Amount;

    cityTotals[row.CityArea] =
      (cityTotals[row.CityArea] || 0) + row.Amount;

    itemTotals[row.ItemCategory] =
      (itemTotals[row.ItemCategory] || 0) + row.Amount;

    grandTotal += row.Amount;
  });

  const topSalesman = Object.entries(salesmanTotals)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3);

  const topCities = Object.entries(cityTotals)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3);

  const chartColors = ["#64FFDA", "#3B82F6", "#F59E0B", "#EF4444", "#8B5CF6", "#22D3EE"];

  const getItemChartData = () => ({
    labels: Object.keys(itemTotals),
    datasets: [
      {
        label: "Net Sales (₹)",
        data: Object.values(itemTotals),
        backgroundColor: chartColors,
      },
    ],
  });

  const getSalesmanChartData = () => ({
    labels: Object.keys(salesmanTotals),
    datasets: [
      {
        label: "Net Sales (₹)",
        data: Object.values(salesmanTotals),
        backgroundColor: "#8B5CF6",
      },
    ],
  });

  const getCityChartData = () => ({
    labels: Object.keys(cityTotals),
    datasets: [
      {
        label: "Net Sales (₹)",
        data: Object.values(cityTotals),
        backgroundColor: "#10B981",
      },
    ],
  });

  return (
    <div className="p-6 min-h-screen bg-gradient-to-br from-[#0A192F] via-[#112240] to-[#0A192F] text-gray-100">

      <div className="max-w-7xl mx-auto bg-[#1B2A4A] rounded-2xl shadow-2xl border border-[#223355] p-6">

        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-[#64FFDA] flex items-center gap-2">
            🏢 Company Hierarchy & Pivot Summary
          </h2>

          <button
            onClick={() => setCompareOpen(true)}
            className="px-4 py-2 bg-[#64FFDA]/10 border border-[#64FFDA]/40 text-[#64FFDA] rounded-lg">
            🔁 Compare Mode
          </button>
        </div>

        {/* SUMMARY CARDS */}
        <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-4 mb-6">
          <div className="bg-[#112240] rounded-xl p-4">
            <h3 className="text-[#64FFDA] text-sm mb-2">🧑‍💼 Top Salesmen</h3>
            <ul>
              {topSalesman.map(([name, val], i) => (
                <li key={i}>{i + 1}. {name} — ₹{val.toLocaleString("en-IN")}</li>
              ))}
            </ul>
          </div>

          <div className="bg-[#112240] rounded-xl p-4">
            <h3 className="text-[#64FFDA] text-sm mb-2">📍 Top Cities</h3>
            <ul>
              {topCities.map(([city, val], i) => (
                <li key={i}>{i + 1}. {city} — ₹{val.toLocaleString("en-IN")}</li>
              ))}
            </ul>
          </div>

          <div className="bg-[#112240] rounded-xl p-4 text-center">
            <h3 className="text-[#64FFDA] text-sm mb-1">💰 Net Total Sales</h3>
            <p className="text-2xl font-bold">₹{grandTotal.toLocaleString("en-IN")}</p>
          </div>
        </div>

        {/* CHARTS */}
        <div className="grid md:grid-cols-2 xl:grid-cols-4 gap-4 mb-6">
          <ChartCard title="Item Category Wise" type="bar" data={getItemChartData()} />
          <ChartCard title="Salesman Wise" type="line" data={getSalesmanChartData()} />
          <ChartCard title="City Wise" type="doughnut" data={getCityChartData()} />
          <ChartCard title="Company Summary" type="pie" data={getItemChartData()} />
        </div>

        {/* HIERARCHY */}
        <div className="mt-8 bg-[#0D1B34] border border-[#1E2D50] rounded-2xl p-5">

          <h3 className="text-xl font-bold text-[#64FFDA] mb-4">
            🌳 Detailed Company Hierarchy
          </h3>

          {Object.entries(
            excelData.reduce((acc, row) => {
              const cat = row.ItemCategory;
              const sm = row.Salesman;
              const ct = row.CityArea;

              if (!acc[cat]) acc[cat] = {};
              if (!acc[cat][sm]) acc[cat][sm] = { total: 0, qty: 0, cities: {} };
              if (!acc[cat][sm].cities[ct]) acc[cat][sm].cities[ct] = { total: 0, qty: 0 };

              acc[cat][sm].total += row.Amount;
              acc[cat][sm].qty += row.Qty;
              acc[cat][sm].cities[ct].total += row.Amount;

              return acc;
            }, {})
          ).map(([category, salesmen]) => {
            const catTotal = Object.values(salesmen).reduce((a, b) => a + b.total, 0);
            if (catTotal === 0) return null;

            return (
              <details key={category} className="group bg-[#112240] rounded-lg mb-4">
                <summary className="p-3 cursor-pointer text-[#64FFDA] flex justify-between">
                  <span>{category}</span>
                  <span>₹{catTotal.toLocaleString("en-IN")}</span>
                </summary>

                <div className="pl-5 mt-2 border-l border-[#1E2D50] ml-2 pb-2">

                  {Object.entries(salesmen).map(([salesman, data]) => (
                    <details key={salesman} className="group bg-[#0A192F] p-3 my-3 ml-4 border-l-2 border-[#3B82F6] rounded">
                      <summary className="cursor-pointer text-[#3B82F6] flex justify-between">
                        <span className="flex items-center gap-1"><User size={16} /> {salesman}</span>
                        <span>₹{data.total.toLocaleString("en-IN")} ({data.qty} pcs)</span>
                        <ChevronDown className="w-4 h-4 group-open:rotate-180" />
                      </summary>

                      <ul className="ml-6 mt-3 flex flex-wrap gap-3">
                        {Object.entries(data.cities).map(([city, val], i) => (
                          <li key={i} className="p-2 w-full md:w-[48%] bg-[#102240] rounded border border-[#1E2D50] flex justify-between">
                            <span className="text-xs text-gray-300 flex items-center gap-2">
                              <MapPin size={12} className="text-[#64FFDA]" /> {city}
                            </span>
                            <span className="text-xs text-gray-200">₹{val.total.toLocaleString("en-IN")}</span>
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
          Dynamic hierarchy auto-generated from Sel-T database
        </div>
      </div>
    </div>
  );
}

function ChartCard({ title, type, data }) {
  const C = type === "bar" ? Bar : type === "pie" ? Pie : type === "doughnut" ? Doughnut : Line;

  return (
    <div className="bg-[#112240] rounded-xl p-3 h-[250px] border border-[#223355]">
      <h3 className="text-sm text-[#64FFDA] mb-2">{title}</h3>
      <div className="h-[180px]">
        <C data={data} options={{ maintainAspectRatio: false, responsive: true }} />
      </div>
    </div>
  );
}
