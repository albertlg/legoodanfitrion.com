import { useEffect, useState } from "react";
import { BrandMark } from "../components/brand-mark";
import { Controls } from "../components/controls";
import { Icon } from "../components/icons";
import { InlineMessage } from "../components/inline-message";
import { hasSupabaseEnv, supabase } from "../lib/supabaseClient";

const NAV_ITEMS = [
  { key: "features", path: "/features", labelKey: "landing_nav_features", targetId: "landing-features" },
  { key: "pricing", path: "/pricing", labelKey: "landing_nav_pricing", targetId: "landing-cta" },
  { key: "contact", path: "/contact", labelKey: "landing_nav_contact", targetId: "landing-footer" }
];

const PATH_TO_TARGET = {
  "/features": "landing-features",
  "/pricing": "landing-cta",
  "/contact": "landing-footer"
};

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

  useEffect(() => {
    const targetId = PATH_TO_TARGET[currentPath];
    if (!targetId) {
      return;
    }
    const target = document.getElementById(targetId);
    if (!target) {
      return;
    }
    target.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [currentPath]);

  const primaryCta = session?.user?.id
    ? { label: t("landing_cta_open_app"), onClick: onGoApp }
    : { label: t("landing_cta_start"), onClick: onGoLogin };

  const handleJoinWaitlist = async (event) => {
    event.preventDefault();
    const email = String(waitlistEmail || "").trim();
    if (!email) {
      setWaitlistMessageType("error");
      setWaitlistMessage(t("waitlist_email_required"));
      return;
    }
    const isValidEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
    if (!isValidEmail) {
      setWaitlistMessageType("error");
      setWaitlistMessage(t("waitlist_email_invalid"));
      return;
    }
    if (!hasSupabaseEnv || !supabase) {
      setWaitlistMessageType("error");
      setWaitlistMessage(t("waitlist_join_error_config"));
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
        setWaitlistMessage(t("waitlist_join_exists"));
        return;
      }
      console.error("[waitlist] join failed", error);
      setWaitlistMessageType("error");
      setWaitlistMessage(t("waitlist_join_error"));
      return;
    }

    const status = Array.isArray(data) ? data[0]?.status : data?.status;
    setWaitlistMessageType("success");
    setWaitlistMessage(status === "already_joined" ? t("waitlist_join_exists") : t("waitlist_join_success"));
    setWaitlistEmail("");
  };

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

        <section className="landing-hero">
          <article className="landing-hero-copy">
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
          <aside className="landing-hero-media" aria-hidden="true">
            <div className="landing-hero-media-overlay">
              <Icon name="sparkle" className="icon" />
              <p>{t("landing_feature_rsvp_title")}</p>
            </div>
          </aside>
        </section>

        <section id="landing-features" className="landing-section">
          <p className="landing-eyebrow">{t("landing_features_eyebrow")}</p>
          <h2 className="landing-section-title">{t("landing_features_title")}</h2>
          <p className="landing-section-subtitle">{t("landing_features_subtitle")}</p>
          <div className="landing-feature-grid">
            <article className="panel landing-feature-card">
              <span className="landing-feature-icon">
                <Icon name="calendar" className="icon icon-sm" />
              </span>
              <h3>{t("landing_feature_events_title")}</h3>
              <p>{t("landing_feature_events_desc")}</p>
            </article>
            <article className="panel landing-feature-card">
              <span className="landing-feature-icon">
                <Icon name="user" className="icon icon-sm" />
              </span>
              <h3>{t("landing_feature_guests_title")}</h3>
              <p>{t("landing_feature_guests_desc")}</p>
            </article>
            <article className="panel landing-feature-card">
              <span className="landing-feature-icon">
                <Icon name="mail" className="icon icon-sm" />
              </span>
              <h3>{t("landing_feature_rsvp_title")}</h3>
              <p>{t("landing_feature_rsvp_desc")}</p>
            </article>
          </div>
        </section>

        <section id="landing-cta" className="landing-waitlist">
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
      </section>
    </main>
  );
}

export { LandingScreen };
