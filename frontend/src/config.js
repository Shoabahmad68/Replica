// src/config.js
// Cloudflare Worker backend + Frontend integration configuration

const FALLBACK_BACKEND = "https://replica-backend.shoabahmad68.workers.dev";

export const BACKEND_URL =
  typeof import.meta !== "undefined" &&
  import.meta.env &&
  import.meta.env.VITE_BACKEND_URL
    ? import.meta.env.VITE_BACKEND_URL
    : FALLBACK_BACKEND;

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

// ✅ Default export
export default {
  BACKEND_URL,
  AXIOS_CONFIG,
  apiRoute,
  APP_INFO,
};
