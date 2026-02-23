import { useCallback, useEffect, useMemo, useState } from "react";
import { BrandMark } from "./components/brand-mark";
import { Controls } from "./components/controls";
import ca from "./i18n/ca.json";
import en from "./i18n/en.json";
import es from "./i18n/es.json";
import fr from "./i18n/fr.json";
import it from "./i18n/it.json";
import { getAuthRedirectUrl } from "./lib/app-url";
import { hasSupabaseEnv, supabase } from "./lib/supabaseClient";
import { AuthScreen } from "./screens/auth-screen";
import { DashboardScreen } from "./screens/dashboard-screen";
import { LandingScreen } from "./screens/landing-screen";
import { PublicRsvpScreen } from "./screens/public-rsvp-screen";

const I18N = { es, ca, en, fr, it };

const LANDING_PATHS = new Set(["/", "/features", "/pricing", "/contact"]);
const GUEST_PROFILE_TABS = new Set(["general", "food", "lifestyle", "conversation", "health", "history"]);

function normalizePathname(pathname) {
  const normalized = String(pathname || "/").trim() || "/";
  if (normalized.length > 1 && normalized.endsWith("/")) {
    return normalized.replace(/\/+$/, "");
  }
  return normalized;
}

function decodePathSegment(segment) {
  try {
    return decodeURIComponent(String(segment || "").trim());
  } catch {
    return String(segment || "").trim();
  }
}

function parseAppRoute(pathname) {
  const normalized = normalizePathname(pathname);
  const segments = normalized.split("/").filter(Boolean).slice(1);
  const section = segments[0] || "overview";
  const normalizedSegment = String(segments[1] || "").trim().toLowerCase();

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
      return { view: "events", workspace: "detail", eventId: decodePathSegment(segments[1]) };
    }
    return { view: "events", workspace: "latest" };
  }

  if (section === "guests") {
    if (normalizedSegment === "new") {
      return { view: "guests", workspace: "create" };
    }
    if (normalizedSegment === "latest" || normalizedSegment === "list" || normalizedSegment === "hub") {
      return { view: "guests", workspace: "latest" };
    }
    if (segments[1]) {
      const tabSegment = decodePathSegment(segments[2] || "").toLowerCase();
      const guestProfileTab = GUEST_PROFILE_TABS.has(tabSegment) ? tabSegment : "general";
      return { view: "guests", workspace: "detail", guestId: decodePathSegment(segments[1]), guestProfileTab };
    }
    return { view: "guests", workspace: "latest" };
  }

  if (section === "invitations") {
    if (normalizedSegment === "new") {
      return { view: "invitations", workspace: "create" };
    }
    if (normalizedSegment === "latest" || normalizedSegment === "list" || normalizedSegment === "hub") {
      return { view: "invitations", workspace: "latest" };
    }
    return { view: "invitations", workspace: "latest" };
  }

  if (section === "overview") {
    return { view: "overview" };
  }

  return { view: "overview" };
}

function buildCanonicalAppPath(appRoute) {
  const view = String(appRoute?.view || "overview").trim();
  const workspace = String(appRoute?.workspace || "").trim();

  if (view === "profile") {
    return "/profile";
  }
  if (view === "events") {
    if (workspace === "create") {
      return "/app/events/new";
    }
    if (workspace === "insights") {
      return "/app/events/insights";
    }
    if (workspace === "detail" && appRoute?.eventId) {
      return `/app/events/${encodeURIComponent(String(appRoute.eventId).trim())}`;
    }
    return "/app/events";
  }
  if (view === "guests") {
    if (workspace === "create") {
      return "/app/guests/new";
    }
    if (workspace === "detail" && appRoute?.guestId) {
      const tab = String(appRoute?.guestProfileTab || "general").trim().toLowerCase();
      if (tab && tab !== "general" && GUEST_PROFILE_TABS.has(tab)) {
        return `/app/guests/${encodeURIComponent(String(appRoute.guestId).trim())}/${encodeURIComponent(tab)}`;
      }
      return `/app/guests/${encodeURIComponent(String(appRoute.guestId).trim())}`;
    }
    return "/app/guests";
  }
  if (view === "invitations") {
    if (workspace === "create") {
      return "/app/invitations/new";
    }
    return "/app/invitations";
  }
  return "/app";
}

