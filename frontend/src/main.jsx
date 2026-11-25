import { Component } from "react";
import { hydrateRoot, createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { SpeedInsights } from "@vercel/speed-insights/react";
import App from "./App";
import { preloadRouteAssets, preloadClientLocale } from "./screens/screen-registry";
import { startHydrationPass } from "./lib/ssr-state";
import { resolveRoute } from "./router-utils";
import "./styles.css";
import { HelmetProvider } from "react-helmet-async";
import { initCookieConsent } from "./lib/cookie-consent";

const rootNode = document.getElementById("root");

class BootErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, message: "" };
  }

  static getDerivedStateFromError(error) {
    return {
      hasError: true,
      message: error?.message || "Error desconocido al renderizar la aplicación."
    };
  }

  componentDidCatch(error) {
    // Keep details available for debugging without crashing the whole UI tree.
    console.error("BootErrorBoundary caught an error:", error);
  }

  render() {
    if (this.state.hasError) {
      return (
        <section
          style={{
            maxWidth: "760px",
            margin: "24px auto",
            padding: "16px",
            border: "1px solid #fecaca",
            borderRadius: "12px",
            background: "#fff1f2",
            color: "#7f1d1d",
            fontFamily: "Segoe UI, Tahoma, Geneva, Verdana, sans-serif"
          }}
        >
          <h2 style={{ margin: "0 0 8px" }}>Error de arranque del frontend</h2>
          <p style={{ margin: "0 0 12px", lineHeight: 1.5 }}>{this.state.message}</p>
          <p style={{ margin: 0, lineHeight: 1.5 }}>
            Revisa frontend/.env y reinicia con docker compose down -v && docker compose up --build.
          </p>
        </section>
      );
    }
    return this.props.children;
  }
}

function renderTree(initialLocales) {
  return (
    <BootErrorBoundary>
      <HelmetProvider>
        <BrowserRouter>
          <App initialLocales={initialLocales} />
          <SpeedInsights />
        </BrowserRouter>
      </HelmetProvider>
    </BootErrorBoundary>
  );
}

function showBootError(error) {
  if (rootNode) {
    rootNode.textContent = error?.message || "Error desconocido al renderizar la aplicación.";
  }
}

try {
  if (!rootNode) {
    throw new Error("No existe el nodo #root en index.html");
  }

  // El HTML prerenderizado corresponde a la ruta sin query. Si la query cambia
  // la pantalla (p. ej. /?token=... abre el RSVP), no se hidrata: se monta de cero.
  const routeWithoutQuery = resolveRoute(window.location.pathname, new URLSearchParams(), { inferLanguage: false });
  const routeWithQuery = resolveRoute(window.location.pathname, new URLSearchParams(window.location.search), { inferLanguage: false });
  const queryChangesRoute = routeWithoutQuery.kind !== routeWithQuery.kind || routeWithoutQuery.path !== routeWithQuery.path;
  // La página 404 se prerenderiza una sola vez (en español) y se sirve para
  // cualquier URL inexistente: se monta de cero en el idioma de la URL.
  const isNotFound = routeWithoutQuery.kind === "notFound";

  if (rootNode.hasChildNodes() && !queryChangesRoute && !isNotFound) {
    // 🚀 Página prerenderizada en el build (SEO): antes de hidratar cargamos la
    // pantalla y las traducciones de esta URL, para que el primer render del
    // cliente sea idéntico al HTML del servidor.
    startHydrationPass();
    preloadRouteAssets(window.location.pathname)
      .then(({ initialLocales }) => {
        hydrateRoot(rootNode, renderTree(initialLocales));
      })
      .catch(showBootError);
  } else {
    // Rutas de la app (/app, /login, /rsvp...) y 404: SPA normal. Antes de
    // montar cargamos el diccionario del idioma con el que arrancará la app.
    preloadClientLocale(window.location.pathname, window.location.search)
      .catch(() => ({}))
      .then((initialLocales) => {
        createRoot(rootNode).render(renderTree(initialLocales));
      })
      .catch(showBootError);
  }
} catch (error) {
  showBootError(error);
}

// Banner de cookies y Google Analytics (si ya se aceptó). Va fuera de #root,
// así que no interfiere con la hidratación.
initCookieConsent();
