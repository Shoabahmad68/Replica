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
  PackageSearch,
} from "lucide-react";
import config from "../config.js";

ChartJS.register(ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement, PointElement, LineElement, Title);

export default function Analyst() {
  const [rawData, setRawData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [activeSection, setActiveSection] = useState("dashboard");
  const [companyFilter, setCompanyFilter] = useState("All Companies");
  const [searchQ, setSearchQ] = useState("");
  const [invoiceModalOpen, setInvoiceModalOpen] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const [autoRefresh, setAutoRefresh] = useState(false);
  const [lastSync, setLastSync] = useState(null);
  const modalRef = useRef();

  useEffect(() => {
    let cancelled = false;
    const fetchLatest = async () => {
      setLoading(true);
      setError("");
      try {
        const resp = await fetch(`${config.ANALYST_BACKEND_URL}/api/analyst/latest`, {
          headers: { "Content-Type": "application/json" },
          method: "GET",
        });
        if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
        const json = await resp.json();
        let rows = json.rows || json.data?.rows || json.data || json || [];
        if (!Array.isArray(rows)) rows = [];

        if (rows.length > 0 && !cancelled) {
          setRawData(rows);
          localStorage.setItem("analyst_latest_rows", JSON.stringify(rows));
          setLastSync(new Date().toISOString());
        } else {
          const saved = localStorage.getItem("analyst_latest_rows");
          if (saved && !cancelled) {
            setRawData(JSON.parse(saved));
            setLastSync("Cache");
            setError("Using cached data");
          } else if (!cancelled) {
            setRawData([]);
            setError("No data - upload first");
          }
        }
      } catch (err) {
        const saved = localStorage.getItem("analyst_latest_rows");
        if (saved && !cancelled) {
          setRawData(JSON.parse(saved));
          setLastSync("Cache");
          setError(`Backend error - using cache`);
        } else if (!cancelled) {
          setError(`Failed: ${err.message}`);
          setRawData([]);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    fetchLatest();
    let timer;
    if (autoRefresh) timer = setInterval(fetchLatest, 60000);
    return () => {
      cancelled = true;
      if (timer) clearInterval(timer);
    };
  }, [autoRefresh]);

  const cleanData = useMemo(() => {
    if (!Array.isArray(rawData)) return [];
    return rawData.filter((row) => {
      if (!row || typeof row !== "object") return false;
      const all = Object.values(row).join(" ").toLowerCase();
      return all.trim() && !["total", "grand total"].some((w) => all.includes(w));
    });
  }, [rawData]);

  const companyList = useMemo(() => {
    const setC = new Set();
    cleanData.forEach((r) => setC.add(r["Company"] || r["Party Name"] || "Unknown"));
    return ["All Companies", ...Array.from(setC)];
  }, [cleanData]);

  const filteredData = useMemo(() => {
    const q = (searchQ || "").toLowerCase();
    return cleanData.filter((r) => {
      const companyVal = String(r["Company"] || r["Party Name"] || "Unknown");
      if (companyFilter !== "All Companies" && companyVal !== companyFilter) return false;
      if (!q) return true;
      return Object.values(r).join(" ").toLowerCase().includes(q);
    });
  }, [cleanData, companyFilter, searchQ]);

  const metrics = useMemo(() => {
    let totalSales = 0, receipts = 0, expenses = 0, outstanding = 0;
    filteredData.forEach((r) => {
      const amt = parseFloat(r["Amount"] || r["Net Amount"] || 0);
      totalSales += amt;
      receipts += amt * 0.7;
      expenses += amt * 0.3;
      outstanding += parseFloat(r["Outstanding"] || 0);
    });
    return { totalSales, receipts, expenses, outstanding: Math.max(0, outstanding) };
  }, [filteredData]);

  const monthlySales = useMemo(() => {
    const m = {};
    filteredData.forEach((r) => {
      const dstr = r["Date"] || r["Voucher Date"] || "";
      let key = "Unknown";
      if (dstr) {
        try {
          const parts = String(dstr).split(/[-\/]/);
          key = parts.length >= 2 ? (parts[0].length === 4 ? `${parts[0]}-${parts[1]}` : `${parts[2]}-${parts[1]}`) : dstr;
        } catch { key = String(dstr).substring(0, 7); }
      }
      m[key] = (m[key] || 0) + parseFloat(r["Amount"] || 0);
    });
    const ordered = Object.keys(m).sort();
    return { labels: ordered, values: ordered.map((k) => m[k]) };
  }, [filteredData]);

  const companySplit = useMemo(() => {
    const map = {};
    filteredData.forEach((r) => {
      const c = r["Company"] || r["Item Category"] || "Unknown";
      map[c] = (map[c] || 0) + parseFloat(r["Amount"] || 0);
    });
    return { labels: Object.keys(map), values: Object.values(map) };
  }, [filteredData]);

  const topEntities = useMemo(() => {
    const prod = {}, cust = {};
    filteredData.forEach((r) => {
      const item = r["ItemName"] || r["Description"] || "Unknown";
      const party = r["Party Name"] || "Unknown";
      const amt = parseFloat(r["Amount"] || 0);
      prod[item] = (prod[item] || 0) + amt;
      cust[party] = (cust[party] || 0) + amt;
    });
    return {
      topProducts: Object.entries(prod).sort((a, b) => b[1] - a[1]).slice(0, 20),
      topCustomers: Object.entries(cust).sort((a, b) => b[1] - a[1]).slice(0, 20),
    };
  }, [filteredData]);

  const exportCSV = (rows, filename = "export") => {
    if (!rows?.length) return;
    const keys = Array.from(new Set(rows.flatMap((r) => Object.keys(r || {}))));
    const csvRows = [keys.join(",")];
    rows.forEach((r) => {
      const line = keys.map((k) => {
        let v = r[k] ?? "";
        v = String(v).replace(/"/g, '""');
        if (String(v).includes(",") || String(v).includes("\n")) v = `"${v}"`;
        return v;
      });
      csvRows.push(line.join(","));
    });
    const blob = new Blob([csvRows.join("\n")], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${filename}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const formatINR = (n) => `₹${(n || 0).toLocaleString("en-IN")}`;

  const monthlyChartData = {
    labels: monthlySales.labels,
    datasets: [{ label: "Monthly Sales", data: monthlySales.values, borderColor: "#64FFDA", backgroundColor: "rgba(100,255,218,0.12)", fill: true }],
  };

  const companyPie = {
    labels: companySplit.labels,
    datasets: [{ data: companySplit.values, backgroundColor: ["#64FFDA", "#3B82F6", "#F59E0B", "#EF4444", "#8B5CF6"] }],
  };

  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center text-[#64FFDA] bg-[#071429]">
        <RefreshCw className="animate-spin mb-3" size={48} />
        <div>Loading...</div>
      </div>
    );
  }

  return (
    <div className="p-6 min-h-screen bg-gradient-to-br from-[#071226] via-[#0A192F] to-[#071226] text-gray-100">
      <div className="max-w-7xl mx-auto bg-[#12223b] rounded-2xl p-6 border border-[#223355] shadow-xl">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-xl font-bold text-[#64FFDA] flex items-center gap-2">
            <FileSpreadsheet /> ANALYST
          </h1>
          <div className="flex items-center gap-3">
            <div className="text-sm text-gray-300">{lastSync ? new Date(lastSync).toLocaleTimeString() : "—"}</div>
            <select value={companyFilter} onChange={(e) => setCompanyFilter(e.target.value)} className="bg-[#0E1B2F] border border-[#223355] rounded px-3 py-2 text-sm">
              {companyList.map((c, i) => <option key={i} value={c}>{c}</option>)}
            </select>
            <button onClick={() => setAutoRefresh((s) => !s)} className={`px-3 py-2 rounded text-sm ${autoRefresh ? "bg-[#64FFDA] text-[#071226]" : "bg-transparent text-[#64FFDA] border border-[#64FFDA]/30"}`}>
              <RefreshCw size={16} /> {autoRefresh ? "Auto" : "Manual"}
            </button>
            <button onClick={() => { localStorage.removeItem("analyst_latest_rows"); window.location.reload(); }} className="px-3 py-2 rounded bg-[#64FFDA]/10 border border-[#64FFDA]/40 text-[#64FFDA]">
              Clear
            </button>
          </div>
        </div>

        {error && <div className="mb-4 p-3 bg-yellow-900/20 border border-yellow-600/40 rounded text-yellow-200 text-sm">{error}</div>}

        <div className="flex flex-wrap gap-2 mb-6">
          {["dashboard", "masters", "transactions", "reports", "party", "inventory", "dataentry", "settings"].map((tab) => (
            <button key={tab} onClick={() => setActiveSection(tab)} className={`px-4 py-2 rounded text-sm font-semibold ${activeSection === tab ? "bg-[#64FFDA] text-[#081827]" : "bg-[#0C1B31] text-gray-300 border border-[#223355]"}`}>
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
            </button>
          ))}
          <div className="ml-auto flex items-center gap-2">
            <input placeholder="Search..." value={searchQ} onChange={(e) => setSearchQ(e.target.value)} className="bg-[#0C1B31] px-3 py-2 rounded border border-[#223355] text-sm" />
            <button onClick={() => exportCSV(filteredData, "Export")} className="px-3 py-2 rounded bg-[#64FFDA]/10 border border-[#64FFDA]/40 text-[#64FFDA] text-sm">
              <Download size={14} /> Export
            </button>
          </div>
        </div>

        {cleanData.length === 0 ? (
          <div className="text-center py-12">
            <PackageSearch size={64} className="mx-auto text-gray-500 mb-4" />
            <h3 className="text-xl text-gray-300">No Data</h3>
          </div>
        ) : (
          <div>
            {activeSection === "dashboard" && <DashboardSection metrics={metrics} monthlyChartData={monthlyChartData} companyPie={companyPie} topProducts={topEntities.topProducts} topCustomers={topEntities.topCustomers} data={filteredData} formatINR={formatINR} openInvoice={(r) => { setSelectedInvoice(r); setInvoiceModalOpen(true); }} />}
            {activeSection === "masters" && <MastersSection data={cleanData} />}
            {activeSection === "transactions" && <TransactionsSection data={filteredData} exportCSV={exportCSV} openInvoice={(r) => { setSelectedInvoice(r); setInvoiceModalOpen(true); }} />}
            {activeSection === "reports" && <ReportsSection data={filteredData} exportCSV={exportCSV} />}
            {activeSection === "party" && <PartySection data={filteredData} />}
            {activeSection === "inventory" && <InventorySection data={filteredData} />}
            {activeSection === "dataentry" && <SalesEntrySection />}
            {activeSection === "settings" && <SettingsSection />}
          </div>
        )}
      </div>

      {invoiceModalOpen && selectedInvoice && (
        <InvoiceModal refObj={modalRef} row={selectedInvoice} onClose={() => setInvoiceModalOpen(false)} />
      )}
    </div>
  );
}

function DashboardSection({ metrics, monthlyChartData, companyPie, topProducts, topCustomers, data, formatINR, openInvoice }) {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
        {[["Total Sales", metrics.totalSales], ["Receipts", metrics.receipts], ["Expenses", metrics.expenses], ["Outstanding", metrics.outstanding]].map(([title, value], i) => (
          <div key={i} className="bg-[#0E2136] p-4 rounded-lg border border-[#1E2D50] text-center">
            <div className="text-sm text-gray-300">{title}</div>
            <div className="text-xl font-bold text-[#64FFDA] mt-2">{formatINR(value)}</div>
          </div>
        ))}
      </div>
      <div className="grid md:grid-cols-3 gap-6">
        <div className="col-span-2 bg-[#0B1A33] p-4 rounded-lg border border-[#1E2D50]">
          <h3 className="text-[#64FFDA] mb-2">Monthly Sales</h3>
          <div className="h-56"><Line data={monthlyChartData} options={{ maintainAspectRatio: false }} /></div>
        </div>
        <div className="bg-[#0B1A33] p-4 rounded-lg border border-[#1E2D50]">
          <h3 className="text-[#64FFDA] mb-2">Company Split</h3>
          <div className="h-56"><Doughnut data={companyPie} options={{ maintainAspectRatio: false }} /></div>
        </div>
      </div>
      <div className="grid md:grid-cols-2 gap-6">
        {[["Top Products", topProducts], ["Top Customers", topCustomers]].map(([title, items], idx) => (
          <div key={idx} className="bg-[#0D1B34] p-4 rounded-lg border border-[#1E2D50]">
            <h4 className="text-[#64FFDA] mb-2">{title}</h4>
            <ul className="text-sm text-gray-200 space-y-1 max-h-64 overflow-auto">
              {items.map(([name, amt], i) => (
                <li key={i} className="flex justify-between border-b border-[#1E2D50] py-1">
                  <span>{i + 1}. {name}</span><span>₹{(amt || 0).toLocaleString("en-IN")}</span>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
      <div className="bg-[#0D1B34] p-4 rounded-lg border border-[#1E2D50]">
        <h3 className="text-[#64FFDA] mb-3">Recent Transactions</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-gray-200">
            <thead className="text-[#64FFDA]">
              <tr><th className="text-left py-2">Voucher</th><th className="text-left py-2">Date</th><th className="text-left py-2">Party</th><th className="text-right py-2">Amount</th><th className="text-right py-2">Action</th></tr>
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

function MastersSection({ data }) {
  const parties = useMemo(() => Array.from(new Set(data.map((r) => r["Party Name"] || "Unknown"))).sort(), [data]);
  const items = useMemo(() => Array.from(new Set(data.map((r) => r["ItemName"] || "").filter(Boolean))).sort(), [data]);
  return (
    <div className="grid md:grid-cols-2 gap-6">
      {[["Parties", parties], ["Items", items]].map(([title, list], idx) => (
        <div key={idx} className="bg-[#0D1B34] p-4 rounded-lg border border-[#1E2D50]">
          <h3 className="text-[#64FFDA] mb-2">{title} ({list.length})</h3>
          <ul className="text-sm text-gray-200 space-y-1 max-h-96 overflow-auto">
            {list.map((item, i) => <li key={i} className="py-1 border-b border-[#1E2D50]">{item}</li>)}
          </ul>
        </div>
      ))}
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
            <tr><th className="py-2 text-left">Voucher</th><th className="py-2 text-left">Date</th><th className="py-2 text-left">Party</th><th className="py-2 text-right">Amount</th><th className="py-2 text-right">Action</th></tr>
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

function PartySection({ data }) {
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

function InvoiceModal({ refObj, row, onClose }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-black/60">
      <div className="absolute inset-0" onClick={onClose}></div>
      <div ref={refObj} className="relative z-10 w-full max-w-2xl bg-[#081827] rounded-lg p-4 border border-[#223355]">
        <div className="flex justify-between items-center mb-3">
          <div className="text-[#64FFDA] font-semibold">Invoice</div>
          <button onClick={onClose} className="px-3 py-1 rounded bg-[#081827] border border-[#223355]">Close</button>
        </div>
        <div className="bg-white text-black p-4 rounded">
          <div className="text-lg font-bold">Invoice Details</div>
          <div className="mt-2">Voucher: {row["Vch No."] || "—"}</div>
          <div>Date: {row["Date"] || "—"}</div>
          <div>Party: {row["Party Name"] || "—"}</div>
          <div>Amount: ₹{(parseFloat(row["Amount"] || 0)).toLocaleString("en-IN")}</div>
        </div>
      </div>
    </div>
  );
}
