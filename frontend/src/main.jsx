import { Component } from "react";
// 🚀 FIX PRERENDER: Importamos hydrateRoot además de createRoot
import { createRoot, hydrateRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import App from "./App";
import "./styles.css";
import { HelmetProvider } from "react-helmet-async";

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

try {
  if (!rootNode) {
    throw new Error("No existe el nodo #root en index.html");
  }

  const appContent = (
    <BootErrorBoundary>
      <HelmetProvider>
        <BrowserRouter>
          <App />
        </BrowserRouter>
      </HelmetProvider>
    </BootErrorBoundary>
  );

  // 🚀 FIX PRERENDER: La magia de la hidratación
  // Si hay HTML dentro del root (el plugin hizo su trabajo), hidratamos.
  if (rootNode.hasChildNodes()) {
    hydrateRoot(rootNode, appContent);
  } else {
    // Si está vacío (ej. en local o dev), renderizamos normal.
    createRoot(rootNode).render(appContent);
  }

} catch (error) {
  if (rootNode) {
    rootNode.textContent = error?.message || "Error desconocido al renderizar la aplicación.";
  }
}
