// Consultas del blog a Sanity, compartidas por las pantallas (cliente) y por
// el prerender del build (servidor), para que ambos rendericen con los mismos datos.
import { sanityClient } from "../sanityClient";

const POST_QUERY = `*[_type == "post" && slug.current == $slug && language == $lang][0]{
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
}`;

const POST_LIST_QUERY = `*[_type == "post" && language == $lang]{
  _id,
  title,
  slug,
  publishedAt,
  mainImage,
  excerpt,
  "authorName": author->name,
  "authorImage": author->image,
  "categories": coalesce(categories[]->title, [])
} | order(publishedAt desc)`;

export function fetchBlogPost(lang, slug) {
    return sanityClient.fetch(POST_QUERY, { slug, lang });
}

export function fetchBlogPostList(lang) {
    return sanityClient.fetch(POST_LIST_QUERY, { lang });
}
