import { defineConfig } from "vite";
import tailwindcss from "@tailwindcss/vite";
import { copyFileSync } from "node:fs";
import { resolve } from "node:path";
import { LOCALE_LANGUAGES, readDictionary, scanPublicSources, splitDictionary } from "./scripts/locale-split.mjs";

// Copia dist/index.html a dist/app-shell.html al terminar el build.
// Es el shell SPA limpio que vercel.json usa como fallback para las rutas de
// app (/app, /login, /rsvp...). El prerender sobrescribe index.html con la
// home en español, así que las rutas de app no pueden depender de él.
function appShellPlugin() {
  let outDir = "dist";
  let isSsrBuild = false;
  return {
    name: "lga-app-shell",
    apply: "build",
    configResolved(config) {
      outDir = resolve(config.root, config.build.outDir);
      isSsrBuild = Boolean(config.build.ssr);
    },
    closeBundle() {
      if (isSsrBuild) return;
      copyFileSync(resolve(outDir, "index.html"), resolve(outDir, "app-shell.html"));
    }
  };
}

// Diccionarios partidos en dos módulos virtuales por idioma:
//   virtual:lga-locale/<idioma>.public  -> claves de las páginas públicas
//   virtual:lga-locale/<idioma>.rest    -> el resto (app, login, RSVP...)
// Ver scripts/locale-split.mjs. Se emiten como JSON.parse("..."): ocupan
// lo mismo que el JSON (con exports por clave pesaban un 45 % más).
const LOCALE_MODULE_RE = /^virtual:lga-locale\/([a-z]{2})\.(public|rest)$/;

function localeSplitPlugin() {
  let srcDir = "src";
  return {
    name: "lga-locale-split",
    configResolved(config) {
      srcDir = resolve(config.root, "src");
    },
    resolveId(id) {
      if (LOCALE_MODULE_RE.test(id)) return `\0${id}`;
      return null;
    },
    load(id) {
      if (!id.startsWith("\0virtual:lga-locale/")) return null;
      const [, language, part] = id.slice(1).match(LOCALE_MODULE_RE) || [];
      if (!LOCALE_LANGUAGES.includes(language)) return null;
      const scan = scanPublicSources(srcDir);
      // En desarrollo, si cambia el código o el diccionario se recalcula.
      for (const file of scan.files) this.addWatchFile(file);
      this.addWatchFile(resolve(srcDir, "i18n", `${language}.json`));
      const data = splitDictionary(readDictionary(srcDir, language), scan)[part];
      return `export default JSON.parse(${JSON.stringify(JSON.stringify(data))});`;
    }
  };
}

export default defineConfig(({ isSsrBuild }) => ({
  plugins: [tailwindcss(), localeSplitPlugin(), appShellPlugin()],
  build: {
    // El bundle SSR (prerender) no necesita copiar public/
    copyPublicDir: !isSsrBuild,
    rolldownOptions: {
      output: {
        // locale-en-public-[hash].js, locale-en-rest-[hash].js...
        chunkFileNames: (chunk) => {
          const match = chunk.facadeModuleId?.match(/virtual:lga-locale\/([a-z]{2})\.(public|rest)$/);
          return match ? `assets/locale-${match[1]}-${match[2]}-[hash].js` : "assets/[name]-[hash].js";
        },
        // Solo las librerías compartidas por toda la app tienen chunk propio.
        // El resto (recharts, framer-motion, qrcode, Sanity...) NO va a un
        // "vendor" común: Rolldown las coloca junto a la pantalla que las usa,
        // para que las páginas públicas no descarguen el código del panel.
        codeSplitting: isSsrBuild
          ? true
          : {
              groups: [
                { name: "vendor-react", test: /node_modules[\\/](react|react-dom|scheduler)[\\/]/ },
                { name: "vendor-router", test: /node_modules[\\/](react-router|react-router-dom)[\\/]/ },
                { name: "vendor-supabase", test: /node_modules[\\/]@supabase[\\/]/ },
                { name: "vendor-icons", test: /node_modules[\\/]lucide-react[\\/]/ }
              ]
            }
      }
    }
  },
  // Vite 8 transforma con Oxc (sustituye a la opción esbuild).
  oxc: {
    jsx: { runtime: "automatic" }
  },
  server: {
    host: true,
    port: 5173,
    strictPort: true
  }
}));
