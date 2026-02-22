const configuredAppUrl = String(import.meta.env.VITE_PUBLIC_APP_URL || "").trim();

function parseUrl(input) {
  if (!input) {
    return null;
  }
  try {
    return new URL(input);
  } catch {
    return null;
  }
}

function getConfiguredAppOrigin() {
  const parsed = parseUrl(configuredAppUrl);
  return parsed?.origin || "";
}

function getRuntimeOrigin() {
  if (typeof window === "undefined") {
    return "";
  }
  return String(window.location.origin || "").trim();
}

function getAppOrigin() {
  const runtimeOrigin = getRuntimeOrigin();
  if (runtimeOrigin) {
    return runtimeOrigin;
  }
  const configuredOrigin = getConfiguredAppOrigin();
  if (configuredOrigin) {
    return configuredOrigin;
  }
  return "";
}

function getAuthRedirectUrl() {
  const origin = getRuntimeOrigin() || getAppOrigin();
  if (!origin) {
    return "";
  }
  const path = typeof window !== "undefined" ? window.location.pathname : "/";
  return `${origin}${path || "/"}`;
}

function buildAppUrl(path = "/") {
  const origin = getAppOrigin();
  if (!origin) {
    return path;
  }
  if (!path || path === "/") {
    return origin;
  }
  return `${origin}${path.startsWith("/") ? path : `/${path}`}`;
}

export { buildAppUrl, getAppOrigin, getAuthRedirectUrl };
