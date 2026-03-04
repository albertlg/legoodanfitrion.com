export const HOST_PLAN_TABS = ["menu", "shopping", "ambience", "timings", "communication", "risks"];

export function normalizeHostPlanTab(scope) {
  const normalized = String(scope || "").trim().toLowerCase();
  return HOST_PLAN_TABS.includes(normalized) ? normalized : "menu";
}

function normalizeInteger(value, fallback = 0) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) {
    return fallback;
  }
  return Math.max(0, Math.trunc(parsed));
}

function normalizeText(value, fallback = "") {
  const normalized = String(value || "").trim();
  return normalized || fallback;
}

function sanitizeContext(context = {}) {
  return {
    eventId: normalizeText(context.eventId),
    preset: normalizeText(context.preset, "social"),
    momentKey: normalizeText(context.momentKey, "evening"),
    toneKey: normalizeText(context.toneKey, "casual"),
    budgetKey: normalizeText(context.budgetKey, "medium"),
    durationHours: Math.min(12, Math.max(2, normalizeInteger(context.durationHours, 4))),
    allowPlusOne: Boolean(context.allowPlusOne),
    autoReminders: Boolean(context.autoReminders),
    dressCode: normalizeText(context.dressCode, "none"),
    playlistMode: normalizeText(context.playlistMode, "host_only"),
    hostPreferences: {
      cuisine: normalizeText(context?.hostPreferences?.cuisine),
      avoid: Array.isArray(context?.hostPreferences?.avoid)
        ? context.hostPreferences.avoid.map((item) => normalizeText(item)).filter(Boolean)
        : [],
      priorities: Array.isArray(context?.hostPreferences?.priorities)
        ? context.hostPreferences.priorities.map((item) => normalizeText(item)).filter(Boolean)
        : []
    },
    guestSignals: {
      confirmed: normalizeInteger(context?.guestSignals?.confirmed, 0),
      allergies: Array.isArray(context?.guestSignals?.allergies)
        ? context.guestSignals.allergies.map((item) => normalizeText(item)).filter(Boolean)
        : [],
      intolerances: Array.isArray(context?.guestSignals?.intolerances)
        ? context.guestSignals.intolerances.map((item) => normalizeText(item)).filter(Boolean)
        : [],
      medicalConditions: Array.isArray(context?.guestSignals?.medicalConditions)
        ? context.guestSignals.medicalConditions.map((item) => normalizeText(item)).filter(Boolean)
        : [],
      dietaryMedicalRestrictions: Array.isArray(context?.guestSignals?.dietaryMedicalRestrictions)
        ? context.guestSignals.dietaryMedicalRestrictions.map((item) => normalizeText(item)).filter(Boolean)
        : [],
      diets: Array.isArray(context?.guestSignals?.diets)
        ? context.guestSignals.diets.map((item) => normalizeText(item)).filter(Boolean)
        : []
    },
    extraInstructions: normalizeText(context.extraInstructions)
  };
}

function sanitizeSections(sections = {}) {
  const output = {};
  for (const tab of HOST_PLAN_TABS) {
    output[tab] = sections[tab] && typeof sections[tab] === "object" ? sections[tab] : {};
  }
  return output;
}

function sanitizeAlerts(alerts = {}) {
  return {
    critical: Array.isArray(alerts?.critical) ? alerts.critical.map((item) => normalizeText(item)).filter(Boolean) : [],
    warning: Array.isArray(alerts?.warning) ? alerts.warning.map((item) => normalizeText(item)).filter(Boolean) : []
  };
}

export function buildHostPlanSections({ mealPlan = {}, hostPlaybook = {} } = {}) {
  return {
    menu: {
      menuSections: Array.isArray(mealPlan.menuSections) ? mealPlan.menuSections : [],
      recipeCards: Array.isArray(mealPlan.recipeCards) ? mealPlan.recipeCards : [],
      contextSummary: normalizeText(mealPlan.contextSummary)
    },
    shopping: {
      shoppingGroups: Array.isArray(mealPlan.shoppingGroups) ? mealPlan.shoppingGroups : [],
      shoppingChecklist: Array.isArray(mealPlan.shoppingChecklist) ? mealPlan.shoppingChecklist : [],
      estimatedCost: Number(mealPlan.estimatedCost || 0)
    },
    ambience: {
      actionableItems: Array.isArray(hostPlaybook.actionableItems) ? hostPlaybook.actionableItems : [],
      ambience: Array.isArray(hostPlaybook.ambience) ? hostPlaybook.ambience : [],
      conversation: Array.isArray(hostPlaybook.conversation) ? hostPlaybook.conversation : []
    },
    timings: {
      timeline: Array.isArray(hostPlaybook.timeline) ? hostPlaybook.timeline : []
    },
    communication: {
      messages: Array.isArray(hostPlaybook.messages) ? hostPlaybook.messages : []
    },
    risks: {
      risks: Array.isArray(hostPlaybook.risks) ? hostPlaybook.risks : []
    }
  };
}

export function createHostPlanSnapshot({
  eventId,
  version,
  generatedAt,
  context,
  contextOverrides,
  seedAll,
  seedByTab,
  sections,
  alerts,
  source = "local_heuristic",
  modelMeta = {}
}) {
  const normalizedGeneratedAt = normalizeText(generatedAt) || new Date().toISOString();
  return {
    schema_version: 1,
    event_id: normalizeText(eventId),
    version: Math.max(1, normalizeInteger(version, 1)),
    generated_at: normalizedGeneratedAt,
    source: normalizeText(source, "local_heuristic"),
    context: sanitizeContext(context || {}),
    context_overrides: contextOverrides && typeof contextOverrides === "object" ? contextOverrides : {},
    seeds: {
      all: Math.max(0, normalizeInteger(seedAll, 0)),
      tabs: HOST_PLAN_TABS.reduce((acc, tab) => {
        acc[tab] = Math.max(0, normalizeInteger(seedByTab?.[tab], 0));
        return acc;
      }, {})
    },
    sections: sanitizeSections(sections || {}),
    alerts: sanitizeAlerts(alerts || {}),
    model_meta: modelMeta && typeof modelMeta === "object" ? modelMeta : {}
  };
}

export function normalizeHostPlanSnapshot(snapshot) {
  if (!snapshot || typeof snapshot !== "object") {
    return null;
  }
  return createHostPlanSnapshot({
    eventId: snapshot.event_id,
    version: snapshot.version,
    generatedAt: snapshot.generated_at,
    context: snapshot.context,
    contextOverrides: snapshot.context_overrides,
    seedAll: snapshot?.seeds?.all,
    seedByTab: snapshot?.seeds?.tabs,
    sections: snapshot.sections,
    alerts: snapshot.alerts,
    source: snapshot.source,
    modelMeta: snapshot.model_meta
  });
}

export function getHostPlanStateFromSnapshot(snapshot) {
  const normalized = normalizeHostPlanSnapshot(snapshot);
  if (!normalized) {
    return null;
  }
  return {
    version: normalized.version,
    generatedAt: normalized.generated_at,
    source: normalized.source,
    modelMeta: normalized.model_meta || {},
    contextOverrides: normalized.context_overrides || {},
    seedAll: normalized?.seeds?.all || 0,
    seedByTab: normalized?.seeds?.tabs || {},
    sections: normalized.sections || {},
    alerts: normalized.alerts || { critical: [], warning: [] }
  };
}
