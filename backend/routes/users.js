// backend/routes/users.js
import express from "express";
import fs from "fs-extra";
import path from "path";
import shortid from "shortid";
import { verifyToken, requireRole } from "../middleware/authMiddleware.js";

const router = express.Router();
const DATA = path.join(process.cwd(), "backend", "data", "users.json");
fs.ensureFileSync(DATA);
if (!fs.readJsonSync(DATA, { throws: false })) fs.writeJsonSync(DATA, []);

// list users (protected) - admin and manager can list
router.get("/", verifyToken, requireRole(["admin", "manager"]), async (req, res) => {
  const users = await fs.readJson(DATA);
  res.json(users.map(u => ({ id: u.id, name: u.name, email: u.email, role: u.role, status: u.status, createdAt: u.createdAt })));
});

// get single user (protected)
router.get("/:id", verifyToken, async (req, res) => {
  const users = await fs.readJson(DATA);
  const u = users.find(x => x.id === req.params.id);
  if (!u) return res.status(404).json({ msg: "not found" });
  res.json({ id: u.id, name: u.name, email: u.email, role: u.role, status: u.status, createdAt: u.createdAt });
});

// update user (protected, admin or self)
router.put("/:id", verifyToken, async (req, res) => {
  const users = await fs.readJson(DATA);
  const id = req.params.id;
  const idx = users.findIndex(x => x.id === id);
  if (idx === -1) return res.status(404).json({ msg: "not found" });
  // only admin or the user themselves
  if (req.user.role !== "admin" && req.user.id !== id) return res.status(403).json({ msg: "forbidden" });
  const allowed = ["name", "role", "status", "email"];
  for (const k of allowed) if (req.body[k] !== undefined) users[idx][k] = req.body[k];
  await fs.writeJson(DATA, users, { spaces: 2 });
  res.json({ msg: "updated", user: { id: users[idx].id, name: users[idx].name, email: users[idx].email, role: users[idx].role, status: users[idx].status }});
});

// delete user (admin only)
router.delete("/:id", verifyToken, requireRole(["admin"]), async (req, res) => {
  let users = await fs.readJson(DATA);
  const id = req.params.id;
  if (!users.find(u => u.id === id)) return res.status(404).json({ msg: "not found" });
  users = users.filter(u => u.id !== id);
  await fs.writeJson(DATA, users, { spaces: 2 });
  res.json({ msg: "deleted" });
});

export default router;
