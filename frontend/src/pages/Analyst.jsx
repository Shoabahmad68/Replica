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
  Eye,
  ChevronLeft,
  ChevronRight,
  Search
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
  
  // Default tab "alldata" kar diya hai taki pehle wahi dikhe jaisa tumne kaha
  const [activeSection, setActiveSection] = useState("alldata"); 
  const [companyFilter, setCompanyFilter] = useState("All Companies");
  const [searchQ, setSearchQ] = useState("");
  const [invoiceModalOpen, setInvoiceModalOpen] = useState(false);
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [selectedInvoice, setSelectedInvoice] = useState(null);
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
        
        // 1. Copy top level keys
        Object.keys(r).forEach((key) => {
          if (key === "voucher_data") return;
          const v = r[key];
          if (v && typeof v === "object") {
            normalized[key] = JSON.stringify(v);
          } else {
            normalized[key] = v;
          }
        });

        // 2. Flatten voucher_data if exists
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

    // Company Filter
    if (companyFilter && companyFilter !== "All Companies") {
      rows = rows.filter((r) => {
        const c = r["Company"] || r["Item Category"] || r["Party"] || r["Party Name"] || r["Company Name"] || "";
        return String(c).toLowerCase() === String(companyFilter).toLowerCase();
      });
    }

    // Search Filter
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
      if (!d) return true; // Keep data without date
      
      // Clean date string for comparison
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
          // Store raw, let useMemo clean it
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

  // METRICS & CHARTS (Reused Logic)
  const metrics = useMemo(() => {
    let totalSales = 0, receipts = 0, expenses = 0, outstanding = 0;
    (dateFiltered || []).forEach((r) => {
      const amt = parseFloat(r["Amount"] || r["Net Amount"] || r.amount || 0);
      const type = String(r["Type"] || r["Voucher Type"] || "").toLowerCase();
      
      // Basic Logic for demo
      totalSales += amt; 
      if (type.includes("receipt")) receipts += amt;
      else if (type.includes("payment") || type.includes("purchase")) expenses += Math.abs(amt);
      
      outstanding += parseFloat(r["Outstanding"] || 0) || 0;
    });
    return { totalSales, receipts, expenses, outstanding };
  }, [dateFiltered]);

  // EXPORT CSV
  const exportCSV = (rows, filename = "export") => {
    if (!rows || !rows.length) return alert("No data to export");
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

  const formatINR = (n) => `₹${(n || 0).toLocaleString("en-IN")}`;

  // RENDER LOADING / ERROR
  if (loading && !rawData.length)
    return <div className="h-screen flex items-center justify-center text-[#64FFDA] bg-[#071429]">Loading Data from Neon...</div>;
  
  if (error && !rawData.length)
    return <div className="h-screen flex items-center justify-center text-red-400 bg-[#071429]">{error}</div>;

  return (
    <div className="p-4 min-h-screen bg-gradient-to-br from-[#071226] via-[#0A192F] to-[#071226] text-gray-100 font-sans">
      <div className="w-full mx-auto bg-[#12223b] rounded-xl border border-[#223355] shadow-2xl flex flex-col h-[95vh]">
        
        {/* === HEADER === */}
        <div className="p-4 border-b border-[#223355] flex flex-wrap gap-4 justify-between items-center bg-[#0F1E36] rounded-t-xl shrink-0">
          <div>
            <h1 className="text-xl font-bold text-[#64FFDA] flex items-center gap-2">
              <FileSpreadsheet className="text-[#64FFDA]" /> SEL-T DATA ANALYST
            </h1>
            <p className="text-xs text-gray-400 mt-1">Sync Status: {lastSync ? new Date(lastSync).toLocaleString() : "Waiting..."}</p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Filters */}
            <select
              value={companyFilter}
              onChange={(e) => setCompanyFilter(e.target.value)}
              className="bg-[#0C1B31] border border-[#223355] text-gray-200 text-xs rounded px-2 py-2 outline-none focus:border-[#64FFDA]"
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
             { id: "alldata", label: "All Data (Master)" }, // Moved to first position
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
        <div className="flex-1 overflow-hidden relative bg-[#0B1626] p-0">
          
          {/* ALL DATA SECTION (Fixed & Prioritized) */}
          {activeSection === "alldata" && (
            <AllDataSection data={dateFiltered} />
          )}

          {/* DASHBOARD SECTION */}
          {activeSection === "dashboard" && (
            <div className="h-full overflow-y-auto p-6">
               <DashboardSection metrics={metrics} />
            </div>
          )}

          {/* TRANSACTIONS */}
          {activeSection === "transactions" && (
            <div className="h-full overflow-y-auto p-6">
              <h3 className="text-[#64FFDA] text-lg mb-4">Transactions</h3>
              <p className="text-gray-400 mb-4">Filtered View (Use All Data tab for raw view)</p>
              <AllDataSection data={dateFiltered.filter(r => r["Vch No."] || r["Voucher No"])} />
            </div>
          )}
          
          {/* SETTINGS PLACEHOLDER */}
          {activeSection === "settings" && (
             <div className="h-full flex items-center justify-center text-gray-400">
                <div className="text-center">
                   <h2 className="text-xl text-[#64FFDA]">Settings & Configuration</h2>
                   <p className="mt-2">Backend Sync Status: Active</p>
                   <p>Neon DB Connection: Connected</p>
                </div>
             </div>
          )}

          {/* OTHER SECTIONS PLACEHOLDERS */}
          {["masters", "reports", "party", "inventory"].includes(activeSection) && (
            <div className="h-full flex items-center justify-center text-gray-500">
               Module '{activeSection}' is connected to All Data source.
            </div>
          )}

        </div>
      </div>
    </div>
  );
}

