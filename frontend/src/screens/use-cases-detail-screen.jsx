import React, { useState, useEffect } from "react";
import { Helmet } from "react-helmet-async";
import { Icon } from "../components/icons";
import { SEO } from "../components/seo";
import { GlobalFooter } from "../components/global-footer";
import { PublicPageHeader } from "../components/public-page-header";
import { sanityClient, urlFor } from "../sanityClient";

const UC_META = {
    personal:  { icon: "home",     bgLight: "bg-blue-50",    bgDark: "dark:bg-blue-950/20",    iconBg: "bg-blue-100 dark:bg-blue-900/30",      iconColor: "text-blue-600 dark:text-blue-400",     border: "border-blue-100 dark:border-blue-900/30" },
    gastro:    { icon: "utensils", bgLight: "bg-amber-50",   bgDark: "dark:bg-amber-950/20",   iconBg: "bg-amber-100 dark:bg-amber-900/30",    iconColor: "text-amber-600 dark:text-amber-400",   border: "border-amber-100 dark:border-amber-900/30" },
    penas:     { icon: "users",    bgLight: "bg-indigo-50",  bgDark: "dark:bg-indigo-950/20",  iconBg: "bg-indigo-100 dark:bg-indigo-900/30",  iconColor: "text-indigo-600 dark:text-indigo-400", border: "border-indigo-100 dark:border-indigo-900/30" },
    wellness:  { icon: "heart",    bgLight: "bg-emerald-50", bgDark: "dark:bg-emerald-950/20", iconBg: "bg-emerald-100 dark:bg-emerald-900/30", iconColor: "text-emerald-600 dark:text-emerald-400", border: "border-emerald-100 dark:border-emerald-900/30" },
    corporate:  { icon: "calendar", bgLight: "bg-slate-50",   bgDark: "dark:bg-slate-800/30",   iconBg: "bg-slate-100 dark:bg-slate-800/50",    iconColor: "text-slate-600 dark:text-slate-300",   border: "border-slate-200 dark:border-slate-700/40" },
    life:       { icon: "sparkle",  bgLight: "bg-rose-50",    bgDark: "dark:bg-rose-950/20",    iconBg: "bg-rose-100 dark:bg-rose-900/30",      iconColor: "text-rose-600 dark:text-rose-400",     border: "border-rose-100 dark:border-rose-900/30" },
    despedidas: { icon: "star",     bgLight: "bg-fuchsia-50", bgDark: "dark:bg-fuchsia-950/20", iconBg: "bg-fuchsia-100 dark:bg-fuchsia-900/30", iconColor: "text-fuchsia-600 dark:text-fuchsia-400", border: "border-fuchsia-100 dark:border-fuchsia-900/30" },
    expat:      { icon: "globe",    bgLight: "bg-violet-50",  bgDark: "dark:bg-violet-950/20",  iconBg: "bg-violet-100 dark:bg-violet-900/30",   iconColor: "text-violet-600 dark:text-violet-400",   border: "border-violet-100 dark:border-violet-900/30" }
};

