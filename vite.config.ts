import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";
import { VitePWA } from "vite-plugin-pwa";

// Project is deployed to GitHub Pages at https://<owner>.github.io/storytime/,
// so assets need the /storytime/ base path in production but / in dev.
export default defineConfig(({ command, isPreview }) => ({
  base: command === "build" || isPreview ? "/storytime/" : "/",
  plugins: [
    react(),
    VitePWA({
      registerType: "autoUpdate",
      includeAssets: ["favicon.svg"],
      manifest: {
        name: "STORYTIME: What Is It About Lagos?",
        short_name: "Storytime Lagos",
        description:
          "A narrative choice game companion to the book What Is It About Lagos.",
        theme_color: "#c96a2b",
        background_color: "#fbf6ee",
        display: "standalone",
        start_url: "/storytime/",
        scope: "/storytime/",
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
