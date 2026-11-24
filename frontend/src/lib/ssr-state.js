// Estado compartido entre el prerender del build (SSR en Node) y la primera
// renderización del cliente (hidratación).
//
// Regla: durante la "pasada de hidratación" el cliente debe renderizar
// exactamente lo mismo que el servidor. Por eso, mientras dura, nada lee
// localStorage, matchMedia ni navigator: el idioma sale solo de la URL y el
// tema es "system". Las preferencias guardadas se aplican después del montaje.

let serverInitialData = {};

export function isServer() {
    return typeof window === "undefined";
}

// true en el servidor y en el cliente mientras hidrata HTML prerenderizado
export function isHydrationPass() {
    return isServer() || window.__LGA_HYDRATING__ === true;
}

export function startHydrationPass() {
    if (!isServer()) window.__LGA_HYDRATING__ = true;
}

export function endHydrationPass() {
    if (!isServer()) window.__LGA_HYDRATING__ = false;
}

// Datos de contenido (posts de Sanity...) que el servidor usó al renderizar.
// El prerender los incrusta en window.__LGA_DATA__ para que el cliente
// arranque con los mismos datos y no tenga que volver a pedirlos.
export function setServerInitialData(data) {
    serverInitialData = data || {};
}

export function getInitialData(key) {
    const source = isServer() ? serverInitialData : (window.__LGA_DATA__ || {});
    return source[key];
}

export const initialDataKeys = {
    post: (lang, slug) => `post:${lang}:${slug}`,
    postList: (lang) => `posts:${lang}`
};

// Serializa datos para incrustarlos en un <script> sin riesgo de cerrar la
// etiqueta ni romper el HTML (el contenido viene del CMS).
export function serializeForScript(value) {
    return JSON.stringify(value ?? {})
        .replace(/</g, "\\u003c")
        .replace(/>/g, "\\u003e")
        .replace(/&/g, "\\u0026")
        .replace(/\u2028/g, "\\u2028")
        .replace(/\u2029/g, "\\u2029");
}
