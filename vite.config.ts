import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { VitePWA } from "vite-plugin-pwa";
export default defineConfig({
  // Vite 8 rejects colons in absolute paths. This local-only workaround supports Eleven:11.
  server: { host: "127.0.0.1", fs: { strict: !process.cwd().includes(":") } },
  build: {
    rolldownOptions: {
      output: {
        // React rarely changes between releases, so give it its own long-cached chunk.
        codeSplitting: {
          groups: [
            {
              name: "react",
              test: /node_modules[\\/](react|react-dom|react-router|react-router-dom|scheduler)[\\/]/,
            },
          ],
        },
      },
    },
  },
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
        // Precache the app plus Latin font files. Other font subsets (only
        // fetched for non-Latin names) are cached the first time they're used.
        globPatterns: [
          "**/*.{js,css,html,png}",
          "**/*-latin-wght-normal-*.woff2",
          "**/*-latin-400-normal-*.woff2",
        ],
        runtimeCaching: [
          {
            urlPattern: /\.woff2$/,
            handler: "CacheFirst",
            options: {
              cacheName: "fonts",
              expiration: { maxEntries: 20 },
            },
          },
        ],
        navigateFallbackDenylist: [/^\/_/],
      },
    }),
  ],
});
