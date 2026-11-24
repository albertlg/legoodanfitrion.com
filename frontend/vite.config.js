import { defineConfig } from "vite";
import tailwindcss from "@tailwindcss/vite";
import { copyFileSync } from "node:fs";
import { resolve } from "node:path";

// Copia dist/index.html a dist/app-shell.html al terminar el build.
// Es el shell SPA limpio que vercel.json usa como fallback para las rutas de
// app (/app, /login, /rsvp...). El prerender sobrescribe index.html con la
// home en español, así que las rutas de app no pueden depender de él.
function appShellPlugin() {
  let outDir = "dist";
  return {
    name: "lga-app-shell",
    apply: "build",
    configResolved(config) {
      outDir = resolve(config.root, config.build.outDir);
    },
    closeBundle() {
      copyFileSync(resolve(outDir, "index.html"), resolve(outDir, "app-shell.html"));
    }
  };
}

export default defineConfig({
  plugins: [tailwindcss(), appShellPlugin()],
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