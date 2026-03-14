import { defineConfig } from "vite";
import tailwindcss from "@tailwindcss/vite";
import vitePrerender from "vite-plugin-prerender"; // 🚀 NUEVO
import path from "path";
import { fileURLToPath } from "url";

// Resolutores de rutas para módulos ES
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export default defineConfig({
  plugins: [
    tailwindcss(),
    // 🚀 FIX PRERENDER: Configuración del generador estático
    vitePrerender({
      // El directorio donde Vite deja los archivos construidos
      staticDir: path.join(__dirname, "dist"),
      // Las rutas públicas de tu landing que queremos indexar en Google
      routes: ["/", "/features", "/pricing", "/contact"],
      // Pequeño ajuste para que Puppeteer espere a que React termine de pintar
      renderer: new vitePrerender.PuppeteerRenderer({
        renderAfterDocumentEvent: "custom-render-trigger", // Opcional, pero da estabilidad
        timeout: 10000,
        // IMPORTANTE para Docker/Vercel: argumentos para que Chromium no falle
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox']
      }),
    }),
  ],
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes("node_modules")) {
            return undefined;
          }
          if (id.includes("react-router")) {
            return "vendor-router";
          }
          if (id.includes("@supabase")) {
            return "vendor-supabase";
          }
          if (id.includes("lucide-react")) {
            return "vendor-icons";
          }
          return "vendor";
        }
      }
    }
  },
  esbuild: {
    jsx: "automatic"
  },
  server: {
    host: true,
    port: 5173,
    strictPort: true
  }
});