import { StrictMode, createElement } from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import "./styles.css";

const rootNode = document.getElementById("root");

function renderBootError(message) {
  if (!rootNode) {
    return;
  }
  rootNode.innerHTML = `
    <section style="max-width:760px;margin:24px auto;padding:16px;border:1px solid #fecaca;border-radius:12px;background:#fff1f2;color:#7f1d1d;font-family:Segoe UI,Tahoma,Geneva,Verdana,sans-serif;">
      <h2 style="margin:0 0 8px;">Error de arranque del frontend</h2>
      <p style="margin:0 0 12px;line-height:1.5;">${message}</p>
      <p style="margin:0;line-height:1.5;">Revisa <code>frontend/.env</code> y reinicia con <code>docker compose down -v && docker compose up --build</code>.</p>
    </section>
  `;
}

window.addEventListener("error", (event) => {
  if (event?.error?.message) {
    renderBootError(event.error.message);
  }
});

window.addEventListener("unhandledrejection", (event) => {
  if (event?.reason?.message) {
    renderBootError(event.reason.message);
  } else if (event?.reason) {
    renderBootError(String(event.reason));
  }
});

try {
  if (!rootNode) {
    throw new Error("No existe el nodo #root en index.html");
  }
  ReactDOM.createRoot(rootNode).render(createElement(StrictMode, null, createElement(App)));
} catch (error) {
  renderBootError(error?.message || "Error desconocido al renderizar la aplicación.");
}
