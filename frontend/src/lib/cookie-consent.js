// Consentimiento de cookies propio (sustituye a Cookiebot).
//
// - Google Analytics (gtag.js) NO se carga hasta que el visitante acepta: antes
//   de elegir no sale ninguna petición a Google.
// - La elección se guarda en localStorage ("lga-cookie-consent") y se puede
//   cambiar en cualquier momento con openCookieSettings() (enlace "Cookies"
//   del pie de página y de la política de privacidad).
// - El banner es DOM plano fuera de #root: no participa en la hidratación de
//   React y aparece igual en las páginas públicas, la app y el RSVP.
//
// Se puede importar en el servidor (prerender): nada toca window al cargar.

const GA_MEASUREMENT_ID = "G-EN2Q3HNXP1";
const STORAGE_KEY = "lga-cookie-consent";
const CONSENT_VERSION = 1;
const BANNER_ID = "lga-consent-banner";

const PRIVACY_PATHS = {
  es: "/privacidad",
  ca: "/ca/privacitat",
  en: "/en/privacy",
  fr: "/fr/confidentialite",
  it: "/it/privacy"
};

const TEXTS = {
  es: {
    title: "Cookies",
    body: "Usamos cookies esenciales para que la web funcione y, solo si aceptas, cookies analíticas de Google Analytics para saber cómo se usa y mejorarla.",
    accept: "Aceptar",
    reject: "Rechazar",
    policy: "Política de privacidad"
  },
  ca: {
    title: "Galetes",
    body: "Fem servir galetes essencials perquè el web funcioni i, només si ho acceptes, galetes analítiques de Google Analytics per saber com s'utilitza i millorar-lo.",
    accept: "Acceptar",
    reject: "Rebutjar",
    policy: "Política de privacitat"
  },
  en: {
    title: "Cookies",
    body: "We use essential cookies to make the site work and, only if you accept, Google Analytics cookies to understand how it is used and improve it.",
    accept: "Accept",
    reject: "Reject",
    policy: "Privacy policy"
  },
  fr: {
    title: "Cookies",
    body: "Nous utilisons des cookies essentiels au fonctionnement du site et, uniquement si tu acceptes, des cookies Google Analytics pour comprendre son utilisation et l'améliorer.",
    accept: "Accepter",
    reject: "Refuser",
    policy: "Politique de confidentialité"
  },
  it: {
    title: "Cookie",
    body: "Usiamo cookie essenziali per far funzionare il sito e, solo se accetti, cookie analitici di Google Analytics per capire come viene usato e migliorarlo.",
    accept: "Accetta",
    reject: "Rifiuta",
    policy: "Informativa sulla privacy"
  }
};

let analyticsLoaded = false;
let langObserver = null;

function isBrowser() {
  return typeof window !== "undefined" && typeof document !== "undefined";
}

function readConsent() {
  try {
    const parsed = JSON.parse(window.localStorage.getItem(STORAGE_KEY) || "null");
    if (parsed && parsed.v === CONSENT_VERSION && typeof parsed.analytics === "boolean") {
      return parsed;
    }
  } catch {
    // Sin storage o valor corrupto: como si no hubiera elegido.
  }
  return null;
}

function writeConsent(analytics) {
  try {
    window.localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ v: CONSENT_VERSION, analytics, date: new Date().toISOString() })
    );
  } catch {
    // Sin storage: la elección vale solo para esta visita.
  }
}

function loadAnalytics() {
  window[`ga-disable-${GA_MEASUREMENT_ID}`] = false;
  if (analyticsLoaded) {
    return;
  }
  analyticsLoaded = true;
  window.dataLayer = window.dataLayer || [];
  window.gtag = function gtag() {
    window.dataLayer.push(arguments);
  };
  window.gtag("js", new Date());
  window.gtag("config", GA_MEASUREMENT_ID);
  const script = document.createElement("script");
  script.async = true;
  script.src = `https://www.googletagmanager.com/gtag/js?id=${GA_MEASUREMENT_ID}`;
  document.head.appendChild(script);
}

