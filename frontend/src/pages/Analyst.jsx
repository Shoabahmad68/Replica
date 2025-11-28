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

  // Clean and flatten data
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
      console.error("cleanData normalization error", e);
      return rawData || [];
    }
  }, [rawData]);

  // Company + search filter
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

  // Date filter
  const dateFiltered = useMemo(() => {
    return mainFilteredData.filter((r) => {
      let d = r.voucher_date || r.date || r.voucherdate || r.invoice_date || r["Voucher Date"] || r["DATE"] || r["Date"] || "";
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

// Fetch data
useEffect(() => {
  let cancelled = false;
  const fetchClean = async () => {
    setLoading(true);
    setError("");
    try {
      // ✅ FIXED: Direct root URL (no /api/analyst/fetch)
      const resp = await fetch(config.ANALYST_BACKEND_URL);
      
      const json = await resp.json();
      
      if (!json || !json.success || !Array.isArray(json.data)) {
        throw new Error("API returned invalid payload");
      }
      
      if (!cancelled) {
        const flat = json.data.map((row) => {
          if (!row || typeof row !== "object") return {};
          const flatObj = {};
          const voucher = row.voucher_data || row.voucher || null;
          if (voucher && typeof voucher === "object") {
            const flattenedVoucher = normalizeAny(voucher);
            Object.keys(flattenedVoucher).forEach((k) => {
              flatObj[k] = flattenedVoucher[k];
            });
          }
            Object.keys(row).forEach((k) => {
              if (k === "voucher_data" || k === "voucher") return;
              const v = row[k];
              if (v && typeof v === "object") {
                if ("@value" in v) {
                  flatObj[k] = v["@value"];
                } else {
                  try {
                    flatObj[k] = JSON.stringify(v);
                  } catch {
                    flatObj[k] = String(v);
                  }
                }
              } else {
                if (!(k in flatObj)) flatObj[k] = v;
                else {
                  if (String(flatObj[k]).length === 0 && v) flatObj[k] = v;
                }
              }
            });
            if (!flatObj.id && row.id) flatObj.id = row.id;
            return flatObj;
          });
          setRawData(flat);
          setLastSync(new Date().toISOString());
          try {
            localStorage.setItem("analyst_latest_rows", JSON.stringify(flat));
          } catch {}
        }
      } catch (e) {
        console.error("Fetch error:", e);
        const backup = localStorage.getItem("analyst_latest_rows");
        if (backup) {
          try {
            setRawData(JSON.parse(backup));
            setLastSync("Loaded from cache");
          } catch {
            setError("Failed to parse cached analyst data");
          }
        } else {
          setError("Failed to load analyst data");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    fetchClean();
    let intv;
    if (autoRefresh) {
      intv = setInterval(() => {
        fetchClean();
      }, 60_000);
    }
    return () => {
      cancelled = true;
      if (intv) clearInterval(intv);
    };
  }, [autoRefresh]);

  // Metrics
  const metrics = useMemo(() => {
    let totalSales = 0;
    let receipts = 0;
    let expenses = 0;
    let outstanding = 0;
    (dateFiltered || []).forEach((r) => {
      const amt = parseFloat(r["Amount"]) || parseFloat(r["Net Amount"]) || parseFloat(r.amount) || 0;
      totalSales += amt;
      const type = String(r["Type"] || r["Voucher Type"] || r["Vch Type"] || "").toLowerCase();
      if (type.includes("receipt") || type.includes("payment") || (r["Receipt"] && !r["Payment"])) {
        receipts += amt;
      } else if (type.includes("expense") || type.includes("purchase")) {
        expenses += Math.abs(amt);
      } else {
        receipts += amt * 0.9;
        expenses += Math.abs(amt) * 0.1;
      }
      outstanding += parseFloat(r["Outstanding"] || r.outstanding || 0) || 0;
    });
    outstanding = Math.max(0, outstanding);
    return { totalSales, receipts, expenses, outstanding };
  }, [dateFiltered]);

  // Monthly sales
  const monthlySales = useMemo(() => {
    const m = {};
    (dateFiltered || []).forEach((r) => {
      const dstr = r["Date"] || r["Voucher Date"] || r["Invoice Date"] || r.date || "";
      let key = "Unknown";
      if (dstr) {
        const cleanStr = String(dstr).trim();
        const parts = cleanStr.split(/[-\/]/).map((x) => x.trim());
        if (parts.length >= 3) {
          if (parts[0].length === 4) {
            key = `${parts[0]}-${parts[1].padStart(2, "0")}`;
          } else {
            key = `${parts[2]}-${parts[1].padStart(2, "0")}`;
          }
        } else {
          key = cleanStr;
        }
      }
      const amt = parseFloat(r["Amount"]) || parseFloat(r["Net Amount"]) || parseFloat(r.amount) || 0;
      m[key] = (m[key] || 0) + amt;
    });
    const ordered = Object.keys(m).sort();
    return { labels: ordered, values: ordered.map((k) => m[k]) };
  }, [dateFiltered]);

  // Company split
  const companySplit = useMemo(() => {
    const map = {};
    (dateFiltered || []).forEach((r) => {
      const c = r["Company"] || r["Item Category"] || r["Party Name"] || r.company || "Unknown";
      const amt = parseFloat(r["Amount"]) || parseFloat(r.amount) || 0;
      map[c] = (map[c] || 0) + amt;
    });
    return { labels: Object.keys(map), values: Object.values(map) };
  }, [dateFiltered]);

  // Top entities
  const topEntities = useMemo(() => {
    const prod = {};
    const cust = {};
    (dateFiltered || []).forEach((r) => {
      const item = r["ItemName"] || r["Narration"] || r["Description"] || r["Item Name"] || "Unknown";
      const party = r["Party Name"] || r["Customer"] || r["Party"] || r.party || "Unknown";
      const amt = parseFloat(r["Amount"]) || parseFloat(r.amount) || 0;
      prod[item] = (prod[item] || 0) + amt;
      cust[party] = (cust[party] || 0) + amt;
    });
    const topProducts = Object.entries(prod).sort((a, b) => b[1] - a[1]).slice(0, 25);
    const topCustomers = Object.entries(cust).sort((a, b) => b[1] - a[1]).slice(0, 25);
    return { topProducts, topCustomers };
  }, [dateFiltered]);

  // Export CSV
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
    document.body.classList.remove("print-a4", "print-a5", "print-thermal");
    if (printSize === "A4") document.body.classList.add("print-a4");
    if (printSize === "A5") document.body.classList.add("print-a5");
    if (printSize === "Thermal") document.body.classList.add("print-thermal");
    setTimeout(() => {
      window.print();
      document.body.classList.remove("print-a4", "print-a5", "print-thermal");
    }, 150);
  };

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
      const wa = `https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`;
      window.open(wa, "_blank");
    }
  };

  const invoiceText = (row) => {
    const invNo = row["Invoice No"] || row["Voucher No"] || row["Vch No."] || row.id || "";
    const date = row["Date"] || row["Voucher Date"] || row.date || "";
    const party = row["Party Name"] || row["Customer"] || row["Party"] || row.party || "";
    const items = [
      {
        name: row["Item Name"] || row["Description"] || row["ItemName"] || "Item",
        qty: row["Qty"] || 1,
        rate: row["Rate"] || row["Price"] || row["Amount"],
        amount: row["Amount"] || row["Net Amount"] || row.amount || 0,
      },
    ];
    let t = `Invoice: ${invNo}\nDate: ${date}\nParty: ${party}\n`;
    t += `-----------------------------\n`;
    items.forEach((it) => {
      t += `${it.name} x ${it.qty} @ ${it.rate} = ${it.amount}\n`;
    });
    t += `-----------------------------\n`;
    t += `Total: ₹${(parseFloat(items[0].amount) || 0).toLocaleString("en-IN")}\n`;
    return t;
  };

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

  const formatINR = (n) => `₹${(n || 0).toLocaleString("en-IN")}`;

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

  const companyPie = {
    labels: companySplit.labels,
    datasets: [
      {
        data: companySplit.values,
        backgroundColor: ["#64FFDA", "#3B82F6", "#F59E0B", "#EF4444", "#8B5CF6", "#22D3EE"],
      },
    ],
  };

  if (loading)
    return (
      <div className="h-screen flex items-center justify-center text-[#64FFDA] bg-[#071429]">
        Loading analyst data...
      </div>
    );

  if (error)
    return (
      <div className="h-screen p-6 bg-gradient-to-br from-[#0A192F] via-[#112240] to-[#0A192F] text-gray-300">
        <div className="max-w-2xl mx-auto text-center">
          <h2 className="text-2xl text-[#64FFDA] font-semibold mb-2">Error</h2>
          <p>{error}</p>
          <p className="mt-4">Try clearing cache or check backend API.</p>
        </div>
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
    <div className="p-4 min-h-screen bg-gradient-to-br from-[#071226] via-[#0A192F] to-[#071226] text-gray-100 overflow-x-hidden">
      <div className="max-w-full mx-auto bg-[#12223b] rounded-2xl p-4 border border-[#223355] shadow-xl">
        {/* Header */}
        <div className="flex flex-wrap justify-between items-center mb-4 gap-2">
          <h1 className="text-lg font-bold text-[#64FFDA] flex items-center gap-2">
            <FileSpreadsheet size={20} /> ANALYST — Analyst Replica
          </h1>
          <div className="flex flex-wrap items-center gap-2">
            <div className="text-xs text-gray-300">Sync: {lastSync ? new Date(lastSync).toLocaleString() : "—"}</div>
            <select
              value={companyFilter}
              onChange={(e) => setCompanyFilter(e.target.value)}
              className="bg-[#0E1B2F] border border-[#223355] rounded px-2 py-1 text-xs"
            >
              {(() => {
                const setC = new Set();
                cleanData.forEach((r) => {
                  const c = r["Company"] || r["Item Category"] || r["Party"] || r["Party Name"] || "Unknown";
                  setC.add(c);
                });
                return ["All Companies", ...Array.from(setC)].map((c, i) => (
                  <option value={c} key={i}>
                    {c}
                  </option>
                ));
              })()}
            </select>
            <input
              type="date"
              value={fromDate}
              onChange={(e) => setFromDate(e.target.value)}
              className="bg-[#0C1B31] px-2 py-1 rounded border border-[#223355] text-xs"
            />
            <input
              type="date"
              value={toDate}
              onChange={(e) => setToDate(e.target.value)}
              className="bg-[#0C1B31] px-2 py-1 rounded border border-[#223355] text-xs"
            />
            <button
              onClick={() => setAutoRefresh((s) => !s)}
              className={`px-2 py-1 rounded text-xs border flex items-center gap-1 ${autoRefresh ? "bg-[#64FFDA] text-[#071226]" : "bg-transparent text-[#64FFDA] border-[#64FFDA]/30"}`}
            >
              <RefreshCw size={14} /> {autoRefresh ? "Auto" : "Refresh"}
            </button>
            <button
              onClick={() => {
                localStorage.removeItem("analyst_latest_rows");
                window.location.reload();
              }}
              className="px-2 py-1 rounded bg-[#64FFDA]/10 border border-[#64FFDA]/40 text-[#64FFDA] text-xs"
            >
              Clear Cache
            </button>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex flex-wrap gap-2 mb-4">
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
              onClick={() => {
                setActiveSection(tab.key);
                setCurrentPage(1);
              }}
              className={`px-3 py-1 rounded text-xs font-semibold ${activeSection === tab.key ? "bg-[#64FFDA] text-[#081827]" : "bg-[#0C1B31] text-gray-300 border border-[#223355]"}`}
            >
              {tab.label}
            </button>
          ))}
          <div className="ml-auto flex items-center gap-2">
            <input
              placeholder="Search..."
              value={searchQ}
              onChange={(e) => setSearchQ(e.target.value)}
              className="bg-[#0C1B31] px-2 py-1 rounded border border-[#223355] text-xs w-32"
            />
            <button
              onClick={() => exportCSV(dateFiltered.slice(0, 1000), "AnalystExport")}
              className="px-2 py-1 rounded bg-[#64FFDA]/10 border border-[#64FFDA]/40 text-[#64FFDA] text-xs flex items-center gap-1"
            >
              <Download size={12} /> Export
            </button>
          </div>
        </div>

        {/* Render Sections */}
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
          {activeSection === "masters" && <MastersSection data={cleanData} openInvoice={openInvoice} />}
          {activeSection === "transactions" && (
            <TransactionsSection data={dateFiltered} openInvoice={openInvoice} exportCSV={exportCSV} />
          )}
          {activeSection === "reports" && <ReportsSection data={dateFiltered} exportCSV={exportCSV} />}
          {activeSection === "party" && <PartySection data={dateFiltered} openInvoice={openInvoice} />}
          {activeSection === "inventory" && <InventorySection data={dateFiltered} />}
          {activeSection === "dataentry" && <SalesEntrySection />}
          {activeSection === "alldata" && (
            <AllDataSection 
              data={dateFiltered} 
              exportCSV={exportCSV}
              currentPage={currentPage}
              setCurrentPage={setCurrentPage}
              rowsPerPage={rowsPerPage}
            />
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
function DashboardSection({ metrics, monthlyChartData, companyPie, topProducts, topCustomers, data, openInvoice, formatINR }) {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
        <MetricCard title="Total Sales" value={formatINR(metrics.totalSales)} />
        <MetricCard title="Receipts" value={formatINR(metrics.receipts)} />
        <MetricCard title="Expenses" value={formatINR(metrics.expenses)} />
        <MetricCard title="Outstanding" value={formatINR(metrics.outstanding)} />
      </div>
      <div className="grid md:grid-cols-3 gap-4">
        <div className="col-span-2 bg-[#0B1A33] p-3 rounded-lg border border-[#1E2D50]">
          <h3 className="text-[#64FFDA] mb-2 text-sm">Monthly Sales Trend</h3>
          <div className="h-48">
            <Line data={monthlyChartData} options={{ maintainAspectRatio: false, plugins: { legend: { labels: { font: { size: 10 } } } } }} />
          </div>
        </div>
        <div className="bg-[#0B1A33] p-3 rounded-lg border border-[#1E2D50]">
          <h3 className="text-[#64FFDA] mb-2 text-sm">Company Split</h3>
          <div className="h-48">
            <Doughnut data={companyPie} options={{ maintainAspectRatio: false, plugins: { legend: { labels: { font: { size: 9 } } } } }} />
          </div>
        </div>
      </div>
      <div className="grid md:grid-cols-2 gap-4">
        <ListBox title="Top Products" items={topProducts} onItemClick={() => {}} />
        <ListBox title="Top Customers" items={topCustomers} onItemClick={() => {}} />
      </div>
      <div className="bg-[#0D1B34] p-3 rounded-lg border border-[#1E2D50]">
        <h3 className="text-[#64FFDA] mb-2 text-sm">Recent Transactions</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-gray-200">
            <thead className="text-[#64FFDA]">
              <tr>
                <th className="text-left py-1 px-2">Voucher/Inv</th>
                <th className="text-left py-1 px-2">Date</th>
                <th className="text-left py-1 px-2">Party</th>
                <th className="text-right py-1 px-2">Amount</th>
                <th className="text-right py-1 px-2">Action</th>
              </tr>
            </thead>
            <tbody>
              {data.slice(0, 12).map((r, i) => {
                const inv = r["Vch No."] || r["Invoice No"] || r.id || "—";
                const date = r["Date"] || r["Voucher Date"] || r.date || "—";
                const party = r["Party Name"] || r["Party"] || r["Customer"] || r.party || "—";
                const amount = parseFloat(r["Amount"]) || parseFloat(r.amount) || 0;
                return (
                  <tr key={i} className="border-b border-[#1E2D50] hover:bg-[#0F263F]">
                    <td className="py-1 px-2">{inv}</td>
                    <td className="py-1 px-2">{date}</td>
                    <td className="py-1 px-2">{party}</td>
                    <td className="text-right py-1 px-2">{Number(amount).toLocaleString("en-IN")}</td>
                    <td className="py-1 px-2 text-right">
                      <button
                        onClick={() => openInvoice(r)}
                        className="px-2 py-1 rounded bg-[#64FFDA]/10 border border-[#64FFDA]/40 text-[#64FFDA] text-xs flex items-center gap-1"
                      >
                        <Eye size={12} /> View
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

function MetricCard({ title, value }) {
  return (
    <div className="bg-[#0E2136] p-3 rounded-lg border border-[#1E2D50] text-center">
      <div className="text-xs text-gray-300">{title}</div>
      <div className="text-lg font-bold text-[#64FFDA] mt-1">{value}</div>
    </div>
  );
}

function ListBox({ title, items = [], onItemClick }) {
  return (
    <div className="bg-[#0D1B34] p-3 rounded-lg border border-[#1E2D50]">
      <h4 className="text-[#64FFDA] mb-2 text-sm">{title}</h4>
      <ul className="text-xs text-gray-200 space-y-1 max-h-56 overflow-auto">
        {items.map(([name, amt], i) => (
          <li key={i} className="flex justify-between border-b border-[#1E2D50] py-1">
            <span className="truncate">{i + 1}. {name}</span>
            <span className="ml-2">{(amt || 0).toLocaleString("en-IN")}</span>
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
    (data || []).forEach((r) => s.add(r["Party Name"] || r["Customer"] || r["Party"] || "Unknown"));
    return Array.from(s).sort();
  }, [data]);

  const items = useMemo(() => {
    const s = new Set();
    (data || []).forEach((r) => {
      const name = (r["ItemName"] || r["Item Name"] || r["Description"] || "").toString().trim();
      if (name && !["", "unknown", "total"].includes(name.toLowerCase())) s.add(name);
    });
    return Array.from(s).sort();
  }, [data]);

  const salesmen = useMemo(() => {
    const s = new Set();
    (data || []).forEach((r) => s.add(r["Salesman"] || "Unknown"));
    return Array.from(s).sort();
  }, [data]);

  return (
    <div className="grid md:grid-cols-3 gap-4">
      <div className="bg-[#0D1B34] p-3 rounded-lg border border-[#1E2D50]">
        <h3 className="text-[#64FFDA] mb-2 text-sm">Parties ({parties.length})</h3>
        <ul className="text-xs text-gray-200 space-y-1 max-h-80 overflow-auto">
          {parties.map((p, i) => (
            <li key={i} className="py-1 border-b border-[#1E2D50] flex justify-between items-center">
              <span className="truncate">{p}</span>
              <button
                onClick={() => {
                  const recent = data.find((r) => (r["Party Name"] || r["Customer"] || r["Party"]) === p);
                  if (recent) openInvoice(recent);
                }}
                className="px-2 py-1 rounded bg-[#64FFDA]/10 border border-[#64FFDA]/40 text-[#64FFDA] text-xs ml-2"
              >
                View
              </button>
            </li>
          ))}
        </ul>
      </div>
      <div className="bg-[#0D1B34] p-3 rounded-lg border border-[#1E2D50]">
        <h3 className="text-[#64FFDA] mb-2 text-sm">Items ({items.length})</h3>
        <ul className="text-xs text-gray-200 space-y-1 max-h-80 overflow-auto">
          {items.map((it, i) => (
            <li key={i} className="py-1 border-b border-[#1E2D50] truncate">
              {it}
            </li>
          ))}
        </ul>
      </div>
      <div className="bg-[#0D1B34] p-3 rounded-lg border border-[#1E2D50]">
        <h3 className="text-[#64FFDA] mb-2 text-sm">Salesmen ({salesmen.length})</h3>
        <ul className="text-xs text-gray-200 space-y-1 max-h-80 overflow-auto">
          {salesmen.map((s, i) => (
            <li key={i} className="py-1 border-b border-[#1E2D50]">
              {s}
            </li>
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
  const pages = Math.max(1, Math.ceil((data || []).length / perPage));
  const pageData = (data || []).slice((page - 1) * perPage, page * perPage);

  return (
    <div>
      <div className="flex justify-between items-center mb-3">
        <h3 className="text-[#64FFDA] text-sm">Transactions ({(data || []).length})</h3>
        <button onClick={() => exportCSV(data, "Transactions")} className="px-2 py-1 rounded bg-[#64FFDA]/10 border border-[#64FFDA]/40 text-[#64FFDA] text-xs flex items-center gap-1">
          <Download size={12} /> Export
        </button>
      </div>
      <div className="overflow-x-auto bg-[#0D1B34] rounded-lg border border-[#1E2D50]">
        <table className="w-full text-xs text-gray-200">
          <thead className="text-[#64FFDA] bg-[#0A1528]">
            <tr>
              <th className="text-left py-2 px-2">Vch No</th>
              <th className="text-left py-2 px-2">Date</th>
              <th className="text-left py-2 px-2">Type</th>
              <th className="text-left py-2 px-2">Party</th>
              <th className="text-right py-2 px-2">Amount</th>
              <th className="text-right py-2 px-2">Action</th>
            </tr>
          </thead>
          <tbody>
            {pageData.map((r, i) => {
              const vch = r["Vch No."] || r["Voucher No"] || r["Invoice No"] || r.id || "—";
              const date = r["Date"] || r["Voucher Date"] || r.date || "—";
              const type = r["Type"] || r["Voucher Type"] || r["Vch Type"] || "—";
              const party = r["Party Name"] || r["Party"] || r["Customer"] || "—";
              const amount = parseFloat(r["Amount"]) || parseFloat(r.amount) || 0;
              return (
                <tr key={i} className="border-b border-[#1E2D50] hover:bg-[#0F263F]">
                  <td className="py-1 px-2">{vch}</td>
                  <td className="py-1 px-2">{date}</td>
                  <td className="py-1 px-2">{type}</td>
                  <td className="py-1 px-2">{party}</td>
                  <td className="text-right py-1 px-2">{Number(amount).toLocaleString("en-IN")}</td>
                  <td className="py-1 px-2 text-right">
                    <button onClick={() => openInvoice(r)} className="px-2 py-1 rounded bg-[#64FFDA]/10 border border-[#64FFDA]/40 text-[#64FFDA] text-xs">
                      View
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <div className="flex justify-between items-center mt-3">
        <button
          onClick={() => setPage((p) => Math.max(1, p - 1))}
          disabled={page === 1}
          className="px-3 py-1 rounded bg-[#64FFDA]/10 border border-[#64FFDA]/40 text-[#64FFDA] text-xs disabled:opacity-30"
        >
          Previous
        </button>
        <span className="text-xs text-gray-300">
          Page {page} of {pages}
        </span>
        <button
          onClick={() => setPage((p) => Math.min(pages, p + 1))}
          disabled={page === pages}
          className="px-3 py-1 rounded bg-[#64FFDA]/10 border border-[#64FFDA]/40 text-[#64FFDA] text-xs disabled:opacity-30"
        >
          Next
        </button>
      </div>
    </div>
  );
}

/* ================= Reports Section ================= */
function ReportsSection({ data = [], exportCSV }) {
  return (
    <div className="bg-[#0D1B34] p-4 rounded-lg border border-[#1E2D50]">
      <h3 className="text-[#64FFDA] mb-3 text-sm">Reports & Export</h3>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <button onClick={() => exportCSV(data, "AllData")} className="px-3 py-2 rounded bg-[#64FFDA]/10 border border-[#64FFDA]/40 text-[#64FFDA] text-xs">
          Export All Data
        </button>
        <button onClick={() => exportCSV(data, "SalesReport")} className="px-3 py-2 rounded bg-[#64FFDA]/10 border border-[#64FFDA]/40 text-[#64FFDA] text-xs">
          Sales Report
        </button>
        <button onClick={() => exportCSV(data, "PartyReport")} className="px-3 py-2 rounded bg-[#64FFDA]/10 border border-[#64FFDA]/40 text-[#64FFDA] text-xs">
          Party Report
        </button>
        <button onClick={() => exportCSV(data, "InventoryReport")} className="px-3 py-2 rounded bg-[#64FFDA]/10 border border-[#64FFDA]/40 text-[#64FFDA] text-xs">
          Inventory Report
        </button>
      </div>
      <p className="text-xs text-gray-400 mt-3">Click any button to download CSV report</p>
    </div>
  );
}

/* ================= Party Section ================= */
function PartySection({ data = [], openInvoice }) {
  const partyData = useMemo(() => {
    const map = {};
    (data || []).forEach((r) => {
      const party = r["Party Name"] || r["Customer"] || r["Party"] || "Unknown";
      const amt = parseFloat(r["Amount"]) || 0;
      if (!map[party]) map[party] = { total: 0, count: 0 };
      map[party].total += amt;
      map[party].count += 1;
    });
    return Object.entries(map)
      .map(([name, info]) => ({ name, ...info }))
      .sort((a, b) => b.total - a.total);
  }, [data]);

  return (
    <div className="bg-[#0D1B34] p-3 rounded-lg border border-[#1E2D50]">
      <h3 className="text-[#64FFDA] mb-2 text-sm">Party Ledger</h3>
      <div className="overflow-x-auto">
        <table className="w-full text-xs text-gray-200">
          <thead className="text-[#64FFDA]">
            <tr>
              <th className="text-left py-1 px-2">Party Name</th>
              <th className="text-right py-1 px-2">Transactions</th>
              <th className="text-right py-1 px-2">Total Amount</th>
              <th className="text-right py-1 px-2">Action</th>
            </tr>
          </thead>
          <tbody>
            {partyData.map((p, i) => (
              <tr key={i} className="border-b border-[#1E2D50] hover:bg-[#0F263F]">
                <td className="py-1 px-2">{p.name}</td>
                <td className="text-right py-1 px-2">{p.count}</td>
                <td className="text-right py-1 px-2">₹{p.total.toLocaleString("en-IN")}</td>
                <td className="py-1 px-2 text-right">
                  <button
                    onClick={() => {
                      const recent = data.find((r) => (r["Party Name"] || r["Customer"] || r["Party"]) === p.name);
                      if (recent) openInvoice(recent);
                    }}
                    className="px-2 py-1 rounded bg-[#64FFDA]/10 border border-[#64FFDA]/40 text-[#64FFDA] text-xs"
                  >
                    View
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* ================= Inventory Section ================= */
function InventorySection({ data = [] }) {
  const inventoryData = useMemo(() => {
    const map = {};
    (data || []).forEach((r) => {
      const item = r["ItemName"] || r["Item Name"] || r["Description"] || "Unknown";
      const qty = parseFloat(r["Qty"]) || parseFloat(r["Quantity"]) || 0;
      const amt = parseFloat(r["Amount"]) || 0;
      if (!map[item]) map[item] = { qty: 0, value: 0 };
      map[item].qty += qty;
      map[item].value += amt;
    });
    return Object.entries(map)
      .map(([name, info]) => ({ name, ...info }))
      .sort((a, b) => b.value - a.value);
  }, [data]);

  return (
    <div className="bg-[#0D1B34] p-3 rounded-lg border border-[#1E2D50]">
      <h3 className="text-[#64FFDA] mb-2 text-sm">Inventory Summary</h3>
      <div className="overflow-x-auto">
        <table className="w-full text-xs text-gray-200">
          <thead className="text-[#64FFDA]">
            <tr>
              <th className="text-left py-1 px-2">Item Name</th>
              <th className="text-right py-1 px-2">Quantity</th>
              <th className="text-right py-1 px-2">Value</th>
            </tr>
          </thead>
          <tbody>
            {inventoryData.map((item, i) => (
              <tr key={i} className="border-b border-[#1E2D50] hover:bg-[#0F263F]">
                <td className="py-1 px-2 truncate">{item.name}</td>
                <td className="text-right py-1 px-2">{item.qty.toFixed(2)}</td>
                <td className="text-right py-1 px-2">₹{item.value.toLocaleString("en-IN")}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* ================= Sales Entry Section ================= */
function SalesEntrySection() {
  return (
    <div className="bg-[#0D1B34] p-4 rounded-lg border border-[#1E2D50]">
      <h3 className="text-[#64FFDA] mb-3 text-sm">Sales Entry Form</h3>
      <p className="text-xs text-gray-400">Sales entry functionality coming soon...</p>
    </div>
  );
}

/* ================= ALL DATA SECTION (COMPLETE WITH ALL COLUMNS) ================= */
function AllDataSection({ data = [], exportCSV, currentPage, setCurrentPage, rowsPerPage }) {
  const allColumns = useMemo(() => {
    const colSet = new Set();
    (data || []).forEach((row) => {
      Object.keys(row || {}).forEach((key) => colSet.add(key));
    });
    return Array.from(colSet).sort();
  }, [data]);

  const totalPages = Math.max(1, Math.ceil((data || []).length / rowsPerPage));
  const paginatedData = useMemo(() => {
    const start = (currentPage - 1) * rowsPerPage;
    const end = start + rowsPerPage;
    return (data || []).slice(start, end);
  }, [data, currentPage, rowsPerPage]);

  const handlePrevPage = () => {
    if (currentPage > 1) setCurrentPage(currentPage - 1);
  };

  const handleNextPage = () => {
    if (currentPage < totalPages) setCurrentPage(currentPage + 1);
  };

  return (
    <div className="space-y-3">
      <div className="flex justify-between items-center">
        <h3 className="text-[#64FFDA] text-sm">
          All Imported Data ({(data || []).length} rows) - Showing {paginatedData.length} rows
        </h3>
        <button
          onClick={() => exportCSV(data, "AllData_Full")}
          className="px-3 py-1 rounded bg-[#64FFDA]/10 border border-[#64FFDA]/40 text-[#64FFDA] text-xs flex items-center gap-1"
        >
          <Download size={12} /> Export CSV
        </button>
      </div>

      <div className="bg-[#0D1B34] rounded-lg border border-[#1E2D50] overflow-hidden">
        <div className="overflow-x-auto max-h-[600px]">
          <table className="w-full text-xs text-gray-200">
            <thead className="text-[#64FFDA] bg-[#0A1528] sticky top-0">
              <tr>
                <th className="text-left py-2 px-2 border-b border-[#1E2D50] sticky left-0 bg-[#0A1528] z-10">#</th>
                {allColumns.map((col, idx) => (
                  <th key={idx} className="text-left py-2 px-2 border-b border-[#1E2D50] whitespace-nowrap">
                    {col}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {paginatedData.map((row, rowIdx) => (
                <tr key={rowIdx} className="border-b border-[#1E2D50] hover:bg-[#0F263F]">
                  <td className="py-1 px-2 sticky left-0 bg-[#0D1B34] font-semibold">{(currentPage - 1) * rowsPerPage + rowIdx + 1}</td>
                  {allColumns.map((col, colIdx) => {
                    const value = row[col];
                    let displayValue = "";
                    if (value === null || value === undefined) {
                      displayValue = "";
                    } else if (typeof value === "object") {
                      displayValue = JSON.stringify(value);
                    } else {
                      displayValue = String(value);
                    }
                    return (
                      <td key={colIdx} className="py-1 px-2 max-w-xs truncate" title={displayValue}>
                        {displayValue}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="flex justify-between items-center bg-[#0D1B34] p-3 rounded-lg border border-[#1E2D50]">
        <button
          onClick={handlePrevPage}
          disabled={currentPage === 1}
          className="px-3 py-1 rounded bg-[#64FFDA]/10 border border-[#64FFDA]/40 text-[#64FFDA] text-xs disabled:opacity-30 disabled:cursor-not-allowed flex items-center gap-1"
        >
          <ChevronLeft size={14} /> Previous
        </button>
        <span className="text-xs text-gray-300">
          Page {currentPage} of {totalPages} ({(data || []).length} total rows)
        </span>
        <button
          onClick={handleNextPage}
          disabled={currentPage === totalPages}
          className="px-3 py-1 rounded bg-[#64FFDA]/10 border border-[#64FFDA]/40 text-[#64FFDA] text-xs disabled:opacity-30 disabled:cursor-not-allowed flex items-center gap-1"
        >
          Next <ChevronRight size={14} />
        </button>
      </div>
    </div>
  );
}

/* ================= Settings Section ================= */
function SettingsSection() {
  return (
    <div className="bg-[#0D1B34] p-4 rounded-lg border border-[#1E2D50]">
      <h3 className="text-[#64FFDA] mb-3 text-sm">Settings</h3>
      <p className="text-xs text-gray-400">Settings options coming soon...</p>
    </div>
  );
}

/* ================= Invoice Modal ================= */
function InvoiceModal({ refObj, row, onClose, printSize, setPrintSize, onPrint, onShare, onCopy }) {
  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
      <div ref={refObj} className="bg-[#0D1B34] rounded-lg border border-[#1E2D50] max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-4 border-b border-[#1E2D50] flex justify-between items-center sticky top-0 bg-[#0D1B34]">
          <h3 className="text-[#64FFDA] text-sm">Invoice Details</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-white">
            ✕
          </button>
        </div>
        <div className="p-4">
          <div className="grid grid-cols-2 gap-3 text-xs">
            {Object.entries(row || {}).map(([key, val], i) => (
              <div key={i} className="border-b border-[#1E2D50] py-1">
                <div className="text-gray-400">{key}</div>
                <div className="text-gray-200">{String(val || "—")}</div>
              </div>
            ))}
          </div>
        </div>
        <div className="p-4 border-t border-[#1E2D50] flex flex-wrap gap-2">
          <select
            value={printSize}
            onChange={(e) => setPrintSize(e.target.value)}
            className="bg-[#0C1B31] border border-[#223355] rounded px-2 py-1 text-xs"
          >
            <option value="A4">A4</option>
            <option value="A5">A5</option>
            <option value="Thermal">Thermal</option>
          </select>
          <button onClick={onPrint} className="px-3 py-1 rounded bg-[#64FFDA]/10 border border-[#64FFDA]/40 text-[#64FFDA] text-xs flex items-center gap-1">
            <Printer size={12} /> Print
          </button>
          <button onClick={onShare} className="px-3 py-1 rounded bg-[#64FFDA]/10 border border-[#64FFDA]/40 text-[#64FFDA] text-xs flex items-center gap-1">
            <Send size={12} /> Share
          </button>
          <button onClick={onCopy} className="px-3 py-1 rounded bg-[#64FFDA]/10 border border-[#64FFDA]/40 text-[#64FFDA] text-xs flex items-center gap-1">
            <FileText size={12} /> Copy
          </button>
        </div>
      </div>
    </div>
  );
}
