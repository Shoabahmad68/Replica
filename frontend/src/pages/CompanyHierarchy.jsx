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
  const [loading, setLoading] = useState(true); // Loading state add kiya hai

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        // 1. Direct Backend Connection
        const backendURL = window.location.hostname.includes("localhost")
          ? "http://127.0.0.1:8787"
          : "https://selt-t-backend.selt-3232.workers.dev";

        console.log("Fetching from:", backendURL); // Debugging ke liye

        const res = await fetch(`${backendURL}/api/vouchers?limit=50000`);
        const json = await res.json();

        if (json.success && json.data && Array.isArray(json.data)) {
          
          // --- 🛠️ SAFE FILTER LOGIC ---
          const cleanRows = json.data.filter(row => {
            
            // Basic checks
            if (!row) return false;
            const party = (row.party_name || "").toLowerCase();
            const vType = (row.voucher_type || "").toLowerCase();
            
            // 1. Remove "Total" rows (Excel garbage)
            if (party.includes("total") || party.includes("grand") || party.includes("sub total")) return false;

            // 2. Remove "Credit Notes" (Returns) - Isse 16Cr vs 14Cr theek ho jayega
            if (vType.includes("credit note")) return false;

            // 3. Remove Orders (Not Sales)
            if (vType.includes("order") || vType.includes("delivery") || vType.includes("quotation")) return false;

            // Note: Maine "sales" shabd check karne wala filter HATA diya hai.
            // Ab agar Tally se "Invoice" ya kuch aur naam bhi aayega to bhi data dikhega.
            
            return true;
          });

          // --- 🗺️ MAPPING LOGIC ---
          const mappedData = cleanRows.map(row => ({
             // Logic: Header "Salesman" rahega, Data "Item Group" (Party Group) se aayega
             "Salesman": row.item_group || row.party_group || row.salesman || "Unknown", 
             "City/Area": row.city_area || "Unknown",
             "Item Category": row.item_category || "Unknown",
             "Item Group": row.item_group || "Unknown",
             "Amount": parseFloat(row.amount) || 0,
             "Qty": parseFloat(row.qty) || 0
          }));

          console.log("Mapped Data Count:", mappedData.length);
          setExcelData(mappedData);
          localStorage.setItem("uploadedExcelData", JSON.stringify(mappedData));
        } else {
          // Fallback if API fails
          console.warn("API returned no data, checking local storage");
          const saved = localStorage.getItem("uploadedExcelData");
          if (saved) setExcelData(JSON.parse(saved));
        }
      } catch (err) {
        console.error("❌ Error fetching hierarchy data:", err);
        const saved = localStorage.getItem("uploadedExcelData");
        if (saved) setExcelData(JSON.parse(saved));
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  // Ensure only positive amounts are shown in charts
  const cleanData = excelData.filter((row) => row["Amount"] > 0);

  if (loading) {
     return (
      <div className="p-6 bg-gradient-to-br from-[#0A192F] via-[#112240] to-[#0A192F] min-h-screen flex justify-center items-center text-[#64FFDA]">
        <h2 className="text-xl animate-pulse">Loading Data from Backend...</h2>
      </div>
    );
  }

  if (!cleanData.length) {
    return (
      <div className="p-6 bg-gradient-to-br from-[#0A192F] via-[#112240] to-[#0A192F] min-h-screen flex justify-center items-center text-gray-400">
        <div className="text-center">
            <h2 className="text-xl text-[#64FFDA] mb-2">No Hierarchy Data Found</h2>
            <p>Please check your internet connection or backend status.</p>
        </div>
      </div>
    );
  }

  // --- AGGREGATIONS ---
  const salesmanTotals = {}; 
  const cityTotals = {};
  const itemTotals = {};

  cleanData.forEach((row) => {
    const salesman = row["Salesman"] || "Unknown"; 
    const city = row["City/Area"] || "Unknown";
    const item = row["Item Category"] || "Unknown";
    const amount = parseFloat(row["Amount"]) || 0;

    salesmanTotals[salesman] = (salesmanTotals[salesman] || 0) + amount;
    cityTotals[city] = (cityTotals[city] || 0) + amount;
    itemTotals[item] = (itemTotals[item] || 0) + amount;
  });

  const topSalesman = Object.entries(salesmanTotals)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3);
  const topCities = Object.entries(cityTotals)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3);

  const chartColors = ["#64FFDA", "#3B82F6", "#F59E0B", "#EF4444", "#8B5CF6", "#22D3EE"];

  const itemCategoryChartData = {
    labels: Object.keys(itemTotals),
    datasets: [{ label: "Item Category Sales (₹)", data: Object.values(itemTotals), backgroundColor: chartColors }],
  };
  const salesmanChartData = {
    labels: Object.keys(salesmanTotals),
    datasets: [{ label: "Salesman (Group) Sales (₹)", data: Object.values(salesmanTotals), backgroundColor: "#8B5CF6" }],
  };
  const cityChartData = {
    labels: Object.keys(cityTotals),
    datasets: [{ label: "City-wise Sales (₹)", data: Object.values(cityTotals), backgroundColor: "#10B981" }],
  };

  return (
    <div className="p-6 min-h-screen bg-gradient-to-br from-[#0A192F] via-[#112240] to-[#0A192F] text-gray-100 animate-fadeIn">
      <div className="max-w-7xl mx-auto bg-[#1B2A4A] rounded-2xl shadow-2xl border border-[#223355] p-6">

        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-[#64FFDA] flex items-center gap-2 tracking-wide">
            🏢 Company Hierarchy & Pivot Summary
          </h2>
          <button
            onClick={() => setCompareOpen(true)}
            className="px-4 py-2 bg-[#64FFDA]/10 border border-[#64FFDA]/40 text-[#64FFDA] font-semibold rounded-lg shadow hover:bg-[#64FFDA]/20 transition-all duration-300"
          >
            🔁 Compare Mode
          </button>
        </div>

        {/* Summary Cards */}
        <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-4 mb-6">
          <div className="bg-[#112240] rounded-xl p-4 shadow-lg border border-[#223355]">
            <h3 className="text-[#64FFDA] font-semibold mb-2 text-sm uppercase">🧑‍💼 Top Salesmen (Group)</h3>
            <ul className="text-gray-300 space-y-1 text-sm">
              {topSalesman.map(([name, val], i) => (
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
            <h3 className="text-[#64FFDA] font-semibold mb-1 text-sm uppercase">💰 Total Sales</h3>
            <p className="text-2xl font-bold text-white">₹{cleanData.reduce((sum, r) => sum + (parseFloat(r["Amount"]) || 0), 0).toLocaleString("en-IN")}</p>
          </div>
        </div>

        {/* Charts Row */}
        <div className="grid md:grid-cols-2 xl:grid-cols-4 gap-4 mb-6">
          <ChartCard title="Item Category Wise" type="line" data={itemCategoryChartData} />
          <ChartCard title="Salesman (Party Group) Wise" type="bar" data={salesmanChartData} />
          <ChartCard title="City-wise" type="doughnut" data={cityChartData} />
          <ChartCard title="Company Summary" type="pie" data={itemCategoryChartData} />
        </div>

        {/* Hierarchy Section */}
        <div className="mt-8 bg-[#0D1B34] border border-[#1E2D50] rounded-2xl shadow-xl p-5">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-xl font-bold text-[#64FFDA] flex items-center gap-2">🌳 Detailed Company Hierarchy</h3>
            <button onClick={() => window.print()} className="px-4 py-2 bg-[#64FFDA]/10 border border-[#64FFDA]/40 text-[#64FFDA] font-semibold rounded-lg shadow hover:bg-[#64FFDA]/20 transition-all duration-300">📄 Export PDF</button>
          </div>

          {Object.entries(cleanData.reduce((acc, row) => {
              const category = row["Item Category"] || "Uncategorized";
              const salesman = row["Salesman"] || "No Salesman"; 
              const city = row["City/Area"] || "No City";
              const amount = parseFloat(row["Amount"]) || 0;
              const qty = parseFloat(row["Qty"]) || 0;

              if (!acc[category]) acc[category] = {};
              if (!acc[category][salesman]) acc[category][salesman] = { total: 0, qty: 0, cities: {} };
              if (!acc[category][salesman].cities[city]) acc[category][salesman].cities[city] = { total: 0, qty: 0 };

              acc[category][salesman].total += amount;
              acc[category][salesman].qty += qty;
              acc[category][salesman].cities[city].total += amount;
              acc[category][salesman].cities[city].qty += qty;
              return acc;
            }, {})).map(([category, salesmen]) => (
            <details key={category} className="group bg-[#112240] rounded-lg mb-4 border-l-4 border-[#64FFDA] shadow-md overflow-hidden">
              <summary className="cursor-pointer text-[#64FFDA] font-semibold text-lg flex justify-between items-center p-3 hover:bg-[#1a335f]">
                <span>{category}</span>
                <span className="text-[#64FFDA] font-medium">₹{Object.values(salesmen).reduce((a, b) => a + b.total, 0).toLocaleString("en-IN")}</span>
              </summary>
              <div className="pl-5 mt-2 relative border-l border-[#1E2D50] ml-2 pb-2 pr-2">
                {Object.entries(salesmen).map(([salesman, data]) => (
                  <details key={salesman} className="group bg-[#0A192F] rounded-lg p-3 my-3 ml-4 border-l-2 border-[#3B82F6] transition-all hover:border-[#64FFDA]">
                    <summary className="cursor-pointer text-[#3B82F6] font-medium flex justify-between items-center">
                      <span className="flex items-center gap-2"><User size={16} />{salesman}</span>
                      <span className="text-[#64FFDA] font-medium text-sm">₹{data.total.toLocaleString("en-IN")} ({data.qty.toFixed(0)} pcs)</span>
                      <ChevronDown className="w-4 h-4 transition-transform group-open:rotate-180" />
                    </summary>
                    <ul className="ml-6 mt-3 flex flex-wrap gap-3">
                      {Object.entries(data.cities).map(([city, val], i) => (
                        <li key={i} className="relative p-2 w-full md:w-[48%] bg-gradient-to-r from-[#102240] to-[#143450] rounded border border-[#1E2D50] flex justify-between items-center hover:border-[#64FFDA] transition-all">
                          <div className="flex items-center gap-2 text-xs text-gray-300"><MapPin size={12} className="text-[#64FFDA]" /><span>{city}</span></div>
                          <span className="text-gray-200 text-xs font-mono">₹{val.total.toLocaleString("en-IN")}</span>
                        </li>
                      ))}
                    </ul>
                  </details>
                ))}
              </div>
            </details>
          ))}
        </div>
        <div className="text-center text-xs text-gray-500 mt-6 border-t border-[#1E2D50] pt-3">Auto-generated dynamic hierarchy & pivot insights from Sel-T Database.</div>
      </div>
    </div>
  );
}

function ChartCard({ title, type, data }) {
  const ChartComp = type === "bar" ? Bar : type === "pie" ? Pie : type === "doughnut" ? Doughnut : Line;
  return (
    <div className="bg-[#112240] rounded-xl p-3 h-[250px] shadow-lg border border-[#223355] hover:border-[#64FFDA]/50 transition">
      <h3 className="text-sm font-semibold mb-2 text-[#64FFDA]">{title}</h3>
      <div className="h-[180px]">
        <ChartComp data={data} options={{ maintainAspectRatio: false, responsive: true }} />
      </div>
    </div>
  );
}
