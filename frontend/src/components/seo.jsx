import React from "react";
import { Helmet } from "react-helmet-async";

const DOMAIN = "https://legoodanfitrion.com";

const ROUTES_DICT = {
    es: { features: "caracteristicas", pricing: "precios", contact: "contacto", blog: "blog", about: "sobre-nosotros", privacy: "privacidad", terms: "terminos", explore: "explorar", "use-cases": "momentos" },
    ca: { features: "caracteristiques", pricing: "preus", contact: "contacte", blog: "blog", about: "sobre-nosaltres", privacy: "privacitat", terms: "termes", explore: "explorar", "use-cases": "moments" },
    en: { features: "features", pricing: "pricing", contact: "contact", blog: "blog", about: "about", privacy: "privacy", terms: "terms", explore: "explore", "use-cases": "moments" },
    fr: { features: "fonctionnalites", pricing: "tarifs", contact: "contact", blog: "blog", about: "a-propos", privacy: "confidentialite", terms: "conditions", explore: "explorer", "use-cases": "moments" },
    it: { features: "funzionalita", pricing: "prezzi", contact: "contatti", blog: "blog", about: "chi-siamo", privacy: "privacy", terms: "termini", explore: "esplora", "use-cases": "momenti" }
};

const UC_SLUGS = {
    es: { personal: "cenas-y-reuniones", gastro: "supper-clubs-y-gastronomia", penas: "penas-y-asociaciones", wellness: "retiros-y-bienestar", corporate: "eventos-de-empresa", life: "celebraciones-y-bodas", despedidas: "despedidas-de-soltera-y-soltero", expat: "cenas-internacionales-y-friendsgiving" },
    ca: { personal: "sopars-i-reunions", gastro: "supper-clubs-i-gastronomia", penas: "penyes-i-associacions", wellness: "retirs-i-benestar", corporate: "esdeveniments-d-empresa", life: "celebracions-i-casaments", despedidas: "comiat-de-soltera-i-solter", expat: "sopars-internacionals-i-friendsgiving" },
    en: { personal: "dinners-and-gatherings", gastro: "supper-clubs-and-gastronomy", penas: "clubs-associations-and-communities", wellness: "wellness-retreats-and-communities", corporate: "corporate-events-and-team-building", life: "life-celebrations-and-weddings", despedidas: "hen-and-stag-parties", expat: "friendsgiving-and-international-dinners" },
    fr: { personal: "diners-et-reunions", gastro: "supper-clubs-et-gastronomie", penas: "associations-et-culture-locale", wellness: "retraites-bien-etre-et-communaute", corporate: "evenements-dentreprise", life: "celebrations-et-mariages", despedidas: "evjf-et-evg", expat: "friendsgiving-et-diners-internationaux" },
    it: { personal: "cene-e-riunioni", gastro: "supper-club-e-gastronomia", penas: "associazioni-e-cultura-locale", wellness: "ritiri-benessere-e-comunita", corporate: "eventi-aziendali", life: "celebrazioni-e-matrimoni", despedidas: "addio-al-celibato-e-nubilato", expat: "friendsgiving-e-cene-internazionali" }
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

        // 3. Si es una sublanding de Momentos (use-cases/personal, etc.)
        const cleanSlug = internalSlug.replace(/^\//, "");
        if (cleanSlug.startsWith("use-cases/")) {
            const ucKey = cleanSlug.slice("use-cases/".length);
            const parentSlug = ROUTES_DICT[lang]?.["use-cases"] || "momentos";
            const childSlug = UC_SLUGS[lang]?.[ucKey] || ucKey;
            return lang === "es"
                ? `${DOMAIN}/${parentSlug}/${childSlug}`
                : `${DOMAIN}/${lang}/${parentSlug}/${childSlug}`;
        }

        // 4. Si es una Landing Pública (Features, Pricing, etc.)
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