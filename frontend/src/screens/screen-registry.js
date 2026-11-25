// Registro de pantallas de la app con carga diferida y precarga.
// Vive fuera de App.jsx para que la usen también main.jsx (antes de hidratar)
// y el prerender del build (entry-server.jsx).
import { lazy } from "react";
import { resolveRoute } from "../router-utils";

const DEFAULT_LANGUAGE = "es";

// Diccionarios partidos en dos (ver scripts/locale-split.mjs y vite.config.js):
// las páginas públicas solo descargan la parte "public" de su idioma; la app
// (login, panel, RSVP, admin) descarga además la parte "rest".
const PUBLIC_LOCALE_LOADERS = {
  es: () => import("virtual:lga-locale/es.public"),
  ca: () => import("virtual:lga-locale/ca.public"),
  en: () => import("virtual:lga-locale/en.public"),
  fr: () => import("virtual:lga-locale/fr.public"),
  it: () => import("virtual:lga-locale/it.public")
};
const REST_LOCALE_LOADERS = {
  es: () => import("virtual:lga-locale/es.rest"),
  ca: () => import("virtual:lga-locale/ca.rest"),
  en: () => import("virtual:lga-locale/en.rest"),
  fr: () => import("virtual:lga-locale/fr.rest"),
  it: () => import("virtual:lga-locale/it.rest")
};
export const SUPPORTED_LOCALES = Object.keys(PUBLIC_LOCALE_LOADERS);

// Rutas que solo necesitan la parte pública del diccionario. El resto (app,
// login, RSVP, admin) usa el completo.
export const PUBLIC_ROUTE_KINDS = ["landing", "blog", "privacy", "terms", "notFound"];

// Pantalla con carga diferida que se puede precargar. Si el módulo ya está
// cargado, React.lazy lo resuelve en el primer render sin suspender (thenable
// síncrono). Es imprescindible para hidratar HTML prerenderizado: si la pantalla
// suspendiera, React mostraría "Cargando..." en lugar del contenido del servidor.
function lazyScreen(loader, exportName) {
  let loadedModule = null;
  const load = () =>
    loader().then((module) => {
      loadedModule = { default: module[exportName] };
      return loadedModule;
    });
  const Screen = lazy(() =>
    loadedModule ? { then: (resolve) => resolve(loadedModule) } : load()
  );
  Screen.preload = load;
  return Screen;
}

export const AuthScreen = lazyScreen(() => import("./auth-screen"), "AuthScreen");
export const LandingScreen = lazyScreen(() => import("./landing-screen"), "LandingScreen");
export const DashboardScreen = lazyScreen(() => import("./dashboard-screen"), "DashboardScreen");
export const PublicRsvpScreen = lazyScreen(() => import("./public-rsvp-screen"), "PublicRsvpScreen");

// --- PANTALLAS PÚBLICAS ---
export const BlogIndexScreen = lazyScreen(() => import("./blog-index-screen"), "BlogIndexScreen");
export const BlogPostScreen = lazyScreen(() => import("./blog-post-screen"), "BlogPostScreen");
export const AboutScreen = lazyScreen(() => import("./about-screen"), "AboutScreen");
export const AdminDashboardScreen = lazyScreen(() => import("./admin-dashboard-screen"), "AdminDashboardScreen");
export const ExploreScreen = lazyScreen(() => import("./explore-screen"), "ExploreScreen");
export const UseCasesScreen = lazyScreen(() => import("./use-cases-screen"), "UseCasesScreen");
export const UseCaseDetailScreen = lazyScreen(() => import("./use-cases-detail-screen"), "UseCaseDetailScreen");

export const VALID_USE_CASE_KEYS = new Set(["personal", "gastro", "penas", "wellness", "corporate", "life", "despedidas", "expat"]);

