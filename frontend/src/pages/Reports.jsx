import React, { useState, useEffect, createContext, useContext } from "react";
import axios from "axios";
import jsPDF from "jspdf";
import "jspdf-autotable";
import * as XLSX from "xlsx";
import config from "../config.js";

// GLOBAL DATA CONTEXT
export const DataContext = createContext();
export function useReportData() {
  return useContext(DataContext);
}

export default function Reports() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [page, setPage] = useState(1);
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const rowsPerPage = 20;

  // FIXED REQUIRED COLUMNS
  const EXCEL_COLUMNS = [
    "Sr.No","Date","Vch No.","Party Name","City/Area","Party Group",
    "State","ItemName","Item Group","Item Category","Qty","Alt Qty",
    "Rate","UOM","Salesman","Vch Type","Amount"
  ];

  useEffect(() => {
    loadLatestData();
  }, []);

  // ============================
  //  TALLY BACKEND DATA LOADER
  // ============================
  async function loadLatestData() {
    setLoading(true);
    setMessage("⏳ Tally से डेटा लोड हो रहा है...");

    try {
      const backend = config.BACKEND_URL || "https://replica-backend.shoabahmad68.workers.dev";
      const res = await axios.get(`${backend}/api/imports/latest`);
      const d = res.data;

      if (d && (d.sales || d.purchase || d.receipt)) {
        const combined = [
          ...(d.sales || []),
          ...(d.purchase || []),
          ...(d.receipt || []),
          ...(d.payment || []),
          ...(d.journal || []),
          ...(d.debit || []),
          ...(d.credit || []),
        ];

        const withSrNo = combined.map((row, i) => ({
          "Sr.No": i + 1,
          ...row
        }));

        setData(withSrNo);
        localStorage.setItem("savedReportData", JSON.stringify(withSrNo));

        setMessage(`✅ ${withSrNo.length} records loaded!`);
      } else {
        setMessage("⚠️ कोई डेटा नहीं मिला।");
        setData([]);
      }
    } catch (err) {
      setMessage(`❌ Error: ${err.message}`);
      setData([]);
    } finally {
      setLoading(false);
    }
  }

  // ============================
  //      XML PARSER (FINAL)
  // ============================

  const parseXML = async () => {
    try {
      const xmlText = await file.text();
      const parser = new DOMParser();
      const xml = parser.parseFromString(xmlText, "text/xml");

      const tags = Array.from(xml.documentElement.childNodes)
        .filter(n => n.nodeType === 1);

      let rows = [];
      let row = {}; // current row builder

      tags.forEach(tag => {
        const name = tag.nodeName.trim();
        const value = tag.textContent.trim();

        if (name === "IWSPQRSNO") {
          if (Object.keys(row).length > 0) {
            rows.push(row);
          }
          row = { "Sr.No": value };
        }

        if (name === "IWSPQRPARTYDATE") row["Date"] = value;
        if (name === "IWSPQRPARTYVCHNO") row["Vch No."] = value;
        if (name === "IWSPQRPARTYNAME") row["Party Name"] = value;
        if (name === "IWSPQRPARTYCITY") row["City/Area"] = value;
        if (name === "IWSPQRPARTYGRP") row["Party Group"] = value;
        if (name === "IWSPQRPARTYSTATE") row["State"] = value;

        if (name === "IWSITEMNAME") row["ItemName"] = value;
        if (name === "IWSITEMGROUP") row["Item Group"] = value;
        if (name === "IWSITEMCTG") row["Item Category"] = value;
        if (name === "IWSITEMQTY") row["Qty"] = value;
        if (name === "IWSITEMALTQTY") row["Alt Qty"] = value;
        if (name === "IWSITEMRATE") row["Rate"] = value;
        if (name === "IWSITEMRATEUNITS") row["UOM"] = value;

        if (name === "IWSPQRPARTYAMOUNT") row["Amount"] = value;
      });

      if (Object.keys(row).length > 0) rows.push(row);

      const cleaned = rows.map((r, i) => ({
        ...EXCEL_COLUMNS.reduce((obj, col) => {
          obj[col] = r[col] || "";
          return obj;
        }, {}),
        "Sr.No": i + 1
      }));

      setData(cleaned);
      localStorage.setItem("savedReportData", JSON.stringify(cleaned));

      setMessage(`✅ XML Loaded: ${cleaned.length} rows`);
    } catch (error) {
      console.error(error);
      setMessage("❌ XML Parsing Error");
    }
  };

  // ============================
  //   FILE HANDLING
  // ============================

  const handleUpload = async () => {
    if (!file) return alert("⚠️ पहले फ़ाइल चुनें!");

    const ext = file.name.split(".").pop().toLowerCase();
    setUploading(true);

    if (ext === "xml") {
      await parseXML();
    } else {
      await parseExcel();
    }

    setUploading(false);
  };

  // Excel
  const parseExcel = async () => {
    const buf = await file.arrayBuffer();
    const workbook = XLSX.read(buf);
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const json = XLSX.utils.sheet_to_json(sheet);

    const mapped = json.map((r, i) => ({
      "Sr.No": i + 1,
      ...r
    }));

    setData(mapped);
    localStorage.setItem("savedReportData", JSON.stringify(mapped));
    setMessage(`✅ Excel Loaded: ${mapped.length} rows`);
  };

  // Pagination
  const totalPages = Math.ceil(data.length / rowsPerPage) || 1;
  const start = (page - 1) * rowsPerPage;
  const pageRows = data.slice(start, start + rowsPerPage);

  // Export Excel
  const handleExportExcel = () => {
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Report");
    XLSX.writeFile(wb, `Report_${Date.now()}.xlsx`);
  };

  // Export PDF
  const handleExportPDF = () => {
    const doc = new jsPDF("l", "mm", "a3");
    doc.text("Master Report", 14, 15);
    doc.autoTable({
      head: [EXCEL_COLUMNS],
      body: data.map(r => EXCEL_COLUMNS.map(c => r[c] || "")),
      startY: 20,
      styles: { fontSize: 6 }
    });
    doc.save(`Report_${Date.now()}.pdf`);
  };

  // Clear
  const handleClear = () => {
    if (confirm("सारा डेटा हटाना है?")) {
      setData([]);
      localStorage.removeItem("savedReportData");
      setMessage("🧹 Cleared");
    }
  };

  return (
    <DataContext.Provider value={{ data, setData }}>
      {/* YOUR OLD COMPLETE UI EXACTLY SAME BELOW (unchanged) */}

      <div className="min-h-screen bg-[#0a1628] text-white p-6">
        <div className="max-w-[98%] mx-auto bg-[#12243d] rounded-2xl p-6 shadow-xl border border-[#1e3553]">

          <h2 className="text-3xl font-bold text-[#00f5ff] mb-4">📊 MASTER REPORT</h2>

          {/* Upload Buttons */}
          <div className="flex gap-3 mb-4">
            <input type="file" onChange={(e)=>setFile(e.target.files[0])}
              className="file:bg-[#00f5ff] file:text-black file:font-semibold file:px-3 file:py-1 bg-[#0a1628] border border-[#1e3553] rounded-lg p-2" />

            <button onClick={handleUpload}
              className="bg-purple-600 px-5 py-2 rounded-lg font-semibold hover:bg-purple-700">
              {uploading ? "⏳ Uploading..." : "📤 Upload XML/Excel"}
            </button>

            <button onClick={loadLatestData}
              className="bg-[#00f5ff] text-black px-5 py-2 rounded-lg font-semibold">
              🔄 Reload Tally
            </button>

            <button onClick={handleExportExcel}
              className="bg-green-600 px-5 py-2 rounded-lg font-semibold">
              📊 Export Excel
            </button>

            <button onClick={handleExportPDF}
              className="bg-orange-500 px-5 py-2 rounded-lg font-semibold">
              📄 Export PDF
            </button>

            <button onClick={handleClear}
              className="bg-red-600 px-5 py-2 rounded-lg font-semibold">
              🧹 Clear
            </button>
          </div>

          {/* Status */}
          {message && (
            <div className="text-center py-3 mb-4 bg-[#0f1e33] rounded-lg border border-[#1e3553] text-[#4ee1ec]">
              {message}
            </div>
          )}

          {/* Table */}
          <div className="bg-[#0f1e33] rounded-lg border border-[#1e3553] overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-[#132a4a] text-[#00f5ff]">
                <tr>
                  {EXCEL_COLUMNS.map(col => (
                    <th key={col} className="px-3 py-3 border border-[#1e3553] whitespace-nowrap">
                      {col}
                    </th>
                  ))}
                </tr>
              </thead>

              <tbody>
                {pageRows.length > 0 ? (
                  pageRows.map((row, i) => (
                    <tr key={i} className={i % 2 ? "bg-[#132a4a]" : "bg-[#0f1e33]"}>
                      {EXCEL_COLUMNS.map(col => (
                        <td key={col} className="px-3 py-2 border border-[#1e3553] whitespace-nowrap">
                          {row[col] || "—"}
                        </td>
                      ))}
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={EXCEL_COLUMNS.length}
                      className="text-center py-6 text-gray-400">
                      कोई डेटा उपलब्ध नहीं है
                    </td>
                  </tr>
                )}
              </tbody>
            </table>

            {/* Pagination */}
            <div className="flex justify-between items-center p-4 border-t border-[#1e3553]">
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                className="px-4 py-2 bg-[#00f5ff] text-black rounded disabled:bg-gray-700 disabled:text-gray-500"
              >
                ⬅ Previous
              </button>

              <span className="font-semibold text-gray-300">
                Page {page} of {totalPages}
              </span>

              <button
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="px-4 py-2 bg-[#00f5ff] text-black rounded disabled:bg-gray-700 disabled:text-gray-500"
              >
                Next ➡
              </button>
            </div>
          </div>

        </div>
      </div>
    </DataContext.Provider>
  );
}