// Retirar el consentimiento: el script no se puede descargar, pero se desactiva
// el envío y se borran sus cookies (_ga, _ga_XXXX) en el dominio y subdominios.
function disableAnalytics() {
  window[`ga-disable-${GA_MEASUREMENT_ID}`] = true;
  const hostParts = window.location.hostname.split(".");
  const domains = [""];
  for (let index = 0; index < hostParts.length - 1; index += 1) {
    domains.push(`; domain=.${hostParts.slice(index).join(".")}`);
  }
  for (const cookie of document.cookie.split(";")) {
    const name = cookie.split("=")[0].trim();
    if (name === "_ga" || name.startsWith("_ga_") || name === "_gid") {
      for (const domain of domains) {
        document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/${domain}`;
      }
    }
  }
}

function currentLanguage() {
  const lang = String(document.documentElement.lang || "es").slice(0, 2).toLowerCase();
  return TEXTS[lang] ? lang : "es";
}

function fillBanner(banner) {
  const language = currentLanguage();
  const texts = TEXTS[language];
  banner.querySelector("[data-consent-title]").textContent = texts.title;
  banner.querySelector("[data-consent-body]").textContent = texts.body;
  banner.querySelector("[data-consent-accept]").textContent = texts.accept;
  banner.querySelector("[data-consent-reject]").textContent = texts.reject;
  const policy = banner.querySelector("[data-consent-policy]");
  policy.textContent = texts.policy;
  policy.setAttribute("href", PRIVACY_PATHS[language]);
  banner.setAttribute("aria-label", texts.title);
}

function closeBanner() {
  document.getElementById(BANNER_ID)?.remove();
  langObserver?.disconnect();
  langObserver = null;
}

function choose(analytics) {
  const previous = readConsent();
  writeConsent(analytics);
  closeBanner();
  if (analytics) {
    loadAnalytics();
  } else if (previous?.analytics || analyticsLoaded) {
    disableAnalytics();
  }
}

const BUTTON_CLASS =
  "flex-1 sm:flex-none px-5 py-2.5 rounded-xl text-sm font-bold transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-gray-900";

function showBanner() {
  if (document.getElementById(BANNER_ID)) {
    return;
  }
  const banner = document.createElement("section");
  banner.id = BANNER_ID;
  banner.setAttribute("role", "region");
  // En el panel (móvil) hay una barra de navegación fija abajo: el banner va encima.
  const inApp = window.location.pathname.startsWith("/app");
  banner.className = [
    "fixed left-3 right-3 z-[1000] mx-auto max-w-3xl",
    inApp ? "bottom-[88px] md:bottom-4" : "bottom-3 md:bottom-4",
    "rounded-2xl border border-black/10 dark:border-white/10",
    "bg-white dark:bg-gray-900 text-gray-900 dark:text-white shadow-2xl",
    "p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center gap-4"
  ].join(" ");
  banner.innerHTML = `
    <div class="flex-1 min-w-0">
      <p data-consent-title class="font-bold text-sm mb-1"></p>
      <p class="text-sm leading-relaxed text-gray-700 dark:text-gray-300">
        <span data-consent-body></span>
        <a data-consent-policy class="underline font-medium text-gray-900 dark:text-white hover:text-blue-700 dark:hover:text-blue-300"></a>
      </p>
    </div>
    <div class="flex gap-2 shrink-0">
      <button type="button" data-consent-reject class="${BUTTON_CLASS} bg-gray-100 text-gray-900 hover:bg-gray-200 dark:bg-gray-800 dark:text-white dark:hover:bg-gray-700"></button>
      <button type="button" data-consent-accept class="${BUTTON_CLASS} bg-gray-900 text-white hover:bg-gray-700 dark:bg-white dark:text-gray-900 dark:hover:bg-gray-200"></button>
    </div>`;
  // Espacio entre el texto y el enlace a la política.
  banner.querySelector("[data-consent-body]").after(" ");
  fillBanner(banner);
  banner.querySelector("[data-consent-accept]").addEventListener("click", () => choose(true));
  banner.querySelector("[data-consent-reject]").addEventListener("click", () => choose(false));
  document.body.appendChild(banner);

  // La app cambia <html lang> al cambiar de idioma: el banner la sigue.
  langObserver = new MutationObserver(() => fillBanner(banner));
  langObserver.observe(document.documentElement, { attributes: true, attributeFilter: ["lang"] });
}

// Al arrancar el cliente: aplica la elección guardada o pregunta.
export function initCookieConsent() {
  if (!isBrowser()) {
    return;
  }
  const consent = readConsent();
  if (consent?.analytics) {
    loadAnalytics();
  } else if (!consent) {
    showBanner();
  }
}

// Vuelve a mostrar el banner para cambiar la elección.
export function openCookieSettings() {
  if (!isBrowser()) {
    return;
  }
  closeBanner();
  showBanner();
  document.querySelector(`#${BANNER_ID} [data-consent-reject]`)?.focus();
}
