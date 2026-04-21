import React, { useState, useEffect } from "react";
import { sanityClient, urlFor } from "../sanityClient";
import { Controls } from "../components/controls";
import { BrandMark } from "../components/brand-mark";
import { Icon } from "../components/icons";
import { Helmet } from "react-helmet-async";
import { GlobalFooter } from "../components/global-footer";

const NAV_ITEMS = [
    { key: "features", path: "/", labelKey: "landing_nav_features", anchorId: "caracteristicas" },
    { key: "pricing", path: "/pricing", labelKey: "landing_nav_pricing" },
    { key: "contact", path: "/contact", labelKey: "landing_nav_contact" },
    { key: "blog", path: "/blog", labelKey: "blog_nav_title" },
    { key: "about", path: "/about", labelKey: "landing_nav_about" }
];

export function BlogIndexScreen({ language, setLanguage, themeMode, setThemeMode, t, onNavigate }) {
    const [posts, setPosts] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

    const handleNavItemClick = (item) => {
        if (item?.anchorId) {
            onNavigate("/#caracteristicas");
            return;
        }
        onNavigate(item.path);
    };

    useEffect(() => {
        setIsLoading(true);
        sanityClient
            .fetch(
                `*[_type == "post" && language == $lang]{
          _id,
          title,
          slug,
          publishedAt,
          mainImage,
          excerpt,
          "authorName": author->name,
          "authorImage": author->image,
          "categories": coalesce(categories[]->title, [])
        } | order(publishedAt desc)`,
                { lang: language }
            )
            .then((data) => {
                setPosts(data);
                setIsLoading(false);
            })
            .catch((error) => {
                console.error("Error fetching posts:", error);
                setIsLoading(false);
            });
    }, [language]);

    return (
        <main className="min-h-screen relative bg-gray-50 dark:bg-[#0A0D14] text-gray-900 dark:text-white font-sans selection:bg-blue-200 dark:selection:bg-blue-900 selection:text-blue-900 dark:selection:text-white overflow-hidden flex flex-col">
            <Helmet htmlAttributes={{ lang: language }}>
                <title>{t("blog_title")} | {t("app_name")}</title>
                <meta name="description" content={t("blog_subtitle")} />
            </Helmet>

            {/* Decorative Blobs */}
            <div className="fixed top-[-10%] right-[-5%] w-[400px] md:w-[600px] h-[400px] md:h-[600px] bg-blue-500/20 dark:bg-blue-600/10 rounded-full mix-blend-multiply filter blur-[80px] md:blur-[120px] opacity-70 pointer-events-none z-0"></div>
            <div className="fixed bottom-[-10%] left-[-5%] w-[400px] md:w-[600px] h-[400px] md:h-[600px] bg-purple-500/20 dark:bg-purple-600/10 rounded-full mix-blend-multiply filter blur-[80px] md:blur-[120px] opacity-70 pointer-events-none z-0"></div>

            {/* HEADER (Sticky) - Igual que Landing */}
            <header className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-6 py-4 bg-white/70 dark:bg-[#0A0D14]/70 backdrop-blur-xl border-b border-black/5 dark:border-white/5">
                <div className="flex items-center gap-6">
                    <button className="flex items-center gap-2 hover:opacity-80 transition-opacity outline-none" type="button" onClick={() => onNavigate("/")}>
                        <BrandMark text="" fallback={t("logo_fallback")} className="w-8 h-8" />
                        <span className="font-black text-lg tracking-tight">{t("app_name")}</span>
                    </button>

                    <nav className="hidden md:flex items-center gap-1">
                        {NAV_ITEMS.map((item) => (
                            <button
                                key={item.key}
                                className={`px-4 py-2 rounded-full text-sm font-bold transition-all ${item.key === "blog" ? "bg-black/5 dark:bg-white/10 text-gray-900 dark:text-white" : "text-gray-500 hover:text-gray-900 hover:bg-black/5 dark:text-gray-400 dark:hover:text-white dark:hover:bg-white/5"}`}
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
                        className="hidden sm:block bg-gray-900 dark:bg-white text-white dark:text-gray-900 px-5 py-2.5 rounded-full font-bold text-sm shadow-md hover:scale-[1.02] transition-transform"
                        type="button"
                        onClick={() => onNavigate("/login")}
                    >
                        {t("landing_cta_create_event")}
                    </button>
                    <button
                        className="md:hidden p-2 -mr-2 rounded-xl text-gray-600 dark:text-gray-300 hover:bg-black/5 dark:hover:bg-white/10 transition-colors outline-none focus:ring-2 focus:ring-blue-500/50"
                        onClick={() => setIsMobileMenuOpen(true)}
                        aria-label={t("open_menu")}
                        aria-expanded={isMobileMenuOpen}
                    >
                        <Icon name="menu" className="w-6 h-6" />
                    </button>
                </div>
            </header>

            {/* Menú Móvil */}
            <div className={`fixed inset-0 z-[100] transition-opacity duration-300 md:hidden backdrop-blur-sm bg-black/40 dark:bg-black/70 ${isMobileMenuOpen ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"}`} onClick={() => setIsMobileMenuOpen(false)} />
            <aside className={`fixed inset-y-0 right-0 h-full w-72 z-[101] transform transition-transform duration-300 flex flex-col md:hidden backdrop-blur-2xl bg-white/95 dark:bg-[#0A0D14]/95 border-l border-gray-200 dark:border-white/10 shadow-2xl ${isMobileMenuOpen ? "translate-x-0" : "translate-x-full"}`}>
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
                            className={`flex items-center w-full px-4 py-3.5 rounded-2xl text-base font-bold transition-all ${item.key === "blog" ? "bg-black/5 dark:bg-white/10 text-gray-900 dark:text-white" : "text-gray-600 hover:bg-black/5 dark:text-gray-300 dark:hover:bg-white/5"}`}
                            onClick={() => { handleNavItemClick(item); setIsMobileMenuOpen(false); }}
                        >
                            {t(item.labelKey)}
                        </button>
                    ))}
                    <div className="mt-4 pt-6 border-t border-black/5 dark:border-white/5 flex flex-col gap-6">
                        <button className="w-full bg-gray-900 dark:bg-white text-white dark:text-gray-900 px-6 py-4 rounded-2xl font-black text-base shadow-lg" onClick={() => { onNavigate("/login"); setIsMobileMenuOpen(false); }}>
                            {t("landing_cta_create_event")}
                        </button>
                        <div className="flex justify-center"><Controls themeMode={themeMode} setThemeMode={setThemeMode} language={language} setLanguage={setLanguage} t={t} /></div>
                    </div>
                </div>
            </aside>

            {/* MAIN CONTENT */}
            <div className="flex-1 relative z-10 flex flex-col pt-24 md:pt-32">
                <section className="pt-8 pb-12 sm:pt-16 sm:pb-16 px-6 max-w-4xl mx-auto text-center animate-in fade-in slide-in-from-bottom-8 duration-500">
                    <h1 className="text-4xl md:text-6xl font-black tracking-tight text-gray-900 dark:text-white mb-6 leading-tight">
                        {t("blog_title").split(' ').map((word, i, arr) =>
                            i >= arr.length - 2 ? <span key={i} className="bg-gradient-to-r from-blue-500 to-purple-500 bg-clip-text text-transparent">{word} </span> : word + ' '
                        )}
                    </h1>
                    <p className="text-lg md:text-xl text-gray-600 dark:text-gray-300 max-w-2xl mx-auto">
                        {t("blog_subtitle")}
                    </p>
                </section>

                <section className="max-w-6xl mx-auto px-6 pb-24 w-full">
                    {isLoading ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {[1, 2, 3].map((i) => <div key={i} className="h-48 bg-black/5 dark:bg-white/5 animate-pulse rounded-3xl"></div>)}
                        </div>
                    ) : posts.length === 0 ? (
                        <div className="text-center py-16 bg-white/40 dark:bg-white/5 backdrop-blur-xl rounded-3xl border border-black/5 dark:border-white/10">
                            <p className="text-gray-500 dark:text-gray-400 font-medium">{t("blog_empty")}</p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                            {posts.map((post) => {
                                // 🚀 SEO: Construimos la URL final con su carpeta de idioma
                                const postUrl = language === "es"
                                    ? `/blog/${post.slug?.current}`
                                    : `/${language}/blog/${post.slug?.current}`;

                                return (
                                    <article key={post._id}>
                                    <a
                                        href={postUrl}
                                        onClick={(e) => {
                                            // 🚀 Evitamos que el navegador recargue la página entera
                                            e.preventDefault();
                                            onNavigate(postUrl);
                                        }}
                                        className="group cursor-pointer bg-white/70 dark:bg-gray-900/70 backdrop-blur-xl border border-black/10 dark:border-white/10 rounded-3xl overflow-hidden shadow-sm hover:shadow-2xl hover:-translate-y-2 transition-all duration-300 flex flex-col"
                                    >
                                        {/* IMAGEN PRINCIPAL */}
                                        {post.mainImage ? (
                                            <div className="w-full h-48 sm:h-56 bg-gray-200 dark:bg-gray-800 overflow-hidden relative shrink-0">
                                                {/* BADGES DE CATEGORÍAS FLOTANDO SOBRE LA FOTO */}
                                                {post.categories && post.categories.length > 0 && (
                                                    <div className="absolute top-4 left-4 z-10 flex flex-wrap gap-2">
                                                        {post.categories.map(cat => (
                                                            <span key={cat} className="px-3 py-1.5 bg-white/90 dark:bg-black/80 backdrop-blur-md text-gray-900 dark:text-white text-[9px] font-black uppercase tracking-widest rounded-xl shadow-sm border border-black/5 dark:border-white/10">
                                                                {cat}
                                                            </span>
                                                        ))}
                                                    </div>
                                                )}
                                                <img
                                                    src={urlFor(post.mainImage).width(800).height(500).url()}
                                                    alt={post.title}
                                                    className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                                                />
                                            </div>
                                        ) : (
                                            <div className="w-full h-48 sm:h-56 bg-blue-50 dark:bg-blue-900/10 flex items-center justify-center shrink-0">
                                                <BrandMark text="" fallback="LGA" className="w-12 h-12 opacity-20 grayscale" />
                                            </div>
                                        )}

                                        {/* CONTENIDO DE LA TARJETA */}
                                        <div className="p-6 sm:p-8 flex flex-col justify-between flex-1 gap-6">

                                            {/* CABECERA: Fecha, Título y Extracto */}
                                            <div>
                                                <p className="text-[10px] font-bold uppercase tracking-widest text-blue-600 dark:text-blue-400 mb-3">
                                                    {new Date(post.publishedAt).toLocaleDateString(language, { day: 'numeric', month: 'long', year: 'numeric' })}
                                                </p>

                                                <h2 className="text-xl sm:text-2xl font-black text-gray-900 dark:text-white leading-tight group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors line-clamp-2">
                                                    {post.title}
                                                </h2>

                                                {/* Extracto (Excerpt) */}
                                                {post.excerpt && (
                                                    <p className="mt-3 text-sm text-gray-600 dark:text-gray-400 leading-relaxed line-clamp-3 font-medium">
                                                        {post.excerpt}
                                                    </p>
                                                )}
                                            </div>

                                            {/* PIE DE TARJETA: Autor y Botón Leer */}
                                            <div className="pt-5 border-t border-black/5 dark:border-white/10 flex items-center justify-between gap-4 mt-auto">

                                                {/* Bloque del Autor */}
                                                <div className="flex items-center gap-3">
                                                    {post.authorImage ? (
                                                        <img
                                                            src={urlFor(post.authorImage).width(100).height(100).url()}
                                                            alt={post.authorName}
                                                            className="w-8 h-8 rounded-full object-cover bg-gray-200 dark:bg-gray-800 border border-black/5 dark:border-white/10"
                                                        />
                                                    ) : (
                                                        <div className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900/40 flex items-center justify-center text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-800/30">
                                                            <Icon name="user" className="w-4 h-4" />
                                                        </div>
                                                    )}
                                                    <span className="text-xs font-bold text-gray-900 dark:text-white truncate max-w-[100px] sm:max-w-[150px]">
                                                        {post.authorName || "Equipo LGA"}
                                                    </span>
                                                </div>

                                                {/* Botón de acción */}
                                                <div className="flex items-center text-[11px] sm:text-xs font-black text-blue-600 dark:text-blue-400 uppercase tracking-wider shrink-0">
                                                    <span className="hidden sm:inline">{t("blog_read_more")}</span>
                                                    <span className="sm:hidden">Leer</span>
                                                    <Icon name="arrow_left" className="w-4 h-4 ml-1.5 rotate-180 group-hover:translate-x-1 transition-transform" />
                                                </div>
                                            </div>

                                        </div>
                                    </a>
                                    </article>
                                );
                            })}
                        </div>
                    )}
                </section>
            </div>

            {/* FOOTER */}
            <GlobalFooter t={t} onNavigate={onNavigate} />
        </main>
    );
}
