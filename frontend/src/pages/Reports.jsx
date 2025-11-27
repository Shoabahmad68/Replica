import React, { useState, useEffect, createContext, useContext } from "react";
import axios from "axios";
import jsPDF from "jspdf";
import "jspdf-autotable";
import * as XLSX from "xlsx";
import config from "../config.js";

export const DataContext = createContext();
export function useReportData() {
  return useContext(DataContext);
}

export default function Reports() {
  const [data, setData] = useState([]);
  const [dynamicColumns, setDynamicColumns] = useState(["Sr.No"]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [page, setPage] = useState(1);
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [rowsPerPage, setRowsPerPage] = useState(50);

  // Load local storage on refresh
  useEffect(() => {
    const savedCols = localStorage.getItem("reportDynamicColumns");
    const savedData = localStorage.getItem("savedReportData");

    if (savedCols) setDynamicColumns(JSON.parse(savedCols));
    if (savedData) setData(JSON.parse(savedData));

  }, []);

  // LOAD FROM BACKEND (TALLY)
  useEffect(() => {
    loadLatestData();
  }, []);

  async function loadLatestData() {
    setLoading(true);
    setMessage("⏳ Tally से डेटा लोड हो रहा है...");

    try {
      const backend = config.BACKEND_URL || "https://replica-backend.shoabahmad68.workers.dev";
      const res = await axios.get(`${backend}/api/imports/latest`);
      const d = res.data;

      if (!d) {
        setMessage("⚠ कोई डेटा नहीं मिला");
        return;
      }

      const combined = [
        ...(d.sales || []),
        ...(d.purchase || []),
        ...(d.receipt || []),
        ...(d.payment || []),
        ...(d.journal || []),
        ...(d.debit || []),
        ...(d.credit || [])
      ];

      if (combined.length === 0) {
        setMessage("⚠ कोई डेटा नहीं मिला");
        return;
      }

      const cols = new Set();

      combined.forEach(row => {
        Object.keys(row).forEach(key => {
          if (key !== "Sr.No") cols.add(key);
        });
      });

      const finalCols = ["Sr.No", ...Array.from(cols)];

      const withSrNo = combined.map((row, i) => ({
        "Sr.No": i + 1,
        ...row
      }));

      setDynamicColumns(finalCols);
      setData(withSrNo);

      localStorage.setItem("reportDynamicColumns", JSON.stringify(finalCols));
      localStorage.setItem("savedReportData", JSON.stringify(withSrNo));

      setMessage(`✅ ${withSrNo.length} rows loaded from Tally`);
    } catch (err) {
      setMessage("❌ " + err.message);
    }
    setLoading(false);
  }

  const handleFileChange = (e) => setFile(e.target.files[0]);

  // 🌟 INTELLIGENT XML PARSER (Auto-detect everything)
  const handleUploadXML = async () => {
    if (!file) return alert("XML file चुनें!");

    try {
      setUploading(true);
      setMessage("⏳ XML पढ़ा जा रहा है...");

      const xmlText = await file.text();
      const parser = new DOMParser();
      const doc = parser.parseFromString(xmlText, "text/xml");

      // Find all nodes that contain data
      const allNodes = [...doc.getElementsByTagName("*")];

      // Pick nodes having children (like Tally ROW)
      const rowCandidates = allNodes.filter(n => n.children.length > 0);

      if (rowCandidates.length === 0) {
        setMessage("⚠ XML में usable data नहीं मिला");
        return;
      }

      const rows = rowCandidates;
      const cols = new Set();

      rows.forEach(r => {
        [...r.children].forEach(tag => cols.add(tag.tagName));
      });

      const finalCols = ["Sr.No", ...Array.from(cols)];

      const json = rows.map((r, i) => {
        const obj = { "Sr.No": i + 1 };
        finalCols.forEach(col => {
          if (col === "Sr.No") return;
          const node = r.getElementsByTagName(col)[0];
          obj[col] = node ? node.textContent.trim() : "";
        });
        return obj;
      });

      setDynamicColumns(finalCols);
      setData(json);

      localStorage.setItem("reportDynamicColumns", JSON.stringify(finalCols));
      localStorage.setItem("savedReportData", JSON.stringify(json));

      setMessage(`✅ XML loaded: ${json.length} rows, ${finalCols.length - 1} columns detected`);
      setFile(null);
    } catch (err) {
      setMessage("❌ XML Error: " + err.message);
    }

    setUploading(false);
  };

  // Excel Upload — also auto-detect columns
  const handleUploadExcel = async () => {
    if (!file) return alert("Excel file चुनें!");

    try {
      setUploading(true);
      setMessage("⏳ Excel पढ़ा जा रहा है...");

      const buffer = await file.arrayBuffer();
      const wb = XLSX.read(buffer);
      const sheet = wb.Sheets[wb.SheetNames[0]];
      const json = XLSX.utils.sheet_to_json(sheet);

      if (json.length === 0) {
        setMessage("⚠ Excel खाली है");
        return;
      }

      const cols = new Set();
      json.forEach(row => Object.keys(row).forEach(key => cols.add(key)));

      const finalCols = ["Sr.No", ...Array.from(cols)];

      const withSrNo = json.map((r, i) => ({
        "Sr.No": i + 1,
        ...r
      }));

      setDynamicColumns(finalCols);
      setData(withSrNo);

      localStorage.setItem("reportDynamicColumns", JSON.stringify(finalCols));
      localStorage.setItem("savedReportData", JSON.stringify(withSrNo));

      setMessage(`✅ Excel loaded: ${withSrNo.length} rows`);
      setFile(null);

    } catch (err) {
      setMessage("❌ Excel Error: " + err.message);
    }

    setUploading(false);
  };

  // Clear all
  const handleClear = () => {
    if (confirm("सारा डेटा हटाना है?")) {
      localStorage.removeItem("reportDynamicColumns");
      localStorage.removeItem("savedReportData");
      setData([]);
      setDynamicColumns(["Sr.No"]);
      setMessage("🧹 Cleared");
    }
  };

  // Pagination
  const totalPages = Math.ceil(data.length / rowsPerPage) || 1;
  const start = (page - 1) * rowsPerPage;
  const pageRows = data.slice(start, start + rowsPerPage);

  const summary = {
    total: data.length,
    totalAmount: data.reduce((sum, r) => sum + (parseFloat(r["Amount"]) || 0), 0),
    uniqueParties: new Set(data.map(r => r["Party Name"])).size,
  };

  return (
    <DataContext.Provider value={{ data, setData }}>
      <div className="min-h-screen bg-[#0a1628] text-white p-6">
        <div className="max-w-[98%] mx-auto bg-[#12243d] rounded-2xl p-6 border border-[#1e3553]">

          <div className="flex justify-between items-center mb-6 border-b border-[#1e3553] pb-4">
            <h2 className="text-3xl font-bold text-[#00f5ff]">📊 MASTER DATA</h2>
            <p className="text-xl text-[#00f5ff]">{data.length} Records</p>
          </div>

          {/* Upload Buttons */}
          <div className="flex flex-wrap gap-4 bg-[#0f1e33] p-4 rounded-xl border border-[#1e3553]">

            {/* XML */}
            <div className="flex gap-2 items-center border-r border-[#1e3553] pr-4">
              <input type="file" accept=".xml"
                onChange={handleFileChange}
                className="file:bg-[#00f5ff] file:text-black file:font-semibold p-2 bg-[#0a1628] border rounded" />
              <button className="bg-purple-600 px-4 py-2 rounded" onClick={handleUploadXML}>
                📤 Upload XML
              </button>
            </div>

            {/* Excel */}
            <div className="flex gap-2 items-center border-r border-[#1e3553] pr-4">
              <input type="file" accept=".xls,.xlsx"
                onChange={handleFileChange}
                className="file:bg-[#00f5ff] file:text-black file:font-semibold p-2 bg-[#0a1628] border rounded" />
              <button className="bg-blue-600 px-4 py-2 rounded" onClick={handleUploadExcel}>
                📤 Upload Excel
              </button>
            </div>

            <button className="bg-[#00f5ff] text-black px-4 py-2 rounded" onClick={loadLatestData}>🔄 Reload Tally</button>
            <button className="bg-red-600 px-4 py-2 rounded" onClick={handleClear}>🧹 Clear</button>
          </div>

          {message && (
            <div className="mt-4 text-center bg-[#0f1e33] p-3 rounded border border-[#1e3553] text-[#4ee1ec]">
              {message}
            </div>
          )}

          {/* TABLE */}
          {data.length > 0 && (
            <div className="mt-6 bg-[#0f1e33] border border-[#1e3553] rounded-xl overflow-hidden">

              <div className="overflow-x-auto">
                <table className="min-w-full text-sm border-collapse">
                  <thead className="bg-[#132a4a] text-[#00f5ff]">
                    <tr>
                      {dynamicColumns.map(col => (
                        <th key={col} className="px-3 py-3 border border-[#1e3553]">{col}</th>
                      ))}
                    </tr>
                  </thead>

                  <tbody>
                    {pageRows.map((row, i) => (
                      <tr key={i} className={i % 2 ? "bg-[#132a4a]" : "bg-[#0f1e33]"}>
                        {dynamicColumns.map(col => (
                          <td key={col} className="px-3 py-2 border border-[#1e3553]">
                            {row[col] || "—"}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              <div className="flex justify-between items-center p-4 border-t border-[#1e3553]">
                <button className="px-4 py-2 bg-[#00f5ff] text-black rounded"
                  disabled={page === 1}
                  onClick={() => setPage(p => Math.max(1, p - 1))}>
                  ⬅ Previous
                </button>

                <span>Page {page} of {totalPages}</span>

                <button className="px-4 py-2 bg-[#00f5ff] text-black rounded"
                  disabled={page === totalPages}
                  onClick={() => setPage(p => Math.min(totalPages, p + 1))}>
                  Next ➡
                </button>
              </div>

            </div>
          )}

        </div>
      </div>
    </DataContext.Provider>
  );
}
