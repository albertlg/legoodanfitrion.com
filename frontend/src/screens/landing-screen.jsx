import { lazy, Suspense, useCallback, useEffect, useRef, useState } from "react";
import { BrandMark } from "../components/brand-mark";
import { Controls } from "../components/controls";
import { Icon } from "../components/icons";
import { InlineMessage } from "../components/inline-message";
import { hasSupabaseEnv, supabase } from "../lib/supabaseClient";
import { SEO } from "../components/seo"; // 🚀 Importamos el SEO en lugar del Helmet
import { Helmet } from "react-helmet-async";
import { GlobalFooter } from "../components/global-footer";
import { ModuleShowcaseCard } from "../components/landing/ModuleShowcaseCard";

const NAV_ITEMS = [
  { key: "features", path: "/", labelKey: "landing_nav_features", anchorId: "caracteristicas" },
  { key: "use-cases", path: "/use-cases", labelKey: "landing_nav_use_cases" },
  { key: "pricing", path: "/pricing", labelKey: "landing_nav_pricing" },
  { key: "blog", path: "/blog", labelKey: "blog_nav_title" },
  { key: "about", path: "/about", labelKey: "landing_nav_about" },
];

const FAQ_ITEMS = [
  { key: "faq_1", questionKey: "landing_faq_q1", answerKey: "landing_faq_a1" },
  { key: "faq_2", questionKey: "landing_faq_q2", answerKey: "landing_faq_a2" },
  { key: "faq_3", questionKey: "landing_faq_q3", answerKey: "landing_faq_a3" },
  { key: "faq_4", questionKey: "landing_faq_q4", answerKey: "landing_faq_a4" },
  { key: "faq_5", questionKey: "landing_faq_q5", answerKey: "landing_faq_a5" },
  { key: "faq_6", questionKey: "landing_faq_q6", answerKey: "landing_faq_a6" },
  { key: "faq_7", questionKey: "landing_faq_q7", answerKey: "landing_faq_a7" },
  { key: "faq_8", questionKey: "landing_faq_q8", answerKey: "landing_faq_a8" },
  { key: "faq_9", questionKey: "landing_faq_q9", answerKey: "landing_faq_a9" },
  { key: "faq_10", questionKey: "landing_faq_q10", answerKey: "landing_faq_a10" },
  { key: "faq_11", questionKey: "landing_faq_q11", answerKey: "landing_faq_a11" }
];

const HOW_ITEMS = [
  { key: "step_1", titleKey: "landing_how_step_1_title", descKey: "landing_how_step_1_desc" },
  { key: "step_2", titleKey: "landing_how_step_2_title", descKey: "landing_how_step_2_desc" },
  { key: "step_3", titleKey: "landing_how_step_3_title", descKey: "landing_how_step_3_desc" },
  { key: "step_4", titleKey: "landing_how_step_4_title", descKey: "landing_how_step_4_desc" },
  { key: "step_5", titleKey: "landing_how_step_5_title", descKey: "landing_how_step_5_desc" }
];

const COMPARE_ITEMS = [
  { key: "excel", iconName: "calendar", accent: "red", titleKey: "landing_compare_excel_title", descKey: "landing_compare_excel_desc", isLga: false },
  { key: "whatsapp", iconName: "phone", accent: "amber", titleKey: "landing_compare_whatsapp_title", descKey: "landing_compare_whatsapp_desc", isLga: false },
  { key: "doodle", iconName: "clock", accent: "slate", titleKey: "landing_compare_doodle_title", descKey: "landing_compare_doodle_desc", isLga: false },
  { key: "lga", iconName: "sparkle", accent: "blue", titleKey: "landing_compare_lga_title", descKey: "landing_compare_lga_desc", isLga: true }
];

// 🚀 SEO/PERF: demo interactiva en chunk aparte (lazy). El bundle principal
// de la landing no arrastra AvatarCircle, demo-events ni la UI del panel.
const InteractiveDemo = lazy(() => import("../components/landing/InteractiveDemo"));

