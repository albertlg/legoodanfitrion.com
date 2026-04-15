const MODULE_KEYS = [
  "date_poll",
  "finance",
  "tasks",
  "megaphone",
  "gallery",
  "spotify",
  "venues",
  "spaces",
  "shared_tasks",
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
  spaces: false,
  shared_tasks: false,
  ai_planner: true,
  icebreaker: true
});

const PROFESSIONAL_TEMPLATE_KEY_SET = new Set([
  "team_building",
  "all_hands",
  "corporate_dinner"
]);

const PROFESSIONAL_EVENT_TYPE_SET = new Set([
  "networking",
  "team_building",
  "corporate_dinner",
  "all_hands",
  "business_meeting",
  "conference"
]);

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
    venues: Boolean(hints.hasVenues) || MODULE_DEFAULTS.venues,
    spaces: Boolean(hints.hasSpaces) || MODULE_DEFAULTS.spaces,
    shared_tasks: Boolean(hints.hasSharedTasks) || MODULE_DEFAULTS.shared_tasks
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

export function isProfessionalEventContext(event) {
  if (!event || typeof event !== "object") {
    return false;
  }

  const templateKeyCandidates = [
    event.template_id,
    event.template_key,
    event.event_template_key,
    event.event_template_id
  ]
    .map((value) => String(value || "").trim().toLowerCase())
    .filter(Boolean);

  if (templateKeyCandidates.some((templateKey) => PROFESSIONAL_TEMPLATE_KEY_SET.has(templateKey))) {
    return true;
  }

  const eventType = String(event.event_type || "").trim().toLowerCase();
  if (eventType && PROFESSIONAL_EVENT_TYPE_SET.has(eventType)) {
    return true;
  }

  return false;
}
