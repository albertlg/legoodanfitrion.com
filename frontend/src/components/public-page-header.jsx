import { useState } from "react";
import { Controls } from "./controls";
import { BrandMark } from "./brand-mark";
import { Icon } from "./icons";

const NAV_ITEMS = [
    { key: "features", path: "/", labelKey: "landing_nav_features", anchorId: "caracteristicas" },
    { key: "use-cases", path: "/use-cases", labelKey: "landing_nav_use_cases" },
    { key: "pricing", path: "/pricing", labelKey: "landing_nav_pricing" },
    { key: "blog", path: "/blog", labelKey: "blog_nav_title" },
    { key: "about", path: "/about", labelKey: "landing_nav_about" },
];

export function PublicPageHeader({ t, language, setLanguage, themeMode, setThemeMode, onNavigate, activeKey, session }) {
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

    const rawName = session?.user?.user_metadata?.full_name || "";
    const firstName = rawName.split(" ")[0].trim();
    const ctaLabel = session?.user?.id
        ? (firstName ? t("landing_cta_dashboard_named").replace("{{name}}", firstName) : t("landing_cta_dashboard"))
        : t("sign_in");
    const ctaOnClick = () => { session?.user?.id ? onNavigate("/app") : onNavigate("/login"); };

    function handleNavItemClick(item) {
        setIsMobileMenuOpen(false);
        if (item?.anchorId) {
            onNavigate(`/#${item.anchorId}`);
            return;
        }
        onNavigate(item.path);
    }

    return (
        <>
            <header className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-6 py-4">
                <div className="absolute inset-0 -z-10 bg-white/70 dark:bg-[#0A0D14]/70 backdrop-blur-xl border-b border-black/5 dark:border-white/5 pointer-events-none" />
                <div className="flex items-center gap-6">
                    <button
                        className="flex items-center gap-2 hover:opacity-80 transition-opacity outline-none"
                        type="button"
                        onClick={() => onNavigate("/")}
                    >
                        <BrandMark text="" fallback={t("logo_fallback")} className="w-8 h-8" />
                        <span className="font-black text-lg tracking-tight">{t("app_name")}</span>
                    </button>
                    <nav className="hidden md:flex items-center gap-1">
                        {NAV_ITEMS.map((item) => (
                            <button
                                key={item.key}
                                className={`px-4 py-2 rounded-full text-sm font-bold transition-all ${
                                    item.key === activeKey
                                        ? "bg-black/5 dark:bg-white/10 text-gray-900 dark:text-white"
                                        : "text-gray-500 hover:text-gray-900 hover:bg-black/5 dark:text-gray-400 dark:hover:text-white dark:hover:bg-white/5"
                                }`}
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
                        <Controls
                            themeMode={themeMode}
                            setThemeMode={setThemeMode}
                            language={language}
                            setLanguage={setLanguage}
                            t={t}
                            dropdownDirection="down"
                        />
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
                        onClick={ctaOnClick}
                    >
                        {ctaLabel}
                    </button>
                    <button
                        className="md:hidden p-2 -mr-2 rounded-xl text-gray-600 dark:text-gray-300 hover:bg-black/5 dark:hover:bg-white/10 transition-colors outline-none focus:ring-2 focus:ring-blue-500/50"
                        type="button"
                        onClick={() => setIsMobileMenuOpen(true)}
                        aria-label={t("open_menu")}
                        aria-expanded={isMobileMenuOpen}
                    >
                        <Icon name="menu" className="w-6 h-6" />
                    </button>
                </div>
            </header>

            {/* Mobile overlay */}
            <div
                className={`fixed inset-0 z-[100] transition-opacity duration-300 md:hidden backdrop-blur-sm bg-black/40 dark:bg-black/70 ${
                    isMobileMenuOpen ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
                }`}
                onClick={() => setIsMobileMenuOpen(false)}
            />

            {/* Mobile drawer */}
            <aside
                className={`fixed inset-y-0 right-0 h-full w-72 z-[101] transform transition-transform duration-300 flex flex-col md:hidden backdrop-blur-2xl bg-white/95 dark:bg-[#0A0D14]/95 border-l border-gray-200 dark:border-white/10 shadow-2xl ${
                    isMobileMenuOpen ? "translate-x-0" : "translate-x-full"
                }`}
            >
                <div className="flex items-center justify-between px-5 pt-6 pb-4 border-b border-black/5 dark:border-white/5">
                    <BrandMark text="" fallback={t("logo_fallback")} className="w-6 h-6" />
                    <button
                        className="p-1.5 -mr-1.5 rounded-lg text-gray-500 hover:text-black hover:bg-gray-100 dark:hover:bg-white/5 dark:text-gray-400 dark:hover:text-white transition-colors"
                        type="button"
                        onClick={() => setIsMobileMenuOpen(false)}
                        aria-label={t("close_menu")}
                    >
                        <Icon name="close" className="w-5 h-5" />
                    </button>
                </div>
                <div className="flex-1 overflow-y-auto px-4 py-6 flex flex-col gap-2">
                    {NAV_ITEMS.map((item) => (
                        <button
                            key={`mob-${item.key}`}
                            className={`flex items-center w-full px-4 py-3.5 rounded-2xl text-base font-bold transition-all ${
                                item.key === activeKey
                                    ? "bg-black/5 dark:bg-white/10 text-gray-900 dark:text-white"
                                    : "text-gray-600 hover:bg-black/5 dark:text-gray-300 dark:hover:bg-white/5"
                            }`}
                            onClick={() => handleNavItemClick(item)}
                        >
                            {t(item.labelKey)}
                        </button>
                    ))}
                    <button
                        className="mt-1 w-full text-center border border-black/10 dark:border-white/10 text-gray-900 dark:text-white px-5 py-3 rounded-2xl font-bold text-sm hover:bg-black/5 dark:hover:bg-white/5 transition-all flex items-center justify-center gap-1.5"
                        type="button"
                        onClick={() => { onNavigate("/explore"); setIsMobileMenuOpen(false); }}
                    >
                        Demo
                        <Icon name="arrow_up_right" className="w-3.5 h-3.5" />
                    </button>
                    <button
                        className="mt-1 w-full text-center bg-gray-900 dark:bg-white text-white dark:text-gray-900 px-5 py-3 rounded-2xl font-bold text-sm"
                        type="button"
                        onClick={() => { ctaOnClick(); setIsMobileMenuOpen(false); }}
                    >
                        {ctaLabel}
                    </button>
                </div>
                <div className="p-4 border-t border-black/5 dark:border-white/5">
                    <Controls
                        themeMode={themeMode}
                        setThemeMode={setThemeMode}
                        language={language}
                        setLanguage={setLanguage}
                        t={t}
                        dropdownDirection="up"
                    />
                </div>
            </aside>
        </>
    );
}