function DemoSkeleton() {
  return (
    <div
      className="w-full flex flex-col items-center animate-pulse"
      aria-busy="true"
      aria-live="polite"
    >
      <div className="mb-6 h-10 w-72 rounded-full bg-black/5 dark:bg-white/5 border border-black/5 dark:border-white/10" />
      <div className="w-full max-w-3xl rounded-3xl border border-black/10 dark:border-white/10 bg-white/60 dark:bg-gray-900/50 backdrop-blur-xl shadow-sm overflow-hidden">
        <div className="px-6 py-3.5 border-b border-black/5 dark:border-white/5 flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-black/10 dark:bg-white/10" />
          <span className="w-2.5 h-2.5 rounded-full bg-black/10 dark:bg-white/10" />
          <span className="w-2.5 h-2.5 rounded-full bg-black/10 dark:bg-white/10" />
        </div>
        <div className="p-6 md:p-8 flex flex-col gap-6">
          <div className="h-6 w-3/4 rounded-lg bg-black/5 dark:bg-white/5" />
          <div className="h-4 w-1/2 rounded bg-black/5 dark:bg-white/5" />
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[0, 1, 2, 3].map((i) => (
              <div key={i} className="h-20 rounded-2xl bg-black/5 dark:bg-white/5" />
            ))}
          </div>
          <div className="space-y-3">
            {[0, 1, 2, 3, 4].map((i) => (
              <div key={i} className="h-12 rounded-xl bg-black/5 dark:bg-white/5" />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

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
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isFeaturesSectionInView, setIsFeaturesSectionInView] = useState(false);
  const [shouldLoadDemo, setShouldLoadDemo] = useState(false);
  const demoSentinelRef = useRef(null);

  useEffect(() => {
    if (shouldLoadDemo) return undefined;
    if (typeof window === "undefined" || typeof IntersectionObserver === "undefined") {
      setShouldLoadDemo(true);
      return undefined;
    }
    const target = demoSentinelRef.current;
    if (!target) return undefined;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setShouldLoadDemo(true);
          observer.disconnect();
        }
      },
      { rootMargin: "300px 0px" }
    );
    observer.observe(target);
    return () => observer.disconnect();
  }, [shouldLoadDemo]);

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

  const pageMode =
    currentPath === "/pricing"
      ? "pricing"
      : currentPath === "/contact"
        ? "contact"
        : "home";

  const scrollToSection = useCallback((sectionId) => {
    if (typeof document === "undefined") {
      return;
    }
    const sectionElement = document.getElementById(sectionId);
    if (sectionElement) {
      sectionElement.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, []);

  const scrollToDemoSection = () => {
    scrollToSection("landing-demo-section");
  };

  const handleGoToFeatures = useCallback(() => {
    if (pageMode !== "home") {
      onNavigate("/#caracteristicas");
      return;
    }
    scrollToSection("caracteristicas");
  }, [onNavigate, pageMode, scrollToSection]);

  const handleNavItemClick = useCallback((item) => {
    if (item?.anchorId) {
      handleGoToFeatures();
      return;
    }
    onNavigate(item.path);
  }, [handleGoToFeatures, onNavigate]);

  const handleLogoClick = useCallback(() => {
    if (typeof window !== "undefined") {
      if (window.location.hash) {
        window.history.replaceState(null, "", `${window.location.pathname}${window.location.search}`);
      }
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
    if (currentPath !== "/") {
      onNavigate("/");
    }
  }, [currentPath, onNavigate]);

  const isNavItemActive = useCallback((item) => {
    if (item?.anchorId) {
      const hasFeaturesHash = typeof window !== "undefined" && window.location.hash === "#caracteristicas";
      return hasFeaturesHash || isFeaturesSectionInView;
    }
    return currentPath === item.path;
  }, [currentPath, isFeaturesSectionInView]);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }
    if (window.location.hash === "#caracteristicas") {
      const timer = window.setTimeout(() => {
        scrollToSection("caracteristicas");
      }, 80);
      return () => window.clearTimeout(timer);
    }
    return undefined;
  }, [currentPath, pageMode, scrollToSection]);

  useEffect(() => {
    if (currentPath === "/features") {
      const timer = window.setTimeout(() => {
        scrollToSection("caracteristicas");
      }, 80);
      return () => window.clearTimeout(timer);
    }
    return undefined;
  }, [currentPath, scrollToSection]);

  useEffect(() => {
    if (typeof window === "undefined" || pageMode !== "home") {
      setIsFeaturesSectionInView(false);
      return undefined;
    }
    const target = document.getElementById("caracteristicas");
    if (!target) {
      setIsFeaturesSectionInView(false);
      return undefined;
    }
    const observer = new IntersectionObserver(
      ([entry]) => {
        setIsFeaturesSectionInView(entry.isIntersecting);
      },
      {
        threshold: 0.35,
        rootMargin: "-96px 0px -45% 0px"
      }
    );
    observer.observe(target);
    return () => observer.disconnect();
  }, [pageMode, currentPath]);

  const handleOpenRealDemo = () => {
    trackEvent("cta_demo_real_click", { location: "hero" });
    if (pageMode !== "home") {
      onNavigate("/");
      window.setTimeout(() => {
        scrollToDemoSection();
      }, 80);
      return;
    }
    scrollToDemoSection();
  };

  const trackEvent = (eventName, eventParams = {}) => {
    if (typeof window !== "undefined" && window.gtag) {
      window.gtag("event", eventName, eventParams);
    }
    else if (typeof window !== "undefined" && window.dataLayer) {
      window.dataLayer.push({ event: eventName, ...eventParams });
    }
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

  // 🚀 SEO DINÁMICO: Diccionario de metadatos según la página actual
  const seoData = {
    home: { title: t("seo_title"), desc: t("seo_desc"), slug: "/" },
    pricing: { title: `${t("landing_nav_pricing_title")} | LeGoodAnfitrión`, desc: t("landing_pricing_subtitle"), slug: "pricing" },
    contact: { title: `${t("landing_nav_contact_title")} | LeGoodAnfitrión`, desc: t("landing_contact_subtitle"), slug: "contact" }
  };
  const currentSeo = seoData[pageMode] || seoData.home;

  // Navbar + drawer: cambia según sesión, con nombre personalizado
  const navCta = session?.user?.id
    ? (() => {
      const rawName = session.user.user_metadata?.full_name || "";
      const firstName = rawName.split(" ")[0].trim();
      const label = firstName
        ? t("landing_cta_dashboard_named").replace("{{name}}", firstName)
        : t("landing_cta_dashboard");
      return {
        label,
        onClick: () => { trackEvent("cta_open_app_click"); onGoApp(); }
      };
    })()
    : {
      label: t("sign_in"),
      onClick: () => { trackEvent("cta_sign_in_click", { location: "nav" }); onGoLogin(); }
    };

  // Hero: siempre copy de marketing, routing inteligente
  const heroCta = {
    label: t("landing_cta_create_event"),
    onClick: () => {
      trackEvent("cta_create_event_click", { location: "hero" });
      session?.user?.id ? onGoApp() : onGoLogin();
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
          className="w-full px-4 py-3 sm:py-0 bg-transparent border-none focus:outline-none focus:ring-2 focus:ring-blue-500/50 text-gray-900 dark:text-white placeholder-gray-500"
          type="email"
          value={waitlistEmail}
          onChange={(event) => setWaitlistEmail(event.target.value)}
          placeholder={t("placeholder_email")}
          aria-label={t("email")}
          autoComplete="email"
          disabled={isJoiningWaitlist}
        />
        <button
          className="w-full sm:w-auto bg-gray-900 dark:bg-white text-white dark:text-gray-900 px-6 py-3 rounded-xl font-bold shadow-md hover:scale-[1.02] transition-transform whitespace-nowrap shrink-0 disabled:opacity-50 disabled:cursor-not-allowed"
          type="submit"
          disabled={isJoiningWaitlist}
        >
          {isJoiningWaitlist ? t("waitlist_join_loading") : t("landing_contact_cta")}
        </button>
      </form>

      <p className="text-[10px] uppercase tracking-wider font-bold text-gray-500 dark:text-gray-300 mt-6 max-w-xs">
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
      {/* 🚀 SEO DINÁMICO: Alimentado por el objeto currentSeo */}
      <SEO
        title={currentSeo.title}
        description={currentSeo.desc}
        language={language}
        slug={currentSeo.slug}
        image="https://legoodanfitrion.com/og-home.jpg"
      />

      {/* 🚀 GEO: JSON-LD para AI discoverability (FAQPage + HowTo + Speakable) */}
      {pageMode === "home" && (
        <Helmet>
          <script type="application/ld+json">{JSON.stringify({
            "@context": "https://schema.org",
            "@type": "FAQPage",
            "mainEntity": FAQ_ITEMS.map((item) => ({
              "@type": "Question",
              "name": t(item.questionKey),
              "acceptedAnswer": {
                "@type": "Answer",
                "text": t(item.answerKey)
              }
            }))
          })}</script>
          <script type="application/ld+json">{JSON.stringify({
            "@context": "https://schema.org",
            "@type": "HowTo",
            "name": t("landing_how_title"),
            "description": t("landing_how_subtitle"),
            "totalTime": "PT2M",
            "step": HOW_ITEMS.map((item, index) => ({
              "@type": "HowToStep",
              "position": index + 1,
              "name": t(item.titleKey),
              "text": t(item.descKey),
              "url": `https://legoodanfitrion.com/#como-funciona-${index + 1}`
            }))
          })}</script>
          <script type="application/ld+json">{JSON.stringify({
            "@context": "https://schema.org",
            "@type": "WebPage",
            "url": "https://legoodanfitrion.com/",
            "name": t("seo_title"),
            "inLanguage": language,
            "speakable": {
              "@type": "SpeakableSpecification",
              "cssSelector": ["#lga-hero-title", "#lga-hero-narrative"]
            }
          })}</script>
        </Helmet>
      )}

      {/* Decorative Blobs (Background) */}
      <div className="fixed top-[-10%] right-[-5%] w-[400px] md:w-[600px] h-[400px] md:h-[600px] bg-blue-500/20 dark:bg-blue-600/10 rounded-full mix-blend-multiply filter blur-[80px] md:blur-[120px] opacity-70 pointer-events-none z-0"></div>
      <div className="fixed bottom-[-10%] left-[-5%] w-[400px] md:w-[600px] h-[400px] md:h-[600px] bg-purple-500/20 dark:bg-purple-600/10 rounded-full mix-blend-multiply filter blur-[80px] md:blur-[120px] opacity-70 pointer-events-none z-0"></div>

      {/* HEADER (Sticky) */}
      <header className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-6 py-4">
        <div className="absolute inset-0 -z-10 bg-white/70 dark:bg-[#0A0D14]/70 backdrop-blur-xl border-b border-black/5 dark:border-white/5 pointer-events-none" />
        <div className="flex items-center gap-6">
          <button className="flex items-center gap-2 hover:opacity-80 transition-opacity outline-none" type="button" onClick={handleLogoClick}>
            <BrandMark text="" fallback={t("logo_fallback")} className="w-8 h-8" />
            <span className="font-black text-lg tracking-tight">{t("app_name")}</span>
          </button>

          {/* Navegación Desktop */}
          <nav className="hidden md:flex items-center gap-1" aria-label={t("nav_sections")}>
            {NAV_ITEMS.map((item) => (
              <button
                key={item.key}
                className={`px-4 py-2 rounded-full text-sm font-bold transition-all ${isNavItemActive(item) ? "bg-black/5 dark:bg-white/10 text-gray-900 dark:text-white" : "text-gray-500 hover:text-gray-900 hover:bg-black/5 dark:text-gray-400 dark:hover:text-white dark:hover:bg-white/5"}`}
                type="button"
                onClick={() => handleNavItemClick(item)}
              >
                {t(item.labelKey)}
              </button>
            ))}
          </nav>
        </div>

        <div className="flex items-center gap-3 sm:gap-4">
          <div className="hidden md:block">
            <Controls themeMode={themeMode} setThemeMode={setThemeMode} language={language} setLanguage={setLanguage} t={t} dropdownDirection="down" />
          </div>

          <button
            className="hidden md:flex items-center gap-1.5 text-sm font-bold text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white transition-colors"
            type="button"
            onClick={() => onNavigate("/explore")}
          >
            Demo
            <Icon name="arrow_up_right" className="w-3.5 h-3.5" />
          </button>

          <button
            className="hidden sm:block bg-gray-900 dark:bg-white text-white dark:text-gray-900 px-5 py-2.5 rounded-full font-bold text-sm shadow-md hover:scale-[1.02] transition-transform"
            type="button"
            onClick={navCta.onClick}
          >
            {navCta.label}
          </button>

          <button
            className="md:hidden p-2 -mr-2 rounded-xl text-gray-600 dark:text-gray-300 hover:bg-black/5 dark:hover:bg-white/10 transition-colors outline-none focus:ring-2 focus:ring-blue-500/50"
            onClick={() => setIsMobileMenuOpen(true)}
            aria-label="Menú"
          >
            <Icon name="menu" className="w-6 h-6" />
          </button>
        </div>
      </header>

      {/* Drawer Menú Móvil (Glassmorphism) */}
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
          <button className="p-1.5 -mr-1.5 rounded-lg text-gray-500 hover:text-black hover:bg-gray-100 dark:hover:bg-white/5 dark:text-gray-400 dark:hover:text-white transition-colors" onClick={() => setIsMobileMenuOpen(false)} aria-label={t("close_menu")}>
            <Icon name="close" className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-4 py-6 flex flex-col gap-2">
          {NAV_ITEMS.map((item) => (
            <button
              key={`mob-${item.key}`}
              className={`flex items-center w-full px-4 py-3.5 rounded-2xl text-base font-bold transition-all ${isNavItemActive(item) ? "bg-black/5 dark:bg-white/10 text-gray-900 dark:text-white" : "text-gray-600 hover:bg-black/5 dark:text-gray-300 dark:hover:bg-white/5"}`}
              onClick={() => {
                handleNavItemClick(item);
                setIsMobileMenuOpen(false);
              }}
            >
              {t(item.labelKey)}
            </button>
          ))}

          <div className="mt-4 pt-6 border-t border-black/5 dark:border-white/5 flex flex-col gap-3">
            <button
              className="w-full border border-black/10 dark:border-white/10 text-gray-900 dark:text-white px-6 py-3.5 rounded-2xl font-bold text-base hover:bg-black/5 dark:hover:bg-white/5 transition-all flex items-center justify-center gap-1.5"
              onClick={() => { onNavigate("/explore"); setIsMobileMenuOpen(false); }}
            >
              Demo
              <Icon name="arrow_up_right" className="w-3.5 h-3.5" />
            </button>
            <button
              className="w-full bg-gray-900 dark:bg-white text-white dark:text-gray-900 px-6 py-4 rounded-2xl font-black text-base shadow-lg hover:scale-[1.02] transition-transform"
              onClick={() => {
                navCta.onClick();
                setIsMobileMenuOpen(false);
              }}
            >
              {navCta.label}
            </button>
            <div className="flex justify-center mt-3">
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
            <section className="flex flex-col justify-center px-6 min-h-[75vh] max-w-6xl mx-auto w-full animate-in fade-in slide-in-from-bottom-8 duration-700">

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12 items-center w-full">
                <div className="flex flex-col items-center lg:items-start text-center lg:text-left gap-4 md:gap-5 min-w-0">

                  <span className="px-4 py-1.5 bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400 border border-blue-200 dark:border-blue-800/30 rounded-full text-[10px] font-black uppercase tracking-widest shadow-sm">
                    {t("landing_badge")}
                  </span>

                  <h1 id="lga-hero-title" className="text-4xl md:text-5xl lg:text-6xl xl:text-[4.25rem] font-black tracking-tighter text-gray-900 dark:text-white leading-[1.05] text-balance">
                    {t("landing_title")}
                  </h1>

                  <p className="text-base md:text-lg text-gray-600 dark:text-gray-300 max-w-2xl font-medium leading-relaxed text-balance">
                    {t("landing_subtitle")}
                  </p>

                  <p id="lga-hero-narrative" className="text-sm md:text-base text-gray-600 dark:text-gray-300 max-w-2xl leading-relaxed text-pretty">
                    {t("landing_hero_narrative")}
                  </p>

                  <div className="flex flex-col items-center lg:items-start gap-3 w-full sm:w-auto mt-1">
                    <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-center lg:justify-start gap-3 w-full sm:w-auto">
                      <button
                        className="w-full sm:w-auto bg-gray-900 dark:bg-white text-white dark:text-gray-900 px-6 py-3 rounded-xl font-black text-base shadow-sm hover:shadow-md hover:scale-[1.02] transition-all duration-200 flex items-center justify-center gap-2 cursor-pointer"
                        type="button"
                        onClick={heroCta.onClick}
                      >
                        <Icon name="sparkle" className="w-4 h-4" />
                        {heroCta.label}
                      </button>
                      <button
                        className="w-full sm:w-auto bg-white/50 dark:bg-black/20 border border-black/10 dark:border-white/10 px-6 py-3 rounded-xl font-bold text-base hover:bg-white/80 dark:hover:bg-white/5 transition-all text-gray-900 dark:text-white shadow-sm flex items-center justify-center gap-2 cursor-pointer"
                        type="button"
                        onClick={handleOpenRealDemo}
                      >
                        <Icon name="eye" className="w-4 h-4 opacity-70" />
                        {t("landing_cta_demo_real")}
                      </button>
                    </div>

                    <p className="text-xs font-bold text-gray-500 dark:text-gray-400 flex items-center gap-2">
                      <Icon name="check" className="w-3.5 h-3.5 text-green-500 shrink-0" />
                      {t("landing_hero_microcopy")}
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center justify-center lg:justify-start gap-x-5 gap-y-2 mt-3 pt-5 border-t border-black/5 dark:border-white/5 w-full opacity-90">
                    <div className="flex items-center gap-2 text-sm font-bold text-gray-600 dark:text-gray-300">
                      <div className="w-7 h-7 rounded-full bg-black/5 dark:bg-white/10 flex items-center justify-center"><Icon name="phone" className="w-3.5 h-3.5" /></div>
                      {t("landing_trust_1")}
                    </div>
                    <div className="flex items-center gap-2 text-sm font-bold text-gray-600 dark:text-gray-300">
                      <div className="w-7 h-7 rounded-full bg-black/5 dark:bg-white/10 flex items-center justify-center"><Icon name="check" className="w-3.5 h-3.5" /></div>
                      {t("landing_trust_2")}
                    </div>
                    <div className="flex items-center gap-2 text-sm font-bold text-gray-600 dark:text-gray-300">
                      <div className="w-7 h-7 rounded-full bg-black/5 dark:bg-white/10 flex items-center justify-center"><Icon name="user" className="w-3.5 h-3.5" /></div>
                      {t("landing_trust_3")}
                    </div>
                  </div>
                </div>

                <div className="w-full flex justify-center lg:justify-end">
                  <div className="w-full max-w-md transition-transform duration-500 ease-out lg:[transform:perspective(1400px)_rotateY(-6deg)_rotateX(2deg)] lg:hover:[transform:perspective(1400px)_rotateY(-2deg)_rotateX(1deg)]">
                    <ModuleShowcaseCard t={t} />
                  </div>
                </div>
              </div>

              <figure className="w-full mt-20 md:mt-24 aspect-video sm:aspect-[21/9] bg-gradient-to-br from-indigo-50 to-purple-50 dark:from-gray-800 dark:to-indigo-950 ring-1 ring-black/5 dark:ring-white/10 rounded-t-3xl sm:rounded-t-[3rem] shadow-2xl shadow-black/10 dark:shadow-black/40 relative overflow-hidden group">
                <img
                  src="https://images.unsplash.com/photo-1527529482837-4698179dc6ce?auto=format&fit=crop&w=1600&q=80"
                  alt={t("landing_hero_narrative")}
                  className="w-full h-full object-cover object-center transition-transform duration-1000 group-hover:scale-[1.02]"
                  loading="eager"
                  decoding="async"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-gray-50 dark:from-[#0A0D14] via-transparent to-transparent pointer-events-none"></div>
              </figure>
            </section>

            <section id="dos-mundos" className="py-20 px-6 w-full max-w-6xl mx-auto flex flex-col items-center">
              <div className="text-center max-w-3xl mb-12">
                <p className="text-[10px] font-bold uppercase tracking-widest text-blue-600 dark:text-blue-400 mb-3">{t("landing_two_worlds_eyebrow")}</p>
                <h2 className="text-3xl md:text-5xl font-black tracking-tight text-gray-900 dark:text-white mb-5 leading-tight text-balance">{t("landing_two_worlds_title")}</h2>
                <p className="text-lg text-gray-600 dark:text-gray-300 font-medium text-balance">{t("landing_two_worlds_subtitle")}</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5 md:gap-6 w-full items-stretch">
                <article className="relative rounded-3xl p-7 md:p-8 flex flex-col backdrop-blur-xl bg-white/70 dark:bg-gray-900/60 border border-black/10 dark:border-white/10 shadow-sm hover:-translate-y-0.5 hover:shadow-md transition-all duration-200 overflow-hidden">
                  <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-pink-400 to-orange-400"></div>
                  <div className="flex items-center gap-3 mb-5">
                    <div className="w-11 h-11 shrink-0 rounded-2xl bg-gradient-to-br from-pink-500 to-orange-400 text-white flex items-center justify-center shadow-sm">
                      <Icon name="star" className="w-5 h-5" />
                    </div>
                    <h3 className="text-xl font-black text-gray-900 dark:text-white leading-tight">{t("landing_two_worlds_b2c_title")}</h3>
                  </div>
                  <p className="text-base text-gray-700 dark:text-gray-200 leading-relaxed mb-5">{t("landing_two_worlds_b2c_desc")}</p>
                  <p className="mt-auto text-[11px] font-bold uppercase tracking-widest text-gray-500 dark:text-gray-400 pt-5 border-t border-black/5 dark:border-white/10">{t("landing_two_worlds_b2c_examples")}</p>
                </article>

                <article className="relative rounded-3xl p-7 md:p-8 flex flex-col backdrop-blur-xl bg-white/70 dark:bg-gray-900/60 border border-black/10 dark:border-white/10 shadow-sm hover:-translate-y-0.5 hover:shadow-md transition-all duration-200 overflow-hidden">
                  <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-blue-500 to-indigo-600"></div>
                  <div className="flex items-center gap-3 mb-5">
                    <div className="w-11 h-11 shrink-0 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 text-white flex items-center justify-center shadow-sm">
                      <Icon name="activity" className="w-5 h-5" />
                    </div>
                    <h3 className="text-xl font-black text-gray-900 dark:text-white leading-tight">{t("landing_two_worlds_b2b_title")}</h3>
                  </div>
                  <p className="text-base text-gray-700 dark:text-gray-200 leading-relaxed mb-5">{t("landing_two_worlds_b2b_desc")}</p>
                  <p className="mt-auto text-[11px] font-bold uppercase tracking-widest text-gray-500 dark:text-gray-400 pt-5 border-t border-black/5 dark:border-white/10">{t("landing_two_worlds_b2b_examples")}</p>
                </article>
              </div>
            </section>

            <section id="caracteristicas" className="py-24 px-6 w-full max-w-6xl mx-auto flex flex-col items-center">
              <div className="text-center max-w-3xl mb-16">
                <p className="text-[10px] font-bold uppercase tracking-widest text-blue-600 dark:text-blue-400 mb-3">{t("landing_vs_eyebrow")}</p>
                <h2 className="text-4xl md:text-5xl font-black tracking-tight text-gray-900 dark:text-white mb-6 leading-tight text-balance">{t("landing_vs_title")}</h2>
                <p className="text-lg text-gray-600 dark:text-gray-300 font-medium text-balance">{t("landing_vs_subtitle")}</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-8 md:gap-12 w-full items-stretch">
                <article className="bg-red-50/50 dark:bg-red-950/20 backdrop-blur-sm rounded-3xl border border-red-100 dark:border-red-900/30 p-8 flex flex-col relative overflow-hidden group">
                  <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-red-400 to-red-500 opacity-80"></div>
                  <div className="flex items-center gap-4 mb-8">
                    <div className="w-12 h-12 shrink-0 rounded-2xl bg-red-100 dark:bg-red-900/40 text-red-600 dark:text-red-400 flex items-center justify-center">
                      <Icon name="close" className="w-6 h-6" />
                    </div>
                    <h2 className="text-xl font-bold text-gray-900 dark:text-white leading-tight">
                      {t("landing_vs_before_title")}
                    </h2>
                  </div>
                  <ul className="flex flex-col gap-5 text-gray-700 dark:text-gray-300">
                    {[1, 2, 3, 4].map((num) => (
                      <li key={`before-${num}`} className="flex items-start gap-3">
                        <Icon name="close" className="w-5 h-5 text-red-400 dark:text-red-500 shrink-0 mt-0.5" />
                        <span className="font-medium">{t(`landing_vs_before_${num}`)}</span>
                      </li>
                    ))}
                  </ul>
                </article>

                <article className="bg-white/75 dark:bg-gray-900/70 backdrop-blur-xl rounded-3xl border border-black/10 dark:border-white/10 shadow-sm p-8 flex flex-col relative overflow-hidden transform md:-translate-y-4">
                  <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-blue-500 to-purple-500"></div>
                  <div className="flex items-center gap-4 mb-8">
                    <div className="w-12 h-12 shrink-0 rounded-2xl bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400 flex items-center justify-center shadow-inner">
                      <Icon name="sparkle" className="w-6 h-6" />
                    </div>
                    <h2 className="text-xl font-black text-gray-900 dark:text-white leading-tight">
                      {t("landing_vs_after_title")}
                    </h2>
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
                  <div className="mt-8 pt-6 border-t border-black/5 dark:border-white/10">
                    <button
                      className="w-full bg-gray-900 dark:bg-white text-white dark:text-gray-900 px-6 py-3.5 rounded-xl font-bold text-sm shadow-md hover:scale-[1.02] transition-transform flex items-center justify-center gap-2"
                      type="button"
                      onClick={heroCta.onClick}
                    >
                      {t("landing_cta_create_event")} <Icon name="arrow_left" className="w-4 h-4 rotate-180" />
                    </button>
                  </div>
                </article>
              </div>
            </section>

            {/* ══════════ MOMENTOS TEASER ══════════ */}
            <section className="py-20 px-6 w-full max-w-6xl mx-auto flex flex-col items-center">
              <div className="text-center max-w-3xl mb-12">
                <p className="text-[10px] font-bold uppercase tracking-widest text-purple-600 dark:text-purple-400 mb-3">{t("landing_usecases_eyebrow")}</p>
                <h2 className="text-4xl md:text-5xl font-black tracking-tight text-gray-900 dark:text-white mb-5 leading-tight text-balance">{t("landing_usecases_title")}</h2>
                <p className="text-lg text-gray-600 dark:text-gray-300 font-medium text-balance">{t("landing_usecases_subtitle")}</p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-5 w-full mb-10">
                {/* Personal */}
                <article className="relative flex flex-col rounded-3xl border bg-blue-50 dark:bg-blue-950/20 border-blue-100 dark:border-blue-900/30 p-6 overflow-hidden">
                  <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-400 to-blue-500 opacity-80" />
                  <div className="w-10 h-10 rounded-xl bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center mb-4">
                    <Icon name="home" className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                  </div>
                  <p className="text-[9px] font-bold uppercase tracking-widest text-gray-400 dark:text-gray-500 mb-1">{t("uc_personal_kicker")}</p>
                  <h3 className="text-base font-black text-gray-900 dark:text-white leading-tight mb-2">{t("uc_personal_title")}</h3>
                  <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed">{t("uc_personal_desc")}</p>
                </article>

                {/* Gastro */}
                <article className="relative flex flex-col rounded-3xl border bg-amber-50 dark:bg-amber-950/20 border-amber-100 dark:border-amber-900/30 p-6 overflow-hidden">
                  <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-amber-400 to-orange-500 opacity-80" />
                  <div className="w-10 h-10 rounded-xl bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center mb-4">
                    <Icon name="utensils" className="w-5 h-5 text-amber-600 dark:text-amber-400" />
                  </div>
                  <p className="text-[9px] font-bold uppercase tracking-widest text-gray-400 dark:text-gray-500 mb-1">{t("uc_gastro_kicker")}</p>
                  <h3 className="text-base font-black text-gray-900 dark:text-white leading-tight mb-2">{t("uc_gastro_title")}</h3>
                  <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed">{t("uc_gastro_desc")}</p>
                </article>

                {/* Corporate */}
                <article className="relative flex flex-col rounded-3xl border bg-slate-50 dark:bg-slate-800/30 border-slate-200 dark:border-slate-700/40 p-6 overflow-hidden">
                  <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-slate-400 to-slate-600 opacity-80" />
                  <div className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-slate-800/50 flex items-center justify-center mb-4">
                    <Icon name="calendar" className="w-5 h-5 text-slate-600 dark:text-slate-300" />
                  </div>
                  <p className="text-[9px] font-bold uppercase tracking-widest text-gray-400 dark:text-gray-500 mb-1">{t("uc_corporate_kicker")}</p>
                  <h3 className="text-base font-black text-gray-900 dark:text-white leading-tight mb-2">{t("uc_corporate_title")}</h3>
                  <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed">{t("uc_corporate_desc")}</p>
                </article>
              </div>

              <button
                type="button"
                onClick={() => onNavigate("/use-cases")}
                className="flex items-center gap-2 text-sm font-bold text-purple-600 dark:text-purple-400 hover:text-purple-700 dark:hover:text-purple-300 transition-colors group"
              >
                {t("landing_usecases_cta")}
                <Icon name="arrow_left" className="w-4 h-4 rotate-180 group-hover:translate-x-1 transition-transform" />
              </button>
            </section>

            <section id="como-funciona" className="py-24 px-6 w-full max-w-6xl mx-auto flex flex-col items-center">
              <div className="text-center max-w-3xl mb-14">
                <p className="text-[10px] font-bold uppercase tracking-widest text-blue-600 dark:text-blue-400 mb-3">{t("landing_how_eyebrow")}</p>
                <h2 className="text-4xl md:text-5xl font-black tracking-tight text-gray-900 dark:text-white mb-6 leading-tight text-balance">{t("landing_how_title")}</h2>
                <p className="text-lg text-gray-600 dark:text-gray-300 font-medium text-balance">{t("landing_how_subtitle")}</p>
              </div>

              <ol className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 md:gap-5 w-full">
                {HOW_ITEMS.map((item, index) => (
                  <li
                    key={item.key}
                    id={`como-funciona-${index + 1}`}
                    className="group relative bg-white/70 dark:bg-gray-900/60 backdrop-blur-xl border border-black/10 dark:border-white/10 rounded-3xl p-6 shadow-sm hover:-translate-y-0.5 hover:shadow-md transition-all duration-200 flex flex-col"
                  >
                    <div className="flex items-center justify-between mb-5">
                      <span className="inline-flex w-10 h-10 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-500 to-purple-500 text-white font-black text-lg shadow-sm">
                        {index + 1}
                      </span>
                      <span className="text-[10px] font-bold uppercase tracking-widest text-gray-400 dark:text-gray-500">
                        {String(index + 1).padStart(2, "0")}/{String(HOW_ITEMS.length).padStart(2, "0")}
                      </span>
                    </div>
                    <h3 className="text-lg font-black text-gray-900 dark:text-white leading-snug mb-2 text-balance">
                      {t(item.titleKey)}
                    </h3>
                    <p className="text-sm text-gray-600 dark:text-gray-300 leading-relaxed">
                      {t(item.descKey)}
                    </p>
                  </li>
                ))}
              </ol>
            </section>

            <section id="alternativas" className="py-24 px-6 w-full max-w-6xl mx-auto flex flex-col items-center">
              <div className="text-center max-w-3xl mb-14">
                <p className="text-[10px] font-bold uppercase tracking-widest text-purple-600 dark:text-purple-400 mb-3">{t("landing_compare_eyebrow")}</p>
                <h2 className="text-4xl md:text-5xl font-black tracking-tight text-gray-900 dark:text-white mb-6 leading-tight text-balance">{t("landing_compare_title")}</h2>
                <p className="text-lg text-gray-600 dark:text-gray-300 font-medium text-balance">{t("landing_compare_subtitle")}</p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-5 w-full items-stretch">
                {COMPARE_ITEMS.map((item) => {
                  const highlight = item.isLga;
                  return (
                    <article
                      key={item.key}
                      className={
                        highlight
                          ? "relative rounded-3xl p-6 md:p-7 flex flex-col backdrop-blur-xl bg-gradient-to-br from-blue-500/10 via-white/70 to-purple-500/10 dark:from-blue-500/15 dark:via-gray-900/70 dark:to-purple-500/15 border border-blue-300/40 dark:border-blue-400/30 shadow-lg shadow-blue-500/10 transform lg:-translate-y-2 hover:-translate-y-3 hover:shadow-xl transition-all duration-200"
                          : "relative rounded-3xl p-6 md:p-7 flex flex-col backdrop-blur-xl bg-white/60 dark:bg-gray-900/50 border border-black/10 dark:border-white/10 shadow-sm hover:-translate-y-0.5 hover:shadow-md transition-all duration-200"
                      }
                    >
                      <div className="flex items-center gap-3 mb-5">
                        <div
                          className={
                            highlight
                              ? "w-11 h-11 shrink-0 rounded-2xl bg-gradient-to-br from-blue-500 to-purple-500 text-white flex items-center justify-center shadow-sm"
                              : "w-11 h-11 shrink-0 rounded-2xl bg-gray-100 dark:bg-white/5 text-gray-600 dark:text-gray-300 flex items-center justify-center border border-black/5 dark:border-white/10"
                          }
                        >
                          <Icon name={item.iconName} className="w-5 h-5" />
                        </div>
                        <h3 className={`text-lg font-black leading-tight ${highlight ? "text-gray-900 dark:text-white" : "text-gray-800 dark:text-gray-100"}`}>
                          {t(item.titleKey)}
                        </h3>
                      </div>
                      <p className={`text-sm leading-relaxed ${highlight ? "text-gray-700 dark:text-gray-200 font-medium" : "text-gray-600 dark:text-gray-400"}`}>
                        {t(item.descKey)}
                      </p>
                      {highlight && (
                        <button
                          type="button"
                          onClick={heroCta.onClick}
                          className="mt-6 inline-flex items-center justify-center gap-2 bg-gray-900 dark:bg-white text-white dark:text-gray-900 px-4 py-2.5 rounded-xl font-bold text-sm shadow-sm hover:shadow-md hover:scale-[1.02] transition-all cursor-pointer"
                        >
                          {heroCta.label}
                          <Icon name="arrow_left" className="w-4 h-4 rotate-180" />
                        </button>
                      )}
                    </article>
                  );
                })}
              </div>
            </section>

            <section id="landing-demo-section" className="py-28 md:py-32 px-6 w-full max-w-5xl mx-auto flex flex-col items-center overflow-hidden">
              <div className="text-center max-w-3xl mb-14 md:mb-16">
                <p className="text-[10px] font-bold uppercase tracking-widest text-purple-600 dark:text-purple-400 mb-3">{t("landing_demo_eyebrow")}</p>
                <h2 className="text-3xl md:text-5xl font-black tracking-tight text-gray-900 dark:text-white mb-6 text-balance">{t("landing_demo_title")}</h2>
                <p className="text-lg text-gray-600 dark:text-gray-300 font-medium text-balance">{t("landing_demo_subtitle")}</p>
              </div>

              <div ref={demoSentinelRef} className="w-full">
                {shouldLoadDemo ? (
                  <Suspense fallback={<DemoSkeleton />}>
                    <InteractiveDemo t={t} language={language} />
                  </Suspense>
                ) : (
                  <DemoSkeleton />
                )}
              </div>

              <div className="mt-10 flex flex-col items-center gap-3">
                <button
                  type="button"
                  onClick={() => { trackEvent("cta_explore_demo_click", { location: "demo_section" }); onNavigate("/explore"); }}
                  className="inline-flex items-center gap-2 px-6 py-3 rounded-xl font-bold text-sm
                    bg-white/50 dark:bg-black/20 border border-black/10 dark:border-white/10
                    text-gray-900 dark:text-white shadow-sm
                    hover:bg-white/80 dark:hover:bg-white/5 hover:shadow-md transition-all cursor-pointer"
                >
                  <Icon name="sparkle" className="w-4 h-4 text-indigo-500 dark:text-indigo-400" />
                  {t("landing_explore_cta")}
                  <Icon name="arrow-right" className="w-4 h-4 opacity-60" />
                </button>
                <p className="text-xs text-gray-400 dark:text-gray-500">{t("landing_explore_cta_hint")}</p>
              </div>
            </section>

            <section id="faq" className="py-24 md:py-28 px-6 w-full max-w-3xl mx-auto">
              <div className="text-center mb-12 md:mb-14">
                <h2 className="text-3xl md:text-5xl font-black tracking-tight text-gray-900 dark:text-white mb-4 text-balance">{t("landing_faq_title")}</h2>
                <p className="text-lg text-gray-600 dark:text-gray-300 text-balance">{t("landing_faq_hint")}</p>
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
                        className="w-full flex items-center justify-between gap-4 p-6 text-left focus:outline-none cursor-pointer"
                        onClick={() => setOpenFaqKey((prev) => (prev === item.key ? "" : item.key))}
                        aria-expanded={isOpen}
                      >
                        <span className="font-bold text-gray-900 dark:text-white pr-2">{t(item.questionKey)}</span>
                        <Icon name={isOpen ? "chevron_up" : "chevron_down"} className={`w-5 h-5 text-gray-500 transition-transform shrink-0 ${isOpen ? "rotate-180" : ""}`} />
                      </button>
                      <div className={`overflow-hidden transition-all duration-300 ${isOpen ? "max-h-[900px] opacity-100" : "max-h-0 opacity-0"}`} aria-hidden={!isOpen}>
                        <p className="p-6 pt-4 text-sm text-gray-600 dark:text-gray-400 leading-relaxed border-t border-black/5 dark:border-white/5">
                          {t(item.answerKey)}
                        </p>
                      </div>
                    </article>
                  );
                })}
              </div>

              {(() => {
                const blogPath = language === "es" ? "/blog" : `/${language}/blog`;
                return (
                  <div className="mt-10 md:mt-12 rounded-2xl border border-black/5 dark:border-white/10 bg-gradient-to-br from-blue-50 via-white to-purple-50 dark:from-blue-900/10 dark:via-gray-900/40 dark:to-purple-900/10 backdrop-blur-sm px-6 py-5 flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-4 text-center sm:text-left shadow-sm">
                    <div className="w-10 h-10 shrink-0 rounded-xl bg-gradient-to-br from-blue-500 to-purple-500 text-white flex items-center justify-center shadow-sm">
                      <Icon name="sparkle" className="w-5 h-5" />
                    </div>
                    <p className="text-sm md:text-base text-gray-700 dark:text-gray-200 leading-relaxed text-balance">
                      {t("landing_faq_blog_cta_text")}{" "}
                      <a
                        href={blogPath}
                        onClick={(event) => {
                          event.preventDefault();
                          onNavigate(blogPath);
                        }}
                        className="font-black text-blue-600 dark:text-blue-400 underline decoration-2 underline-offset-4 hover:text-blue-700 dark:hover:text-blue-300 transition-colors"
                      >
                        {t("landing_faq_blog_cta_link")}
                      </a>
                      .
                    </p>
                  </div>
                );
              })()}
            </section>

            {renderWaitlistSection("landing-cta")}
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

                <article className="bg-white dark:bg-gray-900 border border-black/10 dark:border-white/10 rounded-3xl shadow-sm p-8 md:p-10 flex flex-col relative overflow-hidden">
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

                  <button className="w-full bg-gray-900 dark:bg-white text-white dark:text-gray-900 px-6 py-4 rounded-xl font-bold text-lg shadow-sm hover:shadow-md hover:scale-[1.02] transition-all duration-200" type="button" onClick={heroCta.onClick}>
                    {heroCta.label}
                  </button>
                </article>

                <article className="bg-white/40 dark:bg-white/5 backdrop-blur-xl border border-black/5 dark:border-white/5 rounded-3xl shadow-sm p-8 md:p-10 flex flex-col opacity-90">
                  <span className="w-max px-3 py-1 bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400 rounded-full text-[10px] font-bold uppercase tracking-widest mb-4 border border-yellow-200 dark:border-yellow-800/30 shadow-sm">
                    {t("public_coming_badge")}
                  </span>
                  <h2 className="text-2xl font-black text-gray-900 dark:text-white mb-2">{t("public_coming_title")}</h2>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-8">{t("public_coming_subtitle")}</p>

                  <ul className="flex flex-col gap-4 text-gray-600 dark:text-gray-300">
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
                    <h2 className="text-2xl font-black text-gray-900 dark:text-white">{t("landing_contact_channels_title")}</h2>
                    <p className="text-sm text-gray-600 dark:text-gray-400">{t("landing_contact_channels_hint")}</p>
                  </div>

                  <div className="flex flex-col gap-4 mt-2">
                    <div className="flex flex-col gap-1 p-4 bg-white/40 dark:bg-black/20 rounded-xl border border-black/5 dark:border-white/5">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-gray-500 dark:text-gray-300">{t("landing_contact_channel_email")}</span>
                      <a href="mailto:hello@legoodanfitrion.com" className="text-base font-bold text-blue-600 dark:text-blue-400 hover:underline">hello@legoodanfitrion.com</a>
                    </div>
                    <div className="flex flex-col gap-1 p-4 bg-white/40 dark:bg-black/20 rounded-xl border border-black/5 dark:border-white/5">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-gray-500 dark:text-gray-300">{t("landing_contact_channel_web")}</span>
                      <a href="https://legoodanfitrion.com" className="text-base font-bold text-gray-900 dark:text-white hover:underline">legoodanfitrion.com</a>
                    </div>
                    <div className="flex flex-col gap-1 p-4 bg-white/40 dark:bg-black/20 rounded-xl border border-black/5 dark:border-white/5">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-gray-500 dark:text-gray-300">{t("landing_contact_channel_response")}</span>
                      <span className="text-base font-bold text-gray-900 dark:text-white">{t("landing_contact_channel_response_value")}</span>
                    </div>
                  </div>
                </article>

                <form
                  className="bg-white/70 dark:bg-gray-900/70 backdrop-blur-2xl border border-black/10 dark:border-white/10 rounded-3xl shadow-sm p-8 md:p-10 flex flex-col gap-6"
                  onSubmit={handleSendContact}
                  noValidate
                >
                  <div className="flex flex-col gap-2 border-b border-black/5 dark:border-white/10 pb-4">
                    <h2 className="text-xl font-black text-gray-900 dark:text-white">{t("landing_contact_form_title")}</h2>
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

                  <button className="w-full bg-gray-900 dark:bg-white text-white dark:text-gray-900 px-6 py-4 rounded-xl font-bold text-base shadow-lg hover:scale-[1.02] transition-transform disabled:opacity-50 disabled:cursor-not-allowed mt-2" type="submit" disabled={isSendingContact}>
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

          </>
        ) : null}

      </div>

      <GlobalFooter t={t} onNavigate={onNavigate} />

      {toast.visible ? (
        <div className={`fixed bottom-6 right-6 z-[100] px-5 py-3 rounded-2xl shadow-2xl flex items-center gap-3 animate-in slide-in-from-bottom-5 fade-in duration-300 ${toast.type === "error" ? "bg-red-600 text-white" : "bg-gray-900 dark:bg-white text-white dark:text-gray-900"}`} role="status" aria-live="polite">
          <Icon name={toast.type === "error" ? "close" : "check"} className="w-5 h-5" />
          <span className="text-sm font-bold">{toast.text}</span>
        </div>
      ) : null}

    </main>
  );
}

export { LandingScreen };
