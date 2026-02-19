import { useCallback, useEffect, useMemo, useState } from "react";
import { Icon } from "./components/icons";
import ca from "./i18n/ca.json";
import en from "./i18n/en.json";
import es from "./i18n/es.json";
import fr from "./i18n/fr.json";
import { hasSupabaseEnv, supabase } from "./lib/supabaseClient";
import { validateEventForm, validateGuestForm, validateInvitationForm } from "./lib/validation";

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

function toNullable(value) {
  const trimmed = value.trim();
  return trimmed === "" ? null : trimmed;
}

function toIsoDateTime(localDateTime) {
  if (!localDateTime) {
    return null;
  }
  const date = new Date(localDateTime);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
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

function formatDate(dateText, language, fallbackText) {
  if (!dateText) {
    return fallbackText;
  }
  try {
    return new Date(dateText).toLocaleString(language);
  } catch {
    return new Date(dateText).toLocaleString();
  }
}

function statusText(t, status) {
  return t(`status_${String(status || "").toLowerCase()}`);
}

function BrandMark({ text, fallback }) {
  const [imgError, setImgError] = useState(false);
  return (
    <div className="brand-mark">
      {imgError ? (
        <div className="brand-fallback" aria-label={text}>
          {fallback}
        </div>
      ) : (
        <img
          className="brand-logo"
          src="/brand/logo-legoodanfitrion.png"
          alt={text}
          onError={() => setImgError(true)}
        />
      )}
    </div>
  );
}

function Controls({ themeMode, setThemeMode, language, setLanguage, t }) {
  return (
    <div className="controls" aria-label="App controls">
      <label>
        <span className="label-title">
          <Icon name="globe" className="icon icon-sm" />
          {t("language")}
        </span>
        <select value={language} onChange={(event) => setLanguage(event.target.value)}>
          <option value="es">{t("lang_es")}</option>
          <option value="ca">{t("lang_ca")}</option>
          <option value="en">{t("lang_en")}</option>
          <option value="fr">{t("lang_fr")}</option>
        </select>
      </label>
      <label>
        <span className="label-title">
          <Icon name={themeMode === "dark" ? "moon" : "sun"} className="icon icon-sm" />
          {t("theme")}
        </span>
        <select value={themeMode} onChange={(event) => setThemeMode(event.target.value)}>
          <option value="light">{t("theme_light")}</option>
          <option value="dark">{t("theme_dark")}</option>
          <option value="system">{t("theme_system")}</option>
        </select>
      </label>
    </div>
  );
}

function InlineMessage({ type = "info", text }) {
  if (!text) {
    return null;
  }
  const className = type === "error" ? "msg error" : type === "success" ? "msg success" : "msg";
  return (
    <p className={className} role={type === "error" ? "alert" : "status"} aria-live="polite">
      {text}
    </p>
  );
}

function FieldMeta({ helpText, errorText, helpId, errorId }) {
  return (
    <div className="field-meta">
      {helpText ? (
        <p id={helpId} className="field-help">
          {helpText}
        </p>
      ) : null}
      {errorText ? (
        <p id={errorId} className="field-error" role="alert">
          {errorText}
        </p>
      ) : null}
    </div>
  );
}

function PublicRsvpView({ token, language, setLanguage, themeMode, setThemeMode, t }) {
  const [isLoading, setIsLoading] = useState(true);
  const [pageError, setPageError] = useState("");
  const [invitation, setInvitation] = useState(null);
  const [status, setStatus] = useState("yes");
  const [guestName, setGuestName] = useState("");
  const [note, setNote] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitMessage, setSubmitMessage] = useState("");

  useEffect(() => {
    if (!supabase) {
      setIsLoading(false);
      return;
    }
    const load = async () => {
      setIsLoading(true);
      setPageError("");
      const { data, error } = await supabase.rpc("get_invitation_public", { p_token: token });

      if (error) {
        setPageError(error.message);
        setInvitation(null);
        setIsLoading(false);
        return;
      }
      const first = data?.[0];
      if (!first) {
        setPageError(t("invitation_not_found"));
        setInvitation(null);
        setIsLoading(false);
        return;
      }

      setInvitation(first);
      setGuestName(first.guest_name || "");
      if (first.rsvp_status && first.rsvp_status !== "pending") {
        setStatus(first.rsvp_status);
      }
      setIsLoading(false);
    };
    load();
  }, [token, t]);

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!supabase) {
      return;
    }
    setSubmitMessage("");
    setPageError("");
    setIsSubmitting(true);

    const { data, error } = await supabase.rpc("submit_rsvp_by_token", {
      p_token: token,
      p_status: status,
      p_response_note: toNullable(note),
      p_guest_display_name: toNullable(guestName)
    });

    setIsSubmitting(false);
    if (error) {
      setSubmitMessage(`${t("error_submit_rsvp")} ${error.message}`);
      return;
    }

    setSubmitMessage(t("rsvp_saved"));
    if (data?.[0]) {
      setInvitation((prev) => ({ ...prev, rsvp_status: data[0].status }));
    }
  };

  return (
    <main className="page">
      <section className="card app-card">
        <header className="app-header">
          <div className="brand-header">
            <BrandMark text={t("app_name")} fallback={t("logo_fallback")} />
            <div>
              <p className="eyebrow">{t("app_name")}</p>
              <h1>{t("rsvp_title")}</h1>
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

        {isLoading ? <p>{t("loading_invitation")}</p> : null}
        <InlineMessage type="error" text={pageError} />

        {invitation ? (
          <form className="panel form-grid" onSubmit={handleSubmit} aria-labelledby="rsvp-form-title">
            <h2 id="rsvp-form-title" className="section-title">
              <Icon name="check" className="icon" />
              {t("rsvp_title")}
            </h2>

            <p className="item-title">{invitation.event_title}</p>
            <p className="item-meta">
              {t("date")}: {formatDate(invitation.event_start_at, language, t("no_date"))}
            </p>
            <p className="item-meta">
              {t("status")}: {statusText(t, invitation.rsvp_status)}
            </p>

            <label>
              <span className="label-title">
                <Icon name="user" className="icon icon-sm" />
                {t("rsvp_name_optional")}
              </span>
              <input
                type="text"
                value={guestName}
                onChange={(event) => setGuestName(event.target.value)}
                maxLength={120}
              />
            </label>

            <label>
              <span className="label-title">
                <Icon name="calendar" className="icon icon-sm" />
                {t("rsvp_question")}
              </span>
              <select value={status} onChange={(event) => setStatus(event.target.value)}>
                <option value="yes">{statusText(t, "yes")}</option>
                <option value="no">{statusText(t, "no")}</option>
                <option value="maybe">{statusText(t, "maybe")}</option>
              </select>
            </label>

            <label>
              <span className="label-title">
                <Icon name="mail" className="icon icon-sm" />
                {t("rsvp_note_optional")}
              </span>
              <textarea
                rows="3"
                value={note}
                onChange={(event) => setNote(event.target.value)}
                placeholder={t("rsvp_note_placeholder")}
                maxLength={500}
              />
            </label>

            <button className="btn" type="submit" disabled={isSubmitting}>
              {isSubmitting ? t("submitting_rsvp") : t("submit_rsvp")}
            </button>
            <InlineMessage text={submitMessage} />
          </form>
        ) : null}

        <div className="button-row">
          <a className="btn btn-ghost" href="/">
            {t("back_panel")}
          </a>
        </div>
      </section>
    </main>
  );
}

