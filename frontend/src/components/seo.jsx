import React from "react";
import { Helmet } from "react-helmet-async";
import { PUBLIC_LANGUAGES, SITE_ORIGIN, getPublicUrl, getBlogPostUrl } from "../lib/public-routes";

export function SEO({
    title,
    description,
    image = `${SITE_ORIGIN}/og-home.jpg`,
    language,
    slug = "",
    isBlogPost = false,
    translations = []
}) {
    // 🚀 URLs públicas traducidas desde el módulo compartido de rutas
    const getFullUrl = (lang, internalSlug) => {
        if (isBlogPost) {
            const translation = translations.find(t => t.lang === lang);
            if (!translation) return null; // Ignora los idiomas en los que el post no exista
            return getBlogPostUrl(lang, translation.slug);
        }
        const clean = String(internalSlug || "").replace(/^\/+/, "");
        return getPublicUrl(clean ? `/${clean}` : "/", lang);
    };

    // Construimos la Canonical actual y el x-default (que forzamos siempre al español)
    const canonicalUrl = getFullUrl(language, slug);
    const xDefaultUrl = getFullUrl("es", slug);

    const langs = PUBLIC_LANGUAGES;

    return (
        <Helmet
            defer={false} // Obliga a Helmet a priorizar esta inyección en el Head
            htmlAttributes={{ lang: language }}
        >
            {/* Básicos */}
            <title>{title}</title>
            <meta name="description" content={description} />
            {canonicalUrl && <link rel="canonical" href={canonicalUrl} />}

            {/* Hreflang para Google */}
            {langs.map((lang) => {
                const href = getFullUrl(lang, slug);
                // Solo inyectamos el hreflang si la URL existe (vital para posts sin traducir)
                return href ? <link key={lang} rel="alternate" hreflang={lang} href={href} /> : null;
            })}
            {xDefaultUrl && <link rel="alternate" hreflang="x-default" href={xDefaultUrl} />}

            {/* Open Graph / Redes Sociales */}
            <meta property="og:site_name" content="LeGoodAnfitrión" />
            <meta property="og:type" content={isBlogPost ? "article" : "website"} />
            <meta property="og:title" content={title} />
            <meta property="og:description" content={description} />
            {image && <meta property="og:image" content={image} />}
            {canonicalUrl && <meta property="og:url" content={canonicalUrl} />}

            {/* Twitter */}
            <meta name="twitter:card" content="summary_large_image" />
            <meta name="twitter:title" content={title} />
            <meta name="twitter:description" content={description} />
            {image && <meta name="twitter:image" content={image} />}
        </Helmet>
    );
}