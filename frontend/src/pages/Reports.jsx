import React, { useState, useEffect } from "react";
import axios from "axios";
import jsPDF from "jspdf";
import "jspdf-autotable";
import * as XLSX from "xlsx";
import {
  Chart as ChartJS,
  ArcElement,
  Tooltip,
  Legend,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
} from "chart.js";
import { Pie, Bar } from "react-chartjs-2";
import config from "../config.js";

ChartJS.register(ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement, Title);

export default function Reports() {
  const [data, setData] = useState([]);
  const [message, setMessage] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const rowsPerPage = 20;

  useEffect(() => {
    loadLatestData();
  }, []);

  // ✅ Decode + decompress base64 gzip
  async function decompressBase64(b64) {
    try {
      if (!b64) return "";
      const binary = Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
      const ds = new DecompressionStream("gzip");
      const ab = await new Response(new Blob([binary]).stream().pipeThrough(ds)).arrayBuffer();
      return new TextDecoder().decode(ab);
    } catch (err) {
      console.error("❌ Decompression failed:", err);
      return "";
    }
  }

  // ✅ XML Parser → Row objects
  function parseXML(xml) {
    if (!xml || typeof xml !== "string" || !xml.includes("<VOUCHER")) return [];
    const vouchers = xml.match(/<VOUCHER[\s\S]*?<\/VOUCHER>/gi) || [];
    const rows = [];
    for (const v of vouchers) {
      const getTag = (t) => {
        const m = v.match(new RegExp(`<${t}[^>]*>([\\s\\S]*?)<\\/${t}>`, "i"));
        return m ? m[1].trim() : "";
      };
      rows.push({
        "Voucher Type": getTag("VOUCHERTYPENAME"),
        Date: getTag("DATE"),
        Party: getTag("PARTYNAME"),
        Item: getTag("STOCKITEMNAME"),
        Qty: getTag("BILLEDQTY"),
        Amount: getTag("AMOUNT"),
        Salesman: getTag("BASICSALESNAME"),
      });
    }
    return rows;
  }

  // ✅ Load & normalize data from backend
  const loadLatestData = async () => {
    setMessage("⏳ Loading latest data...");
    try {
      const backendURL =
        config.BACKEND_URL ||
        (window.location.hostname.includes("localhost")
          ? "http://127.0.0.1:8787"
          : "https://replica-backend.shoabahmad68.workers.dev");

      const res = await axios.get(`${backendURL}/api/imports/latest`, { timeout: 20000 });
      const d = res?.data;
      if (!d) throw new Error("Empty response");

      console.log("✅ Backend Connected Successfully:", d);

      // ---- Handle compressed XML format ----
      if (d.compressed && (d.salesXml || d.purchaseXml || d.mastersXml)) {
        const salesXml = d.salesXml ? await decompressBase64(d.salesXml) : "";
        const purchaseXml = d.purchaseXml ? await decompressBase64(d.purchaseXml) : "";
        const mastersXml = d.mastersXml ? await decompressBase64(d.mastersXml) : "";

        const rows = [
          ...parseXML(salesXml),
          ...parseXML(purchaseXml),
          ...parseXML(mastersXml),
        ].filter((r) => Object.values(r).some((v) => v)); // remove empty

        if (rows.length) {
          setData(rows);
          setMessage(`✅ Loaded ${rows.length} records from backend.`);
          return;
        }
        setMessage("⚠️ No valid voucher data found in XML.");
        return;
      }

      // ---- Handle direct JSON structure ----
      let rows =
        d.rows ||
        d.data?.rows ||
        d.data ||
        (Array.isArray(d) ? d : []);

      if (Array.isArray(rows) && rows.length) {
        setData(rows);
        setMessage(`✅ Loaded ${rows.length} JSON records.`);
      } else {
        setMessage("⚠️ No valid data found in response.");
      }
    } catch (err) {
      console.error("❌ Load error:", err);
      setMessage("❌ Failed to load data from backend.");
    }
  };

  // ---- Column keys auto detect ----
  const allKeys = Array.from(new Set(data.flatMap((r) => Object.keys(r || {}))));

  // ---- Pagination logic ----
  const totalPages = Math.max(1, Math.ceil(data.length / rowsPerPage));
  const start = (currentPage - 1) * rowsPerPage;
  const currentRows = data.slice(start, start + rowsPerPage);

  // ---- Chart data (safe compute) ----
  const productTotals = {};
  data.forEach((r) => {
    const prod = r?.Item || "Unknown";
    const amt = parseFloat(r?.Amount || 0);
    productTotals[prod] = (productTotals[prod] || 0) + amt;
  });

  const productChartData = {
    labels: Object.keys(productTotals).slice(0, 15),
    datasets: [
      {
        label: "Product Sales (₹)",
        data: Object.values(productTotals).slice(0, 15),
        backgroundColor: [
          "#60A5FA",
          "#34D399",
          "#FBBF24",
          "#F87171",
          "#A78BFA",
          "#F472B6",
          "#4ADE80",
        ],
      },
    ],
  };

  // ---- PDF export ----
  const handlePDF = () => {
    if (!data.length) return alert("No data for PDF!");
    const doc = new jsPDF("l", "mm", "a4");
    doc.text("Master Analysis Report", 14, 15);
    doc.autoTable({
      head: [allKeys],
      body: data.map((r) => allKeys.map((k) => r[k] ?? "")),
      startY: 20,
      styles: { fontSize: 7, cellPadding: 0.5 },
      headStyles: { fillColor: [10, 37, 64] },
    });
    doc.save("MasterReport.pdf");
  };

  // ---- UI ----
  return (
    <div className="min-h-screen bg-[#0a1628] text-white p-6">
      <div className="max-w-6xl mx-auto bg-[#12243d] rounded-2xl p-8 shadow-xl border border-[#1e3553]">
        <h2 className="text-3xl font-bold text-[#00f5ff] mb-6 text-start">
          📊 MASTER REPORT DATASHEET
        </h2>

        {/* Buttons */}
        <div className="flex flex-wrap gap-3 mb-6">
          <button
            onClick={loadLatestData}
            className="bg-blue-600 px-5 py-2 rounded-lg hover:opacity-90"
          >
            Reload
          </button>
          <button
            onClick={handlePDF}
            className="bg-orange-500 px-5 py-2 rounded-lg hover:opacity-90"
          >
            PDF
          </button>
        </div>

        {message && (
          <p className="text-center mb-4 text-[#4ee1ec] font-medium whitespace-pre-line">
            {message}
          </p>
        )}

        {data.length > 0 ? (
          <>
            {/* Chart */}
            <div className="bg-[#0f1e33] p-6 rounded-xl h-[280px] overflow-hidden mb-6">
              <h3 className="text-lg font-semibold text-[#00f5ff] mb-2">
                📦 Product Summary
              </h3>
              <Pie
                data={productChartData}
                options={{
                  maintainAspectRatio: false,
                  plugins: {
                    legend: { labels: { color: "#E5E7EB" } },
                  },
                }}
              />
            </div>

            {/* Data Table */}
            <div className="overflow-x-auto bg-[#0f1e33] p-4 rounded-lg border border-[#1e3553]">
              <table className="min-w-full border border-[#1e3553] text-sm">
                <thead
                  className="bg-[#132a4a] text-[#00f5ff]"
                  style={{ position: "sticky", top: 0 }}
                >
                  <tr>
                    {allKeys.map((k, i) => (
                      <th
                        key={i}
                        className="px-4 py-2 border border-[#1e3553] text-left uppercase text-xs tracking-wider"
                      >
                        {k}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {currentRows.map((r, i) => (
                    <tr
                      key={i}
                      className={`hover:bg-[#1b355d] ${
                        i % 2 ? "bg-[#132a4a]" : "bg-[#0f1e33]"
                      }`}
                    >
                      {allKeys.map((k, j) => (
                        <td
                          key={j}
                          className="px-4 py-2 border border-[#1e3553] text-gray-200"
                        >
                          {r[k] ?? ""}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>

              {/* Pagination */}
              <div className="flex justify-between items-center mt-3 text-sm text-gray-300">
                <button
                  onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))}
                  disabled={currentPage === 1}
                  className={`px-4 py-1 rounded-lg ${
                    currentPage === 1
                      ? "bg-gray-600 cursor-not-allowed"
                      : "bg-[#00f5ff] text-black"
                  }`}
                >
                  ⬅ Prev
                </button>
                <span>
                  Page {currentPage} of {totalPages}
                </span>
                <button
                  onClick={() => setCurrentPage((p) => Math.min(p + 1, totalPages))}
                  disabled={currentPage === totalPages}
                  className={`px-4 py-1 rounded-lg ${
                    currentPage === totalPages
                      ? "bg-gray-600 cursor-not-allowed"
                      : "bg-[#00f5ff] text-black"
                  }`}
                >
                  Next ➡
                </button>
              </div>
            </div>
          </>
        ) : (
          <p className="text-gray-400 italic text-center py-8">
            No data available. Please reload.
          </p>
        )}
      </div>
    </div>
  );
}
