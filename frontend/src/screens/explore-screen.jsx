import { useState } from "react";
import { Icon } from "../components/icons";
import { Helmet } from "react-helmet-async";
import { GlobalFooter } from "../components/global-footer";
import { PublicPageHeader } from "../components/public-page-header";
import { signInDemoUser } from "../lib/demo-auth";
import { supabase } from "../lib/supabaseClient";

const SHOWCASE_EVENTS = [
    {
        id: "e7e41000-0000-0000-0000-000000000001",
        kickerKey: "explore_card1_kicker",
        titleKey: "explore_card1_title",
        descKey: "explore_card1_desc",
        tag1Key: "explore_card1_tag1",
        tag2Key: "explore_card1_tag2",
        icon: "users",
        gradient: "from-indigo-500/20 via-blue-500/10 to-transparent",
        border: "border-indigo-500/30 dark:border-indigo-400/20",
        iconBg: "bg-indigo-500/15 dark:bg-indigo-400/15",
        iconColor: "text-indigo-600 dark:text-indigo-400",
        kickerColor: "text-indigo-700 dark:text-indigo-300 bg-indigo-100/80 dark:bg-indigo-900/40",
        ctaColor: "bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 focus-visible:ring-indigo-500",
    },
    {
        id: "e7e41000-0000-0000-0000-000000000002",
        kickerKey: "explore_card2_kicker",
        titleKey: "explore_card2_title",
        descKey: "explore_card2_desc",
        tag1Key: "explore_card2_tag1",
        tag2Key: "explore_card2_tag2",
        icon: "heart",
        gradient: "from-rose-500/20 via-pink-500/10 to-transparent",
        border: "border-rose-500/30 dark:border-rose-400/20",
        iconBg: "bg-rose-500/15 dark:bg-rose-400/15",
        iconColor: "text-rose-600 dark:text-rose-400",
        kickerColor: "text-rose-700 dark:text-rose-300 bg-rose-100/80 dark:bg-rose-900/40",
        ctaColor: "bg-rose-600 hover:bg-rose-700 active:bg-rose-800 focus-visible:ring-rose-500",
    },
    {
        id: "e7e41000-0000-0000-0000-000000000003",
        kickerKey: "explore_card3_kicker",
        titleKey: "explore_card3_title",
        descKey: "explore_card3_desc",
        tag1Key: "explore_card3_tag1",
        tag2Key: "explore_card3_tag2",
        icon: "utensils",
        gradient: "from-amber-500/20 via-orange-500/10 to-transparent",
        border: "border-amber-500/30 dark:border-amber-400/20",
        iconBg: "bg-amber-500/15 dark:bg-amber-400/15",
        iconColor: "text-amber-600 dark:text-amber-400",
        kickerColor: "text-amber-700 dark:text-amber-300 bg-amber-100/80 dark:bg-amber-900/40",
        ctaColor: "bg-amber-600 hover:bg-amber-700 active:bg-amber-800 focus-visible:ring-amber-500",
    },
];

