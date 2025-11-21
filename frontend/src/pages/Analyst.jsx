// frontend/src/pages/Analyst.jsx - HANDLES ANY DATA FORMAT
import React, { useEffect, useMemo, useState, useRef } from "react";
import { Line, Doughnut } from "react-chartjs-2";
import {
  Chart as ChartJS, ArcElement, Tooltip, Legend, CategoryScale, LinearScale,
  BarElement, PointElement, LineElement, Title,
} from "chart.js";
import {
  FileSpreadsheet, RefreshCw, Download, Eye, Search, Filter,
  ChevronLeft, ChevronRight, Table2,
} from "lucide-react";
import config from "../config.js";

ChartJS.register(ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement, PointElement, LineElement, Title);

export default function Analyst() {
  const [rawData, setRawData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [activeSection, setActiveSection] = useState("alldata");
  const [companyFilter, setCompanyFilter] = useState("All");
  const [searchQ, setSearchQ] = useState("");
  const [autoRefresh, setAutoRefresh] = useState(false);
  const [lastSync, setLastSync] = useState(null);

  useEffect(() => {
    let cancelled = false;
    const fetchLatest = async () => {
      setLoading(true);
      try {
        console.log("🔍 Fetching:", `${config.ANALYST_BACKEND_URL}/api/analyst/latest`);
        const resp = await fetch(`${config.ANALYST_BACKEND_URL}/api/analyst/latest`, {
          headers: { "Content-Type": "application/json" },
          method: "GET",
        });
        const json = await resp.json();
        console.log("📥 Response:", json);
        
        const rows = json?.rows || json?.data?.rows || json?.data || (Array.isArray(json) ? json : []);

        if (Array.isArray(rows) && rows.length > 0) {
          console.log("✅ Data loaded:", rows.length, "rows");
          console.log("📊 Sample row:", rows[0]);
          if (!cancelled) {
            setRawData(rows);
            localStorage.setItem("analyst_latest_rows", JSON.stringify(rows));
            setLastSync(new Date().toISOString());
            setError("");
          }
        } else {
          const saved = localStorage.getItem("analyst_latest_rows");
          if (saved && !cancelled) {
            console.log("💾 Using cache");
            setRawData(JSON.parse(saved));
            setLastSync("Cache");
          } else if (!cancelled) {
            console.log("❌ No data");
            setRawData([]);
            setError("No data - Upload Excel from Reports page");
          }
        }
      } catch (err) {
        console.error("❌ Error:", err);
        const saved = localStorage.getItem("analyst_latest_rows");
        if (saved && !cancelled) {
          setRawData(JSON.parse(saved));
          setLastSync("Cache");
          setError(`Error: ${err.message} - Using cache`);
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
    return rawData.filter(r => r && typeof r === "object");
  }, [rawData]);

  const allColumns = useMemo(() => {
    if (!cleanData.length) return [];
    const cols = new Set();
    cleanData.forEach(r => Object.keys(r).forEach(k => cols.add(k)));
    const arr = Array.from(cols);
    console.log(`📊 ${arr.length} columns found:`, arr.slice(0, 20));
    return arr;
  }, [cleanData]);

  const filteredData = useMemo(() => {
    const q = (searchQ || "").toLowerCase();
    return cleanData.filter(r => {
      if (!q) return true;
      return Object.values(r).some(v => String(v).toLowerCase().includes(q));
    });
  }, [cleanData, searchQ]);

  const exportCSV = (rows, filename = "export") => {
    if (!rows?.length) return;
    const keys = Array.from(new Set(rows.flatMap(r => Object.keys(r || {}))));
    const csvRows = [keys.join(",")];
    rows.forEach(r => {
      const line = keys.map(k => {
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

  if (loading) {
    return (
      <div className="h-screen flex flex-col items-center justify-center text-[#64FFDA] bg-[#071429]">
        <RefreshCw className="animate-spin mb-3" size={48} />
        <div>Loading data...</div>
      </div>
    );
  }

  return (
    <div className="p-6 min-h-screen bg-gradient-to-br from-[#071226] via-[#0A192F] to-[#071226] text-gray-100">
      <div className="max-w-[95vw] mx-auto bg-[#12223b] rounded-2xl p-6 border border-[#223355] shadow-xl">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-xl font-bold text-[#64FFDA] flex items-center gap-2">
            <FileSpreadsheet /> ANALYST
          </h1>
          <div className="flex items-center gap-3">
            <div className="text-sm text-gray-300">
              {lastSync ? (typeof lastSync === 'string' ? lastSync : new Date(lastSync).toLocaleTimeString()) : "—"}
            </div>
            <div className="px-3 py-1 rounded bg-green-900/30 border border-green-600/40 text-green-300 text-sm font-semibold">
              📊 {cleanData.length} records
            </div>
            <div className="px-3 py-1 rounded bg-blue-900/30 border border-blue-600/40 text-blue-300 text-sm font-semibold">
              📋 {allColumns.length} columns
            </div>
            <button
              onClick={() => setAutoRefresh(s => !s)}
              className={`px-3 py-2 rounded text-sm border ${autoRefresh ? "bg-[#64FFDA] text-[#071226]" : "bg-transparent text-[#64FFDA] border-[#64FFDA]/30"}`}
            >
              <RefreshCw size={16} /> {autoRefresh ? "Auto" : "Manual"}
            </button>
            <button
              onClick={() => {
                if (confirm("Clear cache and reload?")) {
                  localStorage.removeItem("analyst_latest_rows");
                  window.location.reload();
                }
              }}
              className="px-3 py-2 rounded bg-red-900/30 border border-red-600/40 text-red-300"
            >
              Clear
            </button>
          </div>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-yellow-900/20 border border-yellow-600/40 rounded text-yellow-200 text-sm">
            ⚠️ {error}
          </div>
        )}

        <div className="flex flex-wrap gap-2 mb-6">
          {[
            { key: "alldata", label: "📊 All Data", icon: Table2 },
            { key: "dashboard", label: "Dashboard" },
            { key: "analysis", label: "Analysis" },
          ].map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveSection(tab.key)}
              className={`px-4 py-2 rounded text-sm font-semibold flex items-center gap-1 ${
                activeSection === tab.key
                  ? "bg-[#64FFDA] text-[#081827]"
                  : "bg-[#0C1B31] text-gray-300 border border-[#223355]"
              }`}
            >
              {tab.icon && <tab.icon size={16} />}
              {tab.label}
            </button>
          ))}
          <div className="ml-auto flex items-center gap-2">
            <div className="relative">
              <Search className="absolute left-2 top-2.5 text-gray-400" size={16} />
              <input
                placeholder="Search in all columns..."
                value={searchQ}
                onChange={(e) => setSearchQ(e.target.value)}
                className="bg-[#0C1B31] pl-9 pr-3 py-2 rounded border border-[#223355] text-sm w-64"
              />
            </div>
            <button
              onClick={() => exportCSV(filteredData, "AnalystData")}
              className="px-3 py-2 rounded bg-[#64FFDA]/10 border border-[#64FFDA]/40 text-[#64FFDA] text-sm flex items-center gap-1"
            >
              <Download size={14} /> Export ({filteredData.length})
            </button>
          </div>
        </div>

        <div>
          {activeSection === "alldata" && (
            <AllDataView data={filteredData} columns={allColumns} exportCSV={exportCSV} />
          )}
          {activeSection === "dashboard" && (
            <DashboardView data={filteredData} />
          )}
          {activeSection === "analysis" && (
            <AnalysisView data={filteredData} columns={allColumns} />
          )}
        </div>
      </div>
    </div>
  );
}

function AllDataView({ data, columns, exportCSV }) {
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(50);
  const [selectedCols, setSelectedCols] = useState(new Set(columns.slice(0, 10)));
  const [showColSelect, setShowColSelect] = useState(false);

  const pages = Math.ceil(data.length / perPage);
  const pageData = data.slice((page - 1) * perPage, page * perPage);
  const displayCols = columns.filter(c => selectedCols.has(c));

  useEffect(() => {
    if (columns.length > 0 && selectedCols.size === 0) {
      setSelectedCols(new Set(columns.slice(0, 15)));
    }
  }, [columns]);

  const toggleColumn = (col) => {
    const newSet = new Set(selectedCols);
    if (newSet.has(col)) {
      newSet.delete(col);
    } else {
      newSet.add(col);
    }
    setSelectedCols(newSet);
  };

  const selectAll = () => setSelectedCols(new Set(columns));
  const selectNone = () => setSelectedCols(new Set());

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-semibold text-[#64FFDA]">
          📊 Data Table - {data.length} records
        </h3>
        <div className="flex gap-2">
          <button
            onClick={() => setShowColSelect(!showColSelect)}
            className="px-3 py-2 rounded bg-[#64FFDA]/10 border border-[#64FFDA]/40 text-[#64FFDA] text-sm flex items-center gap-1"
          >
            <Filter size={14} /> Columns ({selectedCols.size}/{columns.length})
          </button>
          <select
            value={perPage}
            onChange={(e) => { setPerPage(Number(e.target.value)); setPage(1); }}
            className="bg-[#0C1B31] px-3 py-2 rounded border border-[#223355] text-sm"
          >
            <option value={25}>25 per page</option>
            <option value={50}>50 per page</option>
            <option value={100}>100 per page</option>
            <option value={500}>500 per page</option>
          </select>
        </div>
      </div>

      {showColSelect && (
        <div className="mb-4 p-4 bg-[#0A1A33] rounded-lg border border-[#223355]">
          <div className="flex justify-between items-center mb-3">
            <div className="text-sm font-semibold text-[#64FFDA]">Select Columns to Display</div>
            <div className="flex gap-2">
              <button onClick={selectAll} className="px-2 py-1 text-xs rounded bg-green-900/30 border border-green-600/40 text-green-300">
                Select All
              </button>
              <button onClick={selectNone} className="px-2 py-1 text-xs rounded bg-red-900/30 border border-red-600/40 text-red-300">
                Clear All
              </button>
            </div>
          </div>
          <div className="grid grid-cols-4 gap-2 max-h-64 overflow-auto">
            {columns.map((col) => (
              <label key={col} className="flex items-center gap-2 text-sm cursor-pointer hover:bg-[#0F263F] p-2 rounded">
                <input
                  type="checkbox"
                  checked={selectedCols.has(col)}
                  onChange={() => toggleColumn(col)}
                  className="form-checkbox"
                />
                <span className="truncate" title={col}>{col}</span>
              </label>
            ))}
          </div>
        </div>
      )}

      <div className="bg-[#0D1B34] rounded-lg border border-[#1E2D50] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-[#0A1A33] text-[#64FFDA] sticky top-0">
              <tr>
                <th className="py-3 px-3 text-left border-b border-[#223355] font-semibold">#</th>
                {displayCols.map((col) => (
                  <th key={col} className="py-3 px-3 text-left border-b border-[#223355] whitespace-nowrap font-semibold">
                    {col}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="text-gray-200">
              {pageData.map((row, i) => (
                <tr key={i} className="border-b border-[#1E2D50] hover:bg-[#0F263F]">
                  <td className="py-2 px-3 text-gray-400">{(page - 1) * perPage + i + 1}</td>
                  {displayCols.map((col) => (
                    <td key={col} className="py-2 px-3 whitespace-nowrap max-w-xs overflow-hidden text-ellipsis" title={String(row[col] || "")}>
                      {row[col] !== undefined && row[col] !== null ? String(row[col]) : "—"}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="flex justify-between items-center p-4 bg-[#0A1A33] border-t border-[#223355]">
          <div className="text-sm text-gray-300">
            Showing {Math.min((page - 1) * perPage + 1, data.length)} to {Math.min(page * perPage, data.length)} of {data.length}
          </div>
          <div className="flex items-center gap-2">
            <button
              disabled={page <= 1}
              onClick={() => setPage(p => Math.max(1, p - 1))}
              className="px-3 py-1 rounded bg-[#0C1B31] border border-[#223355] disabled:opacity-40 flex items-center gap-1"
            >
              <ChevronLeft size={16} /> Prev
            </button>
            <div className="px-3 py-1 bg-[#0A1A33] rounded border border-[#223355]">
              Page {page} / {pages}
            </div>
            <button
              disabled={page >= pages}
              onClick={() => setPage(p => Math.min(pages, p + 1))}
              className="px-3 py-1 rounded bg-[#0C1B31] border border-[#223355] disabled:opacity-40 flex items-center gap-1"
            >
              Next <ChevronRight size={16} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function DashboardView({ data }) {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-4 gap-4">
        <div className="bg-[#0E2136] p-4 rounded-lg border border-[#1E2D50]">
          <div className="text-sm text-gray-300">Total Records</div>
          <div className="text-2xl font-bold text-[#64FFDA] mt-2">{data.length}</div>
        </div>
        <div className="bg-[#0E2136] p-4 rounded-lg border border-[#1E2D50]">
          <div className="text-sm text-gray-300">Data Status</div>
          <div className="text-lg font-bold text-green-400 mt-2">✓ Loaded</div>
        </div>
        <div className="bg-[#0E2136] p-4 rounded-lg border border-[#1E2D50]">
          <div className="text-sm text-gray-300">Last Update</div>
          <div className="text-lg font-bold text-blue-400 mt-2">{new Date().toLocaleTimeString()}</div>
        </div>
        <div className="bg-[#0E2136] p-4 rounded-lg border border-[#1E2D50]">
          <div className="text-sm text-gray-300">Data Source</div>
          <div className="text-lg font-bold text-purple-400 mt-2">Backend API</div>
        </div>
      </div>

      <div className="bg-[#0D1B34] p-4 rounded-lg border border-[#1E2D50]">
        <h3 className="text-[#64FFDA] mb-3">Recent Entries (Latest 10)</h3>
        <div className="space-y-2">
          {data.slice(0, 10).map((row, i) => (
            <div key={i} className="p-3 bg-[#0A1A33] rounded border border-[#1E2D50] text-sm">
              <div className="font-mono text-gray-300">
                {Object.entries(row).slice(0, 5).map(([k, v]) => (
                  <div key={k} className="flex gap-2">
                    <span className="text-[#64FFDA] font-semibold">{k}:</span>
                    <span className="text-gray-200 truncate">{String(v)}</span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function AnalysisView({ data, columns }) {
  const stats = useMemo(() => {
    const colTypes = {};
    columns.forEach(col => {
      const values = data.map(r => r[col]).filter(v => v !== null && v !== undefined);
      const numericValues = values.map(v => parseFloat(v)).filter(n => !isNaN(n));
      
      colTypes[col] = {
        total: values.length,
        unique: new Set(values).size,
        hasNumbers: numericValues.length > 0,
        sum: numericValues.reduce((a, b) => a + b, 0),
        avg: numericValues.length > 0 ? numericValues.reduce((a, b) => a + b, 0) / numericValues.length : 0,
      };
    });
    return colTypes;
  }, [data, columns]);

  return (
    <div>
      <h3 className="text-lg font-semibold text-[#64FFDA] mb-4">Column Statistics</h3>
      <div className="grid grid-cols-3 gap-4">
        {Object.entries(stats).slice(0, 50).map(([col, stat]) => (
          <div key={col} className="bg-[#0D1B34] p-4 rounded-lg border border-[#1E2D50]">
            <div className="text-sm font-semibold text-[#64FFDA] mb-2 truncate" title={col}>{col}</div>
            <div className="space-y-1 text-xs text-gray-300">
              <div>Values: {stat.total}</div>
              <div>Unique: {stat.unique}</div>
              {stat.hasNumbers && (
                <>
                  <div>Sum: {stat.sum.toLocaleString()}</div>
                  <div>Avg: {stat.avg.toFixed(2)}</div>
                </>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
