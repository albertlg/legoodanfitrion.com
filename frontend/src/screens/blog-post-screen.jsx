import React, { useState, useEffect, useMemo } from "react";
import { PortableText } from "@portabletext/react";
import { sanityClient, urlFor } from "../sanityClient";
import { Controls } from "../components/controls";
import { BrandMark } from "../components/brand-mark";
import { Icon } from "../components/icons";
import { Helmet } from "react-helmet-async";
import { SEO } from "../components/seo";
import { GlobalFooter } from "../components/global-footer";
import InteractiveDemo from "../components/landing/InteractiveDemo";
import { generateBlogSchema } from "../lib/blog-schema";

const SUPPORTED_LANGUAGES = new Set(["es", "ca", "en", "fr", "it"]);

function getBlogRouteFromPath(pathname, fallbackLanguage, fallbackSlug) {
    const segments = String(pathname || "").split("/").filter(Boolean);
    const firstSegment = segments[0]?.toLowerCase();
    if (SUPPORTED_LANGUAGES.has(firstSegment) && segments[1] === "blog") {
        return { language: firstSegment, slug: segments[2] || fallbackSlug || "" };
    }
    if (firstSegment === "blog") {
        return { language: "es", slug: segments[1] || fallbackSlug || "" };
    }
    return { language: fallbackLanguage || "es", slug: fallbackSlug || "" };
}

function getPostSlug(post, fallbackSlug = "") {
    if (typeof post?.slug === "string") return post.slug;
    return post?.slug?.current || fallbackSlug || "";
}

function buildSeoTranslations(post, language, slug) {
    const translations = new Map();
    for (const translation of post?.translations || []) {
        if (translation?.lang && translation?.slug) {
            translations.set(translation.lang, {
                lang: translation.lang,
                slug: translation.slug
            });
        }
    }
    if (language && slug) {
        translations.set(language, { lang: language, slug });
    }
    return Array.from(translations.values());
}

function createPortableTextComponents({ t, language }) {
    return {
        block: {
            h2: ({ children, value }) => <h2 id={value._key} className="text-2xl sm:text-3xl font-black mt-12 mb-6 text-gray-900 dark:text-white scroll-mt-32">{children}</h2>,
            h3: ({ children, value }) => <h3 id={value._key} className="text-xl font-bold mt-8 mb-4 text-gray-800 dark:text-gray-200 scroll-mt-32">{children}</h3>,
            normal: ({ children }) => <p className="text-base sm:text-lg text-gray-700 dark:text-gray-300 leading-relaxed mb-6 font-medium">{children}</p>,
            blockquote: ({ children }) => <blockquote className="border-l-4 border-blue-500 pl-4 sm:pl-6 py-2 my-8 text-lg sm:text-xl italic text-gray-600 dark:text-gray-400 bg-blue-50/50 dark:bg-blue-900/10 rounded-r-2xl">{children}</blockquote>,
        },
        types: {
            image: ({ value }) => {
                if (!value?.asset) return null;
                return (
                    <figure className="my-10 overflow-hidden rounded-3xl border border-black/5 dark:border-white/10 shadow-xl">
                        <img
                            src={urlFor(value).width(1200).height(675).url()}
                            alt={value.alt || ""}
                            className="w-full aspect-video object-cover"
                            loading="lazy"
                            decoding="async"
                        />
                    </figure>
                );
            },
            interactiveDemo: ({ value }) => (
                <section className="my-14 -mx-4 sm:mx-0">
                    <InteractiveDemo t={t} language={language} scenario={value?.scenario} />
                </section>
            )
        },
        list: {
            bullet: ({ children }) => <ul className="list-disc pl-6 mb-6 space-y-2 text-gray-700 dark:text-gray-300 text-base sm:text-lg font-medium">{children}</ul>,
            number: ({ children }) => <ol className="list-decimal pl-6 mb-6 space-y-2 text-gray-700 dark:text-gray-300 text-base sm:text-lg font-medium">{children}</ol>,
        },
        marks: {
            strong: ({ children }) => <strong className="font-bold text-gray-900 dark:text-white">{children}</strong>,
            link: ({ children, value }) => <a href={value.href} target="_blank" rel="noopener noreferrer" className="text-blue-600 dark:text-blue-400 hover:underline decoration-2 underline-offset-2">{children}</a>,
        },
    };
}

