import { useCallback, useEffect, useMemo, useState } from "react";
import { BrandMark } from "./components/brand-mark";
import { Controls } from "./components/controls";
import ca from "./i18n/ca.json";
import en from "./i18n/en.json";
import es from "./i18n/es.json";
import fr from "./i18n/fr.json";
import { hasSupabaseEnv, supabase } from "./lib/supabaseClient";
import { AuthScreen } from "./screens/auth-screen";
import { DashboardScreen } from "./screens/dashboard-screen";
import { PublicRsvpScreen } from "./screens/public-rsvp-screen";

const I18N = { es, ca, en, fr };

function getTokenFromLocation() {
  const search = new URLSearchParams(window.location.search);
  const queryToken = search.get("token");
  if (queryToken?.trim()) {
    return queryToken.trim();
  }
  if (window.location.pathname.startsWith("/rsvp/")) {
    return window.location.pathname.replace("/rsvp/", "").trim();
  }
  return "";
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

function App() {
  const [token, setToken] = useState(getTokenFromLocation);
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
  const [accountMessage, setAccountMessage] = useState("");

  const activeTheme = useMemo(() => resolveTheme(themeMode, systemPrefersDark), [themeMode, systemPrefersDark]);
  const t = useCallback((key) => I18N[language]?.[key] || I18N.es[key] || key, [language]);

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
    const onPopState = () => setToken(getTokenFromLocation());
    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
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
        setAuthError(error.message);
      } else {
        setSession(data.session);
      }
      setIsLoadingAuth(false);
    };
    loadSession();

    const { data } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
      setProfilePrefsReady(false);
      setIsSigningInWithGoogle(false);
    });

    return () => {
      isMounted = false;
      data.subscription.unsubscribe();
    };
  }, []);

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
    setIsSigningIn(true);
    const { error } = await supabase.auth.signInWithPassword({
      email: loginEmail.trim(),
      password: loginPassword
    });
    setIsSigningIn(false);
    if (error) {
      setAuthError(error.message);
      return;
    }
    setLoginPassword("");
  };

  const handleSignUp = async () => {
    if (!supabase) {
      return;
    }
    setAuthError("");
    setAccountMessage("");
    setIsSigningUp(true);
    const email = loginEmail.trim();
    const { error } = await supabase.auth.signUp({
      email,
      password: loginPassword,
      options: { data: { full_name: email.split("@")[0] } }
    });
    setIsSigningUp(false);
    if (error) {
      setAuthError(error.message);
      return;
    }
    setAccountMessage(t("account_created"));
  };

  const handleGoogleSignIn = async () => {
    if (!supabase) {
      return;
    }
    setAuthError("");
    setAccountMessage("");
    setIsSigningInWithGoogle(true);
    const redirectTo = `${window.location.origin}${window.location.pathname}`;
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo }
    });
    if (error) {
      setAuthError(`${t("google_auth_error")} ${error.message}`);
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
  };

  if (!hasSupabaseEnv) {
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

  if (token) {
    return (
      <PublicRsvpScreen
        token={token}
        language={language}
        setLanguage={setLanguage}
        themeMode={themeMode}
        setThemeMode={setThemeMode}
        t={t}
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
        onSignIn={handleSignIn}
        onSignUp={handleSignUp}
        onGoogleSignIn={handleGoogleSignIn}
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
    />
  );
}

export default App;
