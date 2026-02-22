import { useEffect, useRef, useState } from "react";
import { BrandMark } from "../components/brand-mark";
import { Controls } from "../components/controls";
import { Icon } from "../components/icons";
import { InlineMessage } from "../components/inline-message";
import { hasSupabaseEnv, supabase } from "../lib/supabaseClient";

const NAV_ITEMS = [
  { key: "features", path: "/features", labelKey: "landing_nav_features" },
  { key: "pricing", path: "/pricing", labelKey: "landing_nav_pricing" },
  { key: "contact", path: "/contact", labelKey: "landing_nav_contact" }
];

const FAQ_ITEMS = [
  { key: "faq_1", questionKey: "landing_faq_q1", answerKey: "landing_faq_a1" },
  { key: "faq_2", questionKey: "landing_faq_q2", answerKey: "landing_faq_a2" },
  { key: "faq_3", questionKey: "landing_faq_q3", answerKey: "landing_faq_a3" },
  { key: "faq_4", questionKey: "landing_faq_q4", answerKey: "landing_faq_a4" }
];

function LandingScreen({
  t,
  language,
  setLanguage,
  themeMode,
  setThemeMode,
  currentPath,
  session,
  onNavigate,
  onGoLogin,
  onGoApp
}) {
  const [waitlistEmail, setWaitlistEmail] = useState("");
  const [isJoiningWaitlist, setIsJoiningWaitlist] = useState(false);
  const [waitlistMessage, setWaitlistMessage] = useState("");
  const [waitlistMessageType, setWaitlistMessageType] = useState("info");

  const [contactName, setContactName] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [contactMessageBody, setContactMessageBody] = useState("");
  const [isSendingContact, setIsSendingContact] = useState(false);
  const [contactMessage, setContactMessage] = useState("");
  const [contactMessageType, setContactMessageType] = useState("info");
  const [openFaqKey, setOpenFaqKey] = useState("faq_1");
  const [toast, setToast] = useState({ visible: false, text: "", type: "success" });
  const toastTimerRef = useRef(null);

  const showToast = (text, type = "success") => {
    if (!text) {
      return;
    }
    if (toastTimerRef.current) {
      window.clearTimeout(toastTimerRef.current);
    }
    setToast({ visible: true, text, type });
    toastTimerRef.current = window.setTimeout(() => {
      setToast((prev) => ({ ...prev, visible: false }));
      toastTimerRef.current = null;
    }, 3600);
  };

  useEffect(
    () => () => {
      if (toastTimerRef.current) {
        window.clearTimeout(toastTimerRef.current);
      }
    },
    []
  );

  const pageMode =
    currentPath === "/features"
      ? "features"
      : currentPath === "/pricing"
      ? "pricing"
      : currentPath === "/contact"
      ? "contact"
      : "home";

  const primaryCta = session?.user?.id
    ? { label: t("landing_cta_open_app"), onClick: onGoApp }
    : { label: t("landing_cta_start"), onClick: onGoLogin };
  const revealStyle = (index = 0) => ({ "--landing-delay": `${index * 80}ms` });

  const handleJoinWaitlist = async (event) => {
    event.preventDefault();
    const email = String(waitlistEmail || "").trim();
    if (!email) {
      setWaitlistMessageType("error");
      const text = t("waitlist_email_required");
      setWaitlistMessage(text);
      showToast(text, "error");
      return;
    }
    const isValidEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
    if (!isValidEmail) {
      setWaitlistMessageType("error");
      const text = t("waitlist_email_invalid");
      setWaitlistMessage(text);
      showToast(text, "error");
      return;
    }
    if (!hasSupabaseEnv || !supabase) {
      setWaitlistMessageType("error");
      const text = t("waitlist_join_error_config");
      setWaitlistMessage(text);
      showToast(text, "error");
      return;
    }

    setIsJoiningWaitlist(true);
    setWaitlistMessage("");

    const payload = {
      p_email: email,
      p_locale: language,
      p_source: "landing_home",
      p_source_path: currentPath || "/",
      p_referrer: typeof document !== "undefined" ? document.referrer || null : null,
      p_user_agent: typeof navigator !== "undefined" ? navigator.userAgent || null : null,
      p_signup_host: typeof window !== "undefined" ? window.location.host || null : null
    };

    let { data, error } = await supabase.rpc("join_waitlist", payload);
    if (error) {
      const fallbackPayload = {
        email,
        locale: language,
        source: "landing_home",
        source_path: currentPath || "/",
        referrer: typeof document !== "undefined" ? document.referrer || null : null,
        user_agent: typeof navigator !== "undefined" ? navigator.userAgent || null : null,
        signup_host: typeof window !== "undefined" ? window.location.host || null : null
      };
      ({ data, error } = await supabase.from("waitlist_leads").insert(fallbackPayload));
    }

    setIsJoiningWaitlist(false);

    if (error) {
      const isDuplicate = String(error?.code || "") === "23505";
      if (isDuplicate) {
        setWaitlistMessageType("success");
        const text = t("waitlist_join_exists");
        setWaitlistMessage(text);
        showToast(text, "success");
        return;
      }
      console.error("[waitlist] join failed", error);
      setWaitlistMessageType("error");
      const text = t("waitlist_join_error");
      setWaitlistMessage(text);
      showToast(text, "error");
      return;
    }

    const status = Array.isArray(data) ? data[0]?.status : data?.status;
    const text = status === "already_joined" ? t("waitlist_join_exists") : t("waitlist_join_success");
    setWaitlistMessageType("success");
    setWaitlistMessage(text);
    showToast(text, "success");
    setWaitlistEmail("");
  };

  const handleSendContact = async (event) => {
    event.preventDefault();
    const name = String(contactName || "").trim();
    const email = String(contactEmail || "").trim();
    const message = String(contactMessageBody || "").trim();
    if (!name) {
      setContactMessageType("error");
      const text = t("landing_contact_form_name_required");
      setContactMessage(text);
      showToast(text, "error");
      return;
    }
    if (!email) {
      setContactMessageType("error");
      const text = t("landing_contact_form_email_required");
      setContactMessage(text);
      showToast(text, "error");
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setContactMessageType("error");
      const text = t("landing_contact_form_email_invalid");
      setContactMessage(text);
      showToast(text, "error");
      return;
    }
    if (!message) {
      setContactMessageType("error");
      const text = t("landing_contact_form_message_required");
      setContactMessage(text);
      showToast(text, "error");
      return;
    }
    if (!hasSupabaseEnv || !supabase) {
      setContactMessageType("error");
      const text = t("landing_contact_form_error_config");
      setContactMessage(text);
      showToast(text, "error");
      return;
    }

    setIsSendingContact(true);
    setContactMessage("");

    const payload = {
      p_name: name,
      p_email: email,
      p_message: message,
      p_locale: language,
      p_source_path: currentPath || "/contact",
      p_referrer: typeof document !== "undefined" ? document.referrer || null : null,
      p_user_agent: typeof navigator !== "undefined" ? navigator.userAgent || null : null,
      p_signup_host: typeof window !== "undefined" ? window.location.host || null : null
    };

    let { error } = await supabase.rpc("submit_contact_message", payload);
    if (error) {
      const fallbackPayload = {
        name,
        email,
        message,
        locale: language,
        source_path: currentPath || "/contact",
        referrer: typeof document !== "undefined" ? document.referrer || null : null,
        user_agent: typeof navigator !== "undefined" ? navigator.userAgent || null : null,
        signup_host: typeof window !== "undefined" ? window.location.host || null : null
      };
      ({ error } = await supabase.from("contact_messages").insert(fallbackPayload));
    }

    setIsSendingContact(false);
    if (error) {
      console.error("[contact] submit failed", error);
      setContactMessageType("error");
      const text = t("landing_contact_form_error");
      setContactMessage(text);
      showToast(text, "error");
      return;
    }

    setContactName("");
    setContactEmail("");
    setContactMessageBody("");
    setContactMessageType("success");
    const text = t("landing_contact_form_success");
    setContactMessage(text);
    showToast(text, "success");
  };

  const renderWaitlistSection = (sectionId, compact = false) => (
    <section id={sectionId} className={`landing-waitlist ${compact ? "landing-waitlist-compact" : ""}`}>
      <h2 className="landing-waitlist-title">{t("landing_contact_title")}</h2>
      <p className="landing-waitlist-subtitle">{t("landing_contact_subtitle")}</p>
      <form className="landing-waitlist-form" onSubmit={handleJoinWaitlist} noValidate>
        <input
          type="email"
          value={waitlistEmail}
          onChange={(event) => setWaitlistEmail(event.target.value)}
          placeholder={t("placeholder_email")}
          aria-label={t("email")}
          autoComplete="email"
          disabled={isJoiningWaitlist}
        />
        <button className="btn btn-sm" type="submit" disabled={isJoiningWaitlist}>
          {isJoiningWaitlist ? t("waitlist_join_loading") : t("landing_contact_cta")}
        </button>
      </form>
      <p className="landing-waitlist-legal">{t("waitlist_privacy_hint")}</p>
      <InlineMessage type={waitlistMessageType} text={waitlistMessage} />
    </section>
  );

  return (
    <main className="page page-landing">
      <section className="card landing-shell">
        <header className="landing-header">
          <button className="landing-brand" type="button" onClick={() => onNavigate("/")}>
            <BrandMark text={t("app_name")} fallback={t("logo_fallback")} />
            <span>{t("app_name")}</span>
          </button>
          <nav className="landing-nav" aria-label={t("nav_sections")}>
            {NAV_ITEMS.map((item) => (
              <button
                key={item.key}
                className={`landing-nav-link ${currentPath === item.path ? "active" : ""}`}
                type="button"
                onClick={() => onNavigate(item.path)}
              >
                {t(item.labelKey)}
              </button>
            ))}
          </nav>
          <div className="landing-header-actions">
            <Controls
              themeMode={themeMode}
              setThemeMode={setThemeMode}
              language={language}
              setLanguage={setLanguage}
              t={t}
            />
            <button className="btn btn-sm" type="button" onClick={primaryCta.onClick}>
              {primaryCta.label}
            </button>
          </div>
        </header>

        {pageMode === "home" ? (
          <>
            <section className="landing-hero">
              <article className="landing-hero-copy landing-reveal" style={revealStyle(0)}>
                <p className="landing-badge">{t("landing_badge")}</p>
                <h1 className="landing-title">{t("landing_title")}</h1>
                <p className="landing-subtitle">{t("landing_subtitle")}</p>
                <div className="button-row">
                  <button className="btn" type="button" onClick={primaryCta.onClick}>
                    {primaryCta.label}
                  </button>
                  <button className="btn btn-ghost" type="button" onClick={() => onNavigate("/features")}>
                    {t("landing_cta_demo")}
                  </button>
                </div>
              </article>
              <aside className="landing-hero-media landing-reveal" style={revealStyle(1)} aria-hidden="true">
                <div className="landing-hero-media-overlay">
                  <Icon name="sparkle" className="icon" />
                  <p>{t("landing_feature_rsvp_title")}</p>
                </div>
              </aside>
            </section>

            <section id="landing-features" className="landing-section landing-reveal" style={revealStyle(2)}>
              <p className="landing-eyebrow">{t("landing_features_eyebrow")}</p>
              <h2 className="landing-section-title">{t("landing_features_title")}</h2>
              <p className="landing-section-subtitle">{t("landing_features_subtitle")}</p>
              <div className="landing-feature-grid">
                <article className="panel landing-feature-card landing-interactive-card" style={revealStyle(3)}>
                  <span className="landing-feature-icon">
                    <Icon name="calendar" className="icon icon-sm" />
                  </span>
                  <h3>{t("landing_feature_events_title")}</h3>
                  <p>{t("landing_feature_events_desc")}</p>
                </article>
                <article className="panel landing-feature-card landing-interactive-card" style={revealStyle(4)}>
                  <span className="landing-feature-icon">
                    <Icon name="user" className="icon icon-sm" />
                  </span>
                  <h3>{t("landing_feature_guests_title")}</h3>
                  <p>{t("landing_feature_guests_desc")}</p>
                </article>
                <article className="panel landing-feature-card landing-interactive-card" style={revealStyle(5)}>
                  <span className="landing-feature-icon">
                    <Icon name="mail" className="icon icon-sm" />
                  </span>
                  <h3>{t("landing_feature_rsvp_title")}</h3>
                  <p>{t("landing_feature_rsvp_desc")}</p>
                </article>
              </div>
            </section>

            {renderWaitlistSection("landing-cta")}
          </>
        ) : null}

        {pageMode === "features" ? (
          <>
            <section className="landing-page-head landing-reveal" style={revealStyle(0)}>
              <p className="landing-eyebrow">{t("landing_nav_features")}</p>
              <h1 className="landing-section-title">{t("landing_features_title")}</h1>
              <p className="landing-section-subtitle">{t("landing_features_subtitle")}</p>
              <div className="button-row landing-page-head-actions">
                <button className="btn" type="button" onClick={primaryCta.onClick}>
                  {primaryCta.label}
                </button>
                <button className="btn btn-ghost" type="button" onClick={() => onNavigate("/pricing")}>
                  {t("landing_nav_pricing")}
                </button>
              </div>
            </section>
            <section className="landing-section landing-section-page landing-reveal" style={revealStyle(1)}>
              <div className="landing-feature-grid">
                <article className="panel landing-feature-card landing-interactive-card" style={revealStyle(2)}>
                  <span className="landing-feature-icon">
                    <Icon name="calendar" className="icon icon-sm" />
                  </span>
                  <h3>{t("landing_feature_events_title")}</h3>
                  <p>{t("landing_feature_events_desc")}</p>
                </article>
                <article className="panel landing-feature-card landing-interactive-card" style={revealStyle(3)}>
                  <span className="landing-feature-icon">
                    <Icon name="user" className="icon icon-sm" />
                  </span>
                  <h3>{t("landing_feature_guests_title")}</h3>
                  <p>{t("landing_feature_guests_desc")}</p>
                </article>
                <article className="panel landing-feature-card landing-interactive-card" style={revealStyle(4)}>
                  <span className="landing-feature-icon">
                    <Icon name="mail" className="icon icon-sm" />
                  </span>
                  <h3>{t("landing_feature_rsvp_title")}</h3>
                  <p>{t("landing_feature_rsvp_desc")}</p>
                </article>
              </div>
              <div className="landing-feature-summary-grid">
                <article className="panel landing-feature-summary-card landing-interactive-card" style={revealStyle(5)}>
                  <p className="item-title">{t("landing_feature_events_title")}</p>
                  <p className="kpi-value">24</p>
                  <p className="item-meta">{t("latest_events_title")}</p>
                </article>
                <article className="panel landing-feature-summary-card landing-interactive-card" style={revealStyle(6)}>
                  <p className="item-title">{t("landing_feature_guests_title")}</p>
                  <p className="kpi-value">142</p>
                  <p className="item-meta">{t("latest_guests_title")}</p>
                </article>
                <article className="panel landing-feature-summary-card landing-interactive-card" style={revealStyle(7)}>
                  <p className="item-title">{t("landing_feature_rsvp_title")}</p>
                  <p className="kpi-value">67%</p>
                  <p className="item-meta">RSVP</p>
                </article>
              </div>
            </section>
            {renderWaitlistSection("landing-cta", true)}
          </>
        ) : null}

        {pageMode === "pricing" ? (
          <>
            <section className="landing-page-head landing-reveal" style={revealStyle(0)}>
              <p className="landing-eyebrow">{t("landing_nav_pricing")}</p>
              <h1 className="landing-section-title">{t("landing_pricing_title")}</h1>
              <p className="landing-section-subtitle">{t("landing_pricing_subtitle")}</p>
            </section>
            <section className="landing-section landing-section-page landing-reveal" style={revealStyle(1)}>
              <div className="landing-pricing-grid">
                <article className="panel landing-pricing-card landing-interactive-card" style={revealStyle(2)}>
                  <p className="landing-pricing-plan">{t("landing_pricing_card_title")}</p>
                  <p className="landing-pricing-price">{t("landing_pricing_card_price")}</p>
                  <p className="landing-pricing-desc">{t("landing_pricing_card_desc")}</p>
                  <ul className="landing-pricing-list">
                    <li>{t("landing_pricing_feature_1")}</li>
                    <li>{t("landing_pricing_feature_2")}</li>
                    <li>{t("landing_pricing_feature_3")}</li>
                    <li>{t("landing_pricing_feature_4")}</li>
                  </ul>
                  <button className="btn btn-sm" type="button" onClick={primaryCta.onClick}>
                    {primaryCta.label}
                  </button>
                </article>
                <article
                  className="panel landing-pricing-card landing-pricing-card-secondary landing-interactive-card"
                  style={revealStyle(3)}
                >
                  <p className="landing-pricing-plan">{t("public_coming_badge")}</p>
                  <h3>{t("public_coming_title")}</h3>
                  <p className="landing-pricing-desc">{t("public_coming_subtitle")}</p>
                  <ul className="landing-pricing-list">
                    <li>{t("public_coming_point_1")}</li>
                    <li>{t("public_coming_point_2")}</li>
                    <li>{t("public_coming_point_3")}</li>
                  </ul>
                </article>
              </div>
            </section>
            {renderWaitlistSection("landing-cta", true)}
          </>
        ) : null}

        {pageMode === "contact" ? (
          <>
            <section className="landing-page-head landing-reveal" style={revealStyle(0)}>
              <p className="landing-eyebrow">{t("landing_nav_contact")}</p>
              <h1 className="landing-section-title">{t("landing_contact_title")}</h1>
              <p className="landing-section-subtitle">{t("landing_contact_subtitle")}</p>
            </section>
            <section className="landing-section landing-section-page landing-reveal" style={revealStyle(1)}>
              <div className="landing-contact-layout">
                <article className="panel landing-contact-card landing-interactive-card" style={revealStyle(2)}>
                  <h3>{t("landing_contact_channels_title")}</h3>
                  <p>{t("landing_contact_channels_hint")}</p>
                  <div className="landing-contact-channel-list">
                    <p>
                      <strong>{t("landing_contact_channel_email")}:</strong> hello@legoodanfitrion.com
                    </p>
                    <p>
                      <strong>{t("landing_contact_channel_web")}:</strong> https://legoodanfitrion.com
                    </p>
                    <p>
                      <strong>{t("landing_contact_channel_response")}:</strong> {t("landing_contact_channel_response_value")}
                    </p>
                  </div>
                </article>
                <form
                  className="panel form-grid landing-contact-form landing-interactive-card"
                  style={revealStyle(3)}
                  onSubmit={handleSendContact}
                  noValidate
                >
                  <h3>{t("landing_contact_form_title")}</h3>
                  <p className="field-help">{t("landing_contact_form_hint")}</p>
                  <label>
                    <span className="label-title">{t("landing_contact_form_name")}</span>
                    <input
                      type="text"
                      value={contactName}
                      onChange={(event) => setContactName(event.target.value)}
                      placeholder="Alex Martin"
                      disabled={isSendingContact}
                    />
                  </label>
                  <label>
                    <span className="label-title">{t("email")}</span>
                    <input
                      type="email"
                      value={contactEmail}
                      onChange={(event) => setContactEmail(event.target.value)}
                      placeholder={t("placeholder_email")}
                      disabled={isSendingContact}
                    />
                  </label>
                  <label>
                    <span className="label-title">{t("landing_contact_form_message")}</span>
                    <textarea
                      rows={5}
                      value={contactMessageBody}
                      onChange={(event) => setContactMessageBody(event.target.value)}
                      placeholder={t("landing_contact_form_message_placeholder")}
                      disabled={isSendingContact}
                    />
                  </label>
                  <button className="btn btn-sm" type="submit" disabled={isSendingContact}>
                    {isSendingContact ? t("landing_contact_form_submitting") : t("landing_contact_form_submit")}
                  </button>
                  <InlineMessage type={contactMessageType} text={contactMessage} />
                </form>
              </div>
            </section>

            <section className="landing-section landing-section-page landing-reveal" style={revealStyle(2)}>
              <div className="landing-faq-head">
                <h2 className="landing-section-title">{t("landing_faq_title")}</h2>
                <p className="landing-section-subtitle">{t("landing_faq_hint")}</p>
              </div>
              <div className="landing-faq-list">
                {FAQ_ITEMS.map((item) => {
                  const isOpen = openFaqKey === item.key;
                  return (
                    <article
                      key={item.key}
                      className={`panel landing-faq-item landing-interactive-card ${isOpen ? "open" : ""}`}
                      style={revealStyle(3)}
                    >
                      <button
                        type="button"
                        className="landing-faq-question"
                        onClick={() => setOpenFaqKey((prev) => (prev === item.key ? "" : item.key))}
                        aria-expanded={isOpen}
                      >
                        <span>{t(item.questionKey)}</span>
                        <Icon name="chevron_down" className="icon icon-sm" />
                      </button>
                      <div className={`landing-faq-answer-wrap ${isOpen ? "open" : ""}`} aria-hidden={!isOpen}>
                        <p className="landing-faq-answer">{t(item.answerKey)}</p>
                      </div>
                    </article>
                  );
                })}
              </div>
            </section>
          </>
        ) : null}

        <footer id="landing-footer" className="landing-footer">
          <p>© 2026 {t("app_name")}</p>
          <div className="landing-footer-links">
            <button className="landing-footer-link" type="button" onClick={() => onNavigate("/contact")}>
              {t("landing_footer_privacy")}
            </button>
            <button className="landing-footer-link" type="button" onClick={() => onNavigate("/contact")}>
              {t("landing_footer_terms")}
            </button>
            <button className="landing-footer-link" type="button" onClick={() => onNavigate("/contact")}>
              {t("landing_nav_contact")}
            </button>
          </div>
        </footer>
        {toast.visible ? (
          <div className={`landing-toast landing-toast-${toast.type}`} role="status" aria-live="polite">
            <Icon name={toast.type === "error" ? "x" : "check"} className="icon icon-sm" />
            <span>{toast.text}</span>
          </div>
        ) : null}
      </section>
    </main>
  );
}

export { LandingScreen };
