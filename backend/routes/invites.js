// backend/routes/invites.js
import express from "express";
import fs from "fs-extra";
import path from "path";
import shortid from "shortid";
import { verifyToken, requireRole } from "../middleware/authMiddleware.js";

const router = express.Router();
const DATA = path.join(process.cwd(), "backend", "data", "invites.json");
fs.ensureFileSync(DATA);
if (!fs.readJsonSync(DATA, { throws: false })) fs.writeJsonSync(DATA, []);

// create invite (admin/manager)
router.post("/", verifyToken, requireRole(["admin","manager"]), async (req, res) => {
  const { email, name, role = "viewer" } = req.body;
  if (!email || !name) return res.status(400).json({ msg: "Missing" });
  const invites = await fs.readJson(DATA);
  const token = shortid.generate();
  const item = { id: token, email, name, role, status: "pending", createdAt: new Date().toISOString() };
  invites.push(item);
  await fs.writeJson(DATA, invites, { spaces: 2 });
  // TODO: send email/whatsapp via another service. For now return token.
  res.json({ msg: "invite_created", invite: item });
});

// list invites
router.get("/", verifyToken, requireRole(["admin","manager"]), async (req, res) => {
  const invites = await fs.readJson(DATA);
  res.json(invites);
});

export default router;
