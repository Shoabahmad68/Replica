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
  Phase-3 Analyst.jsx (Hardened)
  - Defensive checks for non-string fields (safeTrim/safeStr)
  - Safer Object.values() -> string join conversion
  - Safer lastSync display
  - Robust CSV export
  - No structural changes: all sections preserved
*/

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

  // ---------- Helper utilities ----------
  const safeStr = (v) => {
    if (v === undefined || v === null) return "";
    if (typeof v === "string") return v;
    try {
      return String(v);
    } catch {
      return "";
    }
  };

  const safeTrim = (v) => safeStr(v).trim();

  const safeParseFloat = (v) => {
    const n = Number(safeStr(v).replace(/,/g, "").trim());
    return Number.isFinite(n) ? n : 0;
  };

  const isValidDateString = (s) => {
    if (!s || typeof s !== "string") return false;
    const t = Date.parse(s);
    return !Number.isNaN(t);
  };

  // Utility: filter out total-like rows (defensive)
  const cleanData = useMemo(() => {
    if (!Array.isArray(rawData)) return [];
    const skipWords = ["total", "grand total", "sub total", "overall total"];
    return rawData.filter((row) => {
      if (!row || typeof row !== "object") return false;
      // convert all values to strings before joining
      const all = Object.values(row)
        .map((v) => (v === null || v === undefined ? "" : safeStr(v)))
        .join(" ")
        .toLowerCase();
      if (!all.trim()) return false;
      return !skipWords.some((w) => all.includes(w));
    });
  }, [rawData]);

  const mainFilteredData = Array.isArray(cleanData) ? cleanData : [];

  // Company list for filter (safe string)
  const companyList = useMemo(() => {
    const setC = new Set();
    cleanData.forEach((r) => {
      const c = safeStr(r["Company"] || r["Item Category"] || r["Party"] || r["Party Name"] || "Unknown");
      setC.add(c || "Unknown");
    });
    return ["All Companies", ...Array.from(setC)];
  }, [cleanData]);

  // Fetch latest data
  useEffect(() => {
    let cancelled = false;

    const fetchLatest = async () => {
      setLoading(true);
      try {
        const resp = await fetch(`${config.ANALYST_BACKEND_URL}/api/analyst/latest`);
        const json = await resp.json();

        // BACKEND MAY RETURN { rows: [...] }
        const rows = Array.isArray(json.rows) ? json.rows : [];

        if (!cancelled) {
          setRawData(rows);
          setLastSync(json.lastUpdated || new Date().toISOString());
          try {
            localStorage.setItem("analyst_latest_rows", JSON.stringify(rows));
          } catch (e) {
            // localStorage may fail in some environments; ignore
            console.warn("localStorage save failed", e);
          }
        }
      } catch (err) {
        console.error("Fetch error:", err);

        try {
          const backup = localStorage.getItem("analyst_latest_rows");
          if (backup) {
            setRawData(JSON.parse(backup));
            setLastSync("Loaded from cache");
          } else {
            setError("Failed to load analyst data");
          }
        } catch (e) {
          setError("Failed to load analyst data");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    fetchLatest();

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ---------- Aggregations ----------
  const metrics = useMemo(() => {
    let totalSales = 0;
    let receipts = 0;
    let expenses = 0;
    let outstanding = 0;

    mainFilteredData.forEach((r) => {
      const amt = safeParseFloat(r["Amount"] ?? r["Net Amount"]);
      totalSales += amt;

      const type = safeStr(r["Type"] || r["Voucher Type"]).toLowerCase();
      if (type.includes("receipt") || type.includes("payment") || (r["Receipt"] && !r["Payment"])) {
        receipts += amt;
      } else if (type.includes("expense") || type.includes("purchase")) {
        expenses += Math.abs(amt);
      } else {
        receipts += amt * 0.9;
        expenses += amt * 0.1;
      }

      outstanding += safeParseFloat(r["Outstanding"]);
    });

    outstanding = Math.max(0, outstanding);

    return {
      totalSales,
      receipts,
      expenses,
      outstanding,
    };
  }, [mainFilteredData]);

  // Monthly sales aggregation (for chart)
  const monthlySales = useMemo(() => {
    const m = {};
    mainFilteredData.forEach((r) => {
      const dstr = safeStr(r["Date"] || r["Voucher Date"] || r["Invoice Date"]);
      let key = "Unknown";
      if (dstr) {
        const parts = dstr.split(/[-\/]/).map((x) => x.trim());
        if (parts.length >= 3) {
          if (parts[0].length === 4) {
            // yyyy-mm-dd
            key = `${parts[0]}-${parts[1].padStart(2, "0")}`;
          } else {
            // dd-mm-yyyy
            key = `${parts[2]}-${parts[1].padStart(2, "0")}`;
          }
        } else {
          key = dstr;
        }
      }
      const amt = safeParseFloat(r["Amount"] ?? r["Net Amount"]);
      m[key] = (m[key] || 0) + amt;
    });

    // Attempt chronological order where keys look like YYYY-MM
    const ordered = Object.keys(m).sort((a, b) => {
      // if both are YYYY-MM style, compare as dates
      const ay = a.match(/^(\d{4})-(\d{1,2})$/);
      const by = b.match(/^(\d{4})-(\d{1,2})$/);
      if (ay && by) {
        const da = new Date(Number(ay[1]), Number(ay[2]) - 1, 1);
        const db = new Date(Number(by[1]), Number(by[2]) - 1, 1);
        return da - db;
      }
      return a.localeCompare(b);
    });

    return {
      labels: ordered,
      values: ordered.map((k) => m[k]),
    };
  }, [mainFilteredData]);

  // Company split
  const companySplit = useMemo(() => {
    const map = {};
    mainFilteredData.forEach((r) => {
      const c = safeStr(r["Company"] || r["Item Category"] || r["Party Name"] || "Unknown") || "Unknown";
      const amt = safeParseFloat(r["Amount"]);
      map[c] = (map[c] || 0) + amt;
    });
    return {
      labels: Object.keys(map),
      values: Object.values(map),
    };
  }, [mainFilteredData]);

  // Top items & customers
  const topEntities = useMemo(() => {
    const prod = {};
    const cust = {};
    mainFilteredData.forEach((r) => {
      const item = safeStr(r["ItemName"] || r["Narration"] || r["Description"] || "Unknown");
      const party = safeStr(r["Party Name"] || r["Customer"] || r["Party"] || "Unknown");
      const amt = safeParseFloat(r["Amount"]);
      prod[item] = (prod[item] || 0) + amt;
      cust[party] = (cust[party] || 0) + amt;
    });
    const topProducts = Object.entries(prod).sort((a, b) => b[1] - a[1]).slice(0, 25);
    const topCustomers = Object.entries(cust).sort((a, b) => b[1] - a[1]).slice(0, 25);
    return { topProducts, topCustomers };
  }, [mainFilteredData]);

  // Export CSV util (more robust)
  const exportCSV = (rows, filename = "export") => {
    if (!rows || !rows.length) {
      alert("No rows to export");
      return;
    }

    // Collect keys safely
    const keys = Array.from(
      new Set(rows.flatMap((r) => (r && typeof r === "object" ? Object.keys(r) : [])))
    );

    // Build CSV
    const csvRows = [keys.map((k) => `"${k.replace(/"/g, '""')}"`).join(",")];

    rows.forEach((r) => {
      const line = keys.map((k) => {
        const v = r && Object.prototype.hasOwnProperty.call(r, k) ? r[k] : "";
        const s = safeStr(v).replace(/"/g, '""');
        return `"${s}"`;
      });
      csvRows.push(line.join(","));
    });

    const csv = csvRows.join("\n");
    try {
      const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${filename}.csv`;
      // append and click for Firefox compatibility
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (e) {
      console.error("CSV export failed", e);
      alert("Export failed");
    }
  };

  // Open invoice modal
  const openInvoice = (row) => {
    setSelectedInvoice(row);
    setInvoiceModalOpen(true);
    setTimeout(() => {
      if (modalRef.current && modalRef.current.scrollTop !== undefined) modalRef.current.scrollTop = 0;
    }, 50);
  };

  // Print invoice modal (adds body class, triggers print)
  const handlePrint = () => {
    document.body.classList.remove("print-a4", "print-a5", "print-thermal");
    if (printSize === "A4") document.body.classList.add("print-a4");
    if (printSize === "A5") document.body.classList.add("print-a5");
    if (printSize === "Thermal") document.body.classList.add("print-thermal");
    setTimeout(() => {
      try {
        window.print();
      } finally {
        document.body.classList.remove("print-a4", "print-a5", "print-thermal");
      }
    }, 150);
  };

  // Share invoice (navigator.share if available else WA fallback)
  const handleShareInvoice = async () => {
    if (!selectedInvoice) return;
    const text = invoiceText(selectedInvoice);
    if (navigator.share) {
      try {
        await navigator.share({
          title: `Invoice - ${safeStr(selectedInvoice["Invoice No"] || selectedInvoice["Vch No."])}`,
          text,
        });
      } catch (e) {
        console.warn("Share cancelled or failed", e);
      }
    } else {
      const wa = `https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`;
      window.open(wa, "_blank");
    }
  };

  // Prepare simple invoice text (defensive)
  const invoiceText = (row) => {
    const invNo = safeStr(row["Invoice No"] || row["Voucher No"] || row["Vch No."]);
    const date = safeStr(row["Date"] || row["Voucher Date"] || row["Invoice Date"]);
    const party = safeStr(row["Party Name"] || row["Customer"] || row["Party"]);
    const itemName = safeStr(row["Item Name"] || row["ItemName"] || row["Description"] || "Item");
    const qty = safeStr(row["Qty"] ?? 1);
    const rate = safeStr(row["Rate"] || row["Price"] || row["Amount"]);
    const amount = safeStr(row["Amount"] || row["Net Amount"] || 0);

    let t = `Invoice: ${invNo}\nDate: ${date}\nParty: ${party}\n`;
    t += `-----------------------------\n`;
    t += `${itemName} x ${qty} @ ${rate} = ${amount}\n`;
    t += `-----------------------------\n`;
    t += `Total: ₹${safeParseFloat(row["Amount"]).toLocaleString("en-IN")}\n`;
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

  // Formatting
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

  // ---------- Render states ----------
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

  // safe display for lastSync: if it's a valid date string, format; else show raw text
  const displayLastSync = lastSync
    ? isValidDateString(lastSync)
      ? new Date(lastSync).toLocaleString()
      : lastSync
    : "—";

  return (
    <div className="p-6 min-h-screen bg-gradient-to-br from-[#071226] via-[#0A192F] to-[#071226] text-gray-100">
      <div className="max-w-7xl mx-auto bg-[#12223b] rounded-2xl p-6 border border-[#223355] shadow-xl">
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-xl font-bold text-[#64FFDA] flex items-center gap-2">
            <FileSpreadsheet /> ANALYST — Analyst Replica
          </h1>
          <div className="flex items-center gap-3">
            <div className="text-sm text-gray-300">Sync: {displayLastSync}</div>
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
                try {
                  localStorage.removeItem("analyst_latest_rows");
                } catch {}
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
            { key: "alldata", label: "All Data" },
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
              onClick={() => exportCSV(mainFilteredData.slice(0, 1000), "AnalystExport")}
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
              data={mainFilteredData}
              openInvoice={openInvoice}
              formatINR={formatINR}
            />
          )}

          {activeSection === "masters" && (
            <MastersSection data={cleanData} openInvoice={openInvoice} />
          )}

          {activeSection === "transactions" && (
            <TransactionsSection data={mainFilteredData} openInvoice={openInvoice} exportCSV={exportCSV} />
          )}

          {activeSection === "reports" && (
            <ReportsSection data={mainFilteredData} exportCSV={exportCSV} />
          )}

          {activeSection === "party" && (
            <PartySection data={mainFilteredData} openInvoice={openInvoice} />
          )}

          {activeSection === "inventory" && (
            <InventorySection data={mainFilteredData} />
          )}

          {activeSection === "dataentry" && <SalesEntrySection />}

          {activeSection === "alldata" && (
            <AllDataSection data={mainFilteredData} exportCSV={exportCSV} />
          )}

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
        <ListBox title="Top Products" items={topProducts} onItemClick={() => {}} />
        <ListBox title="Top Customers" items={topCustomers} onItemClick={() => {}} />
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
                  <td className="py-2">{safeTrim(r["Vch No."]) || safeTrim(r["Voucher No"]) || "—"}</td>
                  <td className="py-2">{safeTrim(r["Date"] || r["Voucher Date"]) || "—"}</td>
                  <td className="py-2">{safeTrim(r["Party Name"] || r["Customer"]) || "—"}</td>
                  <td className="py-2 text-right">{safeParseFloat(r["Amount"]).toLocaleString("en-IN")}</td>
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
  const parties = useMemo(() => {
    const s = new Set();
    data.forEach((r) => s.add(safeStr(r["Party Name"] || r["Customer"] || r["Party"] || "Unknown")));
    return Array.from(s).sort();
  }, [data]);

  const items = useMemo(() => {
    const s = new Set();
    data.forEach((r) => {
      const name = safeTrim(r["ItemName"]);
      if (name && !["", "unknown", "total"].includes(name.toLowerCase())) s.add(name);
    });
    return Array.from(s).sort();
  }, [data]);

  const salesmen = useMemo(() => {
    const s = new Set();
    data.forEach((r) => s.add(safeStr(r["Salesman"] || "Unknown")));
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
                const recent = data.find((r) => safeStr(r["Party Name"] || r["Customer"] || r["Party"]) === p);
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
  const pages = Math.max(1, Math.ceil(data.length / perPage));

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
                <td className="py-2">{safeTrim(r["Vch No."]) || safeTrim(r["Invoice No"]) || "—"}</td>
                <td className="py-2">{safeTrim(r["Date"] || r["Voucher Date"]) || "—"}</td>
                <td className="py-2">{safeTrim(r["Party Name"] || r["Customer"]) || "—"}</td>
                <td className="py-2">{safeTrim(r["Vch Type"] || r["Type"]) || "—"}</td>
                <td className="py-2 text-right">{safeParseFloat(r["Amount"]).toLocaleString("en-IN")}</td>
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
  const totalSales = data.reduce((s, r) => s + safeParseFloat(r["Amount"]), 0);
  const outstandingMap = {};
  data.forEach((r) => {
    const p = safeStr(r["Party Name"] || r["Customer"] || "Unknown");
    const o = safeParseFloat(r["Outstanding"]);
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
    const p = safeStr(r["Party Name"] || r["Customer"] || "Unknown");
    const amt = safeParseFloat(r["Amount"]);
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
    const item = safeTrim(r["ItemName"]) || "Miscellaneous";
    const qty = safeParseFloat(r["Qty"]);
    const amt = safeParseFloat(r["Amount"]);
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
    const amount = safeParseFloat(form.qty) * safeParseFloat(form.rate);
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
            <tr key={i}><td>{e.party}</td><td>{e.item}</td><td>{e.qty}</td><td>{e.rate}</td><td>₹{(e.amount || 0).toLocaleString("en-IN")}</td></tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/* ================= Enhanced Settings Section ================= */
function SettingsSection() {
  const [settings, setSettings] = useState(() => {
    try {
      const s = localStorage.getItem("biz_settings");
      return s ? JSON.parse(s) : { signature: "", defaultPrint: "A4", notifications: true, theme: "dark" };
    } catch {
      return { signature: "", defaultPrint: "A4", notifications: true, theme: "dark" };
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem("biz_settings", JSON.stringify(settings));
    } catch {}
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

/* ================= ALL DATA SECTION — ADVANCED TABLE ================= */
function AllDataSection({ data = [], exportCSV }) {
  const [sortConfig, setSortConfig] = useState({ key: null, direction: "asc" });
  const [filters, setFilters] = useState({});

  if (!data || !data.length) {
    return (
      <div className="bg-[#0D1B34] p-4 rounded-lg border border-[#1E2D50]">
        <h3 className="text-[#64FFDA] mb-2">All Data</h3>
        <p className="text-gray-300">No data available.</p>
      </div>
    );
  }

  const columns = useMemo(() => {
    if (!Array.isArray(data)) return [];
    return Array.from(
      new Set(
        data
          .filter((r) => r && typeof r === "object")
          .flatMap((r) => Object.keys(r))
      )
    );
  }, [data]);

  const sortedData = useMemo(() => {
    let rows = [...data];
    if (sortConfig.key) {
      rows.sort((a, b) => {
        const A = safeStr(a[sortConfig.key]).toLowerCase();
        const B = safeStr(b[sortConfig.key]).toLowerCase();
        if (A < B) return sortConfig.direction === "asc" ? -1 : 1;
        if (A > B) return sortConfig.direction === "asc" ? 1 : -1;
        return 0;
      });
    }
    return rows;
  }, [data, sortConfig]);

  const filteredData = useMemo(() => {
    return sortedData.filter((row) => {
      return columns.every((col) => {
        if (!filters[col]) return true;
        return safeStr(row[col]).toLowerCase().includes(filters[col].toLowerCase());
      });
    });
  }, [sortedData, filters, columns]);

  const requestSort = (col) => {
    setSortConfig((prev) => ({
      key: col,
      direction: prev.key === col && prev.direction === "asc" ? "desc" : "asc",
    }));
  };

  return (
    <div className="bg-[#0D1B34] p-5 rounded-lg border border-[#1E2D50]">
      <div className="flex justify-between mb-4">
        <h3 className="text-[#64FFDA] text-lg font-semibold">
          All Imported Data ({filteredData.length} rows)
        </h3>

        <button
          onClick={() => exportCSV(filteredData, "AllData")}
          className="px-3 py-2 rounded bg-[#64FFDA]/10 border border-[#64FFDA]/40 text-[#64FFDA] text-sm"
        >
          Export CSV
        </button>
      </div>

      <div className="overflow-auto max-h-[70vh] border border-[#1E2D50] rounded">
        <table className="w-max min-w-full text-sm text-gray-200">
          <thead className="bg-[#0B1A33] sticky top-0 z-20">
            <tr>
              {columns.map((col, i) => (
                <th
                  key={i}
                  className={`px-3 py-2 text-left border-b border-[#1E2D50] whitespace-nowrap cursor-pointer ${
                    i === 0 ? "sticky left-0 bg-[#0B1A33]" : ""
                  }`}
                  onClick={() => requestSort(col)}
                >
                  <span className="text-[#64FFDA] font-semibold">{col}</span>
                  {sortConfig.key === col && (
                    <span className="text-gray-400 ml-1">
                      {sortConfig.direction === "asc" ? "▲" : "▼"}
                    </span>
                  )}
                </th>
              ))}
            </tr>

            <tr className="bg-[#0A1425] sticky top-[38px]">
              {columns.map((col, i) => (
                <th
                  key={i}
                  className={`px-3 py-1 border-b border-[#1E2D50] ${
                    i === 0 ? "sticky left-0 bg-[#0A1425]" : ""
                  }`}
                >
                  <input
                    type="text"
                    placeholder="filter"
                    value={filters[col] || ""}
                    onChange={(e) =>
                      setFilters({ ...filters, [col]: e.target.value })
                    }
                    className="bg-[#112240] text-gray-200 text-xs px-2 py-1 rounded w-full border border-[#1E2D50]"
                  />
                </th>
              ))}
            </tr>
          </thead>

          <tbody>
            {filteredData.slice(0, 2000).map((row, rIndex) => (
              <tr
                key={rIndex}
                className="hover:bg-[#112240] border-b border-[#1E2D50]"
              >
                {columns.map((col, cIndex) => (
                  <td
                    key={cIndex}
                    className={`px-3 py-2 whitespace-nowrap ${
                      cIndex === 0 ? "sticky left-0 bg-[#0D1B34]" : ""
                    }`}
                  >
                    {safeStr(row[col])}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <p className="text-xs text-gray-400 mt-2">
        Showing first 2000 rows. Apply filters for specific search.
      </p>
    </div>
  );
}

/* ================= Invoice Modal (popup) ================= */
function InvoiceModal({ row, onClose, printSize, setPrintSize, onPrint, onShare, onCopy, refObj }) {
  const invoiceNo = safeStr(row["Vch No."] || row["Voucher No"] || row["Invoice No"]);
  const date = safeStr(row["Date"] || row["Voucher Date"]);
  const party = safeStr(row["Party Name"] || row["Customer"]);
  const phone = safeStr(row["Phone"] || row["Mobile"]);
  const area = safeStr(row["City/Area"] || row["Area"]);
  const salesman = safeStr(row["Salesman"] || "-");
  const item = safeStr(row["ItemName"] || row["Item Name"] || "-");
  const group = safeStr(row["Item Group"] || "-");
  const category = safeStr(row["Item Category"] || "-");
  const qty = safeParseFloat(row["Qty"]);
  const rate = safeParseFloat(row["Rate"]);
  const amount = safeParseFloat(row["Amount"]);
  const tax = safeParseFloat(row["Tax"] ?? row["GST"]);
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
        /* body.print-a4/@page rules: browsers vary on @page usage; we toggle classes for clarity */
        body.print-a4 { }
        body.print-a5 { }
        body.print-thermal { }
      `}</style>
    </div>
  );
}

/* End of file */
