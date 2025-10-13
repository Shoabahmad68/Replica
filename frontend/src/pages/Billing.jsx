// src/pages/Billing.jsx
import React, { useEffect, useMemo, useState, useRef } from "react";
import axios from "axios";
import { Bar, Pie, Doughnut } from "react-chartjs-2";
import {
  Chart as ChartJS,
  CategoryScale, LinearScale, BarElement, ArcElement,
  Tooltip, Legend, Title, PointElement, LineElement
} from "chart.js";
import {
  Plus, Download, Edit3, Trash2, CheckCircle, Search,
  XCircle, Eye, Send, Filter, Printer
} from "lucide-react";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";
import * as XLSX from "xlsx";

ChartJS.register(
  CategoryScale, LinearScale, BarElement, ArcElement,
  Tooltip, Legend, Title, PointElement, LineElement
);

const fmt = (n) => `₹${Number(n || 0).toLocaleString("en-IN")}`;
const API = "http://localhost:4000/api/billing";

export default function Billing() {
  const [invoices, setInvoices] = useState([]);
  const [filtered, setFiltered] = useState([]);
  const [filter, setFilter] = useState({ search: "", status: "All", mode: "All" });
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [selected, setSelected] = useState([]);
  const [showPreview, setShowPreview] = useState(false);
  const previewRef = useRef();

  // ✅ Load data from backend
  useEffect(() => { loadInvoices(); }, []);

  const loadInvoices = async () => {
    try {
      const res = await axios.get(`${API}/list`);
      const data = res.data.data || [];
      setInvoices(data);
      setFiltered(data);
    } catch (err) {
      console.error("Load error:", err);
    }
  };

  // ✅ Save or Update Invoice
  const saveInvoice = async (inv) => {
    try {
      await axios.post(`${API}/save`, inv);
      loadInvoices();
      setShowForm(false);
      setEditing(null);
    } catch (err) {
      console.error("Save error:", err);
    }
  };

  // ✅ Delete
  const deleteInvoice = async (id) => {
    await axios.delete(`${API}/delete/${id}`);
    loadInvoices();
  };

  // ✅ Filter logic
  useEffect(() => {
    let temp = invoices;
    if (filter.search)
      temp = temp.filter((i) =>
        i.client.toLowerCase().includes(filter.search.toLowerCase())
      );
    if (filter.status !== "All")
      temp = temp.filter((i) => i.status === filter.status);
    if (filter.mode !== "All")
      temp = temp.filter((i) => i.paymentMode === filter.mode);
    setFiltered(temp);
  }, [filter, invoices]);

  const totalAmt = filtered.reduce(
    (a, i) => a + i.items.reduce((s, x) => s + x.qty * x.rate, 0),
    0
  );
  const pendingAmt = filtered
    .filter((f) => f.status !== "Paid")
    .reduce((a, i) => a + i.items.reduce((s, x) => s + x.qty * x.rate, 0), 0);

  const lastInvoice = filtered.length
    ? filtered.sort((a, b) => new Date(b.date) - new Date(a.date))[0]
    : null;

  // ✅ Bulk Select
  const toggleSelect = (id) =>
    setSelected((p) =>
      p.includes(id) ? p.filter((x) => x !== id) : [...p, id]
    );

  const selectAll = () => setSelected(filtered.map((i) => i.id));
  const clearSel = () => setSelected([]);

  // ✅ Export Excel
  const exportExcel = (rows = invoices) => {
    const data = rows.map((inv) => ({
      InvoiceNo: inv.invoiceNo,
      Client: inv.client,
      Date: inv.date,
      Amount: inv.items.reduce((s, x) => s + x.qty * x.rate, 0),
      Status: inv.status,
      Payment: inv.paymentMode,
    }));
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Invoices");
    XLSX.writeFile(wb, "Billing_Report.xlsx");
  };

  // ✅ Export PDF
  const exportPDF = async (inv) => {
    const node = document.createElement("div");
    node.style.padding = "24px";
    node.innerHTML = invoiceTemplate(inv);
    document.body.appendChild(node);
    const canvas = await html2canvas(node);
    const pdf = new jsPDF();
    const img = canvas.toDataURL("image/png");
    pdf.addImage(img, "PNG", 0, 0, 210, (canvas.height * 210) / canvas.width);
    pdf.save(`${inv.invoiceNo}.pdf`);
    node.remove();
  };

  // ✅ Charts
  const clientWise = useMemo(() => {
    const map = {};
    invoices.forEach((i) => {
      map[i.client] =
        (map[i.client] || 0) +
        i.items.reduce((s, x) => s + x.qty * x.rate, 0);
    });
    return {
      labels: Object.keys(map),
      datasets: [
        {
          data: Object.values(map),
          backgroundColor: [
            "#60A5FA", "#34D399", "#FBBF24", "#F87171", "#8B5CF6", "#2DD4BF",
          ],
        },
      ],
    };
  }, [invoices]);

  const paymentPie = useMemo(() => {
    const map = {};
    invoices.forEach((i) => {
      map[i.paymentMode || "Cash"] =
        (map[i.paymentMode || "Cash"] || 0) +
        i.items.reduce((s, x) => s + x.qty * x.rate, 0);
    });
    return {
      labels: Object.keys(map),
      datasets: [{ data: Object.values(map), backgroundColor: ["#34D399", "#F87171", "#60A5FA", "#FBBF24", "#A855F7"] }],
    };
  }, [invoices]);

  // ✅ UI starts
  return (
    <div className="p-6 min-h-screen bg-gradient-to-br from-[#0A192F] via-[#112240] to-[#0A192F] text-gray-100">
      <div className="max-w-7xl mx-auto bg-[#1B2A4A] rounded-2xl p-6 border border-[#223355] shadow-2xl">

        {/* HEADER */}
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-[#64FFDA] flex items-center gap-2">
            💳 Billing Management System
          </h2>
          <div className="flex gap-2">
            <button
              onClick={() => { setShowForm(true); setEditing(null); }}
              className="bg-[#64FFDA] text-[#0A192F] px-3 py-2 rounded font-semibold flex items-center gap-2"
            >
              <Plus size={16} /> New Invoice
            </button>
            <button
              onClick={() => exportExcel()}
              className="bg-[#2563EB] px-3 py-2 rounded flex items-center gap-2"
            >
              <Download size={16} /> Export
            </button>
          </div>
        </div>

        {/* SUMMARY */}
        <div className="grid sm:grid-cols-2 md:grid-cols-5 gap-4 mb-6">
          <Card title="Total Invoices" value={filtered.length} />
          <Card title="Total Amount" value={fmt(totalAmt)} />
          <Card title="Pending Payments" value={fmt(pendingAmt)} />
          <Card title="Last Invoice" value={lastInvoice?.client || "-"} />
          <Card title="Payment Modes" value={[...new Set(invoices.map(i => i.paymentMode))].length} />
        </div>

        {/* FILTERS */}
        <div className="flex flex-wrap gap-3 mb-6 items-center">
          <div className="flex items-center bg-[#0D1B34] px-3 py-2 rounded-lg flex-1 md:flex-none">
            <Search size={16} className="text-[#64FFDA] mr-2" />
            <input
              placeholder="Search by client or invoice..."
              value={filter.search}
              onChange={(e) => setFilter({ ...filter, search: e.target.value })}
              className="bg-transparent outline-none w-full"
            />
          </div>
          <select
            value={filter.status}
            onChange={(e) => setFilter({ ...filter, status: e.target.value })}
            className="bg-[#0D1B34] px-3 py-2 rounded-lg"
          >
            {["All", "Paid", "Unpaid", "Partially Paid", "Cancelled"].map((s) => (
              <option key={s}>{s}</option>
            ))}
          </select>
          <select
            value={filter.mode}
            onChange={(e) => setFilter({ ...filter, mode: e.target.value })}
            className="bg-[#0D1B34] px-3 py-2 rounded-lg"
          >
            {["All", "Cash", "UPI", "Card", "Bank Transfer"].map((m) => (
              <option key={m}>{m}</option>
            ))}
          </select>
          <button onClick={selectAll} className="bg-[#2563EB]/80 px-3 py-2 rounded">
            Select All
          </button>
          <button onClick={clearSel} className="bg-[#334155]/80 px-3 py-2 rounded">
            Clear
          </button>
        </div>

        {/* FORM */}
        {showForm && (
          <InvoiceForm
            onSave={saveInvoice}
            onCancel={() => setShowForm(false)}
            data={editing}
          />
        )}

        {/* TABLE */}
        <div className="overflow-x-auto bg-[#0D1B34] rounded-lg border border-[#1E2D50] mb-8">
          <table className="min-w-full text-sm">
            <thead className="bg-[#132A4A] text-[#64FFDA]">
              <tr>
                <th>#</th>
                <th>Select</th>
                <th>Invoice No</th>
                <th>Client</th>
                <th>Date</th>
                <th>Amount</th>
                <th>Status</th>
                <th>Mode</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.slice(0, 20).map((inv, i) => (
                <tr
                  key={inv.id}
                  className={`hover:bg-[#1E2D50] ${i % 2 ? "bg-[#0A192F]" : "bg-[#112240]"}`}
                >
                  <td>{i + 1}</td>
                  <td>
                    <input
                      type="checkbox"
                      checked={selected.includes(inv.id)}
                      onChange={() => toggleSelect(inv.id)}
                    />
                  </td>
                  <td>{inv.invoiceNo}</td>
                  <td>{inv.client}</td>
                  <td>{inv.date}</td>
                  <td>{fmt(inv.items.reduce((s, x) => s + x.qty * x.rate, 0))}</td>
                  <td className={`font-semibold ${inv.status === "Paid"
                        ? "text-green-400"
                        : inv.status === "Partially Paid"
                          ? "text-yellow-300"
                          : "text-red-400"
                      }`}
                  >
                    {inv.status}
                  </td>
                  <td>{inv.paymentMode}</td>
                  <td className="flex gap-2 p-2">
                    <button onClick={() => { setEditing(inv); setShowForm(true); }}
                      className="bg-blue-600 p-1 rounded"><Edit3 size={14} /></button>
                    <button onClick={() => exportPDF(inv)}
                      className="bg-green-600 p-1 rounded"><Download size={14} /></button>
                    <button onClick={() => deleteInvoice(inv.id)}
                      className="bg-red-600 p-1 rounded"><Trash2 size={14} /></button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* ANALYTICS */}
        <div className="grid md:grid-cols-3 gap-4">
          <ChartCard title="Client-wise Distribution"><Pie data={clientWise} /></ChartCard>
          <ChartCard title="Payment Mode"><Doughnut data={paymentPie} /></ChartCard>
          <ChartCard title="Monthly Billing Trend"><Bar data={clientWise} /></ChartCard>
        </div>
      </div>
    </div>
  );
}

/* ------------------------------- COMPONENTS ------------------------------- */

function InvoiceForm({ onSave, onCancel, data }) {
  const [inv, setInv] = useState(
    data || {
      id: Date.now().toString(),
      invoiceNo: `INV-${Math.floor(Math.random() * 9000) + 1000}`,
      client: "",
      date: new Date().toISOString().slice(0, 10),
      items: [{ desc: "", qty: 1, rate: 0, tax: 18 }],
      paymentMode: "Cash",
      status: "Unpaid",
      notes: "",
    }
  );

  const addItem = () =>
    setInv({ ...inv, items: [...inv.items, { desc: "", qty: 1, rate: 0, tax: 18 }] });

  const updateItem = (i, key, val) => {
    const items = [...inv.items];
    items[i][key] = val;
    setInv({ ...inv, items });
  };

  const total = inv.items.reduce(
    (s, i) => s + i.qty * i.rate * (1 + i.tax / 100),
    0
  );

  return (
    <div className="p-4 bg-[#0B1E33] rounded-lg border border-[#1E2D45] mb-8 animate-fadeIn">
      <div className="flex flex-wrap gap-2 mb-3">
        <input
          placeholder="Client name"
          value={inv.client}
          onChange={(e) => setInv({ ...inv, client: e.target.value })}
          className="px-3 py-2 rounded bg-[#071427] border border-[#123049] flex-1"
        />
        <input
          type="date"
          value={inv.date}
          onChange={(e) => setInv({ ...inv, date: e.target.value })}
          className="px-3 py-2 rounded bg-[#071427] border border-[#123049]"
        />
      </div>

      {inv.items.map((it, i) => (
        <div key={i} className="grid grid-cols-12 gap-2 mb-2 items-center">
          <input
            placeholder="Description"
            value={it.desc}
            onChange={(e) => updateItem(i, "desc", e.target.value)}
            className="col-span-5 px-2 py-2 rounded bg-[#071427]"
          />
          <input
            type="number"
            value={it.qty}
            onChange={(e) => updateItem(i, "qty", Number(e.target.value))}
            className="col-span-2 px-2 py-2 rounded bg-[#071427]"
          />
          <input
            type="number"
            value={it.rate}
            onChange={(e) => updateItem(i, "rate", Number(e.target.value))}
            className="col-span-2 px-2 py-2 rounded bg-[#071427]"
          />
          <input
            type="number"
            value={it.tax}
            onChange={(e) => updateItem(i, "tax", Number(e.target.value))}
            className="col-span-2 px-2 py-2 rounded bg-[#071427]"
          />
        </div>
      ))}

      <button onClick={addItem} className="bg-[#2563EB] px-3 py-1 rounded mb-3">
        + Add Item
      </button>

      <div className="flex flex-wrap gap-2 mb-3">
        <select
          value={inv.paymentMode}
          onChange={(e) => setInv({ ...inv, paymentMode: e.target.value })}
          className="px-3 py-2 rounded bg-[#071427]"
        >
          {["Cash", "UPI", "Card", "Bank Transfer"].map((m) => (
            <option key={m}>{m}</option>
          ))}
        </select>
        <select
          value={inv.status}
          onChange={(e) => setInv({ ...inv, status: e.target.value })}
          className="px-3 py-2 rounded bg-[#071427]"
        >
          {["Unpaid", "Partially Paid", "Paid", "Cancelled"].map((s) => (
            <option key={s}>{s}</option>
          ))}
        </select>
      </div>

      <textarea
        placeholder="Notes or Terms..."
        value={inv.notes}
        onChange={(e) => setInv({ ...inv, notes: e.target.value })}
        className="w-full bg-[#071427] p-2 rounded mb-3"
      />

      <div className="flex justify-between items-center">
        <div className="text-[#64FFDA] font-semibold text-lg">
          Total: {fmt(total)}
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => onSave(inv)}
            className="bg-[#64FFDA] text-[#0A192F] px-3 py-2 rounded font-semibold"
          >
            Save
          </button>
          <button
            onClick={onCancel}
            className="bg-red-600 px-3 py-2 rounded text-white"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}

const Card = ({ title, value }) => (
  <div className="bg-[#112240] p-4 rounded-xl border border-[#223355] text-center">
    <div className="text-sm text-[#64FFDA]">{title}</div>
    <div className="text-xl font-bold mt-1">{value}</div>
  </div>
);

const ChartCard = ({ title, children }) => (
  <div className="bg-[#112240] p-4 rounded-xl border border-[#223355]">
    <h4 className="text-sm text-[#64FFDA] mb-2">{title}</h4>
    <div className="h-[200px]">{children}</div>
  </div>
);

function invoiceTemplate(inv) {
  const rows = inv.items
    .map(
      (i) =>
        `<tr><td>${i.desc}</td><td>${i.qty}</td><td>${i.rate}</td><td>${i.tax}%</td><td>${i.qty * i.rate * (1 + i.tax / 100)}</td></tr>`
    )
    .join("");
  return `<div style="font-family:sans-serif"><h2>${inv.invoiceNo}</h2><p>${inv.client}</p><table border="1" cellspacing="0" cellpadding="5" style="width:100%"><tr><th>Desc</th><th>Qty</th><th>Rate</th><th>Tax</th><th>Total</th></tr>${rows}</table></div>`;
}
