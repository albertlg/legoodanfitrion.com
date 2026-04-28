import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const CLOUDFLARE_VERIFY_URL =
  "https://challenges.cloudflare.com/turnstile/v0/siteverify";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: CORS_HEADERS });
  }

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ success: false, error: "Method not allowed" }), {
      status: 405,
      headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
    });
  }

  try {
    const body = await req.json().catch(() => ({}));
    const token = typeof body?.token === "string" ? body.token.trim() : "";

    if (!token) {
      return new Response(JSON.stringify({ success: false, error: "missing_token" }), {
        status: 400,
        headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
      });
    }

    const secretKey = Deno.env.get("TURNSTILE_SECRET_KEY") ?? "";
    if (!secretKey) {
      // If no secret key is configured, let the request through
      // (Turnstile not active server-side — safe for dev environments)
      return new Response(JSON.stringify({ success: true, skipped: true }), {
        status: 200,
        headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
      });
    }

    const form = new FormData();
    form.append("secret", secretKey);
    form.append("response", token);

    // Include the visitor IP for stronger bot detection
    const ip =
      req.headers.get("CF-Connecting-IP") ??
      req.headers.get("X-Forwarded-For") ??
      "";
    if (ip) form.append("remoteip", ip);

    const cfResponse = await fetch(CLOUDFLARE_VERIFY_URL, {
      method: "POST",
      body: form,
    });

    if (!cfResponse.ok) {
      return new Response(JSON.stringify({ success: false, error: "cloudflare_unreachable" }), {
        status: 502,
        headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
      });
    }

    const result: { success: boolean; "error-codes"?: string[] } =
      await cfResponse.json();

    return new Response(
      JSON.stringify({
        success: result.success === true,
        errorCodes: result["error-codes"] ?? [],
      }),
      {
        status: 200,
        headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
      }
    );
  } catch {
    return new Response(JSON.stringify({ success: false, error: "internal_error" }), {
      status: 500,
      headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
    });
  }
});
