import { useCallback, useEffect, useMemo, useState } from "react";
import { BrandMark } from "../components/brand-mark";
import { Controls } from "../components/controls";
import { FieldMeta } from "../components/field-meta";
import { Icon } from "../components/icons";
import { InlineMessage } from "../components/inline-message";
import { supabase } from "../lib/supabaseClient";
import { validateEventForm, validateGuestForm, validateInvitationForm } from "../lib/validation";

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

const VIEW_CONFIG = [
  { key: "overview", icon: "sparkle", labelKey: "nav_overview" },
  { key: "events", icon: "calendar", labelKey: "nav_events" },
  { key: "guests", icon: "user", labelKey: "nav_guests" },
  { key: "invitations", icon: "link", labelKey: "nav_invitations" }
];

function DashboardScreen({
  t,
  language,
  setLanguage,
  themeMode,
  setThemeMode,
  session,
  onSignOut,
  onPreferencesSynced
}) {
  const timezone = useMemo(() => Intl.DateTimeFormat().resolvedOptions().timeZone || "Europe/Madrid", []);
  const [activeView, setActiveView] = useState("overview");
  const [isMenuOpen, setIsMenuOpen] = useState(false);

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

  const pendingInvites = invitations.filter((item) => item.status === "pending").length;
  const respondedInvites = invitations.filter((item) => item.status !== "pending").length;

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

  const loadDashboardData = useCallback(async () => {
    if (!supabase || !session?.user?.id) {
      return;
    }
    setDashboardError("");
    onPreferencesSynced?.();

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
      .eq("host_user_id", session.user.id)
      .order("created_at", { ascending: false })
      .limit(100);

    const [
      { data: eventsData, error: eventsError },
      { data: guestsData, error: guestsError },
      { data: invitationsData, error: invitationsError }
    ] = await Promise.all([eventsPromise, guestsPromise, invitationsPromise]);

    if (eventsError || guestsError || invitationsError) {
      setDashboardError(eventsError?.message || guestsError?.message || invitationsError?.message || t("error_load_data"));
      return;
    }

    setEvents(eventsData || []);
    setGuests(guestsData || []);
    setInvitations(invitationsData || []);
  }, [session?.user?.id, t, onPreferencesSynced]);

  useEffect(() => {
    loadDashboardData();
  }, [loadDashboardData]);

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

  const changeView = (nextView) => {
    setActiveView(nextView);
    setIsMenuOpen(false);
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
    await loadDashboardData();
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
    await loadDashboardData();
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
    await loadDashboardData();
  };

  const handleCopyInvitationLink = async (url) => {
    try {
      await navigator.clipboard.writeText(url);
      setInvitationMessage(t("copy_ok"));
    } catch {
      setInvitationMessage(t("copy_fail"));
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
              <h1>{t("panel_title")}</h1>
              <p className="hero-text">{t("hero_subtitle")}</p>
            </div>
          </div>
          <div className="header-actions">
            <button
              className="hamburger-btn mobile-only"
              type="button"
              aria-expanded={isMenuOpen}
              aria-controls="mobile-menu"
              onClick={() => setIsMenuOpen((prev) => !prev)}
            >
              <span />
              <span />
              <span />
            </button>
            <Controls
              themeMode={themeMode}
              setThemeMode={setThemeMode}
              language={language}
              setLanguage={setLanguage}
              t={t}
            />
            <div className="session-box">
              <p className="session-label">{t("active_session")}</p>
              <p className="session-value">{session?.user?.email || "-"}</p>
              <button className="btn btn-ghost" type="button" onClick={onSignOut}>
                {t("sign_out")}
              </button>
            </div>
          </div>
        </header>

        <nav className="dashboard-nav desktop-only" aria-label={t("nav_sections")}>
          {VIEW_CONFIG.map((item) => (
            <button
              key={item.key}
              type="button"
              className={`nav-btn ${activeView === item.key ? "active" : ""}`}
              onClick={() => changeView(item.key)}
            >
              <Icon name={item.icon} className="icon" />
              {t(item.labelKey)}
            </button>
          ))}
        </nav>

        <div className={`mobile-menu-overlay ${isMenuOpen ? "open" : ""}`} onClick={() => setIsMenuOpen(false)} />
        <aside id="mobile-menu" className={`mobile-menu ${isMenuOpen ? "open" : ""}`} aria-hidden={!isMenuOpen}>
          <div className="mobile-menu-header">
            <p className="item-title">{t("nav_sections")}</p>
            <button className="btn btn-ghost" type="button" onClick={() => setIsMenuOpen(false)}>
              {t("close_menu")}
            </button>
          </div>
          <nav className="mobile-nav-list">
            {VIEW_CONFIG.map((item) => (
              <button
                key={item.key}
                type="button"
                className={`nav-btn ${activeView === item.key ? "active" : ""}`}
                onClick={() => changeView(item.key)}
              >
                <Icon name={item.icon} className="icon" />
                {t(item.labelKey)}
              </button>
            ))}
          </nav>
        </aside>

        <InlineMessage type="error" text={dashboardError} />

        {activeView === "overview" ? (
          <section className="overview-grid">
            <article className="panel kpi-card">
              <p className="hint">{t("kpi_events")}</p>
              <p className="kpi-value">{events.length}</p>
            </article>
            <article className="panel kpi-card">
              <p className="hint">{t("kpi_guests")}</p>
              <p className="kpi-value">{guests.length}</p>
            </article>
            <article className="panel kpi-card">
              <p className="hint">{t("kpi_pending_rsvp")}</p>
              <p className="kpi-value">{pendingInvites}</p>
            </article>
            <article className="panel kpi-card">
              <p className="hint">{t("kpi_answered_rsvp")}</p>
              <p className="kpi-value">{respondedInvites}</p>
            </article>
            <article className="panel panel-wide">
              <h2 className="section-title">
                <Icon name="sparkle" className="icon" />
                {t("hint_accessibility")}
              </h2>
              <p className="field-help">{t("overview_help")}</p>
            </article>
          </section>
        ) : null}

        {activeView === "events" ? (
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

            <section className="panel">
              <h2 className="section-title">
                <Icon name="calendar" className="icon" />
                {t("latest_events_title")}
              </h2>
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
          </div>
        ) : null}

        {activeView === "guests" ? (
          <div className="dashboard-grid">
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
          </div>
        ) : null}

        {activeView === "invitations" ? (
          <div className="dashboard-grid">
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
        ) : null}
      </section>
    </main>
  );
}

export { DashboardScreen };

