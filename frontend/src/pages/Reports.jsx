import React, { useState, useEffect, useMemo } from "react";
import axios from "axios";
import { FixedSizeList as List } from "react-window";
import config from "../config.js";

export default function Reports() {
  const [rows, setRows] = useState([]);
  const [message, setMessage] = useState("⏳ Loading...");
  const [page, setPage] = useState(1);
  const pageSize = 50;

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    try {
      const backendURL =
        config.BACKEND_URL ||
        (window.location.hostname.includes("localhost")
          ? "http://127.0.0.1:8787"
          : "https://replica-backend.shoabahmad68.workers.dev");

      const res = await axios.get(`${backendURL}/api/imports/latest`);
      const d = res.data;
      if (!d?.rows) throw new Error("Empty");

      // Merge all vouchers into single unified list
      const unified = [
        ...(d.rows.sales || []),
        ...(d.rows.purchase || []),
        ...(d.rows.receipt || []),
        ...(d.rows.payment || []),
        ...(d.rows.journal || []),
      ].filter((r) => r?.type === "item_row");

      setRows(unified);
      setMessage(`✅ Loaded ${unified.length} records.`);
    } catch (e) {
      setMessage("❌ Load failed: " + e.message);
    }
  }

  const allKeys = useMemo(() => {
    const keys = new Set();
    rows.forEach((r) => Object.keys(r || {}).forEach((k) => keys.add(k)));
    return Array.from(keys);
  }, [rows]);

  const totalPages = Math.ceil(rows.length / pageSize);
  const current = rows.slice((page - 1) * pageSize, page * pageSize);

  const Row = ({ index, style }) => {
    const r = current[index];
    return (
      <tr style={style} className={index % 2 ? "bg-[#132a4a]" : "bg-[#0f1e33]"}>
        {allKeys.map((k) => (
          <td key={k} className="px-3 py-2 border border-[#1e3553]">
            {r[k] ?? ""}
          </td>
        ))}
      </tr>
    );
  };

  return (
    <div className="min-h-screen bg-[#0a1628] text-white p-6">
      <div className="max-w-7xl mx-auto bg-[#12243d] rounded-2xl p-6 shadow-md">
        <h2 className="text-2xl font-bold text-[#00f5ff] mb-3">📊 Master Report</h2>
        <p className="mb-4 text-sm text-[#4ee1ec]">{message}</p>

        {rows.length ? (
          <>
            <div className="overflow-x-auto bg-[#0f1e33] p-4 rounded-xl border border-[#1e3553]">
              <table className="min-w-full text-xs border-collapse border border-[#1e3553]">
                <thead className="bg-[#132a4a] text-[#00f5ff]">
                  <tr>
                    {allKeys.map((k) => (
                      <th key={k} className="px-3 py-2 border border-[#1e3553] text-left">
                        {k}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  <List
                    height={500}
                    itemCount={current.length}
                    itemSize={30}
                    width="100%"
                  >
                    {Row}
                  </List>
                </tbody>
              </table>
            </div>

            <div className="flex justify-between mt-3 text-gray-300 text-sm">
              <button
                onClick={() => setPage((p) => Math.max(p - 1, 1))}
                disabled={page === 1}
                className="bg-[#00f5ff] text-black px-4 py-1 rounded"
              >
                Prev
              </button>
              <span>
                Page {page}/{totalPages}
              </span>
              <button
                onClick={() => setPage((p) => Math.min(p + 1, totalPages))}
                disabled={page === totalPages}
                className="bg-[#00f5ff] text-black px-4 py-1 rounded"
              >
                Next
              </button>
            </div>
          </>
        ) : (
          <p className="italic text-gray-400">No data available</p>
        )}
      </div>
    </div>
  );
}
