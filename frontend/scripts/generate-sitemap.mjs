import { createClient } from "@sanity/client";
import { writeFileSync, readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

import {
    PUBLIC_LANGUAGES as LANGS,
    DEFAULT_LANGUAGE,
    STATIC_PUBLIC_PAGES,
    getPublicUrl,
    getBlogPostUrl
} from "../src/lib/public-routes.js";

const __dirname = dirname(fileURLToPath(import.meta.url));

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
    const defaultAlt = alternates.find((a) => a.lang === DEFAULT_LANGUAGE) || alternates[0];
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
        useCdn: false,
        apiVersion: "2024-03-18"
    });

    return client.fetch(`*[_type == "post" && defined(slug.current) && defined(language)]{
        _id,
        "lang": language,
        "slug": slug.current,
        "updatedAt": _updatedAt,
        title,
        excerpt,
        publishedAt,
        "translations": *[_type == "translation.metadata" && references(^._id)][0].translations[].value->{
          "lang": language,
          "slug": slug.current
        }
    }`);
}

async function generate() {
    const urlBlocks = [];

    for (const route of STATIC_PUBLIC_PAGES) {
        for (const lang of LANGS) {
            const loc = getPublicUrl(route.path, lang);
            const alternates = LANGS.map((l) => ({ lang: l, href: getPublicUrl(route.path, l) }));
            urlBlocks.push(buildUrlBlock({
                loc,
                alternates,
                priority: route.priority,
                changefreq: route.changefreq
            }));
        }
    }

    let postCount = 0;
    let fetchedPosts = null;
    try {
        const posts = await fetchBlogPosts();
        fetchedPosts = posts;
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

    if (fetchedPosts) updateLlmsGuides(fetchedPosts);

    const staticCount = STATIC_PUBLIC_PAGES.length * LANGS.length;
    console.log(`[sitemap] OK -> ${outPath}`);
    console.log(`[sitemap]   static URLs: ${staticCount}`);
    console.log(`[sitemap]   blog post URLs: ${postCount}`);
    console.log(`[sitemap]   total: ${staticCount + postCount}`);
}

// llms.txt: sección "Hosting guides" generada con los artículos del blog en
// inglés (idioma de referencia para los modelos), para que los asistentes de IA
// conozcan y puedan citar el contenido. El resto del fichero se edita a mano.
const GUIDES_HEADER = "## Hosting guides (blog)";
const LEGAL_HEADER = "## Legal";

function oneLine(text, max = 180) {
    const clean = String(text || "").replace(/\s+/g, " ").trim();
    return clean.length > max ? `${clean.slice(0, max - 1).trimEnd()}…` : clean;
}

function updateLlmsGuides(posts) {
    const llmsPath = resolve(__dirname, "..", "public", "llms.txt");
    const current = readFileSync(llmsPath, "utf-8");
    const english = posts
        .filter((p) => p?.lang === "en" && p?.slug && p?.title)
        .sort((a, b) => String(b.publishedAt || "").localeCompare(String(a.publishedAt || "")));
    if (english.length === 0) return;

    const lines = english.map((p) => {
        const excerpt = oneLine(p.excerpt);
        return `- [${oneLine(p.title, 140)}](${getBlogPostUrl("en", p.slug)})${excerpt ? `: ${excerpt}` : ""}`;
    });
    const section = [
        GUIDES_HEADER,
        "",
        `Practical guides for hosts, published in Spanish, Catalan, English, French and Italian (each page links its translations with hreflang). English versions (${english.length}):`,
        "",
        ...lines,
        "",
        ""
    ].join("\n");

    let next;
    const start = current.indexOf(GUIDES_HEADER);
    const legal = current.indexOf(LEGAL_HEADER);
    if (start !== -1) {
        const end = current.indexOf(LEGAL_HEADER, start);
        next = current.slice(0, start) + section + (end !== -1 ? current.slice(end) : "");
    } else if (legal !== -1) {
        next = current.slice(0, legal) + section + current.slice(legal);
    } else {
        next = `${current.trimEnd()}\n\n${section}`;
    }
    writeFileSync(llmsPath, next, "utf-8");
    console.log(`[llms] OK -> ${english.length} guías en inglés`);
}

generate().catch((err) => {
    console.error("[sitemap] generation failed:", err);
    process.exit(1);
});
