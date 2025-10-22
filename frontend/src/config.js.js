// src/config.js
// Cloudflare Worker backend + Frontend integration configuration

export const BACKEND_URL =
  import.meta.env.VITE_BACKEND_URL ||
  "https://replica-backend.shoabahmad68.workers.dev";

// ✅ Axios default configuration
export const AXIOS_CONFIG = {
  headers: { "Content-Type": "application/json" },
  timeout: 20000,
  withCredentials: false,
};

// ✅ Helper to build API routes
export const apiRoute = (path = "") =>
  `${BACKEND_URL}${path.startsWith("/") ? path : `/${path}`}`;

// ✅ App metadata
export const APP_INFO = {
  name: "Replica Cloudflare Panel",
  version: "1.0.0",
  author: "Shoaib Ahamad",
  description:
    "Frontend connected to Cloudflare Worker backend receiving live XML data from Tally through Pusher.js.",
};

// ✅ LocalStorage keys (for offline caching)
export const STORAGE_KEYS = {
  imports: "uploadedExcelData",
  outstanding: "outstandingCache",
  billing: "billingCache",
  messagingImports: "messaging_imports",
  messagingOutstanding: "messaging_outstanding",
  messagingBilling: "messaging_billing",
  users: "um_users",
  roles: "um_roles",
  logs: "um_logs",
  settings: "um_settings",
};

// ✅ Pusher connection (optional, if live updates used)
export const PUSHER_CONFIG = {
  enabled: true,
  channel: "tally-updates",
  event: "data-refresh",
  key: import.meta.env.VITE_PUSHER_KEY || "default_pusher_key",
  cluster: import.meta.env.VITE_PUSHER_CLUSTER || "ap2",
};

// ✅ Default export
export default {
  BACKEND_URL,
  AXIOS_CONFIG,
  apiRoute,
  APP_INFO,
  STORAGE_KEYS,
  PUSHER_CONFIG,
};
