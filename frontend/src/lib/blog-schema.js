import { urlFor } from "../sanityClient.js";

const DOMAIN = "https://legoodanfitrion.com";

function getSlug(post) {
    const slug = post?.slug;
    if (typeof slug === "string") return slug;
    return slug?.current || "";
}

function getImageUrl(source, width, height) {
    if (!source) return "";
    try {
        return urlFor(source).width(width).height(height).url();
    } catch {
        return "";
    }
}

function getBlogPostUrl(language, slug) {
    if (!slug) return DOMAIN;
    return language === "es"
        ? `${DOMAIN}/blog/${slug}`
        : `${DOMAIN}/${language}/blog/${slug}`;
}

function getSteps(post) {
    if (!Array.isArray(post?.steps)) return [];
    return post.steps
        .map((step) => ({
            title: String(step?.title || "").trim(),
            text: String(step?.text || "").trim()
        }))
        .filter((step) => step.title && step.text);
}

function buildArticleSchema(post) {
    const language = post?.language || "es";
    const slug = getSlug(post);
    const pageUrl = getBlogPostUrl(language, slug);
    const image = getImageUrl(post?.mainImage, 1200, 675);
    const authorImage = getImageUrl(post?.authorImage, 200, 200);

    return {
        "@context": "https://schema.org",
        "@type": "Article",
        "headline": post?.title || "",
        "description": post?.excerpt || "",
        ...(image ? { "image": image } : {}),
        "datePublished": post?.publishedAt,
        ...(post?._updatedAt ? { "dateModified": post._updatedAt } : {}),
        "author": {
            "@type": "Person",
            "name": post?.authorName || "Equipo LGA",
            ...(authorImage ? { "image": authorImage } : {})
        },
        "publisher": {
            "@type": "Organization",
            "name": "LeGoodAnfitrión",
            "logo": {
                "@type": "ImageObject",
                "url": `${DOMAIN}/android-chrome-512x512.png`
            }
        },
        "mainEntityOfPage": {
            "@type": "WebPage",
            "@id": pageUrl
        },
        "inLanguage": language
    };
}

function buildHowToSchema(post) {
    const steps = getSteps(post);
    if (steps.length === 0) return null;

    const language = post?.language || "es";
    const slug = getSlug(post);
    const pageUrl = getBlogPostUrl(language, slug);
    const image = getImageUrl(post?.mainImage, 1200, 675);

    return {
        "@context": "https://schema.org",
        "@type": "HowTo",
        "name": post?.title || "",
        "description": post?.excerpt || "",
        ...(image ? { "image": image } : {}),
        "mainEntityOfPage": {
            "@type": "WebPage",
            "@id": pageUrl
        },
        "inLanguage": language,
        "step": steps.map((step, index) => ({
            "@type": "HowToStep",
            "position": index + 1,
            "name": step.title,
            "text": step.text
        }))
    };
}

export function generateBlogSchema(post, type = "all") {
    if (!post) return null;
    const normalizedType = String(type || "all").trim().toLowerCase();
    if (normalizedType === "article") return buildArticleSchema(post);
    if (normalizedType === "howto" || normalizedType === "how_to") return buildHowToSchema(post);

    return [buildArticleSchema(post), buildHowToSchema(post)].filter(Boolean);
}
