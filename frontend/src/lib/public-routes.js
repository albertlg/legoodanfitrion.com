// Fuente única de las rutas públicas (indexables) de LGA.
// La consumen: el router (router-utils.jsx), el componente SEO (seo.jsx)
// y los scripts de build (generate-sitemap.mjs, prerender.mjs).
// JS puro sin dependencias: debe poder importarse desde Vite y desde Node.

export const SITE_ORIGIN = "https://legoodanfitrion.com";

export const PUBLIC_LANGUAGES = ["es", "ca", "en", "fr", "it"];
export const DEFAULT_LANGUAGE = "es";

// Clave interna -> slug público por idioma
export const ROUTES_DICT = {
    es: { features: "caracteristicas", pricing: "precios", contact: "contacto", blog: "blog", about: "sobre-nosotros", privacy: "privacidad", terms: "terminos", explore: "explorar", "use-cases": "momentos" },
    ca: { features: "caracteristiques", pricing: "preus", contact: "contacte", blog: "blog", about: "sobre-nosaltres", privacy: "privacitat", terms: "termes", explore: "explorar", "use-cases": "moments" },
    en: { features: "features", pricing: "pricing", contact: "contact", blog: "blog", about: "about", privacy: "privacy", terms: "terms", explore: "explore", "use-cases": "moments" },
    fr: { features: "fonctionnalites", pricing: "tarifs", contact: "contact", blog: "blog", about: "a-propos", privacy: "confidentialite", terms: "conditions", explore: "explorer", "use-cases": "moments" },
    it: { features: "funzionalita", pricing: "prezzi", contact: "contatti", blog: "blog", about: "chi-siamo", privacy: "privacy", terms: "termini", explore: "esplora", "use-cases": "momenti" }
};

// Sublandings de "Momentos": clave interna -> slug público por idioma
export const USE_CASE_SLUGS = {
    es: { personal: "cenas-y-reuniones", gastro: "supper-clubs-y-gastronomia", penas: "penas-y-asociaciones", wellness: "retiros-y-bienestar", corporate: "eventos-de-empresa", life: "celebraciones-y-bodas", despedidas: "despedidas-de-soltera-y-soltero", expat: "cenas-internacionales-y-friendsgiving" },
    ca: { personal: "sopars-i-reunions", gastro: "supper-clubs-i-gastronomia", penas: "penyes-i-associacions", wellness: "retirs-i-benestar", corporate: "esdeveniments-d-empresa", life: "celebracions-i-casaments", despedidas: "comiat-de-soltera-i-solter", expat: "sopars-internacionals-i-friendsgiving" },
    en: { personal: "dinners-and-gatherings", gastro: "supper-clubs-and-gastronomy", penas: "clubs-associations-and-communities", wellness: "wellness-retreats-and-communities", corporate: "corporate-events-and-team-building", life: "life-celebrations-and-weddings", despedidas: "hen-and-stag-parties", expat: "friendsgiving-and-international-dinners" },
    fr: { personal: "diners-et-reunions", gastro: "supper-clubs-et-gastronomie", penas: "associations-et-culture-locale", wellness: "retraites-bien-etre-et-communaute", corporate: "evenements-dentreprise", life: "celebrations-et-mariages", despedidas: "evjf-et-evg", expat: "friendsgiving-et-diners-internationaux" },
    it: { personal: "cene-e-riunioni", gastro: "supper-club-e-gastronomia", penas: "associazioni-e-cultura-locale", wellness: "ritiri-benessere-e-comunita", corporate: "eventi-aziendali", life: "celebrazioni-e-matrimoni", despedidas: "addio-al-celibato-e-nubilato", expat: "friendsgiving-e-cene-internazionali" }
};

export const USE_CASE_KEYS = Object.keys(USE_CASE_SLUGS[DEFAULT_LANGUAGE]);

