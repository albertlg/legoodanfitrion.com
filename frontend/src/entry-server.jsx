// Punto de entrada del prerender (build). Renderiza la App real en Node para
// una URL pública y devuelve el HTML, las etiquetas <head> de Helmet y los
// datos de contenido que el cliente necesita para hidratar sin diferencias.
import { PassThrough } from "node:stream";
import { renderToPipeableStream } from "react-dom/server";
import { StaticRouter } from "react-router-dom";
import { HelmetProvider } from "react-helmet-async";
import { SpeedInsights } from "@vercel/speed-insights/react";
import App from "./App";
import { preloadRouteAssets } from "./screens/screen-registry";
import { setServerInitialData, initialDataKeys } from "./lib/ssr-state";
import { fetchBlogPost, fetchBlogPostList } from "./lib/blog-data";

export { serializeForScript } from "./lib/ssr-state";

// Datos de contenido que necesita la ruta (mismas consultas que las pantallas).
async function loadRouteData(route, language) {
    if (route.kind !== "blog") return {};
    const slug = route.path.split("/")[2];
    if (slug) {
        const post = await fetchBlogPost(language, slug);
        if (!post) throw new Error(`Post no encontrado en Sanity: ${language}/${slug}`);
        return { [initialDataKeys.post(language, slug)]: post };
    }
    const posts = await fetchBlogPostList(language);
    return { [initialDataKeys.postList(language)]: posts };
}

function renderToString(element) {
    return new Promise((resolve, reject) => {
        let html = "";
        const sink = new PassThrough();
        sink.on("data", (chunk) => { html += chunk.toString(); });
        sink.on("end", () => resolve(html));
        const { pipe } = renderToPipeableStream(element, {
            onAllReady() { pipe(sink); },
            onShellError: reject,
            onError: reject
        });
    });
}

export async function render(url) {
    const { route, language, initialLocales } = await preloadRouteAssets(url);
    const data = await loadRouteData(route, language);
    setServerInitialData(data);

    const helmetContext = {};
    const appHtml = await renderToString(
        <HelmetProvider context={helmetContext}>
            <StaticRouter location={url}>
                <App initialLocales={initialLocales} />
                <SpeedInsights />
            </StaticRouter>
        </HelmetProvider>
    );
    setServerInitialData({});

    const { helmet } = helmetContext;
    const head = [
        helmet.title.toString(),
        helmet.priority?.toString?.() || "",
        helmet.meta.toString(),
        helmet.link.toString(),
        helmet.script.toString()
    ].filter(Boolean).join("\n    ");

    return {
        appHtml,
        head,
        htmlAttributes: helmet.htmlAttributes.toString(),
        language,
        data
    };
}
