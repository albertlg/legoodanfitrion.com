export const config = {
    matcher: "/rsvp/:token*"
};

const BOT_UA_RE = /bot|crawler|spider|googlebot|bingbot|yandex|baiduspider|whatsapp|facebookexternalhit|facebot|twitterbot|linkedinbot|slackbot|telegrambot|discordbot|pinterest|applebot|embedly|redditbot|quora|tumblr|vkshare|flipboard|mastodon|GPTBot|ChatGPT-User|OAI-SearchBot|ClaudeBot|Claude-Web|anthropic-ai|PerplexityBot|Google-Extended|CCBot|Bytespider|Applebot-Extended|cohere-ai|amazonbot|meta-externalagent|DuckAssistBot/i;

function isBot(ua) {
    return Boolean(ua) && BOT_UA_RE.test(ua);
}

function escapeHtml(value) {
    return String(value ?? "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

function formatDate(iso) {
    if (!iso) return "";
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return "";
    return d.toISOString().split("T")[0];
}

async function fetchRsvpPreview(token, env) {
    const res = await fetch(`${env.SUPABASE_URL}/rest/v1/rpc/get_rsvp_preview`, {
        method: "POST",
        headers: {
            "apikey": env.SUPABASE_ANON_KEY,
            "Authorization": `Bearer ${env.SUPABASE_ANON_KEY}`,
            "Content-Type": "application/json",
            "Accept": "application/json"
        },
        body: JSON.stringify({ p_token: token })
    });
    if (!res.ok) return null;
    const data = await res.json();
    return Array.isArray(data) ? data[0] : null;
}

function buildHeadInjection(preview, { origin, fullUrl }) {
    const eventTitle = preview.event_title || "Invitación";
    const title = `${eventTitle} · Le Good Anfitrión`;

    const locationLine = [preview.event_location_name, preview.event_location_address]
        .filter(Boolean)
        .join(" · ");
    const dateLine = formatDate(preview.event_start_at);

    const descParts = [];
    if (preview.host_name) descParts.push(`${preview.host_name} te invita`);
    if (preview.event_title) descParts.push(preview.event_title);
    if (dateLine) descParts.push(dateLine);
    if (locationLine) descParts.push(locationLine);
    const description = descParts.length > 0
        ? descParts.join(" · ")
        : "Confirma tu asistencia en un click.";

    const image = `${origin}/android-chrome-512x512.png`;

    const jsonLd = {
        "@context": "https://schema.org",
        "@type": "Event",
        "name": eventTitle,
        "description": description,
        "image": image,
        "eventAttendanceMode": "https://schema.org/OfflineEventAttendanceMode",
        "eventStatus": "https://schema.org/EventScheduled",
        "organizer": {
            "@type": "Person",
            "name": preview.host_name || "Le Good Anfitrión"
        }
    };
    if (preview.event_start_at) {
        jsonLd.startDate = preview.event_start_at;
    }
    if (preview.event_location_name) {
        jsonLd.location = {
            "@type": "Place",
            "name": preview.event_location_name
        };
        if (preview.event_location_address) {
            jsonLd.location.address = preview.event_location_address;
        }
    }

    const tags = [
        `<title>${escapeHtml(title)}</title>`,
        `<meta name="description" content="${escapeHtml(description)}" />`,
        `<meta name="robots" content="noindex, follow" />`,
        `<link rel="canonical" href="${escapeHtml(fullUrl)}" />`,
        `<meta property="og:type" content="event" />`,
        `<meta property="og:site_name" content="Le Good Anfitrión" />`,
        `<meta property="og:title" content="${escapeHtml(title)}" />`,
        `<meta property="og:description" content="${escapeHtml(description)}" />`,
        `<meta property="og:image" content="${escapeHtml(image)}" />`,
        `<meta property="og:url" content="${escapeHtml(fullUrl)}" />`,
        `<meta name="twitter:card" content="summary_large_image" />`,
        `<meta name="twitter:title" content="${escapeHtml(title)}" />`,
        `<meta name="twitter:description" content="${escapeHtml(description)}" />`,
        `<meta name="twitter:image" content="${escapeHtml(image)}" />`,
        `<script type="application/ld+json">${JSON.stringify(jsonLd)}</script>`
    ];
    return tags.join("\n    ");
}

function stripExistingPreviewMeta(html) {
    return html
        .replace(/<title\b[^>]*>[\s\S]*?<\/title>/i, "")
        .replace(/<meta\s+name=["']description["'][^>]*\/?>/gi, "")
        .replace(/<meta\s+name=["']robots["'][^>]*\/?>/gi, "")
        .replace(/<meta\s+property=["']og:[^"']+["'][^>]*\/?>/gi, "")
        .replace(/<meta\s+name=["']twitter:[^"']+["'][^>]*\/?>/gi, "")
        .replace(/<link\s+rel=["']canonical["'][^>]*\/?>/gi, "");
}

export default async function middleware(request) {
    const ua = request.headers.get("user-agent") || "";
    if (!isBot(ua)) return;

    const url = new URL(request.url);
    const match = url.pathname.match(/^\/rsvp\/([^\/?#]+)/);
    if (!match) return;

    const token = decodeURIComponent(match[1]);

    const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
    const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY;
    if (!SUPABASE_URL || !SUPABASE_ANON_KEY) return;

    let preview;
    try {
        preview = await fetchRsvpPreview(token, { SUPABASE_URL, SUPABASE_ANON_KEY });
    } catch {
        return;
    }
    if (!preview?.event_title) return;

    let html;
    try {
        const res = await fetch(`${url.origin}/index.html`, {
            headers: { "user-agent": "LGA-EdgeMiddleware/1.0" }
        });
        if (!res.ok) return;
        html = await res.text();
    } catch {
        return;
    }

    const injection = buildHeadInjection(preview, {
        origin: url.origin,
        fullUrl: `${url.origin}${url.pathname}`
    });

    const mutated = stripExistingPreviewMeta(html).replace(
        /<\/head>/i,
        `    ${injection}\n  </head>`
    );

    return new Response(mutated, {
        status: 200,
        headers: {
            "content-type": "text/html; charset=utf-8",
            "cache-control": "s-maxage=300, stale-while-revalidate=86400",
            "x-robots-tag": "noindex, follow"
        }
    });
}
