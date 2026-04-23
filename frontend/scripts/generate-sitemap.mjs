import { createClient } from "@sanity/client";
import { writeFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));

const DOMAIN = "https://legoodanfitrion.com";
const LANGS = ["es", "ca", "en", "fr", "it"];

const ROUTES_DICT = {
    es: { features: "caracteristicas", pricing: "precios", contact: "contacto", blog: "blog", about: "sobre-nosotros", privacy: "privacidad", terms: "terminos" },
    ca: { features: "caracteristiques", pricing: "preus", contact: "contacte", blog: "blog", about: "sobre-nosaltres", privacy: "privacitat", terms: "termes" },
    en: { features: "features", pricing: "pricing", contact: "contact", blog: "blog", about: "about", privacy: "privacy", terms: "terms" },
    fr: { features: "fonctionnalites", pricing: "tarifs", contact: "contact", blog: "blog", about: "a-propos", privacy: "confidentialite", terms: "conditions" },
    it: { features: "funzionalita", pricing: "prezzi", contact: "contatti", blog: "blog", about: "chi-siamo", privacy: "privacy", terms: "termini" }
};

const STATIC_ROUTES = [
    { key: "/", priority: "1.0", changefreq: "weekly" },
    { key: "features", priority: "0.8", changefreq: "monthly" },
    { key: "pricing", priority: "0.8", changefreq: "monthly" },
    { key: "contact", priority: "0.6", changefreq: "monthly" },
    { key: "blog", priority: "0.8", changefreq: "weekly" },
    { key: "about", priority: "0.7", changefreq: "monthly" },
    { key: "privacy", priority: "0.3", changefreq: "yearly" },
    { key: "terms", priority: "0.3", changefreq: "yearly" }
];

function getUrl(lang, key) {
    if (key === "/") return lang === "es" ? `${DOMAIN}/` : `${DOMAIN}/${lang}`;
    const slug = ROUTES_DICT[lang]?.[key] || key;
    return lang === "es" ? `${DOMAIN}/${slug}` : `${DOMAIN}/${lang}/${slug}`;
}

function getBlogPostUrl(lang, slug) {
    return lang === "es" ? `${DOMAIN}/blog/${slug}` : `${DOMAIN}/${lang}/blog/${slug}`;
}

function escapeXml(value) {
    return String(value)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&apos;");
}

function buildUrlBlock({ loc, alternates, priority, changefreq, lastmod }) {
    const lines = ["  <url>", `    <loc>${escapeXml(loc)}</loc>`];
    for (const alt of alternates) {
        lines.push(`    <xhtml:link rel="alternate" hreflang="${alt.lang}" href="${escapeXml(alt.href)}" />`);
    }
    const defaultAlt = alternates.find((a) => a.lang === "es") || alternates[0];
    if (defaultAlt) {
        lines.push(`    <xhtml:link rel="alternate" hreflang="x-default" href="${escapeXml(defaultAlt.href)}" />`);
    }
    if (lastmod) lines.push(`    <lastmod>${lastmod}</lastmod>`);
    if (changefreq) lines.push(`    <changefreq>${changefreq}</changefreq>`);
    if (priority) lines.push(`    <priority>${priority}</priority>`);
    lines.push("  </url>");
    return lines.join("\n");
}

async function fetchBlogPosts() {
    const client = createClient({
        projectId: "bmf59j7w",
        dataset: "production",
        useCdn: true,
        apiVersion: "2024-03-18"
    });

    return client.fetch(`*[_type == "post" && defined(slug.current) && defined(language)]{
        _id,
        "lang": language,
        "slug": slug.current,
        "updatedAt": _updatedAt,
        "translations": *[_type == "translation.metadata" && references(^._id)][0].translations[].value->{
          "lang": language,
          "slug": slug.current
        }
    }`);
}

async function generate() {
    const urlBlocks = [];

    for (const route of STATIC_ROUTES) {
        for (const lang of LANGS) {
            const loc = getUrl(lang, route.key);
            const alternates = LANGS.map((l) => ({ lang: l, href: getUrl(l, route.key) }));
            urlBlocks.push(buildUrlBlock({
                loc,
                alternates,
                priority: route.priority,
                changefreq: route.changefreq
            }));
        }
    }

    let postCount = 0;
    try {
        const posts = await fetchBlogPosts();
        for (const post of posts) {
            if (!post?.slug || !post?.lang || !LANGS.includes(post.lang)) continue;

            const selfLang = post.lang;
            const translations = Array.isArray(post.translations) ? post.translations : [];
            const altMap = new Map();
            altMap.set(selfLang, getBlogPostUrl(selfLang, post.slug));
            for (const tr of translations) {
                if (tr?.lang && tr?.slug && LANGS.includes(tr.lang)) {
                    altMap.set(tr.lang, getBlogPostUrl(tr.lang, tr.slug));
                }
            }
            const alternates = Array.from(altMap.entries()).map(([lang, href]) => ({ lang, href }));

            const loc = getBlogPostUrl(selfLang, post.slug);
            const lastmod = post.updatedAt ? new Date(post.updatedAt).toISOString().slice(0, 10) : undefined;

            urlBlocks.push(buildUrlBlock({
                loc,
                alternates,
                priority: "0.7",
                changefreq: "monthly",
                lastmod
            }));
            postCount += 1;
        }
    } catch (err) {
        console.warn(`[sitemap] Sanity fetch failed, static routes only. Reason: ${err.message}`);
    }

    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:xhtml="http://www.w3.org/1999/xhtml">

${urlBlocks.join("\n\n")}

</urlset>
`;

    const outPath = resolve(__dirname, "..", "public", "sitemap.xml");
    writeFileSync(outPath, xml, "utf-8");

    const staticCount = STATIC_ROUTES.length * LANGS.length;
    console.log(`[sitemap] OK -> ${outPath}`);
    console.log(`[sitemap]   static URLs: ${staticCount}`);
    console.log(`[sitemap]   blog post URLs: ${postCount}`);
    console.log(`[sitemap]   total: ${staticCount + postCount}`);
}

generate().catch((err) => {
    console.error("[sitemap] generation failed:", err);
    process.exit(1);
});
