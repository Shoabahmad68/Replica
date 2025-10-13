// tallyRoute.js (final integrated version)

import fs from "fs";
import path from "path";
import express from "express";
import xml2js from "xml2js";
import chokidar from "chokidar";

const router = express.Router();

// 📁 Path जहाँ Receiver XML files save होती हैं
const SAVE_DIR = "C:/TallyReceiver/received_data";

// 📁 Folder जहाँ parsed JSON files store होंगे
const JSON_STORE_DIR = "C:/TallyReceiver/imported_json";
if (!fs.existsSync(JSON_STORE_DIR)) fs.mkdirSync(JSON_STORE_DIR, { recursive: true });

// Utility: Parse XML to JSON
async function parseXmlFile(filePath) {
  const xml = fs.readFileSync(filePath, "utf8");
  const parser = new xml2js.Parser({ explicitArray: false, ignoreAttrs: false });
  const result = await parser.parseStringPromise(xml);
  return result;
}

// ✅ 1️⃣ Route: Latest XML + raw data
router.get("/tally/files", (req, res) => {
  try {
    const files = fs.readdirSync(SAVE_DIR).filter(f => f.endsWith(".xml"));
    if (!files.length) {
      return res.status(404).json({ error: "No XML files found in Receiver folder" });
    }

    // Sort by modification time (latest first)
    const latest = files.sort(
      (a, b) =>
        fs.statSync(path.join(SAVE_DIR, b)).mtimeMs -
        fs.statSync(path.join(SAVE_DIR, a)).mtimeMs
    )[0];

    const data = fs.readFileSync(path.join(SAVE_DIR, latest), "utf8");
    res.json({ success: true, latest, data });
  } catch (err) {
    console.error("Error reading tally files:", err.message);
    res.status(500).json({ error: err.message });
  }
});

// ✅ 2️⃣ Route: Convert ALL XML → JSON and return
router.get("/tally/parse", async (req, res) => {
  try {
    const files = fs.readdirSync(SAVE_DIR).filter(f => f.endsWith(".xml"));
    if (!files.length) {
      return res.status(404).json({ message: "No XML files to parse" });
    }

    const parsedData = [];

    for (let file of files) {
      const filePath = path.join(SAVE_DIR, file);
      try {
        const jsonData = await parseXmlFile(filePath);

        // Save JSON copy (for reference)
        const jsonFilePath = path.join(JSON_STORE_DIR, file.replace(".xml", ".json"));
        fs.writeFileSync(jsonFilePath, JSON.stringify(jsonData, null, 2));

        parsedData.push({ file, jsonFilePath });
      } catch (err) {
        console.warn(`⚠️ Error parsing file ${file}:`, err.message);
      }
    }

    res.json({
      success: true,
      total_parsed: parsedData.length,
      saved_to: JSON_STORE_DIR,
      message: "All XML files parsed and saved as JSON successfully",
    });
  } catch (err) {
    console.error("Error parsing XML:", err.message);
    res.status(500).json({ error: err.message });
  }
});

// ✅ 3️⃣ Watcher: Auto-detect new XMLs and auto-parse
if (fs.existsSync(SAVE_DIR)) {
  console.log("👀 Watching for new XML in Receiver folder...");

  const watcher = chokidar.watch(SAVE_DIR, { ignoreInitial: true, persistent: true });

  watcher.on("add", async (filePath) => {
    try {
      if (!filePath.endsWith(".xml")) return;
      console.log(`📂 New XML detected: ${filePath}`);

      const jsonData = await parseXmlFile(filePath);
      const jsonFile = path.join(JSON_STORE_DIR, path.basename(filePath).replace(".xml", ".json"));

      fs.writeFileSync(jsonFile, JSON.stringify(jsonData, null, 2));
      console.log(`✅ Auto-saved JSON: ${jsonFile}`);
    } catch (err) {
      console.error("❌ Error auto-parsing new XML:", err.message);
    }
  });
} else {
  console.warn("⚠️ Receiver folder not found, skipping watcher init.");
}

// ✅ 4️⃣ Route: Get latest parsed JSON (for frontend dashboard)
router.get("/tally/latest-json", (req, res) => {
  try {
    const files = fs.readdirSync(JSON_STORE_DIR).filter(f => f.endsWith(".json"));
    if (!files.length) {
      return res.status(404).json({ message: "No parsed JSON available" });
    }

    const latest = files.sort(
      (a, b) =>
        fs.statSync(path.join(JSON_STORE_DIR, b)).mtimeMs -
        fs.statSync(path.join(JSON_STORE_DIR, a)).mtimeMs
    )[0];

    const jsonData = JSON.parse(fs.readFileSync(path.join(JSON_STORE_DIR, latest), "utf8"));
    res.json({ success: true, latest, data: jsonData });
  } catch (err) {
    console.error("Error fetching latest JSON:", err.message);
    res.status(500).json({ error: err.message });
  }
});

export default router;
