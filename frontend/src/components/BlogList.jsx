import React, { useState, useEffect } from 'react';
import { sanityClient } from '../sanityClient'; // Ajusta la ruta si lo guardas en otra carpeta

export function BlogList() {
    const [posts, setPosts] = useState([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        // La consulta GROQ mágica
        sanityClient
            .fetch(`*[_type == "post" && language == "es"]{
        _id,
        title,
        slug,
        publishedAt
      } | order(publishedAt desc)`)
            .then((data) => {
                setPosts(data);
                setIsLoading(false);
            })
            .catch((error) => {
                console.error("Error al traer los posts:", error);
                setIsLoading(false);
            });
    }, []);

    return (
        <div className="p-8 max-w-4xl mx-auto">
            <h2 className="text-3xl font-black mb-6 text-gray-900 dark:text-white uppercase tracking-wide">
                El Blog de LGA
            </h2>

            {isLoading ? (
                <p className="text-gray-500 italic animate-pulse">Cargando artículos desde Sanity...</p>
            ) : posts.length === 0 ? (
                <p className="text-gray-500 italic">Todavía no hay artículos publicados en español.</p>
            ) : (
                <ul className="flex flex-col gap-4">
                    {posts.map((post) => (
                        <li key={post._id} className="p-5 bg-white/50 dark:bg-gray-800/50 rounded-2xl shadow-sm border border-black/5 dark:border-white/10 hover:shadow-md transition-shadow">
                            <h3 className="text-xl font-bold text-gray-900 dark:text-white">{post.title}</h3>
                            <p className="text-xs font-bold text-blue-500 uppercase tracking-wider mt-2">
                                Ruta SEO: /blog/{post.slug?.current}
                            </p>
                        </li>
                    ))}
                </ul>
            )}
        </div>
    );
}
