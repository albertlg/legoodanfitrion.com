import { useLocation, useNavigate, useSearchParams } from "react-router-dom";
import { useMemo, useCallback, useEffect } from "react";

// 🚀 SEO: Idiomas soportados y Diccionario de Slugs Públicos
const SUPPORTED_LANGUAGES = new Set(["es", "ca", "en", "fr", "it"]);
const DEFAULT_LANGUAGE = "es";

const ROUTES_DICT = {
    es: { features: "caracteristicas", pricing: "precios", contact: "contacto", blog: "blog", about: "sobre-nosotros", privacy: "privacidad", terms: "terminos", explore: "explorar", "use-cases": "momentos" },
    ca: { features: "caracteristiques", pricing: "preus", contact: "contacte", blog: "blog", about: "sobre-nosaltres", privacy: "privacitat", terms: "termes", explore: "explorar", "use-cases": "moments" },
    en: { features: "features", pricing: "pricing", contact: "contact", blog: "blog", about: "about", privacy: "privacy", terms: "terms", explore: "explore", "use-cases": "moments" },
    fr: { features: "fonctionnalites", pricing: "tarifs", contact: "contact", blog: "blog", about: "a-propos", privacy: "confidentialite", terms: "conditions", explore: "explorer", "use-cases": "moments" },
    it: { features: "funzionalita", pricing: "prezzi", contact: "contatti", blog: "blog", about: "chi-siamo", privacy: "privacy", terms: "termini", explore: "esplora", "use-cases": "momenti" }
};

const USE_CASE_SLUGS = {
    es: { personal: "cenas-y-reuniones", gastro: "supper-clubs-y-gastronomia", penas: "penas-y-asociaciones", wellness: "retiros-y-bienestar", corporate: "eventos-de-empresa", life: "celebraciones-y-bodas", despedidas: "despedidas-de-soltera-y-soltero", expat: "cenas-internacionales-y-friendsgiving" },
    ca: { personal: "sopars-i-reunions", gastro: "supper-clubs-i-gastronomia", penas: "penyes-i-associacions", wellness: "retirs-i-benestar", corporate: "esdeveniments-d-empresa", life: "celebracions-i-casaments", despedidas: "comiat-de-soltera-i-solter", expat: "sopars-internacionals-i-friendsgiving" },
    en: { personal: "dinners-and-gatherings", gastro: "supper-clubs-and-gastronomy", penas: "clubs-associations-and-communities", wellness: "wellness-retreats-and-communities", corporate: "corporate-events-and-team-building", life: "life-celebrations-and-weddings", despedidas: "hen-and-stag-parties", expat: "friendsgiving-and-international-dinners" },
    fr: { personal: "diners-et-reunions", gastro: "supper-clubs-et-gastronomie", penas: "associations-et-culture-locale", wellness: "retraites-bien-etre-et-communaute", corporate: "evenements-dentreprise", life: "celebrations-et-mariages", despedidas: "evjf-et-evg", expat: "friendsgiving-et-diners-internationaux" },
    it: { personal: "cene-e-riunioni", gastro: "supper-club-e-gastronomia", penas: "associazioni-e-cultura-locale", wellness: "ritiri-benessere-e-comunita", corporate: "eventi-aziendali", life: "celebrazioni-e-matrimoni", despedidas: "addio-al-celibato-e-nubilato", expat: "friendsgiving-e-cene-internazionali" }
};

const LANDING_PATHS = new Set(["/", "/features", "/pricing", "/contact", "/blog", "/about", "/privacy", "/terms", "/explore", "/use-cases", "/use-cases/personal", "/use-cases/gastro", "/use-cases/penas", "/use-cases/wellness", "/use-cases/corporate", "/use-cases/life", "/use-cases/despedidas", "/use-cases/expat"]);
const GUEST_PROFILE_TABS = new Set(["general", "food", "lifestyle", "conversation", "health", "history"]);
const GUEST_ADVANCED_EDIT_TABS = new Set(["identity", "food", "lifestyle", "conversation", "health"]);
const EVENT_PLANNER_TABS = new Set(["overview", "menu", "shopping", "ambience", "timings", "communication", "risks"]);

