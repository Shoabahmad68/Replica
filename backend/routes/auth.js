// backend/routes/auth.js
import express from "express";
import fs from "fs-extra";
import path from "path";
import shortid from "shortid";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

const router = express.Router();
const DATA = path.join(process.cwd(), "backend", "data", "users.json");
const JWT_SECRET = process.env.JWT_SECRET || "mras_default_secret_change";
const SALT_ROUNDS = 10;

// ensure file
fs.ensureFileSync(DATA);
if (!fs.readJsonSync(DATA, { throws: false })) fs.writeJsonSync(DATA, []);

// signup -> create user with status pending
router.post("/signup", async (req, res) => {
  try {
    const users = await fs.readJson(DATA);
    const { name, email, password, role = "viewer" } = req.body;
    if (!email || !password || !name) return res.status(400).json({ msg: "Missing fields" });
    if (users.find((u) => u.email === email)) return res.status(400).json({ msg: "Email exists" });
    const hash = await bcrypt.hash(password, SALT_ROUNDS);
    const user = { id: shortid.generate(), name, email, password: hash, role, status: "pending", createdAt: new Date().toISOString() };
    users.push(user);
    await fs.writeJson(DATA, users, { spaces: 2 });
    // Do not return password
    return res.json({ msg: "pending", user: { id: user.id, email: user.email, status: user.status } });
  } catch (err) {
    console.error("signup err:", err);
    res.status(500).json({ msg: "Server error" });
  }
});

// login -> only active users
router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;
    const users = await fs.readJson(DATA);
    const u = users.find((x) => x.email === email);
    if (!u) return res.status(401).json({ msg: "Invalid credentials" });
    const match = await bcrypt.compare(password, u.password);
    if (!match) return res.status(401).json({ msg: "Invalid credentials" });
    if (u.status !== "active") return res.status(403).json({ msg: "Not approved" });
    const token = jwt.sign({ id: u.id, role: u.role }, JWT_SECRET, { expiresIn: "7d" });
    return res.json({ token, user: { id: u.id, name: u.name, email: u.email, role: u.role } });
  } catch (err) {
    console.error("login err:", err);
    res.status(500).json({ msg: "Server error" });
  }
});

// profile
router.get("/profile", async (req, res) => {
  try {
    const auth = req.headers.authorization;
    if (!auth || !auth.startsWith("Bearer ")) return res.status(401).json({ msg: "No token" });
    const token = auth.slice(7);
    const payload = jwt.verify(token, JWT_SECRET);
    const users = await fs.readJson(DATA);
    const u = users.find((x) => x.id === payload.id);
    if (!u) return res.status(404).json({ msg: "User not found" });
    return res.json({ id: u.id, name: u.name, email: u.email, role: u.role, status: u.status });
  } catch (err) {
    console.error("profile err:", err.message);
    res.status(401).json({ msg: "Invalid token" });
  }
});

export default router;
