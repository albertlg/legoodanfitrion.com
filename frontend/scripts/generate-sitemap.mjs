import { createClient } from "@sanity/client";
import { writeFileSync } from "node:fs";
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

    const staticCount = STATIC_PUBLIC_PAGES.length * LANGS.length;
    console.log(`[sitemap] OK -> ${outPath}`);
    console.log(`[sitemap]   static URLs: ${staticCount}`);
    console.log(`[sitemap]   blog post URLs: ${postCount}`);
    console.log(`[sitemap]   total: ${staticCount + postCount}`);
}

generate().catch((err) => {
    console.error("[sitemap] generation failed:", err);
    process.exit(1);
});
