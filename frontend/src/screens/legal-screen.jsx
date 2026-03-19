import React, { useEffect } from "react";
import { BrandMark } from "../components/brand-mark";
import { Icon } from "../components/icons";
import { SEO } from "../components/seo";

export function LegalScreen({ type, t, language, onNavigate }) {
    useEffect(() => { window.scrollTo(0, 0); }, [type]);

    const isPrivacy = type === "privacy";
    const title = isPrivacy ? t("landing_footer_privacy") : t("landing_footer_terms");

    // Asumimos que tendrás claves en tu JSON como "privacy_content" y "terms_content"
    const content = isPrivacy ? t("privacy_content") : t("terms_content");

    return (
        <main className="min-h-screen bg-gray-50 dark:bg-[#0A0D14] text-gray-900 dark:text-white pt-24 pb-12 px-6">
            <SEO title={`${title} | LeGoodAnfitrión`} description={`Documento legal de ${title}`} language={language} slug={type} />

            <header className="max-w-3xl mx-auto mb-12 flex items-center justify-between">
                <button onClick={() => onNavigate("/")} className="flex items-center gap-2 text-sm font-bold text-gray-500 hover:text-black dark:hover:text-white">
                    <Icon name="arrow_left" className="w-5 h-5" /> Volver
                </button>
                <BrandMark className="w-8 h-8 opacity-50 grayscale" />
            </header>

            <article className="max-w-3xl mx-auto bg-white/70 dark:bg-white/5 backdrop-blur-xl border border-black/10 dark:border-white/10 p-8 md:p-12 rounded-3xl shadow-sm">
                <h1 className="text-3xl md:text-4xl font-black mb-8">{title}</h1>
                <div className="prose-custom text-sm md:text-base text-gray-700 dark:text-gray-300 whitespace-pre-line leading-relaxed font-medium">
                    {/* El texto legal vendrá con \n desde tu JSON para hacer los saltos de línea */}
                    {content}
                </div>
            </article>
        </main>
    );
}