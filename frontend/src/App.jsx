import { Suspense, lazy, useCallback, useEffect, useMemo, useState } from "react";
import { BrandMark } from "./components/brand-mark";
import { Controls } from "./components/controls";
import ca from "./i18n/ca.json";
import en from "./i18n/en.json";
import es from "./i18n/es.json";
import fr from "./i18n/fr.json";
import it from "./i18n/it.json";
import { getAuthRedirectUrl } from "./lib/app-url";
import { hasSupabaseEnv, supabase } from "./lib/supabaseClient";
import { useAppRouter } from "./router-utils";

const I18N = { es, ca, en, fr, it };
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

function ScreenFallback() {
  return (
    <main className="page">
      <section className="card app-card">
        <p className="hint">Cargando...</p>
      </section>
    </main>
  );
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
  const { route, navigate, isRecoveryMode: initialRecoveryMode } = useAppRouter();
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
  const [isRecoveryMode, setIsRecoveryMode] = useState(initialRecoveryMode);
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
    if (!initialRecoveryMode) return;
    setIsRecoveryMode(true);
    if (route.kind !== "login") {
      navigate("/login", { replace: true });
    }
  }, [navigate, route.kind, initialRecoveryMode]);

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
      <Suspense fallback={<ScreenFallback />}>
        <PublicRsvpScreen
          token={route.token}
          language={language}
          setLanguage={setLanguage}
          themeMode={themeMode}
          setThemeMode={setThemeMode}
          t={t}
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
          setLanguage={setLanguage}
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

  if (route.kind === "login" && isRecoveryMode) {
    return (
      <Suspense fallback={<ScreenFallback />}>
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
      </Suspense>
    );
  }

  if (!session?.user?.id) {
    return (
      <Suspense fallback={<ScreenFallback />}>
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
      </Suspense>
    );
  }

  return (
    <Suspense fallback={<ScreenFallback />}>
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
    </Suspense>
  );
}

export default App;
