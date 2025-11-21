// frontend/src/pages/Analyst.jsx
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

/*
  Phase-3 Analyst.jsx
  - Fetches latest JSON from backend /api/imports/latest
  - Ignores rows that look like totals
  - Dashboard + Masters + Transactions + Reports + Party + Inventory + Settings
  - Invoice preview modal (popup) with print-size selector (A4, A5, Thermal)
  - Export CSV, export simple PDF via window.print from the modal
  - Share options: navigator.share if available, WhatsApp link fallback, copy invoice text
*/

export default function Analyst() {
  const [rawData, setRawData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [activeSection, setActiveSection] = useState("dashboard"); // dashboard, masters, transactions, reports, party, inventory, settings
  const [companyFilter, setCompanyFilter] = useState("All Companies");
  const [searchQ, setSearchQ] = useState("");
  const [invoiceModalOpen, setInvoiceModalOpen] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const [printSize, setPrintSize] = useState("A4"); // A4, A5, Thermal
  const [autoRefresh, setAutoRefresh] = useState(false);
  const [lastSync, setLastSync] = useState(null);
  const modalRef = useRef();


useEffect(() => {
  let cancelled = false;
  const fetchLatest = async () => {
    setLoading(true);
    try {
      const resp = await fetch(`${config.ANALYST_BACKEND_URL}/api/analyst/latest`, {
        headers: { "Content-Type": "application/json" },
        method: "GET",
      });
      const json = await resp.json();
      const rows = json?.rows || [];

      if (Array.isArray(rows) && rows.length > 0) {
        if (!cancelled) {
          setRawData(rows);
          localStorage.setItem("analyst_latest_rows", JSON.stringify(rows));
          setLastSync(new Date().toISOString());
        }
      } else {
        const saved = localStorage.getItem("analyst_latest_rows");
        if (saved && !cancelled) {
          setRawData(JSON.parse(saved));
        } else if (!cancelled) {
          setRawData([]);
          setError("No data returned from backend. Upload Excel or check API.");
        }
      }
    } catch (err) {
      console.error("Fetch error:", err);
      const saved = localStorage.getItem("analyst_latest_rows");
      if (saved) {
        const parsed = JSON.parse(saved);
        const skipWords = ["total", "grand total", "sub total", "overall total"];
        const clean = parsed.filter((row) => {
          if (!row || typeof row !== "object") return false;
          const all = Object.values(row).join(" ").toLowerCase();
          return !skipWords.some((w) => all.includes(w));
        });
        setRawData(clean);
        setLastSync("Loaded from Local Storage");
      } else {
        setError("Failed to fetch data and no local backup found.");
      }
    } finally {
      if (!cancelled) setLoading(false);
    }
  };

  fetchLatest();

  let timer;
  if (autoRefresh) {
    timer = setInterval(fetchLatest, 60 * 1000); // every 60s
  }
  return () => {
    cancelled = true;
    if (timer) clearInterval(timer);
  };
}, [autoRefresh]);



  // Utility: filter out total-like rows
  // ✅ Clean data according to JSON structure — skip last total rows
const cleanData = useMemo(() => {
  if (!Array.isArray(rawData)) return [];
  const skipWords = ["total", "grand total", "sub total", "overall total"];
  return rawData.filter((row) => {
    if (!row || typeof row !== "object") return false;
    const all = Object.values(row).join(" ").toLowerCase();
    if (!all.trim()) return false;
    return !skipWords.some((w) => all.includes(w));
  });
}, [rawData]);

	const filteredData = cleanData;

  // Company list for filter
  const companyList = useMemo(() => {
    const setC = new Set();
    cleanData.forEach((r) => {
      const c = r["Company"] || r["Item Category"] || r["Party"] || r["Party Name"] || "Unknown";
      setC.add(c);
    });
    return ["All Companies", ...Array.from(setC)];
  }, [cleanData]);

useEffect(() => {
  let cancelled = false;

  const fetchLatest = async () => {
    setLoading(true);
    try {
      const resp = await fetch(`${config.ANALYST_BACKEND_URL}/api/analyst/latest`);
      const json = await resp.json();

      // BACKEND ALWAYS RETURNS { rows: [...] }
      const rows = Array.isArray(json.rows) ? json.rows : [];

      if (!cancelled) {
        setRawData(rows);
        setLastSync(json.lastUpdated || new Date().toISOString());
        localStorage.setItem("analyst_latest_rows", JSON.stringify(rows));
      }
    } catch (err) {
      console.error("Fetch error:", err);

      const backup = localStorage.getItem("analyst_latest_rows");
      if (backup) {
        setRawData(JSON.parse(backup));
        setLastSync("Loaded from cache");
      } else {
        setError("Failed to load analyst data");
      }
    } finally {
      if (!cancelled) setLoading(false);
    }
  };

  fetchLatest();

  return () => { cancelled = true };
}, []);


  // Aggregations for metrics
  const metrics = useMemo(() => {
    let totalSales = 0;
    let receipts = 0;
    let expenses = 0;
    let outstanding = 0;

    filteredData.forEach((r) => {
      const amt = parseFloat(r["Amount"]) || parseFloat(r["Net Amount"]) || 0;
      totalSales += amt;
      // heuristics: receipts could be payments type rows or Amount for receipts
      const type = (r["Type"] || r["Voucher Type"] || "").toString().toLowerCase();
      if (type.includes("receipt") || type.includes("payment") || (r["Receipt"] && !r["Payment"])) {
        receipts += amt;
      } else if (type.includes("expense") || type.includes("purchase")) {
        expenses += Math.abs(amt);
      } else {
        // default distribution
        receipts += amt * 0.9;
        expenses += amt * 0.1;
      }
      // outstanding field fallback if present
      outstanding += parseFloat(r["Outstanding"]) || 0;
    });

    outstanding = Math.max(0, outstanding); // non-negative

    return {
      totalSales,
      receipts,
      expenses,
      outstanding,
    };
  }, [filteredData]);

  // Monthly sales aggregation (for chart)
  const monthlySales = useMemo(() => {
    const m = {};
    filteredData.forEach((r) => {
      const dstr = r["Date"] || r["Voucher Date"] || r["Invoice Date"] || "";
      let key = "Unknown";
      if (dstr) {
        // robust parse: try YYYY-MM-DD or DD-MM-YYYY or other
        const iso = dstr.includes("-") ? dstr : dstr;
        const parts = iso.split(/[-\/]/).map((x) => x.trim());
        if (parts.length >= 3) {
          // try to detect order
          if (parts[0].length === 4) {
            // yyyy-mm-dd
            key = `${parts[0]}-${parts[1]}`;
          } else {
            // dd-mm-yyyy => parts[2]-parts[1]
            key = `${parts[2]}-${parts[1]}`;
          }
        } else {
          key = dstr;
        }
      }
      const amt = parseFloat(r["Amount"]) || parseFloat(r["Net Amount"]) || 0;
      m[key] = (m[key] || 0) + amt;
    });
    // sort keys chronologically if possible
    const ordered = Object.keys(m).sort();
    return {
      labels: ordered,
      values: ordered.map((k) => m[k]),
    };
  }, [filteredData]);

  // Company split
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

  // Top items & customers
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

  // Export CSV util
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
        // escape quotes
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

  // Open invoice modal for selected row
  const openInvoice = (row) => {
    setSelectedInvoice(row);
    setInvoiceModalOpen(true);
    // small delay to ensure modal mounted for print CSS adjustment
    setTimeout(() => {
      if (modalRef.current) modalRef.current.scrollTop = 0;
    }, 50);
  };

  // Print invoice modal
  const handlePrint = () => {
    // Add class to body to indicate print size
    document.body.classList.remove("print-a4", "print-a5", "print-thermal");
    if (printSize === "A4") document.body.classList.add("print-a4");
    if (printSize === "A5") document.body.classList.add("print-a5");
    if (printSize === "Thermal") document.body.classList.add("print-thermal");
    // wait a tick
    setTimeout(() => {
      window.print();
      // cleanup
      document.body.classList.remove("print-a4", "print-a5", "print-thermal");
    }, 150);
  };

  // Share invoice (navigator.share if available else WhatsApp link)
  const handleShareInvoice = async () => {
    if (!selectedInvoice) return;
    const text = invoiceText(selectedInvoice);
    if (navigator.share) {
      try {
        await navigator.share({
          title: `Invoice - ${selectedInvoice["Invoice No"] || selectedInvoice["Vch No."] || ""}`,
          text,
        });
      } catch (e) {
        console.warn("Share cancelled or failed", e);
      }
    } else {
      // fallback to WhatsApp / copy
      const wa = `https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`;
      window.open(wa, "_blank");
    }
  };

  // Prepare simple invoice text
  const invoiceText = (row) => {
    const invNo = row["Invoice No"] || row["Voucher No"] || "";
    const date = row["Date"] || row["Voucher Date"] || "";
    const party = row["Party Name"] || row["Customer"] || row["Party"] || "";
    const items = [
      {
        name: row["Item Name"] || row["Description"] || "Item",
        qty: row["Qty"] || 1,
        rate: row["Rate"] || row["Price"] || row["Amount"],
        amount: row["Amount"] || row["Net Amount"] || 0,
      },
    ];
    let t = `Invoice: ${invNo}\nDate: ${date}\nParty: ${party}\n`;
    t += `-----------------------------\n`;
    items.forEach((it) => {
      t += `${it.name} x ${it.qty} @ ${it.rate} = ${it.amount}\n`;
    });
    t += `-----------------------------\n`;
    t += `Total: ₹${(parseFloat(row["Amount"]) || 0).toLocaleString("en-IN")}\n`;
    return t;
  };

  // Copy invoice as text
  const copyInvoiceToClipboard = async () => {
    if (!selectedInvoice) return;
    const text = invoiceText(selectedInvoice);
    try {
      await navigator.clipboard.writeText(text);
      alert("Invoice text copied to clipboard");
    } catch {
      alert("Copy failed");
    }
  };

  // Small helpers
  const formatINR = (n) => `₹${(n || 0).toLocaleString("en-IN")}`;

  // Chart data objects
  const monthlyChartData = {
    labels: monthlySales.labels,
    datasets: [
      {
        label: "Monthly Sales",
        data: monthlySales.values,
        borderColor: "#64FFDA",
        backgroundColor: "rgba(100,255,218,0.12)",
        fill: true,
      },
    ],
  };

  const incomeExpenseData = {
    labels: ["Receipts", "Expenses", "Outstanding"],
    datasets: [
      {
        label: "Summary",
        data: [metrics.receipts, metrics.expenses, metrics.outstanding],
        backgroundColor: ["#64FFDA", "#EF4444", "#3B82F6"],
      },
    ],
  };

  const companyPie = {
    labels: companySplit.labels,
    datasets: [
      {
        data: companySplit.values,
        backgroundColor: [
          "#64FFDA",
          "#3B82F6",
          "#F59E0B",
          "#EF4444",
          "#8B5CF6",
          "#22D3EE",
        ],
      },
    ],
  };

  // Render loaders / errors
  if (loading)
    return (
      <div className="h-screen flex items-center justify-center text-[#64FFDA] bg-[#071429]">
        Loading analyst data...
      </div>
    );

  if (!cleanData.length)
    return (
      <div className="h-screen p-6 bg-gradient-to-br from-[#0A192F] via-[#112240] to-[#0A192F] text-gray-300">
        <div className="max-w-2xl mx-auto text-center">
          <h2 className="text-2xl text-[#64FFDA] font-semibold mb-2">No data found</h2>
          <p>Please upload Excel data at Reports &gt; Upload or check backend API.</p>

        </div>
      </div>
    );

  return (
    <div className="p-6 min-h-screen bg-gradient-to-br from-[#071226] via-[#0A192F] to-[#071226] text-gray-100">
      <div className="max-w-7xl mx-auto bg-[#12223b] rounded-2xl p-6 border border-[#223355] shadow-xl">
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-xl font-bold text-[#64FFDA] flex items-center gap-2">
            <FileSpreadsheet /> ANALYST — Analyst Replica
          </h1>
          <div className="flex items-center gap-3">
            <div className="text-sm text-gray-300">Sync: {lastSync ? new Date(lastSync).toLocaleString() : "—"}</div>
            <select
              value={companyFilter}
              onChange={(e) => setCompanyFilter(e.target.value)}
              className="bg-[#0E1B2F] border border-[#223355] rounded px-3 py-2 text-sm"
            >
              {companyList.map((c, i) => (
                <option value={c} key={i}>
                  {c}
                </option>
              ))}
            </select>

            <button
              onClick={() => {
                setAutoRefresh((s) => !s);
              }}
              className={`px-3 py-2 rounded text-sm border ${autoRefresh ? "bg-[#64FFDA] text-[#071226]" : "bg-transparent text-[#64FFDA] border-[#64FFDA]/30"}`}
            >
              <RefreshCw size={16} /> {autoRefresh ? "Auto" : "Refresh"}
            </button>

            <button
              onClick={() => {
                localStorage.removeItem("analyst_latest_rows");
                window.location.reload();
              }}
              className="px-3 py-2 rounded bg-[#64FFDA]/10 border border-[#64FFDA]/40 text-[#64FFDA]"
            >
              Clear Cache
            </button>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex flex-wrap gap-2 mb-6">
          {[
            { key: "dashboard", label: "Dashboard" },
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
              onClick={() => exportCSV(filteredData.slice(0, 1000), "AnalystExport")}
              className="px-3 py-2 rounded bg-[#64FFDA]/10 border border-[#64FFDA]/40 text-[#64FFDA] text-sm"
            >
              <Download size={14} /> Export
            </button>
          </div>
        </div>

        {/* Render Sections */}
        <div>
          {activeSection === "dashboard" && (
            <DashboardSection
              metrics={metrics}
              monthlyChartData={monthlyChartData}
              incomeExpenseData={incomeExpenseData}
              companyPie={companyPie}
              topProducts={topEntities.topProducts}
              topCustomers={topEntities.topCustomers}
              data={filteredData}
              openInvoice={openInvoice}
              formatINR={formatINR}
            />
          )}

          {activeSection === "masters" && (
            <MastersSection data={cleanData} openInvoice={openInvoice} />
          )}

          {activeSection === "transactions" && (
            <TransactionsSection data={filteredData} openInvoice={openInvoice} exportCSV={exportCSV} />
          )}

          {activeSection === "reports" && (
            <ReportsSection data={filteredData} exportCSV={exportCSV} />
          )}

          {activeSection === "party" && (
            <PartySection data={filteredData} openInvoice={openInvoice} />
          )}

          {activeSection === "inventory" && (
            <InventorySection data={filteredData} />
          )}


	{activeSection === "dataentry" && <SalesEntrySection />}

          {activeSection === "settings" && <SettingsSection />}
        </div>
      </div>

      {/* Invoice Modal */}
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

/* ================= Dashboard Section ================= */
function DashboardSection({
  metrics,
  monthlyChartData,
  incomeExpenseData,
  companyPie,
  topProducts,
  topCustomers,
  data,
  openInvoice,
  formatINR,
}) {
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
        <ListBox title="Top Products" items={topProducts} onItemClick={(r) => { /* noop */ }} />
        <ListBox title="Top Customers" items={topCustomers} onItemClick={(r) => { /* noop */ }} />
      </div>

      <div className="bg-[#0D1B34] p-4 rounded-lg border border-[#1E2D50]">
        <h3 className="text-[#64FFDA] mb-3">Recent Transactions</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-gray-200">
            <thead className="text-[#64FFDA]">
              <tr>
                <th className="text-left py-2">Voucher/Inv</th>
                <th className="text-left py-2">Date</th>
                <th className="text-left py-2">Party</th>
                <th className="text-right py-2">Amount</th>
                <th className="text-right py-2">Action</th>
              </tr>
            </thead>
            <tbody>
              {data.slice(0, 12).map((r, i) => (
                <tr key={i} className="border-b border-[#1E2D50] hover:bg-[#0F263F]">
                  <td className="py-2">{r["Vch No."]?.trim() || r["Voucher No"]?.trim() || "—"}</td>
                  <td className="py-2">{r["Date"] || r["Voucher Date"] || "—"}</td>
                  <td className="py-2">{r["Party Name"] || r["Customer"] || "—"}</td>
                  <td className="py-2 text-right">{(parseFloat(r["Amount"]) || 0).toLocaleString("en-IN")}</td>
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

/* Metric Card */
function MetricCard({ title, value }) {
  return (
    <div className="bg-[#0E2136] p-4 rounded-lg border border-[#1E2D50] text-center">
      <div className="text-sm text-gray-300">{title}</div>
      <div className="text-xl font-bold text-[#64FFDA] mt-2">{value}</div>
    </div>
  );
}

/* ListBox for top lists */
function ListBox({ title, items = [], onItemClick }) {
  return (
    <div className="bg-[#0D1B34] p-4 rounded-lg border border-[#1E2D50]">
      <h4 className="text-[#64FFDA] mb-2">{title}</h4>
      <ul className="text-sm text-gray-200 space-y-1 max-h-64 overflow-auto">
        {items.map(([name, amt], i) => (
          <li key={i} className="flex justify-between border-b border-[#1E2D50] py-1">
            <span>{i + 1}. {name}</span>
            <span>{(amt || 0).toLocaleString("en-IN")}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

/* ================= Masters Section ================= */
function MastersSection({ data = [], openInvoice }) {
  // Masters: Parties, Items, Salesmen
  const parties = useMemo(() => {
    const s = new Set();
    data.forEach((r) => s.add(r["Party Name"] || r["Customer"] || r["Party"] || "Unknown"));
    return Array.from(s).sort();
  }, [data]);

  const items = useMemo(() => {
  const s = new Set();
  data.forEach((r) => {
    const name = r["ItemName"]?.trim();
    if (name && !["", "unknown", "total"].includes(name.toLowerCase())) s.add(name);
  });
  return Array.from(s).sort();
}, [data]);


  const salesmen = useMemo(() => {
    const s = new Set();
    data.forEach((r) => s.add(r["Salesman"] || "Unknown"));
    return Array.from(s).sort();
  }, [data]);

  return (
    <div className="grid md:grid-cols-3 gap-6">
      <div className="bg-[#0D1B34] p-4 rounded-lg border border-[#1E2D50]">
        <h3 className="text-[#64FFDA] mb-2">Parties ({parties.length})</h3>
        <ul className="text-sm text-gray-200 space-y-1 max-h-96 overflow-auto">
          {parties.map((p, i) => (
            <li key={i} className="py-1 border-b border-[#1E2D50] flex justify-between">
              <span>{p}</span>
              <button onClick={() => {
                // find recent invoice for party
                const recent = data.find((r) => (r["Party Name"] || r["Customer"] || r["Party"]) === p);
                if (recent) openInvoice(recent);
              }} className="px-2 py-1 rounded bg-[#64FFDA]/10 border border-[#64FFDA]/40 text-[#64FFDA] text-xs">View</button>
            </li>
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

      <div className="bg-[#0D1B34] p-4 rounded-lg border border-[#1E2D50]">
        <h3 className="text-[#64FFDA] mb-2">Salesmen ({salesmen.length})</h3>
        <ul className="text-sm text-gray-200 space-y-1 max-h-96 overflow-auto">
          {salesmen.map((s, i) => (
            <li key={i} className="py-1 border-b border-[#1E2D50]">{s}</li>
          ))}
        </ul>
      </div>
    </div>
  );
}

/* ================= Transactions Section ================= */
function TransactionsSection({ data = [], openInvoice, exportCSV }) {
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
              <th className="py-2 text-left">Type</th>
              <th className="py-2 text-right">Amount</th>
              <th className="py-2 text-right">Action</th>
            </tr>
          </thead>
          <tbody>
            {pageData.map((r, i) => (
              <tr key={i} className="border-b border-[#1E2D50] hover:bg-[#0F263F]">
                <td className="py-2">{r["Vch No."]?.trim() || r["Invoice No"] || "—"}</td>
                <td className="py-2">{r["Date"] || r["Voucher Date"] || "—"}</td>
                <td className="py-2">{r["Party Name"] || r["Customer"] || "—"}</td>
                <td className="py-2">{r["Vch Type"] || r["Type"] || "—"}</td>
                <td className="py-2 text-right">{(parseFloat(r["Amount"]) || 0).toLocaleString("en-IN")}</td>
                <td className="py-2 text-right">
                  <button onClick={() => openInvoice(r)} className="px-3 py-1 rounded bg-[#64FFDA]/10 border border-[#64FFDA]/40 text-[#64FFDA]">View</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className="flex justify-between items-center mt-3">
          <div className="text-sm text-gray-300">Page {page}/{pages}</div>
          <div className="flex gap-2">
            <button disabled={page <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))} className="px-3 py-1 bg-[#0C1B31] rounded border border-[#223355]">Prev</button>
            <button disabled={page >= pages} onClick={() => setPage((p) => Math.min(pages, p + 1))} className="px-3 py-1 bg-[#0C1B31] rounded border border-[#223355]">Next</button>
            <button onClick={() => exportCSV(data, "Transactions")} className="px-3 py-1 bg-[#64FFDA]/10 border border-[#64FFDA]/40 rounded">Export CSV</button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ================= Reports Section ================= */
function ReportsSection({ data = [], exportCSV }) {
  // Reports: Profit & Loss-like simple snapshot, Outstanding
  const totalSales = data.reduce((s, r) => s + (parseFloat(r["Amount"]) || 0), 0);
  const outstandingMap = {};
  data.forEach((r) => {
    const p = r["Party Name"] || r["Customer"] || "Unknown";
    const o = parseFloat(r["Outstanding"]) || 0;
    outstandingMap[p] = (outstandingMap[p] || 0) + o;
  });
  const outstandingList = Object.entries(outstandingMap).sort((a, b) => b[1] - a[1]);

  return (
    <div className="grid md:grid-cols-2 gap-6">
      <div className="bg-[#0D1B34] p-4 rounded-lg border border-[#1E2D50]">
        <h3 className="text-[#64FFDA] mb-2">Quick Financial Snapshot</h3>
        <div className="text-lg text-gray-200">Total Sales: ₹{totalSales.toLocaleString("en-IN")}</div>
        <div className="mt-3">
          <button onClick={() => exportCSV(data, "AllData")} className="px-3 py-2 rounded bg-[#64FFDA]/10 border border-[#64FFDA]/40 text-[#64FFDA]">Export All</button>
        </div>
      </div>

      <div className="bg-[#0D1B34] p-4 rounded-lg border border-[#1E2D50]">
        <h3 className="text-[#64FFDA] mb-2">Top Outstanding</h3>
        <ul className="text-sm text-gray-200 space-y-1 max-h-96 overflow-auto">
          {outstandingList.slice(0, 25).map(([p, amt], i) => (
            <li key={i} className="flex justify-between border-b border-[#1E2D50] py-1">
              <span>{p}</span>
              <span>₹{(amt || 0).toLocaleString("en-IN")}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

/* ================= Party Section ================= */
function PartySection({ data = [], openInvoice }) {
  const parties = {};
  data.forEach((r) => {
    const p = r["Party Name"] || r["Customer"] || "Unknown";
    const amt = parseFloat(r["Amount"]) || 0;
    parties[p] = parties[p] || { total: 0, rows: [] };
    parties[p].total += amt;
    parties[p].rows.push(r);
  });
  const list = Object.entries(parties).sort((a, b) => b[1].total - a[1].total);

  return (
    <div className="bg-[#0D1B34] p-4 rounded-lg border border-[#1E2D50]">
      <h3 className="text-[#64FFDA] mb-3">Party Ledger</h3>
      <div className="grid md:grid-cols-2 gap-4">
        {list.slice(0, 50).map(([name, obj], i) => (
          <div key={i} className="p-3 rounded border border-[#1E2D50] bg-[#0A1A33]">
            <div className="flex justify-between items-start">
              <div>
                <div className="font-semibold text-sm">{name}</div>
                <div className="text-xs text-gray-300 mt-1">Transactions: {obj.rows.length}</div>
              </div>
              <div className="text-sm text-[#64FFDA]">{obj.total.toLocaleString("en-IN")}</div>
            </div>
            <div className="mt-3 text-xs">
              <button onClick={() => openInvoice(obj.rows[0])} className="px-2 py-1 rounded bg-[#64FFDA]/10 border border-[#64FFDA]/40 text-[#64FFDA] text-xs">Open Recent</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ================= Inventory Section ================= */
function InventorySection({ data = [] }) {
  const invMap = {};
  data.forEach((r) => {
    const item = r["ItemName"]?.trim() || "Miscellaneous";
const qty = parseFloat(r["Qty"]) || 0;
const amt = parseFloat(r["Amount"]) || 0;
if (!invMap[item]) invMap[item] = { qty: 0, value: 0 };
invMap[item].qty += qty;
invMap[item].value += amt;
  });
  const inventory = Object.entries(invMap).sort((a, b) => b[1].value - a[1].value);

  const lowStock = inventory.filter(([_, v]) => v.qty > 0 && v.qty < 5);

  return (
    <div className="grid md:grid-cols-2 gap-6">
      <div className="bg-[#0D1B34] p-4 rounded-lg border border-[#1E2D50]">
        <h3 className="text-[#64FFDA] mb-2">Stock Summary</h3>
        <table className="w-full text-sm text-gray-200">
          <thead className="text-[#64FFDA]">
            <tr>
              <th className="py-2 text-left">Item</th>
              <th className="py-2 text-right">Qty</th>
              <th className="py-2 text-right">Value</th>
            </tr>
          </thead>
          <tbody>
            {inventory.slice(0, 200).map(([n, v], i) => (
              <tr key={i} className="border-b border-[#1E2D50]">
                <td className="py-2">{n}</td>
                <td className="py-2 text-right">{v.qty}</td>
                <td className="py-2 text-right">{v.value.toLocaleString("en-IN")}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="bg-[#0D1B34] p-4 rounded-lg border border-[#1E2D50]">
        <h3 className="text-[#64FFDA] mb-2">Low Stock Alerts</h3>
        <ul className="text-sm text-gray-200 space-y-1">
          {lowStock.length === 0 && <li>No low stock items</li>}
          {lowStock.map(([n, v], i) => (
            <li key={i} className="flex justify-between border-b border-[#1E2D50] py-1">
              <span>{n}</span>
              <span className="text-red-400">{v.qty}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
/* ================= Sales Entry Section ================= */
function SalesEntrySection() {
  const [entries, setEntries] = useState([]);
  const [form, setForm] = useState({ party: "", item: "", qty: "", rate: "" });

  const addEntry = () => {
    if (!form.party || !form.item || !form.qty || !form.rate) return;
    const amount = parseFloat(form.qty) * parseFloat(form.rate);
    setEntries([...entries, { ...form, amount }]);
    setForm({ party: "", item: "", qty: "", rate: "" });
  };

  return (
    <div className="bg-[#0D1B34] p-5 rounded-lg border border-[#1E2D50]">
      <h3 className="text-[#64FFDA] mb-3 text-lg font-semibold">Sales Order Entry</h3>
      <div className="grid sm:grid-cols-4 gap-2 mb-4">
        <input placeholder="Party" value={form.party} onChange={(e)=>setForm({...form,party:e.target.value})}
          className="bg-[#112240] p-2 rounded border border-[#223355]" />
        <input placeholder="Item" value={form.item} onChange={(e)=>setForm({...form,item:e.target.value})}
          className="bg-[#112240] p-2 rounded border border-[#223355]" />
        <input placeholder="Qty" value={form.qty} onChange={(e)=>setForm({...form,qty:e.target.value})}
          className="bg-[#112240] p-2 rounded border border-[#223355]" />
        <input placeholder="Rate" value={form.rate} onChange={(e)=>setForm({...form,rate:e.target.value})}
          className="bg-[#112240] p-2 rounded border border-[#223355]" />
      </div>
      <button onClick={addEntry} className="bg-[#64FFDA]/10 border border-[#64FFDA]/40 text-[#64FFDA] px-4 py-2 rounded hover:bg-[#64FFDA]/20">Add</button>

      <table className="w-full text-sm text-gray-300 mt-4">
        <thead className="text-[#64FFDA]">
          <tr><th>Party</th><th>Item</th><th>Qty</th><th>Rate</th><th>Amount</th></tr>
        </thead>
        <tbody>
          {entries.map((e, i) => (
            <tr key={i}><td>{e.party}</td><td>{e.item}</td><td>{e.qty}</td><td>{e.rate}</td><td>₹{e.amount.toLocaleString("en-IN")}</td></tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/* ================= Enhanced Settings Section ================= */
function SettingsSection() {
  const [settings, setSettings] = useState(() => {
    const s = localStorage.getItem("biz_settings");
    return s ? JSON.parse(s) : { signature: "", defaultPrint: "A4", notifications: true, theme: "dark" };
  });

  useEffect(() => {
    localStorage.setItem("biz_settings", JSON.stringify(settings));
  }, [settings]);

  return (
    <div className="bg-[#0D1B34] p-6 rounded-lg border border-[#1E2D50]">
      <h3 className="text-[#64FFDA] mb-3 text-lg font-semibold">Settings & Preferences</h3>
      <label className="block mb-3">
        <span className="text-sm">Signature:</span>
        <input value={settings.signature} onChange={(e)=>setSettings({...settings,signature:e.target.value})}
          className="w-full p-2 bg-[#07182b] rounded border border-[#223355]" />
      </label>
      <label className="block mb-3">
        <span className="text-sm">Default Print Size:</span>
        <select value={settings.defaultPrint} onChange={(e)=>setSettings({...settings,defaultPrint:e.target.value})}
          className="w-full p-2 bg-[#07182b] rounded border border-[#223355]">
          <option>A4</option><option>A5</option><option>Thermal</option>
        </select>
      </label>
      <label className="flex items-center gap-2 mb-3">
        <input type="checkbox" checked={settings.notifications}
          onChange={(e)=>setSettings({...settings,notifications:e.target.checked})}/>
        <span>Enable Notifications</span>
      </label>
      <label className="block">
        <span className="text-sm">Theme:</span>
        <select value={settings.theme} onChange={(e)=>setSettings({...settings,theme:e.target.value})}
          className="w-full p-2 bg-[#07182b] rounded border border-[#223355]">
          <option>dark</option><option>light</option>
        </select>
      </label>
      <p className="text-xs text-gray-400 mt-3">Preferences auto-saved locally.</p>
    </div>
  );
}



/* ================= Invoice Modal (popup) ================= */
/* Modal is implemented with simple overlay. Print uses body class toggles to set page size via CSS below. */

/* ================= Invoice Modal (popup) ================= */
function InvoiceModal({ row, onClose, printSize, setPrintSize, onPrint, onShare, onCopy, refObj }) {
  const invoiceNo = row["Vch No."] || "";
  const date = row["Date"] || "";
  const party = row["Party Name"] || "";
  const phone = row["Phone"] || row["Mobile"] || "";
  const area = row["City/Area"] || "";
  const salesman = row["Salesman"] || "-";
  const item = row["ItemName"] || "-";
  const group = row["Item Group"] || "-";
  const category = row["Item Category"] || "-";
  const qty = parseFloat(row["Qty"]) || 0;
  const rate = parseFloat(row["Rate"]) || 0;
  const amount = parseFloat(row["Amount"]) || 0;
  const tax = parseFloat(row["Tax"] || row["GST"] || 0);
  const total = amount + tax;

  const company = {
    name: "Communication World Infomatic Pvt. Ltd.",
    address: "D-62, Sector-02, Devendra Nagar, Raipur (C.G.) - 49201",
    logo: "/src/assets/logo.png",
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center p-6">
      <div className="absolute inset-0 bg-black/60" onClick={onClose}></div>
      <div ref={refObj} className="relative z-10 w-full max-w-4xl bg-[#081827] rounded-lg p-4 border border-[#223355] shadow-xl">
        <div className="flex justify-between items-center mb-3">
          <div className="flex items-center gap-3">
            <FileText />
            <div>
              <div className="text-sm font-semibold text-[#64FFDA]">Invoice Preview</div>
              <div className="text-xs text-gray-300">#{invoiceNo} • {date}</div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <select
              value={printSize}
              onChange={(e) => setPrintSize(e.target.value)}
              className="bg-[#071827] border border-[#223355] px-2 py-1 rounded text-sm text-gray-200"
            >
              <option value="A4">A4</option>
              <option value="A5">A5</option>
              <option value="Thermal">Thermal</option>
            </select>

            <button onClick={onPrint} className="px-3 py-1 rounded bg-[#64FFDA]/10 border border-[#64FFDA]/40 text-[#64FFDA]">
              <Printer size={14} /> Print
            </button>
            <button onClick={onShare} className="px-3 py-1 rounded bg-[#64FFDA]/10 border border-[#64FFDA]/40 text-[#64FFDA]">
              <Send size={14} /> Share
            </button>
            <button onClick={onCopy} className="px-3 py-1 rounded bg-[#0C2236] border border-[#223355] text-sm">
              Copy
            </button>
            <button onClick={onClose} className="px-2 py-1 rounded bg-[#081827] border border-[#223355]">
              Close
            </button>
          </div>
        </div>

        <div className="bg-[#0B1A33] p-4 rounded-lg border border-[#1E2D50]">
          <div id="print-area" className="print-area bg-white rounded p-4 text-black">
            <div className="flex justify-between items-start border-b pb-2">
              <div className="flex items-center gap-3">
                <img src={company.logo} alt="logo" className="w-16 h-16 object-contain" />
                <div>
                  <div className="text-lg font-bold">{company.name}</div>
                  <div className="text-xs">{company.address}</div>
                </div>
              </div>
              <div className="text-xs text-right">
                <div>Invoice No: <strong>{invoiceNo}</strong></div>
                <div>Date: {date}</div>
              </div>
            </div>

            <div className="mt-3 border-b pb-2 text-sm">
              <div><strong>Party:</strong> {party}</div>
              <div><strong>Area:</strong> {area}</div>
              <div><strong>Salesman:</strong> {salesman}</div>
            </div>

            <table className="w-full text-sm mt-3 border">
              <thead className="bg-gray-100">
                <tr>
                  <th className="text-left px-2 py-1">Item</th>
                  <th className="text-left px-2 py-1">Group</th>
                  <th className="text-left px-2 py-1">Category</th>
                  <th className="text-right px-2 py-1">Qty</th>
                  <th className="text-right px-2 py-1">Rate</th>
                  <th className="text-right px-2 py-1">Amount</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td className="px-2 py-1">{item}</td>
                  <td className="px-2 py-1">{group}</td>
                  <td className="px-2 py-1">{category}</td>
                  <td className="px-2 py-1 text-right">{qty}</td>
                  <td className="px-2 py-1 text-right">{rate}</td>
                  <td className="px-2 py-1 text-right">₹{amount.toLocaleString("en-IN")}</td>
                </tr>
              </tbody>
            </table>

            <div className="mt-3 flex justify-end text-sm">
              <div className="w-48">
                <div className="flex justify-between"><div>Subtotal</div><div>₹{amount.toLocaleString("en-IN")}</div></div>
                <div className="flex justify-between"><div>Tax</div><div>₹{tax.toLocaleString("en-IN")}</div></div>
                <div className="flex justify-between font-semibold text-lg border-t mt-2 pt-1"><div>Total</div><div>₹{total.toLocaleString("en-IN")}</div></div>
              </div>
            </div>

            <div className="mt-4 text-xs">
              <div>Note: System generated invoice preview.</div>
            </div>
          </div>
        </div>
      </div>

      <style>{`
        @media print {
          body * { visibility: hidden; }
          .print-area, .print-area * { visibility: visible; }
          .print-area { position: absolute; left: 0; top: 0; width: 100%; }
          @page { size: A4; margin: 10mm; }
        }
        body.print-a4 @page { size: A4; }
        body.print-a5 @page { size: A5; }
        body.print-thermal @page { size: 80mm 200mm; }
      `}</style>
    </div>
  );
}

/* End of file */





