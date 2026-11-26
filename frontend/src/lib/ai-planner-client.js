import { loadSupabase } from "./supabase-loader";

const configuredApiUrl = String(
  import.meta.env.VITE_API_URL ||
  import.meta.env.VITE_API_BASE_URL ||
  ""
).trim();
const fallbackApiUrl = "/api";
const API_BASE_URL = String(configuredApiUrl || fallbackApiUrl).replace(/\/+$/, "");

function buildAiEndpoint(baseUrl, routeName) {
  const normalizedBase = String(baseUrl || "").trim().replace(/\/+$/, "");
  if (!normalizedBase) {
    return "";
  }
  if (/(^|\/)api$/i.test(normalizedBase)) {
    return `${normalizedBase}/ai/${routeName}`;
  }
  return `${normalizedBase}/api/ai/${routeName}`;
}

function buildPlannerEndpoint(baseUrl) {
  return buildAiEndpoint(baseUrl, "planner");
}

function buildIcebreakerEndpoint(baseUrl) {
  return buildAiEndpoint(baseUrl, "icebreaker");
}

function buildTranslatePlanEndpoint(baseUrl) {
  return buildAiEndpoint(baseUrl, "translate-plan");
}

function toErrorMessage(status, payload) {
  const fromPayload = String(payload?.error || payload?.message || "").trim();
  if (fromPayload) {
    return fromPayload;
  }
  return `Planner AI request failed (${status})`;
}

// Error con un código estable (ai_auth_required, ai_rate_limited,
// ai_unavailable, ai_timeout, ai_error) para mostrar un mensaje traducido.
function toAiError(status, payload) {
  const error = new Error(toErrorMessage(status, payload));
  const code = String(payload?.code || "").trim();
  if (code) {
    error.code = code;
  } else if (status === 401) {
    error.code = "ai_auth_required";
  } else if (status === 429) {
    error.code = "ai_rate_limited";
  } else {
    error.code = "ai_error";
  }
  return error;
}

// Clave i18n del mensaje que ve el usuario cuando falla una función de IA.
export function getAiErrorMessageKey(error, fallbackKey = "ai_error_generic") {
  switch (error?.code) {
    case "ai_auth_required":
      return "ai_error_auth";
    case "ai_rate_limited":
      return "ai_error_rate_limited";
    case "ai_unavailable":
      return "ai_error_unavailable";
    default:
      return fallbackKey;
  }
}

// Cabeceras con el token de la sesión: el backend rechaza las peticiones sin él.
async function buildAiHeaders() {
  const headers = { "Content-Type": "application/json" };
  const supabase = await loadSupabase();
  const { data } = supabase ? await supabase.auth.getSession() : { data: null };
  const accessToken = data?.session?.access_token;
  if (accessToken) {
    headers.Authorization = `Bearer ${accessToken}`;
  }
  return headers;
}

export async function requestEventPlannerAI({ eventContext, currentPlan = {}, scope = "all", locale = "es" }) {
  const fullUrl = buildPlannerEndpoint(API_BASE_URL);
  if (!fullUrl) {
    throw new Error(
      "Planner AI API URL not configured. Define VITE_API_URL (or VITE_API_BASE_URL) in frontend environment."
    );
  }

  const response = await fetch(fullUrl, {
    method: "POST",
    headers: await buildAiHeaders(),
    body: JSON.stringify({
      eventContext: eventContext && typeof eventContext === "object" ? eventContext : {},
      currentPlan: currentPlan && typeof currentPlan === "object" ? currentPlan : {},
      scope: String(scope || "all"),
      locale: String(locale || "es").trim().toLowerCase()
    })
  });

  let payload = null;
  try {
    payload = await response.json();
  } catch {
    payload = null;
  }

  if (!response.ok) {
    throw toAiError(response.status, payload);
  }

  if (payload?.fallback === true) {
    throw new Error(String(payload?.error || "Planner AI fallback response"));
  }

  if (!payload || typeof payload !== "object" || !payload.data) {
    throw new Error("Planner AI response has no data payload.");
  }

  return {
    data: payload.data,
    meta: payload.meta && typeof payload.meta === "object" ? payload.meta : {},
    fallback: Boolean(payload?.fallback)
  };
}

export async function requestPlanTranslationAI({ planSnapshot, fromLanguage = "es", toLanguage }) {
  if (!toLanguage) {
    throw new Error("toLanguage is required for plan translation.");
  }
  const fullUrl = buildTranslatePlanEndpoint(API_BASE_URL);
  if (!fullUrl) {
    throw new Error(
      "Planner AI API URL not configured. Define VITE_API_URL (or VITE_API_BASE_URL) in frontend environment."
    );
  }

  const response = await fetch(fullUrl, {
    method: "POST",
    headers: await buildAiHeaders(),
    body: JSON.stringify({
      planSnapshot: planSnapshot && typeof planSnapshot === "object" ? planSnapshot : {},
      fromLanguage: String(fromLanguage || "es").trim().toLowerCase(),
      toLanguage: String(toLanguage).trim().toLowerCase()
    })
  });

  let payload = null;
  try {
    payload = await response.json();
  } catch {
    payload = null;
  }

  if (!response.ok) {
    throw toAiError(response.status, payload);
  }

  if (payload?.fallback === true) {
    throw new Error(String(payload?.error || "Translate plan AI fallback response"));
  }

  if (!payload || typeof payload !== "object" || !payload.data) {
    throw new Error("Translate plan AI response has no data payload.");
  }

  return {
    data: payload.data,
    meta: payload.meta && typeof payload.meta === "object" ? payload.meta : {}
  };
}

export async function requestEventIcebreakerAI({
  eventContext,
  guestRsvpSignals = [],
  locale = "es"
}) {
  const fullUrl = buildIcebreakerEndpoint(API_BASE_URL);
  if (!fullUrl) {
    throw new Error(
      "Planner AI API URL not configured. Define VITE_API_URL (or VITE_API_BASE_URL) in frontend environment."
    );
  }

  const response = await fetch(fullUrl, {
    method: "POST",
    headers: await buildAiHeaders(),
    body: JSON.stringify({
      eventContext: eventContext && typeof eventContext === "object" ? eventContext : {},
      guestRsvpSignals: Array.isArray(guestRsvpSignals) ? guestRsvpSignals : [],
      locale: String(locale || "es").trim().toLowerCase()
    })
  });

  let payload = null;
  try {
    payload = await response.json();
  } catch {
    payload = null;
  }

  if (!response.ok) {
    throw toAiError(response.status, payload);
  }

  if (!payload || typeof payload !== "object" || !payload.data) {
    throw new Error("Icebreaker AI response has no data payload.");
  }

  return {
    data: payload.data,
    meta: payload.meta && typeof payload.meta === "object" ? payload.meta : {}
  };
}
