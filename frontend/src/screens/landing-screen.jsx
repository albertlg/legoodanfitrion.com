import { useEffect, useRef, useState } from "react";
import { BrandMark } from "../components/brand-mark";
import { Controls } from "../components/controls";
import { Icon } from "../components/icons";
import { InlineMessage } from "../components/inline-message";
import { hasSupabaseEnv, supabase } from "../lib/supabaseClient";
import { Helmet } from "react-helmet-async";

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
  // 🚀 NUEVO: Estado para controlar el menú móvil
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

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

  // 🚀 ESTADOS PARA LA MICRO-DEMO CRO
  const [activeDemoTab, setActiveDemoTab] = useState(0);
  const [mockLinkCopied, setMockLinkCopied] = useState(false);

  // Función para simular el copiado del link
  const handleMockCopy = () => {
    trackEvent("demo_invite_link_copied", { template_index: activeDemoTab }); // <-- NUEVO
    setMockLinkCopied(true);
    setTimeout(() => setMockLinkCopied(false), 2000);
  };

  // 🚀 FIX: Array movido dentro del componente y usando traducciones reales
  const DEMO_TEMPLATES = [
    {
      tabKey: "landing_demo_tab_1",
      title: t("landing_demo_evt1_title"),
      date: t("landing_demo_evt1_date"),
      location: t("landing_demo_evt1_loc"),
      stats: { guests: 18, confirmed: 15, allergies: 2 },
      color: "blue"
    },
    {
      tabKey: "landing_demo_tab_2",
      title: t("landing_demo_evt2_title"),
      date: t("landing_demo_evt2_date"),
      location: t("landing_demo_evt2_loc"),
      stats: { guests: 85, confirmed: 72, allergies: 6 },
      color: "purple"
    },
    {
      tabKey: "landing_demo_tab_3",
      title: t("landing_demo_evt3_title"),
      date: t("landing_demo_evt3_date"),
      location: t("landing_demo_evt3_loc"),
      stats: { guests: 42, confirmed: 38, allergies: 4 },
      color: "green"
    }
  ];

  const activeDemo = DEMO_TEMPLATES[activeDemoTab];

  // 🚀 FASE 3 CRO: Utilidad de Tracking de Eventos
  const trackEvent = (eventName, eventParams = {}) => {
    // Si tienes GA4 configurado en el index.html
    if (typeof window !== "undefined" && window.gtag) {
      window.gtag("event", eventName, eventParams);
    }
    // Si usas otro sistema (ej. dataLayer de Google Tag Manager)
    else if (typeof window !== "undefined" && window.dataLayer) {
      window.dataLayer.push({ event: eventName, ...eventParams });
    }
    // Para depuración local (verás los eventos en tu consola)
    if (import.meta.env.DEV) {
      console.info(`📊 [CRO Track] ${eventName}`, eventParams);
    }
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
    ? {
      label: t("landing_cta_open_app"),
      onClick: () => {
        trackEvent("cta_open_app_click");
        onGoApp();
      }
    }
    : {
      label: t("landing_cta_create_event"),
      onClick: () => {
        trackEvent("cta_create_event_click", { location: "primary_button" });
        onGoLogin();
      }
    };

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
    trackEvent("waitlist_joined", { source_path: currentPath });
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
    trackEvent("contact_form_submitted", { source_path: currentPath });
    showToast(text, "success");
  };

  const renderWaitlistSection = (sectionId, compact = false) => (
    <section id={sectionId} className={`w-full max-w-4xl mx-auto flex flex-col items-center justify-center text-center bg-gradient-to-b from-transparent to-blue-500/5 dark:to-blue-900/10 rounded-t-[3rem] sm:rounded-t-[4rem] border-t border-x border-black/5 dark:border-white/5 shadow-[0_-10px_40px_-15px_rgba(0,0,0,0.05)] dark:shadow-[0_-10px_40px_-15px_rgba(255,255,255,0.02)] ${compact ? "pt-16 pb-20 px-6" : "pt-24 pb-32 px-6"}`}>
      <h2 className={`font-black text-gray-900 dark:text-white tracking-tight mb-4 ${compact ? "text-3xl md:text-4xl" : "text-4xl md:text-5xl"}`}>
        {t("landing_contact_title")}
      </h2>
      <p className="text-lg text-gray-600 dark:text-gray-300 mb-8 max-w-2xl mx-auto">
        {t("landing_contact_subtitle")}
      </p>

      <form className="w-full max-w-md flex flex-col sm:flex-row items-center gap-3 bg-white/60 dark:bg-black/20 p-2 rounded-2xl border border-black/10 dark:border-white/10 shadow-lg backdrop-blur-xl" onSubmit={handleJoinWaitlist} noValidate>
        <input
          className="w-full px-4 py-3 sm:py-0 bg-transparent border-none focus:outline-none focus:ring-0 text-gray-900 dark:text-white placeholder-gray-500"
          type="email"
          value={waitlistEmail}
          onChange={(event) => setWaitlistEmail(event.target.value)}
          placeholder={t("placeholder_email")}
          aria-label={t("email")}
          autoComplete="email"
          disabled={isJoiningWaitlist}
        />
        <button
          className="w-full sm:w-auto bg-gray-900 dark:bg-white text-white dark:text-gray-900 px-6 py-3 rounded-xl font-bold shadow-md hover:scale-[1.02] transition-transform whitespace-nowrap shrink-0 disabled:opacity-50"
          type="submit"
          disabled={isJoiningWaitlist}
        >
          {isJoiningWaitlist ? t("waitlist_join_loading") : t("landing_contact_cta")}
        </button>
      </form>

      <p className="text-[10px] uppercase tracking-wider font-bold text-gray-400 dark:text-gray-500 mt-6 max-w-xs">
        {t("waitlist_privacy_hint")}
      </p>

      {waitlistMessage && (
        <div className="mt-4">
          <InlineMessage type={waitlistMessageType} text={waitlistMessage} />
        </div>
      )}
    </section>
  );

  return (
    <main className="min-h-screen relative bg-gray-50 dark:bg-[#0A0D14] text-gray-900 dark:text-white font-sans selection:bg-blue-200 dark:selection:bg-blue-900 selection:text-blue-900 dark:selection:text-white overflow-hidden flex flex-col">
      {/* 🚀 FIX SEO: Inyección dinámica de metadatos según el idioma */}
      <Helmet htmlAttributes={{ lang: language }}>
        <title>{t("seo_title")}</title>
        <meta name="description" content={t("seo_desc")} />

        {/* Open Graph Dinámico */}
        <meta property="og:title" content={t("seo_title")} />
        <meta property="og:description" content={t("seo_desc")} />

        {/* Twitter Card Dinámico */}
        <meta name="twitter:title" content={t("seo_title")} />
        <meta name="twitter:description" content={t("seo_desc")} />
      </Helmet>

      {/* Decorative Blobs (Background) */}
      <div className="fixed top-[-10%] right-[-5%] w-[400px] md:w-[600px] h-[400px] md:h-[600px] bg-blue-500/20 dark:bg-blue-600/10 rounded-full mix-blend-multiply filter blur-[80px] md:blur-[120px] opacity-70 pointer-events-none z-0"></div>
      <div className="fixed bottom-[-10%] left-[-5%] w-[400px] md:w-[600px] h-[400px] md:h-[600px] bg-purple-500/20 dark:bg-purple-600/10 rounded-full mix-blend-multiply filter blur-[80px] md:blur-[120px] opacity-70 pointer-events-none z-0"></div>

      {/* HEADER (Sticky) */}
      <header className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-6 py-4 bg-white/70 dark:bg-[#0A0D14]/70 backdrop-blur-xl border-b border-black/5 dark:border-white/5">
        <div className="flex items-center gap-6">
          <button className="flex items-center gap-2 hover:opacity-80 transition-opacity outline-none" type="button" onClick={() => onNavigate("/")}>
            <BrandMark text="" fallback={t("logo_fallback")} className="w-8 h-8" />
            {/* 🚀 FIX: Quitamos hidden sm:block para que se vea siempre en móvil */}
            <span className="font-black text-lg tracking-tight">{t("app_name")}</span>
          </button>

          {/* Navegación Desktop */}
          <nav className="hidden md:flex items-center gap-1" aria-label={t("nav_sections")}>
            {NAV_ITEMS.map((item) => (
              <button
                key={item.key}
                className={`px-4 py-2 rounded-full text-sm font-bold transition-all ${currentPath === item.path ? "bg-black/5 dark:bg-white/10 text-gray-900 dark:text-white" : "text-gray-500 hover:text-gray-900 hover:bg-black/5 dark:text-gray-400 dark:hover:text-white dark:hover:bg-white/5"}`}
                type="button"
                onClick={() => onNavigate(item.path)}
              >
                {t(item.labelKey)}
              </button>
            ))}
          </nav>
        </div>

        <div className="flex items-center gap-3 sm:gap-4">
          {/* Controles Desktop */}
          <div className="hidden md:block">
            <Controls themeMode={themeMode} setThemeMode={setThemeMode} language={language} setLanguage={setLanguage} t={t} dropdownDirection="down" />
          </div>

          <button
            className="hidden sm:block bg-gray-900 dark:bg-white text-white dark:text-gray-900 px-5 py-2.5 rounded-full font-bold text-sm shadow-md hover:scale-[1.02] transition-transform"
            type="button"
            onClick={primaryCta.onClick}
          >
            {primaryCta.label}
          </button>

          {/* 🚀 NUEVO: Botón Hamburguesa (Solo Móvil) */}
          <button
            className="md:hidden p-2 -mr-2 rounded-xl text-gray-600 dark:text-gray-300 hover:bg-black/5 dark:hover:bg-white/10 transition-colors outline-none focus:ring-2 focus:ring-blue-500/50"
            onClick={() => setIsMobileMenuOpen(true)}
            aria-label="Menú"
          >
            <Icon name="menu" className="w-6 h-6" />
          </button>
        </div>
      </header>

      {/* 🚀 NUEVO: Drawer Menú Móvil (Glassmorphism) */}
      <div
        className={`fixed inset-0 z-[100] transition-opacity duration-300 md:hidden backdrop-blur-sm bg-black/40 dark:bg-black/70 ${isMobileMenuOpen ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"}`}
        onClick={() => setIsMobileMenuOpen(false)}
        aria-hidden="true"
      />
      <aside
        className={`fixed inset-y-0 right-0 h-full w-72 z-[101] transform transition-transform duration-300 flex flex-col md:hidden backdrop-blur-2xl bg-white/95 dark:bg-[#0A0D14]/95 border-l border-gray-200 dark:border-white/10 shadow-2xl ${isMobileMenuOpen ? "translate-x-0" : "translate-x-full"}`}
        aria-hidden={!isMobileMenuOpen}
        inert={!isMobileMenuOpen ? "" : undefined}
      >
        <div className="flex items-center justify-between px-5 pt-6 pb-4 border-b border-black/5 dark:border-white/5">
          <BrandMark text="" fallback={t("logo_fallback")} className="w-6 h-6" />
          <button className="p-1.5 -mr-1.5 rounded-lg text-gray-500 hover:text-black hover:bg-gray-100 dark:hover:bg-white/5 dark:text-gray-400 dark:hover:text-white transition-colors" onClick={() => setIsMobileMenuOpen(false)}>
            <Icon name="x" className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-4 py-6 flex flex-col gap-2">
          {NAV_ITEMS.map((item) => (
            <button
              key={`mob-${item.key}`}
              className={`flex items-center w-full px-4 py-3.5 rounded-2xl text-base font-bold transition-all ${currentPath === item.path ? "bg-black/5 dark:bg-white/10 text-gray-900 dark:text-white" : "text-gray-600 hover:bg-black/5 dark:text-gray-300 dark:hover:bg-white/5"}`}
              onClick={() => {
                onNavigate(item.path);
                setIsMobileMenuOpen(false);
              }}
            >
              {t(item.labelKey)}
            </button>
          ))}

          <div className="mt-4 pt-6 border-t border-black/5 dark:border-white/5 flex flex-col gap-6">
            <button
              className="w-full bg-gray-900 dark:bg-white text-white dark:text-gray-900 px-6 py-4 rounded-2xl font-black text-base shadow-lg hover:scale-[1.02] transition-transform"
              onClick={() => {
                primaryCta.onClick();
                setIsMobileMenuOpen(false);
              }}
            >
              {primaryCta.label}
            </button>
            <div className="flex justify-center">
              {/* Controles en móvil */}
              <Controls themeMode={themeMode} setThemeMode={setThemeMode} language={language} setLanguage={setLanguage} t={t} />
            </div>
          </div>
        </div>
      </aside>

      {/* MAIN CONTENT WRAPPER */}
      <div className="flex-1 relative z-10 flex flex-col pt-24 md:pt-32">

        {/* --- PAGE: HOME --- */}
        {pageMode === "home" ? (
          <>
            <section className="flex flex-col justify-center items-center text-center px-6 min-h-[75vh] max-w-5xl mx-auto w-full animate-in fade-in slide-in-from-bottom-8 duration-700">

              {/* 🚀 FIX SEO: Este es ahora el H1 real para los motores de búsqueda */}
              <h1 className="px-4 py-1.5 bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400 border border-blue-200 dark:border-blue-800/30 rounded-full text-[10px] font-black uppercase tracking-widest mb-8 shadow-sm">
                {t("landing_badge")}
              </h1>

              {/* 🚀 FIX CRO: Este es el gancho visual gigante, pero a nivel semántico es un simple párrafo o H2 */}
              <p className="text-5xl md:text-7xl lg:text-[5.5rem] font-black tracking-tighter text-gray-900 dark:text-white leading-[1.05] mb-6 max-w-4xl text-balance">
                {t("landing_title")}
              </p>

              <p className="text-lg md:text-xl text-gray-600 dark:text-gray-300 mb-10 max-w-2xl mx-auto font-medium leading-relaxed text-balance">
                {t("landing_subtitle")}
              </p>

              {/* 🚀 FIX CRO: CTAs mejorados y Microcopy */}
              <div className="flex flex-col items-center gap-4 w-full sm:w-auto mt-2">
                <div className="flex flex-col sm:flex-row items-center justify-center gap-4 w-full sm:w-auto">
                  <button
                    className="w-full sm:w-auto bg-gray-900 dark:bg-white text-white dark:text-gray-900 px-8 py-4 rounded-xl font-black text-lg shadow-xl hover:scale-[1.02] transition-transform flex items-center justify-center gap-2"
                    type="button"
                    onClick={primaryCta.onClick}
                  >
                    <Icon name="sparkle" className="w-5 h-5" />
                    {primaryCta.label}
                  </button>
                  <button
                    className="w-full sm:w-auto bg-white/50 dark:bg-black/20 border border-black/10 dark:border-white/10 px-8 py-4 rounded-xl font-bold text-lg hover:bg-white/80 dark:hover:bg-white/5 transition-all text-gray-900 dark:text-white shadow-sm flex items-center justify-center gap-2"
                    type="button"
                    onClick={() => onNavigate("/features")}
                  >
                    <Icon name="eye" className="w-5 h-5 opacity-70" />
                    {t("landing_cta_demo_real")}
                  </button>
                </div>

                {/* Microcopy de seguridad para reducir fricción */}
                <p className="text-sm font-bold text-gray-500 dark:text-gray-400 flex items-center justify-center gap-2 mt-2">
                  <Icon name="check" className="w-4 h-4 text-green-500" />
                  {t("landing_hero_microcopy")}
                </p>
              </div>

              {/* 🚀 FIX CRO: Bloque de confianza (Señales de 0 fricción) */}
              <div className="flex flex-wrap items-center justify-center gap-x-8 gap-y-4 mt-12 pt-8 border-t border-black/5 dark:border-white/5 w-full max-w-3xl mx-auto opacity-90">
                <div className="flex items-center gap-2 text-sm font-bold text-gray-600 dark:text-gray-300">
                  <div className="w-8 h-8 rounded-full bg-black/5 dark:bg-white/10 flex items-center justify-center"><Icon name="phone" className="w-4 h-4" /></div>
                  {t("landing_trust_1")}
                </div>
                <div className="flex items-center gap-2 text-sm font-bold text-gray-600 dark:text-gray-300">
                  <div className="w-8 h-8 rounded-full bg-black/5 dark:bg-white/10 flex items-center justify-center"><Icon name="check" className="w-4 h-4" /></div>
                  {t("landing_trust_2")}
                </div>
                <div className="flex items-center gap-2 text-sm font-bold text-gray-600 dark:text-gray-300">
                  <div className="w-8 h-8 rounded-full bg-black/5 dark:bg-white/10 flex items-center justify-center"><Icon name="user" className="w-4 h-4" /></div>
                  {t("landing_trust_3")}
                </div>
              </div>

              {/* Decorative Hero Image/Mockup */}
              <div className="w-full mt-16 md:mt-24 aspect-video sm:aspect-[21/9] bg-gray-200 dark:bg-gray-800 border-t border-x border-black/5 dark:border-white/10 rounded-t-3xl sm:rounded-t-[3rem] shadow-2xl relative overflow-hidden group">
                <img
                  src="https://images.unsplash.com/photo-1527529482837-4698179dc6ce?auto=format&fit=crop&w=1600&q=80"
                  alt="LeGoodAnfitrión App Preview"
                  className="w-full h-full object-cover object-center transition-transform duration-1000 group-hover:scale-105"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-gray-50 dark:from-[#0A0D14] via-transparent to-transparent"></div>
              </div>
            </section>

            {/*
            <section id="landing-features" className="py-24 px-6 w-full max-w-7xl mx-auto flex flex-col items-center">
              <div className="text-center max-w-3xl mb-16">
                <p className="text-[10px] font-bold uppercase tracking-widest text-blue-600 dark:text-blue-400 mb-3">{t("landing_features_eyebrow")}</p>
                <h2 className="text-4xl md:text-5xl font-black tracking-tight text-gray-900 dark:text-white mb-6 leading-tight">{t("landing_features_title")}</h2>
                <p className="text-lg text-gray-600 dark:text-gray-300 font-medium">{t("landing_features_subtitle")}</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 w-full">
                <article className="bg-white/50 dark:bg-white/5 backdrop-blur-sm rounded-3xl border border-black/5 dark:border-white/10 shadow-sm p-8 hover:-translate-y-1 hover:shadow-xl transition-all cursor-pointer group">
                  <div className="w-12 h-12 rounded-2xl bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                    <Icon name="calendar" className="w-6 h-6" />
                  </div>
                  <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-3">{t("landing_feature_events_title")}</h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">{t("landing_feature_events_desc")}</p>
                </article>
                <article className="bg-white/50 dark:bg-white/5 backdrop-blur-sm rounded-3xl border border-black/5 dark:border-white/10 shadow-sm p-8 hover:-translate-y-1 hover:shadow-xl transition-all cursor-pointer group">
                  <div className="w-12 h-12 rounded-2xl bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                    <Icon name="user" className="w-6 h-6" />
                  </div>
                  <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-3">{t("landing_feature_guests_title")}</h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">{t("landing_feature_guests_desc")}</p>
                </article>
                <article className="bg-white/50 dark:bg-white/5 backdrop-blur-sm rounded-3xl border border-black/5 dark:border-white/10 shadow-sm p-8 hover:-translate-y-1 hover:shadow-xl transition-all cursor-pointer group">
                  <div className="w-12 h-12 rounded-2xl bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                    <Icon name="mail" className="w-6 h-6" />
                  </div>
                  <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-3">{t("landing_feature_rsvp_title")}</h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">{t("landing_feature_rsvp_desc")}</p>
                </article>
              </div>
            </section>
            */}
            {/* 🚀 NUEVA SECCIÓN CRO: Antes / Después */}
            <section id="landing-features" className="py-24 px-6 w-full max-w-6xl mx-auto flex flex-col items-center">
              <div className="text-center max-w-3xl mb-16">
                <p className="text-[10px] font-bold uppercase tracking-widest text-blue-600 dark:text-blue-400 mb-3">{t("landing_vs_eyebrow")}</p>
                <h2 className="text-4xl md:text-5xl font-black tracking-tight text-gray-900 dark:text-white mb-6 leading-tight text-balance">{t("landing_vs_title")}</h2>
                <p className="text-lg text-gray-600 dark:text-gray-300 font-medium text-balance">{t("landing_vs_subtitle")}</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-8 md:gap-12 w-full items-stretch">

                {/* ❌ EL ANTES (Caos) */}
                <article className="bg-red-50/50 dark:bg-red-950/20 backdrop-blur-sm rounded-3xl border border-red-100 dark:border-red-900/30 p-8 flex flex-col relative overflow-hidden group">
                  <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-red-400 to-red-500 opacity-80"></div>

                  <div className="flex items-center gap-4 mb-8">
                    <div className="w-12 h-12 shrink-0 rounded-2xl bg-red-100 dark:bg-red-900/40 text-red-600 dark:text-red-400 flex items-center justify-center">
                      <Icon name="x" className="w-6 h-6" />
                    </div>
                    <h3 className="text-xl font-bold text-gray-900 dark:text-white leading-tight">
                      {t("landing_vs_before_title")}
                    </h3>
                  </div>

                  <ul className="flex flex-col gap-5 text-gray-700 dark:text-gray-300">
                    {[1, 2, 3, 4].map((num) => (
                      <li key={`before-${num}`} className="flex items-start gap-3">
                        <Icon name="x" className="w-5 h-5 text-red-400 dark:text-red-500 shrink-0 mt-0.5" />
                        <span className="font-medium">{t(`landing_vs_before_${num}`)}</span>
                      </li>
                    ))}
                  </ul>
                </article>

                {/* ✅ EL DESPUÉS (Paz mental) */}
                <article className="bg-white/70 dark:bg-white/5 backdrop-blur-xl rounded-3xl border border-black/10 dark:border-white/10 shadow-2xl p-8 flex flex-col relative overflow-hidden transform md:-translate-y-4">
                  <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-blue-500 to-purple-500"></div>

                  <div className="flex items-center gap-4 mb-8">
                    <div className="w-12 h-12 shrink-0 rounded-2xl bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400 flex items-center justify-center shadow-inner">
                      <Icon name="sparkle" className="w-6 h-6" />
                    </div>
                    <h3 className="text-xl font-black text-gray-900 dark:text-white leading-tight">
                      {t("landing_vs_after_title")}
                    </h3>
                  </div>

                  <ul className="flex flex-col gap-5 text-gray-900 dark:text-gray-100">
                    {[1, 2, 3, 4].map((num) => (
                      <li key={`after-${num}`} className="flex items-start gap-3">
                        <div className="w-5 h-5 rounded-full bg-green-500/20 flex items-center justify-center shrink-0 mt-0.5">
                          <Icon name="check" className="w-3.5 h-3.5 text-green-600 dark:text-green-400" />
                        </div>
                        <span className="font-bold">{t(`landing_vs_after_${num}`)}</span>
                      </li>
                    ))}
                  </ul>

                  {/* Micro-CTA dentro de la tarjeta de éxito */}
                  <div className="mt-8 pt-6 border-t border-black/5 dark:border-white/10">
                    <button
                      className="w-full bg-gray-900 dark:bg-white text-white dark:text-gray-900 px-6 py-3.5 rounded-xl font-bold text-sm shadow-md hover:scale-[1.02] transition-transform flex items-center justify-center gap-2"
                      type="button"
                      onClick={primaryCta.onClick}
                    >
                      {t("landing_cta_create_event")} <Icon name="arrow_left" className="w-4 h-4 rotate-180" />
                    </button>
                  </div>
                </article>

              </div>
            </section>

            {/* 🚀 NUEVA SECCIÓN CRO: Micro-Demo Interactiva (UI Simulada) */}
            <section className="py-24 px-6 w-full max-w-5xl mx-auto flex flex-col items-center overflow-hidden">
              <div className="text-center max-w-3xl mb-12">
                <p className="text-[10px] font-bold uppercase tracking-widest text-purple-600 dark:text-purple-400 mb-3">{t("landing_demo_eyebrow")}</p>
                <h2 className="text-3xl md:text-5xl font-black tracking-tight text-gray-900 dark:text-white mb-6 text-balance">{t("landing_demo_title")}</h2>
                <p className="text-lg text-gray-600 dark:text-gray-300 font-medium text-balance">{t("landing_demo_subtitle")}</p>
              </div>

              {/* Pestañas de Selección */}
              <div className="flex flex-wrap items-center justify-center gap-2 mb-8 bg-black/5 dark:bg-white/5 p-1.5 rounded-2xl md:rounded-full">
                {DEMO_TEMPLATES.map((template, index) => {
                  const isActive = activeDemoTab === index;
                  return (
                    <button
                      key={index}
                      className={`px-5 py-2.5 rounded-xl md:rounded-full text-sm font-bold transition-all outline-none focus:ring-2 focus:ring-${template.color}-500/50 ${isActive
                        ? "bg-white dark:bg-gray-800 text-gray-900 dark:text-white shadow-md scale-105"
                        : "text-gray-600 dark:text-gray-400 hover:bg-black/5 dark:hover:bg-white/5 hover:text-gray-900 dark:hover:text-white"
                        }`}
                      onClick={() => {
                        setActiveDemoTab(index);
                        trackEvent("demo_template_selected", { template_index: index, template_name: template.tabKey });
                      }}
                      aria-pressed={isActive}
                    >
                      {t(template.tabKey)}
                    </button>
                  );
                })}
              </div>

              {/* 💻 Ventana de la UI Simulada */}
              <div className="w-full max-w-3xl bg-white/80 dark:bg-[#1A1D24]/80 backdrop-blur-2xl border border-black/10 dark:border-white/10 rounded-3xl shadow-2xl overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-500">
                {/* Cabecera del Panel (Fake Header) */}
                <div className="px-6 py-4 border-b border-black/5 dark:border-white/5 flex items-center justify-between bg-gray-50/50 dark:bg-black/20">
                  <div className="flex items-center gap-3">
                    <div className="flex gap-1.5">
                      <div className="w-3 h-3 rounded-full bg-red-400/80"></div>
                      <div className="w-3 h-3 rounded-full bg-yellow-400/80"></div>
                      <div className="w-3 h-3 rounded-full bg-green-400/80"></div>
                    </div>
                    <span className="text-xs font-bold text-gray-400 dark:text-gray-500 tracking-wider">LeGoodAnfitrión Panel</span>
                  </div>
                </div>

                {/* Contenido Dinámico de la Demo (Cambia al hacer clic en las pestañas) */}
                <div key={activeDemoTab} className="p-5 md:p-10 animate-in fade-in zoom-in-95 duration-300">

                  {/* Título y Meta del Evento Simulado */}
                  <div className="flex flex-col md:flex-row md:items-start justify-between gap-4 mb-8">
                    <div>
                      <h3 className="text-2xl md:text-3xl font-black text-gray-900 dark:text-white tracking-tight mb-3">
                        {activeDemo.title}
                      </h3>
                      <div className="flex flex-wrap items-center gap-3 text-sm font-medium text-gray-600 dark:text-gray-400">
                        <span className="flex items-center gap-1.5"><Icon name="calendar" className="w-4 h-4 shrink-0" /> {activeDemo.date}</span>
                        <span className="flex items-center gap-1.5"><Icon name="location" className="w-4 h-4 shrink-0" /> {activeDemo.location}</span>
                      </div>
                    </div>
                    {/* 🚀 FIX: w-max y self-start para que no se estire en móvil */}
                    <span className={`w-max self-start md:self-center px-3 py-1 bg-${activeDemo.color}-100 text-${activeDemo.color}-800 dark:bg-${activeDemo.color}-900/30 dark:text-${activeDemo.color}-400 rounded-lg text-xs font-bold uppercase tracking-wider border border-${activeDemo.color}-200 dark:border-${activeDemo.color}-800/30`}>
                      {t("landing_demo_mock_status_active")}
                    </span>
                  </div>

                  {/* 🚀 FIX: Kpis / Stats rediseñados para no reventar en móvil */}
                  <div className="grid grid-cols-3 gap-2 sm:gap-4 mb-8 md:mb-10">
                    <div className="bg-black/5 dark:bg-white/5 rounded-2xl p-3 sm:p-4 border border-black/5 dark:border-white/5 min-w-0 flex flex-col items-center sm:items-start text-center sm:text-left">
                      <p className="text-[9px] sm:text-xs font-bold uppercase tracking-wider text-gray-500 mb-1 w-full truncate">{t("landing_demo_mock_guests")}</p>
                      <p className="text-2xl sm:text-3xl font-black text-gray-900 dark:text-white">{activeDemo.stats.guests}</p>
                    </div>
                    <div className="bg-green-50 dark:bg-green-900/20 rounded-2xl p-3 sm:p-4 border border-green-100 dark:border-green-800/30 min-w-0 flex flex-col items-center sm:items-start text-center sm:text-left">
                      <p className="text-[9px] sm:text-xs font-bold uppercase tracking-wider text-green-700 dark:text-green-400 mb-1 w-full truncate">{t("landing_demo_mock_confirmed")}</p>
                      <p className="text-2xl sm:text-3xl font-black text-green-700 dark:text-green-400 flex items-center justify-center sm:justify-start gap-1 sm:gap-2">
                        {activeDemo.stats.confirmed} <Icon name="check" className="w-4 h-4 sm:w-5 sm:h-5 hidden sm:block" />
                      </p>
                    </div>
                    <div className="bg-orange-50 dark:bg-orange-900/20 rounded-2xl p-3 sm:p-4 border border-orange-100 dark:border-orange-800/30 min-w-0 flex flex-col items-center sm:items-start text-center sm:text-left">
                      <p className="text-[9px] sm:text-xs font-bold uppercase tracking-wider text-orange-700 dark:text-orange-400 mb-1 w-full truncate">{t("landing_demo_mock_allergies")}</p>
                      <p className="text-2xl sm:text-3xl font-black text-orange-700 dark:text-orange-400">{activeDemo.stats.allergies}</p>
                    </div>
                  </div>

                  {/* Botones de Acción de la Fake UI */}
                  <div className="flex flex-col sm:flex-row items-center gap-3 md:gap-4 pt-6 border-t border-black/5 dark:border-white/5">
                    <button
                      className="w-full sm:w-auto flex-1 bg-white dark:bg-gray-800 border border-black/10 dark:border-white/10 text-gray-900 dark:text-white px-5 py-3 rounded-xl font-bold text-sm shadow-sm hover:bg-gray-50 dark:hover:bg-gray-700 transition-all flex items-center justify-center gap-2 outline-none focus:ring-2 focus:ring-blue-500/50"
                      onClick={handleMockCopy}
                    >
                      {mockLinkCopied ? (
                        <><Icon name="check" className="w-4 h-4 text-green-500" /> <span className="text-green-600 dark:text-green-400">{t("landing_demo_mock_copied")}</span></>
                      ) : (
                        <><Icon name="link" className="w-4 h-4" /> {t("landing_demo_mock_copy_link")}</>
                      )}
                    </button>

                    {/* Este sí es un botón real que lleva al registro */}
                    <button
                      className="w-full sm:w-auto flex-1 bg-blue-600 hover:bg-blue-700 text-white px-5 py-3 rounded-xl font-bold text-sm shadow-md shadow-blue-500/20 transition-all flex items-center justify-center gap-2 outline-none focus:ring-2 focus:ring-blue-500/50"
                      onClick={primaryCta.onClick}
                    >
                      <Icon name="sparkle" className="w-4 h-4" /> {t("landing_demo_mock_cta")}
                    </button>
                  </div>

                </div>
              </div>
            </section>

            {renderWaitlistSection("landing-cta")}
          </>
        ) : null}

        {/* --- PAGE: FEATURES --- */}
        {pageMode === "features" ? (
          <>
            <section className="pt-24 pb-16 px-6 max-w-4xl mx-auto text-center animate-in fade-in slide-in-from-bottom-8 duration-500">
              <p className="text-[10px] font-bold uppercase tracking-widest text-blue-600 dark:text-blue-400 mb-4">{t("landing_nav_features")}</p>
              <h1 className="text-4xl md:text-6xl font-black tracking-tight text-gray-900 dark:text-white mb-6 leading-tight">{t("landing_features_title")}</h1>
              <p className="text-lg md:text-xl text-gray-600 dark:text-gray-300 mb-10 max-w-2xl mx-auto">{t("landing_features_subtitle")}</p>
              <div className="flex flex-col sm:flex-row justify-center gap-4">
                <button className="bg-gray-900 dark:bg-white text-white dark:text-gray-900 px-8 py-4 rounded-xl font-bold text-lg shadow-lg hover:scale-[1.02] transition-transform" type="button" onClick={primaryCta.onClick}>
                  {primaryCta.label}
                </button>
                <button className="bg-white/50 dark:bg-black/20 border border-black/10 dark:border-white/10 px-8 py-4 rounded-xl font-bold text-lg hover:bg-white/80 dark:hover:bg-white/5 transition-all text-gray-900 dark:text-white shadow-sm" type="button" onClick={() => onNavigate("/pricing")}>
                  {t("landing_nav_pricing")}
                </button>
              </div>
            </section>

            <section className="py-12 px-6 w-full max-w-7xl mx-auto flex flex-col gap-12">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <article className="bg-white/50 dark:bg-white/5 backdrop-blur-sm rounded-3xl border border-black/5 dark:border-white/10 shadow-sm p-8">
                  <div className="w-12 h-12 rounded-2xl bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 flex items-center justify-center mb-6">
                    <Icon name="calendar" className="w-6 h-6" />
                  </div>
                  <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-3">{t("landing_feature_events_title")}</h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400">{t("landing_feature_events_desc")}</p>
                </article>
                <article className="bg-white/50 dark:bg-white/5 backdrop-blur-sm rounded-3xl border border-black/5 dark:border-white/10 shadow-sm p-8">
                  <div className="w-12 h-12 rounded-2xl bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 flex items-center justify-center mb-6">
                    <Icon name="user" className="w-6 h-6" />
                  </div>
                  <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-3">{t("landing_feature_guests_title")}</h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400">{t("landing_feature_guests_desc")}</p>
                </article>
                <article className="bg-white/50 dark:bg-white/5 backdrop-blur-sm rounded-3xl border border-black/5 dark:border-white/10 shadow-sm p-8">
                  <div className="w-12 h-12 rounded-2xl bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400 flex items-center justify-center mb-6">
                    <Icon name="mail" className="w-6 h-6" />
                  </div>
                  <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-3">{t("landing_feature_rsvp_title")}</h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400">{t("landing_feature_rsvp_desc")}</p>
                </article>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <article className="bg-blue-600 rounded-3xl shadow-lg p-8 flex flex-col items-center text-center justify-center text-white">
                  <p className="text-sm font-bold uppercase tracking-widest opacity-80 mb-2">{t("landing_feature_events_title")}</p>
                  <p className="text-6xl font-black mb-1">24</p>
                  <p className="text-xs font-medium opacity-90">{t("latest_events_title")}</p>
                </article>
                <article className="bg-purple-600 rounded-3xl shadow-lg p-8 flex flex-col items-center text-center justify-center text-white">
                  <p className="text-sm font-bold uppercase tracking-widest opacity-80 mb-2">{t("landing_feature_guests_title")}</p>
                  <p className="text-6xl font-black mb-1">142</p>
                  <p className="text-xs font-medium opacity-90">{t("latest_guests_title")}</p>
                </article>
                <article className="bg-green-600 rounded-3xl shadow-lg p-8 flex flex-col items-center text-center justify-center text-white">
                  <p className="text-sm font-bold uppercase tracking-widest opacity-80 mb-2">{t("landing_feature_rsvp_title")}</p>
                  <p className="text-6xl font-black mb-1">67%</p>
                  <p className="text-xs font-medium opacity-90">RSVP Rate</p>
                </article>
              </div>
            </section>

            {renderWaitlistSection("landing-cta", true)}
          </>
        ) : null}

        {/* --- PAGE: PRICING --- */}
        {pageMode === "pricing" ? (
          <>
            <section className="pt-24 pb-16 px-6 max-w-4xl mx-auto text-center animate-in fade-in slide-in-from-bottom-8 duration-500">
              <p className="text-[10px] font-bold uppercase tracking-widest text-purple-600 dark:text-purple-400 mb-4">{t("landing_nav_pricing")}</p>
              <h1 className="text-4xl md:text-6xl font-black tracking-tight text-gray-900 dark:text-white mb-6 leading-tight">{t("landing_pricing_title")}</h1>
              <p className="text-lg md:text-xl text-gray-600 dark:text-gray-300 max-w-2xl mx-auto">{t("landing_pricing_subtitle")}</p>
            </section>

            <section className="py-12 px-6 w-full max-w-5xl mx-auto">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-start">

                {/* Plan Principal */}
                <article className="bg-white dark:bg-gray-900 border border-black/10 dark:border-white/10 rounded-3xl shadow-2xl p-8 md:p-10 flex flex-col relative overflow-hidden">
                  <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-blue-500 to-purple-500"></div>
                  <p className="text-sm font-bold uppercase tracking-widest text-gray-500 dark:text-gray-400 mb-2">{t("landing_pricing_card_title")}</p>
                  <p className="text-5xl font-black text-gray-900 dark:text-white mb-4">{t("landing_pricing_card_price")}</p>
                  <p className="text-sm text-gray-600 dark:text-gray-300 mb-8 font-medium">{t("landing_pricing_card_desc")}</p>

                  <ul className="flex flex-col gap-4 mb-10 flex-1">
                    {[1, 2, 3, 4].map((num) => (
                      <li key={num} className="flex items-start gap-3">
                        <Icon name="check" className="w-5 h-5 text-green-500 shrink-0" />
                        <span className="text-sm font-medium text-gray-700 dark:text-gray-200">{t(`landing_pricing_feature_${num}`)}</span>
                      </li>
                    ))}
                  </ul>

                  <button className="w-full bg-gray-900 dark:bg-white text-white dark:text-gray-900 px-6 py-4 rounded-xl font-bold text-lg shadow-lg hover:scale-[1.02] transition-transform" type="button" onClick={primaryCta.onClick}>
                    {primaryCta.label}
                  </button>
                </article>

                {/* Plan Futuro */}
                <article className="bg-white/40 dark:bg-white/5 backdrop-blur-xl border border-black/5 dark:border-white/5 rounded-3xl shadow-sm p-8 md:p-10 flex flex-col opacity-90">
                  <span className="w-max px-3 py-1 bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400 rounded-full text-[10px] font-bold uppercase tracking-widest mb-4 border border-yellow-200 dark:border-yellow-800/30 shadow-sm">
                    {t("public_coming_badge")}
                  </span>
                  <h3 className="text-2xl font-black text-gray-900 dark:text-white mb-2">{t("public_coming_title")}</h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-8">{t("public_coming_subtitle")}</p>

                  <ul className="flex flex-col gap-4 text-gray-500 dark:text-gray-500">
                    {[1, 2, 3].map((num) => (
                      <li key={num} className="flex items-start gap-3">
                        <Icon name="sparkle" className="w-5 h-5 shrink-0" />
                        <span className="text-sm">{t(`public_coming_point_${num}`)}</span>
                      </li>
                    ))}
                  </ul>
                </article>

              </div>
            </section>

            {renderWaitlistSection("landing-cta", true)}
          </>
        ) : null}

        {/* --- PAGE: CONTACT --- */}
        {pageMode === "contact" ? (
          <>
            <section className="pt-24 pb-16 px-6 max-w-4xl mx-auto text-center animate-in fade-in slide-in-from-bottom-8 duration-500">
              <p className="text-[10px] font-bold uppercase tracking-widest text-green-600 dark:text-green-400 mb-4">{t("landing_nav_contact")}</p>
              <h1 className="text-4xl md:text-6xl font-black tracking-tight text-gray-900 dark:text-white mb-6 leading-tight">{t("landing_contact_title")}</h1>
              <p className="text-lg md:text-xl text-gray-600 dark:text-gray-300 max-w-2xl mx-auto">{t("landing_contact_subtitle")}</p>
            </section>

            <section className="py-12 px-6 w-full max-w-5xl mx-auto">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-start">

                <article className="bg-white/50 dark:bg-white/5 backdrop-blur-xl border border-black/5 dark:border-white/10 rounded-3xl shadow-sm p-8 md:p-10 flex flex-col gap-6">
                  <div className="flex flex-col gap-2">
                    <h3 className="text-2xl font-black text-gray-900 dark:text-white">{t("landing_contact_channels_title")}</h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400">{t("landing_contact_channels_hint")}</p>
                  </div>

                  <div className="flex flex-col gap-4 mt-2">
                    <div className="flex flex-col gap-1 p-4 bg-white/40 dark:bg-black/20 rounded-xl border border-black/5 dark:border-white/5">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-gray-500">{t("landing_contact_channel_email")}</span>
                      <a href="mailto:hello@legoodanfitrion.com" className="text-base font-bold text-blue-600 dark:text-blue-400 hover:underline">hello@legoodanfitrion.com</a>
                    </div>
                    <div className="flex flex-col gap-1 p-4 bg-white/40 dark:bg-black/20 rounded-xl border border-black/5 dark:border-white/5">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-gray-500">{t("landing_contact_channel_web")}</span>
                      <a href="https://legoodanfitrion.com" className="text-base font-bold text-gray-900 dark:text-white hover:underline">legoodanfitrion.com</a>
                    </div>
                    <div className="flex flex-col gap-1 p-4 bg-white/40 dark:bg-black/20 rounded-xl border border-black/5 dark:border-white/5">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-gray-500">{t("landing_contact_channel_response")}</span>
                      <span className="text-base font-bold text-gray-900 dark:text-white">{t("landing_contact_channel_response_value")}</span>
                    </div>
                  </div>
                </article>

                <form
                  className="bg-white/70 dark:bg-gray-900/70 backdrop-blur-2xl border border-black/10 dark:border-white/10 rounded-3xl shadow-xl p-8 md:p-10 flex flex-col gap-6"
                  onSubmit={handleSendContact}
                  noValidate
                >
                  <div className="flex flex-col gap-2 border-b border-black/5 dark:border-white/10 pb-4">
                    <h3 className="text-xl font-black text-gray-900 dark:text-white">{t("landing_contact_form_title")}</h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400">{t("landing_contact_form_hint")}</p>
                  </div>

                  <div className="flex flex-col gap-4">
                    <label className="flex flex-col gap-1.5">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-gray-500 ml-1">{t("landing_contact_form_name")}</span>
                      <input
                        className="w-full px-4 py-3 bg-white/50 dark:bg-black/40 border border-black/10 dark:border-white/10 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/30 rounded-xl text-sm font-medium text-gray-900 dark:text-white transition-all shadow-sm outline-none"
                        type="text"
                        value={contactName}
                        onChange={(event) => setContactName(event.target.value)}
                        placeholder="Alex Martin"
                        disabled={isSendingContact}
                      />
                    </label>
                    <label className="flex flex-col gap-1.5">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-gray-500 ml-1">{t("email")}</span>
                      <input
                        className="w-full px-4 py-3 bg-white/50 dark:bg-black/40 border border-black/10 dark:border-white/10 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/30 rounded-xl text-sm font-medium text-gray-900 dark:text-white transition-all shadow-sm outline-none"
                        type="email"
                        value={contactEmail}
                        onChange={(event) => setContactEmail(event.target.value)}
                        placeholder={t("placeholder_email")}
                        disabled={isSendingContact}
                      />
                    </label>
                    <label className="flex flex-col gap-1.5">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-gray-500 ml-1">{t("landing_contact_form_message")}</span>
                      <textarea
                        className="w-full px-4 py-3 bg-white/50 dark:bg-black/40 border border-black/10 dark:border-white/10 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/30 rounded-xl text-sm font-medium text-gray-900 dark:text-white transition-all shadow-sm outline-none resize-none"
                        rows={4}
                        value={contactMessageBody}
                        onChange={(event) => setContactMessageBody(event.target.value)}
                        placeholder={t("landing_contact_form_message_placeholder")}
                        disabled={isSendingContact}
                      />
                    </label>
                  </div>

                  <button className="w-full bg-gray-900 dark:bg-white text-white dark:text-gray-900 px-6 py-4 rounded-xl font-bold text-base shadow-lg hover:scale-[1.02] transition-transform disabled:opacity-50 mt-2" type="submit" disabled={isSendingContact}>
                    {isSendingContact ? t("landing_contact_form_submitting") : t("landing_contact_form_submit")}
                  </button>

                  {contactMessage ? (
                    <div className="mt-2 text-center">
                      <InlineMessage type={contactMessageType} text={contactMessage} />
                    </div>
                  ) : null}
                </form>
              </div>
            </section>

            <section className="py-24 px-6 w-full max-w-3xl mx-auto">
              <div className="text-center mb-12">
                <h2 className="text-3xl md:text-5xl font-black tracking-tight text-gray-900 dark:text-white mb-4">{t("landing_faq_title")}</h2>
                <p className="text-lg text-gray-600 dark:text-gray-300">{t("landing_faq_hint")}</p>
              </div>

              <div className="flex flex-col gap-4">
                {FAQ_ITEMS.map((item) => {
                  const isOpen = openFaqKey === item.key;
                  return (
                    <article
                      key={item.key}
                      className="bg-white/50 dark:bg-white/5 backdrop-blur-md rounded-2xl border border-black/5 dark:border-white/10 shadow-sm overflow-hidden transition-all"
                    >
                      <button
                        type="button"
                        className="w-full flex items-center justify-between p-6 text-left focus:outline-none"
                        onClick={() => setOpenFaqKey((prev) => (prev === item.key ? "" : item.key))}
                        aria-expanded={isOpen}
                      >
                        <span className="font-bold text-gray-900 dark:text-white pr-4">{t(item.questionKey)}</span>
                        <Icon name={isOpen ? "chevron_up" : "chevron_down"} className={`w-5 h-5 text-gray-500 transition-transform ${isOpen ? "rotate-180" : ""}`} />
                      </button>
                      <div className={`overflow-hidden transition-all duration-300 ${isOpen ? "max-h-[500px] opacity-100" : "max-h-0 opacity-0"}`} aria-hidden={!isOpen}>
                        <p className="p-6 pt-0 text-sm text-gray-600 dark:text-gray-400 leading-relaxed border-t border-black/5 dark:border-white/5 mt-2">
                          {t(item.answerKey)}
                        </p>
                      </div>
                    </article>
                  );
                })}
              </div>
            </section>
          </>
        ) : null}

      </div>

      {/* FOOTER GLOBAL */}
      <footer className="w-full bg-white/30 dark:bg-black/30 backdrop-blur-lg border-t border-black/5 dark:border-white/5 py-8 mt-auto relative z-20">
        <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex flex-col items-center md:items-start gap-2">
            <div className="flex items-center gap-2">
              <BrandMark text="" fallback={t("logo_fallback")} className="w-5 h-5 opacity-50 grayscale" />
              <span className="font-bold tracking-tight text-gray-900 dark:text-white opacity-80">{t("app_name")}</span>
            </div>
            <p className="text-xs font-bold text-gray-500 dark:text-gray-400 text-center md:text-left">
              {t("landing_footer_copyright")}
            </p>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-6">
            {/* 🚀 FIX: Hemos eliminado <Controls/> de aquí. Ahora el footer es solo enlaces. */}
            <button className="text-sm font-medium text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white transition-colors" type="button" onClick={() => onNavigate("/contact")}>
              {t("landing_footer_privacy")}
            </button>
            <button className="text-sm font-medium text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white transition-colors" type="button" onClick={() => onNavigate("/contact")}>
              {t("landing_footer_terms")}
            </button>
            <button className="text-sm font-medium text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white transition-colors" type="button" onClick={() => onNavigate("/contact")}>
              {t("landing_nav_contact")}
            </button>
          </div>
        </div>
      </footer>

      {/* TOAST GLOBAL */}
      {toast.visible ? (
        <div className={`fixed bottom-6 right-6 z-[100] px-5 py-3 rounded-2xl shadow-2xl flex items-center gap-3 animate-in slide-in-from-bottom-5 fade-in duration-300 ${toast.type === "error" ? "bg-red-600 text-white" : "bg-gray-900 dark:bg-white text-white dark:text-gray-900"}`} role="status" aria-live="polite">
          <Icon name={toast.type === "error" ? "x" : "check"} className="w-5 h-5" />
          <span className="text-sm font-bold">{toast.text}</span>
        </div>
      ) : null}

    </main>
  );
}

export { LandingScreen };