import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// ✅ Cloudflare-compatible configuration
export default defineConfig({
  plugins: [react()],

  // Local run settings
  server: {
    port: 3000,
    open: true,
  },

  // 👇 Cloudflare needs build output here
  build: {
    outDir: "dist",       // Required: Pages uses this folder to publish
    sourcemap: false,
    target: "esnext",
  },

  // 👇 Avoids ESM conflicts in Cloudflare env
  optimizeDeps: {
    esbuildOptions: {
      target: "esnext",
    },
  },
});