function getCanonicalPathForRoute(route) {
  if (!route || typeof route !== "object") {
    return "/";
  }
  if (route.kind === "landing") {
    return LANDING_PATHS.has(route.path) ? route.path : "/";
  }
  if (route.kind === "login") {
    return "/login";
  }
  if (route.kind === "rsvp") {
    return route.token ? `/rsvp/${encodeURIComponent(route.token)}` : "/";
  }
  if (route.kind === "app") {
    return buildCanonicalAppPath(route.appRoute || { view: "overview" });
  }
  return "/";
}

function getRouteFromLocation() {
  const search = new URLSearchParams(window.location.search);
  const queryToken = String(search.get("token") || "").trim();
  if (queryToken) {
    return { kind: "rsvp", path: `/rsvp/${queryToken}`, token: queryToken };
  }

  const pathname = normalizePathname(window.location.pathname);
  if (pathname.startsWith("/rsvp/")) {
    const token = pathname.replace("/rsvp/", "").trim();
    return token ? { kind: "rsvp", path: pathname, token } : { kind: "landing", path: "/" };
  }
  if (pathname === "/login") {
    return { kind: "login", path: "/login" };
  }
  if (pathname === "/profile") {
    return { kind: "app", path: "/profile", appRoute: { view: "profile" } };
  }
  if (pathname === "/app" || pathname.startsWith("/app/")) {
    return { kind: "app", path: pathname, appRoute: parseAppRoute(pathname) };
  }
  if (LANDING_PATHS.has(pathname)) {
    return { kind: "landing", path: pathname };
  }
  return { kind: "landing", path: "/" };
}

