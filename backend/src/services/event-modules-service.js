const MODULE_KEYS = [
  "date_poll",
  "finance",
  "tasks",
  "megaphone",
  "gallery",
  "spotify",
  "venues",
  "ai_planner",
  "icebreaker"
];

const MODULE_DEFAULTS = Object.freeze({
  date_poll: true,
  finance: true,
  tasks: true,
  megaphone: true,
  gallery: true,
  spotify: true,
  venues: true,
  ai_planner: true,
  icebreaker: true
});

function toObject(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return {};
  }
  return value;
}

function normalizeBooleanLike(value) {
  if (typeof value === "boolean") {
    return value;
  }
  if (value && typeof value === "object" && !Array.isArray(value)) {
    if (Object.prototype.hasOwnProperty.call(value, "enabled")) {
      return Boolean(value.enabled);
    }
    return true;
  }
  return null;
}

export function normalizeEventActiveModules(input) {
  const source = toObject(input);
  const normalized = {};

  for (const key of MODULE_KEYS) {
    const parsed = normalizeBooleanLike(source[key]);
    if (parsed !== null) {
      normalized[key] = parsed;
    }
  }

  return normalized;
}

export function inferLegacyEventModules(event, hints = {}) {
  const scheduleMode = String(event?.schedule_mode || "").trim().toLowerCase();
  const pollStatus = String(event?.poll_status || "").trim().toLowerCase();
  const photoGalleryUrl = String(event?.photo_gallery_url || "").trim();
  const expenses = Array.isArray(event?.expenses) ? event.expenses : [];

  const hasDatePollData =
    Boolean(hints.hasDatePollOptions) ||
    scheduleMode === "tbd" ||
    pollStatus === "open" ||
    pollStatus === "closed";

  return {
    ...MODULE_DEFAULTS,
    date_poll: hasDatePollData || MODULE_DEFAULTS.date_poll,
    finance: Boolean(hints.hasExpenses ?? expenses.length > 0) || MODULE_DEFAULTS.finance,
    gallery: Boolean(hints.hasPhotoGallery ?? photoGalleryUrl) || MODULE_DEFAULTS.gallery,
    spotify: Boolean(hints.hasSpotifyPlaylist) || MODULE_DEFAULTS.spotify,
    venues: Boolean(hints.hasVenues) || MODULE_DEFAULTS.venues
  };
}

export function resolveEventModules(event, hints = {}) {
  const explicit = normalizeEventActiveModules(event?.active_modules);
  const inferred = inferLegacyEventModules(event, hints);
  const resolved = {};

  for (const key of MODULE_KEYS) {
    if (Object.prototype.hasOwnProperty.call(explicit, key)) {
      resolved[key] = explicit[key];
    } else if (Object.prototype.hasOwnProperty.call(inferred, key)) {
      resolved[key] = inferred[key];
    } else {
      resolved[key] = Boolean(MODULE_DEFAULTS[key]);
    }
  }

  return resolved;
}
