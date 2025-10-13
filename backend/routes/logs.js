// backend/routes/logs.js
import express from "express";
import fs from "fs-extra";
import path from "path";
import { verifyToken, requireRole } from "../middleware/authMiddleware.js";

const router = express.Router();
const DATA = path.join(process.cwd(), "backend", "data", "activity_logs.json");
fs.ensureFileSync(DATA);
if (!fs.readJsonSync(DATA, { throws: false })) fs.writeJsonSync(DATA, []);

// append log (protected)
router.post("/", verifyToken, async (req, res) => {
  try {
    const logs = await fs.readJson(DATA);
    const entry = { id: Date.now().toString(), user: req.user, action: req.body.action || "action", module: req.body.module || "unknown", meta: req.body.meta || {}, time: new Date().toISOString(), ip: req.ip };
    logs.unshift(entry);
    if (logs.length > 5000) logs.splice(5000);
    await fs.writeJson(DATA, logs, { spaces: 2 });
    res.json({ msg: "logged" });
  } catch (err) {
    res.status(500).json({ msg: "err" });
  }
});

// get logs (admin/manager)
router.get("/", verifyToken, requireRole(["admin","manager"]), async (req, res) => {
  const logs = await fs.readJson(DATA);
  res.json(logs);
});

export default router;
