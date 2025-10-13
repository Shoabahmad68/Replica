import express from "express";
import qrcode from "qrcode";
import pkg from "whatsapp-web.js";
const { Client, LocalAuth } = pkg;

const router = express.Router();

let client;
let qrCodeData = null;
let isConnected = false;

function initWhatsApp() {
  console.log("🚀 Initializing WhatsApp Web Client...");

  client = new Client({
    authStrategy: new LocalAuth({ dataPath: "./.wwebjs_auth" }),
    puppeteer: {
      headless: true, // ✅ browser अब नहीं खुलेगा
      args: ["--no-sandbox", "--disable-setuid-sandbox"],
    },
  });

  client.on("qr", async (qr) => {
    console.log("📲 QR Generated!");
    qrCodeData = await qrcode.toDataURL(qr);
  });

  client.on("ready", () => {
    console.log("✅ WhatsApp Connected Successfully!");
    isConnected = true;
    qrCodeData = null;
  });

  client.on("auth_failure", (msg) => {
    console.error("❌ Authentication Failed:", msg);
    isConnected = false;
  });

  client.on("disconnected", (reason) => {
    console.warn("⚠️ WhatsApp Disconnected:", reason);
    isConnected = false;
    qrCodeData = null;
    setTimeout(() => initWhatsApp(), 5000);
  });

  client.initialize();
}

// Start client once
initWhatsApp();

// ✅ Route to get QR or status
router.get("/status", async (req, res) => {
  res.json({ connected: isConnected, qr: qrCodeData });
});

// ✅ Trigger new QR generation manually
router.post("/start", async (req, res) => {
  try {
    if (isConnected) {
      return res.json({ success: true, message: "Already connected ✅" });
    }
    if (qrCodeData) {
      return res.json({ success: true, qr: qrCodeData });
    }
    return res
      .status(500)
      .json({ success: false, message: "QR not ready yet. Try again." });
  } catch (err) {
    console.error("QR Route Error:", err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// ✅ Send message
router.post("/send", async (req, res) => {
  try {
    const { number, message } = req.body;
    if (!number || !message)
      return res
        .status(400)
        .json({ success: false, message: "Number & message required" });

    if (!client || !isConnected)
      return res
        .status(400)
        .json({ success: false, message: "WhatsApp not connected" });

    const chatId = `${number.replace(/\D/g, "")}@c.us`;
    await client.sendMessage(chatId, message);
    console.log(`📤 Sent message to ${number}`);
    res.json({ success: true });
  } catch (err) {
    console.error("Send Error:", err);
    res.status(500).json({ success: false, message: err.message });
  }
});

export default router;