export function normalizePathname(pathname) {
    const normalized = String(pathname || "/").trim() || "/";
    if (normalized.length > 1 && normalized.endsWith("/")) {
        return normalized.replace(/\/+$/, "");
    }
    return normalized;
}

// 🚀 SEO Helper: Traduce una URL pública a la ruta interna de React (Ej: /ca/preus -> /pricing)
function getInternalPath(localizedPath, lang) {
    if (localizedPath === "/") return "/";
    const parts = localizedPath.split("/").filter(Boolean);
    const rootSegment = parts[0]?.toLowerCase();
    const dict = ROUTES_DICT[lang] || ROUTES_DICT[DEFAULT_LANGUAGE];

    const internalKey = Object.keys(dict).find(key => dict[key] === rootSegment);
    if (internalKey) {
        parts[0] = internalKey;
        if (internalKey === "use-cases" && parts[1]) {
            const ucDict = USE_CASE_SLUGS[lang] || USE_CASE_SLUGS[DEFAULT_LANGUAGE];
            const ucKey = Object.keys(ucDict).find(k => ucDict[k] === parts[1]);
            if (ucKey) parts[1] = ucKey;
        }
        return "/" + parts.join("/");
    }
    return localizedPath;
}

// 🚀 SEO Helper: Traduce una ruta interna a la URL pública del idioma (Ej: /pricing -> /ca/preus)
export function getLocalizedPath(internalPath, lang) {
    if (internalPath === "/") return "/";
    const parts = internalPath.split("/").filter(Boolean);
    const rootSegment = parts[0]?.toLowerCase();
    const dict = ROUTES_DICT[lang] || ROUTES_DICT[DEFAULT_LANGUAGE];

    if (dict[rootSegment]) {
        parts[0] = dict[rootSegment];
        if (rootSegment === "use-cases" && parts[1]) {
            const ucDict = USE_CASE_SLUGS[lang] || USE_CASE_SLUGS[DEFAULT_LANGUAGE];
            if (ucDict[parts[1]]) parts[1] = ucDict[parts[1]];
        }
        return "/" + parts.join("/");
    }
    return internalPath;
}

// 🚀 SEO: Función super-inteligente que recuerda el idioma al cambiar de página
export function extractLanguageFromPath(pathname) {
    const segments = pathname.split("/").filter(Boolean);
    const firstSegment = segments[0]?.toLowerCase() || "";

    // 1. Si la URL tiene el prefijo de idioma explícito (ej: /ca/preus), MANDA LA URL
    if (SUPPORTED_LANGUAGES.has(firstSegment)) {
        const lang = firstSegment;
        const rawBasePath = "/" + segments.slice(1).join("/");
        return { lang, basePath: getInternalPath(rawBasePath === "/" ? "/" : rawBasePath, lang) };
    }

    // 2. Si no tiene prefijo, recuperamos el último idioma activo del usuario
    let inferredLang = DEFAULT_LANGUAGE;
    try {
        const stored = window.localStorage.getItem("legood-language");
        if (stored && SUPPORTED_LANGUAGES.has(stored)) {
            inferredLang = stored;
        }
    } catch {
        void 0;
    }

    // 3. ¿Es un click en un enlace interno puro de tu menú? (ej: <Link to="/pricing"> o "/")
    const isInternalRawSlug = ["features", "pricing", "contact", "blog", "about", "privacy", "terms", "explore", "use-cases"].includes(firstSegment);
    if (isInternalRawSlug || firstSegment === "") {
        // Le inyectamos su idioma activo de forma transparente
        return { lang: inferredLang, basePath: "/" + segments.join("/") };
    }

    // 4. ¿Es un slug traducido pero el usuario olvidó poner el /ca/ en el navegador? (ej: legoodanfitrion.com/preus)
    let detectedLang = DEFAULT_LANGUAGE;
    let foundInternal = firstSegment;

    for (const [l, dict] of Object.entries(ROUTES_DICT)) {
        const internalKey = Object.keys(dict).find(key => dict[key] === firstSegment);
        if (internalKey) {
            // Si es un slug compartido (como "blog"), respetamos el idioma inferido
            const isSharedSlug = Object.values(ROUTES_DICT).every(d => Object.values(d).includes(firstSegment));
            detectedLang = isSharedSlug ? inferredLang : l;
            foundInternal = internalKey;
            break;
        }
    }

    const newSegments = [...segments];
    if (newSegments.length > 0) newSegments[0] = foundInternal;

    // También traducimos el segundo segmento si es una sublanding de use-cases
    if (foundInternal === "use-cases" && newSegments[1]) {
        const ucDict = USE_CASE_SLUGS[detectedLang] || USE_CASE_SLUGS[DEFAULT_LANGUAGE];
        const ucKey = Object.keys(ucDict).find(k => ucDict[k] === newSegments[1]);
        if (ucKey) newSegments[1] = ucKey;
    }

    const basePath = "/" + newSegments.join("/");

    return { lang: detectedLang, basePath: basePath === "/" ? "/" : basePath };
}

