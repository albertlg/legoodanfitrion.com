import { useEffect, useMemo, useState } from "react";
import { BrandMark } from "../components/brand-mark";
import { Controls } from "../components/controls";
import { Icon } from "../components/icons";
import { InlineMessage } from "../components/inline-message";
import { supabase } from "../lib/supabaseClient";

function toNullable(value) {
  const trimmed = value.trim();
  return trimmed === "" ? null : trimmed;
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

function statusClass(status) {
  return `status-${String(status || "").toLowerCase()}`;
}

function PublicRsvpScreen({ token, language, setLanguage, themeMode, setThemeMode, t }) {
  const [isLoading, setIsLoading] = useState(true);
  const [pageError, setPageError] = useState("");
  const [invitation, setInvitation] = useState(null);
  const [status, setStatus] = useState("yes");
  const [guestName, setGuestName] = useState("");
  const [note, setNote] = useState("");
  const [plusOne, setPlusOne] = useState(false);
  const [dietaryNeeds, setDietaryNeeds] = useState([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitMessage, setSubmitMessage] = useState("");
  const invitationLocation = String(
    invitation?.event_location_name ||
      invitation?.event_location_address ||
      invitation?.location_name ||
      invitation?.location_address ||
      invitation?.event_location ||
      ""
  ).trim();
  const invitationOrganizer = String(
    invitation?.host_name || invitation?.host_display_name || invitation?.organizer_name || t("app_name")
  ).trim();
  const dietaryOptions = useMemo(
    () => [
      { value: "gluten_free", label: t("rsvp_dietary_gluten_free") },
      { value: "vegetarian", label: t("rsvp_dietary_vegetarian") },
      { value: "vegan", label: t("rsvp_dietary_vegan") },
      { value: "lactose_free", label: t("rsvp_dietary_lactose_free") }
    ],
    [t]
  );

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

    const selectedDietaryLabels = dietaryOptions
      .filter((optionItem) => dietaryNeeds.includes(optionItem.value))
      .map((optionItem) => optionItem.label);
    const rsvpMetaLines = [
      plusOne ? t("rsvp_plus_one_selected") : "",
      selectedDietaryLabels.length > 0 ? `${t("rsvp_dietary_label")}: ${selectedDietaryLabels.join(", ")}` : ""
    ].filter(Boolean);
    const composedNote = toNullable([note.trim(), ...rsvpMetaLines].filter(Boolean).join("\n"));

    const { data, error } = await supabase.rpc("submit_rsvp_by_token", {
      p_token: token,
      p_status: status,
      p_response_note: composedNote,
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

  const toggleDietaryNeed = (value) => {
    setDietaryNeeds((previous) => (previous.includes(value) ? previous.filter((item) => item !== value) : [...previous, value]));
  };

  return (
    <main className="page page-rsvp">
      <section className="card app-card rsvp-card">
        <header className="app-header rsvp-header">
          <div className="brand-header">
            <BrandMark text={t("app_name")} fallback={t("logo_fallback")} />
            <div>
              <p className="eyebrow">{t("app_name")}</p>
              <h1 className="rsvp-header-title">{t("rsvp_title")}</h1>
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
          <>
            <section className="rsvp-hero">
              <p className="eyebrow">{t("app_name")}</p>
              <h2>{invitation.event_title}</h2>
              <p>
                <Icon name="user" className="icon icon-sm" /> {invitationOrganizer}
              </p>
            </section>
            <form className="rsvp-layout" onSubmit={handleSubmit} aria-labelledby="rsvp-form-title">
              <article className="panel rsvp-panel">
                <h2 id="rsvp-form-title" className="section-title">
                  <Icon name="calendar" className="icon" />
                  {t("field_event")}
                </h2>
                <div className="rsvp-meta-list">
                  <p className="item-meta">
                    <Icon name="calendar" className="icon icon-sm" />
                    <span>
                      <strong>{t("date")}</strong>
                      <br />
                      {formatDate(invitation.event_start_at, language, t("no_date"))}
                    </span>
                  </p>
                  <p className="item-meta">
                    <Icon name="check" className="icon icon-sm" />
                    <span>
                      <strong>{t("status")}</strong>
                      <br />
                      <span className={`status-pill ${statusClass(invitation.rsvp_status)}`}>{statusText(t, invitation.rsvp_status)}</span>
                    </span>
                  </p>
                  {invitationLocation ? (
                    <p className="item-meta">
                      <Icon name="location" className="icon icon-sm" />
                      <span>
                        <strong>{t("field_place")}</strong>
                        <br />
                        {invitationLocation}
                      </span>
                    </p>
                  ) : null}
                </div>
              </article>

              <article className="panel rsvp-panel">
                <h2 className="section-title">
                  <Icon name="check" className="icon" />
                  {t("rsvp_title")}
                </h2>

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

                <fieldset className="rsvp-choice-fieldset">
                  <legend className="label-title">
                    <Icon name="calendar" className="icon icon-sm" />
                    {t("rsvp_question")}
                  </legend>
                  <div className="rsvp-choice-grid" role="radiogroup" aria-label={t("rsvp_question")}>
                    <button
                      type="button"
                      className={`rsvp-choice-btn ${status === "yes" ? "active status-yes" : ""}`}
                      aria-pressed={status === "yes"}
                      onClick={() => setStatus("yes")}
                    >
                      <Icon name="check" className="icon icon-sm" />
                      {statusText(t, "yes")}
                    </button>
                    <button
                      type="button"
                      className={`rsvp-choice-btn ${status === "no" ? "active status-no" : ""}`}
                      aria-pressed={status === "no"}
                      onClick={() => setStatus("no")}
                    >
                      <Icon name="x" className="icon icon-sm" />
                      {statusText(t, "no")}
                    </button>
                    <button
                      type="button"
                      className={`rsvp-choice-btn ${status === "maybe" ? "active status-maybe" : ""}`}
                      aria-pressed={status === "maybe"}
                      onClick={() => setStatus("maybe")}
                    >
                      <Icon name="clock" className="icon icon-sm" />
                      {statusText(t, "maybe")}
                    </button>
                  </div>
                </fieldset>

                <div className="rsvp-plus-one-row">
                  <label className="rsvp-inline-toggle">
                    <input
                      type="checkbox"
                      checked={plusOne}
                      onChange={(event) => setPlusOne(event.target.checked)}
                    />
                    <span>{t("rsvp_plus_one_question")}</span>
                  </label>
                  <p className="field-help">{t("rsvp_plus_one_hint")}</p>
                </div>

                <div className="multi-select-field rsvp-dietary-field">
                  <p className="label-title">{t("rsvp_dietary_label")}</p>
                  <div className="multi-chip-group">
                    {dietaryOptions.map((optionItem) => {
                      const isActive = dietaryNeeds.includes(optionItem.value);
                      return (
                        <button
                          key={optionItem.value}
                          type="button"
                          className={`multi-chip ${isActive ? "active" : ""}`}
                          onClick={() => toggleDietaryNeed(optionItem.value)}
                          aria-pressed={isActive}
                        >
                          {optionItem.label}
                        </button>
                      );
                    })}
                  </div>
                </div>

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

                <button className="btn btn-rsvp-submit" type="submit" disabled={isSubmitting}>
                  {isSubmitting ? t("submitting_rsvp") : t("submit_rsvp")}
                </button>
                <InlineMessage text={submitMessage} />
              </article>
            </form>
          </>
        ) : null}

        <footer className="rsvp-footer">
          <div className="button-row">
            <a className="btn btn-ghost" href="/">
              {t("back_panel")}
            </a>
          </div>
          <p>Powered by LeGoodAnfitrión</p>
        </footer>
      </section>
    </main>
  );
}

export { PublicRsvpScreen };
