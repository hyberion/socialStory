import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    strictPort: true,
    // Listen on all interfaces: fixes Windows IPv4/IPv6 "localhost" mismatches
    // and lets you open the app from another device on your network.
    host: true,
    // In dev, /api calls go to the local API server; no CORS setup needed.
    // ws: true carries the live-voice WebSocket through too.
    proxy: { "/api": { target: "http://localhost:8787", ws: true } },
  },
});