export function decodePathSegment(segment) {
    try {
        return decodeURIComponent(String(segment || "").trim());
    } catch {
        return String(segment || "").trim();
    }
}

export function getImportWizardSource(searchParams) {
    const next = String(searchParams?.get?.("import") || "")
        .trim()
        .toLowerCase();
    return ["csv", "gmail", "mobile"].includes(next) ? next : "";
}

export function normalizeDashboardRouteState(appRoute) {
    const next = {
        activeView: "overview",
        eventsWorkspace: "latest",
        guestsWorkspace: "latest",
        invitationsWorkspace: "latest",
        selectedEventDetailId: "",
        eventPlannerTab: "menu",
        selectedGuestDetailId: "",
        guestProfileViewTab: "general",
        guestAdvancedEditTab: "identity",
        importWizardSource: ""
    };
    if (!appRoute || typeof appRoute !== "object") return next;

    const view = String(appRoute.view || "").trim();
    if (!["overview", "profile", "events", "guests", "invitations"].includes(view)) return next;
    next.activeView = view;

    const workspace = String(appRoute.workspace || "").trim();
    if (view === "events") {
        if (["latest", "create", "detail", "plan", "insights"].includes(workspace)) next.eventsWorkspace = workspace;
        next.selectedEventDetailId = String(appRoute.eventId || "").trim();
        const nextEventPlannerTab = String(appRoute.eventPlannerTab || "").trim().toLowerCase();
        if (EVENT_PLANNER_TABS.has(nextEventPlannerTab)) next.eventPlannerTab = nextEventPlannerTab;
    }
    if (view === "guests") {
        if (["latest", "create", "detail", "groups"].includes(workspace)) next.guestsWorkspace = workspace;
        next.selectedGuestDetailId = String(appRoute.guestId || "").trim();
        const nextGuestProfileTab = String(appRoute.guestProfileTab || "").trim().toLowerCase();
        if (GUEST_PROFILE_TABS.has(nextGuestProfileTab)) next.guestProfileViewTab = nextGuestProfileTab;
        const nextGuestAdvancedTab = String(appRoute.guestAdvancedTab || "").trim().toLowerCase();
        if (GUEST_ADVANCED_EDIT_TABS.has(nextGuestAdvancedTab)) next.guestAdvancedEditTab = nextGuestAdvancedTab;
        const nextImportWizardSource = String(appRoute.importWizardSource || "").trim().toLowerCase();
        if (["csv", "gmail", "mobile"].includes(nextImportWizardSource)) next.importWizardSource = nextImportWizardSource;
    }
    if (view === "invitations") {
        if (["latest", "create"].includes(workspace)) next.invitationsWorkspace = workspace;
    }
    return next;
}

export function encodePathSegment(segment) {
    return encodeURIComponent(String(segment || "").trim());
}

