import React, { useState, useEffect, useMemo } from "react";
import { PortableText } from "@portabletext/react";
import { sanityClient, urlFor } from "../sanityClient";
import { Controls } from "../components/controls";
import { BrandMark } from "../components/brand-mark";
import { Icon } from "../components/icons";
import { Helmet } from "react-helmet-async";

const portableTextComponents = {
    block: {
        h2: ({ children, value }) => <h2 id={value._key} className="text-2xl sm:text-3xl font-black mt-12 mb-6 text-gray-900 dark:text-white scroll-mt-32">{children}</h2>,
        h3: ({ children, value }) => <h3 id={value._key} className="text-xl font-bold mt-8 mb-4 text-gray-800 dark:text-gray-200 scroll-mt-32">{children}</h3>,
        normal: ({ children }) => <p className="text-base sm:text-lg text-gray-700 dark:text-gray-300 leading-relaxed mb-6 font-medium">{children}</p>,
        blockquote: ({ children }) => <blockquote className="border-l-4 border-blue-500 pl-4 sm:pl-6 py-2 my-8 text-lg sm:text-xl italic text-gray-600 dark:text-gray-400 bg-blue-50/50 dark:bg-blue-900/10 rounded-r-2xl">{children}</blockquote>,
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

export function BlogPostScreen({ slug, language, setLanguage, themeMode, setThemeMode, t, onNavigate }) {
    const [post, setPost] = useState(null);
    const [isLoading, setIsLoading] = useState(true);

    // 1️⃣ PRIMER EFECTO: Traer el post y los slugs de sus traducciones
    useEffect(() => {
        setIsLoading(true);
        sanityClient
            .fetch(
                `*[_type == "post" && slug.current == $slug][0]{
                  _id, title, publishedAt, body, language,
                  mainImage,
                  "authorName": author->name,
                  "authorImage": author->image,
                  "categories": coalesce(categories[]->title, []),
                  // 🚀 FIX: La flecha "value->" entra en el documento real traducido para sacar el slug
                  "translations": *[_type == "translation.metadata" && references(^._id)][0].translations[].value->{
                    "lang": language,
                    "slug": slug.current
                  }
                }`,
                { slug }
            )
            .then((data) => {
                setPost(data);
                setIsLoading(false);
            })
            .catch((error) => {
                console.error("Error fetching post:", error);
                setIsLoading(false);
            });
    }, [slug]);

    // 2️⃣ SEGUNDO EFECTO (CORREGIDO): Escuchar cambios de idioma y navegar
    useEffect(() => {
        // Solo actuamos si el post ya cargó y el idioma de la app ha cambiado
        if (post && post.language && language !== post.language) {

            // 🔍 DEBUG: Esto te chivará en la consola del navegador si Sanity está enviando bien las traducciones
            console.log("Traducciones detectadas por Sanity:", post.translations);

            // Buscamos si existe la traducción para el nuevo idioma
            const translation = post.translations?.find(t => t.lang === language);

            if (translation && translation.slug) {
                // ✅ Si existe y está PUBLICADA, viajamos a la nueva URL
                onNavigate(`/blog/${translation.slug}`);
            } else {
                // 🚀 FIX: Si NO existe (o está en Draft), NO lo echamos a /blog.
                // Lo dejamos leyendo tranquilamente.
                console.warn(`Aviso: No hay traducción publicada para el idioma '${language}'. Nos quedamos en el post actual.`);
            }
        }
    }, [language, post, onNavigate]);

    const tocHeadings = useMemo(() => {
        if (!post?.body) return [];
        return post.body
            .filter((block) => block._type === "block" && ["h2", "h3"].includes(block.style))
            .map((block) => ({ id: block._key, text: block.children[0]?.text || "", level: block.style }));
    }, [post]);

    if (isLoading) {
        return (
            <div className="min-h-screen bg-gray-50 dark:bg-[#0A0D14] flex items-center justify-center">
                <Icon name="sparkle" className="w-8 h-8 text-blue-500 animate-spin" />
            </div>
        );
    }

    if (!post) {
        return (
            <div className="min-h-screen bg-gray-50 dark:bg-[#0A0D14] flex flex-col items-center justify-center p-4">
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">{t("blog_not_found")}</h1>
                <button onClick={() => onNavigate("/blog")} className="px-6 py-3 bg-gray-900 dark:bg-white text-white dark:text-gray-900 rounded-xl font-bold">{t("blog_back")}</button>
            </div>
        );
    }

    return (
        <main className="min-h-screen relative bg-gray-50 dark:bg-[#0A0D14] text-gray-900 dark:text-white font-sans overflow-hidden flex flex-col">
            <Helmet htmlAttributes={{ lang: language }}>
                <title>{post.title} | {t("app_name")}</title>
            </Helmet>

            <div className="fixed top-[-10%] right-[-5%] w-[400px] h-[400px] bg-blue-500/10 dark:bg-blue-600/5 rounded-full mix-blend-multiply filter blur-[100px] pointer-events-none z-0"></div>

            <header className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-6 py-4 bg-white/70 dark:bg-[#0A0D14]/70 backdrop-blur-xl border-b border-black/5 dark:border-white/5">
                <button onClick={() => onNavigate("/blog")} className="flex items-center gap-2 text-sm font-bold text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white transition-colors outline-none">
                    <Icon name="arrow_left" className="w-5 h-5" />
                    <span className="hidden sm:inline">{t("blog_back")}</span>
                </button>
                <Controls themeMode={themeMode} setThemeMode={setThemeMode} language={language} setLanguage={setLanguage} t={t} dropdownDirection="down" />
            </header>

            <div className="flex-1 relative z-10 max-w-7xl mx-auto px-6 py-32 flex flex-col lg:flex-row gap-12 items-start w-full">

                {tocHeadings.length > 0 && (
                    <aside className="hidden lg:block w-64 shrink-0 sticky top-32">
                        <div className="bg-white/50 dark:bg-white/5 backdrop-blur-xl border border-black/5 dark:border-white/10 p-6 rounded-3xl shadow-sm">
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
                    <header className="mb-10 sm:mb-12">
                        <div className="flex items-center gap-4 mb-6">
                            <p className="text-[10px] font-bold uppercase tracking-widest text-blue-600 dark:text-blue-400">
                                {new Date(post.publishedAt).toLocaleDateString(language, { day: 'numeric', month: 'long', year: 'numeric' })}
                            </p>
                            {/* 🚀 LOS BADGES DE CATEGORÍAS */}
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
                                    Autor
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

                    <footer className="mt-20 p-8 bg-blue-50/50 dark:bg-blue-900/10 border border-blue-100 dark:border-blue-900/30 rounded-3xl flex flex-col sm:flex-row justify-between items-center gap-6 text-center sm:text-left">
                        <div className="flex flex-col gap-1">
                            <p className="font-black text-lg text-gray-900 dark:text-white">{t("blog_cta_footer")}</p>
                        </div>
                        <button onClick={() => onNavigate("/login")} className="shrink-0 px-8 py-4 bg-gray-900 dark:bg-white text-white dark:text-gray-900 rounded-xl font-black shadow-lg hover:scale-[1.02] transition-transform">
                            {t("blog_cta_button")}
                        </button>
                    </footer>
                </article>
            </div>
        </main>
    );
}