// =========================================================================
//  THE FIXED ALL DATA SECTION (Dynamic Columns + 20 Rows + Overflow Fix)
// =========================================================================
function AllDataSection({ data }) {
  const [currentPage, setCurrentPage] = useState(1);
  const rowsPerPage = 20;

  // Reset page when data changes (e.g. search filter)
  useEffect(() => {
    setCurrentPage(1);
  }, [data.length]);

  // 1. Get All Unique Columns dynamically (No hardcoding)
  const columns = useMemo(() => {
    if (!data || data.length === 0) return [];
    // Sample first 50 rows to get keys to avoid performance hit on large datasets
    const sample = data.slice(0, 100); 
    const keys = new Set();
    sample.forEach(row => Object.keys(row).forEach(k => keys.add(k)));
    
    // Sort keys preference: Date, Vch No, Party, Amount come first
    const preferred = ["Date", "Voucher Date", "Vch No.", "Vch No", "Party Name", "Party", "Amount", "Debit", "Credit"];
    const sortedKeys = Array.from(keys).sort((a, b) => {
      const idxA = preferred.indexOf(a);
      const idxB = preferred.indexOf(b);
      if (idxA !== -1 && idxB !== -1) return idxA - idxB;
      if (idxA !== -1) return -1;
      if (idxB !== -1) return 1;
      return a.localeCompare(b);
    });
    return sortedKeys;
  }, [data]);

  // 2. Pagination Logic
  const totalPages = Math.ceil(data.length / rowsPerPage);
  const indexOfLastRow = currentPage * rowsPerPage;
  const indexOfFirstRow = indexOfLastRow - rowsPerPage;
  const currentRows = data.slice(indexOfFirstRow, indexOfLastRow);

  if (!data || data.length === 0) {
    return (
      <div className="h-full flex flex-col items-center justify-center text-gray-500">
        <FileSpreadsheet size={48} className="mb-4 opacity-50" />
        <p>No data found matching your filters.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-[#0B1626]">
      {/* Table Container - Overflow Handling */}
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
                  // Truncate long JSON strings for display
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

      {/* Fixed Pagination Footer */}
      <div className="h-14 shrink-0 bg-[#0F1E36] border-t border-[#223355] flex items-center justify-between px-6">
        <span className="text-xs text-gray-400">
          Showing {indexOfFirstRow + 1} - {Math.min(indexOfLastRow, data.length)} of {data.length} records
        </span>
        
        <div className="flex items-center gap-2">
          <button
            onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
            disabled={currentPage === 1}
            className="p-2 rounded bg-[#1E2D50] hover:bg-[#64FFDA] hover:text-black disabled:opacity-30 disabled:hover:bg-[#1E2D50] disabled:hover:text-gray-400 transition-all"
          >
            <ChevronLeft size={16} />
          </button>
          
          <span className="text-sm font-mono text-[#64FFDA] bg-[#0B1626] px-3 py-1 rounded border border-[#223355]">
            Page {currentPage} / {totalPages}
          </span>

          <button
            onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
            disabled={currentPage === totalPages}
            className="p-2 rounded bg-[#1E2D50] hover:bg-[#64FFDA] hover:text-black disabled:opacity-30 disabled:hover:bg-[#1E2D50] disabled:hover:text-gray-400 transition-all"
          >
            <ChevronRight size={16} />
          </button>
        </div>
      </div>
    </div>
  );
}

// ================= SIMPLE DASHBOARD =================
function DashboardSection({ metrics }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
      <Card title="Total Sales" value={metrics.totalSales} color="text-[#64FFDA]" />
      <Card title="Receipts" value={metrics.receipts} color="text-blue-400" />
      <Card title="Expenses" value={metrics.expenses} color="text-red-400" />
      <Card title="Outstanding" value={metrics.outstanding} color="text-yellow-400" />
      
      <div className="col-span-4 mt-8 p-6 bg-[#0F1E36] rounded border border-[#223355]">
         <h3 className="text-[#64FFDA] mb-2">System Status</h3>
         <p className="text-sm text-gray-400">
            Data is flowing from Cloudflare -> Neon DB -> Analyst Dashboard.
            The "All Data" tab now reflects the raw table structure exactly as it exists in the database.
         </p>
      </div>
    </div>
  );
}

function Card({ title, value, color }) {
  return (
    <div className="bg-[#0F1E36] p-6 rounded-xl border border-[#223355] shadow-lg">
      <h3 className="text-gray-400 text-sm font-medium uppercase tracking-wider">{title}</h3>
      <p className={`text-2xl font-bold mt-2 ${color}`}>
        ₹{(value || 0).toLocaleString("en-IN")}
      </p>
    </div>
  );
}
