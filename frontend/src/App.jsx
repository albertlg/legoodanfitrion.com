import { Suspense, lazy, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { BrandMark } from "./components/brand-mark";
import { Controls } from "./components/controls";
import es from "./i18n/es.json";
import { getAuthRedirectUrl } from "./lib/app-url";
import { hasSupabaseEnv, supabase } from "./lib/supabaseClient";
import { useAppRouter, getCanonicalPathForRoute } from "./router-utils";
import { LegalScreen } from "./screens/legal-screen";

const DEFAULT_LANGUAGE = "es";
const SUPPORTED_LANGUAGES = ["es", "ca", "en", "fr", "it"];
const LOCALE_LOADERS = {
  ca: () => import("./i18n/ca.json"),
  en: () => import("./i18n/en.json"),
  fr: () => import("./i18n/fr.json"),
  it: () => import("./i18n/it.json")
};
const AuthScreen = lazy(() =>
  import("./screens/auth-screen").then((module) => ({ default: module.AuthScreen }))
);
const LandingScreen = lazy(() =>
  import("./screens/landing-screen").then((module) => ({ default: module.LandingScreen }))
);
const DashboardScreen = lazy(() =>
  import("./screens/dashboard-screen").then((module) => ({ default: module.DashboardScreen }))
);
const PublicRsvpScreen = lazy(() =>
  import("./screens/public-rsvp-screen").then((module) => ({ default: module.PublicRsvpScreen }))
);

// --- NUEVAS PANTALLAS DEL BLOG ---
const BlogIndexScreen = lazy(() => import("./screens/blog-index-screen").then((m) => ({ default: m.BlogIndexScreen })));
const BlogPostScreen = lazy(() => import("./screens/blog-post-screen").then((m) => ({ default: m.BlogPostScreen })));
const AboutScreen = lazy(() => import("./screens/about-screen").then((m) => ({ default: m.AboutScreen })));
const AdminDashboardScreen = lazy(() => import("./screens/admin-dashboard-screen").then((m) => ({ default: m.AdminDashboardScreen })));
const ExploreScreen = lazy(() => import("./screens/explore-screen").then((m) => ({ default: m.ExploreScreen })));
const UseCasesScreen = lazy(() => import("./screens/use-cases-screen").then((m) => ({ default: m.UseCasesScreen })));
const UseCaseDetailScreen = lazy(() => import("./screens/use-cases-detail-screen").then((m) => ({ default: m.UseCaseDetailScreen })));

function ScreenFallback() {
  return (
    <main className="page">
      <section className="card app-card">
        <p className="hint">Cargando...</p>
      </section>
    </main>
  );
}

// 🚀 SEO: Nueva detección de idioma inteligente
function detectLanguage(urlLang, originalPath) {
  // 1. Si la URL tiene un idioma explícito en la carpeta (ej: /ca/preus) manda la URL
  const hasExplicitUrlLang = originalPath.match(new RegExp(`^/${urlLang}(/|$)`));
  if (hasExplicitUrlLang) {
    return urlLang;
  }

  // 2. Si no hay idioma explícito (ej: rutas privadas como /app, o la raíz /), usamos las preferencias
  const stored = window.localStorage.getItem("legood-language");
  if (stored && SUPPORTED_LANGUAGES.includes(stored)) {
    return stored;
  }
  const nav = (window.navigator.language || DEFAULT_LANGUAGE).slice(0, 2).toLowerCase();
  return SUPPORTED_LANGUAGES.includes(nav) ? nav : DEFAULT_LANGUAGE;
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

function getSessionPreferences(sessionUser) {
  const rawPrefs = sessionUser?.user_metadata?.preferences;
  if (!rawPrefs || typeof rawPrefs !== "object") {
    return { locale: "", theme: "" };
  }
  return {
    locale: String(rawPrefs.locale || "").trim().toLowerCase(),
    theme: String(rawPrefs.theme || "").trim().toLowerCase()
  };
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
  const { route, navigate, isRecoveryMode: initialRecoveryMode } = useAppRouter();

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }
    if (window.location.hash) {
      return;
    }
    window.scrollTo(0, 0);
  }, [route.originalPath]);

  // 🚀 SEO 1: Inicializamos el idioma pasándole lo que ha detectado el router
  const [language, setLanguage] = useState(() => {
    if (route.kind === "rsvp") {
      const nav = (window.navigator.language || DEFAULT_LANGUAGE).slice(0, 2).toLowerCase();
      return SUPPORTED_LANGUAGES.includes(nav) ? nav : DEFAULT_LANGUAGE;
    }
    return detectLanguage(route.urlLang, route.originalPath);
  });

  const [loadedLocales, setLoadedLocales] = useState(() => ({ [DEFAULT_LANGUAGE]: es }));
  const [themeMode, setThemeMode] = useState(getThemeModeInitial);
  const [systemPrefersDark, setSystemPrefersDark] = useState(getSystemPrefersDark);
  const [themeColumnSupported, setThemeColumnSupported] = useState(true);
  const [profilePrefsHydrated, setProfilePrefsHydrated] = useState(false);

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
  const [isRecoveryMode, setIsRecoveryMode] = useState(initialRecoveryMode);
  const [resetPassword, setResetPassword] = useState("");
  const [resetPasswordConfirm, setResetPasswordConfirm] = useState("");
  const [isUpdatingPassword, setIsUpdatingPassword] = useState(false);
  const [isCheckingAdminAuthorization, setIsCheckingAdminAuthorization] = useState(false);
  const [isAdminAuthorized, setIsAdminAuthorized] = useState(false);
  const hasManualLanguageSelectionRef = useRef(false);

  const activeTheme = useMemo(() => resolveTheme(themeMode, systemPrefersDark), [themeMode, systemPrefersDark]);

  // 🚀 SEO: Sincronización maestra. La URL es la única jefa en rutas públicas.
  // OJO: este efecto debe reaccionar SOLO a cambios de URL (route.urlLang),
  // nunca a cambios del state `language`. Si incluimos `language` en las deps,
  // durante handleLanguageChange se produce una race entre setLanguage(nuevo)
  // y navigate(nuevaURL) que puede resetear el idioma al valor anterior.
  useEffect(() => {
    if (route.kind !== "app" && route.kind !== "login" && route.kind !== "rsvp") {
      if (language !== route.urlLang) {
        setLanguage(route.urlLang);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [route.urlLang, route.kind]);

  const syncLanguagePreference = useCallback(
    async (nextLanguage) => {
      if (!supabase || !session?.user?.id) {
        return;
      }
      const normalizedLanguage = String(nextLanguage || "").trim().toLowerCase();
      if (!SUPPORTED_LANGUAGES.includes(normalizedLanguage)) {
        return;
      }

      const basePayload = {
        id: session.user.id,
        preferred_language: normalizedLanguage
      };
      const profilePayload = themeColumnSupported
        ? {
            ...basePayload,
            preferred_theme: themeMode
          }
        : basePayload;

      const { error: profileError } = await supabase.from("profiles").upsert(profilePayload, { onConflict: "id" });
      if (
        profileError &&
        themeColumnSupported &&
        (profileError.message?.toLowerCase().includes("preferred_theme") || profileError.code === "42703")
      ) {
        setThemeColumnSupported(false);
        await supabase.from("profiles").upsert(basePayload, { onConflict: "id" });
      }

      const currentPrefs =
        session.user?.user_metadata?.preferences && typeof session.user.user_metadata.preferences === "object"
          ? session.user.user_metadata.preferences
          : {};
      const nextPreferences = {
        ...currentPrefs,
        locale: normalizedLanguage,
        theme: themeMode
      };
      const { error: metadataError } = await supabase.auth.updateUser({
        data: {
          preferences: nextPreferences
        }
      });
      if (metadataError) {
        console.warn("[language-sync] No se pudo sincronizar locale en user_metadata:", metadataError.message);
      }
    },
    [session?.user?.id, session?.user?.user_metadata?.preferences, themeColumnSupported, themeMode]
  );

  // 🚀 SEO + UX: cambio manual siempre gana y sincroniza contra Supabase si hay sesión
  const handleLanguageChange = useCallback((newLang) => {
    const normalizedLanguage = String(newLang || "").trim().toLowerCase();
    if (!SUPPORTED_LANGUAGES.includes(normalizedLanguage)) {
      return;
    }

    hasManualLanguageSelectionRef.current = true;
    window.localStorage.setItem("legood-language", normalizedLanguage);
    setLanguage(normalizedLanguage);

    if (route.kind !== "app" && route.kind !== "login" && route.kind !== "rsvp") {
      const newCanonicalPath = getCanonicalPathForRoute(route, normalizedLanguage);
      navigate(newCanonicalPath, { replace: true });
    }

    void syncLanguagePreference(normalizedLanguage);
  }, [route, navigate, syncLanguagePreference]);

  useEffect(() => {
    if (loadedLocales[language] || !LOCALE_LOADERS[language]) {
      return;
    }
    let isCancelled = false;
    LOCALE_LOADERS[language]()
      .then((module) => {
        if (isCancelled) {
          return;
        }
        const localeData = module?.default || module;
        if (!localeData) {
          return;
        }
        setLoadedLocales((prev) => ({
          ...prev,
          [language]: localeData
        }));
      })
      .catch(() => undefined);
    return () => {
      isCancelled = true;
    };
  }, [language, loadedLocales]);
  const t = useCallback(
    (key) => {
      const localized = loadedLocales[language]?.[key];
      return localized || es[key] || key;
    },
    [language, loadedLocales]
  );

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", activeTheme);
    document.documentElement.classList.toggle("dark", activeTheme === "dark");
    document.documentElement.lang = language;
    window.localStorage.setItem("legood-theme-mode", themeMode);
    window.localStorage.setItem("legood-language", language);
  }, [activeTheme, language, themeMode]);

  useEffect(() => {
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const onChange = (event) => setSystemPrefersDark(event.matches);
    if (typeof media.addEventListener === "function") {
      media.addEventListener("change", onChange);
      return () => media.removeEventListener("change", onChange);
    }
    media.addListener(onChange);
    return () => media.removeListener(onChange);
  }, []);

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
        const sessionPrefs = getSessionPreferences(data.session?.user);
        if (!hasManualLanguageSelectionRef.current && sessionPrefs.locale && SUPPORTED_LANGUAGES.includes(sessionPrefs.locale)) {
          setLanguage(sessionPrefs.locale);
        }
        if (sessionPrefs.theme && ["light", "dark", "system"].includes(sessionPrefs.theme)) {
          setThemeMode(sessionPrefs.theme);
        }
      }
      setIsLoadingAuth(false);
    };
    loadSession();

    const { data } = supabase.auth.onAuthStateChange((event, nextSession) => {
      setSession(nextSession);
      setIsSigningInWithGoogle(false);
      const sessionPrefs = getSessionPreferences(nextSession?.user);
      const shouldHydrateLocaleFromSession = event === "SIGNED_IN" || event === "USER_UPDATED";
      if (
        shouldHydrateLocaleFromSession &&
        !hasManualLanguageSelectionRef.current &&
        sessionPrefs.locale &&
        SUPPORTED_LANGUAGES.includes(sessionPrefs.locale)
      ) {
        setLanguage(sessionPrefs.locale);
      }
      if (sessionPrefs.theme && ["light", "dark", "system"].includes(sessionPrefs.theme)) {
        setThemeMode(sessionPrefs.theme);
      }
      if (event === "PASSWORD_RECOVERY") {
        setIsRecoveryMode(true);
        navigate("/login", { replace: true });
      }
      if (event === "SIGNED_OUT") {
        setIsRecoveryMode(false);
        setProfilePrefsHydrated(false);
        hasManualLanguageSelectionRef.current = false;
      }
      // PLG: si el usuario hace login (o confirma email) y aún tiene dietary needs
      // pendientes del RSVP, inyectarlos en su metadata para pre-poblar el perfil
      if (event === "SIGNED_IN" && nextSession?.user?.id) {
        try {
          const rawDiet = sessionStorage.getItem("lga_temp_diet");
          if (rawDiet) {
            const parsed = JSON.parse(rawDiet);
            if (Array.isArray(parsed) && parsed.length > 0) {
              const existingDiet = nextSession.user.user_metadata?.rsvp_dietary_needs;
              if (!existingDiet || existingDiet.length === 0) {
                supabase.auth.updateUser({ data: { rsvp_dietary_needs: parsed } });
              }
              sessionStorage.removeItem("lga_temp_diet");
              sessionStorage.removeItem("lga_temp_name");
            }
          }
        } catch {
          void 0;
        }
      }
    });

    return () => {
      isMounted = false;
      data.subscription.unsubscribe();
    };
  }, [navigate, t]);

  useEffect(() => {
    if (!initialRecoveryMode) return;
    setIsRecoveryMode(true);
    if (route.kind !== "login") {
      navigate("/login", { replace: true });
    }
  }, [navigate, route.kind, initialRecoveryMode]);

  useEffect(() => {
    if (!supabase || !session?.user?.id) {
      setProfilePrefsHydrated(false);
      return;
    }
    let isCancelled = false;

    const loadProfilePreferences = async () => {
      const sessionPrefs = getSessionPreferences(session.user);
      const hasMetadataLocale = sessionPrefs.locale && SUPPORTED_LANGUAGES.includes(sessionPrefs.locale);
      const hasMetadataTheme = sessionPrefs.theme && ["light", "dark", "system"].includes(sessionPrefs.theme);

      // Manual language choice always wins over background session/profile hydration.
      if (hasMetadataLocale && !hasManualLanguageSelectionRef.current) {
        setLanguage(sessionPrefs.locale);
      }
      if (hasMetadataTheme) {
        setThemeMode(sessionPrefs.theme);
      }

      const { data, error } = await supabase.from("profiles").select("*").eq("id", session.user.id).maybeSingle();

      if (isCancelled) {
        return;
      }

      if (error) {
        setProfilePrefsHydrated(true);
        return;
      }

      if (!hasMetadataLocale && data?.preferred_language && SUPPORTED_LANGUAGES.includes(data.preferred_language)) {
        if (hasManualLanguageSelectionRef.current) {
          setProfilePrefsHydrated(true);
          return;
        }
        setLanguage(data.preferred_language);
      }

      if (!hasMetadataTheme && data && Object.prototype.hasOwnProperty.call(data, "preferred_theme")) {
        if (typeof data.preferred_theme === "string" && ["light", "dark", "system"].includes(data.preferred_theme)) {
          setThemeMode(data.preferred_theme);
        }
      } else if (data) {
        setThemeColumnSupported(false);
      }

      setProfilePrefsHydrated(true);
    };

    loadProfilePreferences();
    return () => {
      isCancelled = true;
    };
  }, [session?.user, session?.user?.id, session?.user?.user_metadata?.preferences?.locale, session?.user?.user_metadata?.preferences?.theme]);

  // 🚀 FIX: Auto-guardado de preferencias (Idioma/Tema)
  useEffect(() => {
    // Si no hay sesión, ni lo intentamos.
    if (!supabase || !session?.user?.id || !profilePrefsHydrated) {
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

      // Hacemos el UPSERT directamente. Si la fila no existe (usuario recién registrado), 
      // esto la creará con su idioma. Si existe, la actualizará.
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
  }, [language, themeMode, session?.user?.id, themeColumnSupported, profilePrefsHydrated]);

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
    // PLG: capturar datos del RSVP para pre-poblar el perfil
    const tempName = sessionStorage.getItem("lga_temp_name") || "";
    const signupMetadata = { full_name: tempName || email.split("@")[0] };
    try {
      const rawDiet = sessionStorage.getItem("lga_temp_diet");
      if (rawDiet) {
        const parsed = JSON.parse(rawDiet);
        if (Array.isArray(parsed) && parsed.length > 0) {
          signupMetadata.rsvp_dietary_needs = parsed;
        }
      }
    } catch {
      void 0;
    }
    const { error } = await supabase.auth.signUp({
      email,
      password: loginPassword,
      options: { data: signupMetadata }
    });
    setIsSigningUp(false);
    if (error) {
      setAuthError(normalizeAuthErrorMessage(error, t));
      return;
    }
    // PLG: limpiar datos temporales tras signup exitoso
    try {
      sessionStorage.removeItem("lga_temp_diet");
      sessionStorage.removeItem("lga_temp_name");
    } catch {
      void 0;
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
    if (isLoadingAuth) {
      return;
    }
    if (route.kind !== "app" || session?.user?.id) {
      return;
    }
    navigate("/login", { replace: true });
  }, [isLoadingAuth, navigate, route.kind, session?.user?.id]);

  useEffect(() => {
    if (isLoadingAuth) {
      return;
    }
    if (!session?.user?.id || route.kind !== "login" || isRecoveryMode) {
      return;
    }
    navigate("/app", { replace: true });
  }, [isLoadingAuth, isRecoveryMode, navigate, route.kind, session?.user?.id]);

  // Admin route guard: validated via Supabase RPC (no email list in frontend)
  useEffect(() => {
    if (route.kind !== "admin") {
      setIsCheckingAdminAuthorization(false);
      return;
    }
    if (isLoadingAuth) return;
    if (!supabase || !session?.user?.id) {
      setIsAdminAuthorized(false);
      setIsCheckingAdminAuthorization(false);
      navigate("/login", { replace: true });
      return;
    }

    let isCancelled = false;
    setIsCheckingAdminAuthorization(true);

    const checkAdminAccess = async () => {
      const { data, error } = await supabase.rpc("is_lga_admin");
      if (isCancelled) return;
      const authorized = !error && data === true;
      setIsAdminAuthorized(authorized);
      setIsCheckingAdminAuthorization(false);
      if (!authorized) {
        navigate("/", { replace: true });
      }
    };

    checkAdminAccess();
    return () => {
      isCancelled = true;
    };
  }, [isLoadingAuth, navigate, route.kind, session?.user?.id]);

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
              setLanguage={handleLanguageChange}
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
      <Suspense fallback={<ScreenFallback />}>
        <PublicRsvpScreen
          token={route.token}
          language={language}
          setLanguage={handleLanguageChange}
          themeMode={themeMode}
          setThemeMode={setThemeMode}
          t={t}
        />
      </Suspense>
    );
  }

  if (route.kind === "admin") {
    if (isLoadingAuth || isCheckingAdminAuthorization) return <ScreenFallback />;
    if (!isAdminAuthorized) {
      return <ScreenFallback />;
    }
    return (
      <Suspense fallback={<ScreenFallback />}>
        <AdminDashboardScreen session={session} t={t} onNavigate={navigate} />
      </Suspense>
    );
  }

  if (route.kind === "landing" && route.path.startsWith("/use-cases/")) {
    const ucKey = route.path.slice("/use-cases/".length);
    const validUcKeys = new Set(["personal", "gastro", "penas", "wellness", "corporate", "life", "despedidas", "expat"]);
    if (validUcKeys.has(ucKey)) {
      return (
        <Suspense fallback={<ScreenFallback />}>
          <UseCaseDetailScreen
            ucKey={ucKey}
            t={t}
            language={language}
            setLanguage={handleLanguageChange}
            themeMode={themeMode}
            setThemeMode={setThemeMode}
            onNavigate={navigate}
          />
        </Suspense>
      );
    }
  }

  if (route.kind === "landing" && route.path === "/use-cases") {
    return (
      <Suspense fallback={<ScreenFallback />}>
        <UseCasesScreen
          t={t}
          language={language}
          setLanguage={handleLanguageChange}
          themeMode={themeMode}
          setThemeMode={setThemeMode}
          onNavigate={navigate}
        />
      </Suspense>
    );
  }

  if (route.kind === "landing" && route.path === "/explore") {
    return (
      <Suspense fallback={<ScreenFallback />}>
        <ExploreScreen
          t={t}
          language={language}
          setLanguage={handleLanguageChange}
          themeMode={themeMode}
          setThemeMode={setThemeMode}
          onNavigate={navigate}
        />
      </Suspense>
    );
  }

  if (route.kind === "landing" && route.path === "/about") {
    return (
      <Suspense fallback={<ScreenFallback />}>
        <AboutScreen
          t={t}
          language={language}
          setLanguage={handleLanguageChange}
          themeMode={themeMode}
          setThemeMode={setThemeMode}
          onNavigate={navigate}
        />
      </Suspense>
    );
  }

  if (route.kind === "landing") {
    return (
      <Suspense fallback={<ScreenFallback />}>
        <LandingScreen
          t={t}
          language={language}
          setLanguage={handleLanguageChange}
          themeMode={themeMode}
          setThemeMode={setThemeMode}
          currentPath={route.path}
          session={session}
          onNavigate={navigate}
          onGoLogin={() => navigate("/login")}
          onGoApp={() => navigate("/app")}
        />
      </Suspense>
    );
  }

  // 🚀 AQUI INYECTAMOS EL ROUTER DEL BLOG (PÚBLICO)
  const isBlogRoute = route.path?.startsWith("/blog");
  const isBlogPost = isBlogRoute && route.path.length > 6; // Verifica si hay algo después de /blog/
  const blogSlug = isBlogPost ? route.path.split("/")[2] : null;

  if (isBlogRoute) {
    return (
      <Suspense fallback={<ScreenFallback />}>
        {isBlogPost ? (
          <BlogPostScreen
            slug={blogSlug} language={language} setLanguage={handleLanguageChange}
            themeMode={themeMode} setThemeMode={setThemeMode} t={t} onNavigate={navigate}
            session={session}
          />
        ) : (
          <BlogIndexScreen
            language={language} setLanguage={handleLanguageChange}
            themeMode={themeMode} setThemeMode={setThemeMode} t={t} onNavigate={navigate}
            session={session}
          />
        )}
      </Suspense>
    );
  }

  if (route.kind === "privacy") {
    return <LegalScreen type="privacy" t={t} language={language} onNavigate={navigate} />;
  }
  if (route.kind === "terms") {
    return <LegalScreen type="terms" t={t} language={language} onNavigate={navigate} />;
  }

  if (route.kind === "login" && isRecoveryMode) {
    return (
      <Suspense fallback={<ScreenFallback />}>
        <AuthScreen
          t={t}
          language={language}
          setLanguage={handleLanguageChange}
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
      </Suspense>
    );
  }

  if (isLoadingAuth && route.kind === "app") {
    return <ScreenFallback />;
  }

  if (!session?.user?.id) {
    return (
      <Suspense fallback={<ScreenFallback />}>
        <AuthScreen
          t={t}
          language={language}
          setLanguage={handleLanguageChange}
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
      </Suspense>
    );
  }

  return (
    <Suspense fallback={<ScreenFallback />}>
      <DashboardScreen
        t={t}
        language={language}
        setLanguage={handleLanguageChange}
        themeMode={themeMode}
        setThemeMode={setThemeMode}
        session={session}
        onSignOut={handleSignOut}
        appRoute={route.appRoute || null}
        appPath={route.path || "/app"}
        onNavigateApp={navigate}
      />
    </Suspense>
  );
}

export default App;
