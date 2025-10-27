// src/pages/Dashboard.jsx
import React, { useEffect, useState, useMemo, useRef } from "react";
import { Line, Bar } from "react-chartjs-2";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
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
  Title,
  Tooltip,
  Legend
);
import { useAuth } from "../context/AuthContext";
import config from "../config.js";

import { useData } from "../context/DataContext";



export default function Dashboard() {
  const [excelData, setExcelData] = useState([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [modalContent, setModalContent] = useState({ title: "", columns: [], data: [] });
  const [filterCategory, setFilterCategory] = useState("");

const { user } = useAuth();     // ⬅️ add
  const isLoggedIn = !!user;      // ⬅️ add

// ✅ FINAL UNIVERSAL FETCH BLOCK (Unified backend + decompression compatible)
useEffect(() => {
  const fetchData = async () => {
    try {
      const backendURL =
        window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1"
          ? "http://127.0.0.1:8787"
          : config.BACKEND_URL || "https://replica-backend.shoabahmad68.workers.dev";

      console.log("📡 Fetching securely from:", `${backendURL}/api/imports/latest`);
      const res = await fetch(`${backendURL}/api/imports/latest`);
      const json = await res.json();
      console.log("✅ Backend Connected Successfully:", json);

      // ✅ Helper for decompression
      async function decompressBase64(b64) {
        const binary = Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
        const ds = new DecompressionStream("gzip");
        const ab = await new Response(new Blob([binary]).stream().pipeThrough(ds)).arrayBuffer();
        return new TextDecoder().decode(ab);
      }

      // ✅ Helper to parse XML into rows
      function parseXML(xml) {
        if (!xml || !xml.includes("<VOUCHER")) return [];
        const vouchers = xml.match(/<VOUCHER[\s\S]*?<\/VOUCHER>/gi) || [];
        const rows = [];
        for (const v of vouchers) {
          const getTag = (t) => {
            const m = v.match(new RegExp(`<${t}[^>]*>([\\s\\S]*?)<\\/${t}>`, "i"));
            return m ? m[1].trim() : "";
          };
          rows.push({
            "Voucher Type": getTag("VOUCHERTYPENAME"),
            Date: getTag("DATE"),
            Party: getTag("PARTYNAME"),
            Item: getTag("STOCKITEMNAME"),
            Qty: getTag("BILLEDQTY"),
            Amount: getTag("AMOUNT"),
            Salesman: getTag("BASICSALESNAME"),
          });
        }
        return rows;
      }

      // ✅ If compressed XML exists
      if (json?.compressed && (json.salesXml || json.purchaseXml || json.mastersXml)) {
        const salesXml = json.salesXml ? await decompressBase64(json.salesXml) : "";
        const purchaseXml = json.purchaseXml ? await decompressBase64(json.purchaseXml) : "";
        const mastersXml = json.mastersXml ? await decompressBase64(json.mastersXml) : "";

        const parsed = [
          ...parseXML(salesXml),
          ...parseXML(purchaseXml),
          ...parseXML(mastersXml),
        ];
        if (parsed.length) {
          console.log(`✅ Loaded ${parsed.length} unified records.`);
          setExcelData(parsed);
          localStorage.setItem("uploadedExcelData", JSON.stringify(parsed));
          return;
        }
      }

      // ✅ If already JSON data
      const possibleData = json?.rows || json?.data?.rows || json?.data || [];
      if (Array.isArray(possibleData) && possibleData.length > 0) {
        setExcelData(possibleData);
        localStorage.setItem("uploadedExcelData", JSON.stringify(possibleData));
        return;
      }

      // ✅ Fallback (load saved)
      const saved = localStorage.getItem("uploadedExcelData");
      if (saved) setExcelData(JSON.parse(saved));
    } catch (err) {
      console.error("❌ Error loading dashboard data:", err);
      const saved = localStorage.getItem("uploadedExcelData");
      if (saved) setExcelData(JSON.parse(saved));
    }
  };

  fetchData();
}, []);


  const toNumber = (v) => parseFloat(String(v || "").replace(/[^0-9.-]/g, "")) || 0;
  const fmt = (v) =>
    `₹${Number(v || 0).toLocaleString("en-IN", { maximumFractionDigits: 0 })}`;

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
      ) {
        return true;
      }
      if (checkValues.every((v) => v === "")) return true;
      return false;
    } catch {
      return false;
    }
  };

  const cleanData = useMemo(() => excelData.filter((r) => !isTotalRow(r)), [excelData]);

