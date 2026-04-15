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

export const EVENT_MODULE_KEYS = MODULE_KEYS;

export const EVENT_MODULE_DEFAULTS = Object.freeze({
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

const EVENT_MODULES_ALL_OFF = Object.freeze(
  Object.fromEntries(MODULE_KEYS.map((key) => [key, false]))
);

function buildTemplateModules(enabledKeys = [], { useDefaults = false } = {}) {
  const base = useDefaults ? { ...EVENT_MODULE_DEFAULTS } : { ...EVENT_MODULES_ALL_OFF };
  for (const key of enabledKeys) {
    if (Object.prototype.hasOwnProperty.call(base, key)) {
      base[key] = true;
    }
  }
  return base;
}

export const EVENT_TEMPLATES = Object.freeze({
  dinner: Object.freeze({
    key: "dinner",
    audience: "personal",
    titleKey: "event_template_preset_dinner_title",
    descriptionKey: "event_template_preset_dinner_description",
    icon: "utensils",
    suggestedTypeCode: "family_lunch",
    suggestedHour: 20,
    scheduleMode: "tbd",
    allowPlusOne: true,
    dressCode: "none",
    playlistMode: "host_only",
    modules: Object.freeze(buildTemplateModules(["date_poll"]))
  }),
  weekend: Object.freeze({
    key: "weekend",
    audience: "personal",
    titleKey: "event_template_preset_weekend_title",
    descriptionKey: "event_template_preset_weekend_description",
    icon: "location",
    suggestedTypeCode: "outdoor_meetup",
    suggestedHour: 11,
    scheduleMode: "fixed",
    allowPlusOne: true,
    dressCode: "casual",
    playlistMode: "host_only",
    modules: Object.freeze(buildTemplateModules(["finance", "venues", "spaces", "shared_tasks", "icebreaker"]))
  }),
  party: Object.freeze({
    key: "party",
    audience: "personal",
    titleKey: "event_template_preset_party_title",
    descriptionKey: "event_template_preset_party_description",
    icon: "sparkle",
    suggestedTypeCode: "party",
    suggestedHour: 21,
    scheduleMode: "fixed",
    allowPlusOne: true,
    dressCode: "themed",
    playlistMode: "spotify_collaborative",
    modules: Object.freeze(buildTemplateModules(["spotify", "megaphone", "gallery", "shared_tasks"]))
  }),
  team_building: Object.freeze({
    key: "team_building",
    audience: "professional",
    titleKey: "event_template_preset_team_building_title",
    descriptionKey: "event_template_preset_team_building_description",
    icon: "users",
    suggestedTypeCode: "networking",
    suggestedHour: 10,
    scheduleMode: "tbd",
    allowPlusOne: false,
    dressCode: "casual",
    playlistMode: "host_only",
    modules: Object.freeze(buildTemplateModules(["date_poll", "venues", "spaces", "shared_tasks", "icebreaker"]))
  }),
  all_hands: Object.freeze({
    key: "all_hands",
    audience: "professional",
    titleKey: "event_template_preset_all_hands_title",
    descriptionKey: "event_template_preset_all_hands_description",
    icon: "message",
    suggestedTypeCode: "networking",
    suggestedHour: 11,
    scheduleMode: "fixed",
    allowPlusOne: false,
    dressCode: "none",
    playlistMode: "host_only",
    modules: Object.freeze(buildTemplateModules(["megaphone", "icebreaker"]))
  }),
  corporate_dinner: Object.freeze({
    key: "corporate_dinner",
    audience: "professional",
    titleKey: "event_template_preset_corporate_dinner_title",
    descriptionKey: "event_template_preset_corporate_dinner_description",
    icon: "utensils",
    suggestedTypeCode: "cocktail",
    suggestedHour: 20,
    scheduleMode: "fixed",
    allowPlusOne: false,
    dressCode: "elegant",
    playlistMode: "host_only",
    modules: Object.freeze(buildTemplateModules(["venues", "spaces", "megaphone", "shared_tasks"]))
  }),
  custom: Object.freeze({
    key: "custom",
    audience: "both",
    titleKey: "event_template_preset_custom_title",
    descriptionKey: "event_template_preset_custom_description",
    icon: "settings",
    suggestedTypeCode: "",
    suggestedHour: 19,
    scheduleMode: "fixed",
    allowPlusOne: false,
    dressCode: "none",
    playlistMode: "host_only",
    modules: Object.freeze(buildTemplateModules([], { useDefaults: true }))
  })
});

export const EVENT_TEMPLATE_LIST = Object.freeze(
  Object.values(EVENT_TEMPLATES)
);

export const EVENT_TEMPLATE_KEYS = Object.freeze(
  EVENT_TEMPLATE_LIST.map((templateItem) => templateItem.key)
);

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

export function getEventTemplateModules(templateKey, { useAllOffForCustom = false } = {}) {
  const normalizedKey = String(templateKey || "").trim().toLowerCase();
  const template = EVENT_TEMPLATES[normalizedKey] || EVENT_TEMPLATES.custom;

  if (template.key === "custom" && useAllOffForCustom) {
    return { ...EVENT_MODULES_ALL_OFF };
  }

  return normalizeEventActiveModules(template.modules);
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

  const hasExpenses = Boolean(hints.hasExpenses ?? expenses.length > 0);
  const hasGallery = Boolean(hints.hasPhotoGallery ?? photoGalleryUrl);
  const hasSpotify = Boolean(hints.hasSpotifyPlaylist);
  const hasVenues = Boolean(hints.hasVenues);
  const hasSpaces = Boolean(hints.hasSpaces);
  const hasSharedTasks = Boolean(hints.hasSharedTasks);

  return {
    ...EVENT_MODULE_DEFAULTS,
    date_poll: hasDatePollData || EVENT_MODULE_DEFAULTS.date_poll,
    finance: hasExpenses || EVENT_MODULE_DEFAULTS.finance,
    gallery: hasGallery || EVENT_MODULE_DEFAULTS.gallery,
    spotify: hasSpotify || EVENT_MODULE_DEFAULTS.spotify,
    venues: hasVenues || EVENT_MODULE_DEFAULTS.venues,
    spaces: hasSpaces || EVENT_MODULE_DEFAULTS.spaces,
    shared_tasks: hasSharedTasks || EVENT_MODULE_DEFAULTS.shared_tasks
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
      resolved[key] = Boolean(EVENT_MODULE_DEFAULTS[key]);
    }
  }

  return resolved;
}

export function isEventModuleEnabled(moduleMap, key, fallback = true) {
  if (!moduleMap || typeof moduleMap !== "object") {
    return Boolean(fallback);
  }
  if (!Object.prototype.hasOwnProperty.call(moduleMap, key)) {
    return Boolean(fallback);
  }
  return Boolean(moduleMap[key]);
}
