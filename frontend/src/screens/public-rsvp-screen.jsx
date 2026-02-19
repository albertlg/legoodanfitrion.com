import { useEffect, useState } from "react";
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

function PublicRsvpScreen({ token, language, setLanguage, themeMode, setThemeMode, t }) {
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

export { PublicRsvpScreen };