const colValue = (r, col) => {
  if (!r) return "";
  const mapNames = {
    "ItemName": ["Item Name", "ItemName", "Item", "Product", "Product Name"],
    "Item Group": ["Item Group", "ItemGroup", "Group", "Product Group"],
    "Item Category": ["Item Category", "Category", "Product Category", "Item Category Name"],
    "Party Name": ["Party Name", "Party", "Customer", "Dealer"],
    "Salesman": ["Salesman", "ASM", "Employee"],
    "City/Area": ["City/Area", "City", "Area", "Location"],
  };

  let val = "";
  if (mapNames[col]) {
    for (const k of mapNames[col]) {
      if (r[k] && String(r[k]).trim() && r[k] !== "-" && r[k] !== "Unknown") {
        val = String(r[k]).trim();
        break;
      }
    }
  }
  if (!val && r[col] && r[col] !== "-" && r[col] !== "Unknown") val = String(r[col]).trim();
  return val || "";
};

const aggregateData = (col1, col2) => {
  const rows = cleanData.filter((r) =>
    filterCategory
      ? colValue(r, "Item Category") === filterCategory
      : true
  );

  const combined = {};
  rows.forEach((r) => {
    const c1 = colValue(r, col1);
    const c2 = colValue(r, col2);
    const amt = toNumber(r["Amount"] || 0);
    if (!c1 || !c2) return; // skip blank or unknown

    const key = `${c1}||${c2}`;
    if (!combined[key]) {
      combined[key] = { [col1]: c1, [col2]: c2, Amount: 0 };
    }
    combined[key].Amount += amt;
  });

  return Object.values(combined).sort((a, b) => b.Amount - a.Amount);
};

    const merged = {};
    Object.values(combined).forEach((row) => {
      const party = row[col1];
      const cat = row[col2];
      const amt = row.Amount;
      if (!merged[party]) merged[party] = {};
      if (!merged[party][cat]) merged[party][cat] = 0;
      merged[party][cat] += amt;
    });

    const finalData = [];
    for (const [party, cats] of Object.entries(merged)) {
      for (const [cat, amt] of Object.entries(cats)) {
        finalData.push({
          [col1]: party,
          [col2]: cat,
          Amount: amt,
        });
      }
    }

    return finalData.sort((a, b) => b.Amount - a.Amount);
  };

  const totalSales = useMemo(
    () => cleanData.reduce((s, r) => s + toNumber(r["Amount"] || 0), 0),
    [cleanData]
  );

  const uniqueProducts = useMemo(
    () =>
      Array.from(
        new Set(
          cleanData
            .map((r) => (colValue(r, "Item Category") || "").toString().trim())
            .filter(Boolean)
        )
      ),
    [cleanData]
  );

  const monthlySales = [15, 25, 20, 32, 28, 35];
  const monthLabels = ["Jan", "Feb", "Mar", "Apr", "May", "Jun"];

  const modalRef = useRef();

  const exportCSV = (title, columns, data) => {
    const csv = [
      columns.join(","),
      ...data.map((r) => columns.map((c) => (r[c] || "").toString().replace(/,/g, " ")).join(",")),
    ].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${title}.csv`;
    a.click();
  };

  const exportExcel = (title, columns, data) => {
    const ws = XLSX.utils.json_to_sheet(
      data.map((row) => {
        const out = {};
        columns.forEach((c) => (out[c] = row[c] || ""));
        return out;
      })
    );
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


if (!isLoggedIn) {
  return (
    <div className="flex flex-col items-center justify-center h-screen text-center text-gray-200">
      <img src="/logo.png" alt="logo" className="w-80 mb-4 opacity-100" />
      <h1 className="text-3xl font-bold text-[#64FFDA] mb-2">Welcome to MARS</h1>
      <p className="text-gray-400">Please login to access reports and analytics.</p>
    </div>
  );
}




   // ---------- UI ----------
  return (
    <div className="p-6 min-h-screen bg-gradient-to-br from-[#0A192F] via-[#112240] to-[#0A192F] text-gray-100 animate-fadeIn">
      <div className="max-w-7xl mx-auto bg-[#1B2A4A] rounded-2xl shadow-2xl border border-[#223355] p-6">
        <h2 className="text-2xl font-bold text-[#64FFDA] mb-6 tracking-wide">
          📊 DASHBOARD OVERVIEW
        </h2>

        {/* Summary Cards */}
        <div className="grid sm:grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-gradient-to-r from-[#3B82F6] to-[#2563EB] text-white p-4 rounded-xl shadow-lg border border-[#334155] animate-slideUp">
            <p className="text-sm opacity-90">Total Sales</p>
            <h3 className="text-2xl font-bold mt-1">{fmt(totalSales)}</h3>
          </div>

          <div className="bg-gradient-to-r from-[#059669] to-[#10B981] text-white p-4 rounded-xl shadow-lg border border-[#334155] animate-slideUp">
            <p className="text-sm opacity-90">Total Products</p>
            <h3 className="text-2xl font-bold mt-1">{uniqueProducts.length}</h3>
          </div>

          <div className="bg-gradient-to-r from-[#0EA5A4] to-[#14B8A6] text-white p-4 rounded-xl shadow-lg border border-[#334155] animate-slideUp">
            <p className="text-sm opacity-90">Performance Index</p>
            <h3 className="text-2xl font-bold mt-1">
              {fmt(totalSales / Math.max(1, 30))}
            </h3>
          </div>

          <div className="bg-gradient-to-r from-[#F43F5E] to-[#EC4899] text-white p-4 rounded-xl shadow-lg border border-[#334155] animate-slideUp">
            <p className="text-sm opacity-90">Average Daily Sale</p>
            <h3 className="text-2xl font-bold mt-1">{fmt(totalSales / 30)}</h3>
          </div>
        </div>




{/* ---------- CHARTS ROW (UPDATED) ---------- */}
{/* ---------- CHARTS ROW (1x3 + 1x2 GRID FINAL LAYOUT) ---------- */}

{/* 🔹 First Row — 1 Small + 1 Wide Chart */}
{/* ---------- CHARTS ROW (Dark Theme Polished) ---------- */}
{/* ---------- SMART CHARTS SECTION (Data-driven) ---------- */}

<div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">

  {/* 1️⃣ Sales Trend (Month-wise Line Chart) */}
  {(() => {
    const monthlyAgg = {};
    cleanData.forEach((r) => {
      const dateStr = r["Date"] || r["Voucher Date"] || r["Inv Date"] || "";
      const d = new Date(dateStr);
      if (isNaN(d)) return;
      const month = d.toLocaleString("en-IN", { month: "short" });
      monthlyAgg[month] = (monthlyAgg[month] || 0) + toNumber(r["Amount"]);
    });

    const labels = Object.keys(monthlyAgg).length
      ? Object.keys(monthlyAgg)
      : ["Jan", "Feb", "Mar", "Apr", "May", "Jun"];
    const values = Object.keys(monthlyAgg).length
      ? Object.values(monthlyAgg)
      : [15, 25, 20, 32, 28, 35];

    return (
      <div className="bg-[#16223B] rounded-xl p-4 shadow-lg border border-[#223355] h-[230px] md:col-span-1">
        <h4 className="text-sm font-semibold text-[#64FFDA] mb-2 flex items-center gap-1">
          📈 Sales Trend
        </h4>
        <Line
          data={{
            labels,
            datasets: [
              {
                label: "Total Sales (₹)",
                data: values,
                borderColor: "#64FFDA",
                backgroundColor: "rgba(100,255,218,0.15)",
                tension: 0.4,
                fill: true,
              },
            ],
          }}
          options={{
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { display: false } },
            scales: {
              x: { ticks: { color: "#9CA3AF" }, grid: { color: "#1E293B" } },
              y: { ticks: { color: "#9CA3AF" }, grid: { color: "#1E293B" } },
            },
          }}
        />
      </div>
    );
  })()}

  {/* 2️⃣ Company-wise Sales (Bar Chart) */}
  {(() => {
    const companyAgg = {};
    cleanData.forEach((r) => {
      const comp = colValue(r, "Item Category") || "Unknown";
      companyAgg[comp] = (companyAgg[comp] || 0) + toNumber(r["Amount"]);
    });

    const labels = Object.keys(companyAgg);
    const values = Object.values(companyAgg);

    return (
      <div className="bg-[#16223B] rounded-xl p-4 shadow-lg border border-[#223355] h-[230px] md:col-span-3">
        <h4 className="text-sm font-semibold text-[#64FFDA] mb-2 flex items-center gap-1">
          🏢 Company-wise Sales
        </h4>
        <Bar
          data={{
            labels,
            datasets: [
              {
                label: "Amount (₹)",
                data: values,
                backgroundColor: [
                  "#60A5FA",
                  "#10B981",
                  "#F59E0B",
                  "#A78BFA",
                  "#F472B6",
                  "#F87171",
                  "#4ADE80",
                ],
                borderRadius: 6,
              },
            ],
          }}
          options={{
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
              legend: { display: false },
              tooltip: {
                callbacks: {
                  label: (ctx) => `₹${ctx.raw.toLocaleString("en-IN")}`,
                },
              },
            },
            scales: {
              x: { ticks: { color: "#E5E7EB" }, grid: { color: "#1E293B" } },
              y: { ticks: { color: "#E5E7EB" }, grid: { color: "#1E293B" } },
            },
          }}
        />
      </div>
    );
  })()}
</div>

{/* 3️⃣ Product-wise Sales + Quantity */}
<div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">

  {/* Product-wise Sales */}
  {(() => {
    const prodAgg = {};
    cleanData.forEach((r) => {
      const item = colValue(r, "ItemName");
      prodAgg[item] = (prodAgg[item] || 0) + toNumber(r["Amount"]);
    });

    const labels = Object.keys(prodAgg).slice(0, 20);
    const values = Object.values(prodAgg).slice(0, 20);

    return (
      <div className="bg-[#0F1E33] rounded-xl p-4 shadow-lg border border-[#1E2D45] h-[300px]">
        <h4 className="text-sm font-semibold text-[#64FFDA] mb-3 flex items-center gap-1">
          📦 Product-wise Sales
        </h4>
        <Bar
          data={{
            labels,
            datasets: [
              {
                label: "Amount (₹)",
                data: values,
                backgroundColor: "rgba(59,130,246,0.8)",
                borderColor: "#60A5FA",
                borderWidth: 1,
                borderRadius: 5,
              },
            ],
          }}
          options={{
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { display: false } },
            scales: {
              x: { ticks: { color: "#9CA3AF" }, grid: { color: "#1E2A40" } },
              y: { ticks: { color: "#9CA3AF" }, grid: { color: "#1E2A40" } },
            },
          }}
        />
      </div>
    );
  })()}

  {/* Product-wise Quantity */}
  {(() => {
    const qtyAgg = {};
    cleanData.forEach((r) => {
      const item = colValue(r, "ItemName");
      qtyAgg[item] = (qtyAgg[item] || 0) + toNumber(r["Qty"] || r["Quantity"]);
    });

    const labels = Object.keys(qtyAgg).slice(0, 20);
    const values = Object.values(qtyAgg).slice(0, 20);

    return (
      <div className="bg-[#0F1E33] rounded-xl p-4 shadow-lg border border-[#1E2D45] h-[300px]">
        <h4 className="text-sm font-semibold text-[#64FFDA] mb-3 flex items-center gap-1">
          📊 Product-wise Quantity
        </h4>
        <Bar
          data={{
            labels,
            datasets: [
              {
                label: "Quantity",
                data: values,
                backgroundColor: "rgba(16,185,129,0.85)",
                borderColor: "#10B981",
                borderRadius: 5,
              },
            ],
          }}
          options={{
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { display: false } },
            scales: {
              x: { ticks: { color: "#9CA3AF" }, grid: { color: "#1E2A40" } },
              y: { ticks: { color: "#9CA3AF" }, grid: { color: "#1E2A40" } },
            },
          }}
        />
      </div>
    );
  })()}
</div>



{/* ---------- TOP PERFORMERS SUMMARY SECTION ---------- */}
<div className="mt-8">
  <h2 className="text-2xl font-bold text-[#64FFDA] mb-4 tracking-wide border-b border-[#1E2D45] pb-2">
    🏆 TOP PERFORMERS SUMMARY
  </h2>

  <div className="grid md:grid-cols-2 xl:grid-cols-4 gap-6">

    {/* 🔹 Top 3 Companies */}
    {(() => {
      const companyAgg = {};
      cleanData.forEach((r) => {
        const comp = colValue(r, "Item Category") || "Unknown";
        companyAgg[comp] = (companyAgg[comp] || 0) + toNumber(r["Amount"]);
      });
      const topCompanies = Object.entries(companyAgg)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 3);

      return (
        <div className="bg-[#0D1B2A] rounded-xl p-4 border border-[#1E2D45] shadow-lg hover:shadow-[#64FFDA]/30 transition">
          <h4 className="text-[#64FFDA] font-semibold text-sm mb-3">🏢 Top Companies</h4>
          {topCompanies.length === 0 && <p className="text-gray-400 text-sm">No data</p>}
          <ul className="space-y-1 text-gray-200 text-sm">
            {topCompanies.map(([name, val], i) => (
              <li key={i} className="flex justify-between border-b border-[#1E2D45]/50 pb-1">
                <span className="truncate w-2/3">{i + 1}. {name}</span>
                <span className="text-[#64FFDA] font-semibold">₹{val.toLocaleString("en-IN")}</span>
              </li>
            ))}
          </ul>
        </div>
      );
    })()}

    {/* 🔹 Top 3 Products */}
    {(() => {
      const prodAgg = {};
      cleanData.forEach((r) => {
        const prod = colValue(r, "ItemName") || "Unknown";
        prodAgg[prod] = (prodAgg[prod] || 0) + toNumber(r["Amount"]);
      });
      const topProducts = Object.entries(prodAgg)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 3);

      return (
        <div className="bg-[#0D1B2A] rounded-xl p-4 border border-[#1E2D45] shadow-lg hover:shadow-[#64FFDA]/30 transition">
          <h4 className="text-[#64FFDA] font-semibold text-sm mb-3">📦 Top Products</h4>
          {topProducts.length === 0 && <p className="text-gray-400 text-sm">No data</p>}
          <ul className="space-y-1 text-gray-200 text-sm">
            {topProducts.map(([name, val], i) => (
              <li key={i} className="flex justify-between border-b border-[#1E2D45]/50 pb-1">
                <span className="truncate w-2/3">{i + 1}. {name}</span>
                <span className="text-[#64FFDA] font-semibold">₹{val.toLocaleString("en-IN")}</span>
              </li>
            ))}
          </ul>
        </div>
      );
    })()}

    {/* 🔹 Top 3 Salesmen */}
    {(() => {
      const salesAgg = {};
      cleanData.forEach((r) => {
        const sm = colValue(r, "Salesman") || "Unknown";
        salesAgg[sm] = (salesAgg[sm] || 0) + toNumber(r["Amount"]);
      });
      const topSalesmen = Object.entries(salesAgg)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 3);

      return (
        <div className="bg-[#0D1B2A] rounded-xl p-4 border border-[#1E2D45] shadow-lg hover:shadow-[#64FFDA]/30 transition">
          <h4 className="text-[#64FFDA] font-semibold text-sm mb-3">🧑‍💼 Top Salesmen</h4>
          {topSalesmen.length === 0 && <p className="text-gray-400 text-sm">No data</p>}
          <ul className="space-y-1 text-gray-200 text-sm">
            {topSalesmen.map(([name, val], i) => (
              <li key={i} className="flex justify-between border-b border-[#1E2D45]/50 pb-1">
                <span className="truncate w-2/3">{i + 1}. {name}</span>
                <span className="text-[#64FFDA] font-semibold">₹{val.toLocaleString("en-IN")}</span>
              </li>
            ))}
          </ul>
        </div>
      );
    })()}

    {/* 🔹 Top 3 Areas */}
    {(() => {
      const areaAgg = {};
      cleanData.forEach((r) => {
        const city = colValue(r, "City/Area") || "Unknown";
        areaAgg[city] = (areaAgg[city] || 0) + toNumber(r["Amount"]);
      });
      const topAreas = Object.entries(areaAgg)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 3);

      return (
        <div className="bg-[#0D1B2A] rounded-xl p-4 border border-[#1E2D45] shadow-lg hover:shadow-[#64FFDA]/30 transition">
          <h4 className="text-[#64FFDA] font-semibold text-sm mb-3">🌆 Top Areas</h4>
          {topAreas.length === 0 && <p className="text-gray-400 text-sm">No data</p>}
          <ul className="space-y-1 text-gray-200 text-sm">
            {topAreas.map(([name, val], i) => (
              <li key={i} className="flex justify-between border-b border-[#1E2D45]/50 pb-1">
                <span className="truncate w-2/3">{i + 1}. {name}</span>
                <span className="text-[#64FFDA] font-semibold">₹{val.toLocaleString("en-IN")}</span>
              </li>
            ))}
          </ul>
        </div>
      );
    })()}

  </div>
</div>



        {/* ---------- SUMMARISED REPORTS ---------- */}
        <div className="mt-8">
          <h2 className="text-2xl font-bold text-[#64FFDA] mb-4 tracking-wide border-b border-[#1E2D45] pb-2">
  📊 SUMMARISED REPORT'S
</h2>


          {/* Filter */}
          <div className="mb-6 flex items-center gap-3 bg-[#0D1B2A] border border-[#1E2D45] rounded-lg p-3 shadow-inner">
  <label className="font-semibold text-[#64FFDA]">Filter by Item Category:</label>
  <select
    className="bg-[#112A45] text-gray-200 border border-[#1E2D45] rounded px-3 py-1 focus:outline-none focus:ring-2 focus:ring-[#64FFDA] transition"
    value={filterCategory || ""}
    onChange={(e) => setFilterCategory(e.target.value)}
  >
    <option value="">All</option>
    {Array.from(
      new Set(cleanData.map((r) => colValue(r, "Item Category")).filter(Boolean))
    ).map((cat, i) => (
      <option key={i} value={cat}>
        {cat}
      </option>
    ))}
  </select>
</div>


          <div className="grid md:grid-cols-2 xl:grid-cols-2 gap-6 mb-6">
            <ReportCard
              title="Party Wise Sales Report"
              columns={["Party Name", "Item Category", "Amount"]}
              data={aggregateData("Party Name", "Item Category")}
              onView={() => openViewModal("Party Wise Sales Report", ["Party Name", "Item Category", "Amount"], aggregateData("Party Name", "Item Category"))}
            />
            <ReportCard
              title="ASM Wise Sales Report"
              columns={["Salesman", "Item Category", "Amount"]}
              data={aggregateData("Salesman", "Item Category")}
              onView={() => openViewModal("ASM Wise Sales Report", ["Salesman", "Item Category", "Amount"], aggregateData("Salesman", "Item Category"))}
            />
          </div>
	  <div className="grid md:grid-cols-2 xl:grid-cols-2 gap-6 mb-6">
            <ReportCard
              title="Area Wise Sales Report"
              columns={["City/Area", "Item Category", "Amount"]}
              data={aggregateData("City/Area", "Item Category")}
              onView={() => openViewModal("Area Wise Sales Report", ["City/Area", "Item Category", "Amount"], aggregateData("City/Area", "Item Category"))}
            />
            <ReportCard
              title="Product Wise Sales Report"
              columns={["ItemName", "Item Group", "Amount"]}
              data={aggregateData("ItemName", "Item Group")}
              onView={() => openViewModal("Product Wise Sales Report", ["ItemName", "Item Group", "Amount"], aggregateData("ItemName", "Item Group"))}
            />
	  </div>
	  <div className="grid md:grid-cols-1 xl:grid-cols-1 gap-6 mb-6">
            <ReportCard
              title="Item Group Wise Sales Report"
              columns={["Item Group", "Item Category", "Amount"]}
              data={aggregateData("Item Group", "Item Category")}
              onView={() => openViewModal("Item Group Wise Sales Report", ["Item Group", "Item Category", "Amount"], aggregateData("Item Group", "Item Category"))}
            />
          </div>
        </div>
      </div>

{/* ---------- Modal (responsive + blur + full feature table) ---------- */}
{modalOpen && (
  <div className="fixed inset-0 z-50 flex items-start justify-center pt-10">
    <div
      className="absolute inset-0 bg-black/50 backdrop-blur-sm"
      onClick={() => setModalOpen(false)}
    />
    <div
      ref={modalRef}
      className="relative w-[94%] max-w-6xl bg-[#0D1B2A]/90 backdrop-blur-lg rounded-2xl shadow-[0_0_30px_rgba(100,255,218,0.2)] border border-[#1E2D45] p-6 z-60 text-gray-100"
    >
      {/* Header */}
      <div className="flex justify-between items-center mb-4 border-b pb-3">
        <h3 className="text-2xl font-bold text-[#64FFDA] tracking-wide">
          {modalContent.title}
        </h3>
        <button
          onClick={() => setModalOpen(false)}
          className="bg-red-500 text-white rounded-full w-9 h-9 flex items-center justify-center hover:bg-red-600 transition"
        >
          ✕
        </button>
      </div>

      {/* Table View */}
      <div className="flex flex-col md:flex-row gap-6">
        <div
          id="modal-scroll"
          className="flex-1 max-h-[65vh] overflow-auto border border-[#1E2D45] rounded-xl p-4 bg-[#0F1E33] shadow-inner"
        >
          <table className="w-full text-sm border-collapse">
            <thead className="bg-[#102C46] text-[#64FFDA] sticky top-0">
              <tr>
                <th className="px-3 py-2 text-left">{modalContent.columns[0]}</th>
                <th className="px-3 py-2 text-left">{modalContent.columns[1]}</th>
                <th className="px-3 py-2 text-right">{modalContent.columns[2]}</th>
              </tr>
            </thead>
            <tbody>
              {(modalContent.data || []).slice(0, 20).map((r, i) => (
                <tr
                  key={i}
                  className={`${
                    i % 2 === 0 ? "bg-[#13253E]" : "bg-[#1A2E4A]"
                  } hover:bg-[#1B3C55] text-gray-100`}
                >
                  <td className="px-3 py-2">{r[modalContent.columns[0]] || "-"}</td>
                  <td className="px-3 py-2">{r[modalContent.columns[1]] || "-"}</td>
                  <td className="px-3 py-2 text-right text-[#64FFDA]">
                    ₹{Number(r.Amount || 0).toLocaleString("en-IN")}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Options Panel */}
        <aside className="w-[280px] bg-[#102C46] border border-[#1E2D45] rounded-xl p-4 shadow-md text-gray-100">
          <h4 className="font-semibold text-[#64FFDA] mb-3 flex items-center gap-2">
            ⚙️ विकल्प
          </h4>
          <div className="flex flex-col gap-3">
            <button
              className="w-full bg-[#059669] text-white py-2 rounded hover:bg-[#047857] transition"
            >
              📄 Export PDF
            </button>
            <button
              className="w-full bg-[#2563EB] text-white py-2 rounded hover:bg-[#1D4ED8] transition"
            >
              📊 Export Excel
            </button>
            <button
              className="w-full bg-[#334155] text-white py-2 rounded hover:bg-[#1E293B] transition"
            >
              📁 Export CSV
            </button>
          </div>

          <div className="text-sm text-gray-300 mt-4 border-t border-[#1E2D45] pt-3">
            <strong>Rows shown:</strong>{" "}
            {modalContent.data ? Math.min(modalContent.data.length, 20) : 0}
            <br />
            <strong>Filter:</strong> {filterCategory || "All"}
          </div>
          </aside>
</div>
    </div>
  </div>
)
} // ✅ यह Dashboard function को properly बंद करता है