export function buildDashboardPathFromState({
    activeView,
    eventsWorkspace,
    guestsWorkspace,
    invitationsWorkspace,
    selectedEventDetailId,
    eventPlannerTab,
    selectedGuestDetailId,
    guestProfileViewTab,
    guestAdvancedEditTab,
    editingEventId,
    editingGuestId,
    routeEventDetailId,
    routeEventPlannerTab,
    routeGuestDetailId
}) {
    if (activeView === "overview") return "/app";
    if (activeView === "profile") return "/profile";
    if (activeView === "events") {
        const effectiveEventDetailId = String(selectedEventDetailId || routeEventDetailId || "").trim();
        const normalizedEventPlannerTab = String(eventPlannerTab || "").trim().toLowerCase();
        const normalizedRouteEventPlannerTab = String(routeEventPlannerTab || "").trim().toLowerCase();
        const effectiveEventPlannerTab = EVENT_PLANNER_TABS.has(normalizedEventPlannerTab)
            ? normalizedEventPlannerTab
            : EVENT_PLANNER_TABS.has(normalizedRouteEventPlannerTab)
                ? normalizedRouteEventPlannerTab
                : "menu";
        if (eventsWorkspace === "create") {
            const effectiveEditingEventId = String(editingEventId || selectedEventDetailId || routeEventDetailId || "").trim();
            if (effectiveEditingEventId) return `/app/events/${encodePathSegment(effectiveEditingEventId)}/edit`;
            return "/app/events/new";
        }
        if (eventsWorkspace === "insights") return "/app/events/insights";
        if (eventsWorkspace === "plan" && effectiveEventDetailId) {
            return `/app/events/${encodePathSegment(effectiveEventDetailId)}/plan/${encodePathSegment(effectiveEventPlannerTab)}`;
        }
        if (eventsWorkspace === "detail" && effectiveEventDetailId) return `/app/events/${encodePathSegment(effectiveEventDetailId)}`;
        return "/app/events";
    }
    if (activeView === "guests") {
        const effectiveGuestDetailId = String(selectedGuestDetailId || routeGuestDetailId || "").trim();
        if (guestsWorkspace === "groups") {
            return "/app/guests/groups";
        }
        if (guestsWorkspace === "create") {
            const tab = String(guestAdvancedEditTab || "identity").trim().toLowerCase();
            const safeTab = GUEST_ADVANCED_EDIT_TABS.has(tab) ? tab : "identity";
            const editableGuestId = String(editingGuestId || routeGuestDetailId || "").trim();
            if (editableGuestId) return `/app/guests/${encodePathSegment(editableGuestId)}/edit/advanced/${encodePathSegment(safeTab)}`;
            return `/app/guests/new/advanced/${encodePathSegment(safeTab)}`;
        }
        if (guestsWorkspace === "detail" && effectiveGuestDetailId) {
            const tab = String(guestProfileViewTab || "general").trim().toLowerCase();
            if (tab && tab !== "general" && GUEST_PROFILE_TABS.has(tab)) {
                return `/app/guests/${encodePathSegment(effectiveGuestDetailId)}/${encodePathSegment(tab)}`;
            }
            return `/app/guests/${encodePathSegment(effectiveGuestDetailId)}`;
        }
        return "/app/guests";
    }
    if (activeView === "invitations") {
        if (invitationsWorkspace === "create") return "/app/invitations/new";
        return "/app/invitations";
    }
    return "/app";
}

export function isSpecificEventDetailPath(pathname) {
    return /^\/app\/events\/[^/]+(?:\/plan\/(?:menu|shopping|ambience|timings|communication|risks)|\/(?:menu|shopping|ambience|timings|communication|risks))?$/.test(String(pathname || "").trim());
}

export function isSpecificGuestDetailPath(pathname) {
    return /^\/app\/guests\/[^/]+(?:\/(?:general|food|lifestyle|conversation|health|history))?$/.test(String(pathname || "").trim());
}

export function isSpecificGuestAdvancedEditPath(pathname) {
    return /^\/app\/guests\/[^/]+\/edit\/advanced\/[^/]+$/.test(String(pathname || "").trim());
}

function isGenericEventPath(pathname) {
    return String(pathname || "").trim() === "/app/events";
}

