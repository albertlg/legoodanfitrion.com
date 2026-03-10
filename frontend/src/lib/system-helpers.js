// src/lib/system-helpers.js
import { EVENT_SETTINGS_STORAGE_KEY_PREFIX, GUEST_GEO_CACHE_KEY_PREFIX, EVENT_PLANNER_VIEW_TABS, GUEST_PROFILE_VIEW_TABS, GUEST_ADVANCED_EDIT_TABS } from "./constants";
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
    try { window.localStorage.setItem(key, JSON.stringify(nextCache || {})); } catch { }
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
    try { window.localStorage.setItem(key, JSON.stringify(nextCache || {})); } catch { }
}

export function toSelectedPlaceFromLocationPair(pair, formattedAddress) {
    if (!pair) return null;
    const lat = typeof pair.lat === "number" ? pair.lat : null;
    const lng = typeof pair.lng === "number" ? pair.lng : null;
    const placeId = pair.placeId || null;
    const normalizedAddress = String(formattedAddress || pair.address || "").trim();
    if (!placeId && lat === null && lng === null && !normalizedAddress) return null;
    return { placeId, formattedAddress: normalizedAddress, lat, lng };
}

export function mergeOptionsWithSelected(options, value) {
    return uniqueValues([...(options || []), ...splitListInput(value)]);
}

export function normalizeDashboardRouteState(appRoute) {
    const next = { activeView: "overview", eventsWorkspace: "latest", guestsWorkspace: "latest", invitationsWorkspace: "latest", selectedEventDetailId: "", eventPlannerTab: "menu", selectedGuestDetailId: "", guestProfileViewTab: "general", guestAdvancedEditTab: "identity", importWizardSource: "" };
    if (!appRoute || typeof appRoute !== "object") return next;

    const view = String(appRoute.view || "").trim();
    if (!["overview", "profile", "events", "guests", "invitations"].includes(view)) return next;
    next.activeView = view;

    const workspace = String(appRoute.workspace || "").trim();
    if (view === "events") {
        if (["latest", "create", "detail", "plan", "insights"].includes(workspace)) next.eventsWorkspace = workspace;
        next.selectedEventDetailId = String(appRoute.eventId || "").trim();
        const nextEventPlannerTab = String(appRoute.eventPlannerTab || "").trim().toLowerCase();
        if (EVENT_PLANNER_VIEW_TABS.includes(nextEventPlannerTab)) next.eventPlannerTab = nextEventPlannerTab;
    }
    if (view === "guests") {
        if (["latest", "create", "detail"].includes(workspace)) next.guestsWorkspace = workspace;
        next.selectedGuestDetailId = String(appRoute.guestId || "").trim();
        const nextGuestProfileTab = String(appRoute.guestProfileTab || "").trim().toLowerCase();
        if (GUEST_PROFILE_VIEW_TABS.includes(nextGuestProfileTab)) next.guestProfileViewTab = nextGuestProfileTab;
        const nextGuestAdvancedTab = String(appRoute.guestAdvancedTab || "").trim().toLowerCase();
        if (GUEST_ADVANCED_EDIT_TABS.includes(nextGuestAdvancedTab)) next.guestAdvancedEditTab = nextGuestAdvancedTab;
        const nextImportWizardSource = String(appRoute.importWizardSource || "").trim().toLowerCase();
        if (["csv", "gmail", "mobile"].includes(nextImportWizardSource)) next.importWizardSource = nextImportWizardSource;
    }
    if (view === "invitations") {
        if (["latest", "create"].includes(workspace)) next.invitationsWorkspace = workspace;
    }
    return next;
}

export function encodePathSegment(segment) {
    return encodeURIComponent(String(segment || "").trim());
}