/* ---------- REUSABLE REPORT CARD COMPONENT ---------- */
function ReportCard({ title, columns, data, onView }) {
  const fmt = (v) => `₹${Number(v || 0).toLocaleString("en-IN", { maximumFractionDigits: 0 })}`;

  const exportCSV = () => {
    const csv = [
      columns.join(","),
      ...data.map((r) =>
        columns.map((c) => (r[c] || "").toString().replace(/,/g, " ")).join(",")
      ),
    ].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${title}.csv`;
    a.click();
  };

  const exportExcel = () => {
    const ws = XLSX.utils.json_to_sheet(
      data.map((row) => {
        const out = {};
        columns.forEach((c) => (out[c] = row[c] || ""));
        return out;
      })
    );
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Report");
    XLSX.writeFile(wb, `${title}.xlsx`);
  };

  return (
    <div className="bg-[#0D1B2A] rounded-xl p-4 shadow-[0_0_10px_rgba(100,255,218,0.15)] border border-[#1E2D45] hover:shadow-[0_0_20px_rgba(100,255,218,0.25)] transition-transform duration-300 hover:scale-[1.01]">
      <div className="flex justify-between items-center mb-3 border-b border-[#1E2D45] pb-2">
        <h4 className="text-[#64FFDA] font-semibold tracking-wide">{title}</h4>
        <div className="flex gap-2">
          <button onClick={exportCSV} className="bg-indigo-600 text-white text-xs px-3 py-1 rounded">
            Export CSV
          </button>
          <button onClick={exportExcel} className="bg-blue-600 text-white text-xs px-3 py-1 rounded">
            Export XLSX
          </button>
          <button onClick={onView} className="bg-rose-500 text-white text-xs px-3 py-1 rounded">
            View
          </button>
        </div>
      </div>

      <div className="overflow-auto max-h-64 border rounded">
        <table className="w-full text-sm">
          <thead className="bg-[#0B2545] text-[#64FFDA] uppercase text-xs tracking-wider sticky top-0 shadow-lg">
            <tr>
              {columns.map((c, i) => (
                <th
                  key={i}
                  className={`px-3 py-2 text-left font-semibold ${
                    i === columns.length - 1 ? "text-right" : ""
                  }`}
                >
                  {c}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.length === 0 && (
              <tr>
                <td colSpan={columns.length} className="text-center py-3 text-gray-400">
                  No Data Found
                </td>
              </tr>
            )}
            {data.slice(0, 20).map((row, i) => (
              <tr
                key={i}
                className={`${
                  i % 2 === 0 ? "bg-[#0F1E33]" : "bg-[#13253E]"
                } hover:bg-[#1C3F57] transition text-gray-100 border-b border-[#1E2D45]`}
              >
                {columns.map((c, j) => (
                  <td
                    key={j}
                    className={`px-3 py-2 ${
                      j === columns.length - 1 ? "text-right text-[#64FFDA]" : ""
                    }`}
                  >
                    {c === "Amount" ? fmt(row[c]) : row[c] || "-"}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