function isGenericGuestPath(pathname) {
    return String(pathname || "").trim() === "/app/guests";
}

function isNewGuestAdvancedPath(pathname) {
    return /^\/app\/guests\/new\/advanced\/[^/]+$/.test(String(pathname || "").trim());
}

export function shouldPreserveSpecificPath(currentPath, nextPath) {
    const current = String(currentPath || "").trim();
    const next = String(nextPath || "").trim();
    if (!current || !next || current === next) return false;
    if (isSpecificEventDetailPath(current) && isGenericEventPath(next)) return true;
    if (isSpecificGuestDetailPath(current) && isGenericGuestPath(next)) return true;
    if (isSpecificGuestAdvancedEditPath(current) && (isGenericGuestPath(next) || isNewGuestAdvancedPath(next))) return true;
    return false;
}

export function parseAppRoute(pathname, searchParams = new URLSearchParams()) {
    const normalized = normalizePathname(pathname);
    const segments = normalized.split("/").filter(Boolean).slice(1);
    const section = segments[0] || "overview";
    const normalizedSegment = String(segments[1] || "").trim().toLowerCase();
    const importWizardSource = getImportWizardSource(searchParams);

    if (section === "profile") {
        return { view: "profile" };
    }

    if (section === "events") {
        if (normalizedSegment === "new") return { view: "events", workspace: "create" };
        if (normalizedSegment === "insights") return { view: "events", workspace: "insights" };
        if (normalizedSegment === "latest" || normalizedSegment === "list" || normalizedSegment === "hub") return { view: "events", workspace: "latest" };
        if (segments[1]) {
            const eventId = decodePathSegment(segments[1]);
            const thirdSegment = decodePathSegment(segments[2] || "").toLowerCase();
            if (thirdSegment === "edit") {
                return { view: "events", workspace: "create", eventId };
            }
            if (thirdSegment === "plan") {
                const plannerSegment = decodePathSegment(segments[3] || "").toLowerCase();
                const eventPlannerTab = EVENT_PLANNER_TABS.has(plannerSegment) ? plannerSegment : "menu";
                return { view: "events", workspace: "plan", eventId, eventPlannerTab };
            }
            if (EVENT_PLANNER_TABS.has(thirdSegment)) return { view: "events", workspace: "plan", eventId, eventPlannerTab: thirdSegment };
            return { view: "events", workspace: "detail", eventId };
        }
        return { view: "events", workspace: "latest" };
    }

    if (section === "guests") {
        if (normalizedSegment === "groups") {
            return { view: "guests", workspace: "groups" };
        }
        if (normalizedSegment === "new") {
            const advancedSegment = decodePathSegment(segments[2] || "").toLowerCase();
            const stepSegment = decodePathSegment(segments[3] || "").toLowerCase();
            if (advancedSegment === "advanced") {
                const guestAdvancedTab = GUEST_ADVANCED_EDIT_TABS.has(stepSegment) ? stepSegment : "identity";
                return { view: "guests", workspace: "create", guestAdvancedTab };
            }
            return { view: "guests", workspace: "create", guestAdvancedTab: "identity" };
        }
        if (segments[1] && String(segments[2] || "").trim().toLowerCase() === "edit") {
            const advancedSegment = decodePathSegment(segments[3] || "").toLowerCase();
            const stepSegment = decodePathSegment(segments[4] || "").toLowerCase();
            const guestAdvancedTab = advancedSegment === "advanced" && GUEST_ADVANCED_EDIT_TABS.has(stepSegment) ? stepSegment : "identity";
            return { view: "guests", workspace: "create", guestId: decodePathSegment(segments[1]), guestAdvancedTab };
        }
        if (normalizedSegment === "latest" || normalizedSegment === "list" || normalizedSegment === "hub") {
            return importWizardSource ? { view: "guests", workspace: "latest", importWizardSource } : { view: "guests", workspace: "latest" };
        }
        if (segments[1]) {
            const tabSegment = decodePathSegment(segments[2] || "").toLowerCase();
            const guestProfileTab = GUEST_PROFILE_TABS.has(tabSegment) ? tabSegment : "general";
            return { view: "guests", workspace: "detail", guestId: decodePathSegment(segments[1]), guestProfileTab };
        }
        return importWizardSource ? { view: "guests", workspace: "latest", importWizardSource } : { view: "guests", workspace: "latest" };
    }

    if (section === "invitations") {
        if (normalizedSegment === "new") return { view: "invitations", workspace: "create" };
        return { view: "invitations", workspace: "latest" };
    }

    return { view: "overview" };
}

