import { createClient } from "@supabase/supabase-js";

function toSafeString(value) {
  return String(value || "").trim();
}

function getSupabaseAdminClient() {
  const supabaseUrl = toSafeString(process.env.SUPABASE_URL);
  const serviceRoleKey = toSafeString(process.env.SUPABASE_SERVICE_ROLE_KEY);
  if (!supabaseUrl || !serviceRoleKey) {
    return null;
  }
  return createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  });
}

function extractHoneypotValue(body = {}) {
  const candidates = [
    body?.website,
    body?.web_site,
    body?.homepage,
    body?.hp_field,
    body?.honeypot
  ];
  for (const candidate of candidates) {
    const normalized = toSafeString(candidate);
    if (normalized) {
      return normalized;
    }
  }
  return "";
}

async function logSuspiciousHoneypotAttempt({
  formType = "unknown",
  route = "",
  source = "backend",
  honeypotValue = "",
  payloadKeys = []
} = {}) {
  const supabase = getSupabaseAdminClient();
  if (!supabase) {
    return;
  }

  const metadata = {
    security_event: "honeypot_blocked",
    form_type: toSafeString(formType) || "unknown",
    route: toSafeString(route) || null,
    source: toSafeString(source) || "backend",
    honeypot_length: toSafeString(honeypotValue).length,
    payload_keys: Array.isArray(payloadKeys) ? payloadKeys.slice(0, 30) : []
  };

  try {
    await supabase.from("communication_logs").insert({
      recipient: "blocked@honeypot.local",
      subject: `Honeypot blocked (${metadata.form_type})`,
      mode: "auth",
      status: "failed",
      error_details: "honeypot_triggered",
      metadata
    });
  } catch (error) {
    console.error("[anti-bot] could not write honeypot log:", error?.message || error);
  }
}

function isCaptchaConfigured() {
  const turnstileSecret = toSafeString(process.env.TURNSTILE_SECRET_KEY);
  const recaptchaSecret = toSafeString(process.env.RECAPTCHA_V3_SECRET_KEY || process.env.RECAPTCHA_SECRET_KEY);
  return Boolean(turnstileSecret || recaptchaSecret);
}

async function verifyCaptchaTokenIfEnabled({
  token = "",
  remoteIp = "",
  action = "generic"
} = {}) {
  const normalizedToken = toSafeString(token);
  const turnstileSecret = toSafeString(process.env.TURNSTILE_SECRET_KEY);
  const recaptchaSecret = toSafeString(process.env.RECAPTCHA_V3_SECRET_KEY || process.env.RECAPTCHA_SECRET_KEY);

  if (!turnstileSecret && !recaptchaSecret) {
    return { success: true, skipped: true, provider: "none" };
  }

  if (!normalizedToken) {
    return { success: false, skipped: false, provider: turnstileSecret ? "turnstile" : "recaptcha_v3", reason: "missing_token" };
  }

  try {
    if (turnstileSecret) {
      const payload = new URLSearchParams({
        secret: turnstileSecret,
        response: normalizedToken,
        remoteip: toSafeString(remoteIp)
      });
      const response = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: payload
      });
      const data = await response.json().catch(() => ({}));
      return {
        success: Boolean(data?.success),
        skipped: false,
        provider: "turnstile",
        details: data
      };
    }

    const payload = new URLSearchParams({
      secret: recaptchaSecret,
      response: normalizedToken,
      remoteip: toSafeString(remoteIp)
    });
    const response = await fetch("https://www.google.com/recaptcha/api/siteverify", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: payload
    });
    const data = await response.json().catch(() => ({}));
    const actionMatches = !toSafeString(data?.action) || toSafeString(data?.action) === toSafeString(action);
    return {
      success: Boolean(data?.success) && actionMatches,
      skipped: false,
      provider: "recaptcha_v3",
      details: data
    };
  } catch (error) {
    return {
      success: false,
      skipped: false,
      provider: turnstileSecret ? "turnstile" : "recaptcha_v3",
      reason: error?.message || "captcha_verify_failed"
    };
  }
}

export {
  extractHoneypotValue,
  isCaptchaConfigured,
  logSuspiciousHoneypotAttempt,
  verifyCaptchaTokenIfEnabled
};
