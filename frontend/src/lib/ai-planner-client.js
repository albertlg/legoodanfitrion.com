const configuredApiUrl = String(
  import.meta.env.VITE_API_URL ||
  import.meta.env.VITE_API_BASE_URL ||
  ""
).trim();
const fallbackApiUrl = import.meta.env.DEV ? "http://localhost:3000" : "";
const API_BASE_URL = String(configuredApiUrl || fallbackApiUrl).replace(/\/+$/, "");

function toErrorMessage(status, payload) {
  const fromPayload = String(payload?.error || payload?.message || "").trim();
  if (fromPayload) {
    return fromPayload;
  }
  return `Planner AI request failed (${status})`;
}

export async function requestEventPlannerAI({ eventContext, currentPlan = {}, scope = "all", locale = "es" }) {
  if (!API_BASE_URL) {
    throw new Error(
      "Planner AI API URL not configured. Define VITE_API_URL (or VITE_API_BASE_URL) in frontend environment."
    );
  }

  const fullUrl = `${API_BASE_URL}/api/ai/planner`;
  console.log("Enviando petición a:", fullUrl);

  const response = await fetch(fullUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
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
    throw new Error(toErrorMessage(response.status, payload));
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
