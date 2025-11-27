import React, { useEffect, useState, createContext, useContext } from "react";
import axios from "axios";
import * as XLSX from "xlsx";
import jsPDF from "jspdf";
import "jspdf-autotable";
import config from "../config.js";

export const DataContext = createContext();
export function useReportData() { return useContext(DataContext); }

export default function Reports() {
  // --- CONFIG: visible columns (user insisted these exact columns only) ---
  const EXCEL_COLUMNS = [
    "Sr.No","Date","Vch No.","Party Name","City/Area",
    "Party Group","State","ItemName","Item Group","Item Category",
    "Qty","Alt Qty","Rate","UOM","Salesman","Vch Type","Amount"
  ];

  // --- state ---
  const [data, setData] = useState([]); // full loaded data (objects)
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [page, setPage] = useState(1);
  const rowsPerPage = 20; // fixed as requested
  const [filterText, setFilterText] = useState("");
  const [groupBy, setGroupBy] = useState(""); // grouping column
  const [pivotRow, setPivotRow] = useState("");
  const [pivotCol, setPivotCol] = useState("");
  const [modalRow, setModalRow] = useState(null); // for XML object viewer
  const [detectedColumns, setDetectedColumns] = useState(EXCEL_COLUMNS.slice()); // order used for display

  // --- utility: normalize header/tag to map to EXCEL_COLUMNS ---
  const normalize = (s="") => String(s).toLowerCase().replace(/[^a-z0-9]/g,"");

  const colMap = {}; // build normalized map for allowed columns
  EXCEL_COLUMNS.forEach(c => { colMap[normalize(c)] = c; });

  // --- load from localStorage on mount ---
  useEffect(() => {
    const saved = localStorage.getItem("savedReportData");
    const savedCols = localStorage.getItem("reportVisibleCols");
    if (saved) {
      try { const parsed = JSON.parse(saved); setData(parsed); }
      catch {}
    }
    if (savedCols) {
      try { const parsed = JSON.parse(savedCols); setDetectedColumns(parsed); }
      catch {}
    }
  }, []);

  // --- Tally backend loader (keeps only allowed columns) ---
  useEffect(() => { loadLatestData(); }, []);

  async function loadLatestData() {
    setLoading(true);
    setMessage("⏳ Tally से डेटा लोड हो रहा है...");
    try {
      const backend = config.BACKEND_URL || "https://replica-backend.shoabahmad68.workers.dev";
      const res = await axios.get(`${backend}/api/imports/latest`);
      const d = res.data || {};
      const combined = [
        ...(d.sales || []),
        ...(d.purchase || []),
        ...(d.receipt || []),
        ...(d.payment || []),
        ...(d.journal || []),
        ...(d.debit || []),
        ...(d.credit || []),
      ];

      if (!combined.length) { setMessage("⚠️ Tally से डेटा नहीं मिला"); setLoading(false); return; }

      const mapped = combined.map((row, i) => mapToVisibleColumns(row, i+1));
      setData(mapped);
      localStorage.setItem("savedReportData", JSON.stringify(mapped));
      localStorage.setItem("reportVisibleCols", JSON.stringify(detectedColumns));
      setMessage(`✅ ${mapped.length} rows loaded from Tally`);
    } catch (err) {
      setMessage("❌ " + err.message);
    } finally { setLoading(false); }
  }

  // --- map any incoming object (row) to only EXCEL_COLUMNS with Sr.No ---
  function mapToVisibleColumns(row, sr=0) {
    const out = { "Sr.No": sr || (row["Sr.No"] || "") };
    // Prefer if incoming has keys matching visible columns (by normalized form)
    const incomingKeys = Object.keys(row || {});
    const incomingNormMap = {};
    incomingKeys.forEach(k => { incomingNormMap[normalize(k)] = k; });

    EXCEL_COLUMNS.forEach(col => {
      if (col === "Sr.No") return;
      // match by normalized keys
      const n = normalize(col);
      if (incomingNormMap[n]) out[col] = row[incomingNormMap[n]];
      else {
        // try direct exact
        out[col] = row[col] !== undefined ? row[col] : "";
      }
    });
    return out;
  }

  // --- file input handler (shared) ---
  const handleFileChange = (e) => {
    if (!e?.target?.files?.[0]) return;
    setFile(e.target.files[0]);
  };

  // --- EXCEL upload (map headers to allowed columns) ---
  const handleUploadExcel = async () => {
    if (!file) return alert("⚠️ Excel file चुनें!");
    try {
      setUploading(true); setMessage("⏳ Excel पढ़ा जा रहा है...");
      const buf = await file.arrayBuffer();
      const wb = XLSX.read(buf);
      const sheet = wb.Sheets[wb.SheetNames[0]];
      const json = XLSX.utils.sheet_to_json(sheet, {defval: ""});
      if (!json.length) { setMessage("⚠️ Excel खाली है"); setUploading(false); return; }

      // For each row, map keys to allowed columns via normalization
      const mapped = json.map((r,i) => {
        // Build norm map of row
        const normMap = {};
        Object.keys(r).forEach(k => normMap[normalize(k)] = k);
        const out = { "Sr.No": i+1 };
        EXCEL_COLUMNS.forEach(col => {
          if (col === "Sr.No") return;
          const n = normalize(col);
          if (normMap[n]) out[col] = r[normMap[n]];
          else out[col] = r[col] !== undefined ? r[col] : "";
        });
        return out;
      });

      setData(mapped);
      localStorage.setItem("savedReportData", JSON.stringify(mapped));
      localStorage.setItem("reportVisibleCols", JSON.stringify(EXCEL_COLUMNS));
      setDetectedColumns(EXCEL_COLUMNS.slice());
      setMessage(`✅ Excel loaded: ${mapped.length} rows`);
      setFile(null);
    } catch (err) {
      setMessage("❌ Excel Error: " + err.message);
    } finally { setUploading(false); }
  };

  // --- XML upload: intelligent, but map tags to allowed columns only ---
  const handleUploadXML = async () => {
    if (!file) return alert("⚠️ XML file चुनें!");
    try {
      setUploading(true); setMessage("⏳ XML पढ़ा जा रहा है...");
      const xmlText = await file.text();
      const parser = new DOMParser();
      const doc = parser.parseFromString(xmlText, "text/xml");

      // Tally often has <TALLYMESSAGE><VOUCHER>... etc. We'll find candidate 'row' nodes:
      // Strategy: take nodes that have element children and whose immediate children are simple text nodes or tags (like item fields).
      const allElements = Array.from(doc.getElementsByTagName("*"));
      // Candidate nodes: those whose children are element nodes and not the whole document
      const candidates = allElements.filter(n => n.children && n.children.length > 0);
      if (!candidates.length) { setMessage("⚠️ XML में usable nodes नहीं मिले"); setUploading(false); return; }

      // Prefer nodes at deeper levels that look like records: pick those with a moderate number of children (>=2 && <= 200)
      const recordNodes = candidates.filter(n => n.children.length >= 2 && n.children.length <= 200);
      const rowsSource = recordNodes.length ? recordNodes : candidates;

      // Build list of rows by taking only the deepest repeated sibling structures:
      // Group by tagName path length to choose similar-level nodes
      const byDepth = {};
      rowsSource.forEach(n => {
        const depth = getNodeDepth(n);
        byDepth[depth] = byDepth[depth] || [];
        byDepth[depth].push(n);
      });
      // choose depth with maximum nodes
      const bestDepth = Object.keys(byDepth).reduce((a,b) => (byDepth[b].length > (byDepth[a]||[]).length? b:a), Object.keys(byDepth)[0]);
      const chosen = byDepth[bestDepth] || rowsSource;

      // Map chosen nodes to objects, but only keep allowed EXCEL_COLUMNS by matching tag names to column names
      const rows = chosen.map((node, idx) => {
        const obj = { "Sr.No": idx + 1 };
        // Build a map of node children normalized names to their textContent
        const childMap = {};
        Array.from(node.children).forEach(ch => { childMap[normalize(ch.tagName)] = ch.textContent?.trim() ?? ""; });
        EXCEL_COLUMNS.forEach(col => {
          if (col === "Sr.No") return;
          const n = normalize(col);
          obj[col] = childMap[n] !== undefined ? childMap[n] : "";
        });
        return obj;
      });

      // If rows empty or all blank in visible columns, attempt alternate approach: search for VOUCHER or ROW tags specifically
      const anyData = rows.some(r => EXCEL_COLUMNS.some(c => c !== "Sr.No" && String(r[c]).trim() !== ""));
      let finalRows = rows;
      if (!anyData) {
        // try getElementsByTagName('ROW') or 'VOUCHER' etc.
        const altCandidates = ["ROW","VOUCHER","TALLYMESSAGE","ENVELOPE"];
        let found = null;
        for (const tag of altCandidates) {
          const nodes = Array.from(doc.getElementsByTagName(tag)).filter(n => n.children && n.children.length>0);
          if (nodes.length) { found = nodes; break; }
        }
        if (found) {
          finalRows = found.map((node, idx) => {
            const obj = { "Sr.No": idx+1 };
            const childMap = {};
            Array.from(node.children).forEach(ch => childMap[normalize(ch.tagName)] = ch.textContent?.trim() ?? "");
            EXCEL_COLUMNS.forEach(col => {
              if (col === "Sr.No") return;
              const n = normalize(col);
              obj[col] = childMap[n] !== undefined ? childMap[n] : "";
            });
            return obj;
          });
        }
      }

      // Save finalRows (filter out rows that are all empty)
      const cleaned = finalRows.filter(r => EXCEL_COLUMNS.some(c => c==="Sr.No" ? false : String(r[c]||"").trim() !== ""));
      if (!cleaned.length) { setMessage("⚠️ XML में visible columns के अनुरूप data नहीं मिला"); setUploading(false); return; }

      setData(cleaned);
      setDetectedColumns(EXCEL_COLUMNS.slice());
      localStorage.setItem("savedReportData", JSON.stringify(cleaned));
      localStorage.setItem("reportVisibleCols", JSON.stringify(EXCEL_COLUMNS));
      setMessage(`✅ XML loaded: ${cleaned.length} rows`);
      setFile(null);
    } catch (err) {
      setMessage("❌ XML Error: " + err.message);
    } finally { setUploading(false); }
  };

  // helper: node depth
  function getNodeDepth(node) {
    let d = 0; while (node.parentElement) { d++; node = node.parentElement; }
    return d;
  }

  // --- Filtering & pagination (applied to visible columns only) ---
  const filtered = data.filter(row => {
    if (!filterText) return true;
    const q = filterText.toLowerCase();
    return detectedColumns.some(col => String(row[col]||"").toLowerCase().includes(q));
  });

  const totalPages = Math.max(1, Math.ceil(filtered.length / rowsPerPage));
  const pageRows = filtered.slice((page-1)*rowsPerPage, page*rowsPerPage);

  // --- modal viewer ---
  function openViewer(row) { setModalRow(row); }
  function closeViewer() { setModalRow(null); }

  // --- grouping summary (counts + amount sum) ---
  function computeGrouping() {
    if (!groupBy) return null;
    const map = {};
    filtered.forEach(r => {
      const key = r[groupBy] || "—";
      map[key] = map[key] || { count: 0, amount: 0 };
      map[key].count += 1;
      map[key].amount += Number(parseFloat(r["Amount"]) || 0);
    });
    // convert to array sorted by amount desc
    return Object.entries(map).map(([k,v]) => ({ key:k, ...v })).sort((a,b)=> b.amount - a.amount);
  }

  // --- pivot: sum of Amount for rowField x colField ---
  function computePivot() {
    if (!pivotRow || !pivotCol) return null;
    const rowKeys = new Set(), colKeys = new Set();
    const matrix = {}; // matrix[rk][ck] = sum
    filtered.forEach(r => {
      const rk = r[pivotRow] || "—";
      const ck = r[pivotCol] || "—";
      rowKeys.add(rk); colKeys.add(ck);
      matrix[rk] = matrix[rk] || {};
      matrix[rk][ck] = (matrix[rk][ck] || 0) + Number(parseFloat(r["Amount"]) || 0);
    });
    return { rowKeys: Array.from(rowKeys), colKeys: Array.from(colKeys), matrix };
  }

  // --- export excel/pdf (exports current filtered set, limited to visible cols) ---
  const handleExportExcel = () => {
    if (!filtered.length) return alert("कोई डेटा नहीं है");
    const ws = XLSX.utils.json_to_sheet(filtered.map(r => {
      const out = {};
      detectedColumns.forEach(c => out[c] = r[c] ?? "");
      return out;
    }));
    const wb = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb, ws, "Report");
    XLSX.writeFile(wb, `Report_${Date.now()}.xlsx`);
    setMessage("✅ Excel export हो गया!");
  };

  const handleExportPDF = () => {
    if (!filtered.length) return alert("कोई डेटा नहीं है");
    const doc = new jsPDF("l", "mm", "a3");
    doc.text("Report", 14, 15);
    doc.autoTable({
      head: [detectedColumns],
      body: filtered.slice(0,1000).map(r => detectedColumns.map(c => r[c] ?? "")),
      startY: 20,
      styles: { fontSize: 6 }
    });
    doc.save(`Report_${Date.now()}.pdf`);
    setMessage("✅ PDF export हो गया!");
  };

  // --- clear data ---
  function handleClear() {
    if (!confirm("सारा डेटा हटाना है?")) return;
    setData([]); localStorage.removeItem("savedReportData"); localStorage.removeItem("reportVisibleCols");
    setMessage("🧹 Cleared"); setPage(1);
  }

  // --- render ---
  return (
    <DataContext.Provider value={{ data, setData }}>
      <div className="min-h-screen bg-[#0a1628] text-white p-6">
        <div className="max-w-[98%] mx-auto bg-[#12243d] rounded-2xl p-6 border border-[#1e3553]">

          {/* header */}
          <div className="flex justify-between items-center mb-4">
            <h1 className="text-2xl font-bold text-[#00f5ff]">📊 MASTER REPORT</h1>
            <div className="text-right">
              <div className="text-sm text-gray-400">Showing</div>
              <div className="text-lg font-semibold text-[#00f5ff]">{filtered.length} rows</div>
            </div>
          </div>

          {/* actions: uploads + controls */}
          <div className="bg-[#0f1e33] p-3 rounded-lg border border-[#1e3553] mb-4 flex flex-wrap gap-3 items-center">
            {/* XML */}
            <div className="flex items-center gap-2">
              <input type="file" accept=".xml" onChange={handleFileChange}
                className="text-sm file:bg-[#00f5ff] file:text-black file:font-semibold p-1 rounded bg-[#0a1628]" />
              <button onClick={handleUploadXML} disabled={uploading} className="px-3 py-1 bg-purple-600 rounded">📤 Upload XML</button>
            </div>

            {/* Excel */}
            <div className="flex items-center gap-2">
              <input type="file" accept=".xls,.xlsx,.csv" onChange={handleFileChange}
                className="text-sm file:bg-[#00f5ff] file:text-black file:font-semibold p-1 rounded bg-[#0a1628]" />
              <button onClick={handleUploadExcel} disabled={uploading} className="px-3 py-1 bg-blue-600 rounded">📤 Upload Excel</button>
            </div>

            <button onClick={loadLatestData} className="px-3 py-1 bg-[#00f5ff] text-black rounded">🔄 Reload Tally</button>
            <button onClick={handleExportExcel} className="px-3 py-1 bg-green-600 rounded">📊 Export Excel</button>
            <button onClick={handleExportPDF} className="px-3 py-1 bg-orange-500 rounded">📄 Export PDF</button>
            <button onClick={handleClear} className="px-3 py-1 bg-red-600 rounded">🧹 Clear</button>

            {/* search */}
            <div className="ml-auto flex items-center gap-2">
              <input placeholder="Search across visible columns..." value={filterText}
                onChange={(e)=>{ setFilterText(e.target.value); setPage(1); }}
                className="px-3 py-1 rounded bg-[#0a1628] border border-[#1e3553]" />
            </div>
          </div>

          {/* grouping & pivot controls */}
          <div className="bg-[#0f1e33] p-3 rounded-lg border border-[#1e3553] mb-4 flex gap-4 items-center flex-wrap">
            <div>
              <label className="text-sm text-gray-300">Group by:</label>
              <select value={groupBy} onChange={(e)=>setGroupBy(e.target.value)}
                className="ml-2 bg-[#0a1628] border border-[#1e3553] px-2 py-1 rounded">
                <option value="">— none —</option>
                {detectedColumns.filter(c=>c!=="Sr.No").map(c=> <option key={c} value={c}>{c}</option>)}
              </select>
            </div>

            <div>
              <label className="text-sm text-gray-300">Pivot — Row:</label>
              <select value={pivotRow} onChange={(e)=>setPivotRow(e.target.value)}
                className="ml-2 bg-[#0a1628] border border-[#1e3553] px-2 py-1 rounded">
                <option value="">—</option>
                {detectedColumns.filter(c=>c!=="Sr.No").map(c=> <option key={c} value={c}>{c}</option>)}
              </select>
              <span className="mx-2 text-gray-400">Col:</span>
              <select value={pivotCol} onChange={(e)=>setPivotCol(e.target.value)}
                className="bg-[#0a1628] border border-[#1e3553] px-2 py-1 rounded">
                <option value="">—</option>
                {detectedColumns.filter(c=>c!=="Sr.No").map(c=> <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
          </div>

          {/* grouping view */}
          {groupBy && (
            <div className="bg-[#0f1e33] p-3 rounded-lg border border-[#1e3553] mb-4 overflow-auto">
              <h3 className="text-sm text-[#00f5ff] mb-2">Grouping by: {groupBy}</h3>
              <table className="min-w-full text-sm border-collapse">
                <thead className="bg-[#132a4a] text-[#00f5ff]">
                  <tr>
                    <th className="px-2 py-2 border border-[#1e3553]">Group</th>
                    <th className="px-2 py-2 border border-[#1e3553]">Count</th>
                    <th className="px-2 py-2 border border-[#1e3553]">Amount Sum</th>
                  </tr>
                </thead>
                <tbody>
                  {computeGrouping().map((g,i)=>(
                    <tr key={i} className={i%2? "bg-[#132a4a]":"bg-[#0f1e33]"}>
                      <td className="px-2 py-2 border border-[#1e3553]">{g.key}</td>
                      <td className="px-2 py-2 border border-[#1e3553]">{g.count}</td>
                      <td className="px-2 py-2 border border-[#1e3553]">₹{Number(g.amount).toLocaleString("en-IN")}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* pivot view */}
          {pivotRow && pivotCol && (
            <div className="bg-[#0f1e33] p-3 rounded-lg border border-[#1e3553] mb-4 overflow-auto">
              <h3 className="text-sm text-[#00f5ff] mb-2">Pivot: {pivotRow} × {pivotCol} (Amount sum)</h3>
              <PivotTableView pivot={computePivot()} rowField={pivotRow} colField={pivotCol} />
            </div>
          )}

          {/* table - header sticky + first column freeze */}
          <div className="bg-[#0f1e33] rounded-lg border border-[#1e3553] overflow-auto">
            <div style={{minWidth: "1000px"}}>
              <table className="min-w-full text-sm border-collapse">
                <thead className="bg-[#132a4a] text-[#00f5ff] sticky top-0 z-10">
                  <tr>
                    {detectedColumns.map((col, idx) => (
                      <th key={col}
                          className="px-3 py-2 border border-[#1e3553] text-left whitespace-nowrap"
                          style={idx===0? { position: "sticky", left: 0, zIndex: 20, background: "#132a4a" } : {}}
                      >
                        {col}
                      </th>
                    ))}
                    <th className="px-3 py-2 border border-[#1e3553] text-left whitespace-nowrap" style={{position:"sticky", right:0, background:"#132a4a", zIndex:15}}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {pageRows.map((row, rIdx) => (
                    <tr key={rIdx} className={rIdx%2 ? "bg-[#132a4a]" : "bg-[#0f1e33]"}>
                      {detectedColumns.map((col, cIdx) => (
                        <td key={col} className="px-3 py-2 border border-[#1e3553] whitespace-nowrap"
                            style={cIdx===0? { position: "sticky", left: 0, background: (rIdx%2? "#132a4a":"#0f1e33"), zIndex:10 } : {}}
                        >
                          {col === "Amount" && row[col] ? `₹${Number(parseFloat(row[col])||0).toLocaleString("en-IN")}` : (row[col] ?? "—")}
                        </td>
                      ))}

                      <td className="px-3 py-2 border border-[#1e3553] sticky" style={{position:"sticky", right:0, background:(rIdx%2? "#132a4a":"#0f1e33")}}>
                        <button onClick={()=>openViewer(row)} className="px-2 py-1 bg-[#00f5ff] text-black rounded text-xs">View</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* pagination controls */}
            <div className="flex justify-between items-center p-3 border-t border-[#1e3553]">
              <div className="flex items-center gap-2">
                <button disabled={page<=1} onClick={()=>setPage(p=>Math.max(1,p-1))}
                  className={`px-3 py-1 rounded ${page<=1? "bg-gray-700":"bg-[#00f5ff] text-black"}`}>⬅ Previous</button>
                <button disabled={page>=totalPages} onClick={()=>setPage(p=>Math.min(totalPages,p+1))}
                  className={`px-3 py-1 rounded ${page>=totalPages? "bg-gray-700":"bg-[#00f5ff] text-black"}`}>Next ➡</button>
              </div>
              <div className="text-sm text-gray-300">Page {page} of {totalPages}</div>
            </div>

          </div>

          {/* modal: JSON viewer */}
          {modalRow && (
            <div style={{position:"fixed", inset:0, background:"rgba(0,0,0,0.6)", zIndex:999}}>
              <div style={{width:"80%", maxHeight:"80%", margin:"5% auto", background:"#0f1e33", padding:20, borderRadius:8, overflow:"auto", border:"1px solid #1e3553"}}>
                <div className="flex justify-between items-center mb-3">
                  <h3 className="text-lg text-[#00f5ff]">Row JSON Viewer</h3>
                  <button onClick={closeViewer} className="px-2 py-1 bg-red-600 rounded">Close</button>
                </div>
                <pre style={{whiteSpace:"pre-wrap", color:"#cfeef6", fontSize:13}}>
                  {JSON.stringify(modalRow, null, 2)}
                </pre>
              </div>
            </div>
          )}

          {/* status */}
          {message && <div className="mt-3 text-sm text-[#4ee1ec]">{message}</div>}
        </div>
      </div>
    </DataContext.Provider>
  );
}

/* --- PivotTableView component (simple Amount-sum matrix) --- */
function PivotTableView({ pivot, rowField, colField }) {
  if (!pivot) return null;
  const { rowKeys, colKeys, matrix } = pivot;
  return (
    <div style={{overflowX:"auto"}}>
      <table className="min-w-full text-sm border-collapse">
        <thead className="bg-[#132a4a] text-[#00f5ff]">
          <tr>
            <th className="px-2 py-2 border border-[#1e3553]">{rowField} \ {colField}</th>
            {colKeys.map(ck => <th key={ck} className="px-2 py-2 border border-[#1e3553]">{ck}</th>)}
            <th className="px-2 py-2 border border-[#1e3553]">Row Total</th>
          </tr>
        </thead>
        <tbody>
          {rowKeys.map((rk, i) => {
            let rowTotal = 0;
            return (
              <tr key={rk} className={i%2 ? "bg-[#132a4a]" : "bg-[#0f1e33]"}>
                <td className="px-2 py-2 border border-[#1e3553]">{rk}</td>
                {colKeys.map(ck => {
                  const val = matrix[rk] && matrix[rk][ck] ? matrix[rk][ck] : 0;
                  rowTotal += val;
                  return <td key={ck} className="px-2 py-2 border border-[#1e3553]">₹{Number(val).toLocaleString("en-IN")}</td>;
                })}
                <td className="px-2 py-2 border border-[#1e3553]">₹{Number(rowTotal).toLocaleString("en-IN")}</td>
              </tr>
            );
          })}
          {/* col totals */}
          <tr className="bg-[#132a4a]">
            <td className="px-2 py-2 border border-[#1e3553] font-semibold">Col Total</td>
            {colKeys.map(ck => {
              let sum = 0;
              rowKeys.forEach(rk => { sum += (matrix[rk] && matrix[rk][ck]) ? matrix[rk][ck] : 0; });
              return <td key={ck} className="px-2 py-2 border border-[#1e3553] font-semibold">₹{Number(sum).toLocaleString("en-IN")}</td>;
            })}
            <td className="px-2 py-2 border border-[#1e3553] font-semibold">—</td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}
