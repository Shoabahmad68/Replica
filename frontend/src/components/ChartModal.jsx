import React, { useEffect, useMemo, useState } from "react";
import { Pie, Bar, Doughnut, Line } from "react-chartjs-2";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";
import * as XLSX from "xlsx";

/**
 * ChartModal: detailed report modal (table/pivot views)
 * Props:
 *  - title, onClose, chartType (dealer/product/area/target/group/company/salesman/trend), data, excelData
 */
export default function ChartModal({ title = "Detailed Report", onClose, chartType = "dealer", data = {}, excelData = [] }) {
  const [selectedMonth, setSelectedMonth] = useState("All");
  const [search, setSearch] = useState("");
  const [sortKey, setSortKey] = useState("sales");
  const [sortDir, setSortDir] = useState("desc");
  const [selectedChartKind, setSelectedChartKind] = useState(
    chartType === "company" ? "bar" : chartType === "salesman" ? "bar" : chartType === "trend" ? "line" : "pie"
  );

  // month options derived from excelData
  const monthList = useMemo(() => {
    const m = new Set();
    excelData.forEach((r) => {
      const d = r["Date"] || r["Month"] || r["Bill Date"];
      if (!d) return;
      const dt = new Date(d);
      if (!isNaN(dt)) m.add(dt.toLocaleString("default", { month: "short" }));
    });
    return ["All", ...Array.from(m)];
  }, [excelData]);

  const toNumber = (v) => parseFloat(String(v || "").replace(/[^0-9.-]/g, "")) || 0;

  // filtered rows
  const filteredRows = useMemo(() => {
    let rows = (excelData || []).slice();
    if (selectedMonth !== "All") {
      rows = rows.filter((r) => {
        const d = r["Date"] || r["Month"] || r["Bill Date"];
        if (!d) return false;
        const dt = new Date(d);
        if (isNaN(dt)) return false;
        return dt.toLocaleString("default", { month: "short" }) === selectedMonth;
      });
    }
    if (search && search.trim()) {
      const q = search.toLowerCase();
      rows = rows.filter((r) =>
        (
          (r["Party Name"] || r["Dealer"] || r["Item Category"] || r["Item Name"] || r["Salesman"] || r["City/Area"] || r["Ledger"] || "")
        ).toString().toLowerCase().includes(q)
      );
    }
    return rows;
  }, [excelData, selectedMonth, search]);

  // prepare summary depending on chartType
  const summary = useMemo(() => {
    const map = {};

    const push = (keyObj) => {
      const key = Object.values(keyObj).join("||");
      if (!map[key]) map[key] = { ...keyObj, sales: 0 };
      map[key].sales += toNumber(keyObj._amt || 0);
    };

    if (chartType === "dealer" || chartType === "dealer-view") {
      filteredRows.forEach((r) =>
        push({
          company: r["Item Category"] || r["Product Name"] || "Unknown",
          dealer: r["Party Name"] || r["Dealer"] || r["Party"] || "Unknown",
          salesman: r["Salesman"] || r["ASM"] || "Unknown",
          area: r["City/Area"] || r["Area"] || "Unknown",
          _amt: r["Amount"],
        })
      );
      return Object.values(map).map((v) => ({ company: v.company, dealer: v.dealer, salesman: v.salesman, area: v.area, sales: v.sales }));
    }

    if (chartType === "product" || chartType === "product-view") {
      filteredRows.forEach((r) =>
        push({
          company: r["Item Category"] || r["Product Name"] || "Unknown",
          product: r["Item Name"] || r["Product Name"] || r["Item"] || "Unknown",
          _amt: r["Amount"],
        })
      );
      return Object.values(map).map((v) => ({ company: v.company, product: v.product, sales: v.sales }));
    }

    if (chartType === "area" || chartType === "area-view") {
      filteredRows.forEach((r) =>
        push({
          company: r["Item Category"] || r["Product Name"] || "Unknown",
          area: r["City/Area"] || r["Area"] || "Unknown",
          salesman: r["Salesman"] || "Unknown",
          _amt: r["Amount"],
        })
      );
      return Object.values(map).map((v) => ({ company: v.company, area: v.area, salesman: v.salesman, sales: v.sales }));
    }

    if (chartType === "target") {
      const asm = {};
      filteredRows.forEach((r) => {
        const a = r["Salesman"] || r["ASM"] || "Unknown";
        if (!asm[a]) asm[a] = { asm: a, target: 0, achievement: 0, monthlySales: 0 };
        asm[a].target += toNumber(r["Target"] || 0);
        asm[a].achievement += toNumber(r["Achievement"] || r["Amount"] || 0);
        asm[a].monthlySales += toNumber(r["Amount"]);
      });
      return Object.values(asm).map((v) => ({
        asm: v.asm,
        target: v.target,
        achievement: v.achievement,
        monthlySales: v.monthlySales,
        achPct: v.target ? (v.achievement / v.target) * 100 : v.target === 0 ? null : (v.achievement / 1) * 100,
      }));
    }

    if (chartType === "group" || chartType === "partygroup") {
      const gmap = {};
      filteredRows.forEach((r) => {
        const group = r["Ledger"] || r["Party Group"] || "Unknown";
        const dealer = r["Party Name"] || r["Dealer"] || "Unknown";
        const amt = toNumber(r["Amount"]);
        if (!gmap[group]) gmap[group] = { group, dealers: {}, sales: 0 };
        gmap[group].sales += amt;
        gmap[group].dealers[dealer] = (gmap[group].dealers[dealer] || 0) + amt;
      });
      return Object.values(gmap).map((g) => {
        const top = Object.entries(g.dealers).sort((a, b) => b[1] - a[1])[0] || ["-", 0];
        return { group: g.group, topDealer: top[0], sales: g.sales };
      });
    }

    // default fallback: raw rows
    return filteredRows.map((r) => ({
      party: r["Party Name"] || r["Dealer"] || r["Party"] || "Unknown",
      product: r["Item Name"] || r["Product Name"] || r["Item"] || "Unknown",
      salesman: r["Salesman"] || "Unknown",
      area: r["City/Area"] || r["Area"] || "Unknown",
      sales: toNumber(r["Amount"]),
      date: r["Date"] || r["Bill Date"] || "",
    }));
  }, [filteredRows, chartType]);

  // Sorting
  const sortedSummary = useMemo(() => {
    const arr = Array.isArray(summary) ? [...summary] : [];
    const sk = sortKey || "sales";
    arr.sort((a, b) => {
      const av = a[sk] || 0;
      const bv = b[sk] || 0;
      return sortDir === "asc" ? av - bv : bv - av;
    });
    return arr;
  }, [summary, sortKey, sortDir]);

  // Export helpers
  const exportExcel = () => {
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(sortedSummary);
    XLSX.utils.book_append_sheet(wb, ws, "Report");
    XLSX.writeFile(wb, `${title}.xlsx`);
  };

  const exportPDF = async () => {
    const el = document.getElementById("report-table-container");
    if (!el) return;
    const canvas = await html2canvas(el, { scale: 2 });
    const img = canvas.toDataURL("image/png");
    const pdf = new jsPDF("l", "mm", "a4");
    const width = pdf.internal.pageSize.getWidth();
    const height = (canvas.height * width) / canvas.width;
    pdf.addImage(img, "PNG", 0, 8, width, height);
    pdf.save(`${title}.pdf`);
  };

  const handlePrint = async () => {
    const el = document.getElementById("report-table-container");
    if (!el) return;
    const canvas = await html2canvas(el);
    const img = canvas.toDataURL("image/png");
    const win = window.open("");
    win.document.write(`<img src="${img}" style="width:100%"/>`);
    win.print();
    win.close();
  };

  const fmt = (v) => `₹${Number(v || 0).toLocaleString("en-IN", { maximumFractionDigits: 0 })}`;

  // small chart data for modal (derive from summary when possible)
  const modalChartData = useMemo(() => {
    // if summary has labels/sales, build chart data
    if (!Array.isArray(sortedSummary) || sortedSummary.length === 0) return { labels: [], datasets: [{ data: [] }] };
    if (chartType === "dealer") {
      const labels = sortedSummary.map((r) => `${r.dealer}`);
      return { labels, datasets: [{ label: "Dealer Sales", data: sortedSummary.map((r) => r.sales), backgroundColor: ["#7C3AED", "#10B981", "#6366F1", "#F97316", "#F59E0B"] }] };
    }
    if (chartType === "product") {
      const labels = sortedSummary.map((r) => `${r.product}`);
      return { labels, datasets: [{ label: "Product Sales", data: sortedSummary.map((r) => r.sales), backgroundColor: ["#7C3AED", "#10B981", "#6366F1", "#F97316"] }] };
    }
    if (chartType === "area") {
      const labels = sortedSummary.map((r) => `${r.area}`);
      return { labels, datasets: [{ label: "Area Sales", data: sortedSummary.map((r) => r.sales), backgroundColor: ["#10B981", "#6366F1", "#F97316"] }] };
    }
    if (chartType === "target") {
      const labels = sortedSummary.map((r) => r.asm);
      return { labels, datasets: [{ label: "Achievement", data: sortedSummary.map((r) => r.achievement), backgroundColor: ["#7C3AED"] }, { label: "Target", data: sortedSummary.map((r) => r.target), backgroundColor: ["#CBD5E1"] }] };
    }
    if (chartType === "group") {
      const labels = sortedSummary.map((r) => r.group);
      return { labels, datasets: [{ label: "Group Sales", data: sortedSummary.map((r) => r.sales), backgroundColor: ["#6366F1", "#10B981", "#F59E0B"] }] };
    }
    // fallback
    return { labels: sortedSummary.map((_, i) => `L${i + 1}`), datasets: [{ label: title, data: sortedSummary.map((r) => r.sales || 0), backgroundColor: ["#7C3AED"] }] };
  }, [sortedSummary, chartType, title]);

  // Render table by type
  const renderTable = () => {
    if (!sortedSummary.length) return <div className="text-center text-sm text-gray-500 py-6">No records found</div>;

    if (chartType === "dealer") {
      return (
        <table className="w-full text-sm">
          <thead className="bg-[#FEF3C7] sticky top-0 z-10">
            <tr className="text-xs text-gray-700">
              <th className="px-3 py-2 text-left">Company</th>
              <th className="px-3 py-2 text-left">Dealer</th>
              <th className="px-3 py-2 text-left">Salesman</th>
              <th className="px-3 py-2 text-right">Sales</th>
            </tr>
          </thead>
          <tbody>
            {sortedSummary.map((r, i) => (
              <tr key={i} className={i % 2 === 0 ? "bg-white" : "bg-gray-50"}>
                <td className="px-3 py-2">{r.company}</td>
                <td className="px-3 py-2">{r.dealer}</td>
                <td className="px-3 py-2">{r.salesman}</td>
                <td className="px-3 py-2 text-right">{fmt(r.sales)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      );
    }

    if (chartType === "product") {
      return (
        <table className="w-full text-sm">
          <thead className="bg-[#FEF3C7] sticky top-0 z-10 text-xs text-gray-700">
            <tr>
              <th className="px-3 py-2 text-left">Company</th>
              <th className="px-3 py-2 text-left">Product</th>
              <th className="px-3 py-2 text-right">Sales</th>
            </tr>
          </thead>
          <tbody>
            {sortedSummary.map((r, i) => (
              <tr key={i} className={i % 2 === 0 ? "bg-white" : "bg-gray-50"}>
                <td className="px-3 py-2">{r.company}</td>
                <td className="px-3 py-2">{r.product}</td>
                <td className="px-3 py-2 text-right">{fmt(r.sales)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      );
    }

    if (chartType === "area") {
      return (
        <table className="w-full text-sm">
          <thead className="bg-[#FEF3C7] sticky top-0 z-10 text-xs text-gray-700">
            <tr>
              <th className="px-3 py-2 text-left">Company</th>
              <th className="px-3 py-2 text-left">Area</th>
              <th className="px-3 py-2 text-left">Salesman</th>
              <th className="px-3 py-2 text-right">Sales</th>
            </tr>
          </thead>
          <tbody>
            {sortedSummary.map((r, i) => (
              <tr key={i} className={i % 2 === 0 ? "bg-white" : "bg-gray-50"}>
                <td className="px-3 py-2">{r.company}</td>
                <td className="px-3 py-2">{r.area}</td>
                <td className="px-3 py-2">{r.salesman}</td>
                <td className="px-3 py-2 text-right">{fmt(r.sales)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      );
    }

    if (chartType === "target") {
      return (
        <table className="w-full text-sm">
          <thead className="bg-[#FEF3C7] sticky top-0 z-10 text-xs text-gray-700">
            <tr>
              <th className="px-3 py-2 text-left">ASM</th>
              <th className="px-3 py-2 text-right">Target</th>
              <th className="px-3 py-2 text-right">Achievement</th>
              <th className="px-3 py-2 text-right">Ach %</th>
            </tr>
          </thead>
          <tbody>
            {sortedSummary.map((r, i) => {
              const pct = r.target ? Math.round((r.achievement / r.target) * 100) : null;
              const bg = pct === null ? "" : pct >= 60 ? "bg-green-50" : pct >= 30 ? "bg-yellow-50" : "bg-red-50";
              return (
                <tr key={i} className={`${i % 2 === 0 ? "bg-white" : "bg-gray-50"} ${bg}`}>
                  <td className="px-3 py-2">{r.asm}</td>
                  <td className="px-3 py-2 text-right">{r.target ? fmt(r.target) : "-"}</td>
                  <td className="px-3 py-2 text-right">{fmt(r.achievement)}</td>
                  <td className="px-3 py-2 text-right">{pct === null ? "-" : `${pct}%`}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      );
    }

    if (chartType === "group" || chartType === "partygroup") {
      return (
        <table className="w-full text-sm">
          <thead className="bg-[#FEF3C7] sticky top-0 z-10 text-xs text-gray-700">
            <tr>
              <th className="px-3 py-2 text-left">Party Group</th>
              <th className="px-3 py-2 text-left">Top Dealer</th>
              <th className="px-3 py-2 text-right">Sales</th>
            </tr>
          </thead>
          <tbody>
            {sortedSummary.map((r, i) => (
              <tr key={i} className={i % 2 === 0 ? "bg-white" : "bg-gray-50"}>
                <td className="px-3 py-2">{r.group}</td>
                <td className="px-3 py-2">{r.topDealer}</td>
                <td className="px-3 py-2 text-right">{fmt(r.sales)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      );
    }

    // fallback
    return (
      <table className="w-full text-sm">
        <thead className="bg-[#FEF3C7] sticky top-0 z-10 text-xs text-gray-700">
          <tr>
            <th className="px-3 py-2">Party</th>
            <th className="px-3 py-2">Product</th>
            <th className="px-3 py-2">Salesman</th>
            <th className="px-3 py-2">Area</th>
            <th className="px-3 py-2 text-right">Sales</th>
            <th className="px-3 py-2">Date</th>
          </tr>
        </thead>
        <tbody>
          {sortedSummary.map((r, i) => (
            <tr key={i} className={i % 2 === 0 ? "bg-white" : "bg-gray-50"}>
              <td className="px-3 py-2">{r.party}</td>
              <td className="px-3 py-2">{r.product}</td>
              <td className="px-3 py-2">{r.salesman}</td>
              <td className="px-3 py-2">{r.area}</td>
              <td className="px-3 py-2 text-right">{fmt(r.sales)}</td>
              <td className="px-3 py-2">{r.date}</td>
            </tr>
          ))}
        </tbody>
      </table>
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-12">
      <div className="absolute inset-0 bg-black/50" onClick={onClose}></div>

      <div className="relative w-[92%] max-w-7xl bg-white rounded-xl shadow-xl p-5 z-60">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-xl font-bold text-[#5B21B6]">{title}</h3>
          <button onClick={onClose} className="bg-red-500 text-white rounded-full w-9 h-9 flex items-center justify-center">✕</button>
        </div>

        <div className="flex gap-4">
          {/* main table + optional small chart */}
          <div id="report-table-container" className="flex-1 bg-white rounded-lg border p-4 max-h-[62vh] overflow-auto">
            <div className="flex justify-between items-center mb-3">
              <div className="flex items-center gap-3">
                <label className="text-sm text-gray-600">Month:</label>
                <select className="border rounded px-2 py-1 text-sm" value={selectedMonth} onChange={(e) => setSelectedMonth(e.target.value)}>
                  {monthList.map((m, i) => (<option key={i}>{m}</option>))}
                </select>

                <label className="text-sm text-gray-600 ml-3">Sort by:</label>
                <select className="border rounded px-2 py-1 text-sm" value={sortKey} onChange={(e) => setSortKey(e.target.value)}>
                  <option value="sales">Sales</option>
                  <option value="company">Company</option>
                  <option value="dealer">Dealer</option>
                  <option value="product">Product</option>
                  <option value="asm">ASM</option>
                </select>

                <button className="ml-2 px-2 py-1 border rounded text-sm" onClick={() => setSortDir((d) => (d === "asc" ? "desc" : "asc"))}>
                  {sortDir === "asc" ? "Asc" : "Desc"}
                </button>
              </div>

              <div className="flex items-center gap-2">
                <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search..." className="border rounded px-2 py-1 text-sm" />
                <select value={selectedChartKind} onChange={(e) => setSelectedChartKind(e.target.value)} className="border rounded px-2 py-1 text-sm">
                  <option value="pie">Pie</option>
                  <option value="bar">Bar</option>
                  <option value="line">Line</option>
                  <option value="doughnut">Doughnut</option>
                </select>
              </div>
            </div>

            {/* small chart */}
            <div className="mb-3 h-[220px]">
              {selectedChartKind === "bar" && <Bar data={modalChartData} options={{ maintainAspectRatio: false }} />}
              {selectedChartKind === "line" && <Line data={modalChartData} options={{ maintainAspectRatio: false }} />}
              {selectedChartKind === "pie" && <Pie data={modalChartData} options={{ maintainAspectRatio: false }} />}
              {selectedChartKind === "doughnut" && <Doughnut data={modalChartData} options={{ maintainAspectRatio: false }} />}
            </div>

            {/* table */}
            {renderTable()}
          </div>

          {/* sidebar */}
          <aside className="w-[300px] bg-[#F5F3FF] border rounded-lg p-4">
            <h4 className="font-semibold text-[#5B21B6] mb-2">⚙️ Options</h4>

            <div className="mb-3">
              <button onClick={exportPDF} className="w-full bg-[#059669] text-white py-2 rounded mb-2">📄 Export PDF</button>
              <button onClick={exportExcel} className="w-full bg-[#4F46E5] text-white py-2 rounded mb-2">📊 Export Excel</button>
              <button onClick={handlePrint} className="w-full bg-[#F97316] text-white py-2 rounded">🖨️ Print</button>
            </div>

            <div className="text-sm text-gray-600">
              <div><strong>Rows:</strong> {sortedSummary.length}</div>
              <div className="mt-2"><strong>Filters:</strong></div>
              <div className="text-xs text-gray-500 mt-1">Month: {selectedMonth}</div>
              <div className="text-xs text-gray-500">Search: {search ? search : "—"}</div>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}