function App() {
  const [token, setToken] = useState(getTokenFromLocation);
  const [language, setLanguage] = useState(detectLanguage);
  const [themeMode, setThemeMode] = useState(getThemeModeInitial);
  const [systemPrefersDark, setSystemPrefersDark] = useState(getSystemPrefersDark);

  const activeTheme = useMemo(() => resolveTheme(themeMode, systemPrefersDark), [themeMode, systemPrefersDark]);
  const timezone = useMemo(() => Intl.DateTimeFormat().resolvedOptions().timeZone || "Europe/Madrid", []);

  const t = useCallback((key) => I18N[language]?.[key] || I18N.es[key] || key, [language]);

  const [session, setSession] = useState(null);
  const [isLoadingAuth, setIsLoadingAuth] = useState(true);
  const [authError, setAuthError] = useState("");
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [isSigningIn, setIsSigningIn] = useState(false);
  const [isSigningUp, setIsSigningUp] = useState(false);
  const [accountMessage, setAccountMessage] = useState("");

  const [eventTitle, setEventTitle] = useState("");
  const [eventType, setEventType] = useState("");
  const [eventStartAt, setEventStartAt] = useState("");
  const [eventLocationName, setEventLocationName] = useState("");
  const [eventLocationAddress, setEventLocationAddress] = useState("");
  const [eventMessage, setEventMessage] = useState("");
  const [eventErrors, setEventErrors] = useState({});
  const [isCreatingEvent, setIsCreatingEvent] = useState(false);

  const [guestFirstName, setGuestFirstName] = useState("");
  const [guestLastName, setGuestLastName] = useState("");
  const [guestEmail, setGuestEmail] = useState("");
  const [guestPhone, setGuestPhone] = useState("");
  const [guestRelationship, setGuestRelationship] = useState("");
  const [guestCity, setGuestCity] = useState("");
  const [guestCountry, setGuestCountry] = useState("");
  const [guestMessage, setGuestMessage] = useState("");
  const [guestErrors, setGuestErrors] = useState({});
  const [isCreatingGuest, setIsCreatingGuest] = useState(false);

  const [dashboardError, setDashboardError] = useState("");
  const [events, setEvents] = useState([]);
  const [guests, setGuests] = useState([]);
  const [invitations, setInvitations] = useState([]);

  const [selectedEventId, setSelectedEventId] = useState("");
  const [selectedGuestId, setSelectedGuestId] = useState("");
  const [invitationErrors, setInvitationErrors] = useState({});
  const [isCreatingInvitation, setIsCreatingInvitation] = useState(false);
  const [invitationMessage, setInvitationMessage] = useState("");
  const [lastInvitationUrl, setLastInvitationUrl] = useState("");

  const recentEvents = events.slice(0, 5);
  const recentGuests = guests.slice(0, 5);
  const recentInvitations = invitations.slice(0, 8);

  const guestNamesById = useMemo(
    () =>
      Object.fromEntries(
        guests.map((guest) => [guest.id, `${guest.first_name || ""} ${guest.last_name || ""}`.trim()])
      ),
    [guests]
  );

  const eventNamesById = useMemo(
    () => Object.fromEntries(events.map((event) => [event.id, event.title])),
    [events]
  );

  const loadDashboardData = useCallback(
    async (userId) => {
      if (!supabase) {
        return;
      }
      setDashboardError("");

      const eventsPromise = supabase
        .from("events")
        .select("id, title, status, start_at, created_at")
        .order("created_at", { ascending: false })
        .limit(50);

      const guestsPromise = supabase
        .from("guests")
        .select("id, first_name, last_name, email, phone, created_at")
        .order("created_at", { ascending: false })
        .limit(100);

      const invitationsPromise = supabase
        .from("invitations")
        .select("id, event_id, guest_id, status, public_token, created_at, responded_at")
        .eq("host_user_id", userId)
        .order("created_at", { ascending: false })
        .limit(100);

      const [
        { data: eventsData, error: eventsError },
        { data: guestsData, error: guestsError },
        { data: invitationsData, error: invitationsError }
      ] = await Promise.all([eventsPromise, guestsPromise, invitationsPromise]);

      if (eventsError || guestsError || invitationsError) {
        setDashboardError(
          eventsError?.message || guestsError?.message || invitationsError?.message || t("error_load_data")
        );
        return;
      }

      setEvents(eventsData || []);
      setGuests(guestsData || []);
      setInvitations(invitationsData || []);
    },
    [t]
  );

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", activeTheme);
    window.localStorage.setItem("legood-theme-mode", themeMode);
  }, [activeTheme, themeMode]);

  useEffect(() => {
    window.localStorage.setItem("legood-language", language);
  }, [language]);

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

    const { data } = supabase.auth.onAuthStateChange((_event, nextSession) => setSession(nextSession));
    return () => {
      isMounted = false;
      data.subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (!supabase || !session?.user?.id) {
      setEvents([]);
      setGuests([]);
      setInvitations([]);
      return;
    }
    loadDashboardData(session.user.id);
  }, [session?.user?.id, loadDashboardData]);

  useEffect(() => {
    if (!selectedEventId && events.length > 0) {
      setSelectedEventId(events[0].id);
      return;
    }
    if (selectedEventId && !events.find((event) => event.id === selectedEventId)) {
      setSelectedEventId(events[0]?.id || "");
    }
  }, [events, selectedEventId]);

  useEffect(() => {
    if (!selectedGuestId && guests.length > 0) {
      setSelectedGuestId(guests[0].id);
      return;
    }
    if (selectedGuestId && !guests.find((guest) => guest.id === selectedGuestId)) {
      setSelectedGuestId(guests[0]?.id || "");
    }
  }, [guests, selectedGuestId]);

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

  const handleSignOut = async () => {
    if (!supabase) {
      return;
    }
    setAuthError("");
    await supabase.auth.signOut();
    setEventMessage("");
    setGuestMessage("");
    setInvitationMessage("");
    setLastInvitationUrl("");
  };

  const handleCreateEvent = async (event) => {
    event.preventDefault();
    if (!supabase || !session?.user?.id) {
      return;
    }
    setEventMessage("");

    const validation = validateEventForm({
      title: eventTitle,
      eventType,
      locationName: eventLocationName,
      locationAddress: eventLocationAddress
    });

    if (!validation.success) {
      setEventErrors(validation.errors);
      const firstError = validation.errors[Object.keys(validation.errors)[0]];
      setEventMessage(t(firstError || "error_create_event"));
      return;
    }

    setEventErrors({});
    setIsCreatingEvent(true);
    const payload = {
      host_user_id: session.user.id,
      title: eventTitle.trim(),
      event_type: toNullable(eventType),
      start_at: toIsoDateTime(eventStartAt),
      timezone,
      location_name: toNullable(eventLocationName),
      location_address: toNullable(eventLocationAddress),
      status: "draft"
    };

    const { error } = await supabase.from("events").insert(payload);
    setIsCreatingEvent(false);

    if (error) {
      setEventMessage(`${t("error_create_event")} ${error.message}`);
      return;
    }

    setEventTitle("");
    setEventType("");
    setEventStartAt("");
    setEventLocationName("");
    setEventLocationAddress("");
    setEventMessage(t("event_created"));
    await loadDashboardData(session.user.id);
  };

  const handleCreateGuest = async (event) => {
    event.preventDefault();
    if (!supabase || !session?.user?.id) {
      return;
    }
    setGuestMessage("");

    const validation = validateGuestForm({
      firstName: guestFirstName,
      lastName: guestLastName,
      email: guestEmail,
      phone: guestPhone,
      relationship: guestRelationship,
      city: guestCity,
      country: guestCountry
    });

    if (!validation.success) {
      setGuestErrors(validation.errors);
      const firstError = validation.errors[Object.keys(validation.errors)[0]];
      setGuestMessage(t(firstError || "error_create_guest"));
      return;
    }

    setGuestErrors({});
    setIsCreatingGuest(true);
    const payload = {
      host_user_id: session.user.id,
      first_name: guestFirstName.trim(),
      last_name: toNullable(guestLastName),
      email: toNullable(guestEmail),
      phone: toNullable(guestPhone),
      relationship: toNullable(guestRelationship),
      city: toNullable(guestCity),
      country: toNullable(guestCountry)
    };

    const { error } = await supabase.from("guests").insert(payload);
    setIsCreatingGuest(false);

    if (error) {
      setGuestMessage(`${t("error_create_guest")} ${error.message}`);
      return;
    }

    setGuestFirstName("");
    setGuestLastName("");
    setGuestEmail("");
    setGuestPhone("");
    setGuestRelationship("");
    setGuestCity("");
    setGuestCountry("");
    setGuestMessage(t("guest_created"));
    await loadDashboardData(session.user.id);
  };

  const handleCreateInvitation = async (event) => {
    event.preventDefault();
    if (!supabase || !session?.user?.id) {
      return;
    }
    setInvitationMessage("");
    setLastInvitationUrl("");

    const validation = validateInvitationForm({ eventId: selectedEventId, guestId: selectedGuestId });
    if (!validation.success) {
      setInvitationErrors(validation.errors);
      const firstError = validation.errors[Object.keys(validation.errors)[0]];
      setInvitationMessage(t(firstError || "invitation_select_required"));
      return;
    }

    setInvitationErrors({});
    setIsCreatingInvitation(true);
    const selectedGuestName = guestNamesById[selectedGuestId] || null;
    const { data, error } = await supabase
      .from("invitations")
      .insert({
        host_user_id: session.user.id,
        event_id: selectedEventId,
        guest_id: selectedGuestId,
        invite_channel: "link",
        guest_display_name: selectedGuestName
      })
      .select("id, event_id, guest_id, status, public_token, created_at")
      .single();

    setIsCreatingInvitation(false);

    if (error) {
      if (error.code === "23505" || error.message?.includes("invitations_unique_event_guest")) {
        setInvitationMessage(t("invitation_duplicate"));
      } else {
        setInvitationMessage(`${t("error_create_invitation")} ${error.message}`);
      }
      return;
    }

    const url = `${window.location.origin}/?token=${data.public_token}`;
    setInvitationMessage(t("invitation_created"));
    setLastInvitationUrl(url);
    await loadDashboardData(session.user.id);
  };

  const handleCopyInvitationLink = async (url) => {
    try {
      await navigator.clipboard.writeText(url);
      setInvitationMessage(t("copy_ok"));
    } catch {
      setInvitationMessage(t("copy_fail"));
    }
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
      <PublicRsvpView
        token={token}
        language={language}
        setLanguage={setLanguage}
        themeMode={themeMode}
        setThemeMode={setThemeMode}
        t={t}
      />
    );
  }

  return (
    <main className="page">
      <section className="card app-card">
        <header className="app-header">
          <div className="brand-header">
            <BrandMark text={t("app_name")} fallback={t("logo_fallback")} />
            <div>
              <p className="eyebrow">{t("app_name")}</p>
              <h1>{t("panel_title")}</h1>
              <p className="hero-text">{t("hero_subtitle")}</p>
              <p className="hero-note">{t("hero_accessibility_note")}</p>
            </div>
          </div>
          <div className="header-actions">
            <Controls
              themeMode={themeMode}
              setThemeMode={setThemeMode}
              language={language}
              setLanguage={setLanguage}
              t={t}
            />
            {session?.user?.email ? (
              <div className="session-box">
                <p className="session-label">{t("active_session")}</p>
                <p className="session-value">{session.user.email}</p>
                <button className="btn btn-ghost" type="button" onClick={handleSignOut}>
                  {t("sign_out")}
                </button>
              </div>
            ) : null}
          </div>
        </header>

        {isLoadingAuth ? <p>{t("loading_session")}</p> : null}
        <InlineMessage type="error" text={authError} />
        <InlineMessage type="success" text={accountMessage} />

        {!session?.user?.id ? (
          <form className="panel form-grid" onSubmit={handleSignIn}>
            <h2 className="section-title">
              <Icon name="shield" className="icon" />
              {t("access_title")}
            </h2>
            <label>
              <span className="label-title">
                <Icon name="mail" className="icon icon-sm" />
                {t("email")}
              </span>
              <input
                type="email"
                required
                value={loginEmail}
                onChange={(event) => setLoginEmail(event.target.value)}
                placeholder={t("placeholder_email")}
                autoComplete="email"
              />
            </label>
            <label>
              <span className="label-title">
                <Icon name="shield" className="icon icon-sm" />
                {t("password")}
              </span>
              <input
                type="password"
                required
                minLength={6}
                value={loginPassword}
                onChange={(event) => setLoginPassword(event.target.value)}
                placeholder="******"
                autoComplete="current-password"
              />
            </label>
            <div className="button-row">
              <button className="btn" type="submit" disabled={isSigningIn || isSigningUp}>
                {isSigningIn ? t("signing_in") : t("sign_in")}
              </button>
              <button className="btn btn-ghost" type="button" onClick={handleSignUp} disabled={isSigningIn || isSigningUp}>
                {isSigningUp ? t("signing_up") : t("sign_up")}
              </button>
            </div>
          </form>
        ) : (
          <div className="dashboard-grid">
            <form className="panel form-grid" onSubmit={handleCreateEvent} noValidate>
              <h2 className="section-title">
                <Icon name="calendar" className="icon" />
                {t("create_event_title")}
              </h2>
              <p className="field-help">{t("help_event_form")}</p>

              <label>
                <span className="label-title">{t("field_title")} *</span>
                <input
                  type="text"
                  value={eventTitle}
                  onChange={(event) => setEventTitle(event.target.value)}
                  placeholder={t("placeholder_event_title")}
                  aria-invalid={Boolean(eventErrors.title)}
                />
                <FieldMeta errorText={eventErrors.title ? t(eventErrors.title) : ""} />
              </label>

              <label>
                <span className="label-title">{t("field_event_type")}</span>
                <input
                  type="text"
                  value={eventType}
                  onChange={(event) => setEventType(event.target.value)}
                  placeholder={t("placeholder_event_type")}
                  aria-invalid={Boolean(eventErrors.eventType)}
                />
                <FieldMeta errorText={eventErrors.eventType ? t(eventErrors.eventType) : ""} />
              </label>

              <label>
                <span className="label-title">
                  <Icon name="calendar" className="icon icon-sm" />
                  {t("field_datetime")}
                </span>
                <input type="datetime-local" value={eventStartAt} onChange={(event) => setEventStartAt(event.target.value)} />
              </label>

              <label>
                <span className="label-title">
                  <Icon name="location" className="icon icon-sm" />
                  {t("field_place")}
                </span>
                <input
                  type="text"
                  value={eventLocationName}
                  onChange={(event) => setEventLocationName(event.target.value)}
                  placeholder={t("placeholder_place")}
                  aria-invalid={Boolean(eventErrors.locationName)}
                />
                <FieldMeta errorText={eventErrors.locationName ? t(eventErrors.locationName) : ""} />
              </label>

              <label>
                <span className="label-title">
                  <Icon name="location" className="icon icon-sm" />
                  {t("field_address")}
                </span>
                <input
                  type="text"
                  value={eventLocationAddress}
                  onChange={(event) => setEventLocationAddress(event.target.value)}
                  placeholder={t("placeholder_address")}
                  aria-invalid={Boolean(eventErrors.locationAddress)}
                />
                <FieldMeta errorText={eventErrors.locationAddress ? t(eventErrors.locationAddress) : ""} />
              </label>

              <p className="hint">
                {t("timezone_detected")}: {timezone}
              </p>
              <button className="btn" type="submit" disabled={isCreatingEvent}>
                {isCreatingEvent ? t("saving_event") : t("save_event")}
              </button>
              <InlineMessage text={eventMessage} />
            </form>

            <form className="panel form-grid" onSubmit={handleCreateGuest} noValidate>
              <h2 className="section-title">
                <Icon name="user" className="icon" />
                {t("create_guest_title")}
              </h2>
              <p className="field-help">{t("help_guest_form")}</p>

              <label>
                <span className="label-title">{t("field_first_name")} *</span>
                <input
                  type="text"
                  value={guestFirstName}
                  onChange={(event) => setGuestFirstName(event.target.value)}
                  placeholder={t("placeholder_first_name")}
                  aria-invalid={Boolean(guestErrors.firstName)}
                />
                <FieldMeta errorText={guestErrors.firstName ? t(guestErrors.firstName) : ""} />
              </label>

              <label>
                <span className="label-title">{t("field_last_name")}</span>
                <input
                  type="text"
                  value={guestLastName}
                  onChange={(event) => setGuestLastName(event.target.value)}
                  placeholder={t("placeholder_last_name")}
                  aria-invalid={Boolean(guestErrors.lastName)}
                />
                <FieldMeta errorText={guestErrors.lastName ? t(guestErrors.lastName) : ""} />
              </label>

              <label>
                <span className="label-title">
                  <Icon name="mail" className="icon icon-sm" />
                  {t("email")}
                </span>
                <input
                  type="email"
                  value={guestEmail}
                  onChange={(event) => setGuestEmail(event.target.value)}
                  placeholder={t("placeholder_email")}
                  aria-invalid={Boolean(guestErrors.email)}
                />
                <FieldMeta errorText={guestErrors.email ? t(guestErrors.email) : ""} />
              </label>

              <label>
                <span className="label-title">
                  <Icon name="phone" className="icon icon-sm" />
                  {t("field_phone")}
                </span>
                <input
                  type="tel"
                  value={guestPhone}
                  onChange={(event) => setGuestPhone(event.target.value)}
                  placeholder={t("placeholder_phone")}
                  aria-invalid={Boolean(guestErrors.phone)}
                />
                <FieldMeta
                  helpText={t("hint_contact_required")}
                  errorText={guestErrors.phone ? t(guestErrors.phone) : guestErrors.contact ? t(guestErrors.contact) : ""}
                />
              </label>

              <label>
                <span className="label-title">{t("field_relationship")}</span>
                <input
                  type="text"
                  value={guestRelationship}
                  onChange={(event) => setGuestRelationship(event.target.value)}
                  placeholder={t("placeholder_relationship")}
                  aria-invalid={Boolean(guestErrors.relationship)}
                />
                <FieldMeta errorText={guestErrors.relationship ? t(guestErrors.relationship) : ""} />
              </label>

              <label>
                <span className="label-title">{t("field_city")}</span>
                <input
                  type="text"
                  value={guestCity}
                  onChange={(event) => setGuestCity(event.target.value)}
                  placeholder={t("placeholder_city")}
                  aria-invalid={Boolean(guestErrors.city)}
                />
                <FieldMeta errorText={guestErrors.city ? t(guestErrors.city) : ""} />
              </label>

              <label>
                <span className="label-title">{t("field_country")}</span>
                <input
                  type="text"
                  value={guestCountry}
                  onChange={(event) => setGuestCountry(event.target.value)}
                  placeholder={t("placeholder_country")}
                  aria-invalid={Boolean(guestErrors.country)}
                />
                <FieldMeta errorText={guestErrors.country ? t(guestErrors.country) : ""} />
              </label>

              <button className="btn" type="submit" disabled={isCreatingGuest}>
                {isCreatingGuest ? t("saving_guest") : t("save_guest")}
              </button>
              <InlineMessage text={guestMessage} />
            </form>

            <form className="panel form-grid" onSubmit={handleCreateInvitation} noValidate>
              <h2 className="section-title">
                <Icon name="link" className="icon" />
                {t("create_invitation_title")}
              </h2>
              <p className="field-help">{t("help_invitation_form")}</p>

              <label>
                <span className="label-title">{t("field_event")}</span>
                <select
                  value={selectedEventId}
                  onChange={(event) => setSelectedEventId(event.target.value)}
                  disabled={!events.length}
                  aria-invalid={Boolean(invitationErrors.eventId)}
                >
                  {!events.length ? <option value="">{t("select_event_first")}</option> : null}
                  {events.map((eventItem) => (
                    <option key={eventItem.id} value={eventItem.id}>
                      {eventItem.title}
                    </option>
                  ))}
                </select>
              </label>

              <label>
                <span className="label-title">{t("field_guest")}</span>
                <select
                  value={selectedGuestId}
                  onChange={(event) => setSelectedGuestId(event.target.value)}
                  disabled={!guests.length}
                  aria-invalid={Boolean(invitationErrors.guestId)}
                >
                  {!guests.length ? <option value="">{t("select_guest_first")}</option> : null}
                  {guests.map((guestItem) => (
                    <option key={guestItem.id} value={guestItem.id}>
                      {guestItem.first_name} {guestItem.last_name || ""}
                    </option>
                  ))}
                </select>
              </label>

              <FieldMeta
                helpText={t("hint_invitation_public")}
                errorText={
                  invitationErrors.eventId ? t(invitationErrors.eventId) : invitationErrors.guestId ? t(invitationErrors.guestId) : ""
                }
              />

              <button className="btn" type="submit" disabled={isCreatingInvitation || !events.length || !guests.length}>
                {isCreatingInvitation ? t("generating_invitation") : t("generate_rsvp")}
              </button>
              <InlineMessage text={invitationMessage} />

              {lastInvitationUrl ? (
                <div className="link-box">
                  <p className="hint">{t("invitation_link_label")}</p>
                  <input value={lastInvitationUrl} readOnly />
                  <div className="button-row">
                    <button className="btn btn-ghost" type="button" onClick={() => handleCopyInvitationLink(lastInvitationUrl)}>
                      {t("copy_link")}
                    </button>
                    <a className="btn btn-ghost" href={lastInvitationUrl} target="_blank" rel="noreferrer">
                      {t("open_rsvp")}
                    </a>
                  </div>
                </div>
              ) : null}
            </form>

            <section className="panel">
              <h2 className="section-title">
                <Icon name="calendar" className="icon" />
                {t("latest_events_title")}
              </h2>
              <InlineMessage type="error" text={dashboardError} />
              {recentEvents.length === 0 ? (
                <p>{t("no_events")}</p>
              ) : (
                <ul className="list">
                  {recentEvents.map((eventItem) => (
                    <li key={eventItem.id}>
                      <p className="item-title">{eventItem.title}</p>
                      <p className="item-meta">
                        {t("status")}: {statusText(t, eventItem.status)} - {t("date")}:{" "}
                        {formatDate(eventItem.start_at, language, t("no_date"))}
                      </p>
                    </li>
                  ))}
                </ul>
              )}
            </section>

            <section className="panel">
              <h2 className="section-title">
                <Icon name="user" className="icon" />
                {t("latest_guests_title")}
              </h2>
              {recentGuests.length === 0 ? (
                <p>{t("no_guests")}</p>
              ) : (
                <ul className="list">
                  {recentGuests.map((guestItem) => (
                    <li key={guestItem.id}>
                      <p className="item-title">
                        {guestItem.first_name} {guestItem.last_name || ""}
                      </p>
                      <p className="item-meta">{guestItem.email || guestItem.phone || "-"}</p>
                    </li>
                  ))}
                </ul>
              )}
            </section>

            <section className="panel panel-wide">
              <h2 className="section-title">
                <Icon name="link" className="icon" />
                {t("latest_invitations_title")}
              </h2>
              <p className="field-help">{t("hint_accessibility")}</p>
              {recentInvitations.length === 0 ? (
                <p>{t("no_invitations")}</p>
              ) : (
                <ul className="list">
                  {recentInvitations.map((invitation) => {
                    const eventName = eventNamesById[invitation.event_id] || invitation.event_id;
                    const guestName = guestNamesById[invitation.guest_id] || invitation.guest_id;
                    const url = `${window.location.origin}/?token=${invitation.public_token}`;
                    return (
                      <li key={invitation.id}>
                        <p className="item-title">
                          {eventName} - {guestName}
                        </p>
                        <p className="item-meta">
                          {t("status")}: {statusText(t, invitation.status)} - {t("created")}:{" "}
                          {formatDate(invitation.created_at, language, t("no_date"))} - {t("responded")}:{" "}
                          {formatDate(invitation.responded_at, language, t("no_response"))}
                        </p>
                        <div className="button-row">
                          <button className="btn btn-ghost" type="button" onClick={() => handleCopyInvitationLink(url)}>
                            {t("copy_link")}
                          </button>
                          <a className="btn btn-ghost" href={url} target="_blank" rel="noreferrer">
                            {t("open_rsvp")}
                          </a>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}
            </section>
          </div>
        )}
      </section>
    </main>
  );
}

export default App;

