import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "node:path";

// The Express AI proxy runs on :8787; Vite dev server proxies /api to it.
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  server: {
    port: 5173,
    proxy: {
      "/api": {
        target: "http://localhost:8787",
        changeOrigin: true,
      },
    },
  },
  build: {
    chunkSizeWarningLimit: 900,
    rollupOptions: {
      output: {
        manualChunks: {
          react: ["react", "react-dom", "react-router-dom"],
          charts: ["recharts"],
          motion: ["framer-motion"],
          query: ["@tanstack/react-query", "@tanstack/react-table"],
          mocks: ["@faker-js/faker", "msw"],
        },
      },
    },
  },
});
