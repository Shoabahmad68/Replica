// backend/middleware/authMiddleware.js
import fs from "fs-extra";
import path from "path";
import jwt from "jsonwebtoken";

const DATA = path.join(process.cwd(), "backend", "data", "users.json");
const JWT_SECRET = process.env.JWT_SECRET || "mras_default_secret_change";

export function ensureUserFile() {
  fs.ensureFileSync(DATA);
  if (!fs.readJsonSync(DATA, { throws: false })) fs.writeJsonSync(DATA, []);
}

export const verifyToken = (req, res, next) => {
  try {
    const auth = req.headers.authorization;
    if (!auth || !auth.startsWith("Bearer ")) return res.status(401).json({ msg: "No token" });
    const token = auth.slice(7);
    const payload = jwt.verify(token, JWT_SECRET);
    // attach user info
    ensureUserFile();
    const users = fs.readJsonSync(DATA);
    const user = users.find((u) => u.id === payload.id);
    if (!user) return res.status(401).json({ msg: "Invalid token user" });
    req.user = { id: user.id, email: user.email, name: user.name, role: user.role };
    next();
  } catch (err) {
    console.error("verifyToken err:", err.message);
    return res.status(401).json({ msg: "Invalid token" });
  }
};

export const requireRole = (roles = []) => (req, res, next) => {
  if (!req.user) return res.status(401).json({ msg: "Not authenticated" });
  if (roles.length === 0) return next();
  if (!roles.includes(req.user.role)) return res.status(403).json({ msg: "Forbidden" });
  next();
};
