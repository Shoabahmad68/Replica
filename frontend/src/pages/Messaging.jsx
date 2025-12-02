// src/pages/Messaging.jsx
import React, { useEffect, useState, useRef } from "react";
import axios from "axios";
import Papa from "papaparse";
import { Line, Bar } from "react-chartjs-2";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  Filler // IMPORTANT: register filler plugin to avoid Chart warning
} from "chart.js";
import { Save, Send, RefreshCw, X, Play, Pause, Repeat } from "lucide-react";
import dayjs from "dayjs";
import jsPDF from "jspdf";
import "jspdf-autotable";
import config from "../config.js";


ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  Filler
);
// BACKEND URL FIX
const BACKEND_URL = window.location.hostname.includes("localhost")
  ? "http://127.0.0.1:8787"
  : "https://selt-t-backend.selt-3232.workers.dev";

/*
  Messaging.jsx
  - Both options: WhatsApp Web (QR) integration placeholder AND wa.me fallback
  - Data sources:
    - backend /api/imports/latest   (uploaded excel)
    - backend /api/outstanding      (if you implement route)
    - backend /api/billing/list     (optional)
    - custom CSV upload
    - manual entry
  - Template builder with variables (auto-detect from selected dataset's fields)
  - Preview, schedule send, rate-limit send, logs, retry, export logs, charts
  - No dummy data enforced — uses backend when available; falls back to in-memory arrays safely
*/

/* -------------- Helper utilities ---------------- */

const fmtINR = (v) =>
  typeof v === "number"
    ? `₹${v.toLocaleString("en-IN", { maximumFractionDigits: 0 })}`
    : v;

const safeArray = (x) => (Array.isArray(x) ? x : []);

// throttle send function wrapper (simple)
function throttleIterator(items, fn, perSecond = 20) {
  // returns promise resolves when all done
  const delay = Math.max(50, Math.floor(1000 / perSecond));
  let i = 0;
  return new Promise((resolve) => {
    function loop() {
      if (i >= items.length) return resolve();
      const end = Math.min(i + 1, items.length);
      const item = items[i++];
      Promise.resolve(fn(item)).finally(() => {
        setTimeout(loop, delay);
      });
    }
    loop();
  });
}

/* -------------- Main Component ---------------- */

