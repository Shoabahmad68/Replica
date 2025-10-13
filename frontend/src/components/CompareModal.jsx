// src/components/CompareModal.jsx
import React from "react";

export default function CompareModal({ onClose, data = [] }) {
  // simple compare UI (you can expand)
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black opacity-40" onClick={onClose}></div>
      <div className="relative w-[90%] max-w-4xl bg-white rounded-xl shadow-lg p-5">
        <div className="flex justify-between items-center">
          <h3 className="text-xl font-semibold">Compare Mode</h3>
          <button onClick={onClose} className="text-white bg-red-500 rounded-full w-8 h-8 flex items-center justify-center">✕</button>
        </div>

        <div className="mt-4 grid md:grid-cols-2 gap-4">
          <div className="border rounded p-3">
            <h4 className="font-semibold mb-2">Quick Metrics</h4>
            <p>Total records: <strong>{data.length}</strong></p>
            <p>Total sales: <strong>₹{data.reduce((s, r) => s + (parseFloat(r.Amount) || 0), 0).toLocaleString("en-IN")}</strong></p>
          </div>
          <div className="border rounded p-3">
            <h4 className="font-semibold mb-2">Compare by</h4>
            <p>Choose fields and compare — (you can implement multi-select filters here)</p>
          </div>
        </div>
      </div>
    </div>
  );
}
