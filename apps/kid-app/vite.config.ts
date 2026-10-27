import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: "autoUpdate",
      includeAssets: ["icon.svg"],
      manifest: {
        name: "socialStory",
        short_name: "socialStory",
        description: "Getting ready, one calm step at a time.",
        display: "fullscreen",
        orientation: "any",
        background_color: "#f4f1ea",
        theme_color: "#f4f1ea",
        icons: [{ src: "icon.svg", sizes: "any", type: "image/svg+xml", purpose: "any" }],
      },
      workbox: {
        // Cache the app shell so it opens in a waiting room with no signal.
        globPatterns: ["**/*.{js,css,html,svg,png,webp}"],
      },
    }),
  ],
  server: {
    proxy: { "/api": "http://localhost:8787" },
  },
});
