// backend/routes/roles.js
import express from "express";
import fs from "fs-extra";
import path from "path";
import { verifyToken, requireRole } from "../middleware/authMiddleware.js";

const router = express.Router();
const DATA = path.join(process.cwd(), "backend", "data", "roles.json");
fs.ensureFileSync(DATA);
if (!fs.readJsonSync(DATA, { throws: false })) fs.writeJsonSync(DATA, [
  { id: "admin", name: "Admin", perms: ["*"] },
  { id: "manager", name: "Manager", perms: ["users:read","users:edit"] },
  { id: "viewer", name: "Viewer", perms: [] }
], { spaces: 2 });

// list roles
router.get("/", verifyToken, requireRole(["admin"]), async (req, res) => {
  const roles = await fs.readJson(DATA);
  res.json(roles);
});

// add role
router.post("/", verifyToken, requireRole(["admin"]), async (req, res) => {
  const roles = await fs.readJson(DATA);
  const { id, name, perms = [] } = req.body;
  if (!id || !name) return res.status(400).json({ msg: "Missing" });
  if (roles.find(r => r.id === id)) return res.status(400).json({ msg: "Exists" });
  roles.push({ id, name, perms });
  await fs.writeJson(DATA, roles, { spaces: 2 });
  res.json({ msg: "created" });
});

// edit role
router.put("/:id", verifyToken, requireRole(["admin"]), async (req, res) => {
  const roles = await fs.readJson(DATA);
  const idx = roles.findIndex(r => r.id === req.params.id);
  if (idx === -1) return res.status(404).json({ msg: "Not found" });
  roles[idx] = { ...roles[idx], ...(req.body || {}) };
  await fs.writeJson(DATA, roles, { spaces: 2 });
  res.json({ msg: "updated" });
});

export default router;
