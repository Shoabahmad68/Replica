// frontend/src/pages/Analyst.jsx
// COMPLETE PROFESSIONAL VERSION - Same data as Dashboard + Tally-style billing

import React, { useEffect, useMemo, useState, useRef } from "react";
import { Line, Doughnut } from "react-chartjs-2";
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
import {
  FileSpreadsheet,
  RefreshCw,
  Download,
  Printer,
  Send,
  FileText,
  Eye,
  ChevronLeft,
  ChevronRight,
  X,
  Copy,
  Share2,
} from "lucide-react";

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

export default function Analyst() {
  const [rawData, setRawData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [activeSection, setActiveSection] = useState("dashboard");
  const [companyFilter, setCompanyFilter] = useState("All Companies");
  const [searchQ, setSearchQ] = useState("");
  const [invoiceModalOpen, setInvoiceModalOpen] = useState(false);
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const [printSize, setPrintSize] = useState("A4");
  const [autoRefresh, setAutoRefresh] = useState(false);
  const [lastSync, setLastSync] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const modalRef = useRef();
  const rowsPerPage = 20;

  // DIRECT BACKEND FETCH - SAME AS DASHBOARD (NO DUPLICATES)
  useEffect(() => {
    let cancelled = false;

    const fetchData = async () => {
      setLoading(true);
      setError("");

      try {
        const backendURL = window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1"
          ? "http://127.0.0.1:8787"
          : "https://selt-t-backend.selt-3232.workers.dev";

        console.log("📡 Analyst fetching from:", backendURL);

        const vouchersURL = `${backendURL}/api/vouchers?limit=10000`;
        const resp = await fetch(vouchersURL);

        if (!resp.ok) {
          throw new Error(`HTTP ${resp.status}`);
        }

        const json = await resp.json();

        if (!json || !json.success) {
          throw new Error("Invalid response");
        }

        const arr = json.data || [];

        if (!Array.isArray(arr)) {
          throw new Error("No array returned");
        }

        console.log(`✅ Analyst loaded ${arr.length} vouchers (NO DUPLICATES)`);

        if (!cancelled) {
          // Map ONCE - No duplicates
          const mapped = arr.map((v) => ({
            "Date": v.date || '',
            "Voucher Number": v.vch_no || '',
            "Voucher No": v.vch_no || '',
            "Vch No.": v.vch_no || '',
            "Invoice No": v.vch_no || '',
            "Voucher Type": v.vch_type || 'Sales',
            "Type": v.vch_type || 'Sales',
            "Vch Type": v.vch_type || 'Sales',
            "Party Name": v.party_name || 'N/A',
            "Party": v.party_name || 'N/A',
            "Customer": v.party_name || 'N/A',
            "Party Group": v.party_group || 'N/A',
            "ItemName": v.name_item || 'N/A',
            "Item Name": v.name_item || 'N/A',
            "Description": v.name_item || 'N/A',
            "Narration": v.narration || '',
            "Item Group": v.item_group || 'N/A',
            "Item Category": v.item_category || 'Sales',
            "Company": v.item_category || 'Sales',
            "Salesman": v.salesman || 'N/A',
            "City/Area": v.city_area || 'N/A',
            "Amount": parseFloat(v.amount) || 0,
            "Net Amount": parseFloat(v.amount) || 0,
            "Qty": parseFloat(v.qty) || 0,
            "Quantity": parseFloat(v.qty) || 0,
            "Rate": parseFloat(v.rate) || 0,
            "Price": parseFloat(v.rate) || 0,
            "Outstanding": 0,
          }));
// REMOVE TOTAL / GRAND TOTAL ROWS
const cleaned = mapped.filter((r) => {
  const p = String(r["Party Name"] || "").toLowerCase();
  const i = String(r["ItemName"] || "").toLowerCase();
  const g = String(r["Party Group"] || "").toLowerCase();

  if (p === "total" || p === "grand total") return false;
  if (i === "total" || i === "grand total") return false;
  if (g === "total" || g === "grand total") return false;

  return true;
});

setRawData(cleaned);

          // setRawData(mapped);
          setLastSync(new Date().toISOString());
          
          try {
            localStorage.setItem("analyst_latest_rows", JSON.stringify(mapped));
          } catch {}
        }
      } catch (e) {
        console.error("❌ Fetch error:", e);

        const backup = localStorage.getItem("analyst_latest_rows");
        if (backup) {
          try {
            const cached = JSON.parse(backup);
            console.log("📦 Cache:", cached.length);
            setRawData(cached);
            setLastSync("Cached");
          } catch {
            setError("Cache error");
          }
        } else {
          setError("Unable to load analyst data. Check backend: https://selt-t-backend.selt-3232.workers.dev");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    fetchData();

    let intv;
    if (autoRefresh) {
      intv = setInterval(fetchData, 60000);
    }

    return () => {
      cancelled = true;
      if (intv) clearInterval(intv);
    };
  }, [autoRefresh]);

  const cleanData = useMemo(() => {
    return rawData;
  }, [rawData]);

  const mainFilteredData = useMemo(() => {
    let rows = Array.isArray(cleanData) ? cleanData : [];
    
    if (companyFilter && companyFilter !== "All Companies") {
      rows = rows.filter((r) => {
        const c = r["Company"] || r["Item Category"] || "";
        return String(c).toLowerCase() === String(companyFilter).toLowerCase();
      });
    }
    
    if (searchQ && String(searchQ).trim()) {
      const q = String(searchQ).toLowerCase();
      rows = rows.filter((r) => {
        return Object.values(r || {})
          .map((v) => (v === null || v === undefined ? "" : String(v).toLowerCase()))
          .some((val) => val.includes(q));
      });
    }
    
    return rows;
  }, [cleanData, companyFilter, searchQ]);

  const dateFiltered = useMemo(() => {
    return mainFilteredData.filter((r) => {
      let d = r.Date || r.date || "";
      if (!d) return true;
      
      const clean = String(d).replace(/\D/g, "");
      if (!clean) return true;
      
      if (fromDate) {
        const f = String(fromDate).replace(/\D/g, "");
        if (clean < f) return false;
      }
      
      if (toDate) {
        const t = String(toDate).replace(/\D/g, "");
        if (clean > t) return false;
      }
      
      return true;
    });
  }, [mainFilteredData, fromDate, toDate]);

  const metrics = useMemo(() => {
    let totalSales = 0;
    let receipts = 0;
    let expenses = 0;
    let outstanding = 0;

// EXTRA COUNTS FOR DASHBOARD CARDS
const extraCounts = useMemo(() => {
  const partySet = new Set();
  const inventorySet = new Set();
  const billingSet = new Set();

  dateFiltered.forEach((r) => {
    if (r["Party Name"]) partySet.add(r["Party Name"]);
    if (r["ItemName"]) inventorySet.add(r["ItemName"]);
    if (r["Vch No."] || r["Invoice No"]) billingSet.add(r["Vch No."] || r["Invoice No"]);
  });

  return {
    party: partySet.size,
    inventory: inventorySet.size,
    billing: billingSet.size,
  };
}, [dateFiltered]);

    
    (dateFiltered || []).forEach((r) => {
      const amt = parseFloat(r["Amount"]) || 0;
      totalSales += amt;
      
      const type = String(r["Type"] || "").toLowerCase();
      if (type.includes("receipt") || type.includes("payment")) {
        receipts += amt;
      } else if (type.includes("expense") || type.includes("purchase")) {
        expenses += Math.abs(amt);
      } else {
        receipts += amt * 0.9;
        expenses += Math.abs(amt) * 0.1;
      }
      
      outstanding += parseFloat(r["Outstanding"] || 0) || 0;
    });
    
    return { totalSales, receipts, expenses, outstanding };
  }, [dateFiltered]);

  const monthlySales = useMemo(() => {
    const m = {};
    (dateFiltered || []).forEach((r) => {
      const dstr = r["Date"] || "";
      let key = "Unknown";
      
      if (dstr) {
        const parts = String(dstr).split(/[-\/]/);
        if (parts.length >= 3) {
          if (parts[0].length === 4) {
            key = `${parts[0]}-${parts[1].padStart(2, "0")}`;
          } else {
            key = `${parts[2]}-${parts[1].padStart(2, "0")}`;
          }
        }
      }
      
      const amt = parseFloat(r["Amount"]) || 0;
      m[key] = (m[key] || 0) + amt;
    });
    
    const ordered = Object.keys(m).sort();
    return { labels: ordered, values: ordered.map((k) => m[k]) };
  }, [dateFiltered]);

  const companySplit = useMemo(() => {
    const map = {};
    (dateFiltered || []).forEach((r) => {
      const c = r["Company"] || r["Item Category"] || "Unknown";
      const amt = parseFloat(r["Amount"]) || 0;
      map[c] = (map[c] || 0) + amt;
    });
    return { labels: Object.keys(map), values: Object.values(map) };
  }, [dateFiltered]);

  const topEntities = useMemo(() => {
    const prod = {};
    const cust = {};
    
    (dateFiltered || []).forEach((r) => {
      const item = r["ItemName"] || "Unknown";
      const party = r["Party Name"] || "Unknown";
      const amt = parseFloat(r["Amount"]) || 0;
      
      prod[item] = (prod[item] || 0) + amt;
      cust[party] = (cust[party] || 0) + amt;
    });
    
    const topProducts = Object.entries(prod).sort((a, b) => b[1] - a[1]).slice(0, 25);
    const topCustomers = Object.entries(cust).sort((a, b) => b[1] - a[1]).slice(0, 25);
    
    return { topProducts, topCustomers };
  }, [dateFiltered]);

  const exportCSV = (rows, filename = "export") => {
    if (!rows || !rows.length) return;
    
    const keys = Array.from(new Set(rows.flatMap((r) => Object.keys(r || {}))));
    const csvRows = [keys.join(",")];
    
    rows.forEach((r) => {
      const line = keys.map((k) => {
        let v = r[k];
        if (v === undefined || v === null) return "";
        v = ("" + v).replace(/"/g, '""');
        if (v.includes(",") || v.includes("\n")) v = `"${v}"`;
        return v;
      });
      csvRows.push(line.join(","));
    });
    
    const csv = csvRows.join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${filename}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const openInvoice = (row) => {
    setSelectedInvoice(row);
    setInvoiceModalOpen(true);
    setTimeout(() => {
      if (modalRef.current) modalRef.current.scrollTop = 0;
    }, 50);
  };

  const handlePrint = () => {
    window.print();
  };

  const handleShareInvoice = async () => {
    if (!selectedInvoice) return;
    const text = invoiceText(selectedInvoice);
    
    if (navigator.share) {
      try {
        await navigator.share({
          title: `Invoice - ${selectedInvoice["Invoice No"] || ""}`,
          text,
        });
      } catch (e) {
        console.warn("Share cancelled", e);
      }
    } else {
      const wa = `https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`;
      window.open(wa, "_blank");
    }
  };

  const invoiceText = (row) => {
    const invNo = row["Invoice No"] || row["Voucher No"] || "";
    const date = row["Date"] || "";
    const party = row["Party Name"] || "";
    const item = row["ItemName"] || "";
    const qty = row["Qty"] || 0;
    const rate = row["Rate"] || 0;
    const amount = row["Amount"] || 0;
    
    return `
COMMUNICATION WORLD INFOMATIC PVT. LTD.
----------------------------------------
Invoice No: ${invNo}
Date: ${date}
Customer: ${party}
----------------------------------------
Item: ${item}
Qty: ${qty}
Rate: ₹${rate}
----------------------------------------
Total Amount: ₹${amount.toLocaleString("en-IN")}
----------------------------------------
Thank you for your business!
    `.trim();
  };

  const copyInvoiceToClipboard = async () => {
    if (!selectedInvoice) return;
    const text = invoiceText(selectedInvoice);
    
    try {
      await navigator.clipboard.writeText(text);
      alert("Invoice copied to clipboard!");
    } catch {
      alert("Copy failed");
    }
  };

  const formatINR = (n) => `₹${(n || 0).toLocaleString("en-IN")}`;

  const monthlyChartData = {
    labels: monthlySales.labels,
    datasets: [{
      label: "Monthly Sales",
      data: monthlySales.values,
      borderColor: "#64FFDA",
      backgroundColor: "rgba(100,255,218,0.12)",
      fill: true,
      tension: 0.4,
    }],
  };

  const companyPie = {
    labels: companySplit.labels,
    datasets: [{
      data: companySplit.values,
      backgroundColor: [
        "#64FFDA",
        "#3B82F6",
        "#F59E0B",
        "#EF4444",
        "#8B5CF6",
        "#22D3EE",
        "#10B981",
        "#F97316",
        "#EC4899",
        "#14B8A6"
      ],
    }],
  };

  if (loading)
    return (
      <div className="h-screen flex items-center justify-center text-[#64FFDA] bg-[#071429]">
        <div className="text-center">
          <RefreshCw className="animate-spin mx-auto mb-3" size={32} />
          <p className="text-sm">Loading analyst data...</p>
        </div>
      </div>
    );

  if (error)
    return (
      <div className="h-screen p-4 sm:p-6 bg-gradient-to-br from-[#0A192F] via-[#112240] to-[#0A192F] text-gray-300">
        <div className="max-w-2xl mx-auto text-center bg-[#1B2A4A] p-6 rounded-lg border border-red-500/30">
          <h2 className="text-xl sm:text-2xl text-red-400 font-semibold mb-3">⚠️ Error</h2>
          <p className="text-sm mb-4">{error}</p>
          <p className="mt-4 text-xs text-gray-400">Backend: https://selt-t-backend.selt-3232.workers.dev</p>
          <button 
            onClick={() => window.location.reload()} 
            className="mt-4 px-4 py-2 bg-[#64FFDA] text-[#071226] rounded-lg text-sm font-semibold"
          >
            Retry
          </button>
        </div>
      </div>
    );

  if (!cleanData.length)
    return (
      <div className="h-screen p-4 sm:p-6 bg-gradient-to-br from-[#0A192F] via-[#112240] to-[#0A192F] text-gray-300">
        <div className="max-w-2xl mx-auto text-center bg-[#1B2A4A] p-6 rounded-lg">
          <h2 className="text-xl sm:text-2xl text-[#64FFDA] font-semibold mb-3">📊 No Data Found</h2>
          <p className="text-xs sm:text-sm mb-4">Check backend API connection</p>
          <p className="text-xs text-gray-400">Backend: https://selt-t-backend.selt-3232.workers.dev</p>
        </div>
      </div>
    );

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#071226] via-[#0A192F] to-[#071226] text-gray-100 p-2 sm:p-4">
      <div className="max-w-[1400px] mx-auto bg-[#12223b] rounded-xl p-3 sm:p-4 border border-[#223355] shadow-xl">
        
        {/* HEADER */}
        <div className="flex flex-wrap justify-between items-center mb-3 gap-2 bg-[#0D1B2A] p-2 sm:p-3 rounded-lg border border-[#1E2D45]">
          <h1 className="text-sm sm:text-lg font-bold text-[#64FFDA] flex items-center gap-2">
            <FileSpreadsheet size={16} className="sm:hidden" />
            <FileSpreadsheet size={20} className="hidden sm:block" />
            ANALYST
            <span className="text-[9px] sm:text-xs text-gray-400 font-normal">
              ({dateFiltered.length} records)
            </span>
          </h1>
          
          <div className="flex flex-wrap items-center gap-1 sm:gap-2">
            {lastSync && (
              <div className="text-[9px] sm:text-xs text-gray-300 hidden sm:block">
                {new Date(lastSync).toLocaleTimeString()}
              </div>
            )}
            
            <select
              value={companyFilter}
              onChange={(e) => setCompanyFilter(e.target.value)}
              className="bg-[#0E1B2F] border border-[#223355] rounded px-1.5 sm:px-2 py-1 text-[10px] sm:text-xs max-w-[100px] sm:max-w-none"
            >
              {(() => {
                const setC = new Set();
                cleanData.forEach((r) => setC.add(r["Company"] || "Unknown"));
                return ["All Companies", ...Array.from(setC)].map((c, i) => (
                  <option value={c} key={i}>{c}</option>
                ));
              })()}
            </select>
            
            <input
              type="date"
              value={fromDate}
              onChange={(e) => setFromDate(e.target.value)}
              className="bg-[#0C1B31] px-1.5 sm:px-2 py-1 rounded border border-[#223355] text-[10px] sm:text-xs w-[100px] sm:w-auto"
            />
            
            <input
              type="date"
              value={toDate}
              onChange={(e) => setToDate(e.target.value)}
              className="bg-[#0C1B31] px-1.5 sm:px-2 py-1 rounded border border-[#223355] text-[10px] sm:text-xs w-[100px] sm:w-auto"
            />
            
            <button
              onClick={() => setAutoRefresh((s) => !s)}
              className={`px-1.5 sm:px-2 py-1 rounded text-[10px] sm:text-xs border flex items-center gap-1 ${
                autoRefresh 
                  ? "bg-[#64FFDA] text-[#071226] border-[#64FFDA]" 
                  : "bg-transparent text-[#64FFDA] border-[#64FFDA]/30"
              }`}
            >
              <RefreshCw size={12} className={autoRefresh ? "animate-spin" : ""} />
              <span className="hidden sm:inline">{autoRefresh ? "Auto" : "Manual"}</span>
            </button>
            
            <button
              onClick={() => {
                if (confirm("Clear cache and reload?")) {
                  localStorage.removeItem("analyst_latest_rows");
                  window.location.reload();
                }
              }}
              className="px-1.5 sm:px-2 py-1 rounded bg-red-500/20 border border-red-500/40 text-red-400 text-[10px] sm:text-xs hidden sm:block"
            >
              Clear Cache
            </button>
          </div>
        </div>

        {/* NAVIGATION TABS */}
        <div className="flex flex-wrap gap-1 sm:gap-2 mb-3 border-b border-[#1E2D45] pb-2">
          {[
            { key: "dashboard", label: "📊 Dashboard", icon: "📊" },
            { key: "masters", label: "📋 Masters", icon: "📋" },
            { key: "transactions", label: "💰 Trans", icon: "💰" },
            { key: "reports", label: "📈 Reports", icon: "📈" },
            { key: "party", label: "👥 Party", icon: "👥" },
            { key: "inventory", label: "📦 Inventory", icon: "📦" },
            { key: "alldata", label: "📄 All Data", icon: "📄" },
          ].map((tab) => (
            <button
              key={tab.key}
              onClick={() => {
                setActiveSection(tab.key);
                setCurrentPage(1);
              }}
              className={`px-2 sm:px-3 py-1 sm:py-1.5 rounded text-[10px] sm:text-xs font-semibold transition-all ${
                activeSection === tab.key
                  ? "bg-[#64FFDA] text-[#081827] shadow-lg"
                  : "bg-[#0C1B31] text-gray-300 border border-[#223355] hover:border-[#64FFDA]/50"
              }`}
            >
              <span className="hidden sm:inline">{tab.label}</span>
              <span className="sm:hidden">{tab.icon}</span>
            </button>
          ))}
          
          <div className="ml-auto flex items-center gap-1 sm:gap-2">
            <input
              placeholder="🔍 Search..."
              value={searchQ}
              onChange={(e) => setSearchQ(e.target.value)}
              className="bg-[#0C1B31] px-1.5 sm:px-2 py-1 rounded border border-[#223355] text-[10px] sm:text-xs w-20 sm:w-32 focus:outline-none focus:ring-1 focus:ring-[#64FFDA]"
            />
            
            <button
              onClick={() => exportCSV(dateFiltered.slice(0, 5000), "AnalystExport")}
              className="px-1.5 sm:px-2 py-1 rounded bg-[#64FFDA]/10 border border-[#64FFDA]/40 text-[#64FFDA] text-[10px] sm:text-xs flex items-center gap-1 hover:bg-[#64FFDA]/20"
            >
              <Download size={12} />
              <span className="hidden sm:inline">Export</span>
            </button>
          </div>
        </div>

        {/* SECTIONS */}
        <div className="overflow-x-hidden">
          {activeSection === "dashboard" && (
            <DashboardSection
              metrics={metrics}
              monthlyChartData={monthlyChartData}
              companyPie={companyPie}
              topProducts={topEntities.topProducts}
              topCustomers={topEntities.topCustomers}
              data={dateFiltered}
              openInvoice={openInvoice}
              formatINR={formatINR}
            />
          )}
          
          {activeSection === "masters" && (
            <MastersSection 
              data={cleanData} 
              openInvoice={openInvoice} 
            />
          )}
          
          {activeSection === "transactions" && (
            <TransactionsSection 
              data={dateFiltered} 
              openInvoice={openInvoice} 
              exportCSV={exportCSV} 
            />
          )}
          
          {activeSection === "reports" && (
            <ReportsSection 
              data={dateFiltered} 
              exportCSV={exportCSV} 
            />
          )}
          
          {activeSection === "party" && (
            <PartySection 
              data={dateFiltered} 
              openInvoice={openInvoice} 
            />
          )}
          
          {activeSection === "inventory" && (
            <InventorySection 
              data={dateFiltered} 
            />
          )}
          
          {activeSection === "alldata" && (
            <AllDataSection 
              data={dateFiltered} 
              exportCSV={exportCSV}
              currentPage={currentPage}
              setCurrentPage={setCurrentPage}
              rowsPerPage={rowsPerPage}
              openInvoice={openInvoice}
            />
          )}
        </div>
      </div>

      {/* TALLY-STYLE INVOICE MODAL */}
      {invoiceModalOpen && selectedInvoice && (
        <TallyInvoiceModal
          refObj={modalRef}
          row={selectedInvoice}
          onClose={() => setInvoiceModalOpen(false)}
          printSize={printSize}
          setPrintSize={setPrintSize}
          onPrint={handlePrint}
          onShare={handleShareInvoice}
          onCopy={copyInvoiceToClipboard}
        />
      )}
    </div>
  );
}

// ==========================================
// DASHBOARD SECTION
// ==========================================
function DashboardSection({ metrics, monthlyChartData, companyPie, topProducts, topCustomers, data, openInvoice, formatINR }) {
  return (
    <div className="space-y-3">
      {/* METRICS CARDS */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3">
        <MetricCard 
  title="Total Sales" 
  value={formatINR(metrics.totalSales)} 
  color="blue" 
/>

<MetricCard 
  title="Parties" 
  value={extraCounts.party} 
  color="green" 
/>

<MetricCard 
  title="Inventory" 
  value={extraCounts.inventory} 
  color="orange" 
/>

<MetricCard 
  title="Billing" 
  value={extraCounts.billing} 
  color="red" 
/>
      </div>

      {/* CHARTS */}
      <div className="grid md:grid-cols-3 gap-3">
        <div className="col-span-2 bg-[#0B1A33] p-2 sm:p-3 rounded-lg border border-[#1E2D50]">
          <h3 className="text-[#64FFDA] mb-2 text-xs sm:text-sm font-semibold">📈 Monthly Sales Trend</h3>
          <div className="h-32 sm:h-48">
            <Line 
              data={monthlyChartData} 
              options={{ 
                maintainAspectRatio: false, 
                responsive: true,
                plugins: { 
                  legend: { display: false },
                  tooltip: {
                    backgroundColor: "rgba(0,0,0,0.8)",
                    padding: 10,
                    titleColor: "#64FFDA",
                    bodyColor: "#fff",
                  }
                },
                scales: {
                  x: { 
                    ticks: { color: "#9CA3AF", font: { size: 9 } },
                    grid: { color: "#1E293B" }
                  },
                  y: { 
                    ticks: { 
                      color: "#9CA3AF", 
                      font: { size: 9 },
                      callback: (val) => `₹${(val/1000).toFixed(0)}K`
                    },
                    grid: { color: "#1E293B" }
                  },
                },
              }} 
            />
          </div>
        </div>
        
        <div className="bg-[#0B1A33] p-2 sm:p-3 rounded-lg border border-[#1E2D50]">
          <h3 className="text-[#64FFDA] mb-2 text-xs sm:text-sm font-semibold">🎯 Company Split</h3>
          <div className="h-32 sm:h-48">
            <Doughnut 
              data={companyPie} 
              options={{ 
                maintainAspectRatio: false,
                responsive: true,
                plugins: { 
                  legend: { 
                    position: 'bottom',
                    labels: { 
                      color: "#E5E7EB",
                      padding: 6,
                      font: { size: 8 },
                      boxWidth: 10,
                    } 
                  } 
                } 
              }} 
            />
          </div>
        </div>
      </div>

      {/* TOP LISTS */}
      <div className="grid md:grid-cols-2 gap-3">
        <ListBox title="🏆 Top Products" items={topProducts} />
        <ListBox title="👥 Top Customers" items={topCustomers} />
      </div>

      {/* RECENT TRANSACTIONS */}
      <div className="bg-[#0D1B34] p-2 sm:p-3 rounded-lg border border-[#1E2D50]">
        <h3 className="text-[#64FFDA] mb-2 text-xs sm:text-sm font-semibold">💰 Recent Transactions</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-[10px] sm:text-xs text-gray-200">
            <thead className="text-[#64FFDA] bg-[#0A1528]">
              <tr>
                <th className="text-left py-1.5 px-1.5 sm:px-2">Vch No</th>
                <th className="text-left py-1.5 px-1.5 sm:px-2 hidden sm:table-cell">Date</th>
                <th className="text-left py-1.5 px-1.5 sm:px-2">Party</th>
                <th className="text-right py-1.5 px-1.5 sm:px-2">Amount</th>
                <th className="text-right py-1.5 px-1.5 sm:px-2">Action</th>
              </tr>
            </thead>
            <tbody>
              {data.slice(0, 15).map((r, i) => {
                const inv = r["Vch No."] || "—";
                const date = r["Date"] || "—";
                const party = r["Party Name"] || "—";
                const amount = parseFloat(r["Amount"]) || 0;
                
                return (
                  <tr 
                    key={i} 
                    className="border-b border-[#1E2D50] hover:bg-[#0F263F] cursor-pointer"
                    onClick={() => openInvoice(r)}
                  >
                    <td className="py-1.5 px-1.5 sm:px-2 truncate max-w-[80px] sm:max-w-none">{inv}</td>
                    <td className="py-1.5 px-1.5 sm:px-2 hidden sm:table-cell">{date}</td>
                    <td className="py-1.5 px-1.5 sm:px-2 truncate max-w-[100px] sm:max-w-none">{party}</td>
                    <td className="text-right py-1.5 px-1.5 sm:px-2 text-[#64FFDA] font-semibold">
                      ₹{Number(amount).toLocaleString("en-IN")}
                    </td>
                    <td className="py-1.5 px-1.5 sm:px-2 text-right">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          openInvoice(r);
                        }}
                        className="px-1.5 sm:px-2 py-0.5 sm:py-1 rounded bg-[#64FFDA]/10 border border-[#64FFDA]/40 text-[#64FFDA] text-[9px] sm:text-xs flex items-center gap-1 hover:bg-[#64FFDA]/20"
                      >
                        <Eye size={10} className="sm:hidden" />
                        <Eye size={12} className="hidden sm:block" />
                        <span className="hidden sm:inline">View</span>
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function MetricCard({ title, value, color = "blue" }) {
  const colors = {
    blue: "from-[#3B82F6] to-[#2563EB]",
    green: "from-[#10B981] to-[#059669]",
    orange: "from-[#F59E0B] to-[#D97706]",
    red: "from-[#EF4444] to-[#DC2626]",
  };
  
  return (
    <div className={`bg-gradient-to-br ${colors[color]} p-2 sm:p-3 rounded-lg shadow-lg text-center border border-white/10`}>
      <div className="text-[9px] sm:text-xs text-white/80 font-medium">{title}</div>
      <div className="text-xs sm:text-lg md:text-xl font-bold text-white mt-1">{value}</div>
    </div>
  );
}

function ListBox({ title, items = [] }) {
  return (
    <div className="bg-[#0D1B34] p-2 sm:p-3 rounded-lg border border-[#1E2D50]">
      <h4 className="text-[#64FFDA] mb-2 text-xs sm:text-sm font-semibold">{title}</h4>
      <ul className="text-[10px] sm:text-xs text-gray-200 space-y-1 max-h-40 sm:max-h-56 overflow-auto">
        {items.map(([name, amt], i) => (
          <li key={i} className="flex justify-between border-b border-[#1E2D50] py-1 hover:bg-[#0F263F]">
            <span className="truncate max-w-[180px]">{i + 1}. {name}</span>
            <span className="ml-2 text-[#64FFDA] font-semibold">₹{(amt || 0).toLocaleString("en-IN")}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

// ==========================================
// OTHER SECTIONS (Masters, Trans, Reports, etc)
// ==========================================
function MastersSection({ data, openInvoice }) {
  const parties = [...new Set(data.map(r => r["Party Name"]))].filter(p => p !== "N/A").sort();
  const items = [...new Set(data.map(r => r["ItemName"]))].filter(i => i !== "N/A").sort();
  
  return (
    <div className="grid md:grid-cols-2 gap-3">
      <div className="bg-[#0D1B34] p-2 sm:p-3 rounded-lg border border-[#1E2D50]">
        <h3 className="text-[#64FFDA] mb-2 text-xs sm:text-sm font-semibold">👥 Parties ({parties.length})</h3>
        <ul className="text-[10px] sm:text-xs text-gray-200 space-y-1 max-h-60 overflow-auto">
          {parties.map((p, i) => (
            <li key={i} className="py-1 border-b border-[#1E2D50] hover:bg-[#0F263F]">{i + 1}. {p}</li>
          ))}
        </ul>
      </div>
      
      <div className="bg-[#0D1B34] p-2 sm:p-3 rounded-lg border border-[#1E2D50]">
        <h3 className="text-[#64FFDA] mb-2 text-xs sm:text-sm font-semibold">📦 Items ({items.length})</h3>
        <ul className="text-[10px] sm:text-xs text-gray-200 space-y-1 max-h-60 overflow-auto">
          {items.map((it, i) => (
            <li key={i} className="py-1 border-b border-[#1E2D50] truncate hover:bg-[#0F263F]">{i + 1}. {it}</li>
          ))}
        </ul>
      </div>
    </div>
  );
}

function TransactionsSection({ data, openInvoice, exportCSV }) {
  const [page, setPage] = useState(1);
  const perPage = 25;
  const pages = Math.max(1, Math.ceil(data.length / perPage));
  const pageData = data.slice((page - 1) * perPage, page * perPage);

  return (
    <div>
      <div className="flex justify-between items-center mb-2 sm:mb-3">
        <h3 className="text-[#64FFDA] text-xs sm:text-sm font-semibold">💰 Transactions ({data.length})</h3>
        <button 
          onClick={() => exportCSV(data, "Transactions")} 
          className="px-1.5 sm:px-2 py-1 rounded bg-[#64FFDA]/10 border border-[#64FFDA]/40 text-[#64FFDA] text-[10px] sm:text-xs flex items-center gap-1"
        >
          <Download size={12} />
          <span className="hidden sm:inline">Export</span>
        </button>
      </div>
      
      <div className="overflow-x-auto bg-[#0D1B34] rounded-lg border border-[#1E2D50]">
        <table className="w-full text-[10px] sm:text-xs text-gray-200">
          <thead className="text-[#64FFDA] bg-[#0A1528] sticky top-0">
            <tr>
              <th className="text-left py-1.5 px-1.5">Vch No</th>
              <th className="text-left py-1.5 px-1.5 hidden sm:table-cell">Date</th>
              <th className="text-left py-1.5 px-1.5">Party</th>
              <th className="text-right py-1.5 px-1.5">Amount</th>
              <th className="text-right py-1.5 px-1.5">Action</th>
            </tr>
          </thead>
          <tbody>
            {pageData.map((r, i) => (
              <tr 
                key={i} 
                className="border-b border-[#1E2D50] hover:bg-[#0F263F] cursor-pointer"
                onClick={() => openInvoice(r)}
              >
                <td className="py-1.5 px-1.5 truncate max-w-[80px]">{r["Vch No."] || "—"}</td>
                <td className="py-1.5 px-1.5 hidden sm:table-cell">{r["Date"] || "—"}</td>
                <td className="py-1.5 px-1.5 truncate max-w-[120px]">{r["Party Name"] || "—"}</td>
                <td className="text-right py-1.5 px-1.5 text-[#64FFDA] font-semibold">
                  ₹{(r["Amount"] || 0).toLocaleString("en-IN")}
                </td>
                <td className="py-1.5 px-1.5 text-right">
                  <button 
                    onClick={(e) => {
                      e.stopPropagation();
                      openInvoice(r);
                    }} 
                    className="px-1.5 py-0.5 rounded bg-[#64FFDA]/10 text-[#64FFDA] text-[9px] hover:bg-[#64FFDA]/20"
                  >
                    View
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      
      <div className="flex justify-between mt-2">
        <button 
          onClick={() => setPage(p => Math.max(1, p - 1))} 
          disabled={page === 1} 
          className="px-2 py-1 rounded bg-[#64FFDA]/10 text-[#64FFDA] text-[10px] disabled:opacity-30"
        >
          <ChevronLeft size={12} /> Prev
        </button>
        <span className="text-[10px] text-gray-300">Page {page}/{pages}</span>
        <button 
          onClick={() => setPage(p => Math.min(pages, p + 1))} 
          disabled={page === pages} 
          className="px-2 py-1 rounded bg-[#64FFDA]/10 text-[#64FFDA] text-[10px] disabled:opacity-30"
        >
          Next <ChevronRight size={12} />
        </button>
      </div>
    </div>
  );
}

function ReportsSection({ data, exportCSV }) {
  const salesData = data.filter(r => {
    const type = String(r["Type"] || "").toLowerCase();
    return type.includes("sales") || type.includes("invoice");
  });
  
  const purchaseData = data.filter(r => {
    const type = String(r["Type"] || "").toLowerCase();
    return type.includes("purchase");
  });
  
  return (
    <div className="bg-[#0D1B34] p-3 rounded-lg border border-[#1E2D50]">
      <h3 className="text-[#64FFDA] mb-3 text-xs sm:text-sm font-semibold">📊 Reports</h3>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
        <button 
          onClick={() => exportCSV(data, "AllData")} 
          className="px-3 py-2 rounded bg-[#64FFDA]/10 border border-[#64FFDA]/40 text-[#64FFDA] text-[10px] sm:text-xs hover:bg-[#64FFDA]/20"
        >
          📄 Export All ({data.length})
        </button>
        <button 
          onClick={() => exportCSV(salesData, "Sales")} 
          className="px-3 py-2 rounded bg-[#64FFDA]/10 border border-[#64FFDA]/40 text-[#64FFDA] text-[10px] sm:text-xs hover:bg-[#64FFDA]/20"
        >
          💰 Sales ({salesData.length})
        </button>
        <button 
          onClick={() => exportCSV(purchaseData, "Purchase")} 
          className="px-3 py-2 rounded bg-[#64FFDA]/10 border border-[#64FFDA]/40 text-[#64FFDA] text-[10px] sm:text-xs hover:bg-[#64FFDA]/20"
        >
          🛒 Purchase ({purchaseData.length})
        </button>
      </div>
    </div>
  );
}

function PartySection({ data, openInvoice }) {
  const partyData = useMemo(() => {
    const map = {};
    data.forEach(r => {
      const p = r["Party Name"] || "Unknown";
      const amt = parseFloat(r["Amount"]) || 0;
      if (!map[p]) map[p] = { total: 0, count: 0 };
      map[p].total += amt;
      map[p].count += 1;
    });
    return Object.entries(map).map(([name, info]) => ({ name, ...info })).sort((a, b) => b.total - a.total);
  }, [data]);

  return (
    <div className="bg-[#0D1B34] p-2 rounded-lg border border-[#1E2D50]">
      <h3 className="text-[#64FFDA] mb-2 text-xs sm:text-sm font-semibold">👥 Party Ledger</h3>
      <div className="overflow-x-auto">
        <table className="w-full text-[10px] sm:text-xs text-gray-200">
          <thead className="text-[#64FFDA] bg-[#0A1528]">
            <tr>
              <th className="text-left py-1.5 px-1.5">Party</th>
              <th className="text-right py-1.5 px-1.5">Trans</th>
              <th className="text-right py-1.5 px-1.5">Total</th>
            </tr>
          </thead>
          <tbody>
            {partyData.map((p, i) => (
              <tr key={i} className="border-b border-[#1E2D50] hover:bg-[#0F263F]">
                <td className="py-1.5 px-1.5 truncate max-w-[150px]">{p.name}</td>
                <td className="text-right py-1.5 px-1.5">{p.count}</td>
                <td className="text-right py-1.5 px-1.5 text-[#64FFDA] font-semibold">
                  ₹{p.total.toLocaleString("en-IN")}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function InventorySection({ data }) {
  const inv = useMemo(() => {
    const map = {};
    data.forEach(r => {
      const item = r["ItemName"] || "Unknown";
      const qty = parseFloat(r["Qty"]) || 0;
      const amt = parseFloat(r["Amount"]) || 0;
      if (!map[item]) map[item] = { qty: 0, value: 0 };
      map[item].qty += qty;
      map[item].value += amt;
    });
    return Object.entries(map).map(([name, info]) => ({ name, ...info })).sort((a, b) => b.value - a.value);
  }, [data]);

  return (
    <div className="bg-[#0D1B34] p-2 rounded-lg border border-[#1E2D50]">
      <h3 className="text-[#64FFDA] mb-2 text-xs sm:text-sm font-semibold">📦 Inventory</h3>
      <div className="overflow-x-auto">
        <table className="w-full text-[10px] sm:text-xs text-gray-200">
          <thead className="text-[#64FFDA] bg-[#0A1528]">
            <tr>
              <th className="text-left py-1.5 px-1.5">Item</th>
              <th className="text-right py-1.5 px-1.5">Qty</th>
              <th className="text-right py-1.5 px-1.5">Value</th>
            </tr>
          </thead>
          <tbody>
            {inv.map((item, i) => (
              <tr key={i} className="border-b border-[#1E2D50] hover:bg-[#0F263F]">
                <td className="py-1.5 px-1.5 truncate max-w-[180px]">{item.name}</td>
                <td className="text-right py-1.5 px-1.5">{item.qty.toFixed(2)}</td>
                <td className="text-right py-1.5 px-1.5 text-[#64FFDA] font-semibold">
                  ₹{item.value.toLocaleString("en-IN")}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function AllDataSection({ data, exportCSV, currentPage, setCurrentPage, rowsPerPage, openInvoice }) {
  const importantColumns = [
    "Date",
    "Vch No.",
    "Party Name",
    "ItemName",
    "Company",
    "Qty",
    "Amount"
  ];

  const totalPages = Math.max(1, Math.ceil(data.length / rowsPerPage));
  const paginatedData = useMemo(() => {
    const start = (currentPage - 1) * rowsPerPage;
    return data.slice(start, start + rowsPerPage);
  }, [data, currentPage, rowsPerPage]);

  return (
    <div className="space-y-2">
      <div className="flex justify-between items-center">
        <h3 className="text-[#64FFDA] text-xs sm:text-sm font-semibold">📄 All Data ({data.length})</h3>
        <button 
          onClick={() => exportCSV(data, "AllData")} 
          className="px-2 py-1 rounded bg-[#64FFDA]/10 border border-[#64FFDA]/40 text-[#64FFDA] text-[10px] sm:text-xs flex items-center gap-1"
        >
          <Download size={12} />
          <span className="hidden sm:inline">Export</span>
        </button>
      </div>

      <div className="bg-[#0D1B34] rounded-lg border border-[#1E2D50] overflow-hidden">
        <div className="overflow-x-auto overflow-y-auto max-h-[400px] sm:max-h-[500px]">
          <table className="w-full text-[9px] sm:text-[10px] text-gray-200">
            <thead className="text-[#64FFDA] bg-[#0A1528] sticky top-0 z-10">
              <tr>
                <th className="text-left py-1.5 px-1.5 sm:px-2 border-b border-[#1E2D50] sticky left-0 bg-[#0A1528] z-20 min-w-[30px]">#</th>
                {importantColumns.map((col, idx) => (
                  <th 
                    key={idx} 
                    className={`text-left py-1.5 px-1.5 sm:px-2 border-b border-[#1E2D50] whitespace-nowrap ${
                      col === "Amount" ? "text-right" : ""
                    }`}
                  >
                    {col}
                  </th>
                ))}
                <th className="text-right py-1.5 px-1.5 sm:px-2 border-b border-[#1E2D50]">Action</th>
              </tr>
            </thead>
            <tbody>
              {paginatedData.map((row, rowIdx) => (
                <tr 
                  key={rowIdx} 
                  className="border-b border-[#1E2D50] hover:bg-[#0F263F] cursor-pointer"
                  onClick={() => openInvoice(row)}
                >
                  <td className="py-1.5 px-1.5 sm:px-2 sticky left-0 bg-[#0D1B34] font-semibold text-[#64FFDA] z-10">
                    {(currentPage - 1) * rowsPerPage + rowIdx + 1}
                  </td>
                  {importantColumns.map((col, colIdx) => {
                    const value = row[col];
                    let displayValue = value === null || value === undefined ? "—" : String(value);
                    
                    if (col === "Amount") {
                      const num = parseFloat(value) || 0;
                      displayValue = num.toLocaleString("en-IN");
                    }
                    
                    if (col === "Qty") {
                      const num = parseFloat(value) || 0;
                      displayValue = num.toFixed(2);
                    }
                    
                    return (
                      <td 
                        key={colIdx} 
                        className={`py-1.5 px-1.5 sm:px-2 ${
                          col === "Amount" ? "text-right font-semibold text-[#64FFDA]" : ""
                        } ${
                          col === "Qty" ? "text-right" : ""
                        }`}
                        title={displayValue}
                      >
                        <div className={`${
                          col === "ItemName" || col === "Party Name" 
                            ? "max-w-[120px] sm:max-w-[200px] truncate" 
                            : col === "Company" 
                            ? "max-w-[80px] sm:max-w-[120px] truncate"
                            : ""
                        }`}>
                          {displayValue}
                        </div>
                      </td>
                    );
                  })}
                  <td className="py-1.5 px-1.5 sm:px-2 text-right">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        openInvoice(row);
                      }}
                      className="px-1.5 py-0.5 rounded bg-[#64FFDA]/10 text-[#64FFDA] text-[9px] hover:bg-[#64FFDA]/20"
                    >
                      <Eye size={10} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="flex justify-between items-center bg-[#0D1B34] p-2 rounded-lg border border-[#1E2D50]">
        <button 
          onClick={() => setCurrentPage(p => Math.max(1, p - 1))} 
          disabled={currentPage === 1} 
          className="px-2 py-1 rounded bg-[#64FFDA]/10 border border-[#64FFDA]/40 text-[#64FFDA] text-[10px] sm:text-xs disabled:opacity-30 disabled:cursor-not-allowed flex items-center gap-1"
        >
          <ChevronLeft size={12} />
          <span className="hidden sm:inline">Prev</span>
        </button>
        <span className="text-[10px] sm:text-xs text-gray-300">
          Page {currentPage} / {totalPages}
        </span>
        <button 
          onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} 
          disabled={currentPage === totalPages} 
          className="px-2 py-1 rounded bg-[#64FFDA]/10 border border-[#64FFDA]/40 text-[#64FFDA] text-[10px] sm:text-xs disabled:opacity-30 disabled:cursor-not-allowed flex items-center gap-1"
        >
          <span className="hidden sm:inline">Next</span>
          <ChevronRight size={12} />
        </button>
      </div>
    </div>
  );
}

// ==========================================
// TALLY-STYLE INVOICE MODAL
// ==========================================
function TallyInvoiceModal({ refObj, row, onClose, printSize, setPrintSize, onPrint, onShare, onCopy }) {
  return (
    <div className="fixed inset-0 bg-black/90 flex items-center justify-center z-50 p-2 sm:p-4">
      <div 
        ref={refObj} 
        className="bg-white rounded-lg max-w-3xl w-full max-h-[90vh] overflow-y-auto shadow-2xl"
      >
        {/* HEADER */}
        <div className="bg-gradient-to-r from-[#0A192F] to-[#112240] p-3 sm:p-4 border-b-2 border-[#64FFDA] flex justify-between items-center sticky top-0 z-10">
          <h3 className="text-white text-sm sm:text-lg font-bold flex items-center gap-2">
            <FileText size={20} className="text-[#64FFDA]" />
            TAX INVOICE
          </h3>
          <button 
            onClick={onClose} 
            className="text-white hover:text-[#64FFDA] transition-colors"
          >
            <X size={24} />
          </button>
        </div>

        {/* INVOICE CONTENT - TALLY STYLE */}
        <div className="p-4 sm:p-6 bg-white text-gray-900">
          {/* Company Header */}
          <div className="text-center mb-4 border-b-2 border-gray-800 pb-3">
            <h1 className="text-lg sm:text-2xl font-bold text-gray-900">
              COMMUNICATION WORLD INFOMATIC PVT. LTD.
            </h1>
            <p className="text-xs sm:text-sm text-gray-600 mt-1">
              Business Intelligence • Data Solutions • ERP Integration
            </p>
          </div>

          {/* Invoice Details Grid */}
          <div className="grid grid-cols-2 gap-x-4 gap-y-2 mb-4 text-xs sm:text-sm">
            <div>
              <span className="font-semibold text-gray-700">Invoice No:</span>
              <span className="ml-2 text-gray-900">{row["Invoice No"] || row["Vch No."] || "—"}</span>
            </div>
            <div>
              <span className="font-semibold text-gray-700">Date:</span>
              <span className="ml-2 text-gray-900">{row["Date"] || "—"}</span>
            </div>
            <div>
              <span className="font-semibold text-gray-700">Voucher Type:</span>
              <span className="ml-2 text-gray-900">{row["Voucher Type"] || "Sales"}</span>
            </div>
            <div>
              <span className="font-semibold text-gray-700">Salesman:</span>
              <span className="ml-2 text-gray-900">{row["Salesman"] || "—"}</span>
            </div>
          </div>

          {/* Party Details */}
          <div className="border-2 border-gray-300 rounded p-3 mb-4">
            <h4 className="font-bold text-sm text-gray-900 mb-2">Bill To:</h4>
            <p className="text-xs sm:text-sm"><strong>Party:</strong> {row["Party Name"] || "—"}</p>
            <p className="text-xs sm:text-sm"><strong>Group:</strong> {row["Party Group"] || "—"}</p>
            <p className="text-xs sm:text-sm"><strong>Location:</strong> {row["City/Area"] || "—"}</p>
          </div>

          {/* Item Details Table */}
          <table className="w-full border-2 border-gray-800 mb-4 text-xs sm:text-sm">
            <thead className="bg-gray-800 text-white">
              <tr>
                <th className="border border-gray-700 px-2 py-1.5 text-left">#</th>
                <th className="border border-gray-700 px-2 py-1.5 text-left">Item Description</th>
                <th className="border border-gray-700 px-2 py-1.5 text-right">Qty</th>
                <th className="border border-gray-700 px-2 py-1.5 text-right">Rate</th>
                <th className="border border-gray-700 px-2 py-1.5 text-right">Amount</th>
              </tr>
            </thead>
            <tbody>
              <tr className="hover:bg-gray-50">
                <td className="border border-gray-300 px-2 py-1.5">1</td>
                <td className="border border-gray-300 px-2 py-1.5">
                  <div className="font-semibold">{row["ItemName"] || "—"}</div>
                  <div className="text-[10px] text-gray-600">
                    Category: {row["Item Category"] || "—"} | Group: {row["Item Group"] || "—"}
                  </div>
                </td>
                <td className="border border-gray-300 px-2 py-1.5 text-right">
                  {parseFloat(row["Qty"] || 0).toFixed(2)}
                </td>
                <td className="border border-gray-300 px-2 py-1.5 text-right">
                  ₹{parseFloat(row["Rate"] || 0).toLocaleString("en-IN")}
                </td>
                <td className="border border-gray-300 px-2 py-1.5 text-right font-semibold">
                  ₹{parseFloat(row["Amount"] || 0).toLocaleString("en-IN")}
                </td>
              </tr>
            </tbody>
          </table>

          {/* Totals */}
          <div className="flex justify-end mb-4">
            <div className="w-64 border-2 border-gray-800">
              <div className="flex justify-between border-b border-gray-300 px-3 py-1.5 bg-gray-100">
                <span className="font-semibold text-sm">Subtotal:</span>
                <span className="text-sm">₹{parseFloat(row["Amount"] || 0).toLocaleString("en-IN")}</span>
              </div>
              <div className="flex justify-between px-3 py-2 bg-gray-800 text-white">
                <span className="font-bold">Grand Total:</span>
                <span className="font-bold text-lg">₹{parseFloat(row["Amount"] || 0).toLocaleString("en-IN")}</span>
              </div>
            </div>
          </div>

          {/* Narration */}
          {row["Narration"] && (
            <div className="border border-gray-300 rounded p-2 mb-4 bg-gray-50">
              <p className="text-xs sm:text-sm"><strong>Narration:</strong> {row["Narration"]}</p>
            </div>
          )}

          {/* Footer */}
          <div className="text-center text-xs text-gray-600 mt-6 pt-3 border-t border-gray-300">
            <p className="font-semibold">Thank you for your business!</p>
            <p className="mt-1">This is a computer-generated invoice</p>
          </div>
        </div>

        {/* ACTION BUTTONS */}
        <div className="bg-gray-100 p-3 sm:p-4 border-t border-gray-300 flex flex-wrap gap-2 sticky bottom-0">
          <select 
            value={printSize} 
            onChange={(e) => setPrintSize(e.target.value)} 
            className="bg-white border border-gray-300 rounded px-2 py-1.5 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-[#64FFDA]"
          >
            <option value="A4">A4 Size</option>
            <option value="A5">A5 Size</option>
            <option value="Thermal">Thermal (80mm)</option>
          </select>
          
          <button 
            onClick={onPrint} 
            className="px-3 py-1.5 rounded bg-[#64FFDA] text-[#071226] text-xs sm:text-sm font-semibold flex items-center gap-1 hover:bg-[#4dd9b4] transition-colors shadow"
          >
            <Printer size={14} /> Print
          </button>
          
          <button 
            onClick={onShare} 
            className="px-3 py-1.5 rounded bg-blue-600 text-white text-xs sm:text-sm font-semibold flex items-center gap-1 hover:bg-blue-700 transition-colors shadow"
          >
            <Share2 size={14} /> Share
          </button>
          
          <button 
            onClick={onCopy} 
            className="px-3 py-1.5 rounded bg-green-600 text-white text-xs sm:text-sm font-semibold flex items-center gap-1 hover:bg-green-700 transition-colors shadow"
          >
            <Copy size={14} /> Copy
          </button>
          
          <button 
            onClick={onClose} 
            className="ml-auto px-3 py-1.5 rounded bg-gray-600 text-white text-xs sm:text-sm font-semibold hover:bg-gray-700 transition-colors shadow"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
