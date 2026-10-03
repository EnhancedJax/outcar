import { resolve } from "node:path"
import tailwindcss from "@tailwindcss/vite"
import react from "@vitejs/plugin-react"
import { defineConfig } from "vite"

import { placesApiPlugin } from "./vite-plugins/places-api.js"

const isProdPreview = process.env.VITE_PROD_PREVIEW === "true"

// https://vite.dev/config/
export default defineConfig({
  define: isProdPreview
    ? {
        "import.meta.env.DEV": false,
        "import.meta.env.PROD": true,
      }
    : undefined,
  plugins: [
    react(),
    tailwindcss(),
    ...(isProdPreview ? [] : [placesApiPlugin()]),
  ],
  resolve: {
    alias: {
      "@": resolve(import.meta.dirname, "./src"),
    },
  },
})
