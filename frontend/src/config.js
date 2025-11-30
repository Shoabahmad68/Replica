// src/config.js
// -------------------------------
// FINAL CONFIG - UNIFIED BACKEND
// -------------------------------

const IS_LOCAL =
  window.location.hostname === "localhost" ||
  window.location.hostname === "127.0.0.1";

// -------------------------------
// MAIN BACKEND (Dashboard & Analyst both use this)
// -------------------------------
const FALLBACK_BACKEND = "https://selt-t-backend.selt-3232.workers.dev";

export const BACKEND_URL = IS_LOCAL
  ? "http://127.0.0.1:8787"
  : FALLBACK_BACKEND;

// -------------------------------
// ANALYST ENDPOINTS (Uses same backend as Dashboard)
// -------------------------------
export const ANALYST_ENDPOINTS = {
  DAYBOOK: `${BACKEND_URL}/api/vouchers?limit=10000`,
  RECEIVABLES: `${BACKEND_URL}/api/vouchers?limit=10000`,
  PAYABLES: `${BACKEND_URL}/api/vouchers?limit=10000`,
};

// -------------------------------
// LEGACY - Keep for compatibility
// -------------------------------
export const ANALYST_BACKEND_ROOT = BACKEND_URL;

// -------------------------------
// Axios Configuration
// -------------------------------
export const AXIOS_CONFIG = {
  headers: { "Content-Type": "application/json" },
  timeout: 30000,
  withCredentials: false,
};

// -------------------------------
// API Route Builders
// -------------------------------
export const analystApi = (path = "") =>
  `${BACKEND_URL}${path.startsWith("/") ? path : `/${path}`}`;

export const apiRoute = (path = "") =>
  `${BACKEND_URL}${path.startsWith("/") ? path : `/${path}`}`;

// -------------------------------
// App Info
// -------------------------------
export const APP_INFO = {
  name: "Sel-T DATA ANALYST",
  version: "2.0.0",
  author: "Shoaib Ahmad",
  company: "Communication World Infomatic Pvt. Ltd.",
  description: "Business Intelligence Dashboard connected to Cloudflare D1 backend.",
};

// -------------------------------
export default {
  BACKEND_URL,
  ANALYST_BACKEND_ROOT,
  ANALYST_ENDPOINTS,
  AXIOS_CONFIG,
  apiRoute,
  analystApi,
  APP_INFO,
  IS_LOCAL,
};
