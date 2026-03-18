import { createClient } from '@sanity/client';
import createImageUrlBuilder from '@sanity/image-url';

export const sanityClient = createClient({
    projectId: 'bmf59j7w', // El ID de tu proyecto que vimos en las capturas
    dataset: 'production',
    useCdn: false, // Usa la caché global de Sanity para que la web vuele
    apiVersion: '2024-03-18', // Ponemos la fecha de hoy para fijar la versión de la API
});

// 🚀 AÑADIDO: Herramienta para extraer las URLs de las imágenes
const builder = createImageUrlBuilder(sanityClient);
export function urlFor(source) {
    return builder.image(source);
}
