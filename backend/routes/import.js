import express from "express";
import multer from "multer";
import path from "path";
import fs from "fs-extra";
import { parseExcelBuffer } from "../services/excelParser.js";
import shortid from "shortid";
import { fileURLToPath } from "url";

// ✅ Path setup
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const UP = path.join(__dirname, "..", "uploads");
const IMPORTS = path.join(__dirname, "..", "data", "imports");

fs.ensureDirSync(UP);
fs.ensureDirSync(IMPORTS);

const storage = multer.memoryStorage();
const upload = multer({ storage });

const router = express.Router();

// ✅ Upload Excel or File
router.post("/upload", upload.single("file"), async (req, res) => {
  try {
    const file = req.file;
    if (!file) return res.status(400).json({ msg: "No file uploaded" });

    const ext = path.extname(file.originalname).toLowerCase();
    const id = shortid.generate();

    if ([".xls", ".xlsx", ".csv"].includes(ext)) {
      // Excel parsing
      const rows = parseExcelBuffer(file.buffer);
      const outName = `${Date.now()}_${id}.json`;

      await fs.writeJson(path.join(IMPORTS, outName), {
        meta: {
          originalName: file.originalname,
          uploadedAt: new Date(),
        },
        rows,
      });

      res.json({
        msg: "✅ Excel parsed successfully",
        file: outName,
        count: rows.length,
      });
    } else {
      // Non-excel file (image/pdf)
      const fname = `${Date.now()}_${file.originalname}`;
      await fs.writeFile(path.join(UP, fname), file.buffer);
      res.json({ msg: "✅ File uploaded", file: `/uploads/${fname}` });
    }
  } catch (err) {
    console.error("❌ Upload error:", err);
    res.status(500).json({ msg: "Upload failed", error: err.message });
  }
});

// ✅ Fetch latest uploaded Excel JSON
router.get("/latest", async (req, res) => {
  try {
    const files = await fs.readdir(IMPORTS);
    if (!files.length)
      return res.json({ msg: "No data found", data: [] });

    // Sort by last modified time
    const latestFile = files
      .map((f) => ({
        name: f,
        time: fs.statSync(path.join(IMPORTS, f)).mtime.getTime(),
      }))
      .sort((a, b) => b.time - a.time)[0].name;

    const jsonData = await fs.readJson(path.join(IMPORTS, latestFile));

    res.json({
      msg: "✅ Latest data loaded successfully",
      data: jsonData.rows || [],
      meta: jsonData.meta || {},
    });
  } catch (err) {
    console.error("❌ Error loading latest import:", err);
    res.status(500).json({ msg: "Error reading data", error: err.message });
  }
});

export default router;
