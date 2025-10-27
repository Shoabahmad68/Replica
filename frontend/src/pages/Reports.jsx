// src/pages/Reports.jsx
import React from "react";
import { useData } from "../context/DataContext";

export default function ReportsRaw() {
  const { data, loading } = useData();

  if (loading) return <div className="p-6">Loading data…</div>;
  if (!data) return <div className="p-6 text-red-400">No data found.</div>;

  // अगर backend ने compressed object भेजा है (contains salesXml etc)
  if (data?.compressed && (data.salesXml || data.purchaseXml || data.mastersXml)) {
    return (
      <div className="p-6">
        <h2 className="text-xl font-semibold mb-4">Compressed payload received</h2>
        <p className="mb-2">The backend returned compressed XML fields. You can inspect or download the raw object.</p>
        <pre style={{ maxHeight: 400, overflow: "auto", background: "#0f1724", color:"#d1fae5", padding:10 }}>
          {JSON.stringify(data, null, 2)}
        </pre>
        <a
          className="inline-block mt-3 bg-blue-600 text-white px-3 py-2 rounded"
          href={URL.createObjectURL(new Blob([JSON.stringify(data, null, 2)], { type: "application/json" }))}
          download="raw_payload.json"
        >
          Download JSON
        </a>
      </div>
    );
  }

  // otherwise data is expected as array of rows
  const rows = Array.isArray(data) ? data : [data];

  // collect all columns (union of keys) and maintain order by first-seen
  const colOrder = [];
  const seen = new Set();
  rows.forEach((r) => {
    if (r && typeof r === "object") {
      Object.keys(r).forEach((k) => {
        if (!seen.has(k)) {
          seen.add(k);
          colOrder.push(k);
        }
      });
    }
  });

  return (
    <div className="p-6">
      <h2 className="text-2xl font-semibold mb-4">Raw Data Table</h2>
      <p className="text-sm text-gray-300 mb-3">Showing rows exactly as received. Columns detected automatically.</p>

      <div style={{ overflowX: "auto", background: "#071028", padding: 12, borderRadius: 8 }}>
        <table style={{ borderCollapse: "collapse", width: "100%" }}>
          <thead>
            <tr>
              <th style={{ position: "sticky", top: 0, background: "#07253a", color: "#7ee1d4", padding: "8px 10px", border: "1px solid #133046" }}>#</th>
              {colOrder.map((c) => (
                <th key={c} style={{ background: "#07253a", color: "#7ee1d4", padding: "8px 10px", border: "1px solid #133046", textAlign: "left" }}>
                  {c}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={i} style={{ background: i % 2 ? "#071b2a" : "#062031" }}>
                <td style={{ padding: "8px 10px", border: "1px solid #0f3446", color: "#a7f3eb" }}>{i + 1}</td>
                {colOrder.map((c) => (
                  <td key={c} style={{ padding: "8px 10px", border: "1px solid #0f3446", color: "#e6f7f2" }}>
                    {r && typeof r === "object" ? String(r[c] ?? "") : String(r ?? "")}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="mt-4">
        <button
          className="bg-green-600 text-white px-3 py-2 rounded mr-2"
          onClick={() => {
            const blob = new Blob([JSON.stringify(rows, null, 2)], { type: "application/json" });
            const url = URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            a.download = "raw_table.json";
            a.click();
          }}
        >
          Download rows JSON
        </button>
        <button
          className="bg-blue-600 text-white px-3 py-2 rounded"
          onClick={() => {
            // quick CSV (not robust for commas/newlines in data)
            const csv = [
              colOrder.join(","),
              ...rows.map((r) => colOrder.map((c) => `"${String((r && r[c]) ?? "").replace(/"/g, '""')}"`).join(",")),
            ].join("\n");
            const blob = new Blob([csv], { type: "text/csv" });
            const url = URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            a.download = "raw_table.csv";
            a.click();
          }}
        >
          Download CSV
        </button>
      </div>
    </div>
  );
}