export function buildCanonicalAppPath(appRoute) {
    const view = String(appRoute?.view || "overview").trim();
    const workspace = String(appRoute?.workspace || "").trim();

    if (view === "profile") return "/profile";
    if (view === "events") {
        if (workspace === "create") {
            if (appRoute?.eventId) return `/app/events/${encodeURIComponent(String(appRoute.eventId).trim())}/edit`;
            return "/app/events/new";
        }
        if (workspace === "insights") return "/app/events/insights";
        if (workspace === "plan" && appRoute?.eventId) {
            const eventPlannerTab = String(appRoute?.eventPlannerTab || "menu").trim().toLowerCase();
            const safeEventPlannerTab = EVENT_PLANNER_TABS.has(eventPlannerTab) ? eventPlannerTab : "menu";
            return `/app/events/${encodeURIComponent(String(appRoute.eventId).trim())}/plan/${encodeURIComponent(safeEventPlannerTab)}`;
        }
        if (workspace === "detail" && appRoute?.eventId) return `/app/events/${encodeURIComponent(String(appRoute.eventId).trim())}`;
        return "/app/events";
    }
    if (view === "guests") {
        if (workspace === "groups") return "/app/guests/groups";
        if (workspace === "create") {
            const tab = String(appRoute?.guestAdvancedTab || "identity").trim().toLowerCase();
            const safeTab = GUEST_ADVANCED_EDIT_TABS.has(tab) ? tab : "identity";
            if (appRoute?.guestId) return `/app/guests/${encodeURIComponent(String(appRoute.guestId).trim())}/edit/advanced/${encodeURIComponent(safeTab)}`;
            return `/app/guests/new/advanced/${encodeURIComponent(safeTab)}`;
        }
        if (workspace === "detail" && appRoute?.guestId) {
            const tab = String(appRoute?.guestProfileTab || "general").trim().toLowerCase();
            if (tab && tab !== "general" && GUEST_PROFILE_TABS.has(tab)) return `/app/guests/${encodeURIComponent(String(appRoute.guestId).trim())}/${encodeURIComponent(tab)}`;
            return `/app/guests/${encodeURIComponent(String(appRoute.guestId).trim())}`;
        }
        return "/app/guests";
    }
    if (view === "invitations") {
        if (workspace === "create") return "/app/invitations/new";
        return "/app/invitations";
    }
    return "/app";
}

// 🚀 SEO: Añadimos el parámetro lang para reconstruir la URL completa correctamente
export function getCanonicalPathForRoute(route, lang = DEFAULT_LANGUAGE) {
    if (!route || typeof route !== "object") return "/";

    let basePath = "/";
    if (route.kind === "landing") basePath = route.path;
    else if (route.kind === "blog") basePath = route.path;
    else if (route.kind === "privacy") basePath = "/privacy";
    else if (route.kind === "terms") basePath = "/terms";
    else if (route.kind === "login") basePath = "/login";
    else if (route.kind === "rsvp") basePath = route.token ? `/rsvp/${encodeURIComponent(route.token)}` : "/";
    else if (route.kind === "admin") return "/lg-hq-admin-2026";
    else if (route.kind === "app") {
        const importWizardSource = String(route.appRoute?.importWizardSource || "").trim().toLowerCase();
        if (route.appRoute?.view === "guests" && route.appRoute?.workspace === "latest" && ["csv", "gmail", "mobile"].includes(importWizardSource)) {
            basePath = `/app/guests?import=${encodeURIComponent(importWizardSource)}&wizard=1`;
        } else {
            basePath = buildCanonicalAppPath(route.appRoute || { view: "overview" });
        }
    }

    // Rutas privadas (App, RSVP, Login): No llevan traducciones en URL para no romper sesiones/tokens
    if (route.kind === "app" || route.kind === "rsvp" || route.kind === "login") {
        return basePath;
    }

    // Rutas públicas: Traducimos el slug al idioma correspondiente
    const localizedBasePath = getLocalizedPath(basePath, lang);

    // Si es el idioma por defecto (es), no le ponemos prefijo de carpeta (ej: /precios)
    if (lang === DEFAULT_LANGUAGE) {
        return localizedBasePath;
    }

    // Si es otro idioma, le ponemos el prefijo (ej: /ca/preus)
    return localizedBasePath === "/" ? `/${lang}` : `/${lang}${localizedBasePath}`;
}

