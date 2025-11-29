// src/config.js
// -------------------------------
// FINAL CONFIG (WORKS WITH YOUR LOCAL BACKEND)
// -------------------------------

// Detect if frontend is running on localhost
const IS_LOCAL =
  window.location.hostname === "localhost" ||
  window.location.hostname === "127.0.0.1";

// -------------------------------
// MAIN BACKEND (existing)
// -------------------------------
const FALLBACK_BACKEND = "https://replica-backend.shoabahmad68.workers.dev";

export const BACKEND_URL =
  (typeof import.meta !== "undefined" &&
    import.meta.env &&
    import.meta.env.VITE_BACKEND_URL) ||
  FALLBACK_BACKEND;

// -------------------------------
// ANALYST BACKEND (LOCAL + CLOUD)
// -------------------------------
const LOCAL_ANALYST = "http://localhost:5000/api"; // ← IMPORTANT
const CLOUD_ANALYST = "https://analyst-api.selt-3232.workers.dev";

// If localhost → use local backend
// Else → cloud worker
export const ANALYST_BACKEND_ROOT = IS_LOCAL
  ? LOCAL_ANALYST
  : CLOUD_ANALYST;

// Direct API URLs (Frontend will use these)
export const ANALYST_ENDPOINTS = {
  DAYBOOK: `${ANALYST_BACKEND_ROOT}/daybook`,
  RECEIVABLES: `${ANALYST_BACKEND_ROOT}/receivables`,
  PAYABLES: `${ANALYST_BACKEND_ROOT}/payables`,
};

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
  `${ANALYST_BACKEND_ROOT}${path.startsWith("/") ? path : `/${path}`}`;

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
  description:
    "Business Intelligence Dashboard connected to local Tally XML backend.",
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
