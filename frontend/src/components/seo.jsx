import React from "react";
import { Helmet } from "react-helmet-async";

const DOMAIN = "https://legoodanfitrion.com";

const ROUTES_DICT = {
    es: { features: "caracteristicas", pricing: "precios", contact: "contacto", blog: "blog", privacy: "privacidad", terms: "terminos" },
    ca: { features: "caracteristiques", pricing: "preus", contact: "contacte", blog: "blog", privacy: "privacitat", terms: "termes" },
    en: { features: "features", pricing: "pricing", contact: "contact", blog: "blog", privacy: "privacy", terms: "terms" },
    fr: { features: "fonctionnalites", pricing: "tarifs", contact: "contact", blog: "blog", privacy: "confidentialite", terms: "conditions" },
    it: { features: "funzionalita", pricing: "prezzi", contact: "contatti", blog: "blog", privacy: "privacy", terms: "termini" }
};

export function SEO({
    title,
    description,
    image,
    language,
    slug = "",
    isBlogPost = false,
    translations = []
}) {
    // 🚀 Función maestra para construir URLs perfectas y traducidas
    const getFullUrl = (lang, internalSlug) => {
        // 1. Si es la Home
        if (!internalSlug || internalSlug === "/") {
            return lang === "es" ? DOMAIN : `${DOMAIN}/${lang}`;
        }

        // 2. Si es el Blog
        if (isBlogPost) {
            const translation = translations.find(t => t.lang === lang);
            if (!translation) return null; // Ignora los idiomas en los que el post no exista
            return lang === "es"
                ? `${DOMAIN}/blog/${translation.slug}`
                : `${DOMAIN}/${lang}/blog/${translation.slug}`;
        }

        // 3. Si es una Landing Pública (Features, Pricing, etc.)
        const cleanSlug = internalSlug.replace(/^\//, ""); // Quitamos la barra inicial por si acaso
        const translatedSlug = ROUTES_DICT[lang]?.[cleanSlug] || cleanSlug;

        return lang === "es"
            ? `${DOMAIN}/${translatedSlug}`
            : `${DOMAIN}/${lang}/${translatedSlug}`;
    };

    // Construimos la Canonical actual y el x-default (que forzamos siempre al español)
    const canonicalUrl = getFullUrl(language, slug);
    const xDefaultUrl = getFullUrl("es", slug);

    const langs = ["es", "en", "ca", "fr", "it"];

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