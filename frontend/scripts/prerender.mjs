import { mkdir, writeFile, readFile, stat } from "node:fs/promises";
import { createServer } from "node:http";
import { resolve, dirname, join, extname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const DIST_DIR = resolve(__dirname, "..", "dist");
const PORT = Number(process.env.SSG_PORT || 9999);
const ROUTE_TIMEOUT_MS = Number(process.env.SSG_ROUTE_TIMEOUT_MS || 15000);

const SANITY_PROJECT = "bmf59j7w";
const SANITY_DATASET = "production";
const SANITY_API_VERSION = "2024-03-18";

const LANGS = ["es", "ca", "en", "fr", "it"];

const ROUTES_DICT = {
    es: { features: "caracteristicas", pricing: "precios", contact: "contacto", blog: "blog", about: "sobre-nosotros", privacy: "privacidad", terms: "terminos" },
    ca: { features: "caracteristiques", pricing: "preus", contact: "contacte", blog: "blog", about: "sobre-nosaltres", privacy: "privacitat", terms: "termes" },
    en: { features: "features", pricing: "pricing", contact: "contact", blog: "blog", about: "about", privacy: "privacy", terms: "terms" },
    fr: { features: "fonctionnalites", pricing: "tarifs", contact: "contact", blog: "blog", about: "a-propos", privacy: "confidentialite", terms: "conditions" },
    it: { features: "funzionalita", pricing: "prezzi", contact: "contatti", blog: "blog", about: "chi-siamo", privacy: "privacy", terms: "termini" }
};

const STATIC_KEYS = ["/", "features", "pricing", "contact", "about", "blog", "privacy", "terms"];

const MIME = {
    ".js": "text/javascript; charset=utf-8",
    ".mjs": "text/javascript; charset=utf-8",
    ".css": "text/css; charset=utf-8",
    ".html": "text/html; charset=utf-8",
    ".json": "application/json; charset=utf-8",
    ".map": "application/json; charset=utf-8",
    ".svg": "image/svg+xml",
    ".png": "image/png",
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".webp": "image/webp",
    ".avif": "image/avif",
    ".woff": "font/woff",
    ".woff2": "font/woff2",
    ".ttf": "font/ttf",
    ".ico": "image/x-icon",
    ".xml": "application/xml; charset=utf-8",
    ".txt": "text/plain; charset=utf-8"
};

function getLocalPath(lang, key) {
    if (key === "/") return lang === "es" ? "/" : `/${lang}`;
    const slug = ROUTES_DICT[lang]?.[key] || key;
    return lang === "es" ? `/${slug}` : `/${lang}/${slug}`;
}

function getBlogPostLocalPath(lang, slug) {
    return lang === "es" ? `/blog/${slug}` : `/${lang}/blog/${slug}`;
}

async function fileExists(p) {
    try {
        const s = await stat(p);
        return s.isFile();
    } catch {
        return false;
    }
}

async function dirExists(p) {
    try {
        const s = await stat(p);
        return s.isDirectory();
    } catch {
        return false;
    }
}

async function fetchSanitySlugs() {
    const query = `*[_type == "post" && defined(slug.current) && defined(language)]{"lang": language, "slug": slug.current}`;
    const url = `https://${SANITY_PROJECT}.api.sanity.io/v${SANITY_API_VERSION}/data/query/${SANITY_DATASET}?query=${encodeURIComponent(query)}`;
    const res = await fetch(url);
    if (!res.ok) throw new Error(`Sanity HTTP ${res.status}`);
    const json = await res.json();
    return Array.isArray(json.result) ? json.result : [];
}

async function createShellServer(distDir) {
    const shellPath = join(distDir, "index.html");
    if (!(await fileExists(shellPath))) {
        throw new Error(`Shell index.html not found at ${shellPath}`);
    }
    const shell = await readFile(shellPath, "utf-8");

    const server = createServer(async (req, res) => {
        try {
            const reqUrl = (req.url || "/").split("?")[0];
            if (reqUrl !== "/" && reqUrl !== "/index.html") {
                const candidate = join(distDir, reqUrl);
                if (await fileExists(candidate)) {
                    const ext = extname(candidate).toLowerCase();
                    const body = await readFile(candidate);
                    res.writeHead(200, { "Content-Type": MIME[ext] || "application/octet-stream" });
                    return res.end(body);
                }
            }
            res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
            return res.end(shell);
        } catch (err) {
            res.writeHead(500, { "Content-Type": "text/plain" });
            return res.end(`server error: ${err.message}`);
        }
    });
    await new Promise((resolvePromise, rejectPromise) => {
        server.once("error", rejectPromise);
        server.listen(PORT, "127.0.0.1", () => {
            server.off("error", rejectPromise);
            resolvePromise();
        });
    });
    return server;
}

function outputPathForRoute(route) {
    if (route === "/") return join(DIST_DIR, "index.html");
    const clean = route.replace(/^\/+/, "").replace(/\/+$/, "");
    return join(DIST_DIR, clean, "index.html");
}

async function renderRoute(browser, route) {
    const page = await browser.newPage();
    try {
        await page.setViewport({ width: 1280, height: 800 });
        const url = `http://127.0.0.1:${PORT}${route}`;
        await page.goto(url, { waitUntil: "domcontentloaded", timeout: ROUTE_TIMEOUT_MS });

        await page.waitForFunction(() => {
            const rootEl = document.getElementById("root");
            if (!rootEl || rootEl.children.length === 0) return false;
            return window.prerenderReady !== false;
        }, { timeout: ROUTE_TIMEOUT_MS, polling: 200 });

        const html = await page.content();
        const outPath = outputPathForRoute(route);
        await mkdir(dirname(outPath), { recursive: true });
        await writeFile(outPath, html, "utf-8");
        return { ok: true };
    } catch (err) {
        return { ok: false, reason: err.message };
    } finally {
        try { await page.close(); } catch { /* ignore */ }
    }
}

async function main() {
    if (!(await dirExists(DIST_DIR))) {
        console.warn(`[prerender] dist/ not found at ${DIST_DIR}. Skipping SSG (nothing to prerender).`);
        return;
    }

    let puppeteer;
    try {
        puppeteer = (await import("puppeteer")).default;
    } catch (err) {
        console.warn(`[prerender] puppeteer not available (${err.message}). Skipping SSG.`);
        console.warn(`[prerender] Install with: cd frontend && npm install --save-dev puppeteer`);
        return;
    }

    let posts = [];
    try {
        posts = await fetchSanitySlugs();
        console.log(`[prerender] Sanity returned ${posts.length} blog slugs.`);
    } catch (err) {
        console.warn(`[prerender] Sanity slug fetch failed (${err.message}). Continuing with static routes only.`);
    }

    const routeSet = new Set();
    for (const key of STATIC_KEYS) {
        for (const lang of LANGS) {
            routeSet.add(getLocalPath(lang, key));
        }
    }
    for (const post of posts) {
        if (!post?.slug || !post?.lang || !LANGS.includes(post.lang)) continue;
        routeSet.add(getBlogPostLocalPath(post.lang, post.slug));
    }
    const routes = Array.from(routeSet);
    console.log(`[prerender] Total routes to prerender: ${routes.length}`);

    let server;
    try {
        server = await createShellServer(DIST_DIR);
    } catch (err) {
        console.warn(`[prerender] Could not start static shell server (${err.message}). Skipping SSG.`);
        return;
    }

    let browser;
    try {
        browser = await puppeteer.launch({
            headless: "new",
            args: ["--no-sandbox", "--disable-setuid-sandbox", "--disable-dev-shm-usage"]
        });
    } catch (err) {
        console.warn(`[prerender] puppeteer.launch failed (${err.message}). Skipping SSG.`);
        await new Promise((r) => server.close(r));
        return;
    }

    const results = { ok: 0, failed: 0, failures: [] };
    for (const route of routes) {
        const result = await renderRoute(browser, route);
        if (result.ok) {
            results.ok += 1;
            process.stdout.write(".");
        } else {
            results.failed += 1;
            results.failures.push({ route, reason: result.reason });
            process.stdout.write("x");
        }
    }
    process.stdout.write("\n");

    try { await browser.close(); } catch { /* ignore */ }
    await new Promise((r) => server.close(r));

    console.log(`[prerender] Done. OK: ${results.ok}, Failed: ${results.failed}, Total: ${routes.length}`);
    if (results.failures.length > 0) {
        console.warn(`[prerender] Failed routes (served from SPA fallback):`);
        for (const f of results.failures) {
            console.warn(`[prerender]   ${f.route} — ${f.reason}`);
        }
    }
}

main().catch((err) => {
    console.warn(`[prerender] Top-level error, skipping SSG: ${err.message}`);
}).finally(() => {
    // Directive #2: NEVER fail the pipeline. Always exit 0.
    process.exit(0);
});
