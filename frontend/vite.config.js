import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// ✅ Cloudflare Pages compatible configuration
export default defineConfig({
  plugins: [react()],
  build: {
    outDir: "dist",          // 👉 build output folder (Cloudflare को यही चाहिए)
    sourcemap: false,
    target: "esnext"
  },
  server: {
    port: 5173,
    open: true
  },
  optimizeDeps: {
    esbuildOptions: {
      target: "esnext"
    }
  }
});