// Maps each hub to the Sanity category titles per language
const HUB_CATEGORIES = {
    personal:   { es: ["Celebraciones", "Planificación"], ca: ["Celebracions", "Planificació"], en: ["Celebrations", "Planning"], fr: ["Fêtes & Célébrations", "Planification"], it: ["Celebrazioni", "Pianificazione"] },
    gastro:     { es: ["Menús y Dietas", "Inspiración"], ca: ["Menús i Dietes", "Inspiració"], en: ["Menus & Diets", "Inspiration"], fr: ["Menús et Régimes", "Inspiration"], it: ["Menù e Diete", "Ispirazione"] },
    penas:      { es: ["Social", "Planificación"], ca: ["Social", "Planificació"], en: ["Social", "Planning"], fr: ["Social", "Planification"], it: ["Socialità", "Pianificazione"] },
    wellness:   { es: ["Retiros y bienestar"], ca: ["Retirs i benestar"], en: ["Wellness & Retreats"], fr: ["Retraites & Bien-être"], it: ["Ritiri e benessere"] },
    corporate:  { es: ["Eventos de empresa", "Planificación"], ca: ["Esdeveniments d'empresa", "Planificació"], en: ["Corporate Events", "Planning"], fr: ["Événements d'entreprise", "Planification"], it: ["Eventi aziendali", "Pianificazione"] },
    life:       { es: ["Celebraciones", "Inspiración"], ca: ["Celebracions", "Inspiració"], en: ["Celebrations", "Inspiration"], fr: ["Fêtes & Célébrations", "Inspiration"], it: ["Celebrazioni", "Ispirazione"] },
    despedidas: { es: ["Despedidas", "Social"], ca: ["Comiats", "Social"], en: ["Hen & Stag Parties", "Social"], fr: ["EVJF & EVG", "Social"], it: ["Addio al nubilato", "Socialità"] },
    expat:      { es: ["Cenas internacionales", "Menús y Dietas"], ca: ["Sopars internacionals", "Menús i Dietes"], en: ["International Dinners", "Menus & Diets"], fr: ["Dîners internationaux", "Menús et Régimes"], it: ["Cene internazionali", "Menù e Diete"] },
};

const PERSONA_ICONS = ["user", "users", "star"];
const FEAT_ICONS = ["check", "sparkle", "user", "calendar", "activity"];

