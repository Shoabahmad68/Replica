// backend/routes/billing.js
import express from "express";
import fs from "fs";
import path from "path";

const router = express.Router();
const billingDir = path.join(process.cwd(), "backend/data/billing");

// ensure folder exists
if (!fs.existsSync(billingDir)) fs.mkdirSync(billingDir, { recursive: true });

// 🔹 Get all invoices
router.get("/list", (req, res) => {
  try {
    const files = fs.readdirSync(billingDir).filter(f => f.endsWith(".json"));
    const data = [];
    files.forEach(f => {
      const fileData = JSON.parse(fs.readFileSync(path.join(billingDir, f)));
      data.push(...fileData);
    });
    res.json({ success: true, data });
  } catch (err) {
    res.status(500).json({ success: false, message: "Error reading billing data" });
  }
});

// 🔹 Save or update invoice
router.post("/save", (req, res) => {
  const invoice = req.body;
  if (!invoice) return res.status(400).json({ success: false, message: "No invoice provided" });

  const today = new Date();
  const fileName = `billing_${today.getFullYear()}_${String(today.getMonth()+1).padStart(2,"0")}_${String(today.getDate()).padStart(2,"0")}.json`;
  const filePath = path.join(billingDir, fileName);

  let existing = [];
  if (fs.existsSync(filePath)) {
    existing = JSON.parse(fs.readFileSync(filePath));
  }

  const idx = existing.findIndex(i => i.id === invoice.id);
  if (idx >= 0) existing[idx] = invoice;
  else existing.push(invoice);

  fs.writeFileSync(filePath, JSON.stringify(existing, null, 2));
  res.json({ success: true, message: "Invoice saved successfully", invoice });
});

// 🔹 Delete invoice
router.delete("/delete/:id", (req, res) => {
  const id = req.params.id;
  const files = fs.readdirSync(billingDir).filter(f => f.endsWith(".json"));
  for (const file of files) {
    const filePath = path.join(billingDir, file);
    const fileData = JSON.parse(fs.readFileSync(filePath));
    const newData = fileData.filter(i => i.id !== id);
    fs.writeFileSync(filePath, JSON.stringify(newData, null, 2));
  }
  res.json({ success: true, message: "Invoice deleted" });
});

export default router;
