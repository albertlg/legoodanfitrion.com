import React from "react";
import { Icon } from "../components/icons";
import { SEO } from "../components/seo";
import { GlobalFooter } from "../components/global-footer";
import { PublicPageHeader } from "../components/public-page-header";

const USE_CASES = [
    {
        key: "personal",
        icon: "home",
        color: "blue",
        bgLight: "bg-blue-50",
        bgDark: "dark:bg-blue-950/20",
        iconBg: "bg-blue-100 dark:bg-blue-900/30",
        iconColor: "text-blue-600 dark:text-blue-400",
        border: "border-blue-100 dark:border-blue-900/30",
        accent: "from-blue-400 to-blue-500"
    },
    {
        key: "gastro",
        icon: "utensils",
        color: "amber",
        bgLight: "bg-amber-50",
        bgDark: "dark:bg-amber-950/20",
        iconBg: "bg-amber-100 dark:bg-amber-900/30",
        iconColor: "text-amber-600 dark:text-amber-400",
        border: "border-amber-100 dark:border-amber-900/30",
        accent: "from-amber-400 to-orange-500"
    },
    {
        key: "penas",
        icon: "users",
        color: "indigo",
        bgLight: "bg-indigo-50",
        bgDark: "dark:bg-indigo-950/20",
        iconBg: "bg-indigo-100 dark:bg-indigo-900/30",
        iconColor: "text-indigo-600 dark:text-indigo-400",
        border: "border-indigo-100 dark:border-indigo-900/30",
        accent: "from-indigo-400 to-indigo-600"
    },
    {
        key: "wellness",
        icon: "heart",
        color: "emerald",
        bgLight: "bg-emerald-50",
        bgDark: "dark:bg-emerald-950/20",
        iconBg: "bg-emerald-100 dark:bg-emerald-900/30",
        iconColor: "text-emerald-600 dark:text-emerald-400",
        border: "border-emerald-100 dark:border-emerald-900/30",
        accent: "from-emerald-400 to-teal-500"
    },
    {
        key: "corporate",
        icon: "calendar",
        color: "slate",
        bgLight: "bg-slate-50",
        bgDark: "dark:bg-slate-800/30",
        iconBg: "bg-slate-100 dark:bg-slate-800/50",
        iconColor: "text-slate-600 dark:text-slate-300",
        border: "border-slate-200 dark:border-slate-700/40",
        accent: "from-slate-400 to-slate-600"
    },
    {
        key: "life",
        icon: "sparkle",
        color: "rose",
        bgLight: "bg-rose-50",
        bgDark: "dark:bg-rose-950/20",
        iconBg: "bg-rose-100 dark:bg-rose-900/30",
        iconColor: "text-rose-600 dark:text-rose-400",
        border: "border-rose-100 dark:border-rose-900/30",
        accent: "from-rose-400 to-pink-500"
    },
    {
        key: "despedidas",
        icon: "star",
        color: "fuchsia",
        bgLight: "bg-fuchsia-50",
        bgDark: "dark:bg-fuchsia-950/20",
        iconBg: "bg-fuchsia-100 dark:bg-fuchsia-900/30",
        iconColor: "text-fuchsia-600 dark:text-fuchsia-400",
        border: "border-fuchsia-100 dark:border-fuchsia-900/30",
        accent: "from-fuchsia-400 to-pink-500"
    },
    {
        key: "expat",
        icon: "globe",
        color: "violet",
        bgLight: "bg-violet-50",
        bgDark: "dark:bg-violet-950/20",
        iconBg: "bg-violet-100 dark:bg-violet-900/30",
        iconColor: "text-violet-600 dark:text-violet-400",
        border: "border-violet-100 dark:border-violet-900/30",
        accent: "from-violet-400 to-purple-500"
    }
];

