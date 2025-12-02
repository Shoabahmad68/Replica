// src/pages/CompanyHierarchy.jsx
import React, { useEffect, useState, useMemo } from "react";
import { Bar } from "react-chartjs-2";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Tooltip,
  Legend,
} from "chart.js";

ChartJS.register(CategoryScale, LinearScale, BarElement, Tooltip, Legend);

export default function CompanyHierarchy() {
  const [data, setData] = useState([]);
  const [cleanData, setCleanData] = useState([]);
  const [loading, setLoading] = useState(true);

  // ==========================================
  // REMOVE TOTAL/SUMMARY ROWS
  // ==========================================
  const isTotalRow = (row) => {
    try {
      const values = Object.values(row || {}).map((v) =>
        String(v || "").toLowerCase()
      );

      if (
        values.some((v) =>
          ["total", "grand total", "sub total", "summary", "closing"].some((w) =>
            v.includes(w)
          )
        )
      )
        return true;

      if (values.every((v) => v.trim() === "")) return true;

      return false;
    } catch {
      return false;
    }
  };

  // ==========================================
  // FETCH DATA
  // ==========================================
  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);

        const backendURL =
          window.location.hostname === "localhost" ||
          window.location.hostname === "127.0.0.1"
            ? "http://127.0.0.1:8787"
            : "https://selt-t-backend.selt-3232.workers.dev";

        const res = await fetch(`${backendURL}/api/vouchers?limit=50000`);
        const json = await res.json();

        if (json.success && json.data) {
          const raw = json.data;

          // ==========================================
          // EXACT DASHBOARD NORMALIZATION
          // ==========================================
          const mapped = raw
            .filter((r) => !isTotalRow(r))
            .map((v) => ({
              Date: v.date || "",
              PartyName: v.party_name || "N/A",
              ItemName: v.name_item || v.item_name || "N/A",
              ItemCategory: v.item_category || "N/A",
              CityArea: v.city_area || "N/A",
              ItemGroup: v.item_group || "N/A",

              // ⭐ Salesman = Party Group
              Salesman: v.party_group || "N/A",

              Amount: Number(v.amount) || 0,
              Qty: Number(v.qty) || 0,
            }));

          setData(mapped);
          setCleanData(mapped);
        } else {
          setData([]);
          setCleanData([]);
        }

        setLoading(false);
      } catch (err) {
        console.error("Error loading:", err);
        setData([]);
        setCleanData([]);
        setLoading(false);
      }
    };

    load();
  }, []);

  // ==========================================
  // AGGREGATION HELPERS
  // ==========================================
  const groupSum = (rows, key) => {
    const out = {};
    rows.forEach((r) => {
      const k = r[key] || "Unknown";
      const amt = Number(r.Amount) || 0;
      if (!out[k]) out[k] = 0;
      out[k] += amt;
    });
    return Object.entries(out)
      .map(([k, v]) => ({ label: k, amount: v }))
      .sort((a, b) => b.amount - a.amount);
  };

  const totalSales = useMemo(
    () => cleanData.reduce((sum, r) => sum + Number(r.Amount || 0), 0),
    [cleanData]
  );

  const topSalesmen = groupSum(cleanData, "Salesman").slice(0, 5);
  const topCities = groupSum(cleanData, "CityArea").slice(0, 5);
  const categoryAgg = groupSum(cleanData, "ItemCategory");
  const salesmanAgg = groupSum(cleanData, "Salesman");

  // ==========================================
  // CHART DATA
  // ==========================================
  const makeBarChart = (labels, values, label) => ({
    labels,
    datasets: [
      {
        label,
        data: values,
        backgroundColor: "#22d3ee",
      },
    ],
  });

  // ==========================================
  // UI START
  // ==========================================

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center text-white">
        Loading Company Hierarchy...
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0a1628] text-white p-4">
      <h2 className="text-2xl font-bold text-[#00f5ff] mb-6 flex items-center gap-2">
        🏢 Company Hierarchy & Pivot Summary
      </h2>

      {/* HEADER CARDS */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        {/* Top Salesmen */}
        <div className="bg-[#112233] p-4 rounded-lg border border-[#1e3553]">
          <h3 className="font-bold text-[#00f5ff] mb-2">👨‍💼 Top Salesmen</h3>
          {topSalesmen.length === 0 && (
            <p className="text-gray-400">No Data</p>
          )}
          <ul className="text-sm">
            {topSalesmen.map((r, i) => (
              <li key={i} className="flex justify-between py-1">
                <span>{r.label}</span>
                <span className="text-[#00f5ff]">
                  ₹{r.amount.toLocaleString("en-IN")}
                </span>
              </li>
            ))}
          </ul>
        </div>

        {/* Top Cities */}
        <div className="bg-[#112233] p-4 rounded-lg border border-[#1e3553]">
          <h3 className="font-bold text-[#00f5ff] mb-2">📍 Top Cities</h3>
          {topCities.length === 0 && <p className="text-gray-400">No Data</p>}
          <ul className="text-sm">
            {topCities.map((r, i) => (
              <li key={i} className="flex justify-between py-1">
                <span>{r.label}</span>
                <span className="text-[#00f5ff]">
                  ₹{r.amount.toLocaleString("en-IN")}
                </span>
              </li>
            ))}
          </ul>
        </div>

        {/* Net Total Sales */}
        <div className="bg-[#112233] p-4 rounded-lg border border-[#1e3553] text-center">
          <h3 className="font-bold text-[#00f5ff] mb-2">💰 Net Total Sales</h3>
          <p className="text-3xl text-[#00f5ff] font-bold">
            ₹{totalSales.toLocaleString("en-IN")}
          </p>
        </div>
      </div>

      {/* CHARTS */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        {/* Category Wise */}
        <div className="bg-[#112233] p-4 rounded-lg border border-[#1e3553]">
          <h3 className="font-bold text-[#00f5ff] mb-2">Item Category Wise</h3>
          <Bar
            data={makeBarChart(
              categoryAgg.map((r) => r.label),
              categoryAgg.map((r) => r.amount),
              "Net Sales (₹)"
            )}
            height={180}
          />
        </div>

        {/* Salesman Wise */}
        <div className="bg-[#112233] p-4 rounded-lg border border-[#1e3553]">
          <h3 className="font-bold text-[#00f5ff] mb-2">Salesman Wise</h3>
          <Bar
            data={makeBarChart(
              salesmanAgg.map((r) => r.label),
              salesmanAgg.map((r) => r.amount),
              "Net Sales (₹)"
            )}
            height={180}
          />
        </div>

        {/* City Wise */}
        <div className="bg-[#112233] p-4 rounded-lg border border-[#1e3553]">
          <h3 className="font-bold text-[#00f5ff] mb-2">City Wise</h3>
          <Bar
            data={makeBarChart(
              topCities.map((r) => r.label),
              topCities.map((r) => r.amount),
              "Net Sales (₹)"
            )}
            height={180}
          />
        </div>
      </div>

      {/* FULL DATA HIERARCHY SECTION */}
      <div className="bg-[#112233] p-4 rounded-lg border border-[#1e3553]">
        <h3 className="font-bold text-[#00f5ff] text-lg mb-3">
          🌲 Detailed Company Hierarchy
        </h3>

        <table className="w-full text-xs">
          <thead className="bg-[#132a4a] text-[#00f5ff] sticky top-0">
            <tr>
              <th className="p-2">Date</th>
              <th className="p-2">Party</th>
              <th className="p-2">Salesman</th>
              <th className="p-2">Item</th>
              <th className="p-2">Category</th>
              <th className="p-2">Group</th>
              <th className="p-2">City</th>
              <th className="p-2">Qty</th>
              <th className="p-2">Amount</th>
            </tr>
          </thead>

          <tbody>
            {cleanData.map((r, i) => (
              <tr
                key={i}
                className={i % 2 === 0 ? "bg-[#0f1e33]" : "bg-[#112233]"}
              >
                <td className="p-2">{r.Date}</td>
                <td className="p-2">{r.PartyName}</td>
                <td className="p-2 text-yellow-300">{r.Salesman}</td>
                <td className="p-2">{r.ItemName}</td>
                <td className="p-2">{r.ItemCategory}</td>
                <td className="p-2">{r.ItemGroup}</td>
                <td className="p-2">{r.CityArea}</td>
                <td className="p-2">{r.Qty}</td>
                <td className="p-2 text-[#00f5ff]">
                  ₹{r.Amount.toLocaleString("en-IN")}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
