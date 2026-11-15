import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { VitePWA } from "vite-plugin-pwa";
export default defineConfig({
  // Vite 8 rejects colons in absolute paths. This local-only workaround supports Eleven:11.
  server: { host: "127.0.0.1", fs: { strict: !process.cwd().includes(":") } },
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: "prompt",
      manifest: {
        name: "Eleven:11 — Friends, votes & secrets",
        short_name: "Eleven:11",
        start_url: "/",
        scope: "/",
        id: "/",
        description: "Your friends. Your votes. Your secrets.",
        theme_color: "#8064C8",
        background_color: "#F5F0E8",
        display: "standalone",
        icons: [
          { src: "/icon-192.png", sizes: "192x192", type: "image/png" },
          { src: "/icon-512.png", sizes: "512x512", type: "image/png" },
        ],
      },
      workbox: {
        globPatterns: ["**/*.{js,css,html,png,woff2}"],
        navigateFallbackDenylist: [/^\/_/],
      },
    }),
  ],
});
