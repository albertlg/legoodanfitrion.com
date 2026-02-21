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

function getAppOrigin() {
  const configuredOrigin = getConfiguredAppOrigin();
  if (configuredOrigin) {
    return configuredOrigin;
  }
  if (typeof window !== "undefined") {
    return window.location.origin;
  }
  return "";
}

function getAuthRedirectUrl() {
  const origin = getAppOrigin();
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