const NAV_ITEMS = [
    { key: "features", path: "/", labelKey: "landing_nav_features", anchorId: "caracteristicas" },
    { key: "pricing", path: "/pricing", labelKey: "landing_nav_pricing" },
    { key: "contact", path: "/contact", labelKey: "landing_nav_contact" },
    { key: "blog", path: "/blog", labelKey: "blog_nav_title" },
    { key: "about", path: "/about", labelKey: "landing_nav_about" }
];

export function BlogPostScreen({ slug, language, themeMode, setThemeMode, t, onNavigate, session }) {
    const [post, setPost] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [notFound, setNotFound] = useState(false);
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

    if (typeof window !== "undefined" && isLoading) {
        window.prerenderReady = false;
    }

    const routeBlog = useMemo(
        () => getBlogRouteFromPath(typeof window !== "undefined" ? window.location.pathname : "", language, slug),
        [language, slug]
    );
    const requestLanguage = routeBlog.language;
    const requestSlug = routeBlog.slug || slug;
    const seoLanguage = requestLanguage;
    const postSlug = getPostSlug(post, requestSlug);
    const seoTranslations = useMemo(
        () => buildSeoTranslations(post, seoLanguage, postSlug),
        [post, seoLanguage, postSlug]
    );
    const seoPost = useMemo(
        () => post ? { ...post, language: seoLanguage, slug: postSlug } : null,
        [post, seoLanguage, postSlug]
    );
    const blogSchemas = useMemo(() => {
        const schemas = generateBlogSchema(seoPost);
        return Array.isArray(schemas) ? schemas : schemas ? [schemas] : [];
    }, [seoPost]);
    const portableTextComponents = useMemo(
        () => createPortableTextComponents({ t, language: seoLanguage }),
        [t, seoLanguage]
    );

    // 1️⃣ PRIMER EFECTO: Traer el post validando el idioma (A prueba de carreras de red)
    useEffect(() => {
        let isMounted = true; // 🚀 FIX: Creamos un "semáforo" para esta petición

        if (typeof window !== "undefined") window.prerenderReady = false;
        setIsLoading(true);
        setNotFound(false);
        sanityClient
            .fetch(
                `*[_type == "post" && slug.current == $slug && language == $lang][0]{
                  _id, _updatedAt, title, "slug": slug.current, publishedAt, body, language, excerpt,
                  steps[]{title, text},
                  mainImage,
                  "authorName": author->name,
                  "authorImage": author->image,
                  "categories": coalesce(categories[]->title, []),
                  "translations": *[_type == "translation.metadata" && references(^._id)][0].translations[].value->{
                    "lang": language,
                    "slug": slug.current
                  }
                }`,
                { slug: requestSlug, lang: requestLanguage }
            )
            .then((data) => {
                if (!isMounted) return; // 🚀 FIX: Si se disparó otra petición mientras tanto, ignoramos esta

                if (data) {
                    setPost(data);
                } else {
                    setNotFound(true);
                }
                setIsLoading(false);
            })
            .catch((error) => {
                if (!isMounted) return; // 🚀 FIX: Lo mismo para los errores
                console.error("Error fetching post:", error);
                setNotFound(true);
                setIsLoading(false);
            });

        // 🚀 FIX: Función de limpieza. Cuando el componente se actualiza con un nuevo idioma,
        // pone el semáforo de la petición anterior en rojo.
        return () => {
            isMounted = false;
        };
    }, [requestSlug, requestLanguage]);

    useEffect(() => {
        if (typeof window === "undefined" || isLoading) return;
        const readyTimer = window.setTimeout(() => {
            window.prerenderReady = true;
        }, 0);
        return () => window.clearTimeout(readyTimer);
    }, [isLoading, post, notFound, blogSchemas.length]);

    // 🚀 FIX: Interceptamos el selector de idioma localmente ANTES de que App.jsx rompa la URL
    const handleLocalLanguageChange = (newLang) => {
        if (newLang === seoLanguage) return;

        // 🚀 FIX CLAVE: Guardamos el idioma antes de navegar
        window.localStorage.setItem("legood-language", newLang);

        if (post && post.translations) {
            const translation = post.translations.find(t => t?.lang === newLang);
            if (translation && translation.slug) {
                const newUrl = newLang === "es" ? `/blog/${translation.slug}` : `/${newLang}/blog/${translation.slug}`;
                onNavigate(newUrl);
                return;
            }
        }

        const fallbackUrl = newLang === "es" ? `/blog` : `/${newLang}/blog`;
        onNavigate(fallbackUrl);
    };

    const tocHeadings = useMemo(() => {
        if (!post?.body) return [];
        return post.body
            .filter((block) => block._type === "block" && ["h2", "h3"].includes(block.style))
            .map((block) => ({ id: block._key, text: block.children[0]?.text || "", level: block.style }));
    }, [post]);

    const handleNavItemClick = (item) => {
        if (item?.anchorId) {
            onNavigate("/#caracteristicas");
            return;
        }
        onNavigate(item.path);
    };

    if (isLoading) {
        return (
            <main className="min-h-screen bg-gray-50 dark:bg-[#0A0D14] text-gray-900 dark:text-white pt-32 pb-24 px-6">
                <div className="max-w-3xl mx-auto animate-pulse" aria-busy="true" aria-live="polite">
                    <div className="h-3 w-28 rounded-full bg-gray-200 dark:bg-gray-700 mb-6" />
                    <div className="h-10 w-full rounded-lg bg-gray-200 dark:bg-gray-700 mb-4" />
                    <div className="h-10 w-3/4 rounded-lg bg-gray-200 dark:bg-gray-700 mb-10" />
                    <div className="flex items-center gap-3 mb-10">
                        <div className="w-10 h-10 rounded-full bg-gray-200 dark:bg-gray-700" />
                        <div className="flex flex-col gap-2">
                            <div className="h-3 w-32 rounded bg-gray-200 dark:bg-gray-700" />
                            <div className="h-2 w-20 rounded bg-gray-200 dark:bg-gray-700" />
                        </div>
                    </div>
                    <div className="w-full aspect-video rounded-3xl bg-gray-200 dark:bg-gray-700 mb-12" />
                    <div className="space-y-3">
                        <div className="h-4 w-full rounded bg-gray-200 dark:bg-gray-700" />
                        <div className="h-4 w-11/12 rounded bg-gray-200 dark:bg-gray-700" />
                        <div className="h-4 w-10/12 rounded bg-gray-200 dark:bg-gray-700" />
                        <div className="h-4 w-9/12 rounded bg-gray-200 dark:bg-gray-700" />
                    </div>
                </div>
            </main>
        );
    }

    if (notFound || !post) {
        return (
            <div className="min-h-screen bg-gray-50 dark:bg-[#0A0D14] flex flex-col items-center justify-center p-4">
                <Icon name="sparkle" className="w-12 h-12 text-gray-400 dark:text-gray-600 mb-6" />
                <h1 className="text-2xl md:text-3xl font-black text-gray-900 dark:text-white mb-2 text-center">{t("blog_not_found")}</h1>
                <p className="text-gray-500 dark:text-gray-400 mb-8 text-center max-w-md">{t("blog_not_found_subtitle")}</p>
                <button onClick={() => onNavigate("/blog")} className="px-8 py-3.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold shadow-lg shadow-blue-500/30 transition-transform hover:scale-[1.02]">{t("blog_back")}</button>
            </div>
        );
    }

    return (
        <main className="min-h-screen relative bg-gray-50 dark:bg-[#0A0D14] text-gray-900 dark:text-white font-sans overflow-x-clip flex flex-col">
            {/* 🚀 SEO DINÁMICO: El componente maestro se encarga de todo el hreflang */}
            <SEO
                title={`${post.title} | ${t("app_name")}`}
                description={post.excerpt || t("blog_subtitle")}
                image={post.mainImage ? urlFor(post.mainImage).width(1200).height(630).url() : null}
                language={seoLanguage}
                slug={postSlug}
                isBlogPost={true}
                translations={seoTranslations}
            />

            <Helmet>
                {blogSchemas.map((schema, index) => (
                    <script key={`${schema["@type"]}-${index}`} type="application/ld+json">
                        {JSON.stringify(schema)}
                    </script>
                ))}
            </Helmet>

            <div className="fixed top-[-10%] right-[-5%] w-[400px] h-[400px] bg-blue-500/10 dark:bg-blue-600/5 rounded-full mix-blend-multiply filter blur-[100px] pointer-events-none z-0"></div>

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
                        <Controls themeMode={themeMode} setThemeMode={setThemeMode} language={seoLanguage} setLanguage={handleLocalLanguageChange} t={t} dropdownDirection="down" />
                    </div>
                    <button
                        className="hidden sm:block bg-gray-900 dark:bg-white text-white dark:text-gray-900 px-5 py-2.5 rounded-full font-bold text-sm shadow-md hover:scale-[1.02] transition-transform"
                        type="button"
                        onClick={() => onNavigate(session?.user?.id ? "/app" : "/login")}
                    >
                        {session?.user?.id ? t("landing_cta_open_app") : t("landing_cta_create_event")}
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
                        <button className="w-full bg-gray-900 dark:bg-white text-white dark:text-gray-900 px-6 py-4 rounded-2xl font-black text-base shadow-lg" onClick={() => { onNavigate(session?.user?.id ? "/app" : "/login"); setIsMobileMenuOpen(false); }}>
                            {session?.user?.id ? t("landing_cta_open_app") : t("landing_cta_create_event")}
                        </button>
                        <div className="flex justify-center"><Controls themeMode={themeMode} setThemeMode={setThemeMode} language={seoLanguage} setLanguage={handleLocalLanguageChange} t={t} /></div>
                    </div>
                </div>
            </aside>

            <div className="flex-1 relative z-10 max-w-7xl mx-auto px-6 py-32 flex flex-col lg:flex-row gap-12 items-start w-full">

                {tocHeadings.length > 0 && (
                    <aside className="hidden lg:block w-64 shrink-0 sticky top-24 self-start max-h-[80vh] overflow-y-auto">
                        <div className="bg-white/60 dark:bg-white/5 backdrop-blur-xl border border-black/5 dark:border-white/10 p-6 rounded-3xl shadow-sm">
                            <h4 className="text-[10px] font-black uppercase tracking-widest text-gray-500 dark:text-gray-400 mb-4">
                                {t("blog_toc_title")}
                            </h4>
                            <nav className="flex flex-col gap-3">
                                {tocHeadings.map((heading) => (
                                    <a
                                        key={heading.id}
                                        href={`#${heading.id}`}
                                        className={`text-sm transition-colors hover:text-blue-600 dark:hover:text-blue-400 ${heading.level === "h3" ? "pl-4 text-gray-500 dark:text-gray-400" : "font-bold text-gray-700 dark:text-gray-300"
                                            }`}
                                    >
                                        {heading.text}
                                    </a>
                                ))}
                            </nav>
                        </div>
                    </aside>
                )}

                <article className="w-full max-w-3xl lg:max-w-none mx-auto lg:mx-0">
                    <button
                        type="button"
                        onClick={() => onNavigate("/blog")}
                        className="mb-6 inline-flex items-center gap-2 text-sm font-bold text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white"
                    >
                        <Icon name="arrow_left" className="w-4 h-4" />
                        {t("blog_back")}
                    </button>
                    {tocHeadings.length > 0 ? (
                        <div className="lg:hidden sticky top-20 z-20 mb-6 rounded-2xl border border-black/10 dark:border-white/10 bg-white/85 dark:bg-gray-900/85 backdrop-blur-xl p-3 shadow-sm">
                            <details>
                                <summary className="list-none flex items-center justify-between text-xs font-black uppercase tracking-wider text-gray-700 dark:text-gray-300">
                                    {t("blog_toc_title")}
                                    <Icon name="chevron_down" className="w-4 h-4" />
                                </summary>
                                <nav className="mt-3 flex flex-col gap-2">
                                    {tocHeadings.map((heading) => (
                                        <a
                                            key={`mobile-${heading.id}`}
                                            href={`#${heading.id}`}
                                            className={`text-sm transition-colors hover:text-blue-600 dark:hover:text-blue-400 ${heading.level === "h3" ? "pl-3 text-gray-500 dark:text-gray-400" : "font-bold text-gray-700 dark:text-gray-300"}`}
                                        >
                                            {heading.text}
                                        </a>
                                    ))}
                                </nav>
                            </details>
                        </div>
                    ) : null}

                    <header className="mb-10 sm:mb-12">
                        <div className="flex items-center gap-4 mb-6">
                            <p className="text-[10px] font-bold uppercase tracking-widest text-blue-600 dark:text-blue-400">
                                {new Date(post.publishedAt).toLocaleDateString(seoLanguage, { day: 'numeric', month: 'long', year: 'numeric' })}
                            </p>
                            {post.categories && post.categories.length > 0 && (
                                <div className="flex items-center gap-2">
                                    <span className="text-gray-300 dark:text-gray-700 hidden sm:inline">•</span>
                                    {post.categories.map(cat => (
                                        <span key={cat} className="px-3 py-1 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 border border-blue-100 dark:border-blue-800/30 rounded-lg text-[9px] font-black uppercase tracking-widest shadow-sm">
                                            {cat}
                                        </span>
                                    ))}
                                </div>
                            )}
                        </div>
                        <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black text-gray-900 dark:text-white tracking-tight leading-tight text-balance">
                            {post.title}
                        </h1>

                        <div className="flex items-center gap-3 mt-8">
                            {post.authorImage ? (
                                <img
                                    src={urlFor(post.authorImage).width(100).height(100).url()}
                                    alt={post.authorName}
                                    className="w-10 h-10 rounded-full object-cover bg-gray-200 dark:bg-gray-800 border border-black/5 dark:border-white/10"
                                />
                            ) : (
                                <div className="w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-900/40 flex items-center justify-center text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-800/30">
                                    <Icon name="user" className="w-5 h-5" />
                                </div>
                            )}
                            <div className="flex flex-col">
                                <span className="text-sm font-black text-gray-900 dark:text-white">
                                    {post.authorName || "Equipo LGA"}
                                </span>
                                <span className="text-[10px] font-bold uppercase tracking-wider text-gray-500">
                                    {t("blog_author_label")}
                                </span>
                            </div>
                        </div>
                    </header>

                    {post.mainImage && (
                        <div className="w-full aspect-video rounded-3xl overflow-hidden mb-12 shadow-xl border border-black/5 dark:border-white/10">
                            <img
                                src={urlFor(post.mainImage).width(1200).height(675).url()}
                                alt={post.title}
                                className="w-full h-full object-cover"
                            />
                        </div>
                    )}

                    <div className="prose-custom">
                        <PortableText value={post.body} components={portableTextComponents} />
                    </div>

                    <div className="mt-20 p-8 bg-blue-50/50 dark:bg-blue-900/10 border border-blue-100 dark:border-blue-900/30 rounded-3xl flex flex-col sm:flex-row justify-between items-center gap-6 text-center sm:text-left">
                        <div className="flex flex-col gap-1">
                            <p className="font-black text-lg text-gray-900 dark:text-white">{t("blog_cta_footer")}</p>
                        </div>
                        <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
                            <button
                                onClick={() => onNavigate("/")}
                                className="shrink-0 px-6 py-3 border border-black/10 dark:border-white/10 bg-white/70 dark:bg-white/5 text-gray-800 dark:text-gray-100 rounded-xl font-bold"
                            >
                                {t("landing_back_home")}
                            </button>
                            <button
                                onClick={() => onNavigate(session?.user?.id ? "/app" : "/login")}
                                className="shrink-0 px-8 py-4 bg-gray-900 dark:bg-white text-white dark:text-gray-900 rounded-xl font-black shadow-sm hover:shadow-md hover:scale-[1.02] transition-transform"
                            >
                                {session?.user?.id ? t("landing_cta_open_app") : t("blog_cta_button")}
                            </button>
                        </div>
                    </div>
                </article>
            </div>
            <GlobalFooter t={t} onNavigate={onNavigate} />
        </main>
    );
}
