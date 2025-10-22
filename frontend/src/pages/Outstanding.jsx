// src/pages/Outstanding.jsx
import React, { useEffect, useState } from "react";
import axios from "axios";
import { Bar, Pie, Line } from "react-chartjs-2";
import config from "../config.js";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  ArcElement,
  Tooltip,
  Legend,
  Title,
} from "chart.js";
import {
  Search,
  Calendar,
  Filter,
  CheckCircle,
  Bell,
  FileSpreadsheet,
} from "lucide-react";

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  ArcElement,
  Tooltip,
  Legend,
  Title
);

export default function Outstanding() {
  const [excelData, setExcelData] = useState([]);
  const [filtered, setFiltered] = useState([]);
  const [filters, setFilters] = useState({
    search: "",
    status: "All",
  });

  useEffect(() => {
    fetchOutstanding();
  }, []);

  // 🔹 Load data from backend (same as other pages)


const fetchOutstanding = async () => {
  try {
    const res = await axios.get(`${config.BACKEND_URL}
/api/imports/latest`, {
      headers: { "Content-Type": "application/json" },
      withCredentials: false,
    });

    const jsonData = res.data?.data || [];
    const clean = jsonData.filter(
      (r) => !JSON.stringify(r).toLowerCase().includes("total")
    );

    const formatted = clean.map((r) => ({
      client: r["Party Name"] || "Unknown",
      invoice: r["Vch No"] || "N/A",
      dueDate: r["Date"] || "N/A",
      amount: parseFloat(r["Amount"]) || 0,
      city: r["City/Area"] || "N/A",
      salesman: r["Salesman"] || "N/A",
      status: parseFloat(r["Amount"]) > 0 ? "Pending" : "Settled",
    }));

    setExcelData(formatted);
    setFiltered(formatted);
  } catch (err) {
    console.error("❌ Error loading outstanding data:", err);
    const saved = localStorage.getItem("uploadedExcelData");
    if (saved) {
      const parsed = JSON.parse(saved);
      const clean = parsed.filter(
        (r) => !JSON.stringify(r).toLowerCase().includes("total")
      );
      const formatted = clean.map((r) => ({
        client: r["Party Name"] || "Unknown",
        invoice: r["Vch No"] || "N/A",
        dueDate: r["Date"] || "N/A",
        amount: parseFloat(r["Amount"]) || 0,
        city: r["City/Area"] || "N/A",
        salesman: r["Salesman"] || "N/A",
        status: parseFloat(r["Amount"]) > 0 ? "Pending" : "Settled",
      }));
      setExcelData(formatted);
      setFiltered(formatted);
    }
  }
};



  // 🔍 Filter Logic
  const handleFilter = () => {
    const s = filters.search.toLowerCase();
    const f = excelData.filter(
      (r) =>
        (r.client.toLowerCase().includes(s) ||
          r.invoice.toLowerCase().includes(s) ||
          r.city.toLowerCase().includes(s)) &&
        (filters.status === "All" || r.status === filters.status)
    );
    setFiltered(f);
  };

  useEffect(() => {
    handleFilter();
  }, [filters, excelData]);

  // 💰 Summary Calculations
  const totalOutstanding = filtered.reduce((sum, r) => sum + r.amount, 0);
  const totalClients = new Set(filtered.map((r) => r.client)).size;
  const oldestDue = filtered.sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate))[0];
  const recoveredThisMonth = Math.round(totalOutstanding * 0.2); // dummy calculation

  // 📊 Charts
  const monthlyTrend = {
    labels: filtered.slice(0, 8).map((r) => r.dueDate),
    datasets: [
      {
        label: "Outstanding (₹)",
        data: filtered.slice(0, 8).map((r) => r.amount),
        backgroundColor: "#3B82F6",
      },
    ],
  };

  const clientPie = {
    labels: filtered.slice(0, 10).map((r) => r.client),
    datasets: [
      {
        label: "Client-wise Outstanding",
        data: filtered.slice(0, 10).map((r) => r.amount),
        backgroundColor: [
          "#60A5FA",
          "#34D399",
          "#FBBF24",
          "#F472B6",
          "#8B5CF6",
          "#F87171",
          "#2DD4BF",
          "#22C55E",
          "#EAB308",
          "#C084FC",
        ],
      },
    ],
  };

  const recoveryTrend = {
    labels: ["Week 1", "Week 2", "Week 3", "Week 4"],
    datasets: [
      {
        label: "Outstanding (₹)",
        data: [50000, 42000, 38000, 35000],
        borderColor: "#EF4444",
        fill: false,
      },
      {
        label: "Recovered (₹)",
        data: [8000, 15000, 22000, 30000],
        borderColor: "#10B981",
        fill: false,
      },
    ],
  };

  return (
    <div className="p-6 min-h-screen bg-gradient-to-br from-[#0A192F] via-[#112240] to-[#0A192F] text-gray-100 animate-fadeIn">
      <div className="max-w-7xl mx-auto bg-[#1B2A4A] rounded-2xl shadow-2xl border border-[#223355] p-6">
        <h2 className="text-2xl font-bold text-[#64FFDA] mb-6 flex items-center gap-2">
          💼 Outstanding Dashboard
        </h2>

        {/* 🔹 Summary Cards */}
        <div className="grid sm:grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <SummaryCard title="Total Outstanding" value={totalOutstanding} color="from-blue-500 to-indigo-600" icon={<FileSpreadsheet />} />
          <SummaryCard title="Total Clients with Dues" value={totalClients} color="from-emerald-500 to-green-600" icon={<CheckCircle />} />
          <SummaryCard title="Oldest Due" value={`${oldestDue?.client || "-"} (${oldestDue?.dueDate || "-"})`} color="from-amber-500 to-yellow-600" icon={<Calendar />} />
          <SummaryCard title="Recovered This Month" value={recoveredThisMonth} color="from-pink-500 to-rose-600" icon={<Bell />} />
        </div>

        {/* 🔹 Filters */}
        <div className="flex flex-wrap gap-3 mb-6 items-center">
          <div className="flex items-center bg-[#0D1B34] px-3 py-2 rounded-lg w-full sm:w-auto">
            <Search size={16} className="text-[#64FFDA] mr-2" />
            <input
              type="text"
              placeholder="Search client, city or invoice..."
              className="bg-transparent text-sm text-gray-200 outline-none w-full"
              value={filters.search}
              onChange={(e) => setFilters({ ...filters, search: e.target.value })}
            />
          </div>

          <select
            value={filters.status}
            onChange={(e) => setFilters({ ...filters, status: e.target.value })}
            className="bg-[#0D1B34] text-gray-200 px-3 py-2 rounded-lg text-sm border border-[#1E2D50]"
          >
            {["All", "Pending", "Settled"].map((opt) => (
              <option key={opt}>{opt}</option>
            ))}
          </select>

          <button
            onClick={fetchOutstanding}
            className="flex items-center gap-2 bg-[#64FFDA]/10 border border-[#64FFDA]/40 text-[#64FFDA] font-semibold rounded-lg px-4 py-2 hover:bg-[#64FFDA]/20 transition"
          >
            <Filter size={16} /> Refresh Data
          </button>
        </div>

        {/* 🔹 Outstanding Table */}
        <div className="overflow-x-auto bg-[#0D1B34] rounded-lg border border-[#1E2D50] mb-8">
          <table className="min-w-full text-sm">
            <thead className="bg-[#132A4A] text-[#64FFDA] uppercase">
              <tr>
                <th className="p-3 text-left">Client</th>
                <th className="p-3 text-left">Invoice No</th>
                <th className="p-3 text-left">City</th>
                <th className="p-3 text-left">Salesman</th>
                <th className="p-3 text-left">Due Date</th>
                <th className="p-3 text-right">Amount</th>
                <th className="p-3 text-center">Status</th>
              </tr>
            </thead>
            <tbody>
              {filtered.slice(0, 20).map((r, i) => (
                <tr
                  key={i}
                  className={`${
                    i % 2 === 0 ? "bg-[#112240]" : "bg-[#0A192F]"
                  } hover:bg-[#1E2D50] transition`}
                >
                  <td className="p-3">{r.client}</td>
                  <td className="p-3">{r.invoice}</td>
                  <td className="p-3">{r.city}</td>
                  <td className="p-3">{r.salesman}</td>
                  <td className="p-3">{r.dueDate}</td>
                  <td className="p-3 text-right text-[#64FFDA] font-semibold">
                    ₹{r.amount.toLocaleString("en-IN")}
                  </td>
                  <td
                    className={`p-3 text-center font-semibold ${
                      r.status === "Pending"
                        ? "text-yellow-400"
                        : "text-green-400"
                    }`}
                  >
                    {r.status}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* 🔹 Graphs Section */}
        <div className="grid md:grid-cols-3 gap-6">
          <ChartCard title="Monthly Outstanding Trend" type="bar" data={monthlyTrend} />
          <ChartCard title="Client-wise Outstanding" type="pie" data={clientPie} />
          <ChartCard title="Recovery vs Outstanding" type="line" data={recoveryTrend} />
        </div>

        <div className="text-center text-xs text-gray-400 mt-8 border-t border-[#1E2D50] pt-3">
          Auto-generated from latest imported Excel file. "Total" rows are ignored automatically.
        </div>
      </div>
    </div>
  );
}

/* 🔹 Reusable Chart Card */
function ChartCard({ title, type, data }) {
  const ChartComp = type === "bar" ? Bar : type === "pie" ? Pie : Line;
  return (
    <div className="bg-[#112240] rounded-xl p-4 border border-[#223355] h-[260px] shadow hover:border-[#64FFDA]/50 transition">
      <h3 className="text-sm font-semibold mb-2 text-[#64FFDA]">{title}</h3>
      <div className="h-[200px]">
        <ChartComp data={data} options={{ maintainAspectRatio: false }} />
      </div>
    </div>
  );
}

/* 🔹 Reusable Summary Card */
function SummaryCard({ title, value, color, icon }) {
  return (
    <div
      className={`bg-gradient-to-r ${color} p-4 rounded-xl shadow-lg border border-[#334155] text-white flex flex-col justify-between`}
    >
      <div className="flex items-center justify-between mb-2">
        <h4 className="text-sm font-semibold opacity-90">{title}</h4>
        <div className="opacity-80">{icon}</div>
      </div>
      <h3 className="text-2xl font-bold">
        {typeof value === "number"
          ? `₹${value.toLocaleString("en-IN")}`
          : value}
      </h3>
    </div>
  );
}