export function useAppRouter() {
    const location = useLocation();
    const navigateFull = useNavigate();
    const [searchParams] = useSearchParams();

    const navigate = useCallback((nextPath, { replace = false } = {}) => {
        navigateFull(nextPath, { replace });
    }, [navigateFull]);

    const route = useMemo(() => {
        const rawPathname = normalizePathname(location.pathname);

        // 🚀 SEO: Extraemos el idioma y la ruta interna (ej: /pricing)
        const { lang, basePath } = extractLanguageFromPath(rawPathname);
        const queryToken = String(searchParams.get("token") || "").trim();

        const createRoute = (kind, path, extra = {}) => ({
            kind,
            path,           // La ruta SIN idioma (para que App.jsx funcione normal)
            originalPath: rawPathname, // La ruta original en la barra de direcciones
            urlLang: lang,  // El idioma extraído de la URL
            ...extra
        });

        if (queryToken) return createRoute("rsvp", `/rsvp/${queryToken}`, { token: queryToken });

        if (basePath.startsWith("/rsvp/")) {
            const token = basePath.replace("/rsvp/", "").trim();
            return token ? createRoute("rsvp", basePath, { token }) : createRoute("landing", "/");
        }

        if (basePath === "/lg-hq-admin-2026") return createRoute("admin", "/lg-hq-admin-2026");
        if (basePath === "/login") return createRoute("login", "/login");
        if (basePath === "/profile") return createRoute("app", "/profile", { appRoute: { view: "profile" } });
        if (basePath === "/app" || basePath.startsWith("/app/")) {
            return createRoute("app", basePath, { appRoute: parseAppRoute(basePath, searchParams) });
        }

        // Ya validado internamente (ej: /blog)
        if (basePath.startsWith("/blog")) return createRoute("blog", basePath);
        // 🚀 AÑADIMOS LAS DOS RUTAS LEGALES AQUÍ
        if (basePath === "/privacy") return createRoute("privacy", basePath);
        if (basePath === "/terms") return createRoute("terms", basePath);

        if (LANDING_PATHS.has(basePath)) return createRoute("landing", basePath);

        return createRoute("landing", "/");
    }, [location.pathname, searchParams]);

    const isRecoveryMode = useMemo(() => {
        const type = String(searchParams.get("type") || "").toLowerCase();
        const hashParams = new URLSearchParams(location.hash.replace(/^#/, ""));
        const hashType = String(hashParams.get("type") || "").toLowerCase();
        return type === "recovery" || hashType === "recovery";
    }, [searchParams, location.hash]);

    useEffect(() => {
        // 🚀 SEO: Comprobamos si la URL actual está perfectamente formateada para el idioma
        const canonicalPath = getCanonicalPathForRoute(route, route.urlLang);
        const currentPath = normalizePathname(location.pathname);

        // 🚀 FIX: Hemos quitado la excepción del blog. Ahora TODOS los enlaces
        // internos que estén "pelados" serán corregidos instantáneamente.
        if (canonicalPath && canonicalPath !== currentPath) {
            navigateFull(canonicalPath, { replace: true });
        }
    }, [route, location.pathname, navigateFull]);

    return { route, navigate, isRecoveryMode };
}