export function ExploreScreen({ language, setLanguage, themeMode, setThemeMode, t, onNavigate }) {
    const [loadingCardId, setLoadingCardId] = useState(null);
    const [errorCardId, setErrorCardId] = useState(null);

    async function handleExploreEvent(eventId) {
        if (loadingCardId) return;
        setLoadingCardId(eventId);
        setErrorCardId(null);

        const { error } = await signInDemoUser(supabase);
        if (error) {
            setLoadingCardId(null);
            setErrorCardId(eventId);
            return;
        }

        onNavigate(`/app/events/${eventId}/plan/overview`);
    }

    return (
        <main className="min-h-screen relative bg-gray-50 dark:bg-[#0A0D14] text-gray-900 dark:text-white font-sans selection:bg-blue-200 dark:selection:bg-blue-900 selection:text-blue-900 dark:selection:text-white overflow-hidden flex flex-col">
            <Helmet htmlAttributes={{ lang: language }}>
                <title>{t("explore_seo_title")}</title>
                <meta name="description" content={t("explore_seo_desc")} />
                <meta name="robots" content="index, follow" />
            </Helmet>

            {/* Decorative blobs */}
            <div className="fixed top-[-10%] right-[-5%] w-[400px] md:w-[600px] h-[400px] md:h-[600px] bg-indigo-500/15 dark:bg-indigo-600/8 rounded-full filter blur-[100px] opacity-60 pointer-events-none z-0" />
            <div className="fixed bottom-[-10%] left-[-5%] w-[400px] md:w-[500px] h-[400px] md:h-[500px] bg-rose-500/10 dark:bg-rose-600/8 rounded-full filter blur-[100px] opacity-60 pointer-events-none z-0" />

            <PublicPageHeader
                t={t}
                language={language}
                setLanguage={setLanguage}
                themeMode={themeMode}
                setThemeMode={setThemeMode}
                onNavigate={onNavigate}
                activeKey="explore"
            />

            {/* Content */}
            <div className="relative z-10 flex-1 flex flex-col pt-24 pb-20 px-4 sm:px-6 max-w-6xl mx-auto w-full">

                {/* Hero */}
                <section className="text-center mb-14 mt-6">
                    <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-indigo-100/80 dark:bg-indigo-900/30 border border-indigo-200/60 dark:border-indigo-500/20 mb-5">
                        <Icon name="sparkle" className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                        <span className="text-xs font-semibold text-indigo-700 dark:text-indigo-300 tracking-wide uppercase">
                            {t("explore_badge")}
                        </span>
                    </div>
                    <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight text-gray-900 dark:text-white mb-4">
                        {t("explore_hero_title")}
                    </h1>
                    <p className="text-base sm:text-lg text-gray-500 dark:text-gray-400 max-w-xl mx-auto">
                        {t("explore_hero_subtitle")}
                    </p>
                </section>

                {/* Bento cards */}
                <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 mb-16">
                    {SHOWCASE_EVENTS.map((event) => {
                        const isLoading = loadingCardId === event.id;
                        const hasError = errorCardId === event.id;
                        return (
                            <article
                                key={event.id}
                                className={`relative flex flex-col rounded-2xl border ${event.border} bg-white dark:bg-white/[0.03] overflow-hidden shadow-sm hover:shadow-md transition-shadow`}
                            >
                                {/* Gradient top accent */}
                                <div className={`absolute inset-0 bg-gradient-to-br ${event.gradient} pointer-events-none`} />

                                <div className="relative flex flex-col flex-1 p-6 gap-4">
                                    {/* Icon + kicker */}
                                    <div className="flex items-center gap-3">
                                        <span className={`flex items-center justify-center w-10 h-10 rounded-xl ${event.iconBg}`}>
                                            <Icon name={event.icon} className={`w-5 h-5 ${event.iconColor}`} />
                                        </span>
                                        <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${event.kickerColor}`}>
                                            {t(event.kickerKey)}
                                        </span>
                                    </div>

                                    {/* Title + desc */}
                                    <div className="flex flex-col gap-1.5">
                                        <h2 className="text-base font-bold text-gray-900 dark:text-white leading-snug">
                                            {t(event.titleKey)}
                                        </h2>
                                        <p className="text-sm text-gray-500 dark:text-gray-400 leading-relaxed">
                                            {t(event.descKey)}
                                        </p>
                                    </div>

                                    {/* Tags */}
                                    <div className="flex flex-wrap gap-2 mt-auto">
                                        <span className="inline-flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400 bg-black/5 dark:bg-white/8 px-2.5 py-1 rounded-full">
                                            <Icon name="users" className="w-3 h-3" />
                                            {t(event.tag1Key)}
                                        </span>
                                        <span className="inline-flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400 bg-black/5 dark:bg-white/8 px-2.5 py-1 rounded-full">
                                            <Icon name="check" className="w-3 h-3" />
                                            {t(event.tag2Key)}
                                        </span>
                                    </div>

                                    {/* Error message */}
                                    {hasError && (
                                        <p className="text-xs text-red-600 dark:text-red-400">
                                            {t("explore_cta_error")}
                                        </p>
                                    )}

                                    {/* CTA button */}
                                    <button
                                        type="button"
                                        disabled={!!loadingCardId}
                                        onClick={() => handleExploreEvent(event.id)}
                                        className={`mt-1 w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold text-white
                                            transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2
                                            disabled:opacity-60 disabled:cursor-not-allowed
                                            ${event.ctaColor}`}
                                    >
                                        {isLoading ? (
                                            <>
                                                <Icon name="loader" className="w-4 h-4 animate-spin" />
                                                {t("explore_cta_loading")}
                                            </>
                                        ) : (
                                            <>
                                                {t("explore_cta_button")}
                                                <Icon name="arrow-right" className="w-4 h-4" />
                                            </>
                                        )}
                                    </button>
                                </div>
                            </article>
                        );
                    })}
                </section>

                {/* Bottom CTA */}
                <section className="text-center py-14 px-6 rounded-2xl bg-gradient-to-br from-indigo-600/10 via-purple-600/5 to-transparent border border-indigo-200/40 dark:border-indigo-500/15">
                    <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white mb-3">
                        {t("explore_bottom_title")}
                    </h2>
                    <p className="text-gray-500 dark:text-gray-400 mb-7 max-w-sm mx-auto">
                        {t("explore_bottom_subtitle")}
                    </p>
                    <button
                        type="button"
                        onClick={() => onNavigate("/register")}
                        className="inline-flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-semibold text-white
                            bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800
                            transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2"
                    >
                        {t("explore_bottom_cta")}
                        <Icon name="arrow-right" className="w-4 h-4" />
                    </button>
                </section>
            </div>

            <GlobalFooter t={t} onNavigate={onNavigate} language={language} />
        </main>
    );
}