export function UseCaseDetailScreen({ ucKey, language, setLanguage, themeMode, setThemeMode, t, onNavigate }) {
    const meta = UC_META[ucKey] || UC_META.personal;
    const [openFaq, setOpenFaq] = useState(null);
    const [relatedPosts, setRelatedPosts] = useState([]);
    const [isLoadingPosts, setIsLoadingPosts] = useState(true);

    useEffect(() => {
        const catTitles = HUB_CATEGORIES[ucKey]?.[language] || [];
        if (catTitles.length === 0) {
            setRelatedPosts([]);
            setIsLoadingPosts(false);
            return;
        }
        setIsLoadingPosts(true);
        setRelatedPosts([]);
        sanityClient
            .fetch(
                `*[_type == "post" && language == $lang && count(categories[@->title in $catTitles]) > 0] | order(publishedAt desc)[0...3] {
                    _id, title, slug, publishedAt, mainImage, excerpt,
                    "categories": coalesce(categories[]->title, [])
                }`,
                { lang: language, catTitles }
            )
            .then((data) => { setRelatedPosts(data); setIsLoadingPosts(false); })
            .catch(() => setIsLoadingPosts(false));
    }, [ucKey, language]);

    const faqs = [1, 2, 3, 4, 5, 6, 7, 8].map((n) => ({
        q: t(`uc_${ucKey}_page_faq_${n}_q`),
        a: t(`uc_${ucKey}_page_faq_${n}_a`),
    }));

    const faqSchema = {
        "@context": "https://schema.org",
        "@type": "FAQPage",
        "mainEntity": faqs.map(({ q, a }) => ({
            "@type": "Question",
            "name": q,
            "acceptedAnswer": { "@type": "Answer", "text": a }
        }))
    };

    return (
        <main className="min-h-screen relative bg-gray-50 dark:bg-[#0A0D14] text-gray-900 dark:text-white font-sans selection:bg-blue-200 dark:selection:bg-blue-900 selection:text-blue-900 dark:selection:text-white overflow-hidden flex flex-col">
            <SEO
                language={language}
                slug={`use-cases/${ucKey}`}
                title={`${t(`uc_${ucKey}_page_seo_title`)} | ${t("app_name")}`}
                description={t(`uc_${ucKey}_page_seo_desc`)}
            />
            <Helmet>
                <script type="application/ld+json">{JSON.stringify(faqSchema)}</script>
            </Helmet>

            <div className="fixed top-[-10%] right-[-5%] w-[500px] h-[500px] bg-purple-500/10 dark:bg-purple-600/10 rounded-full mix-blend-multiply filter blur-[100px] opacity-60 pointer-events-none z-0" />
            <div className="fixed bottom-[-10%] left-[-5%] w-[500px] h-[500px] bg-blue-500/10 dark:bg-blue-600/10 rounded-full mix-blend-multiply filter blur-[100px] opacity-60 pointer-events-none z-0" />

            <PublicPageHeader
                t={t}
                language={language}
                setLanguage={setLanguage}
                themeMode={themeMode}
                setThemeMode={setThemeMode}
                onNavigate={onNavigate}
                activeKey="use-cases"
            />

            <div className="flex-1 relative z-10 flex flex-col pt-24 md:pt-32">

                {/* ── Breadcrumb ── */}
                <div className="px-6 pt-6 w-full max-w-5xl mx-auto">
                    <button
                        type="button"
                        onClick={() => onNavigate("/use-cases")}
                        className="inline-flex items-center gap-1.5 text-sm text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors group"
                    >
                        <Icon name="arrow_left" className="w-3.5 h-3.5 group-hover:-translate-x-0.5 transition-transform" />
                        {t("landing_nav_use_cases")}
                    </button>
                </div>

                {/* ── Hero ── */}
                <section className="py-14 md:py-20 px-6 w-full max-w-4xl mx-auto flex flex-col items-center text-center gap-5">
                    <div className={`w-16 h-16 rounded-2xl ${meta.iconBg} flex items-center justify-center shadow-sm`}>
                        <Icon name={meta.icon} className={`w-8 h-8 ${meta.iconColor}`} />
                    </div>
                    <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400 dark:text-gray-500">
                        {t(`uc_${ucKey}_page_eyebrow`)}
                    </p>
                    <h1 className="text-4xl md:text-5xl font-black tracking-tight leading-tight text-gray-900 dark:text-white text-balance">
                        {t(`uc_${ucKey}_page_title`)}
                    </h1>
                    <p className="text-lg text-gray-600 dark:text-gray-300 max-w-2xl font-medium text-balance leading-relaxed">
                        {t(`uc_${ucKey}_page_subtitle`)}
                    </p>
                    <div className="flex flex-col sm:flex-row gap-3 mt-2">
                        <button
                            type="button"
                            onClick={() => onNavigate("/login")}
                            className="bg-gray-900 dark:bg-white text-white dark:text-gray-900 px-7 py-3.5 rounded-xl font-bold text-sm shadow-md hover:scale-[1.02] transition-transform flex items-center justify-center gap-2"
                        >
                            {t("use_cases_cta_primary")} <Icon name="arrow_left" className="w-4 h-4 rotate-180" />
                        </button>
                        <button
                            type="button"
                            onClick={() => onNavigate("/explore")}
                            className="bg-white dark:bg-gray-800 text-gray-900 dark:text-white border border-black/10 dark:border-white/10 px-7 py-3.5 rounded-xl font-bold text-sm hover:scale-[1.02] transition-transform"
                        >
                            {t("use_cases_cta_secondary")}
                        </button>
                    </div>
                </section>

                {/* ── Para quién ── */}
                <section className="py-12 px-6 w-full max-w-5xl mx-auto">
                    <h2 className="text-2xl md:text-3xl font-black text-center text-gray-900 dark:text-white mb-10">
                        {t(`uc_${ucKey}_page_whom_title`)}
                    </h2>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                        {PERSONA_ICONS.map((iconName, i) => (
                            <div key={i} className="bg-white/70 dark:bg-gray-900/60 backdrop-blur-sm rounded-2xl border border-black/10 dark:border-white/10 p-6 flex flex-col gap-3">
                                <div className={`w-10 h-10 rounded-xl ${meta.iconBg} flex items-center justify-center`}>
                                    <Icon name={iconName} className={`w-5 h-5 ${meta.iconColor}`} />
                                </div>
                                <h3 className="font-black text-gray-900 dark:text-white">{t(`uc_${ucKey}_page_whom_${i + 1}_title`)}</h3>
                                <p className="text-sm text-gray-600 dark:text-gray-300 leading-relaxed">{t(`uc_${ucKey}_page_whom_${i + 1}_desc`)}</p>
                            </div>
                        ))}
                    </div>
                </section>

                {/* ── Cómo te ayuda ── */}
                <section className="py-12 px-6 w-full max-w-5xl mx-auto">
                    <h2 className="text-2xl md:text-3xl font-black text-center text-gray-900 dark:text-white mb-10">
                        {t(`uc_${ucKey}_page_how_title`)}
                    </h2>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                        {FEAT_ICONS.map((iconName, i) => (
                            <div key={i} className={`flex gap-4 ${meta.bgLight} ${meta.bgDark} rounded-2xl border ${meta.border} p-5`}>
                                <div className={`w-9 h-9 rounded-xl ${meta.iconBg} flex items-center justify-center shrink-0 mt-0.5`}>
                                    <Icon name={iconName} className={`w-4 h-4 ${meta.iconColor}`} />
                                </div>
                                <div>
                                    <h3 className="font-black text-sm text-gray-900 dark:text-white mb-1">{t(`uc_${ucKey}_page_feat_${i + 1}_title`)}</h3>
                                    <p className="text-xs text-gray-600 dark:text-gray-300 leading-relaxed">{t(`uc_${ucKey}_page_feat_${i + 1}_desc`)}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </section>

                {/* ── Tipos de eventos ── */}
                <section className="py-10 pb-16 px-6 w-full max-w-4xl mx-auto">
                    <h2 className="text-xl font-black text-center text-gray-900 dark:text-white mb-7">
                        {t(`uc_${ucKey}_page_ex_title`)}
                    </h2>
                    <div className="flex flex-wrap justify-center gap-3">
                        {[1, 2, 3, 4, 5, 6].map(n => (
                            <span key={n} className={`inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-semibold ${meta.bgLight} ${meta.bgDark} border ${meta.border} text-gray-700 dark:text-gray-200`}>
                                <Icon name={meta.icon} className={`w-3.5 h-3.5 ${meta.iconColor}`} />
                                {t(`uc_${ucKey}_page_ex_${n}`)}
                            </span>
                        ))}
                    </div>
                </section>

                {/* ── FAQs ── */}
                <section className="py-12 px-6 w-full max-w-3xl mx-auto">
                    <h2 className="text-2xl md:text-3xl font-black text-center text-gray-900 dark:text-white mb-8">
                        {t("uc_faq_section_title")}
                    </h2>
                    <div className="flex flex-col gap-3">
                        {faqs.map(({ q, a }, i) => (
                            <div key={i} className="bg-white/70 dark:bg-gray-900/60 backdrop-blur-sm rounded-2xl border border-black/10 dark:border-white/10 overflow-hidden">
                                <button
                                    type="button"
                                    className="w-full flex items-center justify-between gap-4 px-6 py-5 text-left"
                                    onClick={() => setOpenFaq(openFaq === i ? null : i)}
                                    aria-expanded={openFaq === i}
                                >
                                    <span className="font-bold text-gray-900 dark:text-white text-sm sm:text-base leading-snug">{q}</span>
                                    <Icon
                                        name="chevron_down"
                                        className={`w-5 h-5 shrink-0 text-gray-400 transition-transform duration-200 ${openFaq === i ? "rotate-180" : ""}`}
                                    />
                                </button>
                                {openFaq === i && (
                                    <div className="px-6 pb-5">
                                        <p className="text-sm text-gray-600 dark:text-gray-300 leading-relaxed">{a}</p>
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                </section>

                {/* ── Posts relacionados del blog ── */}
                {(isLoadingPosts || relatedPosts.length > 0) && (
                    <section className="py-12 px-6 w-full max-w-5xl mx-auto">
                        <h2 className="text-xl font-black text-gray-900 dark:text-white mb-6">
                            {t("uc_related_posts_section_title")}
                        </h2>
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                            {isLoadingPosts
                                ? [1, 2, 3].map((i) => (
                                    <div key={i} className="h-52 bg-black/5 dark:bg-white/5 animate-pulse rounded-2xl" />
                                ))
                                : relatedPosts.map((post) => {
                                    const postUrl = language === "es"
                                        ? `/blog/${post.slug?.current}`
                                        : `/${language}/blog/${post.slug?.current}`;
                                    return (
                                        <article key={post._id}>
                                            <a
                                                href={postUrl}
                                                onClick={(e) => { e.preventDefault(); onNavigate(postUrl); }}
                                                className="group flex flex-col bg-white/70 dark:bg-gray-900/60 backdrop-blur-sm border border-black/10 dark:border-white/10 rounded-2xl overflow-hidden hover:shadow-xl hover:-translate-y-1 transition-all duration-300 h-full"
                                            >
                                                {post.mainImage ? (
                                                    <div className="w-full h-36 bg-gray-200 dark:bg-gray-800 overflow-hidden shrink-0">
                                                        <img
                                                            src={urlFor(post.mainImage).width(600).height(300).url()}
                                                            alt={post.title}
                                                            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                                                        />
                                                    </div>
                                                ) : (
                                                    <div className={`w-full h-36 ${meta.bgLight} ${meta.bgDark} shrink-0`} />
                                                )}
                                                <div className="p-5 flex flex-col gap-2 flex-1">
                                                    <p className="text-[10px] font-bold uppercase tracking-widest text-blue-600 dark:text-blue-400">
                                                        {new Date(post.publishedAt).toLocaleDateString(language, { day: "numeric", month: "long", year: "numeric" })}
                                                    </p>
                                                    <h3 className="font-black text-sm text-gray-900 dark:text-white leading-snug group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors line-clamp-2">
                                                        {post.title}
                                                    </h3>
                                                    {post.excerpt && (
                                                        <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed line-clamp-2 mt-auto">{post.excerpt}</p>
                                                    )}
                                                </div>
                                            </a>
                                        </article>
                                    );
                                })
                            }
                        </div>
                    </section>
                )}

                {/* ── CTA final ── */}
                <section className="py-16 px-6 w-full max-w-3xl mx-auto flex flex-col items-center text-center gap-5">
                    <div className={`w-14 h-14 rounded-2xl ${meta.iconBg} flex items-center justify-center shadow-sm`}>
                        <Icon name={meta.icon} className={`w-7 h-7 ${meta.iconColor}`} />
                    </div>
                    <h2 className="text-3xl md:text-4xl font-black tracking-tight text-gray-900 dark:text-white text-balance">
                        {t(`uc_${ucKey}_page_title`)}
                    </h2>
                    <p className="text-lg text-gray-600 dark:text-gray-300 font-medium max-w-xl text-balance">
                        {t(`uc_${ucKey}_page_subtitle`)}
                    </p>
                    <div className="flex flex-col sm:flex-row gap-3">
                        <button
                            type="button"
                            onClick={() => onNavigate("/login")}
                            className="bg-gray-900 dark:bg-white text-white dark:text-gray-900 px-8 py-4 rounded-xl font-bold text-base shadow-lg hover:scale-[1.02] transition-transform flex items-center gap-2"
                        >
                            {t("use_cases_cta_primary")} <Icon name="arrow_left" className="w-4 h-4 rotate-180" />
                        </button>
                        <button
                            type="button"
                            onClick={() => onNavigate("/use-cases")}
                            className="bg-white dark:bg-gray-800 text-gray-900 dark:text-white border border-black/10 dark:border-white/10 px-8 py-4 rounded-xl font-bold text-base hover:scale-[1.02] transition-transform"
                        >
                            {t("landing_nav_use_cases")}
                        </button>
                    </div>
                </section>

                <GlobalFooter t={t} language={language} onNavigate={onNavigate} />
            </div>
        </main>
    );
}
