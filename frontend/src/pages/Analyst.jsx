// frontend/src/pages/Analyst.jsx - WITH DATA DISPLAY
import React, { useEffect, useMemo, useState, useRef } from "react";
import {
  Line,
  Bar,
  Doughnut,
  Pie,
} from "react-chartjs-2";
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
  Settings,
  Plus,
  FileText,
  Users,
  Box,
  DollarSign,
  Eye,
} from "lucide-react";

import config from "../config.js";

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

// 🔥 DUMMY DATA for testing
const SAMPLE_DATA = [
  { "Sr.No": 1, "Date": "21-11-2025", "Vch No.": "S001", "Party Name": "ABC Traders", "City/Area": "Mumbai", "ItemName": "Product A", "Qty": 10, "Rate": 500, "Amount": 5000, "Salesman": "Rahul" },
  { "Sr.No": 2, "Date": "21-11-2025", "Vch No.": "S002", "Party Name": "XYZ Corp", "City/Area": "Delhi", "ItemName": "Product B", "Qty": 5, "Rate": 1000, "Amount": 5000, "Salesman": "Amit" },
  { "Sr.No": 3, "Date": "20-11-2025", "Vch No.": "S003", "Party Name": "ABC Traders", "City/Area": "Mumbai", "ItemName": "Product C", "Qty": 15, "Rate": 300, "Amount": 4500, "Salesman": "Rahul" },
  { "Sr.No": 4, "Date": "20-11-2025", "Vch No.": "S004", "Party Name": "PQR Industries", "City/Area": "Pune", "ItemName": "Product D", "Qty": 8, "Rate": 750, "Amount": 6000, "Salesman": "Neha" },
  { "Sr.No": 5, "Date": "19-11-2025", "Vch No.": "S005", "Party Name": "XYZ Corp", "City/Area": "Delhi", "ItemName": "Product E", "Qty": 12, "Rate": 400, "Amount": 4800, "Salesman": "Amit" },
];

