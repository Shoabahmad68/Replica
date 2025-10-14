// server.js (fixed)
// NOTE: Requires: npm i whatsapp-web.js qrcode xml2js chokidar axios multer xlsx express cors

import express from "express";
import cors from "cors";
import multer from "multer";
import xlsx from "xlsx";
import fs from "fs";
import path from "path";
import axios from "axios";
import importRoutes from "./routes/import.js";
import billingRoutes from "./routes/billing.js";

// server.js imports area (existing routes)
import authRoutes from "./routes/auth.js";
import userRoutes from "./routes/users.js";
import roleRoutes from "./routes/roles.js";
import logRoutes from "./routes/logs.js";
import inviteRoutes from "./routes/invites.js";

// messaging / whatsapp imports
import qrcode from "qrcode";
import pkg from "whatsapp-web.js";
const { Client, LocalAuth } = pkg;
import whatsappRoutes from "./routes/whatsapp.js";
import tallyRoute from "./routes/tallyRoute.js";

// watcher & xml parser
import chokidar from "chokidar";
import xml2js from "xml2js";

const app = express();

// ========== Basic Middleware ==========
app.use(cors());
app.use(express.json());

// ========== Existing route mounts (keep unchanged) ==========
app.use("/api", tallyRoute);
app.use("/api/imports", importRoutes);
app.use("/api/billing", billingRoutes);
app.use("/api/whatsapp", whatsappRoutes);
app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);
app.use("/api/roles", roleRoutes);
app.use("/api/logs", logRoutes);
app.use("/api/invites", inviteRoutes);

// ========== Upload Excel endpoint (kept) ==========
const upload = multer({ dest: "uploads/" });
app.post("/api/upload", upload.single("file"), (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ message: "No file uploaded" });

    const filePath = path.resolve(req.file.path);
    const workbook = xlsx.readFile(filePath);
    const sheetName = workbook.SheetNames[0];
    const data = xlsx.utils.sheet_to_json(workbook.Sheets[sheetName]);
    fs.unlinkSync(filePath);
    return res.json({ success: true, rows: data.length, data });
  } catch (err) {
    console.error("Error processing file:", err);
    return res.status(500).json({ message: "Error reading Excel file" });
  }
});

/* -------------------------
   TALLY API section
   ------------------------- */
const TALLY_IP = process.env.TALLY_IP || "https://undefinitive-remonstrantly-mari.ngrok-free.dev";
const TALLY_PORT = process.env.TALLY_PORT || "";
const TALLY_URL = `${TALLY_IP}${TALLY_PORT ? `:${TALLY_PORT}` : ""}`;

async function sendToTally(xmlBody) {
  try {
    const response = await axios.post(TALLY_URL, xmlBody, {
      headers: { "Content-Type": "text/xml" },
      timeout: 10000,
    });
    return response.data;
  } catch (err) {
    console.error("❌ Error connecting to Tally:", err.message || err);
    throw new Error("Failed to connect to Tally server");
  }
}

