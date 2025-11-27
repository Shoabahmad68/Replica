// src/config.js
// Cloudflare Worker backend + Frontend integration configuration

// 🔧 Detect if running on localhost
const IS_LOCAL = 
  window.location.hostname === "localhost" || 
  window.location.hostname === "127.0.0.1";

// ✅ Main Backend (existing)
const FALLBACK_BACKEND = "https://replica-backend.shoabahmad68.workers.dev";

// 🆕 Analyst Backend - FIXED URL
const FALLBACK_ANALYST_BACKEND = IS_LOCAL 
  ? "http://127.0.0.1:8787"  // 🏠 Local development
  : "https://analyst-api.selt-3232.workers.dev"; // ☁️ Production Cloudflare Worker

export const BACKEND_URL =
  typeof import.meta !== "undefined" &&
  import.meta.env &&
  import.meta.env.VITE_BACKEND_URL
    ? import.meta.env.VITE_BACKEND_URL
    : FALLBACK_BACKEND;

// 🆕 Analyst Backend URL (with localhost support)
export const ANALYST_BACKEND_URL =
  typeof import.meta !== "undefined" &&
  import.meta.env &&
  import.meta.env.VITE_ANALYST_BACKEND_URL
    ? import.meta.env.VITE_ANALYST_BACKEND_URL
    : FALLBACK_ANALYST_BACKEND;

// ✅ Axios default configuration
export const AXIOS_CONFIG = {
  headers: { "Content-Type": "application/json" },
  timeout: 30000, // Increased to 30s for large data
  withCredentials: false,
};

// ✅ Helper to build API routes
export const apiRoute = (path = "") =>
  `${BACKEND_URL}${path.startsWith("/") ? path : `/${path}`}`;

// 🆕 Helper for Analyst API routes
export const analystApiRoute = (path = "") =>
  `${ANALYST_BACKEND_URL}${path.startsWith("/") ? path : `/${path}`}`;

// ✅ App metadata
export const APP_INFO = {
  name: "Sel-T DATA ANALYST",
  version: "2.0.0",
  author: "Shoaib Ahmad",
  company: "Communication World Infomatic Pvt. Ltd.",
  description:
    "Business Intelligence Dashboard connected to Cloudflare Worker backend receiving live data from Tally ERP.",
};

// 🔍 Debug Info (console log in development)
if (typeof import.meta !== "undefined" && import.meta.env && import.meta.env.DEV) {
  console.log("🔧 Development Mode");
  console.log("📡 Main Backend:", BACKEND_URL);
  console.log("📊 Analyst Backend:", ANALYST_BACKEND_URL);
  console.log("🌍 Environment Variable:", import.meta.env.VITE_ANALYST_BACKEND_URL);
}

// ✅ Default export
export default {
  BACKEND_URL,
  ANALYST_BACKEND_URL,
  AXIOS_CONFIG,
  apiRoute,
  analystApiRoute,
  APP_INFO,
  IS_LOCAL,
};
