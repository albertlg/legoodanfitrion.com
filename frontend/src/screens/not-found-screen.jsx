import { Helmet } from "react-helmet-async";
import { BrandMark } from "../components/brand-mark";
import { PublicLink } from "../components/public-link";

// Pantalla para URLs que no existen. El servidor la sirve con estado HTTP 404
// (dist/404.html) y lleva noindex, para que los buscadores no la confundan con
// la home ("soft 404").
const SUGGESTED_LINKS = [
    { to: "/", labelKey: "landing_back_home" },
    { to: "/use-cases", labelKey: "landing_nav_use_cases" },
    { to: "/blog", labelKey: "blog_nav_title" },
    { to: "/pricing", labelKey: "landing_nav_pricing" }
];

export function NotFoundScreen({ t, language, onNavigate }) {
    return (
        <main className="min-h-screen bg-gray-50 dark:bg-[#0A0D14] text-gray-900 dark:text-white flex flex-col items-center justify-center px-6 py-24">
            <Helmet defer={false} htmlAttributes={{ lang: language }}>
                <title>{`${t("not_found_title")} | LeGoodAnfitrión`}</title>
                <meta name="robots" content="noindex, follow" />
            </Helmet>

            <PublicLink to="/" language={language} onNavigate={onNavigate} className="mb-10 hover:opacity-80 transition-opacity">
                <BrandMark text="" fallback={t("logo_fallback")} className="w-12 h-12" />
            </PublicLink>

            <p className="text-sm font-bold uppercase tracking-widest text-gray-500 dark:text-gray-400 mb-3">404</p>
            <h1 className="text-3xl md:text-4xl font-black text-center mb-4">{t("not_found_title")}</h1>
            <p className="text-gray-600 dark:text-gray-300 text-center max-w-md mb-10">{t("not_found_subtitle")}</p>

            <nav className="flex flex-wrap justify-center gap-3" aria-label={t("not_found_title")}>
                {SUGGESTED_LINKS.map((link, index) => (
                    <PublicLink
                        key={link.to}
                        to={link.to}
                        language={language}
                        onNavigate={onNavigate}
                        className={
                            index === 0
                                ? "px-6 py-3 rounded-xl font-bold text-sm bg-gray-900 text-white dark:bg-white dark:text-gray-900 hover:scale-[1.02] transition-transform"
                                : "px-6 py-3 rounded-xl font-bold text-sm border border-black/10 dark:border-white/10 hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
                        }
                    >
                        {t(link.labelKey)}
                    </PublicLink>
                ))}
            </nav>
        </main>
    );
}
