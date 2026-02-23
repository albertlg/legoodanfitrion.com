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
  const configuredOrigin = getConfiguredAppOrigin();
  if (configuredOrigin) {
    return configuredOrigin;
  }
  const runtimeOrigin = getRuntimeOrigin();
  if (runtimeOrigin) {
    return runtimeOrigin;
  }
  return "";
}

function normalizePath(pathname) {
  const value = String(pathname || "").trim();
  if (!value) {
    return "/login";
  }
  return value.startsWith("/") ? value : `/${value}`;
}

function getAuthRedirectUrl(pathname = "/login") {
  const origin = getAppOrigin() || getRuntimeOrigin();
  if (!origin) {
    return "";
  }
  return `${origin}${normalizePath(pathname)}`;
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