function getHashSearchParams() {
  if (typeof window === "undefined") {
    return new URLSearchParams();
  }
  const hash = String(window.location.hash || "").replace(/^#/, "").trim();
  if (!hash) {
    return new URLSearchParams();
  }
  return new URLSearchParams(hash);
}

function isRecoveryRouteFromLocation() {
  const hashParams = getHashSearchParams();
  return String(hashParams.get("type") || "").toLowerCase() === "recovery";
}

function detectLanguage() {
  const stored = window.localStorage.getItem("legood-language");
  if (stored && I18N[stored]) {
    return stored;
  }
  const nav = (window.navigator.language || "es").slice(0, 2).toLowerCase();
  return I18N[nav] ? nav : "es";
}

function getThemeModeInitial() {
  const stored = window.localStorage.getItem("legood-theme-mode");
  if (stored === "light" || stored === "dark" || stored === "system") {
    return stored;
  }
  return "system";
}

function getSystemPrefersDark() {
  return window.matchMedia("(prefers-color-scheme: dark)").matches;
}

function resolveTheme(themeMode, systemPrefersDark) {
  if (themeMode === "system") {
    return systemPrefersDark ? "dark" : "light";
  }
  return themeMode;
}

function normalizeAuthErrorMessage(error, t) {
  const rawMessage = String(error?.message || "").trim();
  const normalized = rawMessage.toLowerCase();
  if (!normalized) {
    return t("auth_error_generic");
  }
  if (normalized.includes("anonymous sign-ins are disabled")) {
    return t("auth_error_anonymous_disabled");
  }
  if (normalized.includes("invalid login credentials")) {
    return t("auth_error_invalid_credentials");
  }
  if (normalized.includes("user already registered")) {
    return t("auth_error_user_exists");
  }
  if (normalized.includes("email not confirmed")) {
    return t("auth_error_email_not_confirmed");
  }
  if (normalized.includes("password should be at least")) {
    return t("auth_error_password_short");
  }
  if (normalized.includes("unable to validate email address")) {
    return t("auth_error_email_invalid");
  }
  return rawMessage;
}

function App() {
  const [route, setRoute] = useState(getRouteFromLocation);
  const [language, setLanguage] = useState(detectLanguage);
  const [themeMode, setThemeMode] = useState(getThemeModeInitial);
  const [systemPrefersDark, setSystemPrefersDark] = useState(getSystemPrefersDark);
  const [profilePrefsReady, setProfilePrefsReady] = useState(false);
  const [themeColumnSupported, setThemeColumnSupported] = useState(true);

  const [session, setSession] = useState(null);
  const [isLoadingAuth, setIsLoadingAuth] = useState(true);
  const [authError, setAuthError] = useState("");
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [isSigningIn, setIsSigningIn] = useState(false);
  const [isSigningUp, setIsSigningUp] = useState(false);
  const [isSigningInWithGoogle, setIsSigningInWithGoogle] = useState(false);
  const [isSendingPasswordReset, setIsSendingPasswordReset] = useState(false);
  const [accountMessage, setAccountMessage] = useState("");
  const [isRecoveryMode, setIsRecoveryMode] = useState(isRecoveryRouteFromLocation);
  const [resetPassword, setResetPassword] = useState("");
  const [resetPasswordConfirm, setResetPasswordConfirm] = useState("");
  const [isUpdatingPassword, setIsUpdatingPassword] = useState(false);

  const activeTheme = useMemo(() => resolveTheme(themeMode, systemPrefersDark), [themeMode, systemPrefersDark]);
  const t = useCallback(
    (key) => {
      const localized = I18N[language]?.[key];
      return localized || I18N.es[key] || key;
    },
    [language]
  );

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", activeTheme);
    document.documentElement.lang = language;
    window.localStorage.setItem("legood-theme-mode", themeMode);
    window.localStorage.setItem("legood-language", language);
  }, [activeTheme, language, themeMode]);

  useEffect(() => {
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const onChange = (event) => setSystemPrefersDark(event.matches);
    media.addEventListener("change", onChange);
    return () => media.removeEventListener("change", onChange);
  }, []);

  useEffect(() => {
    const onPopState = () => {
      setRoute(getRouteFromLocation());
      setIsRecoveryMode(isRecoveryRouteFromLocation());
    };
    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, []);

  const navigate = useCallback((nextPath, { replace = false } = {}) => {
    const normalizedPath = normalizePathname(nextPath || "/");
    const current = normalizePathname(window.location.pathname || "/");
    if (normalizedPath !== current) {
      if (replace) {
        window.history.replaceState({}, "", normalizedPath);
      } else {
        window.history.pushState({}, "", normalizedPath);
      }
    }
    setRoute(getRouteFromLocation());
  }, []);

  useEffect(() => {
    const canonicalPath = getCanonicalPathForRoute(route);
    const currentPath = normalizePathname(window.location.pathname || "/");
    if (!canonicalPath || canonicalPath === currentPath) {
      return;
    }
    navigate(canonicalPath, { replace: true });
  }, [navigate, route]);

  useEffect(() => {
    if (!supabase) {
      setIsLoadingAuth(false);
      return undefined;
    }

    let isMounted = true;
    const loadSession = async () => {
      const { data, error } = await supabase.auth.getSession();
      if (!isMounted) {
        return;
      }
      if (error) {
        setAuthError(normalizeAuthErrorMessage(error, t));
      } else {
        setSession(data.session);
      }
      setIsLoadingAuth(false);
    };
    loadSession();

    const { data } = supabase.auth.onAuthStateChange((event, nextSession) => {
      setSession(nextSession);
      setProfilePrefsReady(false);
      setIsSigningInWithGoogle(false);
      if (event === "PASSWORD_RECOVERY") {
        setIsRecoveryMode(true);
        navigate("/login", { replace: true });
      }
      if (event === "SIGNED_OUT") {
        setIsRecoveryMode(false);
      }
    });

    return () => {
      isMounted = false;
      data.subscription.unsubscribe();
    };
  }, [navigate, t]);

  useEffect(() => {
    if (!isRecoveryRouteFromLocation()) {
      return;
    }
    setIsRecoveryMode(true);
    if (route.kind !== "login") {
      navigate("/login", { replace: true });
    }
  }, [navigate, route.kind]);

  useEffect(() => {
    if (!supabase || !session?.user?.id) {
      return;
    }
    let isCancelled = false;

    const loadProfilePreferences = async () => {
      const { data, error } = await supabase.from("profiles").select("*").eq("id", session.user.id).maybeSingle();

      if (isCancelled) {
        return;
      }

      if (error) {
        setProfilePrefsReady(true);
        return;
      }

      if (data?.preferred_language && I18N[data.preferred_language]) {
        setLanguage(data.preferred_language);
      }

      if (data && Object.prototype.hasOwnProperty.call(data, "preferred_theme")) {
        if (typeof data.preferred_theme === "string" && ["light", "dark", "system"].includes(data.preferred_theme)) {
          setThemeMode(data.preferred_theme);
        }
      } else if (data) {
        setThemeColumnSupported(false);
      }

      setProfilePrefsReady(true);
    };

    loadProfilePreferences();
    return () => {
      isCancelled = true;
    };
  }, [session?.user?.id]);

  useEffect(() => {
    if (!supabase || !session?.user?.id || !profilePrefsReady) {
      return;
    }

    const timer = window.setTimeout(async () => {
      const basePayload = {
        id: session.user.id,
        preferred_language: language
      };
      const payload = themeColumnSupported
        ? {
            ...basePayload,
            preferred_theme: themeMode
          }
        : basePayload;

      const { error } = await supabase.from("profiles").upsert(payload, { onConflict: "id" });

      if (
        error &&
        themeColumnSupported &&
        (error.message?.toLowerCase().includes("preferred_theme") || error.code === "42703")
      ) {
        setThemeColumnSupported(false);
        await supabase.from("profiles").upsert(basePayload, { onConflict: "id" });
      }
    }, 500);

    return () => window.clearTimeout(timer);
  }, [language, themeMode, profilePrefsReady, session?.user?.id, themeColumnSupported]);

  const handleSignIn = async (event) => {
    event.preventDefault();
    if (!supabase) {
      return;
    }
    setAuthError("");
    setAccountMessage("");
    const email = loginEmail.trim();
    if (!email) {
      setAuthError(t("auth_error_email_required"));
      return;
    }
    if (!loginPassword) {
      setAuthError(t("auth_error_password_required"));
      return;
    }
    setIsSigningIn(true);
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password: loginPassword
    });
    setIsSigningIn(false);
    if (error) {
      setAuthError(normalizeAuthErrorMessage(error, t));
      return;
    }
    setLoginPassword("");
    navigate("/app", { replace: true });
  };

  const handleSignUp = async () => {
    if (!supabase) {
      return;
    }
    setAuthError("");
    setAccountMessage("");
    const email = loginEmail.trim();
    if (!email) {
      setAuthError(t("auth_error_email_required"));
      return;
    }
    if (!loginPassword) {
      setAuthError(t("auth_error_password_required"));
      return;
    }
    if (loginPassword.length < 6) {
      setAuthError(t("auth_error_password_short"));
      return;
    }
    setIsSigningUp(true);
    const { error } = await supabase.auth.signUp({
      email,
      password: loginPassword,
      options: { data: { full_name: email.split("@")[0] } }
    });
    setIsSigningUp(false);
    if (error) {
      setAuthError(normalizeAuthErrorMessage(error, t));
      return;
    }
    setAccountMessage(t("account_created"));
  };

  const handleForgotPassword = async () => {
    if (!supabase) {
      return;
    }
    setAuthError("");
    setAccountMessage("");
    const email = loginEmail.trim();
    if (!email) {
      setAuthError(t("auth_error_email_required"));
      return;
    }
    setIsSendingPasswordReset(true);
    const redirectTo = getAuthRedirectUrl("/login");
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo
    });
    setIsSendingPasswordReset(false);
    if (error) {
      setAuthError(normalizeAuthErrorMessage(error, t));
      return;
    }
    setAccountMessage(t("auth_reset_password_sent"));
  };

  const handleUpdatePassword = async (event) => {
    event.preventDefault();
    if (!supabase) {
      return;
    }
    setAuthError("");
    setAccountMessage("");
    const password = resetPassword.trim();
    const confirmPassword = resetPasswordConfirm.trim();
    if (!password) {
      setAuthError(t("auth_error_password_required"));
      return;
    }
    if (password.length < 6) {
      setAuthError(t("auth_error_password_short"));
      return;
    }
    if (password !== confirmPassword) {
      setAuthError(t("auth_error_password_mismatch"));
      return;
    }
    setIsUpdatingPassword(true);
    const { error } = await supabase.auth.updateUser({ password });
    setIsUpdatingPassword(false);
    if (error) {
      setAuthError(normalizeAuthErrorMessage(error, t));
      return;
    }
    setResetPassword("");
    setResetPasswordConfirm("");
    setIsRecoveryMode(false);
    setAccountMessage(t("auth_password_updated"));
    navigate("/app", { replace: true });
  };

  const handleGoogleSignIn = async () => {
    if (!supabase) {
      return;
    }
    setAuthError("");
    setAccountMessage("");
    setIsSigningInWithGoogle(true);
    const redirectTo = getAuthRedirectUrl("/login");
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo }
    });
    if (error) {
      setAuthError(`${t("google_auth_error")} ${normalizeAuthErrorMessage(error, t)}`);
      setIsSigningInWithGoogle(false);
      return;
    }
  };

  const handleSignOut = async () => {
    if (!supabase) {
      return;
    }
    setAuthError("");
    await supabase.auth.signOut();
    navigate("/login", { replace: true });
  };

  useEffect(() => {
    if (route.kind !== "app" || session?.user?.id) {
      return;
    }
    navigate("/login", { replace: true });
  }, [navigate, route.kind, session?.user?.id]);

  useEffect(() => {
    if (!session?.user?.id || route.kind !== "login" || isRecoveryMode) {
      return;
    }
    navigate("/app", { replace: true });
  }, [isRecoveryMode, navigate, route.kind, session?.user?.id]);

  if (!hasSupabaseEnv && route.kind !== "landing") {
    return (
      <main className="page">
        <section className="card app-card">
          <header className="app-header">
            <div className="brand-header">
              <BrandMark text={t("app_name")} fallback={t("logo_fallback")} />
              <div>
                <p className="eyebrow">{t("setup_pending")}</p>
                <h1>{t("setup_missing_supabase")}</h1>
              </div>
            </div>
            <Controls
              themeMode={themeMode}
              setThemeMode={setThemeMode}
              language={language}
              setLanguage={setLanguage}
              t={t}
            />
          </header>
          <p>{t("setup_hint")}</p>
        </section>
      </main>
    );
  }

  if (route.kind === "rsvp" && route.token) {
    return (
      <PublicRsvpScreen
        token={route.token}
        language={language}
        setLanguage={setLanguage}
        themeMode={themeMode}
        setThemeMode={setThemeMode}
        t={t}
      />
    );
  }

  if (route.kind === "landing") {
    return (
      <LandingScreen
        t={t}
        language={language}
        setLanguage={setLanguage}
        themeMode={themeMode}
        setThemeMode={setThemeMode}
        currentPath={route.path}
        session={session}
        onNavigate={navigate}
        onGoLogin={() => navigate("/login")}
        onGoApp={() => navigate("/app")}
      />
    );
  }

  if (route.kind === "login" && isRecoveryMode) {
    return (
      <AuthScreen
        t={t}
        language={language}
        setLanguage={setLanguage}
        themeMode={themeMode}
        setThemeMode={setThemeMode}
        isLoadingAuth={isLoadingAuth}
        authError={authError}
        accountMessage={accountMessage}
        loginEmail={loginEmail}
        setLoginEmail={setLoginEmail}
        loginPassword={loginPassword}
        setLoginPassword={setLoginPassword}
        isSigningIn={isSigningIn}
        isSigningUp={isSigningUp}
        isSigningInWithGoogle={isSigningInWithGoogle}
        isSendingPasswordReset={isSendingPasswordReset}
        isRecoveryMode={isRecoveryMode}
        resetPassword={resetPassword}
        setResetPassword={setResetPassword}
        resetPasswordConfirm={resetPasswordConfirm}
        setResetPasswordConfirm={setResetPasswordConfirm}
        isUpdatingPassword={isUpdatingPassword}
        onUpdatePassword={handleUpdatePassword}
        onExitRecovery={() => {
          setIsRecoveryMode(false);
          navigate("/login", { replace: true });
        }}
        onSignIn={handleSignIn}
        onSignUp={handleSignUp}
        onForgotPassword={handleForgotPassword}
        onGoogleSignIn={handleGoogleSignIn}
        onBackToLanding={() => navigate("/")}
      />
    );
  }

  if (!session?.user?.id) {
    return (
      <AuthScreen
        t={t}
        language={language}
        setLanguage={setLanguage}
        themeMode={themeMode}
        setThemeMode={setThemeMode}
        isLoadingAuth={isLoadingAuth}
        authError={authError}
        accountMessage={accountMessage}
        loginEmail={loginEmail}
        setLoginEmail={setLoginEmail}
        loginPassword={loginPassword}
        setLoginPassword={setLoginPassword}
        isSigningIn={isSigningIn}
        isSigningUp={isSigningUp}
        isSigningInWithGoogle={isSigningInWithGoogle}
        isSendingPasswordReset={isSendingPasswordReset}
        isRecoveryMode={isRecoveryMode}
        resetPassword={resetPassword}
        setResetPassword={setResetPassword}
        resetPasswordConfirm={resetPasswordConfirm}
        setResetPasswordConfirm={setResetPasswordConfirm}
        isUpdatingPassword={isUpdatingPassword}
        onUpdatePassword={handleUpdatePassword}
        onExitRecovery={() => {
          setIsRecoveryMode(false);
          navigate("/login", { replace: true });
        }}
        onSignIn={handleSignIn}
        onSignUp={handleSignUp}
        onForgotPassword={handleForgotPassword}
        onGoogleSignIn={handleGoogleSignIn}
        onBackToLanding={() => navigate("/")}
      />
    );
  }

  return (
    <DashboardScreen
      t={t}
      language={language}
      setLanguage={setLanguage}
      themeMode={themeMode}
      setThemeMode={setThemeMode}
      session={session}
      onSignOut={handleSignOut}
      appRoute={route.appRoute || null}
      appPath={route.path || "/app"}
      onNavigateApp={navigate}
    />
  );
}

export default App;
