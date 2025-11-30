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

  const cleanData = useMemo(() => {
    return rawData;
  }, [rawData]);

  const mainFilteredData = useMemo(() => {
    let rows = Array.isArray(cleanData) ? cleanData : [];
    if (companyFilter && companyFilter !== "All Companies") {
      rows = rows.filter((r) => {
        const c = r["Company"] || r["Item Category"] || r["Party"] || r["Party Name"] || "";
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
      let d = r.Date || r.date || r["Voucher Date"] || "";
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

  // DIRECT BACKEND FETCH - SAME AS DASHBOARD
  useEffect(() => {
    let cancelled = false;

    const fetchData = async () => {
      setLoading(true);
      setError("");

      try {
        // DIRECT CONNECTION - Same as Dashboard
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

        console.log(`✅ Analyst loaded ${arr.length} vouchers`);

        if (!cancelled) {
          // Map to analyst format
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

          setRawData(mapped);
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
          setError("Unable to load analyst data");
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

  const metrics = useMemo(() => {
    let totalSales = 0;
    let receipts = 0;
    let expenses = 0;
    let outstanding = 0;
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
    const invNo = row["Invoice No"] || row["Voucher No"] || row["Vch No."] || "";
    const date = row["Date"] || "";
    const party = row["Party Name"] || "";
    const amount = row["Amount"] || 0;
    return `Invoice: ${invNo}\nDate: ${date}\nParty: ${party}\nTotal: ₹${amount.toLocaleString("en-IN")}`;
  };

  const copyInvoiceToClipboard = async () => {
    if (!selectedInvoice) return;
    const text = invoiceText(selectedInvoice);
    try {
      await navigator.clipboard.writeText(text);
      alert("Copied!");
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
    }],
  };

  const companyPie = {
    labels: companySplit.labels,
    datasets: [{
      data: companySplit.values,
      backgroundColor: ["#64FFDA", "#3B82F6", "#F59E0B", "#EF4444", "#8B5CF6", "#22D3EE"],
    }],
  };

  if (loading)
    return (
      <div className="h-screen flex items-center justify-center text-[#64FFDA] bg-[#071429]">
        Loading analyst data...
      </div>
    );

  if (error)
    return (
      <div className="h-screen p-4 sm:p-6 bg-gradient-to-br from-[#0A192F] via-[#112240] to-[#0A192F] text-gray-300">
        <div className="max-w-2xl mx-auto text-center">
          <h2 className="text-xl sm:text-2xl text-[#64FFDA] font-semibold mb-2">Error</h2>
          <p className="text-sm">{error}</p>
          <p className="mt-4 text-xs">Backend: https://selt-t-backend.selt-3232.workers.dev</p>
        </div>
      </div>
    );

  if (!cleanData.length)
    return (
      <div className="h-screen p-4 sm:p-6 bg-gradient-to-br from-[#0A192F] via-[#112240] to-[#0A192F] text-gray-300">
        <div className="max-w-2xl mx-auto text-center">
          <h2 className="text-xl sm:text-2xl text-[#64FFDA] font-semibold mb-2">No data found</h2>
          <p className="text-xs sm:text-sm">Check backend API connection.</p>
        </div>
      </div>
    );

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#071226] via-[#0A192F] to-[#071226] text-gray-100 p-2 sm:p-4">
      <div className="max-w-[1400px] mx-auto bg-[#12223b] rounded-xl p-3 sm:p-4 border border-[#223355] shadow-xl">
        {/* HEADER */}
        <div className="flex flex-wrap justify-between items-center mb-3 gap-2">
          <h1 className="text-sm sm:text-lg font-bold text-[#64FFDA] flex items-center gap-2">
            <FileSpreadsheet size={16} className="sm:hidden" />
            <FileSpreadsheet size={20} className="hidden sm:block" />
            ANALYST
          </h1>
          <div className="flex flex-wrap items-center gap-1 sm:gap-2">
            <div className="text-[9px] sm:text-xs text-gray-300 hidden sm:block">
              {lastSync ? new Date(lastSync).toLocaleTimeString() : "—"}
            </div>
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
              className={`px-1.5 sm:px-2 py-1 rounded text-[10px] sm:text-xs border flex items-center gap-1 ${autoRefresh ? "bg-[#64FFDA] text-[#071226]" : "bg-transparent text-[#64FFDA] border-[#64FFDA]/30"}`}
            >
              <RefreshCw size={12} className="sm:hidden" />
              <RefreshCw size={14} className="hidden sm:block" />
              <span className="hidden sm:inline">{autoRefresh ? "Auto" : "Refresh"}</span>
            </button>
            <button
              onClick={() => {
                localStorage.removeItem("analyst_latest_rows");
                window.location.reload();
              }}
              className="px-1.5 sm:px-2 py-1 rounded bg-[#64FFDA]/10 border border-[#64FFDA]/40 text-[#64FFDA] text-[10px] sm:text-xs hidden sm:block"
            >
              Clear
            </button>
          </div>
        </div>

        {/* NAV */}
        <div className="flex flex-wrap gap-1 sm:gap-2 mb-3">
          {[
            { key: "dashboard", label: "Dashboard" },
            { key: "masters", label: "Masters" },
            { key: "transactions", label: "Trans" },
            { key: "reports", label: "Reports" },
            { key: "party", label: "Party" },
            { key: "inventory", label: "Inventory" },
            { key: "alldata", label: "All Data" },
          ].map((tab) => (
            <button
              key={tab.key}
              onClick={() => {
                setActiveSection(tab.key);
                setCurrentPage(1);
              }}
              className={`px-2 sm:px-3 py-1 rounded text-[10px] sm:text-xs font-semibold ${activeSection === tab.key ? "bg-[#64FFDA] text-[#081827]" : "bg-[#0C1B31] text-gray-300 border border-[#223355]"}`}
            >
              {tab.label}
            </button>
          ))}
          <div className="ml-auto flex items-center gap-1 sm:gap-2">
            <input
              placeholder="Search..."
              value={searchQ}
              onChange={(e) => setSearchQ(e.target.value)}
              className="bg-[#0C1B31] px-1.5 sm:px-2 py-1 rounded border border-[#223355] text-[10px] sm:text-xs w-20 sm:w-32"
            />
            <button
              onClick={() => exportCSV(dateFiltered.slice(0, 1000), "AnalystExport")}
              className="px-1.5 sm:px-2 py-1 rounded bg-[#64FFDA]/10 border border-[#64FFDA]/40 text-[#64FFDA] text-[10px] sm:text-xs flex items-center gap-1"
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
          {activeSection === "masters" && <MastersSection data={cleanData} openInvoice={openInvoice} />}
          {activeSection === "transactions" && (
            <TransactionsSection data={dateFiltered} openInvoice={openInvoice} exportCSV={exportCSV} />
          )}
          {activeSection === "reports" && <ReportsSection data={dateFiltered} exportCSV={exportCSV} />}
          {activeSection === "party" && <PartySection data={dateFiltered} openInvoice={openInvoice} />}
          {activeSection === "inventory" && <InventorySection data={dateFiltered} />}
          {activeSection === "alldata" && (
            <AllDataSection 
              data={dateFiltered} 
              exportCSV={exportCSV}
              currentPage={currentPage}
              setCurrentPage={setCurrentPage}
              rowsPerPage={rowsPerPage}
            />
          )}
        </div>
      </div>

      {/* MODAL */}
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

// Dashboard Section Component
function DashboardSection({ metrics, monthlyChartData, companyPie, topProducts, topCustomers, data, openInvoice, formatINR }) {
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3">
        <MetricCard title="Total Sales" value={formatINR(metrics.totalSales)} />
        <MetricCard title="Receipts" value={formatINR(metrics.receipts)} />
        <MetricCard title="Expenses" value={formatINR(metrics.expenses)} />
        <MetricCard title="Outstanding" value={formatINR(metrics.outstanding)} />
      </div>
      <div className="grid md:grid-cols-3 gap-3">
        <div className="col-span-2 bg-[#0B1A33] p-2 sm:p-3 rounded-lg border border-[#1E2D50]">
          <h3 className="text-[#64FFDA] mb-2 text-xs sm:text-sm">Monthly Sales</h3>
          <div className="h-32 sm:h-48">
            <Line data={monthlyChartData} options={{ maintainAspectRatio: false, plugins: { legend: { labels: { font: { size: 9 } } } } }} />
          </div>
        </div>
        <div className="bg-[#0B1A33] p-2 sm:p-3 rounded-lg border border-[#1E2D50]">
          <h3 className="text-[#64FFDA] mb-2 text-xs sm:text-sm">Company Split</h3>
          <div className="h-32 sm:h-48">
            <Doughnut data={companyPie} options={{ maintainAspectRatio: false, plugins: { legend: { labels: { font: { size: 8 } } } } }} />
          </div>
        </div>
      </div>
      <div className="grid md:grid-cols-2 gap-3">
        <ListBox title="Top Products" items={topProducts} />
        <ListBox title="Top Customers" items={topCustomers} />
      </div>
      <div className="bg-[#0D1B34] p-2 sm:p-3 rounded-lg border border-[#1E2D50]">
        <h3 className="text-[#64FFDA] mb-2 text-xs sm:text-sm">Recent Transactions</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-[10px] sm:text-xs text-gray-200">
            <thead className="text-[#64FFDA]">
              <tr>
                <th className="text-left py-1 px-1 sm:px-2">Vch</th>
                <th className="text-left py-1 px-1 sm:px-2">Date</th>
                <th className="text-left py-1 px-1 sm:px-2">Party</th>
                <th className="text-right py-1 px-1 sm:px-2">Amount</th>
                <th className="text-right py-1 px-1 sm:px-2">Action</th>
              </tr>
            </thead>
            <tbody>
              {data.slice(0, 12).map((r, i) => {
                const inv = r["Vch No."] || "—";
                const date = r["Date"] || "—";
                const party = r["Party Name"] || "—";
                const amount = parseFloat(r["Amount"]) || 0;
                return (
                  <tr key={i} className="border-b border-[#1E2D50] hover:bg-[#0F263F]">
                    <td className="py-1 px-1 sm:px-2 truncate max-w-[60px] sm:max-w-none">{inv}</td>
                    <td className="py-1 px-1 sm:px-2 hidden sm:table-cell">{date}</td>
                    <td className="py-1 px-1 sm:px-2 truncate max-w-[80px] sm:max-w-none">{party}</td>
                    <td className="text-right py-1 px-1 sm:px-2">{Number(amount).toLocaleString("en-IN")}</td>
                    <td className="py-1 px-1 sm:px-2 text-right">
                      <button
                        onClick={() => openInvoice(r)}
                        className="px-1.5 sm:px-2 py-0.5 sm:py-1 rounded bg-[#64FFDA]/10 border border-[#64FFDA]/40 text-[#64FFDA] text-[9px] sm:text-xs flex items-center gap-1"
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

function MetricCard({ title, value }) {
  return (
    <div className="bg-[#0E2136] p-2 sm:p-3 rounded-lg border border-[#1E2D50] text-center">
      <div className="text-[9px] sm:text-xs text-gray-300">{title}</div>
      <div className="text-xs sm:text-lg font-bold text-[#64FFDA] mt-1">{value}</div>
    </div>
  );
}

function ListBox({ title, items = [] }) {
  return (
    <div className="bg-[#0D1B34] p-2 sm:p-3 rounded-lg border border-[#1E2D50]">
      <h4 className="text-[#64FFDA] mb-2 text-xs sm:text-sm">{title}</h4>
      <ul className="text-[10px] sm:text-xs text-gray-200 space-y-1 max-h-40 sm:max-h-56 overflow-auto">
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

// Masters, Transactions, Reports, Party, Inventory sections (compact versions - same as before but simplified for space)
function MastersSection({ data, openInvoice }) {
  const parties = [...new Set(data.map(r => r["Party Name"]))].sort();
  const items = [...new Set(data.map(r => r["ItemName"]))].sort();
  
  return (
    <div className="grid md:grid-cols-2 gap-3">
      <div className="bg-[#0D1B34] p-2 sm:p-3 rounded-lg border border-[#1E2D50]">
        <h3 className="text-[#64FFDA] mb-2 text-xs sm:text-sm">Parties ({parties.length})</h3>
        <ul className="text-[10px] sm:text-xs text-gray-200 space-y-1 max-h-60 overflow-auto">
          {parties.map((p, i) => (
            <li key={i} className="py-1 border-b border-[#1E2D50]">{p}</li>
          ))}
        </ul>
      </div>
      <div className="bg-[#0D1B34] p-2 sm:p-3 rounded-lg border border-[#1E2D50]">
        <h3 className="text-[#64FFDA] mb-2 text-xs sm:text-sm">Items ({items.length})</h3>
        <ul className="text-[10px] sm:text-xs text-gray-200 space-y-1 max-h-60 overflow-auto">
          {items.map((it, i) => (
            <li key={i} className="py-1 border-b border-[#1E2D50] truncate">{it}</li>
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
        <h3 className="text-[#64FFDA] text-xs sm:text-sm">Transactions ({data.length})</h3>
        <button onClick={() => exportCSV(data, "Transactions")} className="px-1.5 sm:px-2 py-1 rounded bg-[#64FFDA]/10 border border-[#64FFDA]/40 text-[#64FFDA] text-[10px] sm:text-xs">
          <Download size={12} />
        </button>
      </div>
      <div className="overflow-x-auto bg-[#0D1B34] rounded-lg border border-[#1E2D50]">
        <table className="w-full text-[10px] sm:text-xs text-gray-200">
          <thead className="text-[#64FFDA] bg-[#0A1528]">
            <tr>
              <th className="text-left py-1 px-1">Vch</th>
              <th className="text-left py-1 px-1">Party</th>
              <th className="text-right py-1 px-1">Amount</th>
              <th className="text-right py-1 px-1">Action</th>
            </tr>
          </thead>
          <tbody>
            {pageData.map((r, i) => (
              <tr key={i} className="border-b border-[#1E2D50]">
                <td className="py-1 px-1 truncate max-w-[60px]">{r["Vch No."] || "—"}</td>
                <td className="py-1 px-1 truncate max-w-[100px]">{r["Party Name"] || "—"}</td>
                <td className="text-right py-1 px-1">{(r["Amount"] || 0).toLocaleString("en-IN")}</td>
                <td className="py-1 px-1 text-right">
                  <button onClick={() => openInvoice(r)} className="px-1.5 py-0.5 rounded bg-[#64FFDA]/10 text-[#64FFDA] text-[9px]">
                    View
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="flex justify-between mt-2">
        <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} className="px-2 py-1 rounded bg-[#64FFDA]/10 text-[#64FFDA] text-[10px] disabled:opacity-30">
          Prev
        </button>
        <span className="text-[10px] text-gray-300">Page {page}/{pages}</span>
        <button onClick={() => setPage(p => Math.min(pages, p + 1))} disabled={page === pages} className="px-2 py-1 rounded bg-[#64FFDA]/10 text-[#64FFDA] text-[10px] disabled:opacity-30">
          Next
        </button>
      </div>
    </div>
  );
}

function ReportsSection({ data, exportCSV }) {
  return (
    <div className="bg-[#0D1B34] p-3 rounded-lg border border-[#1E2D50]">
      <h3 className="text-[#64FFDA] mb-2 text-xs">Reports</h3>
      <div className="grid grid-cols-2 gap-2">
        <button onClick={() => exportCSV(data, "AllData")} className="px-2 py-1.5 rounded bg-[#64FFDA]/10 text-[#64FFDA] text-[10px]">Export All</button>
        <button onClick={() => exportCSV(data, "Sales")} className="px-2 py-1.5 rounded bg-[#64FFDA]/10 text-[#64FFDA] text-[10px]">Sales</button>
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
      <h3 className="text-[#64FFDA] mb-2 text-xs">Party Ledger</h3>
      <div className="overflow-x-auto">
        <table className="w-full text-[10px] text-gray-200">
          <thead className="text-[#64FFDA]">
            <tr>
              <th className="text-left py-1 px-1">Party</th>
              <th className="text-right py-1 px-1">Total</th>
            </tr>
          </thead>
          <tbody>
            {partyData.map((p, i) => (
              <tr key={i} className="border-b border-[#1E2D50]">
                <td className="py-1 px-1 truncate max-w-[120px]">{p.name}</td>
                <td className="text-right py-1 px-1">₹{p.total.toLocaleString("en-IN")}</td>
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
      <h3 className="text-[#64FFDA] mb-2 text-xs">Inventory</h3>
      <div className="overflow-x-auto">
        <table className="w-full text-[10px] text-gray-200">
          <thead className="text-[#64FFDA]">
            <tr>
              <th className="text-left py-1 px-1">Item</th>
              <th className="text-right py-1 px-1">Qty</th>
              <th className="text-right py-1 px-1">Value</th>
            </tr>
          </thead>
          <tbody>
            {inv.map((item, i) => (
              <tr key={i} className="border-b border-[#1E2D50]">
                <td className="py-1 px-1 truncate max-w-[150px]">{item.name}</td>
                <td className="text-right py-1 px-1">{item.qty.toFixed(2)}</td>
                <td className="text-right py-1 px-1">₹{item.value.toLocaleString("en-IN")}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function AllDataSection({ data, exportCSV, currentPage, setCurrentPage, rowsPerPage }) {
  const allColumns = useMemo(() => {
    const colSet = new Set();
    data.forEach(row => Object.keys(row).forEach(key => colSet.add(key)));
    return Array.from(colSet).sort();
  }, [data]);

  const totalPages = Math.max(1, Math.ceil(data.length / rowsPerPage));
  const paginatedData = useMemo(() => {
    const start = (currentPage - 1) * rowsPerPage;
    return data.slice(start, start + rowsPerPage);
  }, [data, currentPage, rowsPerPage]);

  return (
    <div className="space-y-2">
      <div className="flex justify-between">
        <h3 className="text-[#64FFDA] text-xs">All Data ({data.length})</h3>
        <button onClick={() => exportCSV(data, "AllData")} className="px-2 py-1 rounded bg-[#64FFDA]/10 text-[#64FFDA] text-[10px]">
          <Download size={12} />
        </button>
      </div>
      <div className="bg-[#0D1B34] rounded-lg border border-[#1E2D50] overflow-hidden">
        <div className="overflow-x-auto max-h-[400px]">
          <table className="w-full text-[9px] text-gray-200">
            <thead className="text-[#64FFDA] bg-[#0A1528] sticky top-0">
              <tr>
                <th className="text-left py-1 px-1 border-b border-[#1E2D50] sticky left-0 bg-[#0A1528]">#</th>
                {allColumns.map((col, idx) => (
                  <th key={idx} className="text-left py-1 px-1 border-b border-[#1E2D50] whitespace-nowrap">{col}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {paginatedData.map((row, rowIdx) => (
                <tr key={rowIdx} className="border-b border-[#1E2D50]">
                  <td className="py-1 px-1 sticky left-0 bg-[#0D1B34] font-semibold">{(currentPage - 1) * rowsPerPage + rowIdx + 1}</td>
                  {allColumns.map((col, colIdx) => {
                    const value = row[col];
                    const displayValue = value === null || value === undefined ? "" : typeof value === "object" ? JSON.stringify(value) : String(value);
                    return (
                      <td key={colIdx} className="py-1 px-1 max-w-[100px] truncate" title={displayValue}>{displayValue}</td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      <div className="flex justify-between items-center bg-[#0D1B34] p-2 rounded-lg border border-[#1E2D50]">
        <button onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1} className="px-2 py-1 rounded bg-[#64FFDA]/10 text-[#64FFDA] text-[10px] disabled:opacity-30">
          <ChevronLeft size={12} /> Prev
        </button>
        <span className="text-[10px] text-gray-300">Page {currentPage}/{totalPages}</span>
        <button onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages} className="px-2 py-1 rounded bg-[#64FFDA]/10 text-[#64FFDA] text-[10px] disabled:opacity-30">
          Next <ChevronRight size={12} />
        </button>
      </div>
    </div>
  );
}

function InvoiceModal({ refObj, row, onClose, printSize, setPrintSize, onPrint, onShare, onCopy }) {
  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-2 sm:p-4">
      <div ref={refObj} className="bg-[#0D1B34] rounded-lg border border-[#1E2D50] max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-3 sm:p-4 border-b border-[#1E2D50] flex justify-between items-center sticky top-0 bg-[#0D1B34]">
          <h3 className="text-[#64FFDA] text-xs sm:text-sm">Invoice Details</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-white text-lg">✕</button>
        </div>
        <div className="p-3 sm:p-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[10px] sm:text-xs">
            {Object.entries(row || {}).map(([key, val], i) => (
              <div key={i} className="border-b border-[#1E2D50] py-1">
                <div className="text-gray-400">{key}</div>
                <div className="text-gray-200 truncate">{String(val || "—")}</div>
              </div>
            ))}
          </div>
        </div>
        <div className="p-3 sm:p-4 border-t border-[#1E2D50] flex flex-wrap gap-2">
          <select value={printSize} onChange={(e) => setPrintSize(e.target.value)} className="bg-[#0C1B31] border border-[#223355] rounded px-1.5 py-1 text-[10px]">
            <option value="A4">A4</option>
            <option value="A5">A5</option>
            <option value="Thermal">Thermal</option>
          </select>
          <button onClick={onPrint} className="px-2 py-1 rounded bg-[#64FFDA]/10 text-[#64FFDA] text-[10px] flex items-center gap-1">
            <Printer size={12} /> Print
          </button>
          <button onClick={onShare} className="px-2 py-1 rounded bg-[#64FFDA]/10 text-[#64FFDA] text-[10px] flex items-center gap-1">
            <Send size={12} /> Share
          </button>
          <button onClick={onCopy} className="px-2 py-1 rounded bg-[#64FFDA]/10 text-[#64FFDA] text-[10px] flex items-center gap-1">
            <FileText size={12} /> Copy
          </button>
        </div>
      </div>
    </div>
  );
}