// Pantalla pública que corresponde a una ruta (misma lógica que el render de App).
function getPublicScreenForRoute(route) {
  if (route.kind === "blog") {
    return route.path.length > 6 ? BlogPostScreen : BlogIndexScreen;
  }
  if (route.kind !== "landing") return null;
  if (route.path.startsWith("/use-cases/")) {
    return VALID_USE_CASE_KEYS.has(route.path.slice("/use-cases/".length)) ? UseCaseDetailScreen : LandingScreen;
  }
  if (route.path === "/use-cases") return UseCasesScreen;
  if (route.path === "/explore") return ExploreScreen;
  if (route.path === "/about") return AboutScreen;
  return LandingScreen;
}

const normalizeLocale = (language) => (PUBLIC_LOCALE_LOADERS[language] ? language : DEFAULT_LANGUAGE);
const moduleData = (module) => module?.default || module;

// Diccionarios completos (parte pública + resto) ya cargados.
const fullDictionaries = new WeakSet();
const fullDictionaryByLanguage = new Map();

export function isFullDictionary(dictionary) {
  return Boolean(dictionary) && fullDictionaries.has(dictionary);
}

// Solo las claves de las páginas públicas.
export async function loadPublicLocale(language) {
  return moduleData(await PUBLIC_LOCALE_LOADERS[normalizeLocale(language)]());
}

// Todas las claves (para la app). Las dos partes se piden en paralelo.
export async function loadFullLocale(language) {
  const lang = normalizeLocale(language);
  if (fullDictionaryByLanguage.has(lang)) return fullDictionaryByLanguage.get(lang);
  const [publicPart, restPart] = await Promise.all([PUBLIC_LOCALE_LOADERS[lang](), REST_LOCALE_LOADERS[lang]()]);
  const dictionary = { ...moduleData(publicPart), ...moduleData(restPart) };
  fullDictionaries.add(dictionary);
  fullDictionaryByLanguage.set(lang, dictionary);
  return dictionary;
}

// Idioma con el que App arrancará en las rutas que NO vienen prerenderizadas
// (/app, /login, /rsvp...). Replica detectLanguage de App.jsx para precargar
// ese diccionario antes del primer render.
export function getClientInitialLanguage(pathname, search = "") {
  const route = resolveRoute(pathname, new URLSearchParams(search), { inferLanguage: true });
  const firstSegment = String(pathname || "").split("/").filter(Boolean)[0];
  const fromNavigator = () => {
    const nav = (window.navigator.language || DEFAULT_LANGUAGE).slice(0, 2).toLowerCase();
    return SUPPORTED_LOCALES.includes(nav) ? nav : DEFAULT_LANGUAGE;
  };
  if (route.kind === "rsvp") return fromNavigator();
  if (SUPPORTED_LOCALES.includes(firstSegment)) return firstSegment;
  try {
    const stored = window.localStorage.getItem("legood-language");
    if (stored && SUPPORTED_LOCALES.includes(stored)) return stored;
  } catch {
    /* sin storage */
  }
  return fromNavigator();
}

// Primer render sin HTML prerenderizado (app, login, RSVP... y, en desarrollo,
// todas las rutas): parte pública en las páginas públicas, completo en el resto.
export async function preloadClientLocale(pathname, search) {
  const language = getClientInitialLanguage(pathname, search);
  const route = resolveRoute(pathname, new URLSearchParams(search), { inferLanguage: true });
  const load = PUBLIC_ROUTE_KINDS.includes(route.kind) ? loadPublicLocale : loadFullLocale;
  return { [language]: await load(language) };
}

// Precarga lo que necesita el primer render de una URL pública: la pantalla y
// la parte pública del diccionario del idioma de la URL. La usan el prerender (servidor) y
// main.jsx antes de hidratar, para que ambos rendericen exactamente lo mismo.
export async function preloadRouteAssets(pathname) {
  const route = resolveRoute(pathname, new URLSearchParams(), { inferLanguage: false });
  const language = route.urlLang || DEFAULT_LANGUAGE;
  const Screen = getPublicScreenForRoute(route);
  const [locale] = await Promise.all([loadPublicLocale(language), Screen?.preload?.()]);
  return { route, language, initialLocales: { [language]: locale } };
}

