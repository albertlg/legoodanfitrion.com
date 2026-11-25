import { createClient } from '@sanity/client';
import { createImageUrlBuilder } from '@sanity/image-url';

export const sanityClient = createClient({
    projectId: 'bmf59j7w', // El ID de tu proyecto que vimos en las capturas
    dataset: 'production',
    // En el navegador usamos la CDN de Sanity; en el build (prerender) la API
    // directa, para que un deploy lanzado al publicar no lea contenido cacheado.
    useCdn: typeof window !== "undefined",
    apiVersion: '2024-03-18', // Ponemos la fecha de hoy para fijar la versión de la API
});

// 🚀 AÑADIDO: Herramienta para extraer las URLs de las imágenes
const builder = createImageUrlBuilder(sanityClient);
export function urlFor(source) {
    return builder.image(source);
}
