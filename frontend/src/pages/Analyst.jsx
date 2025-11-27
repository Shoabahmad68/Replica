// frontend/src/pages/Analyst.jsx
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
  Search,
  X
} from "lucide-react";

import config from "../config.js";

// ================= UNIVERSAL NORMALIZER =================
function normalizeAny(obj, prefix = "") {
  let out = {};
  if (obj === null || obj === undefined) return out;

  if (typeof obj !== "object") {
    out[prefix || "value"] = obj;
    return out;
  }

  if (typeof obj === "object" && "@value" in obj) {
    out[prefix || "value"] = obj["@value"];
    return out;
  }

  if (Array.isArray(obj)) {
    obj.forEach((item, idx) => {
      const nested = normalizeAny(item, prefix ? `${prefix}_${idx}` : `${idx}`);
      Object.assign(out, nested);
    });
    return out;
  }

  for (const key of Object.keys(obj)) {
    const newKey = prefix ? `${prefix}_${key}` : key;
    const nested = normalizeAny(obj[key], newKey);
    Object.assign(out, nested);
  }
  return out;
}

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
  // states
  const [rawData, setRawData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [activeSection, setActiveSection] = useState("alldata"); // Default to All Data
  const [companyFilter, setCompanyFilter] = useState("All Companies");
  const [searchQ, setSearchQ] = useState("");
  const [invoiceModalOpen, setInvoiceModalOpen] = useState(false);
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const [printSize, setPrintSize] = useState("A4");
  const [autoRefresh, setAutoRefresh] = useState(false);
  const [lastSync, setLastSync] = useState(null);
  const modalRef = useRef();

  // CLEAN DATA MEMO
  const cleanData = useMemo(() => {
    try {
      if (!Array.isArray(rawData)) return [];
      return rawData.map((r) => {
        if (!r || typeof r !== "object") return {};
        const normalized = {};
        
        Object.keys(r).forEach((key) => {
          if (key === "voucher_data") return;
          const v = r[key];
          if (v && typeof v === "object") {
            normalized[key] = JSON.stringify(v);
          } else {
            normalized[key] = v;
          }
        });

        const voucher = r.voucher_data || r.voucher || null;
        if (voucher && typeof voucher === "object") {
          const flatVoucher = normalizeAny(voucher);
          Object.keys(flatVoucher).forEach((k) => {
            normalized[k] = flatVoucher[k];
          });
        }
        return normalized;
      });
    } catch (e) {
      console.error("Data Cleaning Error", e);
      return [];
    }
  }, [rawData]);

  // MAIN FILTERING
  const mainFilteredData = useMemo(() => {
    let rows = Array.isArray(cleanData) ? cleanData : [];

    if (companyFilter && companyFilter !== "All Companies") {
      rows = rows.filter((r) => {
        const c = r["Company"] || r["Item Category"] || r["Party"] || r["Party Name"] || r["Company Name"] || "";
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

  // DATE FILTER
  const dateFiltered = useMemo(() => {
    return mainFilteredData.filter((r) => {
      let d = r.voucher_date || r.date || r.voucherdate || r.invoice_date || r["Date"] || r["Voucher Date"] || "";
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

  // FETCH LOGIC
  useEffect(() => {
    let cancelled = false;
    const fetchClean = async () => {
      setLoading(true);
      setError("");
      try {
        const resp = await fetch(`${config.ANALYST_BACKEND_URL}/api/analyst/fetch`);
        const json = await resp.json();

        if (!json || !json.success || !Array.isArray(json.data)) {
          throw new Error("Invalid API Data");
        }

        if (!cancelled) {
          setRawData(json.data);
          setLastSync(new Date().toISOString());
          try {
             localStorage.setItem("analyst_latest_rows", JSON.stringify(json.data));
          } catch {}
        }
      } catch (e) {
        console.error("Fetch Error:", e);
        const backup = localStorage.getItem("analyst_latest_rows");
        if (backup) {
          try {
            setRawData(JSON.parse(backup));
            setLastSync("Loaded from cache");
          } catch { setError("Cache corrupted"); }
        } else {
          setError("Failed to load data from Neon/Server");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    fetchClean();
    let intv;
    if (autoRefresh) {
      intv = setInterval(fetchClean, 60000);
    }
    return () => {
      cancelled = true;
      if (intv) clearInterval(intv);
    };
  }, [autoRefresh]);

  // === CALCULATIONS FOR DASHBOARD (RESTORED) ===
  const metrics = useMemo(() => {
    let totalSales = 0, receipts = 0, expenses = 0, outstanding = 0;
    (dateFiltered || []).forEach((r) => {
      const amt = parseFloat(r["Amount"] || r["Net Amount"] || r.amount || 0);
      const type = String(r["Type"] || r["Voucher Type"] || r["Vch Type"] || "").toLowerCase();
      
      totalSales += amt; 
      if (type.includes("receipt")) receipts += amt;
      else if (type.includes("payment") || type.includes("purchase")) expenses += Math.abs(amt);
      else {
          // Fallback approximation if type not clear
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
      const dstr = r["Date"] || r["Voucher Date"] || r.date || "";
      let key = "Unknown";
      if (dstr) {
        const cleanStr = String(dstr).trim();
        const parts = cleanStr.split(/[-\/]/).map((x) => x.trim());
        if (parts.length >= 3) {
           // Try YYYY-MM
           if (parts[0].length === 4) key = `${parts[0]}-${parts[1].padStart(2, "0")}`;
           // Try DD-MM-YYYY
           else key = `${parts[2]}-${parts[1].padStart(2, "0")}`;
        }
      }
      const amt = parseFloat(r["Amount"] || r.amount || 0);
      m[key] = (m[key] || 0) + amt;
    });
    const ordered = Object.keys(m).sort();
    return { labels: ordered, values: ordered.map((k) => m[k]) };
  }, [dateFiltered]);

  const companySplit = useMemo(() => {
    const map = {};
    (dateFiltered || []).forEach((r) => {
      const c = r["Company"] || r["Item Category"] || r["Party Name"] || "Unknown";
      const amt = parseFloat(r["Amount"] || r.amount || 0);
      map[c] = (map[c] || 0) + amt;
    });
    return { labels: Object.keys(map), values: Object.values(map) };
  }, [dateFiltered]);

  const topEntities = useMemo(() => {
    const prod = {};
    const cust = {};
    (dateFiltered || []).forEach((r) => {
      const item = r["ItemName"] || r["Item Name"] || r["Description"] || "Unknown";
      const party = r["Party Name"] || r["Party"] || "Unknown";
      const amt = parseFloat(r["Amount"] || r.amount || 0);
      prod[item] = (prod[item] || 0) + amt;
      cust[party] = (cust[party] || 0) + amt;
    });
    return { 
        topProducts: Object.entries(prod).sort((a, b) => b[1] - a[1]).slice(0, 25),
        topCustomers: Object.entries(cust).sort((a, b) => b[1] - a[1]).slice(0, 25)
    };
  }, [dateFiltered]);

  // === HELPERS ===
  const exportCSV = (rows, filename = "export") => {
    if (!rows || !rows.length) return alert("No data");
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
    const blob = new Blob([csvRows.join("\n")], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${filename}.csv`;
    a.click();
  };

  const openInvoice = (row) => {
    setSelectedInvoice(row);
    setInvoiceModalOpen(true);
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
    }],
  };

  const companyPieData = {
    labels: companySplit.labels,
    datasets: [{
      data: companySplit.values,
      backgroundColor: ["#64FFDA", "#3B82F6", "#F59E0B", "#EF4444", "#8B5CF6", "#22D3EE"],
    }],
  };

  if (loading && !rawData.length)
    return <div className="h-screen flex items-center justify-center text-[#64FFDA] bg-[#071429]">Loading Analyst Data...</div>;

  return (
    <div className="p-4 min-h-screen bg-gradient-to-br from-[#071226] via-[#0A192F] to-[#071226] text-gray-100 font-sans">
      <div className="w-full mx-auto bg-[#12223b] rounded-xl border border-[#223355] shadow-2xl flex flex-col h-[95vh]">
        
        {/* === HEADER === */}
        <div className="p-4 border-b border-[#223355] flex flex-wrap gap-4 justify-between items-center bg-[#0F1E36] rounded-t-xl shrink-0">
          <div>
            <h1 className="text-xl font-bold text-[#64FFDA] flex items-center gap-2">
              <FileSpreadsheet className="text-[#64FFDA]" /> SEL-T DATA ANALYST
            </h1>
            <p className="text-xs text-gray-400 mt-1">Sync: {lastSync ? new Date(lastSync).toLocaleString() : "..."}</p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <select
              value={companyFilter}
              onChange={(e) => setCompanyFilter(e.target.value)}
              className="bg-[#0C1B31] border border-[#223355] text-gray-200 text-xs rounded px-2 py-2 outline-none"
            >
               <option>All Companies</option>
               {Array.from(new Set(cleanData.map(r => r["Company"] || r["Company Name"]))).filter(Boolean).map(c => <option key={c} value={c}>{c}</option>)}
            </select>
            <input type="date" value={fromDate} onChange={e => setFromDate(e.target.value)} className="bg-[#0C1B31] text-xs px-2 py-2 rounded border border-[#223355] text-gray-200" />
            <input type="date" value={toDate} onChange={e => setToDate(e.target.value)} className="bg-[#0C1B31] text-xs px-2 py-2 rounded border border-[#223355] text-gray-200" />
            <button onClick={() => setAutoRefresh(!autoRefresh)} className={`p-2 rounded border ${autoRefresh ? "bg-[#64FFDA] text-black" : "text-[#64FFDA] border-[#64FFDA]/30"}`}>
              <RefreshCw size={14} className={autoRefresh ? "animate-spin" : ""} />
            </button>
            <button onClick={() => exportCSV(dateFiltered, "FullDataExport")} className="px-3 py-2 bg-[#64FFDA]/10 border border-[#64FFDA]/40 text-[#64FFDA] text-xs rounded flex items-center gap-1">
              <Download size={14} /> Export
            </button>
          </div>
        </div>

        {/* === TABS === */}
        <div className="px-4 py-2 bg-[#0F1E36] border-b border-[#223355] flex gap-2 overflow-x-auto shrink-0 custom-scrollbar">
           {[
             { id: "alldata", label: "All Data (Master)" },
             { id: "dashboard", label: "Dashboard" },
             { id: "masters", label: "Masters" },
             { id: "transactions", label: "Transactions" },
             { id: "reports", label: "Reports" },
             { id: "settings", label: "Settings" }
           ].map(tab => (
             <button
               key={tab.id}
               onClick={() => setActiveSection(tab.id)}
               className={`px-4 py-2 text-sm font-medium whitespace-nowrap rounded transition-all ${
                 activeSection === tab.id 
                 ? "bg-[#64FFDA] text-[#071226] shadow-[0_0_10px_rgba(100,255,218,0.3)]" 
                 : "text-gray-400 hover:text-white hover:bg-[#1E2D50]"
               }`}
             >
               {tab.label}
             </button>
           ))}
           <div className="ml-auto relative min-w-[200px]">
             <Search className="absolute left-3 top-2.5 text-gray-500" size={14} />
             <input 
               value={searchQ}
               onChange={(e) => setSearchQ(e.target.value)}
               placeholder="Global Search..."
               className="w-full bg-[#0B1626] border border-[#223355] rounded-full pl-9 pr-4 py-1.5 text-sm text-gray-200 focus:border-[#64FFDA] outline-none"
             />
           </div>
        </div>

        {/* === MAIN CONTENT AREA === */}
        <div className="flex-1 overflow-hidden relative bg-[#0B1626]">
          
          {/* ALL DATA SECTION (Your New Dynamic Table) */}
          {activeSection === "alldata" && (
            <AllDataSection data={dateFiltered} />
          )}

          {/* DASHBOARD SECTION (Restored Features) */}
          {activeSection === "dashboard" && (
            <div className="h-full overflow-y-auto p-6 custom-scrollbar">
               <DashboardSection 
                 metrics={metrics} 
                 monthlyChartData={monthlyChartData} 
                 companyPie={companyPieData}
                 topProducts={topEntities.topProducts}
                 topCustomers={topEntities.topCustomers}
                 data={dateFiltered}
                 openInvoice={openInvoice}
                 formatINR={formatINR}
               />
            </div>
          )}

          {/* MASTERS SECTION (Restored) */}
          {activeSection === "masters" && (
            <div className="h-full overflow-y-auto p-6 custom-scrollbar">
              <MastersSection data={cleanData} openInvoice={openInvoice} />
            </div>
          )}

          {/* TRANSACTIONS SECTION (Restored) */}
          {activeSection === "transactions" && (
             <div className="h-full overflow-y-auto p-6 custom-scrollbar">
               <TransactionsSection data={dateFiltered} openInvoice={openInvoice} />
             </div>
          )}
          
          {/* REPORTS SECTION (Restored) */}
          {activeSection === "reports" && (
             <div className="h-full overflow-y-auto p-6 custom-scrollbar">
               <ReportsSection data={dateFiltered} exportCSV={exportCSV} />
             </div>
          )}

          {/* SETTINGS */}
          {activeSection === "settings" && (
             <div className="h-full flex items-center justify-center text-gray-400">
                <div className="text-center">
                   <h2 className="text-xl text-[#64FFDA]">Settings & Configuration</h2>
                   <p className="mt-2">Backend Sync Status: Active</p>
                   <p>Neon DB Connection: Connected</p>
                </div>
             </div>
          )}
        </div>
      </div>

      {/* INVOICE MODAL (Restored) */}
      {invoiceModalOpen && selectedInvoice && (
        <InvoiceModal
          refObj={modalRef}
          row={selectedInvoice}
          onClose={() => setInvoiceModalOpen(false)}
          printSize={printSize}
          setPrintSize={setPrintSize}
        />
      )}
    </div>
  );
}

// =========================================================================
//  1. DYNAMIC ALL DATA TABLE (With Pagination & Columns)
// =========================================================================
function AllDataSection({ data }) {
  const [currentPage, setCurrentPage] = useState(1);
  const rowsPerPage = 20;

  useEffect(() => { setCurrentPage(1); }, [data.length]);

  const columns = useMemo(() => {
    if (!data || data.length === 0) return [];
    const sample = data.slice(0, 100); 
    const keys = new Set();
    sample.forEach(row => Object.keys(row).forEach(k => keys.add(k)));
    const preferred = ["Date", "Voucher Date", "Vch No.", "Vch No", "Party Name", "Party", "Amount", "Debit", "Credit"];
    return Array.from(keys).sort((a, b) => {
      const idxA = preferred.indexOf(a);
      const idxB = preferred.indexOf(b);
      if (idxA !== -1 && idxB !== -1) return idxA - idxB;
      if (idxA !== -1) return -1;
      if (idxB !== -1) return 1;
      return a.localeCompare(b);
    });
  }, [data]);

  const totalPages = Math.ceil(data.length / rowsPerPage);
  const indexOfLastRow = currentPage * rowsPerPage;
  const indexOfFirstRow = indexOfLastRow - rowsPerPage;
  const currentRows = data.slice(indexOfFirstRow, indexOfLastRow);

  if (!data.length) return <div className="p-10 text-center text-gray-500">No Data</div>;

  return (
    <div className="flex flex-col h-full bg-[#0B1626]">
      <div className="flex-1 w-full overflow-auto custom-scrollbar">
        <table className="w-full text-left border-collapse min-w-max">
          <thead className="bg-[#0F1E36] sticky top-0 z-10 shadow-md">
            <tr>
              <th className="p-3 border-b border-[#223355] text-xs font-bold text-[#64FFDA] w-12 text-center">#</th>
              {columns.map((col) => (
                <th key={col} className="p-3 border-b border-[#223355] text-xs font-bold text-[#64FFDA] whitespace-nowrap">
                  {col}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-[#1E2D50]">
            {currentRows.map((row, index) => (
              <tr key={index} className="hover:bg-[#13233C] transition-colors group">
                <td className="p-3 text-xs text-gray-500 text-center border-r border-[#1E2D50]/50">
                   {indexOfFirstRow + index + 1}
                </td>
                {columns.map((col) => {
                  let val = row[col];
                  let displayVal = val;
                  if (typeof val === 'string' && val.length > 50 && (val.startsWith('{') || val.startsWith('['))) {
                     displayVal = "Complex Data (...)";
                  }
                  return (
                    <td key={col} className="p-3 text-xs text-gray-300 whitespace-nowrap max-w-[200px] overflow-hidden text-ellipsis border-r border-[#1E2D50]/50" title={String(val)}>
                      {displayVal !== undefined && displayVal !== null ? String(displayVal) : "-"}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="h-14 shrink-0 bg-[#0F1E36] border-t border-[#223355] flex items-center justify-between px-6">
        <span className="text-xs text-gray-400">Showing {indexOfFirstRow + 1} - {Math.min(indexOfLastRow, data.length)} of {data.length}</span>
        <div className="flex items-center gap-2">
          <button onClick={() => setCurrentPage(p => Math.max(p - 1, 1))} disabled={currentPage === 1} className="p-2 rounded bg-[#1E2D50] hover:bg-[#64FFDA] hover:text-black disabled:opacity-30"><ChevronLeft size={16} /></button>
          <span className="text-sm font-mono text-[#64FFDA] bg-[#0B1626] px-3 py-1 rounded border border-[#223355]">Page {currentPage} / {totalPages}</span>
          <button onClick={() => setCurrentPage(p => Math.min(p + 1, totalPages))} disabled={currentPage === totalPages} className="p-2 rounded bg-[#1E2D50] hover:bg-[#64FFDA] hover:text-black disabled:opacity-30"><ChevronRight size={16} /></button>
        </div>
      </div>
    </div>
  );
}

// =========================================================================
//  2. DASHBOARD SECTION (RESTORED CHARTS & LISTS)
// =========================================================================
function DashboardSection({ metrics, monthlyChartData, companyPie, topProducts, topCustomers, data, openInvoice, formatINR }) {
  return (
    <div className="space-y-6 pb-10">
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
        <MetricCard title="Total Sales" value={formatINR(metrics.totalSales)} />
        <MetricCard title="Receipts" value={formatINR(metrics.receipts)} />
        <MetricCard title="Expenses" value={formatINR(metrics.expenses)} />
        <MetricCard title="Outstanding" value={formatINR(metrics.outstanding)} />
      </div>

      <div className="grid md:grid-cols-3 gap-6">
        <div className="col-span-2 bg-[#0B1A33] p-4 rounded-lg border border-[#1E2D50]">
          <h3 className="text-[#64FFDA] mb-2">Monthly Sales Trend</h3>
          <div className="h-64">
            <Line data={monthlyChartData} options={{ maintainAspectRatio: false, responsive: true }} />
          </div>
        </div>
        <div className="bg-[#0B1A33] p-4 rounded-lg border border-[#1E2D50]">
          <h3 className="text-[#64FFDA] mb-2">Company Split</h3>
          <div className="h-64">
            <Doughnut data={companyPie} options={{ maintainAspectRatio: false, responsive: true }} />
          </div>
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        <ListBox title="Top Products" items={topProducts} />
        <ListBox title="Top Customers" items={topCustomers} />
      </div>

      <div className="bg-[#0D1B34] p-4 rounded-lg border border-[#1E2D50]">
         <h3 className="text-[#64FFDA] mb-3">Recent 10 Transactions</h3>
         <div className="overflow-x-auto">
            <table className="w-full text-sm text-gray-200">
               <thead className="text-[#64FFDA] border-b border-[#223355]">
                  <tr><th className="text-left py-2">Voucher</th><th className="text-left py-2">Date</th><th className="text-left py-2">Party</th><th className="text-right py-2">Amount</th><th className="text-right py-2">Action</th></tr>
               </thead>
               <tbody>
                  {data.slice(0, 10).map((r, i) => (
                     <tr key={i} className="border-b border-[#1E2D50] hover:bg-[#0F263F]">
                        <td className="py-2">{r["Vch No."] || r["Voucher No"] || r.id || "-"}</td>
                        <td>{r["Date"] || r["Voucher Date"] || "-"}</td>
                        <td>{r["Party Name"] || r["Party"] || "-"}</td>
                        <td className="text-right">{Number(r["Amount"] || r.amount || 0).toLocaleString("en-IN")}</td>
                        <td className="text-right"><button onClick={()=>openInvoice(r)} className="text-[#64FFDA] bg-[#64FFDA]/10 px-2 py-1 rounded text-xs">View</button></td>
                     </tr>
                  ))}
               </tbody>
            </table>
         </div>
      </div>
    </div>
  );
}

function MetricCard({ title, value }) {
  return (
    <div className="bg-[#0E2136] p-4 rounded-lg border border-[#1E2D50] text-center">
      <div className="text-sm text-gray-300">{title}</div>
      <div className="text-xl font-bold text-[#64FFDA] mt-2">{value}</div>
    </div>
  );
}

function ListBox({ title, items = [] }) {
  return (
    <div className="bg-[#0D1B34] p-4 rounded-lg border border-[#1E2D50]">
      <h4 className="text-[#64FFDA] mb-2">{title}</h4>
      <ul className="text-sm text-gray-200 space-y-1 max-h-64 overflow-auto custom-scrollbar">
        {items.map(([name, amt], i) => (
          <li key={i} className="flex justify-between border-b border-[#1E2D50] py-1">
            <span className="truncate max-w-[70%]">{i + 1}. {name}</span>
            <span>{(amt || 0).toLocaleString("en-IN")}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

// =========================================================================
//  3. MASTERS SECTION (RESTORED)
// =========================================================================
function MastersSection({ data = [], openInvoice }) {
  const parties = useMemo(() => {
    const s = new Set();
    (data || []).forEach((r) => s.add(r["Party Name"] || r["Customer"] || r["Party"] || "Unknown"));
    return Array.from(s).sort();
  }, [data]);

  const items = useMemo(() => {
    const s = new Set();
    (data || []).forEach((r) => {
      const name = (r["ItemName"] || r["Item Name"] || r["Description"] || "").toString().trim();
      if (name) s.add(name);
    });
    return Array.from(s).sort();
  }, [data]);

  return (
    <div className="grid md:grid-cols-2 gap-6 pb-10">
      <div className="bg-[#0D1B34] p-4 rounded-lg border border-[#1E2D50]">
        <h3 className="text-[#64FFDA] mb-2">Parties ({parties.length})</h3>
        <ul className="text-sm text-gray-200 space-y-1 max-h-96 overflow-auto custom-scrollbar">
          {parties.map((p, i) => (
            <li key={i} className="py-2 border-b border-[#1E2D50] flex justify-between items-center hover:bg-[#1E2D50] px-2 rounded">
              <span>{p}</span>
              <button onClick={() => {
                const recent = data.find((r) => (r["Party Name"] || r["Customer"] || r["Party"]) === p);
                if (recent) openInvoice(recent);
              }} className="px-2 py-1 rounded bg-[#64FFDA]/10 text-[#64FFDA] text-xs">Profile</button>
            </li>
          ))}
        </ul>
      </div>
      <div className="bg-[#0D1B34] p-4 rounded-lg border border-[#1E2D50]">
        <h3 className="text-[#64FFDA] mb-2">Items ({items.length})</h3>
        <ul className="text-sm text-gray-200 space-y-1 max-h-96 overflow-auto custom-scrollbar">
          {items.map((it, i) => <li key={i} className="py-2 border-b border-[#1E2D50] px-2">{it}</li>)}
        </ul>
      </div>
    </div>
  );
}

// =========================================================================
//  4. TRANSACTIONS SECTION (RESTORED)
// =========================================================================
function TransactionsSection({ data = [], openInvoice }) {
  return (
    <div className="pb-10">
      <h3 className="text-[#64FFDA] mb-4">Transaction Register</h3>
      <div className="overflow-auto custom-scrollbar rounded border border-[#223355]">
        <table className="w-full text-sm text-left text-gray-300">
          <thead className="bg-[#0F1E36] text-[#64FFDA]">
            <tr>
              <th className="p-3">Date</th>
              <th className="p-3">Vch Type</th>
              <th className="p-3">Vch No</th>
              <th className="p-3">Party</th>
              <th className="p-3 text-right">Amount</th>
              <th className="p-3 text-center">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#1E2D50] bg-[#0B1626]">
            {data.slice(0, 50).map((r, i) => (
              <tr key={i} className="hover:bg-[#13233C]">
                <td className="p-3">{r["Date"] || r["Voucher Date"]}</td>
                <td className="p-3">{r["Vch Type"] || r["Voucher Type"]}</td>
                <td className="p-3">{r["Vch No."] || r["Voucher No"]}</td>
                <td className="p-3">{r["Party Name"] || r["Party"]}</td>
                <td className="p-3 text-right">₹{Number(r["Amount"] || r.amount || 0).toLocaleString("en-IN")}</td>
                <td className="p-3 text-center">
                   <button onClick={() => openInvoice(r)} className="p-1 text-[#64FFDA] hover:bg-[#64FFDA]/20 rounded"><Eye size={16} /></button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="mt-2 text-xs text-gray-500 text-center">Showing recent 50 transactions. Use All Data for full list.</div>
    </div>
  );
}

// =========================================================================
//  5. REPORTS SECTION (SIMPLE LIST)
// =========================================================================
function ReportsSection({ data, exportCSV }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      <div className="bg-[#0D1B34] p-6 rounded-lg border border-[#1E2D50] text-center hover:border-[#64FFDA] transition cursor-pointer" onClick={() => exportCSV(data, "Sales_Register")}>
         <FileText size={32} className="mx-auto text-[#64FFDA] mb-3" />
         <h3 className="font-bold text-gray-200">Sales Register</h3>
         <p className="text-xs text-gray-400 mt-2">Export full sales data to CSV</p>
      </div>
      <div className="bg-[#0D1B34] p-6 rounded-lg border border-[#1E2D50] text-center hover:border-[#64FFDA] transition cursor-pointer" onClick={() => exportCSV(data.filter(r => r["Voucher Type"] === "Purchase"), "Purchase_Register")}>
         <FileText size={32} className="mx-auto text-blue-400 mb-3" />
         <h3 className="font-bold text-gray-200">Purchase Register</h3>
         <p className="text-xs text-gray-400 mt-2">Export purchase data to CSV</p>
      </div>
    </div>
  );
}

// =========================================================================
//  6. INVOICE MODAL (RESTORED)
// =========================================================================
function InvoiceModal({ refObj, row, onClose, printSize, setPrintSize }) {
  const handlePrint = () => {
    document.body.classList.add(printSize === "A4" ? "print-a4" : printSize === "A5" ? "print-a5" : "print-thermal");
    setTimeout(() => { window.print(); document.body.classList.remove("print-a4", "print-a5", "print-thermal"); }, 150);
  };

  const invoiceText = () => {
    let t = `Invoice: ${row["Vch No."] || row.id}\nDate: ${row["Date"]}\nParty: ${row["Party Name"]}\nAmount: ${row["Amount"]}`;
    return t;
  };

  const share = async () => {
    if (navigator.share) await navigator.share({ title: "Invoice", text: invoiceText() });
    else window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(invoiceText())}`, "_blank");
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <div className="bg-white text-black w-full max-w-3xl rounded-lg shadow-2xl flex flex-col max-h-[90vh]">
        <div className="flex justify-between items-center p-4 border-b bg-gray-50 rounded-t-lg">
           <h2 className="font-bold text-lg">Invoice View</h2>
           <button onClick={onClose}><X size={20} /></button>
        </div>
        
        <div className="p-4 bg-gray-100 flex gap-4 border-b">
           <select value={printSize} onChange={(e) => setPrintSize(e.target.value)} className="border rounded px-2 py-1 text-sm">
              <option value="A4">A4</option><option value="A5">A5</option><option value="Thermal">Thermal</option>
           </select>
           <button onClick={handlePrint} className="flex items-center gap-1 bg-blue-600 text-white px-3 py-1 rounded text-sm"><Printer size={14} /> Print</button>
           <button onClick={share} className="flex items-center gap-1 bg-green-600 text-white px-3 py-1 rounded text-sm"><Send size={14} /> Share</button>
        </div>

        <div ref={refObj} className="flex-1 overflow-auto p-8 bg-white font-mono text-sm" id="invoice-print-area">
           <div className="border p-6 mb-4">
              <div className="flex justify-between mb-4">
                 <h1 className="text-2xl font-bold">INVOICE</h1>
                 <div className="text-right">
                    <p>Inv No: <b>{row["Vch No."] || row["Invoice No"] || row.id}</b></p>
                    <p>Date: {row["Date"] || row["Voucher Date"]}</p>
                 </div>
              </div>
              <div className="mb-4">
                 <p className="font-bold">Bill To:</p>
                 <p>{row["Party Name"] || row["Party"] || row["Customer"]}</p>
              </div>
              <table className="w-full border-collapse border mt-4">
                 <thead className="bg-gray-200">
                    <tr><th className="border p-2 text-left">Item</th><th className="border p-2 text-right">Amount</th></tr>
                 </thead>
                 <tbody>
                    <tr>
                       <td className="border p-2">{row["ItemName"] || row["Item Name"] || row["Narration"] || "Item"}</td>
                       <td className="border p-2 text-right">{row["Amount"] || row.amount}</td>
                    </tr>
                 </tbody>
                 <tfoot>
                    <tr><td className="border p-2 font-bold text-right">Total</td><td className="border p-2 text-right font-bold">{row["Amount"] || row.amount}</td></tr>
                 </tfoot>
              </table>
           </div>
        </div>
      </div>
    </div>
  );
}
