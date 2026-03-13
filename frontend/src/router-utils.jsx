import { useLocation, useNavigate, useSearchParams } from "react-router-dom";
import { useMemo, useCallback, useEffect } from "react";

const LANDING_PATHS = new Set(["/", "/features", "/pricing", "/contact"]);
const GUEST_PROFILE_TABS = new Set(["general", "food", "lifestyle", "conversation", "health", "history"]);
const GUEST_ADVANCED_EDIT_TABS = new Set(["identity", "food", "lifestyle", "conversation", "health"]);
const EVENT_PLANNER_TABS = new Set(["menu", "shopping", "ambience", "timings", "communication", "risks"]);

export function normalizePathname(pathname) {
    const normalized = String(pathname || "/").trim() || "/";
    if (normalized.length > 1 && normalized.endsWith("/")) {
        return normalized.replace(/\/+$/, "");
    }
    return normalized;
}

export function decodePathSegment(segment) {
    try {
        return decodeURIComponent(String(segment || "").trim());
    } catch {
        return String(segment || "").trim();
    }
}

export function getImportWizardSource(searchParams) {
    const next = String(searchParams?.get?.("import") || "")
        .trim()
        .toLowerCase();
    return ["csv", "gmail", "mobile"].includes(next) ? next : "";
}

export function normalizeDashboardRouteState(appRoute) {
    const next = {
        activeView: "overview",
        eventsWorkspace: "latest",
        guestsWorkspace: "latest",
        invitationsWorkspace: "latest",
        selectedEventDetailId: "",
        eventPlannerTab: "menu",
        selectedGuestDetailId: "",
        guestProfileViewTab: "general",
        guestAdvancedEditTab: "identity",
        importWizardSource: ""
    };
    if (!appRoute || typeof appRoute !== "object") return next;

    const view = String(appRoute.view || "").trim();
    if (!["overview", "profile", "events", "guests", "invitations"].includes(view)) return next;
    next.activeView = view;

    const workspace = String(appRoute.workspace || "").trim();
    if (view === "events") {
        if (["latest", "create", "detail", "plan", "insights"].includes(workspace)) next.eventsWorkspace = workspace;
        next.selectedEventDetailId = String(appRoute.eventId || "").trim();
        const nextEventPlannerTab = String(appRoute.eventPlannerTab || "").trim().toLowerCase();
        if (EVENT_PLANNER_TABS.has(nextEventPlannerTab)) next.eventPlannerTab = nextEventPlannerTab;
    }
    if (view === "guests") {
        if (["latest", "create", "detail"].includes(workspace)) next.guestsWorkspace = workspace;
        next.selectedGuestDetailId = String(appRoute.guestId || "").trim();
        const nextGuestProfileTab = String(appRoute.guestProfileTab || "").trim().toLowerCase();
        if (GUEST_PROFILE_TABS.has(nextGuestProfileTab)) next.guestProfileViewTab = nextGuestProfileTab;
        const nextGuestAdvancedTab = String(appRoute.guestAdvancedTab || "").trim().toLowerCase();
        if (GUEST_ADVANCED_EDIT_TABS.has(nextGuestAdvancedTab)) next.guestAdvancedEditTab = nextGuestAdvancedTab;
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

export function buildDashboardPathFromState({
    activeView,
    eventsWorkspace,
    guestsWorkspace,
    invitationsWorkspace,
    selectedEventDetailId,
    eventPlannerTab,
    selectedGuestDetailId,
    guestProfileViewTab,
    guestAdvancedEditTab,
    editingGuestId,
    routeEventDetailId,
    routeEventPlannerTab,
    routeGuestDetailId
}) {
    if (activeView === "overview") return "/app";
    if (activeView === "profile") return "/profile";
    if (activeView === "events") {
        const effectiveEventDetailId = String(selectedEventDetailId || routeEventDetailId || "").trim();
        const normalizedEventPlannerTab = String(eventPlannerTab || "").trim().toLowerCase();
        const normalizedRouteEventPlannerTab = String(routeEventPlannerTab || "").trim().toLowerCase();
        const effectiveEventPlannerTab = EVENT_PLANNER_TABS.has(normalizedEventPlannerTab)
            ? normalizedEventPlannerTab
            : EVENT_PLANNER_TABS.has(normalizedRouteEventPlannerTab)
                ? normalizedRouteEventPlannerTab
                : "menu";
        if (eventsWorkspace === "create") return "/app/events/new";
        if (eventsWorkspace === "insights") return "/app/events/insights";
        if (eventsWorkspace === "plan" && effectiveEventDetailId) {
            return `/app/events/${encodePathSegment(effectiveEventDetailId)}/plan/${encodePathSegment(effectiveEventPlannerTab)}`;
        }
        if (eventsWorkspace === "detail" && effectiveEventDetailId) return `/app/events/${encodePathSegment(effectiveEventDetailId)}`;
        return "/app/events";
    }
    if (activeView === "guests") {
        const effectiveGuestDetailId = String(selectedGuestDetailId || routeGuestDetailId || "").trim();
        if (guestsWorkspace === "create") {
            const tab = String(guestAdvancedEditTab || "identity").trim().toLowerCase();
            const safeTab = GUEST_ADVANCED_EDIT_TABS.has(tab) ? tab : "identity";
            const editableGuestId = String(editingGuestId || routeGuestDetailId || "").trim();
            if (editableGuestId) return `/app/guests/${encodePathSegment(editableGuestId)}/edit/advanced/${encodePathSegment(safeTab)}`;
            return `/app/guests/new/advanced/${encodePathSegment(safeTab)}`;
        }
        if (guestsWorkspace === "detail" && effectiveGuestDetailId) {
            const tab = String(guestProfileViewTab || "general").trim().toLowerCase();
            if (tab && tab !== "general" && GUEST_PROFILE_TABS.has(tab)) {
                return `/app/guests/${encodePathSegment(effectiveGuestDetailId)}/${encodePathSegment(tab)}`;
            }
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

function isGenericEventPath(pathname) {
    return String(pathname || "").trim() === "/app/events";
}

function isGenericGuestPath(pathname) {
    return String(pathname || "").trim() === "/app/guests";
}

function isNewGuestAdvancedPath(pathname) {
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

export function parseAppRoute(pathname, searchParams = new URLSearchParams()) {
    const normalized = normalizePathname(pathname);
    const segments = normalized.split("/").filter(Boolean).slice(1);
    const section = segments[0] || "overview";
    const normalizedSegment = String(segments[1] || "").trim().toLowerCase();
    const importWizardSource = getImportWizardSource(searchParams);

    if (section === "profile") {
        return { view: "profile" };
    }

    if (section === "events") {
        if (normalizedSegment === "new") {
            return { view: "events", workspace: "create" };
        }
        if (normalizedSegment === "insights") {
            return { view: "events", workspace: "insights" };
        }
        if (normalizedSegment === "latest" || normalizedSegment === "list" || normalizedSegment === "hub") {
            return { view: "events", workspace: "latest" };
        }
        if (segments[1]) {
            const eventId = decodePathSegment(segments[1]);
            const thirdSegment = decodePathSegment(segments[2] || "").toLowerCase();
            if (thirdSegment === "plan") {
                const plannerSegment = decodePathSegment(segments[3] || "").toLowerCase();
                const eventPlannerTab = EVENT_PLANNER_TABS.has(plannerSegment) ? plannerSegment : "menu";
                return { view: "events", workspace: "plan", eventId, eventPlannerTab };
            }
            if (EVENT_PLANNER_TABS.has(thirdSegment)) {
                return { view: "events", workspace: "plan", eventId, eventPlannerTab: thirdSegment };
            }
            return { view: "events", workspace: "detail", eventId };
        }
        return { view: "events", workspace: "latest" };
    }

    if (section === "guests") {
        if (normalizedSegment === "new") {
            const advancedSegment = decodePathSegment(segments[2] || "").toLowerCase();
            const stepSegment = decodePathSegment(segments[3] || "").toLowerCase();
            if (advancedSegment === "advanced") {
                const guestAdvancedTab = GUEST_ADVANCED_EDIT_TABS.has(stepSegment) ? stepSegment : "identity";
                return { view: "guests", workspace: "create", guestAdvancedTab };
            }
            return { view: "guests", workspace: "create", guestAdvancedTab: "identity" };
        }
        if (segments[1] && String(segments[2] || "").trim().toLowerCase() === "edit") {
            const advancedSegment = decodePathSegment(segments[3] || "").toLowerCase();
            const stepSegment = decodePathSegment(segments[4] || "").toLowerCase();
            const guestAdvancedTab = advancedSegment === "advanced" && GUEST_ADVANCED_EDIT_TABS.has(stepSegment) ? stepSegment : "identity";
            return {
                view: "guests",
                workspace: "create",
                guestId: decodePathSegment(segments[1]),
                guestAdvancedTab
            };
        }
        if (normalizedSegment === "latest" || normalizedSegment === "list" || normalizedSegment === "hub") {
            return importWizardSource
                ? { view: "guests", workspace: "latest", importWizardSource }
                : { view: "guests", workspace: "latest" };
        }
        if (segments[1]) {
            const tabSegment = decodePathSegment(segments[2] || "").toLowerCase();
            const guestProfileTab = GUEST_PROFILE_TABS.has(tabSegment) ? tabSegment : "general";
            return { view: "guests", workspace: "detail", guestId: decodePathSegment(segments[1]), guestProfileTab };
        }
        return importWizardSource
            ? { view: "guests", workspace: "latest", importWizardSource }
            : { view: "guests", workspace: "latest" };
    }

    if (section === "invitations") {
        if (normalizedSegment === "new") {
            return { view: "invitations", workspace: "create" };
        }
        return { view: "invitations", workspace: "latest" };
    }

    return { view: "overview" };
}

export function buildCanonicalAppPath(appRoute) {
    const view = String(appRoute?.view || "overview").trim();
    const workspace = String(appRoute?.workspace || "").trim();

    if (view === "profile") return "/profile";
    if (view === "events") {
        if (workspace === "create") return "/app/events/new";
        if (workspace === "insights") return "/app/events/insights";
        if (workspace === "plan" && appRoute?.eventId) {
            const eventPlannerTab = String(appRoute?.eventPlannerTab || "menu").trim().toLowerCase();
            const safeEventPlannerTab = EVENT_PLANNER_TABS.has(eventPlannerTab) ? eventPlannerTab : "menu";
            return `/app/events/${encodeURIComponent(String(appRoute.eventId).trim())}/plan/${encodeURIComponent(safeEventPlannerTab)}`;
        }
        if (workspace === "detail" && appRoute?.eventId) return `/app/events/${encodeURIComponent(String(appRoute.eventId).trim())}`;
        return "/app/events";
    }
    if (view === "guests") {
        if (workspace === "create") {
            const tab = String(appRoute?.guestAdvancedTab || "identity").trim().toLowerCase();
            const safeTab = GUEST_ADVANCED_EDIT_TABS.has(tab) ? tab : "identity";
            if (appRoute?.guestId) return `/app/guests/${encodeURIComponent(String(appRoute.guestId).trim())}/edit/advanced/${encodeURIComponent(safeTab)}`;
            return `/app/guests/new/advanced/${encodeURIComponent(safeTab)}`;
        }
        if (workspace === "detail" && appRoute?.guestId) {
            const tab = String(appRoute?.guestProfileTab || "general").trim().toLowerCase();
            if (tab && tab !== "general" && GUEST_PROFILE_TABS.has(tab)) return `/app/guests/${encodeURIComponent(String(appRoute.guestId).trim())}/${encodeURIComponent(tab)}`;
            return `/app/guests/${encodeURIComponent(String(appRoute.guestId).trim())}`;
        }
        return "/app/guests";
    }
    if (view === "invitations") {
        if (workspace === "create") return "/app/invitations/new";
        return "/app/invitations";
    }
    return "/app";
}

export function getCanonicalPathForRoute(route) {
    if (!route || typeof route !== "object") return "/";
    if (route.kind === "landing") return LANDING_PATHS.has(route.path) ? route.path : "/";
    if (route.kind === "login") return "/login";
    if (route.kind === "rsvp") return route.token ? `/rsvp/${encodeURIComponent(route.token)}` : "/";
    if (route.kind === "app") {
        const importWizardSource = String(route.appRoute?.importWizardSource || "").trim().toLowerCase();
        if (route.appRoute?.view === "guests" && route.appRoute?.workspace === "latest" && ["csv", "gmail", "mobile"].includes(importWizardSource)) {
            return `/app/guests?import=${encodeURIComponent(importWizardSource)}&wizard=1`;
        }
        return buildCanonicalAppPath(route.appRoute || { view: "overview" });
    }
    return "/";
}

export function useAppRouter() {
    const location = useLocation();
    const navigateFull = useNavigate();
    const [searchParams] = useSearchParams();

    const navigate = useCallback((nextPath, { replace = false } = {}) => {
        navigateFull(nextPath, { replace });
    }, [navigateFull]);

    const route = useMemo(() => {
        const pathname = normalizePathname(location.pathname);
        const queryToken = String(searchParams.get("token") || "").trim();
        if (queryToken) return { kind: "rsvp", path: `/rsvp/${queryToken}`, token: queryToken };

        if (pathname.startsWith("/rsvp/")) {
            const token = pathname.replace("/rsvp/", "").trim();
            return token ? { kind: "rsvp", path: pathname, token } : { kind: "landing", path: "/" };
        }
        if (pathname === "/login") return { kind: "login", path: "/login" };
        if (pathname === "/profile") return { kind: "app", path: "/profile", appRoute: { view: "profile" } };
        if (pathname === "/app" || pathname.startsWith("/app/")) return { kind: "app", path: pathname, appRoute: parseAppRoute(pathname, searchParams) };
        if (LANDING_PATHS.has(pathname)) return { kind: "landing", path: pathname };
        return { kind: "landing", path: "/" };
    }, [location.pathname, searchParams]);

    const isRecoveryMode = useMemo(() => {
        const type = String(searchParams.get("type") || "").toLowerCase();
        const hashParams = new URLSearchParams(location.hash.replace(/^#/, ""));
        const hashType = String(hashParams.get("type") || "").toLowerCase();
        return type === "recovery" || hashType === "recovery";
    }, [searchParams, location.hash]);

    useEffect(() => {
        const canonicalPath = getCanonicalPathForRoute(route);
        const currentPath = normalizePathname(location.pathname);
        if (canonicalPath && canonicalPath !== currentPath) {
            navigateFull(canonicalPath, { replace: true });
        }
    }, [route, location.pathname, navigateFull]);

    return { route, navigate, isRecoveryMode };
}