export function buildDashboardPathFromState({ activeView, eventsWorkspace, guestsWorkspace, invitationsWorkspace, selectedEventDetailId, eventPlannerTab, selectedGuestDetailId, guestProfileViewTab, guestAdvancedEditTab, editingGuestId, routeEventDetailId, routeEventPlannerTab, routeGuestDetailId }) {
    if (activeView === "overview") return "/app";
    if (activeView === "profile") return "/profile";
    if (activeView === "events") {
        const effectiveEventDetailId = String(selectedEventDetailId || routeEventDetailId || "").trim();
        const effectiveEventPlannerTab = EVENT_PLANNER_VIEW_TABS.includes(String(eventPlannerTab || "").trim().toLowerCase()) ? String(eventPlannerTab || "").trim().toLowerCase() : EVENT_PLANNER_VIEW_TABS.includes(String(routeEventPlannerTab || "").trim().toLowerCase()) ? String(routeEventPlannerTab || "").trim().toLowerCase() : "menu";
        if (eventsWorkspace === "create") return "/app/events/new";
        if (eventsWorkspace === "insights") return "/app/events/insights";
        if (eventsWorkspace === "plan" && effectiveEventDetailId) return `/app/events/${encodePathSegment(effectiveEventDetailId)}/plan/${encodePathSegment(effectiveEventPlannerTab)}`;
        if (eventsWorkspace === "detail" && effectiveEventDetailId) return `/app/events/${encodePathSegment(effectiveEventDetailId)}`;
        return "/app/events";
    }
    if (activeView === "guests") {
        const effectiveGuestDetailId = String(selectedGuestDetailId || routeGuestDetailId || "").trim();
        if (guestsWorkspace === "create") {
            const tab = String(guestAdvancedEditTab || "identity").trim().toLowerCase();
            const safeTab = GUEST_ADVANCED_EDIT_TABS.includes(tab) ? tab : "identity";
            const editableGuestId = String(editingGuestId || routeGuestDetailId || "").trim();
            if (editableGuestId) return `/app/guests/${encodePathSegment(editableGuestId)}/edit/advanced/${encodePathSegment(safeTab)}`;
            return `/app/guests/new/advanced/${encodePathSegment(safeTab)}`;
        }
        if (guestsWorkspace === "detail" && effectiveGuestDetailId) {
            const tab = String(guestProfileViewTab || "general").trim().toLowerCase();
            if (tab && tab !== "general" && GUEST_PROFILE_VIEW_TABS.includes(tab)) return `/app/guests/${encodePathSegment(effectiveGuestDetailId)}/${encodePathSegment(tab)}`;
            return `/app/guests/${encodePathSegment(effectiveGuestDetailId)}`;
        }
        return "/app/guests";
    }
    if (activeView === "invitations") {
        if (invitationsWorkspace === "create") return "/app/invitations/new";
        return "/app/invitations";
    }
    return "/app";
}

export function isSpecificEventDetailPath(pathname) {
    return /^\/app\/events\/[^/]+(?:\/plan\/(?:menu|shopping|ambience|timings|communication|risks)|\/(?:menu|shopping|ambience|timings|communication|risks))?$/.test(String(pathname || "").trim());
}

export function isSpecificGuestDetailPath(pathname) {
    return /^\/app\/guests\/[^/]+(?:\/(?:general|food|lifestyle|conversation|health|history))?$/.test(String(pathname || "").trim());
}

export function isSpecificGuestAdvancedEditPath(pathname) {
    return /^\/app\/guests\/[^/]+\/edit\/advanced\/[^/]+$/.test(String(pathname || "").trim());
}

export function isGenericEventPath(pathname) {
    return String(pathname || "").trim() === "/app/events";
}

export function isGenericGuestPath(pathname) {
    return String(pathname || "").trim() === "/app/guests";
}

export function isNewGuestAdvancedPath(pathname) {
    return /^\/app\/guests\/new\/advanced\/[^/]+$/.test(String(pathname || "").trim());
}

export function shouldPreserveSpecificPath(currentPath, nextPath) {
    const current = String(currentPath || "").trim();
    const next = String(nextPath || "").trim();
    if (!current || !next || current === next) return false;
    if (isSpecificEventDetailPath(current) && isGenericEventPath(next)) return true;
    if (isSpecificGuestDetailPath(current) && isGenericGuestPath(next)) return true;
    if (isSpecificGuestAdvancedEditPath(current) && (isGenericGuestPath(next) || isNewGuestAdvancedPath(next))) return true;
    return false;
}