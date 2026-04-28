import React, { useState, useEffect } from "react";
import { sanityClient, urlFor } from "../sanityClient";
import { BrandMark } from "../components/brand-mark";
import { Icon } from "../components/icons";
import { PublicPageHeader } from "../components/public-page-header";
import { Helmet } from "react-helmet-async";
import { SEO } from "../components/seo";
import { GlobalFooter } from "../components/global-footer";

const DOMAIN = "https://legoodanfitrion.com";
const BLOG_PATHS = { es: "/blog", ca: "/ca/blog", en: "/en/blog", fr: "/fr/blog", it: "/it/blog" };

export function BlogIndexScreen({ language, setLanguage, themeMode, setThemeMode, t, onNavigate, session }) {
    const [posts, setPosts] = useState([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        if (typeof window !== "undefined") window.prerenderReady = false;
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
                if (typeof window !== "undefined") window.prerenderReady = true;
            })
            .catch((error) => {
                console.error("Error fetching posts:", error);
                setIsLoading(false);
                if (typeof window !== "undefined") window.prerenderReady = true;
            });
    }, [language]);

    const blogListItemsForSchema = posts.slice(0, 20).map((post, idx) => ({
        "@type": "ListItem",
        "position": idx + 1,
        "url": `${DOMAIN}${language === "es" ? "" : `/${language}`}/blog/${post.slug?.current}`,
        "name": post.title
    }));

    const blogSchema = {
        "@context": "https://schema.org",
        "@type": "Blog",
        "name": `${t("blog_title")} | ${t("app_name")}`,
        "description": t("blog_subtitle"),
        "url": `${DOMAIN}${BLOG_PATHS[language] || BLOG_PATHS.es}`,
        "inLanguage": language,
        "publisher": {
            "@type": "Organization",
            "name": "LeGoodAnfitrión",
            "logo": {
                "@type": "ImageObject",
                "url": `${DOMAIN}/android-chrome-512x512.png`
            }
        }
    };

    const itemListSchema = blogListItemsForSchema.length > 0 ? {
        "@context": "https://schema.org",
        "@type": "ItemList",
        "itemListElement": blogListItemsForSchema
    } : null;

    return (
        <main className="min-h-screen relative bg-gray-50 dark:bg-[#0A0D14] text-gray-900 dark:text-white font-sans selection:bg-blue-200 dark:selection:bg-blue-900 selection:text-blue-900 dark:selection:text-white overflow-hidden flex flex-col">
            <SEO
                title={`${t("blog_title")} | ${t("app_name")}`}
                description={t("blog_subtitle")}
                language={language}
                slug="blog"
                image={`${DOMAIN}/android-chrome-512x512.png`}
            />

            <Helmet>
                <script type="application/ld+json">{JSON.stringify(blogSchema)}</script>
                {itemListSchema && (
                    <script type="application/ld+json">{JSON.stringify(itemListSchema)}</script>
                )}
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
                activeKey="blog"
                session={session}
            />

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