export function UseCasesScreen({ language, setLanguage, themeMode, setThemeMode, t, onNavigate }) {
    return (
        <main className="min-h-screen relative bg-gray-50 dark:bg-[#0A0D14] text-gray-900 dark:text-white font-sans selection:bg-blue-200 dark:selection:bg-blue-900 selection:text-blue-900 dark:selection:text-white overflow-hidden flex flex-col">
            <SEO
                language={language}
                slug="use-cases"
                title={`${t("use_cases_seo_title")} | ${t("app_name")}`}
                description={t("use_cases_seo_desc")}
            />

            {/* Decorative blobs */}
            <div className="fixed top-[-10%] right-[-5%] w-[400px] md:w-[600px] h-[400px] md:h-[600px] bg-purple-500/20 dark:bg-purple-600/10 rounded-full mix-blend-multiply filter blur-[80px] md:blur-[120px] opacity-70 pointer-events-none z-0" />
            <div className="fixed bottom-[-10%] left-[-5%] w-[400px] md:w-[600px] h-[400px] md:h-[600px] bg-blue-500/20 dark:bg-blue-600/10 rounded-full mix-blend-multiply filter blur-[80px] md:blur-[120px] opacity-70 pointer-events-none z-0" />

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

                {/* ══════════ HERO ══════════ */}
                <section className="py-16 md:py-24 px-6 w-full max-w-4xl mx-auto flex flex-col items-center text-center gap-6">
                    <p className="text-[10px] font-bold uppercase tracking-widest text-purple-600 dark:text-purple-400">
                        {t("use_cases_hero_eyebrow")}
                    </p>
                    <h1 className="text-4xl md:text-6xl font-black tracking-tight leading-tight text-gray-900 dark:text-white text-balance">
                        {t("use_cases_hero_title")}
                    </h1>
                    <p className="text-lg md:text-xl text-gray-600 dark:text-gray-300 max-w-2xl font-medium text-balance">
                        {t("use_cases_hero_subtitle")}
                    </p>
                    <div className="flex flex-col sm:flex-row gap-3 mt-2">
                        <button
                            type="button"
                            onClick={() => onNavigate("/login")}
                            className="bg-gray-900 dark:bg-white text-white dark:text-gray-900 px-6 py-3 rounded-xl font-bold text-sm shadow-md hover:scale-[1.02] transition-transform flex items-center justify-center gap-2"
                        >
                            {t("use_cases_cta_primary")} <Icon name="arrow_left" className="w-4 h-4 rotate-180" />
                        </button>
                        <button
                            type="button"
                            onClick={() => onNavigate("/explore")}
                            className="bg-white dark:bg-gray-800 text-gray-900 dark:text-white border border-black/10 dark:border-white/10 px-6 py-3 rounded-xl font-bold text-sm hover:scale-[1.02] transition-transform"
                        >
                            {t("use_cases_cta_secondary")}
                        </button>
                    </div>
                </section>

                {/* ══════════ CARDS GRID ══════════ */}
                <section className="py-8 pb-24 px-6 w-full max-w-6xl mx-auto">
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                        {USE_CASES.map((uc) => (
                            <article
                                key={uc.key}
                                onClick={() => onNavigate(`/use-cases/${uc.key}`)}
                                className={`relative flex flex-col rounded-3xl border ${uc.bgLight} ${uc.bgDark} ${uc.border} p-7 overflow-hidden group transition-transform hover:-translate-y-1 cursor-pointer`}
                            >
                                {/* Top accent line */}
                                <div className={`absolute top-0 left-0 w-full h-1 bg-gradient-to-r ${uc.accent} opacity-80`} />

                                {/* Icon */}
                                <div className={`w-12 h-12 rounded-2xl ${uc.iconBg} flex items-center justify-center mb-5 shadow-sm`}>
                                    <Icon name={uc.icon} className={`w-6 h-6 ${uc.iconColor}`} />
                                </div>

                                {/* Kicker */}
                                <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400 dark:text-gray-500 mb-1.5">
                                    {t(`uc_${uc.key}_kicker`)}
                                </p>

                                {/* Title */}
                                <h2 className="text-xl font-black text-gray-900 dark:text-white leading-tight mb-3">
                                    {t(`uc_${uc.key}_title`)}
                                </h2>

                                {/* Description */}
                                <p className="text-sm text-gray-600 dark:text-gray-300 leading-relaxed flex-1 mb-5">
                                    {t(`uc_${uc.key}_desc`)}
                                </p>

                                {/* Feature chips + ver más */}
                                <div className="pt-4 border-t border-black/5 dark:border-white/10 flex items-center justify-between gap-3">
                                    <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400 dark:text-gray-500">
                                        {t(`uc_${uc.key}_chips`)}
                                    </p>
                                    <span className={`shrink-0 flex items-center gap-1 text-[10px] font-bold uppercase tracking-widest ${uc.iconColor} group-hover:translate-x-0.5 transition-transform`}>
                                        <Icon name="arrow_left" className="w-3 h-3 rotate-180" />
                                    </span>
                                </div>
                            </article>
                        ))}
                    </div>
                </section>

                {/* ══════════ BOTTOM CTA ══════════ */}
                <section className="py-20 px-6 w-full max-w-3xl mx-auto flex flex-col items-center text-center gap-6">
                    <div className="w-14 h-14 rounded-2xl bg-purple-100 dark:bg-purple-900/30 border border-purple-200/60 dark:border-purple-700/30 flex items-center justify-center shadow-sm">
                        <Icon name="sparkle" className="w-7 h-7 text-purple-600 dark:text-purple-400" />
                    </div>
                    <h2 className="text-3xl md:text-4xl font-black tracking-tight text-gray-900 dark:text-white text-balance">
                        {t("use_cases_hero_title")}
                    </h2>
                    <p className="text-lg text-gray-600 dark:text-gray-300 font-medium max-w-xl text-balance">
                        {t("use_cases_hero_subtitle")}
                    </p>
                    <button
                        type="button"
                        onClick={() => onNavigate("/login")}
                        className="bg-gray-900 dark:bg-white text-white dark:text-gray-900 px-8 py-4 rounded-xl font-bold text-base shadow-lg hover:scale-[1.02] transition-transform flex items-center gap-2"
                    >
                        {t("use_cases_cta_primary")} <Icon name="arrow_left" className="w-4 h-4 rotate-180" />
                    </button>
                </section>

                <GlobalFooter t={t} language={language} onNavigate={onNavigate} />
            </div>
        </main>
    );
}
