// src/lib/system-helpers.js
import { EVENT_SETTINGS_STORAGE_KEY_PREFIX, GUEST_GEO_CACHE_KEY_PREFIX } from "./constants";
import { splitListInput, uniqueValues } from "./formatters";

export function isCompatibilityError(error, fragments = []) {
    const message = String(error?.message || "").toLowerCase();
    if (error?.code === "42703" || error?.code === "42p01") return true;
    return fragments.some((fragment) => message.includes(String(fragment).toLowerCase()));
}

export function isMissingRelationError(error, relationName) {
    const message = String(error?.message || "").toLowerCase();
    const relation = String(relationName || "").toLowerCase();
    return error?.code === "42p01" || (relation ? message.includes(relation) : false);
}

export function isMissingDbFeatureError(error, fragments = []) {
    const message = String(error?.message || "").toLowerCase();
    if (error?.code === "42p01" || error?.code === "42703" || error?.code === "42883") return true;
    return fragments.some((fragment) => message.includes(String(fragment || "").toLowerCase()));
}

export function readEventSettingsCache(userId) {
    if (typeof window === "undefined" || !userId) return {};
    const key = `${EVENT_SETTINGS_STORAGE_KEY_PREFIX}:${userId}`;
    try {
        const raw = window.localStorage.getItem(key);
        if (!raw) return {};
        const parsed = JSON.parse(raw);
        return parsed && typeof parsed === "object" ? parsed : {};
    } catch { return {}; }
}

export function writeEventSettingsCache(userId, nextCache) {
    if (typeof window === "undefined" || !userId) return;
    const key = `${EVENT_SETTINGS_STORAGE_KEY_PREFIX}:${userId}`;
    try {
        window.localStorage.setItem(key, JSON.stringify(nextCache || {}));
    } catch {
        return;
    }
}

export function readGuestGeoCache(userId) {
    if (typeof window === "undefined" || !userId) return {};
    const key = `${GUEST_GEO_CACHE_KEY_PREFIX}:${userId}`;
    try {
        const raw = window.localStorage.getItem(key);
        if (!raw) return {};
        const parsed = JSON.parse(raw);
        return parsed && typeof parsed === "object" ? parsed : {};
    } catch { return {}; }
}

export function writeGuestGeoCache(userId, nextCache) {
    if (typeof window === "undefined" || !userId) return;
    const key = `${GUEST_GEO_CACHE_KEY_PREFIX}:${userId}`;
    try {
        window.localStorage.setItem(key, JSON.stringify(nextCache || {}));
    } catch {
        return;
    }
}

export function mergeOptionsWithSelected(options, value) {
    return uniqueValues([...(options || []), ...splitListInput(value)]);
}
