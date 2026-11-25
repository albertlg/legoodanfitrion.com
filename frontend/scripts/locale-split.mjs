// Reparte cada diccionario (src/i18n/<idioma>.json) en dos partes:
//   - "public": las claves que usan las páginas públicas (landing, blog, casos
//     de uso, legales, 404...). Es lo único que descargan esas páginas.
//   - "rest": el resto (app, login, RSVP, admin). Se descarga al entrar en la
//     app o si una página pública pide una clave que no está en su parte.
//
// Las claves públicas se calculan recorriendo el código que pueden ejecutar las
// páginas públicas: App.jsx y las pantallas que carga screen-registry.js,
// excepto las de la app, siguiendo sus imports (estáticos y dinámicos). Se toma
// toda cadena literal que coincida con una clave, más todas las claves que
// empiezan por el prefijo fijo de una plantilla (`uc_${clave}_title` -> "uc_").
// Si sobra alguna clave no pasa nada; si falta, la App la pide al vuelo (y el
// prerender falla si la necesita al renderizar, ver scripts/prerender.mjs).
//
// Lo usa el plugin de vite.config.js (módulos virtuales virtual:lga-locale/...)
// en desarrollo, build de cliente y build SSR, así que todos ven el mismo reparto.

import { readFileSync, existsSync, statSync } from "node:fs";
import { resolve, dirname, join } from "node:path";

export const LOCALE_LANGUAGES = ["es", "ca", "en", "fr", "it"];

// Pantallas de la app (no públicas) que carga screen-registry.js.
const APP_ONLY_SCREENS = new Set([
    "auth-screen",
    "dashboard-screen",
    "public-rsvp-screen",
    "admin-dashboard-screen"
]);

const MIN_PREFIX_LENGTH = 3;

function resolveImport(fromFile, specifier) {
    if (!specifier.startsWith(".")) return null;
    const base = resolve(dirname(fromFile), specifier);
    for (const candidate of [base, `${base}.js`, `${base}.jsx`, join(base, "index.js"), join(base, "index.jsx")]) {
        if (existsSync(candidate) && statSync(candidate).isFile()) return candidate;
    }
    return null;
}

const STATIC_IMPORT_RE = /(?:import|export)\s[^'"`;]*?from\s*["']([^"']+)["']|import\s*["']([^"']+)["']/g;
const DYNAMIC_IMPORT_RE = /import\(\s*["']([^"']+)["']\s*\)/g;
const STRING_LITERAL_RE = /["'`]([A-Za-z0-9_]+)["'`]/g;
const TEMPLATE_PREFIX_RE = /`([A-Za-z0-9_]*)\$\{/g;

// Ficheros que alcanzan las páginas públicas y lo que contienen.
export function scanPublicSources(sourceDir) {
    const srcDir = resolve(sourceDir);
    const appFile = join(srcDir, "App.jsx");
    const registryFile = join(srcDir, "screens", "screen-registry.js");

    const entries = [appFile];
    // Pantallas públicas: las que importa dinámicamente el registro, salvo las de la app.
    for (const match of readFileSync(registryFile, "utf8").matchAll(DYNAMIC_IMPORT_RE)) {
        const name = match[1].split("/").pop().replace(/\.(jsx?|json)$/, "");
        if (match[1].endsWith(".json") || APP_ONLY_SCREENS.has(name)) continue;
        const file = resolveImport(registryFile, match[1]);
        if (file) entries.push(file);
    }

    const files = new Set();
    const literals = new Set();
    const prefixes = new Set();
    const pending = [...entries];
    while (pending.length > 0) {
        const file = pending.pop();
        if (files.has(file) || !/\.(jsx?|mjs)$/.test(file)) continue;
        files.add(file);
        const source = readFileSync(file, "utf8");
        for (const match of source.matchAll(STATIC_IMPORT_RE)) {
            const target = resolveImport(file, match[1] || match[2]);
            if (target) pending.push(target);
        }
        // Los imports dinámicos del registro son las pantallas (ya filtradas arriba).
        if (file !== registryFile) {
            for (const match of source.matchAll(DYNAMIC_IMPORT_RE)) {
                const target = resolveImport(file, match[1]);
                if (target) pending.push(target);
            }
        }
        for (const match of source.matchAll(STRING_LITERAL_RE)) literals.add(match[1]);
        for (const match of source.matchAll(TEMPLATE_PREFIX_RE)) {
            if (match[1].length >= MIN_PREFIX_LENGTH) prefixes.add(match[1]);
        }
    }
    return { files: [...files], literals, prefixes: [...prefixes] };
}

export function isPublicKey(key, scan) {
    return scan.literals.has(key) || scan.prefixes.some((prefix) => key.startsWith(prefix));
}

export function readDictionary(srcDir, language) {
    return JSON.parse(readFileSync(join(srcDir, "i18n", `${language}.json`), "utf8"));
}

// { public, rest } de un idioma.
export function splitDictionary(dictionary, scan) {
    const publicPart = {};
    const restPart = {};
    for (const [key, value] of Object.entries(dictionary)) {
        if (isPublicKey(key, scan)) publicPart[key] = value;
        else restPart[key] = value;
    }
    return { public: publicPart, rest: restPart };
}