app.get("/api/tally/sales", async (req, res) => {
  const xml = `...`; // keep your original xml
  try {
    const tallyResponse = await sendToTally(xml);
    res.set("Content-Type", "application/xml");
    return res.send(tallyResponse);
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

app.get("/api/tally/ledgers", async (req, res) => {
  const xml = `...`; // keep your original xml
  try {
    const tallyResponse = await sendToTally(xml);
    res.set("Content-Type", "application/xml");
    return res.send(tallyResponse);
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

app.get("/api/tally/test", async (req, res) => {
  try {
    const xml = `...`;
    const response = await sendToTally(xml);
    res.set("Content-Type", "application/xml");
    return res.send(response);
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
});

/* -------------------------
   MESSAGING / WHATSAPP SECTION
   ------------------------- */

const messagesDir = path.join(process.cwd(), "backend", "data", "messages");
if (!fs.existsSync(messagesDir)) fs.mkdirSync(messagesDir, { recursive: true });

let whatsappClient = null;
let qrCodeData = null;
let isWhatsAppReady = false;

function initWhatsApp() {
  if (whatsappClient) {
    try { whatsappClient.destroy(); } catch (e) { /* ignore */ }
    whatsappClient = null;
    isWhatsAppReady = false;
    qrCodeData = null;
  }

  whatsappClient = new Client({
    authStrategy: new LocalAuth({ dataPath: path.join(process.cwd(), ".wwebjs_auth") }),
    puppeteer: { headless: true, args: ["--no-sandbox", "--disable-setuid-sandbox"] },
    restartOnAuthFail: true,
  });

  whatsappClient.on("qr", (qr) => {
    // convert qr to dataURL promise style, set qrCodeData
    qrcode.toDataURL(qr).then((url) => {
      qrCodeData = url;
      console.log("QR generated for WhatsApp (base64 dataURL).");
    }).catch((e) => {
      console.warn("QR toDataURL err:", e);
    });
  });

  whatsappClient.on("ready", () => {
    console.log("✅ WhatsApp ready");
    isWhatsAppReady = true;
    qrCodeData = null;
  });

  whatsappClient.on("auth_failure", (msg) => {
    console.warn("WhatsApp auth failure:", msg);
    isWhatsAppReady = false;
    // clear saved session so LocalAuth can try again
  });

  whatsappClient.on("disconnected", (reason) => {
    console.warn("WhatsApp disconnected:", reason);
    isWhatsAppReady = false;
    // attempt to re-init after short delay
    setTimeout(() => initWhatsApp(), 5000);
  });

  whatsappClient.initialize().catch((e) => {
    console.error("init WA err", e);
    // try again later
    setTimeout(() => initWhatsApp(), 5000);
  });
}
initWhatsApp();

app.get("/api/messaging/status", (req, res) => {
  return res.json({ connected: isWhatsAppReady, qr: isWhatsAppReady ? null : qrCodeData });
});

app.post("/api/messaging/save-log", (req, res) => {
  try {
    const body = req.body || {};
    const file = path.join(messagesDir, "logs.json");
    let logs = [];
    if (fs.existsSync(file)) logs = JSON.parse(fs.readFileSync(file));
    logs.unshift({ ...body, time: new Date().toISOString() });
    if (logs.length > 2000) logs = logs.slice(0,2000);
    fs.writeFileSync(file, JSON.stringify(logs, null, 2));
    return res.json({ success: true });
  } catch (err) {
    console.error("save-log err:", err);
    return res.status(500).json({ success: false, message: err.message });
  }
});

app.get("/api/messaging/logs", (req, res) => {
  try {
    const file = path.join(messagesDir, "logs.json");
    let logs = [];
    if (fs.existsSync(file)) logs = JSON.parse(fs.readFileSync(file));
    return res.json(logs);
  } catch (err) {
    console.error("get logs err:", err);
    return res.status(500).json([]);
  }
});

app.post("/api/messaging/send", async (req, res) => {
  try {
    if (!whatsappClient || !isWhatsAppReady)
      return res.status(400).json({ success: false, message: "WhatsApp client not connected" });
    const { number, message } = req.body;
    if (!number || !message)
      return res.status(400).json({ success: false, message: "number and message required" });
    const sanitize = (n) => n.replace(/\D/g, "");
    const cleaned = sanitize(number);
    const id = `${cleaned}@c.us`;
    await whatsappClient.sendMessage(id, message);
    return res.json({ success: true });
  } catch (err) {
    console.error("send error:", err);
    return res.status(500).json({ success: false, message: err.message || "failed" });
  }
});


/* -------------------------
   CLOUD RECEIVER ENDPOINT  (replaces standalone receiver.js)
   ------------------------- */

// Local backend import folder (where frontend/uploads/api expects json)
const BACKEND_IMPORTS_DIR = path.join(process.cwd(), "backend", "data", "imports");
if (!fs.existsSync(BACKEND_IMPORTS_DIR)) fs.mkdirSync(BACKEND_IMPORTS_DIR, { recursive: true });

// Keep receiver-specific folders separate to avoid duplicate constant names
const RECEIVER_RECEIVED_DIR = path.join(process.cwd(), "backend", "data", "received_xml");
const RECEIVER_IMPORTED_DIR = path.join(process.cwd(), "backend", "data", "imported_json");
if (!fs.existsSync(RECEIVER_RECEIVED_DIR)) fs.mkdirSync(RECEIVER_RECEIVED_DIR, { recursive: true });
if (!fs.existsSync(RECEIVER_IMPORTED_DIR)) fs.mkdirSync(RECEIVER_IMPORTED_DIR, { recursive: true });

// secure token optional
const RECEIVER_TOKEN = process.env.RECEIVER_TOKEN || "tallySecureKey";

app.post("/api/push/tally", express.text({ type: ["application/xml", "text/xml"] }), async (req, res) => {
  try {
    // optional header check
    const token = req.headers["x-api-key"];
    if (RECEIVER_TOKEN && token !== RECEIVER_TOKEN) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }

    const xmlData = req.body;
    if (!xmlData || xmlData.trim().length < 10) {
      return res.status(400).json({ success: false, message: "Empty XML" });
    }

    const ts = Date.now();
    const xmlFile = `tally_${ts}.xml`;
    const xmlPath = path.join(RECEIVER_RECEIVED_DIR, xmlFile);
    fs.writeFileSync(xmlPath, xmlData, "utf8");

    // convert to JSON
    const parser = new xml2js.Parser({ explicitArray: false });
    const jsonData = await parser.parseStringPromise(xmlData);

    const jsonFile = xmlFile.replace(".xml", ".json");
    const jsonPath = path.join(RECEIVER_IMPORTED_DIR, jsonFile);
    fs.writeFileSync(jsonPath, JSON.stringify(jsonData, null, 2), "utf8");

    console.log(`✅ Received & parsed Tally data: ${jsonFile}`);
    return res.json({ success: true, file: jsonFile });
  } catch (err) {
    console.error("Receiver error:", err);
    return res.status(500).json({ success: false, message: err.message });
  }
});


/* -------------------------
   🔁 Receiver Auto Import Hook (watcher)
   ------------------------- */

// WATCH_DIR can be on C: drive or set via ENV if required
const WATCH_DIR = process.env.WATCH_DIR || path.join("C:", "TallyReceiver", "received_data");
// where watcher saves parsed json (use separate folder to avoid collisions)
const WATCHER_IMPORTED_DIR = process.env.WATCHER_IMPORTED_DIR || path.join("C:", "TallyReceiver", "imported_json");
if (!fs.existsSync(WATCHER_IMPORTED_DIR)) fs.mkdirSync(WATCHER_IMPORTED_DIR, { recursive: true });

// xml -> json parser helper
async function parseXmlFile(filePath) {
  const xml = fs.readFileSync(filePath, "utf8");
  const parser = new xml2js.Parser({ explicitArray: false, ignoreAttrs: false });
  return parser.parseStringPromise(xml);
}

app.post("/api/imports/from-receiver", (req, res) => {
  try {
    const body = req.body || {};
    if (!body.file || !body.json) return res.status(400).json({ success: false, message: "file and json required" });

    const safeName = path.basename(body.file).replace(/[^a-zA-Z0-9._-]/g, "_").replace(/\.xml$/i, "");
    const destFile = path.join(BACKEND_IMPORTS_DIR, `${safeName}.json`);
    fs.writeFileSync(destFile, JSON.stringify(body.json, null, 2), "utf8");

    const latestFile = path.join(BACKEND_IMPORTS_DIR, `latest_from_tally.json`);
    fs.writeFileSync(latestFile, JSON.stringify(body.json, null, 2), "utf8");

    console.log(`📥 Received from watcher and saved to backend imports: ${destFile}`);
    return res.json({ success: true, file: destFile });
  } catch (err) {
    console.error("Error in /api/imports/from-receiver:", err);
    return res.status(500).json({ success: false, message: err.message });
  }
});

if (fs.existsSync(WATCH_DIR)) {
  console.log("👀 Watching Receiver folder for new XML files...");
  const watcher = chokidar.watch(WATCH_DIR, { persistent: true, ignoreInitial: true });

  watcher.on("add", async (filePath) => {
    try {
      if (!filePath.toLowerCase().endsWith(".xml")) return;
      console.log(`📂 New XML detected: ${filePath}`);

      const jsonData = await parseXmlFile(filePath);

      // save to watcher imported dir
      const jsonFile = path.join(WATCHER_IMPORTED_DIR, path.basename(filePath).replace(/\.xml$/i, ".json"));
      fs.writeFileSync(jsonFile, JSON.stringify(jsonData, null, 2), "utf8");
      console.log(`✅ Parsed & saved JSON: ${jsonFile}`);

      // push to backend imports route so that software pipeline picks it
      try {
        await axios.post(`http://localhost:4000/api/imports/from-receiver`, {
          file: path.basename(filePath),
          json: jsonData,
        }, { timeout: 15000 });
        console.log("📤 Data pushed to backend import route successfully.");
      } catch (postErr) {
        console.error("❌ Failed to POST to backend /api/imports/from-receiver:", postErr.message || postErr);
      }
    } catch (err) {
      console.error("❌ Error handling new XML:", err.message || err);
    }
  });
} else {
  console.warn("⚠️ Receiver folder not found, skipping watcher initialization.");
}

/* -------------------------
   🧠 Unified Report Source Switch
   ------------------------- */

app.get("/api/reports/source", (req, res) => {
  try {
    const UPLOADS_DIR = BACKEND_IMPORTS_DIR; // backend import pipeline folder
    const TALLY_JSON_DIR = RECEIVER_IMPORTED_DIR; // watcher output folder (receiver API writes here)
    const { source } = req.query; // optional

    const getLatestJson = (dirPath) => {
      if (!fs.existsSync(dirPath)) return null;
      const files = fs.readdirSync(dirPath).filter((f) => f.toLowerCase().endsWith(".json"));
      if (files.length === 0) return null;
      const latest = files.sort(
        (a, b) =>
          fs.statSync(path.join(dirPath, b)).mtimeMs - fs.statSync(path.join(dirPath, a)).mtimeMs
      )[0];
      return JSON.parse(fs.readFileSync(path.join(dirPath, latest), "utf8"));
    };

    let data = null;
    let usedSource = source || "auto";

    if (source === "upload") {
      data = getLatestJson(UPLOADS_DIR);
      usedSource = "upload";
    } else if (source === "tally") {
      data = getLatestJson(TALLY_JSON_DIR);
      usedSource = "tally";
    } else {
      // auto preference: Tally > Upload
      const tallyLatest = getLatestJson(TALLY_JSON_DIR);
      const uploadLatest = getLatestJson(UPLOADS_DIR);
      data = tallyLatest || uploadLatest;
      usedSource = data === null ? "none" : (tallyLatest ? "tally" : "upload");
    }

    if (!data) {
      return res.status(404).json({ success: false, message: "No report found (Tally or Upload)" });
    }

    return res.json({
      success: true,
      source: usedSource,
      message: `Report loaded from ${usedSource.toUpperCase()}`,
      data,
    });
  } catch (err) {
    console.error("Error fetching report:", err);
    return res.status(500).json({ success: false, message: err.message });
  }
});


/* -------------------------
   🧾 ANALYST MODULE BACKEND (for Analyst.jsx)
   ------------------------- */

import { fileURLToPath } from "url";
import { dirname } from "path";
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Base data folder
const ANALYST_DIR = path.join(__dirname, "backend", "data", "analystEntries");
if (!fs.existsSync(ANALYST_DIR)) fs.mkdirSync(ANALYST_DIR, { recursive: true });

const ANALYST_NOTIF_FILE = path.join(ANALYST_DIR, "notifications.json");

/* ---------- Save utility ---------- */
function saveAnalyst(type, data) {
  const file = path.join(ANALYST_DIR, `${type}.json`);
  let existing = [];
  if (fs.existsSync(file)) existing = JSON.parse(fs.readFileSync(file));
  existing.unshift({ ...data, id: Date.now(), createdAt: new Date().toISOString() });
  fs.writeFileSync(file, JSON.stringify(existing, null, 2));
}

/* ---------- Notification utility ---------- */
function addAnalystNotification(title, message, level = "info") {
  const notif = { id: Date.now(), title, message, level, time: new Date().toISOString() };
  let list = [];
  if (fs.existsSync(ANALYST_NOTIF_FILE))
    list = JSON.parse(fs.readFileSync(ANALYST_NOTIF_FILE));
  list.unshift(notif);
  if (list.length > 100) list = list.slice(0, 100);
  fs.writeFileSync(ANALYST_NOTIF_FILE, JSON.stringify(list, null, 2));
}

/* ---------- Save entries ---------- */
app.post("/api/analyst/invoice", (req, res) => {
  try {
    saveAnalyst("invoices", req.body);
    addAnalystNotification("🧾 New Invoice", `Invoice from ${req.body.customer || "Unknown"} added.`);
    res.json({ success: true, message: "Invoice saved successfully" });
  } catch (err) {
    console.error("Error saving invoice:", err);
    res.status(500).json({ success: false, message: err.message });
  }
});

app.post("/api/analyst/receipt", (req, res) => {
  try {
    saveAnalyst("receipts", req.body);
    addAnalystNotification("💰 New Receipt", `Receipt from ${req.body.customer || "Unknown"} recorded.`);
    res.json({ success: true, message: "Receipt saved successfully" });
  } catch (err) {
    console.error("Error saving receipt:", err);
    res.status(500).json({ success: false, message: err.message });
  }
});

app.post("/api/analyst/order", (req, res) => {
  try {
    saveAnalyst("orders", req.body);
    addAnalystNotification("📦 New Order", `Order created by ${req.body.customer || "Unknown"}`);
    res.json({ success: true, message: "Order saved successfully" });
  } catch (err) {
    console.error("Error saving order:", err);
    res.status(500).json({ success: false, message: err.message });
  }
});

/* ---------- Fetch all entries (for Analyst dashboard) ---------- */
app.get("/api/analyst/entries", (req, res) => {
  try {
    const types = ["invoices", "receipts", "orders"];
    const data = {};
    types.forEach((t) => {
      const file = path.join(ANALYST_DIR, `${t}.json`);
      data[t] = fs.existsSync(file) ? JSON.parse(fs.readFileSync(file)) : [];
    });
    res.json({ success: true, data });
  } catch (err) {
    console.error("Error fetching entries:", err);
    res.status(500).json({ success: false, message: err.message });
  }
});

/* ---------- Notifications ---------- */
app.get("/api/analyst/notifications", (req, res) => {
  try {
    const data = fs.existsSync(ANALYST_NOTIF_FILE)
      ? JSON.parse(fs.readFileSync(ANALYST_NOTIF_FILE))
      : [];
    res.json({ success: true, data });
  } catch (err) {
    console.error("Error reading notifications:", err);
    res.status(500).json({ success: false, message: err.message });
  }
});

app.post("/api/analyst/notify", (req, res) => {
  try {
    const { title, message, level } = req.body;
    addAnalystNotification(title || "Alert", message || "No message", level || "info");
    res.json({ success: true });
  } catch (err) {
    console.error("Error creating notification:", err);
    res.status(500).json({ success: false, message: err.message });
  }
});

/* ---------- Refresh endpoint (reload dashboard data) ---------- */
app.get("/api/analyst/refresh", (req, res) => {
  try {
    const folder = path.join(__dirname, "backend", "data", "imports");
    const files = fs
      .readdirSync(folder)
      .filter((f) => f.endsWith(".json"))
      .map((f) => ({ name: f, time: fs.statSync(path.join(folder, f)).mtimeMs }))
      .sort((a, b) => b.time - a.time);

    if (!files.length) return res.json({ success: false, message: "No import files found" });

    const latestFile = path.join(folder, files[0].name);
    const data = JSON.parse(fs.readFileSync(latestFile, "utf8"));
    addAnalystNotification("🔄 Data Refreshed", "Analyst dashboard data updated.");
    res.json({ success: true, file: files[0].name, data });
  } catch (err) {
    console.error("Error refreshing data:", err);
    res.status(500).json({ success: false, message: err.message });
  }
});



/* -------------------------
   End messaging + integrations
   ------------------------- */

app.get("/", (req, res) => res.send("Backend running... ✅ + Tally & Messaging APIs ready!"));

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => console.log(`✅ Backend running on port ${PORT} + Tally & Messaging ready`));