export default function Analyst() {
  const [rawData, setRawData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [activeSection, setActiveSection] = useState("dashboard");
  const [companyFilter, setCompanyFilter] = useState("All Companies");
  const [searchQ, setSearchQ] = useState("");
  const [invoiceModalOpen, setInvoiceModalOpen] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const [printSize, setPrintSize] = useState("A4");
  const [autoRefresh, setAutoRefresh] = useState(false);
  const [lastSync, setLastSync] = useState(null);
  const modalRef = useRef();

  useEffect(() => {
    let cancelled = false;
    const fetchLatest = async () => {
      setLoading(true);
      try {
        console.log("🔍 Fetching from:", `${config.ANALYST_BACKEND_URL}/api/analyst/latest`);
        const resp = await fetch(`${config.ANALYST_BACKEND_URL}/api/analyst/latest`, {
          headers: { "Content-Type": "application/json" },
          method: "GET",
        });
        const json = await resp.json();
        console.log("📥 Backend Response:", json);
        
        const rows = json?.rows || json?.data?.rows || json?.data || [];

        if (Array.isArray(rows) && rows.length > 0) {
          console.log("✅ Got data:", rows.length, "rows");
          if (!cancelled) {
            setRawData(rows);
            localStorage.setItem("analyst_latest_rows", JSON.stringify(rows));
            setLastSync(new Date().toISOString());
          }
        } else {
          console.log("⚠️ No data from backend, trying localStorage...");
          const saved = localStorage.getItem("analyst_latest_rows");
          if (saved && !cancelled) {
            const parsed = JSON.parse(saved);
            console.log("💾 Using cached data:", parsed.length, "rows");
            setRawData(parsed);
            setLastSync("Cache");
          } else if (!cancelled) {
            console.log("🧪 Using SAMPLE DATA for testing");
            setRawData(SAMPLE_DATA);
            setLastSync("Sample Data");
            setError("⚠️ Backend me data nahi hai - Sample data dikha rahe hain");
          }
        }
      } catch (err) {
        console.error("❌ Fetch error:", err);
        const saved = localStorage.getItem("analyst_latest_rows");
        if (saved && !cancelled) {
          console.log("💾 Error - using cache");
          setRawData(JSON.parse(saved));
          setLastSync("Cache");
        } else if (!cancelled) {
          console.log("🧪 Error - using SAMPLE DATA");
          setRawData(SAMPLE_DATA);
          setLastSync("Sample Data");
          setError("⚠️ Backend error - Sample data dikha rahe hain");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    fetchLatest();

    let timer;
    if (autoRefresh) {
      timer = setInterval(fetchLatest, 60 * 1000);
    }
    return () => {
      cancelled = true;
      if (timer) clearInterval(timer);
    };
  }, [autoRefresh]);

  const cleanData = useMemo(() => {
    if (!Array.isArray(rawData)) return [];
    console.log("🧹 Cleaning data:", rawData.length, "rows");
    const skipWords = ["total", "grand total", "sub total", "overall total"];
    const cleaned = rawData.filter((row) => {
      if (!row || typeof row !== "object") return false;
      const all = Object.values(row).join(" ").toLowerCase();
      if (!all.trim()) return false;
      return !skipWords.some((w) => all.includes(w));
    });
    console.log("✅ Clean data:", cleaned.length, "rows");
    return cleaned;
  }, [rawData]);

  // 🔥 GET ALL COLUMNS DYNAMICALLY
  const allColumns = useMemo(() => {
    if (cleanData.length === 0) return [];
    const cols = new Set();
    cleanData.forEach((row) => {
      Object.keys(row).forEach((key) => cols.add(key));
    });
    const colArray = Array.from(cols);
    console.log("📊 All Columns:", colArray);
    return colArray;
  }, [cleanData]);

  const companyList = useMemo(() => {
    const setC = new Set();
    cleanData.forEach((r) => {
      const c = r["Company"] || r["Item Category"] || r["Party"] || r["Party Name"] || "Unknown";
      setC.add(c);
    });
    return ["All Companies", ...Array.from(setC)];
  }, [cleanData]);

  useEffect(() => {
    if (!companyList.includes(companyFilter)) setCompanyFilter("All Companies");
  }, [companyList, companyFilter]);

  const filteredData = useMemo(() => {
    const q = (searchQ || "").trim().toLowerCase();
    return cleanData.filter((r) => {
      const companyVal = (r["Company"] || r["Item Category"] || r["Party Name"] || "Unknown") + "";
      if (companyFilter !== "All Companies" && companyVal !== companyFilter) return false;
      if (!q) return true;
      const combined = Object.values(r).join(" ").toLowerCase();
      return combined.includes(q);
    });
  }, [cleanData, companyFilter, searchQ]);

  const metrics = useMemo(() => {
    let totalSales = 0;
    let receipts = 0;
    let expenses = 0;
    let outstanding = 0;

    filteredData.forEach((r) => {
      const amt = parseFloat(r["Amount"]) || parseFloat(r["Net Amount"]) || 0;
      totalSales += amt;
      receipts += amt * 0.7;
      expenses += amt * 0.3;
      outstanding += parseFloat(r["Outstanding"]) || 0;
    });

    return {
      totalSales,
      receipts,
      expenses,
      outstanding: Math.max(0, outstanding),
    };
  }, [filteredData]);

  const monthlySales = useMemo(() => {
    const m = {};
    filteredData.forEach((r) => {
      const dstr = r["Date"] || r["Voucher Date"] || r["Invoice Date"] || "";
      let key = "Unknown";
      if (dstr) {
        const parts = String(dstr).split(/[-\/]/);
        if (parts.length >= 2) {
          key = parts[0].length === 4 ? `${parts[0]}-${parts[1]}` : `${parts[2]}-${parts[1]}`;
        } else {
          key = dstr;
        }
      }
      const amt = parseFloat(r["Amount"]) || 0;
      m[key] = (m[key] || 0) + amt;
    });
    const ordered = Object.keys(m).sort();
    return {
      labels: ordered,
      values: ordered.map((k) => m[k]),
    };
  }, [filteredData]);

  const companySplit = useMemo(() => {
    const map = {};
    filteredData.forEach((r) => {
      const c = r["Company"] || r["Item Category"] || r["Party Name"] || "Unknown";
      const amt = parseFloat(r["Amount"]) || 0;
      map[c] = (map[c] || 0) + amt;
    });
    return {
      labels: Object.keys(map),
      values: Object.values(map),
    };
  }, [filteredData]);

  const topEntities = useMemo(() => {
    const prod = {};
    const cust = {};
    filteredData.forEach((r) => {
      const item = r["ItemName"] || r["Narration"] || r["Description"] || "Unknown";
      const party = r["Party Name"] || r["Customer"] || r["Party"] || "Unknown";
      const amt = parseFloat(r["Amount"]) || 0;
      prod[item] = (prod[item] || 0) + amt;
      cust[party] = (cust[party] || 0) + amt;
    });
    const topProducts = Object.entries(prod).sort((a, b) => b[1] - a[1]).slice(0, 25);
    const topCustomers = Object.entries(cust).sort((a, b) => b[1] - a[1]).slice(0, 25);
    return { topProducts, topCustomers };
  }, [filteredData]);

  const exportCSV = (rows, filename = "export") => {
    if (!rows || !rows.length) return;
    const keys = Array.from(
      new Set(rows.flatMap((r) => Object.keys(r || {})))
    );
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
  };

  const handlePrint = () => {
    window.print();
  };

  const handleShareInvoice = async () => {
    if (!selectedInvoice) return;
    const text = `Invoice: ${selectedInvoice["Vch No."] || ""}\nAmount: ${selectedInvoice["Amount"] || 0}`;
    if (navigator.share) {
      try {
        await navigator.share({ text });
      } catch (e) {
        console.log(e);
      }
    }
  };

  const copyInvoiceToClipboard = async () => {
    if (!selectedInvoice) return;
    const text = `Invoice: ${selectedInvoice["Vch No."] || ""}\nAmount: ${selectedInvoice["Amount"] || 0}`;
    try {
      await navigator.clipboard.writeText(text);
      alert("Copied!");
    } catch {
      alert("Failed");
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
    }],
  };

  const companyPie = {
    labels: companySplit.labels,
    datasets: [{
      data: companySplit.values,
      backgroundColor: ["#64FFDA", "#3B82F6", "#F59E0B", "#EF4444", "#8B5CF6", "#22D3EE"],
    }],
  };

  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center text-[#64FFDA] bg-[#071429]">
        <RefreshCw className="animate-spin mb-2" size={48} />
        <div>Loading data...</div>
      </div>
    );
  }

  return (
    <div className="p-6 min-h-screen bg-gradient-to-br from-[#071226] via-[#0A192F] to-[#071226] text-gray-100">
      <div className="max-w-7xl mx-auto bg-[#12223b] rounded-2xl p-6 border border-[#223355] shadow-xl">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-xl font-bold text-[#64FFDA] flex items-center gap-2">
            <FileSpreadsheet /> ANALYST — Business Intelligence
          </h1>
          <div className="flex items-center gap-3">
            <div className="text-sm text-gray-300">
              Sync: {lastSync ? (typeof lastSync === 'string' ? lastSync : new Date(lastSync).toLocaleTimeString()) : "—"}
            </div>
            <div className="text-sm text-green-400">📊 {cleanData.length} records</div>
            <select
              value={companyFilter}
              onChange={(e) => setCompanyFilter(e.target.value)}
              className="bg-[#0E1B2F] border border-[#223355] rounded px-3 py-2 text-sm"
            >
              {companyList.map((c, i) => (
                <option value={c} key={i}>{c}</option>
              ))}
            </select>

            <button
              onClick={() => setAutoRefresh((s) => !s)}
              className={`px-3 py-2 rounded text-sm border ${autoRefresh ? "bg-[#64FFDA] text-[#071226]" : "bg-transparent text-[#64FFDA] border-[#64FFDA]/30"}`}
            >
              <RefreshCw size={16} /> {autoRefresh ? "Auto" : "Manual"}
            </button>

            <button
              onClick={() => {
                localStorage.removeItem("analyst_latest_rows");
                window.location.reload();
              }}
              className="px-3 py-2 rounded bg-[#64FFDA]/10 border border-[#64FFDA]/40 text-[#64FFDA]"
            >
              Clear
            </button>
          </div>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-yellow-900/20 border border-yellow-600/40 rounded text-yellow-200 text-sm">
            {error}
          </div>
        )}

        <div className="flex flex-wrap gap-2 mb-6">
          {[
            { key: "dashboard", label: "Dashboard" },
            { key: "dataview", label: "📊 All Data" },
            { key: "masters", label: "Masters" },
            { key: "transactions", label: "Transactions" },
            { key: "reports", label: "Reports" },
            { key: "party", label: "Party" },
            { key: "inventory", label: "Inventory" },
            { key: "dataentry", label: "Sales Entry" },
            { key: "settings", label: "Settings" },
          ].map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveSection(tab.key)}
              className={`px-4 py-2 rounded text-sm font-semibold ${activeSection === tab.key ? "bg-[#64FFDA] text-[#081827]" : "bg-[#0C1B31] text-gray-300 border border-[#223355]"}`}
            >
              {tab.label}
            </button>
          ))}
          <div className="ml-auto flex items-center gap-2">
            <input
              placeholder="Search..."
              value={searchQ}
              onChange={(e) => setSearchQ(e.target.value)}
              className="bg-[#0C1B31] px-3 py-2 rounded border border-[#223355] text-sm"
            />
            <button
              onClick={() => exportCSV(filteredData, "Export")}
              className="px-3 py-2 rounded bg-[#64FFDA]/10 border border-[#64FFDA]/40 text-[#64FFDA] text-sm"
            >
              <Download size={14} /> Export
            </button>
          </div>
        </div>

        <div>
          {activeSection === "dashboard" && (
            <DashboardSection
              metrics={metrics}
              monthlyChartData={monthlyChartData}
              companyPie={companyPie}
              topProducts={topEntities.topProducts}
              topCustomers={topEntities.topCustomers}
              data={filteredData}
              openInvoice={openInvoice}
              formatINR={formatINR}
            />
          )}

          {activeSection === "dataview" && (
            <AllDataSection data={filteredData} allColumns={allColumns} openInvoice={openInvoice} exportCSV={exportCSV} />
          )}

          {activeSection === "masters" && <MastersSection data={cleanData} openInvoice={openInvoice} />}
          {activeSection === "transactions" && <TransactionsSection data={filteredData} openInvoice={openInvoice} exportCSV={exportCSV} />}
          {activeSection === "reports" && <ReportsSection data={filteredData} exportCSV={exportCSV} />}
          {activeSection === "party" && <PartySection data={filteredData} openInvoice={openInvoice} />}
          {activeSection === "inventory" && <InventorySection data={filteredData} />}
          {activeSection === "dataentry" && <SalesEntrySection />}
          {activeSection === "settings" && <SettingsSection />}
        </div>
      </div>

      {invoiceModalOpen && selectedInvoice && (
        <InvoiceModal
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

// 🔥 NEW: ALL DATA SECTION - Shows all columns dynamically
function AllDataSection({ data, allColumns, openInvoice, exportCSV }) {
  const [page, setPage] = useState(1);
  const perPage = 50;
  const pages = Math.ceil(data.length / perPage);
  const pageData = data.slice((page - 1) * perPage, page * perPage);

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-[#64FFDA] text-lg font-semibold">📊 All Data ({data.length} records)</h3>
        <button onClick={() => exportCSV(data, "AllData")} className="px-4 py-2 rounded bg-[#64FFDA]/10 border border-[#64FFDA]/40 text-[#64FFDA]">
          <Download size={16} /> Export All
        </button>
      </div>

      <div className="bg-[#0D1B34] p-4 rounded-lg border border-[#1E2D50] overflow-x-auto">
        <table className="w-full text-sm text-gray-200">
          <thead className="text-[#64FFDA] bg-[#0A1A33]">
            <tr>
              {allColumns.map((col, i) => (
                <th key={i} className="py-2 px-3 text-left whitespace-nowrap border-b border-[#223355]">
                  {col}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {pageData.map((row, i) => (
              <tr key={i} className="border-b border-[#1E2D50] hover:bg-[#0F263F] cursor-pointer" onClick={() => openInvoice(row)}>
                {allColumns.map((col, ci) => (
                  <td key={ci} className="py-2 px-3 whitespace-nowrap">
                    {row[col] !== undefined && row[col] !== null ? String(row[col]) : "—"}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>

        <div className="flex justify-between items-center mt-4 pt-3 border-t border-[#223355]">
          <div className="text-sm text-gray-300">
            Showing {((page - 1) * perPage) + 1} to {Math.min(page * perPage, data.length)} of {data.length} records
          </div>
          <div className="flex gap-2">
            <button
              disabled={page <= 1}
              onClick={() => setPage(p => Math.max(1, p - 1))}
              className="px-3 py-1 bg-[#0C1B31] rounded border border-[#223355] disabled:opacity-40"
            >
              Previous
            </button>
            <div className="px-3 py-1 bg-[#0A1A33] rounded border border-[#223355]">
              Page {page} / {pages}
            </div>
            <button
              disabled={page >= pages}
              onClick={() => setPage(p => Math.min(pages, p + 1))}
              className="px-3 py-1 bg-[#0C1B31] rounded border border-[#223355] disabled:opacity-40"
            >
              Next
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function DashboardSection({ metrics, monthlyChartData, companyPie, topProducts, topCustomers, data, openInvoice, formatINR }) {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
        <MetricCard title="Total Sales" value={formatINR(metrics.totalSales)} />
        <MetricCard title="Receipts" value={formatINR(metrics.receipts)} />
        <MetricCard title="Expenses" value={formatINR(metrics.expenses)} />
        <MetricCard title="Outstanding" value={formatINR(metrics.outstanding)} />
      </div>

      <div className="grid md:grid-cols-3 gap-6">
        <div className="col-span-2 bg-[#0B1A33] p-4 rounded-lg border border-[#1E2D50]">
          <h3 className="text-[#64FFDA] mb-2">Monthly Sales Trend</h3>
          <div className="h-56">
            <Line data={monthlyChartData} options={{ maintainAspectRatio: false }} />
          </div>
        </div>

        <div className="bg-[#0B1A33] p-4 rounded-lg border border-[#1E2D50]">
          <h3 className="text-[#64FFDA] mb-2">Company Split</h3>
          <div className="h-56">
            <Doughnut data={companyPie} options={{ maintainAspectRatio: false }} />
          </div>
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        <ListBox title="Top Products" items={topProducts} />
        <ListBox title="Top Customers" items={topCustomers} />
      </div>

      <div className="bg-[#0D1B34] p-4 rounded-lg border border-[#1E2D50]">
        <h3 className="text-[#64FFDA] mb-3">Recent Transactions</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-gray-200">
            <thead className="text-[#64FFDA]">
              <tr>
                <th className="text-left py-2">Voucher</th>
                <th className="text-left py-2">Date</th>
                <th className="text-left py-2">Party</th>
                <th className="text-right py-2">Amount</th>
                <th className="text-right py-2">Action</th>
              </tr>
            </thead>
            <tbody>
              {data.slice(0, 12).map((r, i) => (
                <tr key={i} className="border-b border-[#1E2D50] hover:bg-[#0F263F]">
                  <td className="py-2">{r["Vch No."] || "—"}</td>
                  <td className="py-2">{r["Date"] || "—"}</td>
                  <td className="py-2">{r["Party Name"] || "—"}</td>
                  <td className="py-2 text-right">{formatINR(parseFloat(r["Amount"] || 0))}</td>
                  <td className="py-2 text-right">
                    <button onClick={() => openInvoice(r)} className="px-3 py-1 rounded bg-[#64FFDA]/10 border border-[#64FFDA]/40 text-[#64FFDA]">
                      <Eye size={14} /> View
                    </button>
                  </td>
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
      <ul className="text-sm text-gray-200 space-y-1 max-h-64 overflow-auto">
        {items.map(([name, amt], i) => (
          <li key={i} className="flex justify-between border-b border-[#1E2D50] py-1">
            <span>{i + 1}. {name}</span>
            <span>₹{(amt || 0).toLocaleString("en-IN")}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function MastersSection({ data, openInvoice }) {
  const parties = useMemo(() => {
    const s = new Set();
    data.forEach((r) => s.add(r["Party Name"] || "Unknown"));
    return Array.from(s).sort();
  }, [data]);

  const items = useMemo(() => {
    const s = new Set();
    data.forEach((r) => {
      const name = r["ItemName"];
      if (name) s.add(name);
    });
    return Array.from(s).sort();
  }, [data]);

  return (
    <div className="grid md:grid-cols-2 gap-6">
      <div className="bg-[#0D1B34] p-4 rounded-lg border border-[#1E2D50]">
        <h3 className="text-[#64FFDA] mb-2">Parties ({parties.length})</h3>
        <ul className="text-sm text-gray-200 space-y-1 max-h-96 overflow-auto">
          {parties.map((p, i) => (
            <li key={i} className="py-1 border-b border-[#1E2D50]">{p}</li>
          ))}
        </ul>
      </div>
      <div className="bg-[#0D1B34] p-4 rounded-lg border border-[#1E2D50]">
        <h3 className="text-[#64FFDA] mb-2">Items ({items.length})</h3>
        <ul className="text-sm text-gray-200 space-y-1 max-h-96 overflow-auto">
          {items.map((it, i) => (
            <li key={i} className="py-1 border-b border-[#1E2D50]">{it}</li>
          ))}
        </ul>
      </div>
    </div>
  );
}

function TransactionsSection({ data, openInvoice, exportCSV }) {
  const [page, setPage] = useState(1);
  const perPage = 25;
  const pages = Math.ceil(data.length / perPage);
  const pageData = data.slice((page - 1) * perPage, page * perPage);

  return (
    <div>
      <h3 className="text-[#64FFDA] mb-3">Transactions ({data.length})</h3>
      <div className="bg-[#0D1B34] p-4 rounded-lg border border-[#1E2D50] overflow-x-auto">
        <table className="w-full text-sm text-gray-200">
          <thead className="text-[#64FFDA]">
            <tr>
              <th className="py-2 text-left">Voucher</th>
              <th className="py-2 text-left">Date</th>
              <th className="py-2 text-left">Party</th>
              <th className="py-2 text-right">Amount</th>
              <th className="py-2 text-right">Action</th>
            </tr>
          </thead>
          <tbody>
            {pageData.map((r, i) => (
              <tr key={i} className="border-b border-[#1E2D50] hover:bg-[#0F263F]">
                <td className="py-2">{r["Vch No."] || "—"}</td>
                <td className="py-2">{r["Date"] || "—"}</td>
                <td className="py-2">{r["Party Name"] || "—"}</td>
                <td className="py-2 text-right">₹{(parseFloat(r["Amount"] || 0)).toLocaleString("en-IN")}</td>
                <td className="py-2 text-right">
                  <button onClick={() => openInvoice(r)} className="px-3 py-1 rounded bg-[#64FFDA]/10 border border-[#64FFDA]/40 text-[#64FFDA]">View</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className="flex justify-between mt-3">
          <div className="text-sm text-gray-300">Page {page}/{pages}</div>
          <div className="flex gap-2">
            <button disabled={page <= 1} onClick={() => setPage(p => Math.max(1, p - 1))} className="px-3 py-1 bg-[#0C1B31] rounded border border-[#223355]">Prev</button>
            <button disabled={page >= pages} onClick={() => setPage(p => Math.min(pages, p + 1))} className="px-3 py-1 bg-[#0C1B31] rounded border border-[#223355]">Next</button>
          </div>
        </div>
      </div>
    </div>
  );
}

function ReportsSection({ data, exportCSV }) {
  const total = data.reduce((s, r) => s + parseFloat(r["Amount"] || 0), 0);
  return (
    <div className="bg-[#0D1B34] p-4 rounded-lg border border-[#1E2D50]">
      <h3 className="text-[#64FFDA] mb-2">Financial Summary</h3>
      <div className="text-lg text-gray-200">Total: ₹{total.toLocaleString("en-IN")}</div>
      <button onClick={() => exportCSV(data, "Report")} className="mt-3 px-3 py-2 rounded bg-[#64FFDA]/10 border border-[#64FFDA]/40 text-[#64FFDA]">Export</button>
    </div>
  );
}

function PartySection({ data, openInvoice }) {
  const parties = {};
  data.forEach((r) => {
    const p = r["Party Name"] || "Unknown";
    parties[p] = parties[p] || { total: 0, count: 0 };
    parties[p].total += parseFloat(r["Amount"] || 0);
    parties[p].count++;
  });
  const list = Object.entries(parties).sort((a, b) => b[1].total - a[1].total);

  return (
    <div className="bg-[#0D1B34] p-4 rounded-lg border border-[#1E2D50]">
      <h3 className="text-[#64FFDA] mb-3">Party Ledger</h3>
      <div className="grid md:grid-cols-2 gap-4">
        {list.slice(0, 50).map(([name, obj], i) => (
          <div key={i} className="p-3 rounded border border-[#1E2D50] bg-[#0A1A33]">
            <div className="flex justify-between">
              <div><div className="font-semibold text-sm">{name}</div><div className="text-xs text-gray-300">Txns: {obj.count}</div></div>
              <div className="text-sm text-[#64FFDA]">₹{obj.total.toLocaleString("en-IN")}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function InventorySection({ data }) {
  const inv = {};
  data.forEach((r) => {
    const item = r["ItemName"] || "Misc";
    inv[item] = inv[item] || { qty: 0, value: 0 };
    inv[item].qty += parseFloat(r["Qty"] || 0);
    inv[item].value += parseFloat(r["Amount"] || 0);
  });
  const list = Object.entries(inv).sort((a, b) => b[1].value - a[1].value);

  return (
    <div className="bg-[#0D1B34] p-4 rounded-lg border border-[#1E2D50]">
      <h3 className="text-[#64FFDA] mb-2">Stock</h3>
      <table className="w-full text-sm text-gray-200">
        <thead className="text-[#64FFDA]"><tr><th className="py-2 text-left">Item</th><th className="py-2 text-right">Qty</th><th className="py-2 text-right">Value</th></tr></thead>
        <tbody>
          {list.slice(0, 50).map(([n, v], i) => (
            <tr key={i} className="border-b border-[#1E2D50]">
              <td className="py-2">{n}</td><td className="py-2 text-right">{v.qty.toFixed(2)}</td><td className="py-2 text-right">₹{v.value.toLocaleString("en-IN")}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function SalesEntrySection() {
  const [entries, setEntries] = useState([]);
  const [form, setForm] = useState({ party: "", item: "", qty: "", rate: "" });

  const addEntry = () => {
    if (!form.party || !form.item || !form.qty || !form.rate) return;
    const amount = parseFloat(form.qty) * parseFloat(form.rate);
    setEntries([...entries, { ...form, amount, id: Date.now() }]);
    setForm({ party: "", item: "", qty: "", rate: "" });
  };

  return (
    <div className="bg-[#0D1B34] p-5 rounded-lg border border-[#1E2D50]">
      <h3 className="text-[#64FFDA] mb-3">Sales Entry</h3>
      <div className="grid sm:grid-cols-4 gap-2 mb-4">
        {["party", "item", "qty", "rate"].map((field) => (
          <input key={field} placeholder={field.charAt(0).toUpperCase() + field.slice(1)} value={form[field]} onChange={(e) => setForm({ ...form, [field]: e.target.value })} className="bg-[#112240] p-2 rounded border border-[#223355]" />
        ))}
      </div>
      <button onClick={addEntry} className="bg-[#64FFDA]/10 border border-[#64FFDA]/40 text-[#64FFDA] px-4 py-2 rounded">Add</button>
      {entries.length > 0 && (
        <table className="w-full text-sm text-gray-300 mt-4">
          <thead className="text-[#64FFDA]"><tr><th>Party</th><th>Item</th><th>Qty</th><th>Rate</th><th>Amount</th></tr></thead>
          <tbody>{entries.map((e) => <tr key={e.id}><td>{e.party}</td><td>{e.item}</td><td>{e.qty}</td><td>{e.rate}</td><td>₹{e.amount.toLocaleString("en-IN")}</td></tr>)}</tbody>
        </table>
      )}
    </div>
  );
}

function SettingsSection() {
  return (
    <div className="bg-[#0D1B34] p-6 rounded-lg border border-[#1E2D50]">
      <h3 className="text-[#64FFDA] mb-3">Settings</h3>
      <p className="text-gray-300">Configure your preferences here</p>
    </div>
  );
}

function InvoiceModal({ refObj, row, onClose, printSize, setPrintSize, onPrint, onShare, onCopy }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-black/60">
      <div className="absolute inset-0" onClick={onClose}></div>
      <div ref={refObj} className="relative z-10 w-full max-w-2xl bg-[#081827] rounded-lg p-4 border border-[#223355]">
        <div className="flex justify-between items-center mb-3">
          <div className="text-[#64FFDA] font-semibold">Invoice #{row["Vch No."] || "—"}</div>
          <button onClick={onClose} className="px-3 py-1 rounded bg-[#081827] border border-[#223355]">Close</button>
        </div>
        <div className="bg-white text-black p-4 rounded">
          <div className="text-lg font-bold mb-2">Invoice Details</div>
          <div>Date: {row["Date"] || "—"}</div>
          <div>Party: {row["Party Name"] || "—"}</div>
          <div>Amount: ₹{(parseFloat(row["Amount"] || 0)).toLocaleString("en-IN")}</div>
        </div>
      </div>
    </div>
  );
}