export default function Messaging() {
  // data sources
  const [importsData, setImportsData] = useState([]); // from /api/imports/latest
  const [outstandingData, setOutstandingData] = useState([]); // from /api/outstanding (optional)
  const [billingData, setBillingData] = useState([]); // from /api/billing/list (optional)

  // UI state
  const [loading, setLoading] = useState(false);
  const [connectStatus, setConnectStatus] = useState("disconnected"); // disconnected | connected | qr
  const [qrImage, setQrImage] = useState(null);
  const [selectedSource, setSelectedSource] = useState("imports"); // imports | outstanding | billing | csv | manual
  const [previewRows, setPreviewRows] = useState([]); // currently displayed rows
  const [selectedRows, setSelectedRows] = useState(new Set());
  const [templates, setTemplates] = useState([]); // saved templates
  const [currentTemplateName, setCurrentTemplateName] = useState("");
  const [currentTemplateBody, setCurrentTemplateBody] = useState("");
  const [detectedVars, setDetectedVars] = useState([]);
  const [mappingPreview, setMappingPreview] = useState([]); // preview text per row
  const [logs, setLogs] = useState([]); // send logs array
  const [rateLimit, setRateLimit] = useState(20); // msgs per sec
  const [scheduleAt, setScheduleAt] = useState(""); // ISO string or empty
  const [sending, setSending] = useState(false);
  const [waFallbackEnabled, setWaFallbackEnabled] = useState(true); // wa.me fallback
  const [whatsappConnected, setWhatsappConnected] = useState(false); // frontend flag
  const [filterText, setFilterText] = useState("");
  const [chartData, setChartData] = useState({
    labels: [],
    sent: [],
    failed: [],
    pending: [],
  });
  const fileInputRef = useRef();
  const intervalRef = useRef(null);
  const previewRef = useRef(null);

  /* ----------------- Boot/load backend data ----------------- */

  useEffect(() => {
    loadAllSources();
    loadSavedTemplates();
    loadLogsFromBackend();
    // poll for whatsapp connection status (optional backend route)
    intervalRef.current = setInterval(checkWhatsAppStatus, 7000);
    return () => clearInterval(intervalRef.current);
  }, []);

async function loadAllSources() {
  setLoading(true);
  try {
    // ✅ imports (uploaded Excel)
    try {
      const res = await axios.get(`${BACKEND_URL}/api/imports/latest`, {
        headers: { "Content-Type": "application/json" },
      });
      const payload = res?.data?.data || res?.data?.rows || [];
      const clean = sanitizeRows(payload);
      setImportsData(clean);
      localStorage.setItem("messaging_imports", JSON.stringify(clean));
    } catch (err) {
      console.warn("imports load failed:", err.message);
      const saved = localStorage.getItem("messaging_imports");
      setImportsData(saved ? JSON.parse(saved) : []);
    }

    // ✅ outstanding (optional)
    try {
      const res2 = await axios.get(`${BACKEND_URL}/api/outstanding`, {
        headers: { "Content-Type": "application/json" },
      });
      const payload2 = res2?.data?.data || res2?.data || [];
      const clean2 = sanitizeRows(payload2);
      setOutstandingData(clean2);
      localStorage.setItem("messaging_outstanding", JSON.stringify(clean2));
    } catch (err) {
      console.warn("outstanding load failed:", err.message);
      const saved = localStorage.getItem("messaging_outstanding");
      setOutstandingData(saved ? JSON.parse(saved) : []);
    }

    // ✅ billing list (optional)
    try {
      const res3 = await axios.get(`${BACKEND_URL}/api/billing/list`, {
        headers: { "Content-Type": "application/json" },
      });
      const payload3 = res3?.data?.data || res3?.data || [];
      const clean3 = sanitizeRows(payload3);
      setBillingData(clean3);
      localStorage.setItem("messaging_billing", JSON.stringify(clean3));
    } catch (err) {
      console.warn("billing load failed:", err.message);
      const saved = localStorage.getItem("messaging_billing");
      setBillingData(saved ? JSON.parse(saved) : []);
    }
  } catch (err) {
    console.error("loadAllSources fatal:", err);
  } finally {
    setLoading(false);
    buildPreviewFromSource(selectedSource);
  }
}


  async function checkWhatsAppStatus() {
  try {
    const res = await axios.get(`${BACKEND_URL}/api/whatsapp/status`);

    if (res.data.connected) {
      setConnectStatus("connected");
      setQrImage(null);
      return;
    }

    if (res.data.qr) {
      setConnectStatus("qr");
      setQrImage(res.data.qr);
      return;
    }

    setConnectStatus("disconnected");
    setQrImage(null);
  } catch (err) {
    setConnectStatus("disconnected");
  }
}

// ---------- FIXED: Start WhatsApp QR ----------
const startWhatsAppQR = async () => {
  try {
    setConnectStatus("qr");

    const res = await axios.get(`${BACKEND_URL}/api/whatsapp/start`);

    if (res.data.qr) {
      setQrImage(res.data.qr);
    } else {
      alert("Already connected.");
      setConnectStatus("connected");
      setQrImage(null);
    }
  } catch (err) {
    alert("QR start failed");
    console.error(err);
  }
};

  // ---------- Refresh QR ----------
const refreshQR = async () => {
  try {
    const res = await axios.get(`${BACKEND_URL}/api/whatsapp/qr`);
    if (res.data.qr) setQrImage(res.data.qr);
  } catch (err) {
    console.error(err);
  }
};

  
  async function loadSavedTemplates() {
    // localStorage based templates
    const s = localStorage.getItem("messaging_templates_v1");
    if (s) {
      try {
        setTemplates(JSON.parse(s));
      } catch {
        setTemplates([]);
      }
    }
  }

  async function loadLogsFromBackend() {
    try {
      const res = await axios.get("/api/messaging/logs");
      const payload = res?.data?.logs || res?.data || [];
      // ensure array
      setLogs(Array.isArray(payload) ? payload : []);
      rebuildCharts(Array.isArray(payload) ? payload : []);
    } catch (err) {
      // start empty
      setLogs([]);
      rebuildCharts([]);
    }
  }

  /* ----------------- Helpers ----------------- */

  function sanitizeRows(rows) {
    if (!Array.isArray(rows)) return [];
    // remove trailing total rows (case-insensitive check for strings that include 'total')
    return rows.filter((r) => {
      try {
        const joined = Object.values(r).join(" ").toLowerCase();
        if (/total|grand total|grandtotal|overall total|sub total|subtotal/.test(joined)) return false;
        // ensure not completely empty
        if (Object.values(r).every((v) => v === null || v === undefined || String(v).trim() === "")) return false;
        return true;
      } catch {
        return true;
      }
    });
  }

  function getCurrentSourceArray(src) {
    if (src === "imports") return importsData;
    if (src === "outstanding") return outstandingData;
    if (src === "billing") return billingData;
    if (src === "csv") return previewRows; // previewRows holds parsed CSV
    return previewRows; // manual fallback
  }

  /* ----------------- Preview / select rows ----------------- */

  function buildPreviewFromSource(src = selectedSource) {
    const arr = getCurrentSourceArray(src) || [];
    // default preview 20 rows
    const cleaned = safeArray(arr).slice(0, 20);
    setPreviewRows(cleaned);
    setSelectedRows(new Set());
    detectVariables(cleaned);
    buildMappingPreview(cleaned);
  }

  function detectVariables(rows) {
    // detect keys from top row(s)
    const keys = new Set();
    (rows || []).slice(0, 5).forEach((r) => {
      Object.keys(r || {}).forEach((k) => keys.add(String(k)));
    });
    setDetectedVars(Array.from(keys));
    return Array.from(keys);
  }

  function handleSourceChange(e) {
    const val = e.target.value;
    setSelectedSource(val);
    setFilterText("");
    // If switching to backend sources, ensure data is loaded
    if (["imports", "outstanding", "billing"].includes(val)) {
      buildPreviewFromSource(val);
    } else {
      setPreviewRows([]); // reset until CSV/manual uploaded
    }
  }

  function toggleSelectRow(index) {
    const s = new Set(selectedRows);
    if (s.has(index)) s.delete(index);
    else s.add(index);
    setSelectedRows(s);
  }

  function selectAllPreview() {
    setSelectedRows(new Set(previewRows.map((_, i) => i)));
  }

  function clearSelection() {
    setSelectedRows(new Set());
  }

  /* ----------------- Template Builder ----------------- */

  function saveTemplate() {
    const tpl = {
      id: Date.now(),
      name: currentTemplateName || `Template ${new Date().toLocaleString()}`,
      body: currentTemplateBody,
      createdAt: new Date().toISOString(),
    };
    const newList = [tpl, ...templates];
    setTemplates(newList);
    localStorage.setItem("messaging_templates_v1", JSON.stringify(newList));
    setCurrentTemplateName("");
    setCurrentTemplateBody("");
    alert("Template saved ✅");
  }

  function applyTemplate(tpl) {
    setCurrentTemplateName(tpl.name);
    setCurrentTemplateBody(tpl.body);
    buildMappingPreview(previewRows, tpl.body);
  }

  function deleteTemplate(id) {
    const filtered = templates.filter((t) => t.id !== id);
    setTemplates(filtered);
    localStorage.setItem("messaging_templates_v1", JSON.stringify(filtered));
  }

  /* ----------------- Mapping / Preview ----------------- */

  function buildMappingPreview(rows = previewRows, template = currentTemplateBody) {
    // ensure template exists
    const body = template || currentTemplateBody || "";
    const map = (r) => {
      // find variables {{var}}
      const replaced = body.replace(/{{\s*([^}]+)\s*}}/g, (m, key) => {
        const k = key.trim();
        if (r && r[k] !== undefined && r[k] !== null) return String(r[k]);
        // try case-insensitive match
        const found = Object.keys(r || {}).find((x) => x.toLowerCase() === k.toLowerCase());
        if (found) return String(r[found]);
        return "";
      });
      return replaced;
    };

    const out = (rows || []).map((r) => ({
      message: body ? map(r) : "",
      to: r["Phone"] || r["Mobile"] || r["Number"] || r["Contact"] || r["Phone No"] || r["Mob"] || "",
      row: r,
    }));
    setMappingPreview(out);
    return out;
  }

  useEffect(() => {
    // whenever previewRows or template changes update mapping preview
    buildMappingPreview(previewRows);
  }, [previewRows, currentTemplateBody]);

  /* ----------------- CSV Upload / Manual Entry ----------------- */

  function handleCSVFile(e) {
    const f = e.target.files?.[0];
    if (!f) return;
    Papa.parse(f, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        const parsed = sanitizeRows(results.data);
        setPreviewRows(parsed);
        setSelectedSource("csv");
        detectVariables(parsed);
        buildMappingPreview(parsed);
      },
      error: (err) => {
        alert("CSV parse error: " + err.message);
      },
    });
  }

  function addManualRow(obj) {
    const newRows = [obj, ...previewRows];
    setPreviewRows(newRows);
    detectVariables(newRows);
    buildMappingPreview(newRows);
  }

  /* ----------------- WhatsApp Connect (QR) & send endpoints ----------------- */

    async function stopWhatsAppSession() {
    try {
      await axios.post("/api/whatsapp/stop");
      setConnectStatus("disconnected");
      setQrImage(null);
      setWhatsappConnected(false);
    } catch {
      // ignore
    }
  }

  /* ----------------- Send logic: one message ----------------- */

  async function sendOne({ to, message, meta = {} }) {
    // to: phone in various formats; we try to normalize
    // meta: { sourceRow, templateId }
    // prefer backend WhatsApp send if connected; otherwise fallback to wa.me open
    const logEntry = {
      id: Date.now() + Math.random(),
      to,
      message,
      meta,
      status: "pending",
      time: new Date().toISOString(),
      error: null,
    };

    // append to logs UI immediately (optimistic)
    setLogs((s) => [logEntry, ...(Array.isArray(s) ? s : [])]);

    try {
      // Check whatsapp connection via backend
      const statusRes = await axios.get("/api/whatsapp/status");
      const connected = !!statusRes?.data?.connected;

      if (connected) {
        // send via backend API which uses whatsapp-web.js or cloud API
        const res = await axios.post("/api/whatsapp/send", {
          to,
          message,
          meta,
        });
        if (res.data?.success) {
          // update log
          updateLogStatus(logEntry.id, "sent");
          return { ok: true, id: logEntry.id };
        } else {
          updateLogStatus(logEntry.id, "failed", res.data?.error || "unknown");
          return { ok: false, id: logEntry.id };
        }
      } else {
        // fallback wa.me: open new window (user will send manually) - treat as 'opened'
        if (waFallbackEnabled) {
          const normalized = normalizePhoneForWa(to);
          const url = `https://wa.me/${normalized}?text=${encodeURIComponent(message)}`;
          // open small window
          window.open(url, "_blank");
          updateLogStatus(logEntry.id, "opened");
          return { ok: true, id: logEntry.id };
        } else {
          updateLogStatus(logEntry.id, "failed", "No WA connection and fallback disabled");
          return { ok: false, id: logEntry.id };
        }
      }
    } catch (err) {
      console.error("sendOne error", err?.message || err);
      updateLogStatus(logEntry.id, "failed", err?.message || "send error");
      return { ok: false, id: logEntry.id };
    }
  }

  function normalizePhoneForWa(num) {
    if (!num) return "";
    // remove non-digits
    const digits = String(num).replace(/\D/g, "");
    // if starts with 0 remove and prepend country code? (Assume India '91' if length 10)
    if (digits.length === 10) return "91" + digits;
    return digits;
  }

  function updateLogStatus(id, status, error = null) {
    setLogs((old) =>
      (Array.isArray(old) ? old : []).map((l) => {
        if (l.id === id) {
          return { ...l, status, error, time: new Date().toISOString() };
        }
        return l;
      })
    );
    rebuildCharts(logs); // trigger chart rebuild (pass current logs)
  }

  /* ----------------- Bulk send (rate limit + schedule + selection) ----------------- */

  async function startBulkSend({ useSelected = true, askConfirm = true }) {
    const rows = previewRows || [];
    if (!rows.length) {
      alert("No rows to send.");
      return;
    }
    const indices = useSelected ? Array.from(selectedRows) : rows.map((_, i) => i);
    if (!indices.length) {
      alert("No rows selected. Select rows or choose send to all.");
      return;
    }

    // build payloads
    const payloads = indices.map((i) => {
      const row = rows[i];
      const to =
        (row && (row["Phone"] || row["Mobile"] || row["Number"] || row["Contact"])) || "";
      // build message using template mapping
      const mapped = buildMappingPreview([row], currentTemplateBody)[0];
      return {
        to: normalizePhoneForWa(to),
        message: mapped?.message || currentTemplateBody || "",
        row,
      };
    });

    if (askConfirm) {
      if (!window.confirm(`Send ${payloads.length} messages? Rate ${rateLimit}/sec`)) return;
    }

    // schedule or immediate
    const scheduleTime = scheduleAt ? new Date(scheduleAt) : null;
    const now = new Date();
    if (scheduleTime && scheduleTime > now) {
      const ms = scheduleTime - now;
      setSending(true);
      setTimeout(() => {
        runBulkSend(payloads);
      }, ms);
      return;
    }
    // immediate
    setSending(true);
    await runBulkSend(payloads);
  }

  async function runBulkSend(payloads) {
    try {
      // iterate with throttle
      await throttleIterator(payloads, async (p) => {
        // sendOne returns { ok, id }
        await sendOne({ to: p.to, message: p.message, meta: { row: p.row } });
      }, rateLimit);
    } catch (err) {
      console.error("runBulkSend:", err);
    } finally {
      setSending(false);
      // store logs to backend for persistence
      try {
        await axios.post("/api/messaging/logs/save", { logs: logs });
      } catch {}
      rebuildCharts((Array.isArray(logs) ? logs : []));
    }
  }

  /* ----------------- Retry / Export / Clear logs ----------------- */

  async function retryLog(id) {
    const entry = (logs || []).find((x) => x.id === id);
    if (!entry) return;
    await sendOne({ to: entry.to, message: entry.message, meta: entry.meta });
  }

  function exportLogsCSV() {
    const csv = [
      ["id", "to", "status", "time", "error", "message"].join(","),
      ...((logs || []).map((l) =>
        [l.id, `"${l.to}"`, l.status, l.time, `"${(l.error || "").replace(/"/g, '""')}"`, `"${(l.message || "").replace(/"/g, '""')}"`].join(",")
      )),
    ].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `messaging_logs_${Date.now()}.csv`;
    a.click();
  }

  function exportLogsPDF() {
    const doc = new jsPDF();
    doc.text("Messaging Logs", 14, 12);
    doc.autoTable({
      head: [["To", "Status", "Time", "Error"]],
      body: logs.slice(0,200).map((l) => [l.to, l.status, l.time, l.error || ""]),
      startY: 18,
      styles: { fontSize: 8 },
    });
    doc.save("messaging_logs.pdf");
  }

  function clearAllLogsLocal() {
    if (!window.confirm("Clear local logs? This does not affect backend persisted logs.")) return;
    setLogs([]);
    rebuildCharts([]);
  }

  /* ----------------- Charts ----------------- */

  function rebuildCharts(srcLogs = logs) {
    const arr = Array.isArray(srcLogs) ? srcLogs : [];
    // group by date day
    const countsByDay = {};
    arr.forEach((l) => {
      const d = dayjs(l.time).format("YYYY-MM-DD");
      if (!countsByDay[d]) countsByDay[d] = { sent: 0, failed: 0, pending: 0 };
      if (l.status === "sent" || l.status === "opened") countsByDay[d].sent++;
      else if (l.status === "failed") countsByDay[d].failed++;
      else countsByDay[d].pending++;
    });
    const labels = Object.keys(countsByDay).sort();
    const sent = labels.map((d) => countsByDay[d].sent || 0);
    const failed = labels.map((d) => countsByDay[d].failed || 0);
    const pending = labels.map((d) => countsByDay[d].pending || 0);
    setChartData({ labels, sent, failed, pending });
  }

  useEffect(() => {
    rebuildCharts(logs);
  }, [logs]);

  /* ----------------- UI Rendering ----------------- */

  return (
    <div className="p-6 min-h-screen bg-gradient-to-br from-[#0A192F] via-[#112240] to-[#0A192F] text-gray-100">
      <div className="max-w-7xl mx-auto bg-[#1B2A4A] rounded-2xl shadow-2xl border border-[#223355] p-6 space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <h2 className="text-2xl font-bold text-[#64FFDA] flex items-center gap-2">
            📬 Messaging — Bulk WhatsApp System
          </h2>
          <div className="flex items-center gap-3">
            <button
              onClick={() => startWhatsAppQR()}
              className="px-3 py-2 bg-[#64FFDA] text-[#0A192F] rounded font-semibold"
            >
              QR Connect
            </button>
            <button
              onClick={() => checkWhatsAppStatus()}
              className="px-3 py-2 bg-[#334155] rounded text-white"
            >
              Refresh Status
            </button>
            <div className={`px-3 py-2 rounded ${connectStatus === "connected" ? "bg-green-600" : connectStatus === "qr" ? "bg-yellow-600" : "bg-gray-700"}`}>
              {connectStatus === "connected" ? "Connected" : connectStatus === "qr" ? "Scan QR" : "Disconnected"}
            </div>
          </div>
        </div>

        {/* Top Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <div className="bg-[#112240] rounded-xl p-4">
            <p className="text-sm text-gray-300">Total Sent Today</p>
            <h3 className="text-xl font-bold text-white">{(logs || []).filter(l => dayjs(l.time).isSame(dayjs(), 'day') && (l.status === 'sent' || l.status === 'opened')).length}</h3>
          </div>
          <div className="bg-[#112240] rounded-xl p-4">
            <p className="text-sm text-gray-300">Pending Messages</p>
            <h3 className="text-xl font-bold text-white">{(logs || []).filter(l => l.status === 'pending').length}</h3>
          </div>
          <div className="bg-[#112240] rounded-xl p-4">
            <p className="text-sm text-gray-300">Failed Deliveries</p>
            <h3 className="text-xl font-bold text-white">{(logs || []).filter(l => l.status === 'failed').length}</h3>
          </div>
          <div className="bg-[#112240] rounded-xl p-4">
            <p className="text-sm text-gray-300">Last Campaign</p>
            <h3 className="text-xl font-bold text-white">{(logs || [])[0]?.time ? dayjs((logs || [])[0].time).format("DD MMM, YYYY HH:mm") : "—"}</h3>
          </div>
          <div className="bg-[#112240] rounded-xl p-4">
            <p className="text-sm text-gray-300">WhatsApp Status</p>
            <h3 className="text-xl font-bold text-white">{connectStatus}</h3>
          </div>
        </div>

        {/* Data source + filter + actions */}
        <div className="bg-[#0F1E33] p-4 rounded-xl border border-[#1E2D45]">
          <div className="flex gap-4 flex-wrap items-center">
            <label className="text-sm text-[#64FFDA] font-semibold">Data Source:</label>
            <select value={selectedSource} onChange={handleSourceChange} className="bg-[#112240] text-white px-3 py-2 rounded">
              <option value="imports">Uploaded Reports (Imports)</option>
              <option value="outstanding">Outstanding (Backend)</option>
              <option value="billing">Billing (Backend)</option>
              <option value="csv">Upload CSV</option>
              <option value="manual">Manual Entry</option>
            </select>

            {/* CSV upload */}
            {selectedSource === "csv" && (
              <div className="flex items-center gap-2">
                <input ref={fileInputRef} type="file" accept=".csv,.xlsx,.xls" onChange={handleCSVFile} className="text-sm text-gray-400" />
                <button onClick={() => fileInputRef.current?.click()} className="px-3 py-2 bg-[#2563EB] rounded text-white">Choose CSV</button>
              </div>
            )}

            {/* Manual entry quick add (simple JSON textarea) */}
            {selectedSource === "manual" && (
              <ManualAdd onAdd={(obj) => addManualRow(obj)} />
            )}

            <div className="flex-1" />

            <input value={filterText} onChange={(e) => setFilterText(e.target.value)} placeholder="Search preview..." className="px-3 py-2 rounded bg-[#112240] text-white w-60" />
            <button onClick={() => buildPreviewFromSource(selectedSource)} className="px-3 py-2 bg-[#059669] rounded text-white">Load Preview</button>
            <button onClick={() => selectAllPreview()} className="px-3 py-2 bg-[#334155] rounded text-white">Select All</button>
            <button onClick={() => clearSelection()} className="px-3 py-2 bg-[#6B7280] rounded text-white">Clear</button>
          </div>
        </div>

        {/* Template builder + templates list */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="bg-[#0F1E33] p-4 rounded-xl">
            <h4 className="text-[#64FFDA] font-semibold mb-2">📝 Template Builder</h4>
            <input value={currentTemplateName} onChange={(e)=>setCurrentTemplateName(e.target.value)} placeholder="Template name" className="w-full px-3 py-2 mb-2 rounded bg-[#10263B]" />
            <textarea value={currentTemplateBody} onChange={(e)=>setCurrentTemplateBody(e.target.value)} rows={6} placeholder="Write message with variables e.g. Hello {{Party Name}}, your invoice {{Vch No}} is due." className="w-full px-3 py-2 rounded bg-[#10263B]" />
            <div className="flex gap-2 mt-2">
              <button onClick={() => saveTemplate()} className="px-3 py-2 bg-[#059669] rounded text-white"><Save size={16}/> Save</button>
              <button onClick={() => buildMappingPreview(previewRows)} className="px-3 py-2 bg-[#2563EB] rounded text-white"><RefreshCw size={16}/> Preview</button>
              <button onClick={() => { setCurrentTemplateBody(""); setCurrentTemplateName(""); }} className="px-3 py-2 bg-[#6B7280] rounded text-white"><X size={16}/> Clear</button>
            </div>
            <div className="mt-3 text-sm text-gray-300">
              Detected Fields: {detectedVars.join(", ")}
            </div>
          </div>

          <div className="bg-[#0F1E33] p-4 rounded-xl lg:col-span-2">
            <div className="flex justify-between items-center mb-2">
              <h4 className="text-[#64FFDA] font-semibold">Templates</h4>
              <div className="text-sm text-gray-300">Click to apply</div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-48 overflow-auto pb-2">
              {(templates || []).map((t) => (
                <div key={t.id} className="bg-[#10263B] p-3 rounded flex justify-between items-start">
                  <div>
                    <div className="text-white font-semibold">{t.name}</div>
                    <div className="text-sm text-gray-300 truncate max-w-xl">{t.body}</div>
                    <div className="text-xs text-gray-400">{dayjs(t.createdAt).format("DD MMM YYYY HH:mm")}</div>
                  </div>
                  <div className="flex flex-col gap-2">
                    <button onClick={() => applyTemplate(t)} className="px-2 py-1 bg-[#059669] rounded text-white text-sm">Apply</button>
                    <button onClick={() => { if(window.confirm("Delete template?")) deleteTemplate(t.id); }} className="px-2 py-1 bg-[#ef4444] rounded text-white text-sm">Delete</button>
                  </div>
                </div>
              ))}
              {(!templates || templates.length === 0) && <div className="text-gray-400">No templates saved yet.</div>}
            </div>
          </div>
        </div>

        {/* Preview table + mapping preview + send panel */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Preview rows */}
          <div className="bg-[#0F1E33] p-4 rounded-xl lg:col-span-2">
            <div className="flex justify-between items-center mb-2">
              <h4 className="text-[#64FFDA]">Preview (first 20 rows)</h4>
              <div className="text-sm text-gray-300">{previewRows?.length || 0} rows</div>
            </div>

            <div className="overflow-auto max-h-72 border rounded border-[#1E2D45]">
              <table className="min-w-full text-sm">
                <thead className="bg-[#10263B] text-[#64FFDA] sticky top-0">
                  <tr>
                    <th className="px-2 py-2">#</th>
                    <th className="px-2 py-2">Select</th>
                    <th className="px-3 py-2">To</th>
                    <th className="px-3 py-2">Preview</th>
                  </tr>
                </thead>
                <tbody>
                  {previewRows && previewRows.length === 0 && (
                    <tr><td colSpan={4} className="text-center p-4 text-gray-400">No preview rows</td></tr>
                  )}
                  {previewRows && previewRows.map((r, i) => {
                    // filter by search
                    if (filterText && JSON.stringify(r).toLowerCase().indexOf(filterText.toLowerCase()) === -1) return null;
                    const to = r["Phone"] || r["Mobile"] || r["Number"] || r["Contact"] || r["To"] || "";
                    const mapped = mappingPreview[i] ? mappingPreview[i].message : currentTemplateBody ? fillTemplate(currentTemplateBody, r) : "";
                    const checked = selectedRows.has(i);
                    return (
                      <tr key={i} className={`${i%2===0? "bg-[#0F1E33]":"bg-[#11283A]"} hover:bg-[#15324A]`}>
                        <td className="px-2 py-2 text-gray-300">{i+1}</td>
                        <td className="px-2 py-2">
                          <input type="checkbox" checked={checked} onChange={()=>toggleSelectRow(i)} />
                        </td>
                        <td className="px-3 py-2 text-white">{to}</td>
                        <td className="px-3 py-2 text-gray-200">{mapped}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Send panel */}
          <div className="bg-[#0F1E33] p-4 rounded-xl">
            <h4 className="text-[#64FFDA] mb-2">🟢 Send Panel</h4>

            <div className="mb-2">
              <label className="text-sm text-gray-300">Rate limit (messages/sec)</label>
              <input type="number" value={rateLimit} onChange={(e)=>setRateLimit(Number(e.target.value||1))} min={1} max={200} className="w-full px-2 py-2 rounded bg-[#112240] mt-1" />
            </div>

            <div className="mb-2">
              <label className="text-sm text-gray-300">Schedule (optional)</label>
              <input type="datetime-local" value={scheduleAt} onChange={(e)=>setScheduleAt(e.target.value)} className="w-full px-2 py-2 rounded bg-[#112240] mt-1" />
            </div>

            <div className="mb-2">
              <label className="text-sm text-gray-300">Fallback to wa.me when not connected</label>
              <div className="flex items-center gap-2 mt-1">
                <input type="checkbox" checked={waFallbackEnabled} onChange={(e)=>setWaFallbackEnabled(e.target.checked)} />
                <span className="text-sm text-gray-300">Enable wa.me fallback</span>
              </div>
            </div>

            <div className="flex gap-2 mt-3">
              <button onClick={()=>startBulkSend({ useSelected: true })} disabled={sending} className="flex items-center gap-2 px-3 py-2 bg-[#059669] rounded text-white">
                <Send size={16}/> Send Selected
              </button>
              <button onClick={()=>startBulkSend({ useSelected: false })} disabled={sending} className="flex items-center gap-2 px-3 py-2 bg-[#2563EB] rounded text-white">
                <Play size={16}/> Send All (Preview)
              </button>
            </div>

            <div className="mt-4">
              <h5 className="text-[#64FFDA]">Quick Actions</h5>
              <div className="flex gap-2 mt-2">
                <button onClick={()=>exportLogsCSV()} className="px-2 py-1 bg-[#334155] rounded text-white">Export Logs CSV</button>
                <button onClick={()=>exportLogsPDF()} className="px-2 py-1 bg-[#334155] rounded text-white">Export Logs PDF</button>
                <button onClick={()=>clearAllLogsLocal()} className="px-2 py-1 bg-[#ef4444] rounded text-white">Clear Logs</button>
              </div>
            </div>

            <div className="mt-4 text-sm text-gray-300">
              <strong>Note:</strong> Actual send uses backend API <code>/api/whatsapp/send</code>. If backend not connected, wa.me will open a new tab for manual send.
            </div>
          </div>
        </div>

        {/* Logs + Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="bg-[#0F1E33] p-4 rounded-xl lg:col-span-2">
            <div className="flex justify-between items-center mb-2">
              <h4 className="text-[#64FFDA]">Logs</h4>
              <div className="text-sm text-gray-400">{(logs || []).length} items</div>
            </div>

            <div className="overflow-auto max-h-52 border rounded border-[#1E2D45]">
              <table className="min-w-full text-sm">
                <thead className="bg-[#10263B] text-[#64FFDA] sticky top-0">
                  <tr>
                    <th className="px-2 py-2">To</th>
                    <th className="px-2 py-2">Status</th>
                    <th className="px-2 py-2">Time</th>
                    <th className="px-2 py-2">Error</th>
                    <th className="px-2 py-2">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {(logs || []).slice(0, 200).map((l) => (
                    <tr key={l.id} className={`${l.status==="failed" ? "bg-[#2b0710]" : l.status==="sent" ? "bg-[#071a0b]" : "bg-[#0b1220]"}`}>
                      <td className="px-2 py-2 text-sm text-white">{l.to}</td>
                      <td className="px-2 py-2 text-sm">{l.status}</td>
                      <td className="px-2 py-2 text-sm">{dayjs(l.time).format("DD MMM, HH:mm")}</td>
                      <td className="px-2 py-2 text-sm text-red-300">{l.error || "-"}</td>
                      <td className="px-2 py-2">
                        <button onClick={()=>retryLog(l.id)} className="px-2 py-1 bg-[#059669] rounded text-white text-xs">Retry</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="bg-[#0F1E33] p-4 rounded-xl">
            <h4 className="text-[#64FFDA]">Charts</h4>
            <div className="h-36">
              <Bar
                data={{
                  labels: chartData.labels,
                  datasets: [
                    { label: "Sent", data: chartData.sent, backgroundColor: "#10B981" },
                    { label: "Failed", data: chartData.failed, backgroundColor: "#EF4444" },
                    { label: "Pending", data: chartData.pending, backgroundColor: "#F59E0B" },
                  ],
                }}
                options={{ maintainAspectRatio: false, plugins: { legend: { labels: { color: "#fff" } } }, scales: { x: { ticks: { color: "#9CA3AF" } }, y: { ticks: { color: "#9CA3AF" } } } }}
              />
            </div>
          </div>
        </div>

        {connectStatus === "qr" && qrImage && (
  <div className="fixed bottom-6 right-6 bg-[#0B1220] p-4 rounded shadow-lg border border-[#1E2D45] z-50">
    <div className="text-sm text-gray-300 mb-2">Scan QR to connect WhatsApp</div>

    <img src={qrImage} alt="qr" className="w-48 h-48 object-contain" />

    <div className="mt-3 flex gap-2">
      <button
        onClick={refreshQR}
        className="px-3 py-1 bg-[#059669] rounded text-white text-sm"
      >
        Refresh QR
      </button>

      <button
        onClick={stopWhatsAppSession}
        className="px-3 py-1 bg-red-600 rounded text-white text-sm"
      >
        Close
      </button>
    </div>
  </div>
)}


/* -------------- Helper smaller components & funcs -------------- */

function ManualAdd({ onAdd }) {
  const [jsonText, setJsonText] = useState(`{"Party Name":"Demo","Phone":"919999999999","Amount":"1000"}`);
  const handleAdd = () => {
    try {
      const obj = JSON.parse(jsonText);
      onAdd(obj);
      alert("Row added to preview");
    } catch (err) {
      alert("Invalid JSON");
    }
  };
  return (
    <div className="bg-[#071527] p-3 rounded">
      <div className="text-sm text-gray-300">Quick JSON row</div>
      <textarea rows={3} value={jsonText} onChange={(e)=>setJsonText(e.target.value)} className="w-72 px-2 py-2 rounded bg-[#0F2436] text-sm mt-2" />
      <div className="mt-2">
        <button onClick={handleAdd} className="px-2 py-1 bg-[#059669] rounded text-white text-sm">Add Row</button>
      </div>
    </div>
  );
}

// fillTemplate: simple function to replace {{var}} with row values
function fillTemplate(template, row) {
  if (!template) return "";
  return template.replace(/{{\s*([^}]+)\s*}}/g, (m, key) => {
    const k = key.trim();
    if (!row) return "";
    // case-insensitive key match
    const exact = Object.keys(row).find(x => x === k);
    if (exact) return String(row[exact] ?? "");
    const found = Object.keys(row).find(x => x.toLowerCase() === k.toLowerCase());
    if (found) return String(row[found] ?? "");
    return "";
  });
}
