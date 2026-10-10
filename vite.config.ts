import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";
import { VitePWA } from "vite-plugin-pwa";

// Project is deployed to GitHub Pages at https://<owner>.github.io/STORYTIME/
// (the repo is named STORYTIME, uppercase — GitHub Pages paths are
// case-sensitive, so this must match the repo name exactly or every asset
// 404s and the page renders blank). Assets need this base path in
// production but / in dev.
export default defineConfig(({ command, isPreview }) => ({
  base: command === "build" || isPreview ? "/STORYTIME/" : "/",
  plugins: [
    react(),
    VitePWA({
      registerType: "autoUpdate",
      includeAssets: ["favicon.svg"],
      manifest: {
        name: "What Is It About Lagos?",
        short_name: "Lagos Life",
        description: "A BitLife-style procedural life sim set in Lagos.",
        theme_color: "#c96a2b",
        background_color: "#fbf6ee",
        display: "standalone",
        start_url: "/STORYTIME/",
        scope: "/STORYTIME/",
        icons: [
          { src: "icons/icon-192.png", sizes: "192x192", type: "image/png" },
          { src: "icons/icon-512.png", sizes: "512x512", type: "image/png" },
          {
            src: "icons/icon-512-maskable.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "maskable",
          },
        ],
      },
    }),
  ],
}));
