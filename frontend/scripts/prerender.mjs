// Prerender (SSG) sin navegador: renderiza la App real en Node (bundle SSR de
// src/entry-server.jsx) para cada URL pública y escribe dist/<ruta>/index.html.
// El cliente hidrata ese HTML (ver src/main.jsx).
//
// Requiere, en este orden: `vite build` (cliente) y
// `vite build --ssr src/entry-server.jsx --outDir .ssr` (servidor).
//
// Si alguna ruta falla, el script termina con código 1 y el build falla: sin
// prerender, buscadores y bots de IA recibirían una página vacía.
// SSG_ALLOW_FAILURES=1 lo desactiva (solo para depurar en local).

import { mkdir, writeFile, readFile } from "node:fs/promises";
import { resolve, dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import {
    PUBLIC_LANGUAGES as LANGS,
    STATIC_PUBLIC_PAGES,
    getPublicPath,
    getBlogPostPath
} from "../src/lib/public-routes.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "..");
const DIST_DIR = join(ROOT, "dist");
const SSR_ENTRY = join(ROOT, ".ssr", "entry-server.js");
// Shell SPA limpio (lo genera vite.config.js). Es la plantilla de cada página.
const APP_SHELL_FILE = "app-shell.html";
const ALLOW_FAILURES = process.env.SSG_ALLOW_FAILURES === "1";

const SANITY_PROJECT = "bmf59j7w";
const SANITY_DATASET = "production";
const SANITY_API_VERSION = "2024-03-18";

async function fetchSanitySlugs() {
    const query = `*[_type == "post" && defined(slug.current) && defined(language)]{"lang": language, "slug": slug.current}`;
    const url = `https://${SANITY_PROJECT}.api.sanity.io/v${SANITY_API_VERSION}/data/query/${SANITY_DATASET}?query=${encodeURIComponent(query)}`;
    const res = await fetch(url);
    if (!res.ok) throw new Error(`Sanity HTTP ${res.status}`);
    const json = await res.json();
    return Array.isArray(json.result) ? json.result : [];
}

function outputPathForRoute(route) {
    if (route === "/") return join(DIST_DIR, "index.html");
    const clean = route.replace(/^\/+/, "").replace(/\/+$/, "");
    return join(DIST_DIR, clean, "index.html");
}

function buildPage(template, { appHtml, head, htmlAttributes, data }, serializeForScript) {
    const rootMarker = '<div id="root"></div>';
    if (!template.includes(rootMarker)) throw new Error("La plantilla no contiene <div id=\"root\"></div>");
    return template
        // <html lang="es"> genérico -> atributos de Helmet (lang del idioma de la página)
        .replace(/<html[^>]*>/i, `<html ${htmlAttributes || 'lang="es"'}>`)
        // El <title> neutro de la plantilla lo sustituye el de Helmet
        .replace(/<title>[^<]*<\/title>\s*/i, "")
        .replace(/<noscript>[\s\S]*?<\/noscript>\s*/i, "")
        .replace("</head>", `  ${head}\n</head>`)
        .replace(rootMarker, `<div id="root">${appHtml}</div>`)
        // Datos de contenido para hidratar (antes de que se ejecute el módulo principal)
        .replace("</body>", `  <script>window.__LGA_DATA__=${serializeForScript(data)}</script>\n</body>`);
}

async function main() {
    const template = await readFile(join(DIST_DIR, APP_SHELL_FILE), "utf-8");
    const { render, serializeForScript } = await import(pathToFileURL(SSR_ENTRY).href);

    const posts = await fetchSanitySlugs();
    console.log(`[prerender] Sanity: ${posts.length} posts.`);

    const routeSet = new Set();
    for (const page of STATIC_PUBLIC_PAGES) {
        for (const lang of LANGS) routeSet.add(getPublicPath(page.path, lang));
    }
    for (const post of posts) {
        if (!post?.slug || !post?.lang || !LANGS.includes(post.lang)) continue;
        routeSet.add(getBlogPostPath(post.lang, post.slug));
    }
    const routes = Array.from(routeSet);
    console.log(`[prerender] Rutas a prerenderizar: ${routes.length}`);

    const failures = [];
    const startedAt = Date.now();
    for (const route of routes) {
        try {
            const result = await render(route);
            if (!result.appHtml || result.appHtml.length < 200) throw new Error("HTML vacío");
            const outPath = outputPathForRoute(route);
            await mkdir(dirname(outPath), { recursive: true });
            await writeFile(outPath, buildPage(template, result, serializeForScript), "utf-8");
        } catch (err) {
            failures.push({ route, reason: err?.message || String(err) });
        }
    }

    const okCount = routes.length - failures.length;
    console.log(`[prerender] OK: ${okCount}/${routes.length} en ${((Date.now() - startedAt) / 1000).toFixed(1)} s`);
    for (const f of failures) console.error(`[prerender]   ✗ ${f.route} — ${f.reason}`);

    if (failures.length > 0 && !ALLOW_FAILURES) {
        console.error("[prerender] El build falla: hay rutas públicas sin HTML prerenderizado.");
        process.exit(1);
    }
    process.exit(0);
}

main().catch((err) => {
    console.error(`[prerender] Error: ${err?.stack || err}`);
    process.exit(ALLOW_FAILURES ? 0 : 1);
});
