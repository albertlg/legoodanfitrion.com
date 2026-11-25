// Registro de pantallas de la app con carga diferida y precarga.
// Vive fuera de App.jsx para que la usen también main.jsx (antes de hidratar)
// y el prerender del build (entry-server.jsx).
import { lazy } from "react";
import { resolveRoute } from "../router-utils";

const DEFAULT_LANGUAGE = "es";

// Todos los idiomas (también el español) se cargan bajo demanda: una página en
// inglés no descarga el diccionario español.
export const LOCALE_LOADERS = {
  es: () => import("../i18n/es.json"),
  ca: () => import("../i18n/ca.json"),
  en: () => import("../i18n/en.json"),
  fr: () => import("../i18n/fr.json"),
  it: () => import("../i18n/it.json")
};

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

export async function loadLocale(language) {
  const loader = LOCALE_LOADERS[language] || LOCALE_LOADERS[DEFAULT_LANGUAGE];
  const module = await loader();
  return module?.default || module;
}

const SUPPORTED = Object.keys(LOCALE_LOADERS);

// Idioma con el que App arrancará en las rutas que NO vienen prerenderizadas
// (/app, /login, /rsvp...). Replica detectLanguage de App.jsx para precargar
// ese diccionario antes del primer render.
export function getClientInitialLanguage(pathname, search = "") {
  const route = resolveRoute(pathname, new URLSearchParams(search), { inferLanguage: true });
  const firstSegment = String(pathname || "").split("/").filter(Boolean)[0];
  const fromNavigator = () => {
    const nav = (window.navigator.language || DEFAULT_LANGUAGE).slice(0, 2).toLowerCase();
    return SUPPORTED.includes(nav) ? nav : DEFAULT_LANGUAGE;
  };
  if (route.kind === "rsvp") return fromNavigator();
  if (SUPPORTED.includes(firstSegment)) return firstSegment;
  try {
    const stored = window.localStorage.getItem("legood-language");
    if (stored && SUPPORTED.includes(stored)) return stored;
  } catch {
    /* sin storage */
  }
  return fromNavigator();
}

export async function preloadClientLocale(pathname, search) {
  const language = getClientInitialLanguage(pathname, search);
  return { [language]: await loadLocale(language) };
}

// Precarga lo que necesita el primer render de una URL pública: la pantalla y
// las traducciones del idioma de la URL. La usan el prerender (servidor) y
// main.jsx antes de hidratar, para que ambos rendericen exactamente lo mismo.
export async function preloadRouteAssets(pathname) {
  const route = resolveRoute(pathname, new URLSearchParams(), { inferLanguage: false });
  const language = route.urlLang || DEFAULT_LANGUAGE;
  const Screen = getPublicScreenForRoute(route);
  const [locale] = await Promise.all([loadLocale(language), Screen?.preload?.()]);
  return { route, language, initialLocales: { [language]: locale } };
}