// Páginas públicas indexables (rutas internas, sin idioma) con su
// configuración de sitemap. Añadir aquí cualquier nueva landing pública.
// Nota: "/features" no está porque renderiza la home y su canonical apunta a ella.
export const STATIC_PUBLIC_PAGES = [
    { path: "/", priority: "1.0", changefreq: "weekly" },
    { path: "/pricing", priority: "0.8", changefreq: "monthly" },
    { path: "/use-cases", priority: "0.8", changefreq: "monthly" },
    ...USE_CASE_KEYS.map((key) => ({ path: `/use-cases/${key}`, priority: "0.7", changefreq: "monthly" })),
    { path: "/explore", priority: "0.6", changefreq: "monthly" },
    { path: "/blog", priority: "0.8", changefreq: "weekly" },
    { path: "/about", priority: "0.7", changefreq: "monthly" },
    { path: "/contact", priority: "0.6", changefreq: "monthly" },
    { path: "/privacy", priority: "0.3", changefreq: "yearly" },
    { path: "/terms", priority: "0.3", changefreq: "yearly" }
];

// Rutas internas que el router trata como landing pública
export const LANDING_INTERNAL_PATHS = new Set([
    "/features",
    ...STATIC_PUBLIC_PAGES.map((p) => p.path).filter((p) => p !== "/privacy" && p !== "/terms")
]);

// Claves internas de primer nivel ("features", "blog"...)
export const PUBLIC_ROOT_KEYS = Object.keys(ROUTES_DICT[DEFAULT_LANGUAGE]);

function withLanguagePrefix(localizedPath, lang) {
    if (lang === DEFAULT_LANGUAGE) return localizedPath;
    return localizedPath === "/" ? `/${lang}` : `/${lang}${localizedPath}`;
}

// Traduce una ruta interna a su slug público, SIN prefijo de idioma
// (ej: "/use-cases/personal", "ca" -> "/moments/sopars-i-reunions")
export function localizeInternalPath(internalPath, lang) {
    if (!internalPath || internalPath === "/") return "/";
    const parts = internalPath.split("/").filter(Boolean);
    const rootSegment = parts[0]?.toLowerCase();
    const dict = ROUTES_DICT[lang] || ROUTES_DICT[DEFAULT_LANGUAGE];

    if (!dict[rootSegment]) return internalPath;
    parts[0] = dict[rootSegment];
    if (rootSegment === "use-cases" && parts[1]) {
        const ucDict = USE_CASE_SLUGS[lang] || USE_CASE_SLUGS[DEFAULT_LANGUAGE];
        if (ucDict[parts[1]]) parts[1] = ucDict[parts[1]];
    }
    return "/" + parts.join("/");
}

// Traduce un slug público (sin prefijo de idioma) a la ruta interna
// (ej: "/moments/sopars-i-reunions", "ca" -> "/use-cases/personal")
export function internalizeLocalizedPath(localizedPath, lang) {
    if (!localizedPath || localizedPath === "/") return "/";
    const parts = localizedPath.split("/").filter(Boolean);
    const rootSegment = parts[0]?.toLowerCase();
    const dict = ROUTES_DICT[lang] || ROUTES_DICT[DEFAULT_LANGUAGE];

    const internalKey = Object.keys(dict).find((key) => dict[key] === rootSegment);
    if (!internalKey) return localizedPath;
    parts[0] = internalKey;
    if (internalKey === "use-cases" && parts[1]) {
        const ucDict = USE_CASE_SLUGS[lang] || USE_CASE_SLUGS[DEFAULT_LANGUAGE];
        const ucKey = Object.keys(ucDict).find((k) => ucDict[k] === parts[1]);
        if (ucKey) parts[1] = ucKey;
    }
    return "/" + parts.join("/");
}

// Ruta pública completa (con prefijo de idioma salvo para "es")
export function getPublicPath(internalPath, lang) {
    return withLanguagePrefix(localizeInternalPath(internalPath, lang), lang);
}

export function getBlogPostPath(lang, slug) {
    return withLanguagePrefix(`/blog/${slug}`, lang);
}

export function getPublicUrl(internalPath, lang) {
    return `${SITE_ORIGIN}${getPublicPath(internalPath, lang)}`;
}

export function getBlogPostUrl(lang, slug) {
    return `${SITE_ORIGIN}${getBlogPostPath(lang, slug)}`;
}

// Ruta interna ("/pricing", "/use-cases/gastro", "/#caracteristicas") -> URL
// pública localizada ("/ca/preus", "/en/moments/...", "/en#caracteristicas").
export function getPublicHref(to, language) {
    const [path, hash] = String(to || "/").split("#");
    const localized = getPublicPath(path || "/", language);
    return hash ? `${localized}#${hash}` : localized;
}
