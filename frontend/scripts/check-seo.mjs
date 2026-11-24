// Comprueba que cada URL del sitemap sirve HTML real a crawlers que NO ejecutan
// JavaScript (GPTBot, ClaudeBot, previews sociales...).
//
// Uso:
//   node scripts/check-seo.mjs                       # producción
//   SEO_CHECK_ORIGIN=http://localhost:4173 node scripts/check-seo.mjs
//   SEO_CHECK_LIMIT=20 node scripts/check-seo.mjs    # solo las N primeras URLs
//
// Sale con código 1 si alguna URL falla, para que el CI lo marque en rojo.

import { PUBLIC_LANGUAGES, DEFAULT_LANGUAGE, SITE_ORIGIN } from "../src/lib/public-routes.js";

const ORIGIN = (process.env.SEO_CHECK_ORIGIN || SITE_ORIGIN).replace(/\/+$/, "");
const LIMIT = Number(process.env.SEO_CHECK_LIMIT || 0);
const CONCURRENCY = Number(process.env.SEO_CHECK_CONCURRENCY || 6);
const MIN_TEXT_CHARS = Number(process.env.SEO_CHECK_MIN_TEXT || 400);
const USER_AGENT = "Mozilla/5.0 (compatible; GPTBot/1.2; +https://openai.com/gptbot) LGA-SEO-Check";
const GENERIC_TITLE = "LeGoodAnfitrión";

function languageForPath(pathname) {
    const first = pathname.split("/").filter(Boolean)[0];
    return PUBLIC_LANGUAGES.includes(first) ? first : DEFAULT_LANGUAGE;
}

function visibleTextLength(html) {
    const body = html.match(/<body[^>]*>([\s\S]*)<\/body>/i)?.[1] || "";
    return body
        .replace(/<script[\s\S]*?<\/script>/gi, " ")
        .replace(/<style[\s\S]*?<\/style>/gi, " ")
        .replace(/<noscript[\s\S]*?<\/noscript>/gi, " ")
        .replace(/<[^>]+>/g, " ")
        .replace(/\s+/g, " ")
        .trim().length;
}

function normalizeUrl(url) {
    return url.replace(/\/+$/, "") || url;
}

async function fetchText(url) {
    const res = await fetch(url, { headers: { "user-agent": USER_AGENT }, redirect: "manual" });
    return { status: res.status, location: res.headers.get("location"), body: await res.text() };
}

async function checkUrl(canonicalUrl) {
    const { pathname } = new URL(canonicalUrl);
    const target = `${ORIGIN}${pathname}`;
    const problems = [];
    let res;
    try {
        res = await fetchText(target);
    } catch (err) {
        return { url: pathname, problems: [`fetch failed: ${err.message}`] };
    }
    if (res.status !== 200) {
        problems.push(`HTTP ${res.status}${res.location ? ` -> ${res.location}` : ""}`);
        return { url: pathname, problems };
    }
    const html = res.body;
    const title = html.match(/<title[^>]*>([^<]*)<\/title>/i)?.[1]?.trim() || "";
    const lang = html.match(/<html[^>]*\blang=["']([^"']+)["']/i)?.[1] || "";
    const canonicals = [...html.matchAll(/<link[^>]+rel=["']canonical["'][^>]*>/gi)]
        .map((m) => m[0].match(/href=["']([^"']+)["']/i)?.[1])
        .filter(Boolean);
    const hreflangCount = (html.match(/hreflang=/gi) || []).length;
    const textChars = visibleTextLength(html);
    const expectedLang = languageForPath(pathname);

    if (!title || title === GENERIC_TITLE) problems.push(`generic title "${title}"`);
    if (lang !== expectedLang) problems.push(`lang="${lang}" (expected ${expectedLang})`);
    if (canonicals.length !== 1) problems.push(`${canonicals.length} canonical tags`);
    else if (normalizeUrl(canonicals[0]) !== normalizeUrl(canonicalUrl)) problems.push(`canonical ${canonicals[0]}`);
    if (hreflangCount < 2) problems.push("no hreflang alternates");
    if (textChars < MIN_TEXT_CHARS) problems.push(`only ${textChars} chars of visible text`);

    return { url: pathname, problems };
}

async function main() {
    const sitemap = await fetchText(`${ORIGIN}/sitemap.xml`);
    if (sitemap.status !== 200) {
        console.error(`[seo-check] sitemap.xml returned HTTP ${sitemap.status}`);
        process.exit(1);
    }
    let urls = [...sitemap.body.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1].trim());
    if (LIMIT > 0) urls = urls.slice(0, LIMIT);
    console.log(`[seo-check] ${urls.length} URLs from ${ORIGIN}/sitemap.xml (UA: GPTBot)`);

    const results = [];
    let cursor = 0;
    async function worker() {
        while (cursor < urls.length) {
            const url = urls[cursor++];
            results.push(await checkUrl(url));
        }
    }
    await Promise.all(Array.from({ length: Math.min(CONCURRENCY, urls.length) }, worker));

    const failed = results.filter((r) => r.problems.length > 0);
    for (const r of failed.sort((a, b) => a.url.localeCompare(b.url))) {
        console.log(`  ✗ ${r.url}: ${r.problems.join("; ")}`);
    }
    console.log(`[seo-check] OK: ${results.length - failed.length}/${results.length}`);
    if (failed.length > 0) process.exit(1);
}

main().catch((err) => {
    console.error(`[seo-check] ${err.message}`);
    process.exit(1);
});
