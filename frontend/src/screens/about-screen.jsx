import React from "react";
import { Icon } from "../components/icons";
import { Helmet } from "react-helmet-async";
import { GlobalFooter } from "../components/global-footer";
import { PublicPageHeader } from "../components/public-page-header";

/* ─── Línea temporal ─── */
const TIMELINE_KEYS = [
    "about_timeline_1",
    "about_timeline_2",
    "about_timeline_3",
    "about_timeline_4",
    "about_timeline_5",
    "about_timeline_6"
];

/* ─── Principios de producto ─── */
const PRINCIPLES_KEYS = [
    { icon: "heart", key: "about_principle_1" },
    { icon: "refresh", key: "about_principle_2" },
    { icon: "user", key: "about_principle_3" },
    { icon: "sparkle", key: "about_principle_4" },
    { icon: "settings", key: "about_principle_5" }
];

export function AboutScreen({ language, setLanguage, themeMode, setThemeMode, t, onNavigate }) {
    return (
        <main className="min-h-screen relative bg-gray-50 dark:bg-[#0A0D14] text-gray-900 dark:text-white font-sans selection:bg-blue-200 dark:selection:bg-blue-900 selection:text-blue-900 dark:selection:text-white overflow-hidden flex flex-col">
            <Helmet htmlAttributes={{ lang: language }}>
                <title>{t("about_seo_title")} | {t("app_name")}</title>
                <meta name="description" content={t("about_seo_description")} />
            </Helmet>

            {/* Decorative Blobs */}
            <div className="fixed top-[-10%] right-[-5%] w-[400px] md:w-[600px] h-[400px] md:h-[600px] bg-blue-500/20 dark:bg-blue-600/10 rounded-full mix-blend-multiply filter blur-[80px] md:blur-[120px] opacity-70 pointer-events-none z-0"></div>
            <div className="fixed bottom-[-10%] left-[-5%] w-[400px] md:w-[600px] h-[400px] md:h-[600px] bg-purple-500/20 dark:bg-purple-600/10 rounded-full mix-blend-multiply filter blur-[80px] md:blur-[120px] opacity-70 pointer-events-none z-0"></div>

            <PublicPageHeader
                t={t}
                language={language}
                setLanguage={setLanguage}
                themeMode={themeMode}
                setThemeMode={setThemeMode}
                onNavigate={onNavigate}
                activeKey="about"
            />

            {/* CONTENT */}
            <div className="flex-1 relative z-10 flex flex-col pt-24 md:pt-32">
                <div className="max-w-3xl mx-auto px-6 w-full flex flex-col gap-16 md:gap-20 pb-20">

                    {/* ══════════ 1. HERO ══════════ */}
                    <section className="flex flex-col items-center text-center gap-5">
                        <div className="w-16 h-16 rounded-2xl bg-blue-100 dark:bg-blue-900/30 border border-blue-200/60 dark:border-blue-700/30 flex items-center justify-center shadow-sm">
                            <Icon name="heart" className="w-8 h-8 text-blue-600 dark:text-blue-400" />
                        </div>
                        <h1 className="text-3xl md:text-5xl font-black leading-tight tracking-tight">
                            {t("about_hero_title")}
                        </h1>
                        <p className="text-base md:text-lg text-gray-600 dark:text-gray-300 max-w-2xl leading-relaxed">
                            {t("about_hero_subtitle")}
                        </p>
                    </section>

                    {/* ══════════ 2. LA HISTORIA ══════════ */}
                    <section className="flex flex-col gap-5">
                        <h2 className="text-2xl md:text-3xl font-black">{t("about_story_title")}</h2>
                        <div className="flex flex-col gap-4 text-gray-700 dark:text-gray-300 leading-relaxed text-[15px] md:text-base">
                            <p>{t("about_story_p1")}</p>
                            <p>{t("about_story_p2")}</p>
                            <p>{t("about_story_p3")}</p>
                        </div>
                    </section>

                    {/* ══════════ 3. EL PROBLEMA ══════════ */}
                    <section className="relative rounded-3xl border border-black/5 dark:border-white/10 bg-white/50 dark:bg-white/5 backdrop-blur-xl p-6 md:p-8 flex flex-col gap-5">
                        <h2 className="text-2xl md:text-3xl font-black">{t("about_problem_title")}</h2>
                        <p className="text-gray-700 dark:text-gray-300 leading-relaxed text-[15px] md:text-base">
                            {t("about_problem_intro")}
                        </p>
                        <ul className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            {["about_pain_1", "about_pain_2", "about_pain_3", "about_pain_4", "about_pain_5", "about_pain_6"].map((key) => (
                                <li key={key} className="flex items-start gap-2.5 text-sm text-gray-700 dark:text-gray-300">
                                    <Icon name="close" className="w-4 h-4 mt-0.5 text-red-400 dark:text-red-500 flex-shrink-0" />
                                    <span>{t(key)}</span>
                                </li>
                            ))}
                        </ul>
                    </section>

                    {/* ══════════ 4. LA PROPUESTA ══════════ */}
                    <section className="flex flex-col gap-5">
                        <h2 className="text-2xl md:text-3xl font-black">{t("about_solution_title")}</h2>
                        <p className="text-gray-700 dark:text-gray-300 leading-relaxed text-[15px] md:text-base">
                            {t("about_solution_intro")}
                        </p>
                        <ul className="flex flex-col gap-3">
                            {["about_feature_1", "about_feature_2", "about_feature_3", "about_feature_4", "about_feature_5"].map((key) => (
                                <li key={key} className="flex items-start gap-2.5 text-sm text-gray-700 dark:text-gray-300">
                                    <Icon name="check" className="w-4 h-4 mt-0.5 text-green-500 dark:text-green-400 flex-shrink-0" />
                                    <span>{t(key)}</span>
                                </li>
                            ))}
                        </ul>
                    </section>

                    {/* ══════════ 5. FILOSOFÍA / PRINCIPIOS ══════════ */}
                    <section className="flex flex-col gap-6">
                        <div className="flex flex-col gap-2">
                            <h2 className="text-2xl md:text-3xl font-black">{t("about_philosophy_title")}</h2>
                            <p className="text-gray-600 dark:text-gray-400 text-[15px] md:text-base italic">
                                {t("about_mission")}
                            </p>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            {PRINCIPLES_KEYS.map(({ icon, key }) => (
                                <div key={key} className="flex items-start gap-3 p-4 rounded-2xl border border-black/5 dark:border-white/10 bg-white/40 dark:bg-white/5 backdrop-blur-md">
                                    <div className="w-9 h-9 rounded-xl bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800/30 flex items-center justify-center flex-shrink-0">
                                        <Icon name={icon} className="w-4.5 h-4.5 text-blue-600 dark:text-blue-400" />
                                    </div>
                                    <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed pt-1.5">{t(key)}</p>
                                </div>
                            ))}
                        </div>
                    </section>

                    {/* ══════════ 6. LÍNEA TEMPORAL ══════════ */}
                    <section className="flex flex-col gap-6">
                        <h2 className="text-2xl md:text-3xl font-black">{t("about_timeline_title")}</h2>
                        <div className="relative flex flex-col gap-0 pl-6 border-l-2 border-blue-200 dark:border-blue-800/40">
                            {TIMELINE_KEYS.map((key) => (
                                <div key={key} className="relative pb-6 last:pb-0">
                                    <div className="absolute -left-[25px] top-1 w-3 h-3 rounded-full bg-blue-500 dark:bg-blue-400 border-2 border-white dark:border-gray-900"></div>
                                    <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">{t(key)}</p>
                                </div>
                            ))}
                        </div>
                    </section>

                    {/* ══════════ 6b. GALERÍA PERSONAL ══════════ */}
                    <section className="flex flex-col gap-5">
                        <h2 className="text-xl md:text-2xl font-black text-center">{t("about_gallery_title")}</h2>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 md:gap-6">
                            {/* Foto 10 años */}
                            <figure className="relative group">
                                <div className="overflow-hidden rounded-2xl border border-black/10 dark:border-white/10 shadow-lg">
                                    <img
                                        src="/about-10-years.jpg"
                                        alt={t("about_photo_10_alt")}
                                        className="w-full aspect-square object-cover grayscale group-hover:grayscale-0 group-active:grayscale-0 transition-all duration-700 group-hover:scale-[1.03]"
                                        loading="lazy"
                                    />
                                </div>
                                <figcaption className="mt-2.5 text-center text-xs font-bold text-gray-500 dark:text-gray-400">
                                    {t("about_photo_10_caption")}
                                </figcaption>
                            </figure>

                            {/* Foto 20 años */}
                            <figure className="relative group">
                                <div className="overflow-hidden rounded-2xl border border-black/10 dark:border-white/10 shadow-lg">
                                    <img
                                        src="/about-20-years.jpg"
                                        alt={t("about_photo_20_alt")}
                                        className="w-full aspect-square object-cover grayscale group-hover:grayscale-0 group-active:grayscale-0 transition-all duration-700 group-hover:scale-[1.03]"
                                        loading="lazy"
                                    />
                                </div>
                                <figcaption className="mt-2.5 text-center text-xs font-bold text-gray-500 dark:text-gray-400">
                                    {t("about_photo_20_caption")}
                                </figcaption>
                            </figure>
                        </div>
                    </section>

                    {/* ══════════ 7. EL EQUIPO ══════════ */}
                    <section className="relative rounded-3xl border border-black/5 dark:border-white/10 bg-white/50 dark:bg-white/5 backdrop-blur-xl p-6 md:p-8 flex flex-col gap-6">
                        <h2 className="text-2xl md:text-3xl font-black">{t("about_team_title")}</h2>

                        {/* Albert */}
                        <div className="flex flex-col sm:flex-row items-start gap-4">
                            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-cyan-400 via-blue-500 to-blue-700 flex items-center justify-center text-white text-xl font-black flex-shrink-0 shadow-lg">
                                AL
                            </div>
                            <div className="flex flex-col gap-1">
                                <div className="flex flex-wrap items-center gap-2">
                                    <h3 className="text-lg font-black">Albert López Gálvez</h3>
                                    <span className="text-xs font-bold uppercase tracking-wider text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/30 px-2 py-0.5 rounded-full">{t("about_role_founder")}</span>
                                </div>
                                <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">{t("about_albert_bio")}</p>
                                <a
                                    href="https://albertlg.com"
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="inline-flex items-center gap-1.5 text-sm font-bold text-blue-600 dark:text-blue-400 hover:underline mt-1"
                                >
                                    <Icon name="link" className="w-3.5 h-3.5" />
                                    albertlg.com
                                </a>
                            </div>
                        </div>

                        {/* Laura */}
                        <div className="flex flex-col sm:flex-row items-start gap-4">
                            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-yellow-300 via-emerald-400 to-green-600 flex items-center justify-center text-white text-xl font-black flex-shrink-0 shadow-lg">
                                L
                            </div>
                            <div className="flex flex-col gap-1">
                                <div className="flex flex-wrap items-center gap-2">
                                    <h3 className="text-lg font-black">Laura</h3>
                                    <span className="text-xs font-bold uppercase tracking-wider text-green-700 dark:text-green-400 bg-green-50 dark:bg-green-900/30 px-2 py-0.5 rounded-full">{t("about_role_cofounder")}</span>
                                </div>
                                <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">{t("about_laura_bio")}</p>
                            </div>
                        </div>
                    </section>

                    {/* ══════════ 8. QUÉ NO ES LGA ══════════ */}
                    <section className="flex flex-col gap-4">
                        <h2 className="text-xl md:text-2xl font-black">{t("about_not_title")}</h2>
                        <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
                            {t("about_not_text")}
                        </p>
                    </section>

                    {/* ══════════ 9. ESTADO ACTUAL + PRIVACIDAD ══════════ */}
                    <section className="flex flex-col gap-4 rounded-3xl border border-black/5 dark:border-white/10 bg-white/50 dark:bg-white/5 backdrop-blur-xl p-6 md:p-8">
                        <div className="flex items-center gap-2">
                            <span className="relative flex h-2.5 w-2.5">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-green-500"></span>
                            </span>
                            <span className="text-sm font-bold text-green-700 dark:text-green-400">{t("about_status_badge")}</span>
                        </div>
                        <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">
                            {t("about_status_text")}
                        </p>
                        <p className="text-sm text-gray-500 dark:text-gray-400 leading-relaxed">
                            {t("about_privacy_note")}
                        </p>
                    </section>

                    {/* ══════════ 10. CTA FINAL ══════════ */}
                    <section className="flex flex-col items-center text-center gap-6 py-4">
                        <p className="text-lg md:text-xl font-bold text-gray-700 dark:text-gray-200 max-w-xl leading-relaxed italic">
                            {t("about_cta_quote")}
                        </p>
                        <button
                            type="button"
                            onClick={() => onNavigate("/login")}
                            className="inline-flex items-center justify-center gap-2 px-8 py-3.5 rounded-full bg-gray-900 dark:bg-white text-white dark:text-gray-900 font-bold text-sm shadow-xl hover:scale-[1.02] transition-transform"
                        >
                            <Icon name="sparkle" className="w-4 h-4" />
                            {t("about_cta_button")}
                        </button>

                        {/* Firma */}
                        <div className="flex flex-col items-center gap-1 pt-4">
                            <p className="text-sm font-black text-gray-900 dark:text-white">Albert López Gálvez</p>
                            <p className="text-xs text-gray-500 dark:text-gray-400">{t("about_signature_title")}</p>
                            <p className="text-xs text-gray-400 dark:text-gray-500 italic mt-1">{t("about_signature_laura")}</p>
                        </div>
                    </section>

                </div>
            </div>

            <GlobalFooter t={t} onNavigate={onNavigate} />
        </main>
    );
}
