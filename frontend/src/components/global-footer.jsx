import React from "react";
import { BrandMark } from "./brand-mark";
import { Icon } from "./icons";

export function GlobalFooter({ t, onNavigate }) {
    return (
        <footer className="w-full bg-white/30 dark:bg-black/30 backdrop-blur-lg border-t border-black/5 dark:border-white/5 py-8 mt-auto relative z-20">
            <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row items-center justify-between gap-8">

                {/* Marca y Copyright */}
                <div className="flex flex-col items-center md:items-start gap-2">
                    <div className="flex items-center gap-2">
                        <BrandMark text="" fallback={t("logo_fallback")} className="w-5 h-5 opacity-50 grayscale" />
                        <span className="font-bold tracking-tight text-gray-900 dark:text-white opacity-80">{t("app_name")}</span>
                    </div>
                    <p className="text-xs font-bold text-gray-500 dark:text-gray-400 text-center md:text-left">
                        {t("landing_footer_copyright")}
                    </p>
                </div>

                {/* Enlaces y Redes */}
                <div className="flex flex-col sm:flex-row items-center gap-6 sm:gap-10">

                    {/* Enlaces Legales */}
                    <div className="flex flex-wrap items-center justify-center gap-6">
                        <button className="text-sm font-medium text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white transition-colors" type="button" onClick={() => onNavigate("/privacy")}>
                            {t("landing_footer_privacy")}
                        </button>
                        <button className="text-sm font-medium text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white transition-colors" type="button" onClick={() => onNavigate("/terms")}>
                            {t("landing_footer_terms")}
                        </button>
                        <button className="text-sm font-medium text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white transition-colors" type="button" onClick={() => onNavigate("/contact")}>
                            {t("landing_nav_contact")}
                        </button>
                    </div>

                    {/* Separador Visual (Solo en Desktop) */}
                    <div className="hidden sm:block w-px h-6 bg-gray-300 dark:bg-gray-700"></div>

                    {/* Redes Sociales */}
                    <div className="flex items-center gap-4">
                        <a
                            href="https://www.instagram.com/legoodanfitrion"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-2 -m-2 text-gray-400 hover:text-pink-600 dark:hover:text-pink-500 transition-colors"
                            aria-label="Instagram de LeGoodAnfitrión"
                        >
                            <Icon name="instagram" className="w-5 h-5" />
                        </a>
                        <a
                            href="https://x.com/legoodanfitrion"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-2 -m-2 text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
                            aria-label="X (Twitter) de LeGoodAnfitrión"
                        >
                            <Icon name="social_x" className="w-5 h-5" />
                        </a>
                    </div>

                </div>
            </div>
        </footer>
    );
}
