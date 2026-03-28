import express from "express";
import { GoogleGenAI } from "@google/genai";

const router = express.Router();

const PLANNER_RESPONSE_EXAMPLE = {
  mealPlan: {
    contextSummary: "Resumen de 1 línea del evento",
    menuSections: [{ id: "m1", title: "Entrantes", items: ["Nachos", "Guacamole"] }]
  },
  shoppingList: {
    estimatedCostRange: { min: 30, max: 50 },
    groups: [
      {
        id: "g1",
        title: "Verduras",
        items: [{ id: "s1", name: "Tomates", quantity: "1 kg", warning: "Para veganos" }]
      }
    ]
  },
  playbook: {
    acceptanceRate: "80%",
    actionableItems: ["Revisa las alergias al tomate"],
    ambience: ["Luces cálidas", "Velas"],
    conversation: ["Evitar hablar de política"],
    timeline: [{ id: "t1", title: "T-24h", detail: "Comprar hielo" }],
    messages: [{ id: "ms1", title: "Recordatorio", text: "¡Nos vemos mañana!" }],
    risks: [{ id: "r1", label: "Lluvia", detail: "Ten un plan B interior", level: "maybe" }]
  }
};

const ICEBREAKER_RESPONSE_EXAMPLE = {
  badJoke: "¿Cuál es el colmo de un anfitrión? Que sus invitados digan: \"mejor en tu casa que en la mía\".",
  conversationTopics: [
    "¿Qué canción describe mejor tu semana y por qué?",
    "Si tuvieras que organizar una cena temática imposible, ¿cuál sería?"
  ],
  quickGameIdea:
    "Juego relámpago (5 min): cada persona comparte una anécdota en 20 segundos y el grupo vota la más inesperada."
};

const SUPPORTED_LOCALES = new Set(["es", "ca", "en", "fr", "it"]);
const SUPPORTED_SCOPES = new Set(["all", "menu", "shopping", "ambience", "timings", "communication", "risks"]);

function normalizeLocale(value, fallback = "es") {
  const normalized = String(value || "").trim().toLowerCase();
  if (!normalized) {
    return fallback;
  }
  const baseLocale = normalized.split("-")[0];
  return SUPPORTED_LOCALES.has(baseLocale) ? baseLocale : fallback;
}

function normalizeScope(value, fallback = "all") {
  const normalized = String(value || "").trim().toLowerCase();
  if (!normalized) {
    return fallback;
  }
  return SUPPORTED_SCOPES.has(normalized) ? normalized : fallback;
}

function parseDateInput(value) {
  const normalized = normalizeText(value, "");
  if (!normalized) {
    return null;
  }
  const parsed = new Date(normalized);
  return Number.isFinite(parsed.getTime()) ? parsed : null;
}

function isDifferentUtcDay(a, b) {
  if (!a || !b) {
    return false;
  }
  return (
    a.getUTCFullYear() !== b.getUTCFullYear() ||
    a.getUTCMonth() !== b.getUTCMonth() ||
    a.getUTCDate() !== b.getUTCDate()
  );
}

function extractEventScheduleContext(eventContext = {}) {
  const safeEventContext = ensureObject(eventContext);
  const eventPayload = ensureObject(safeEventContext.event);
  const startAt = normalizeText(
    eventPayload.startAt ||
      eventPayload.start_at ||
      safeEventContext.startAt ||
      safeEventContext.start_at ||
      safeEventContext?.context?.eventDate ||
      ""
  );
  const endAt = normalizeText(
    eventPayload.endAt ||
      eventPayload.end_at ||
      safeEventContext.endAt ||
      safeEventContext.end_at ||
      ""
  );
  const scheduleMode = normalizeText(
    eventPayload.scheduleMode ||
      eventPayload.schedule_mode ||
      safeEventContext.scheduleMode ||
      safeEventContext.schedule_mode
  ).toLowerCase();
  const pollStatus = normalizeText(
    eventPayload.pollStatus ||
      eventPayload.poll_status ||
      safeEventContext.pollStatus ||
      safeEventContext.poll_status
  ).toLowerCase();

  const startDate = parseDateInput(startAt);
  const endDate = parseDateInput(endAt);
  const isMultiDay = Boolean(startDate && endDate && endDate.getTime() > startDate.getTime() && isDifferentUtcDay(startDate, endDate));
  const isTbd = scheduleMode === "tbd" || pollStatus === "open";

  return {
    startAt,
    endAt,
    scheduleMode,
    pollStatus,
    isMultiDay,
    isTbd,
    hasEventDate: Boolean(startDate)
  };
}

function buildSystemPrompt({ locale = "es", scope = "all", eventContext = {} } = {}) {
  const safeLocale = normalizeLocale(locale, "es");
  const safeScope = normalizeScope(scope, "all");
  const safeEventContext = ensureObject(eventContext);
  const { startAt, endAt, isMultiDay, isTbd, hasEventDate } = extractEventScheduleContext(safeEventContext);
  const guestCount = safeEventContext.guests?.length || "un número no especificado de"; // Usamos los invitados reales si los pasas

  const scheduleGuardrail = isTbd
    ? 'ATENCIÓN: La fecha y hora exactas de este evento aún están por decidir (TBD). Genera un plan de acción atemporal utilizando etiquetas genéricas como "Día 1", "Día 2", "Fase de preparación" o "Tarde del evento", sin usar fechas ni horas concretas.'
    : isMultiDay
      ? `ATENCIÓN: Este es un evento de varios días (del ${startAt} al ${endAt}). Tu misión es crear un itinerario estructurado por DÍAS completos (Ej: Viernes - Llegada, Sábado - Día principal, Domingo - Despedida), distribuyendo los tiempos de forma realista para una convivencia continua.`
      : "";

  const scopeRule =
    safeScope === "all"
      ? "10) Scope actual: all. Regenera de forma integral menu, compras, ambiente, timings, comunicacion y riesgos."
      : [
        `10) Scope actual: ${safeScope}.`,
        `CRITICAL: You are updating ONLY the ${safeScope} section.`,
        `Return a JSON object containing ONLY the updated ${safeScope} keys.`,
        "DO NOT return the rest of the plan. I will merge it on my side."
      ].join(" ");

  return [
    "Eres el 'Head Event Planner' y 'Chef Privado' de élite de LeGoodAnfitrión.",
    "Tienes 15 años de experiencia organizando desde cenas íntimas de lujo hasta bodas y eventos corporativos multitudinarios.",
    "Tu tarea es devolver SOLO JSON válido, sin markdown, sin bloques ```.",
    `IMPORTANT: All text fields in the output JSON MUST be written in the language corresponding to the locale code: ${safeLocale}.`,
    "Debes responder EXACTAMENTE con esta estructura y claves:",
    JSON.stringify(PLANNER_RESPONSE_EXAMPLE, null, 2),
    "REGLAS OBLIGATORIAS Y METODOLOGÍA:",
    "1) LENGUAJE INCLUSIVO Y CÁLIDO: Usa siempre un tono empático, cercano pero sofisticado. Evita el masculino genérico (ej: en vez de 'bienvenidos los invitados', usa 'te damos la bienvenida' o 'quienes asistan'). Escribe como si fueras su mejor amigo y asesor experto.",
    "2) MENÚS CON SENTIDO: Diseña el 'mealPlan' pensando en la armonía de sabores, la temporada y la viabilidad para el anfitrión. No sugieras platos que requieran estar en la cocina mientras la gente disfruta.",
    `3) LISTA DE LA COMPRA REALISTA: Calcula cantidades estimadas basándote en que es un evento para ${guestCount} personas. Agrupa los ingredientes por pasillos del supermercado lógico (ej: Frescos, Carnicería, Despensa, Bebidas).`,
    "4) TIMELINE PROFESIONAL (T-MINUS): En el 'playbook.timeline', usa el framework de Wedding Planners. Ej: 'T-1 Semana', 'T-24h', 'T-2h (Ice & Chill)', 'H-0 (Llegada)'. Da consejos tácticos (ej: 'Saca la carne de la nevera 1h antes').",
    "5) AMBIENTACIÓN MULTISENSORIAL: En 'playbook.ambience', no digas solo 'Pon luces'. Sugiere una atmósfera completa: tipo de iluminación, estilo exacto de playlist musical (ej: 'Bossa nova de fondo a volumen conversacional') y aromas (ej: 'Velas sin olor cerca de la comida').",
    "6) GESTIÓN DE RIESGOS ESTRICTA: Respeta estrictamente alergias, intolerancias y afecciones de INPUT_JSON. NUNCA sugieras un ingrediente prohibido. Si hay alergias críticas, añade advertencias de contaminación cruzada explícitas en 'risks' y 'shoppingList warnings'.",
    scheduleGuardrail || "7) TEMPORALIDAD: Como no hay fecha exacta, sugiere opciones atemporales y versátiles.",
    hasEventDate && !isTbd
      ? `8) FECHA DEL EVENTO: El evento comienza el ${startAt}. Adapta el menú y el plan B a la estación del año correspondiente.`
      : "8) Si no hay fecha cerrada, evita referencias temporales rígidas.",
    "9) RIESGOS Y PLAN B: En 'playbook.risks', anticipa problemas reales (clima, silencios incómodos, retrasos en la comida) y da soluciones de experto. 'level' debe ser: yes | no | maybe | pending.",
    "10) No añadas claves fuera del esquema especificado. Si faltan datos, aplica tu experiencia para proponer la opción más elegante y segura.",
    scopeRule
  ].join("\n");
}

function buildIcebreakerSystemPrompt({ locale = "es", eventContext = {} } = {}) {
  const safeLocale = normalizeLocale(locale, "es");
  const safeEventContext = ensureObject(eventContext);
  const safeEvent = ensureObject(safeEventContext.event);
  const { isMultiDay } = extractEventScheduleContext(safeEventContext);
  const title = normalizeText(safeEvent.title || "encuentro social");
  const description = normalizeText(safeEvent.description || "un encuentro para disfrutar");

  return [
    "Eres el 'Maestro de Ceremonias' experto en dinámicas sociales de LeGoodAnfitrión.",
    "Tu objetivo es crear conexiones genuinas entre las personas de forma natural, elegante y divertida, sin que se sienta forzado.",
    "Devuelve SOLO JSON válido, sin markdown y sin bloques ```.",
    `IMPORTANT: All text fields in the output JSON MUST be written in the language corresponding to the locale code: ${safeLocale}.`,
    "Debes responder EXACTAMENTE con esta estructura y claves:",
    JSON.stringify(ICEBREAKER_RESPONSE_EXAMPLE, null, 2),
    "REGLAS OBLIGATORIAS:",
    `1) CONTEXTO CRÍTICO: Adapta completamente el tono al evento -> Título: "${title}", Descripción: "${description}". Si parece formal, sé elegante e ingenioso. Si parece casual, sé divertido y fresco.`,
    "2) LENGUAJE INCLUSIVO Y CÁLIDO: Evita el masculino genérico. Usa fórmulas que integren a todo el grupo por igual. Mantén frases cortas, pensadas para leerse rápidamente en un móvil.",
    "3) ICEBREAKER (badJoke): No tiene que ser un 'chiste malo' literal. Puede ser una anécdota corta, irónica y muy identificable sobre ser anfitrión o asistir a eventos, que sirva para que todos sonrían al llegar.",
    "4) TEMAS DE CONVERSACIÓN: Propón 2 temas que provoquen debate ameno o historias personales interesantes. Evita temas básicos ('qué tal el clima'). Busca 'thought-starters' creativos.",
    "5) DINÁMICA RÁPIDA (quickGameIdea): Propón 1 dinámica de máximo 5 minutos. Debe ser 'Low Friction' (baja vergüenza, sin materiales, que se pueda jugar con una copa en la mano).",
    isMultiDay
      ? '6) ATENCIÓN: Al ser una escapada de varios días, en tus sugerencias prioriza incluir al menos un "juego de fondo" o reto continuo que los invitados puedan jugar a lo largo de toda la convivencia (ej: el asesino, roles secretos), además de juegos puntuales.'
      : "6) Evita temas divisorios (política, religión) o juegos invasivos.",
    "7) Evita temas divisorios (política, religión) o juegos invasivos."
  ].join("\n");
}

function normalizeText(value, fallback = "") {
  const normalized = String(value || "").trim();
  return normalized || fallback;
}

function normalizeArray(value) {
  return Array.isArray(value) ? value : [];
}

function ensureObject(value) {
  return value && typeof value === "object" && !Array.isArray(value) ? value : {};
}

function safeJsonParse(text) {
  const raw = String(text || "").trim();
  if (!raw) {
    return null;
  }
  try {
    return JSON.parse(raw);
  } catch {
    const withoutMarkdown = raw
      .replace(/^```json/i, "")
      .replace(/^```/i, "")
      .replace(/```$/i, "")
      .trim();
    return JSON.parse(withoutMarkdown);
  }
}

function getResponseText(response) {
  if (!response) {
    return "";
  }
  if (typeof response.text === "string") {
    return response.text;
  }
  if (typeof response.text === "function") {
    const maybeText = response.text();
    return typeof maybeText === "string" ? maybeText : "";
  }
  return "";
}

function sanitizePlannerResponse(payload) {
  const source = ensureObject(payload);
  const mealPlan = ensureObject(source.mealPlan);
  const shoppingList = ensureObject(source.shoppingList);
  const playbook = ensureObject(source.playbook);

  const menuSections = normalizeArray(mealPlan.menuSections).map((section, index) => {
    const safeSection = ensureObject(section);
    return {
      id: normalizeText(safeSection.id, `m${index + 1}`),
      title: normalizeText(safeSection.title, `Sección ${index + 1}`),
      items: normalizeArray(safeSection.items).map((item) => normalizeText(item)).filter(Boolean)
    };
  });

  const groups = normalizeArray(shoppingList.groups).map((group, groupIndex) => {
    const safeGroup = ensureObject(group);
    return {
      id: normalizeText(safeGroup.id, `g${groupIndex + 1}`),
      title: normalizeText(safeGroup.title, `Grupo ${groupIndex + 1}`),
      items: normalizeArray(safeGroup.items).map((item, itemIndex) => {
        const safeItem = ensureObject(item);
        return {
          id: normalizeText(safeItem.id, `s${groupIndex + 1}-${itemIndex + 1}`),
          name: normalizeText(safeItem.name, "Ingrediente"),
          quantity: normalizeText(safeItem.quantity, "1 ud"),
          warning: normalizeText(safeItem.warning)
        };
      })
    };
  });

  const timeline = normalizeArray(playbook.timeline).map((item, index) => {
    const safeItem = ensureObject(item);
    return {
      id: normalizeText(safeItem.id, `t${index + 1}`),
      title: normalizeText(safeItem.title, `Paso ${index + 1}`),
      detail: normalizeText(safeItem.detail)
    };
  });

  const messages = normalizeArray(playbook.messages).map((item, index) => {
    const safeItem = ensureObject(item);
    return {
      id: normalizeText(safeItem.id, `ms${index + 1}`),
      title: normalizeText(safeItem.title, `Mensaje ${index + 1}`),
      text: normalizeText(safeItem.text)
    };
  });

  const risks = normalizeArray(playbook.risks).map((item, index) => {
    const safeItem = ensureObject(item);
    const level = normalizeText(safeItem.level, "maybe").toLowerCase();
    const safeLevel = ["yes", "no", "maybe", "pending"].includes(level) ? level : "maybe";
    return {
      id: normalizeText(safeItem.id, `r${index + 1}`),
      label: normalizeText(safeItem.label, `Riesgo ${index + 1}`),
      detail: normalizeText(safeItem.detail),
      level: safeLevel
    };
  });

  const estimatedCostRangeInput = ensureObject(shoppingList.estimatedCostRange);
  const min = Number(estimatedCostRangeInput.min || 0);
  const max = Number(estimatedCostRangeInput.max || 0);
  const safeMin = Number.isFinite(min) ? Math.max(0, Math.round(min)) : 0;
  const safeMax = Number.isFinite(max) ? Math.max(safeMin, Math.round(max)) : Math.max(0, safeMin);

  return {
    mealPlan: {
      contextSummary: normalizeText(mealPlan.contextSummary),
      menuSections
    },
    shoppingList: {
      estimatedCostRange: { min: safeMin, max: safeMax },
      groups
    },
    playbook: {
      acceptanceRate: normalizeText(playbook.acceptanceRate, "0%"),
      actionableItems: normalizeArray(playbook.actionableItems).map((item) => normalizeText(item)).filter(Boolean),
      ambience: normalizeArray(playbook.ambience).map((item) => normalizeText(item)).filter(Boolean),
      conversation: normalizeArray(playbook.conversation).map((item) => normalizeText(item)).filter(Boolean),
      timeline,
      messages,
      risks
    }
  };
}

function mergePlannerByScope({ generated = {}, currentPlan = {}, scope = "all" } = {}) {
  const safeScope = normalizeScope(scope, "all");

  if (safeScope === "all") {
    return sanitizePlannerResponse(generated);
  }

  // Si no hay plan base, devolvemos el generado saneado
  if (!currentPlan || Object.keys(currentPlan).length === 0) {
    return sanitizePlannerResponse(generated);
  }

  // Hacemos una copia RÁPIDA y DIRECTA del plan actual.
  // Sin try/catch raros, solo JSON a JSON. Esto garantiza que TODO se copia.
  const merged = JSON.parse(JSON.stringify(currentPlan));

  // Aseguramos que la estructura básica exista para evitar errores
  merged.mealPlan = merged.mealPlan || {};
  merged.shoppingList = merged.shoppingList || {};
  merged.playbook = merged.playbook || {};

  // Extraemos lo que Gemini nos ha devuelto
  const genPlaybook = generated.playbook || {};
  const genMealPlan = generated.mealPlan || {};
  const genShopping = generated.shoppingList || {};

  // INYECTAMOS SOLO LO QUE TOCA (Bypass total)
  if (safeScope === "menu") {
    if (genMealPlan.contextSummary) merged.mealPlan.contextSummary = genMealPlan.contextSummary;
    if (generated.contextSummary) merged.mealPlan.contextSummary = generated.contextSummary;
    if (genMealPlan.menuSections) merged.mealPlan.menuSections = genMealPlan.menuSections;
    if (generated.menuSections) merged.mealPlan.menuSections = generated.menuSections;
  }

  if (safeScope === "shopping") {
    // Salvamos los checkboxes locales
    const existingCheckedById = {};
    if (merged.shoppingList.groups) {
      merged.shoppingList.groups.forEach(g => {
        if (g.items) {
          g.items.forEach(i => {
            if (i.id) existingCheckedById[i.id] = i.checked;
          });
        }
      });
    }

    if (genShopping.estimatedCostRange) merged.shoppingList.estimatedCostRange = genShopping.estimatedCostRange;
    if (generated.estimatedCostRange) merged.shoppingList.estimatedCostRange = generated.estimatedCostRange;

    const nextGroups = genShopping.groups || generated.groups;
    if (nextGroups) {
      merged.shoppingList.groups = nextGroups.map(g => ({
        ...g,
        items: (g.items || []).map(i => ({
          ...i,
          checked: existingCheckedById[i.id] || false
        }))
      }));
    }
  }

  if (safeScope === "ambience") {
    if (genPlaybook.ambience) merged.playbook.ambience = genPlaybook.ambience;
    if (generated.ambience) merged.playbook.ambience = generated.ambience;
    if (genPlaybook.conversation) merged.playbook.conversation = genPlaybook.conversation;
    if (generated.conversation) merged.playbook.conversation = generated.conversation;
    if (genPlaybook.actionableItems) merged.playbook.actionableItems = genPlaybook.actionableItems;
    if (generated.actionableItems) merged.playbook.actionableItems = generated.actionableItems;
  }

  if (safeScope === "timings") {
    if (genPlaybook.timeline) merged.playbook.timeline = genPlaybook.timeline;
    if (generated.timeline) merged.playbook.timeline = generated.timeline;
  }

  if (safeScope === "communication") {
    if (genPlaybook.messages) merged.playbook.messages = genPlaybook.messages;
    if (generated.messages) merged.playbook.messages = generated.messages;
  }

  if (safeScope === "risks") {
    if (genPlaybook.risks) merged.playbook.risks = genPlaybook.risks;
    if (generated.risks) merged.playbook.risks = generated.risks;
  }

  // Devolvemos el plan copiado con LA ÚNICA llave modificada.
  return merged;
}

function sanitizeIcebreakerResponse(payload) {
  const source = ensureObject(payload);
  const topics = normalizeArray(source.conversationTopics)
    .map((item) => normalizeText(item))
    .filter(Boolean)
    .slice(0, 2);

  return {
    badJoke: normalizeText(source.badJoke, "¿Plan B? Sonreír, brindar y reiniciar conversación."),
    conversationTopics:
      topics.length >= 2
        ? topics
        : [
          topics[0] || "¿Cuál fue tu mejor viaje improvisado y qué salió mal?",
          topics[1] || "Si esta fiesta tuviera banda sonora, ¿qué canción abriría?"
        ].slice(0, 2),
    quickGameIdea: normalizeText(
      source.quickGameIdea,
      "Juego de 5 minutos: ronda de 'dos verdades y una mentira' en grupos de 3."
    )
  };
}

function withTimeout(promise, timeoutMs, timeoutLabel = "Operation timeout") {
  const normalizedTimeout = Number(timeoutMs);
  const safeTimeout = Number.isFinite(normalizedTimeout) && normalizedTimeout > 0 ? normalizedTimeout : 60000;
  return Promise.race([
    promise,
    new Promise((_, reject) => {
      setTimeout(() => {
        reject(new Error(`${timeoutLabel} (${safeTimeout}ms)`));
      }, safeTimeout);
    })
  ]);
}

router.post("/planner", async (req, res) => {
  console.log("--- NUEVA PETICIÓN IA --- | Scope:", req.body?.scope);
  console.log("GEMINI_API_KEY configurada:", process.env.GEMINI_API_KEY ? "SÍ" : "NO");

  const apiKey = String(process.env.GEMINI_API_KEY || "").trim();
  if (!apiKey) {
    return res.status(503).json({
      error: "GEMINI_API_KEY no configurada en backend/.env"
    });
  }

  const requestPayload = ensureObject(req.body);
  const eventContext = ensureObject(requestPayload.eventContext);
  const scope = normalizeScope(requestPayload.scope, "all");
  const locale = normalizeLocale(requestPayload.locale || eventContext.locale || req.headers["accept-language"], "es");
  const currentPlan = ensureObject(requestPayload.currentPlan);

  try {
    const client = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
    const userPayload = {
      scope,
      locale,
      eventContext,
      currentPlan
    };

    let response;
    try {
      console.log("Iniciando llamada a Gemini...");
      response = await withTimeout(
        client.models.generateContent({
          model: "gemini-2.5-flash",
          contents: [
            {
              role: "user",
              parts: [
                {
                  text: `INPUT_JSON:\n${JSON.stringify(userPayload, null, 2)}`
                }
              ]
            }
          ],
          config: {
            responseMimeType: "application/json",
            systemInstruction: buildSystemPrompt({ locale, scope, eventContext }),
            temperature: 0.25
          }
        }),
        Number(process.env.GEMINI_TIMEOUT_MS || 60000),
        "Gemini request timeout"
      );
      console.log("Llamada a Gemini completada.");
    } catch (error) {
      console.error("[ai/planner] Error durante llamada a Gemini:");
      console.error(error);
      return res.status(500).json({
        error: String(error?.message || "Error desconocido en llamada a Gemini"),
        fallback: true
      });
    }

    const textResponse = getResponseText(response);
    console.log("Respuesta bruta recibida. Longitud:", String(textResponse || "").length);
    const cleanJson = String(textResponse || "")
      .replace(/^```json/m, "")
      .replace(/^```/m, "")
      .replace(/```$/m, "")
      .trim();
    let parsed = null;
    try {
      parsed = JSON.parse(cleanJson);
    } catch (error) {
      console.error("Error parseando JSON de Gemini:", error?.message || error);
      try {
        // Fallback de compatibilidad por si llega con fences/cabeceras no estándar.
        parsed = safeJsonParse(textResponse);
      } catch {
        parsed = null;
      }
    }
    if (!parsed) {
      return res.status(502).json({
        error: "Gemini devolvió una respuesta no parseable como JSON.",
        fallback: true
      });
    }

    console.log(
      "Haciendo merge del scope:",
      scope,
      "Claves recibidas de Gemini:",
      Object.keys(ensureObject(parsed))
    );

    const data = mergePlannerByScope({
      generated: parsed,
      currentPlan,
      scope
    });
    return res.json({
      data,
      meta: {
        provider: "google-gemini",
        model: "gemini-2.5-flash",
        scope: normalizeText(scope, "all"),
        locale
      }
    });
  } catch (error) {
    console.error("[ai/planner] Error no controlado en endpoint /planner:");
    console.error(error);
    return res.status(500).json({
      error: `Error generando plan con Gemini: ${String(error?.message || "unknown error")}`,
      fallback: true
    });
  }
});

router.post("/icebreaker", async (req, res) => {
  console.log("--- NUEVA PETICIÓN IA / ICEBREAKER ---");
  console.log("GEMINI_API_KEY configurada:", process.env.GEMINI_API_KEY ? "SÍ" : "NO");

  const apiKey = String(process.env.GEMINI_API_KEY || "").trim();
  if (!apiKey) {
    return res.status(503).json({
      error: "GEMINI_API_KEY no configurada en backend/.env"
    });
  }

  const requestPayload = ensureObject(req.body);
  const eventContext = ensureObject(requestPayload.eventContext);
  const locale = normalizeLocale(
    requestPayload.locale || eventContext.locale || req.headers["accept-language"],
    "es"
  );

  try {
    const client = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
    const userPayload = {
      locale,
      eventContext
    };

    let response;
    try {
      console.log("Iniciando llamada a Gemini (icebreaker)...");
      response = await withTimeout(
        client.models.generateContent({
          model: "gemini-2.5-flash",
          contents: [
            {
              role: "user",
              parts: [
                {
                  text: `INPUT_JSON:\n${JSON.stringify(userPayload, null, 2)}`
                }
              ]
            }
          ],
          config: {
            responseMimeType: "application/json",
            systemInstruction: buildIcebreakerSystemPrompt({ locale, eventContext }),
            temperature: 0.7
          }
        }),
        Number(process.env.GEMINI_TIMEOUT_MS || 60000),
        "Gemini icebreaker request timeout"
      );
      console.log("Llamada a Gemini (icebreaker) completada.");
    } catch (error) {
      console.error("[ai/icebreaker] Error durante llamada a Gemini:");
      console.error(error);
      return res.status(500).json({
        error: String(error?.message || "Error desconocido en llamada a Gemini"),
        fallback: true
      });
    }

    const textResponse = getResponseText(response);
    console.log("Respuesta bruta icebreaker. Longitud:", String(textResponse || "").length);
    const cleanJson = String(textResponse || "")
      .replace(/^```json/m, "")
      .replace(/^```/m, "")
      .replace(/```$/m, "")
      .trim();

    let parsed = null;
    try {
      parsed = JSON.parse(cleanJson);
    } catch (error) {
      console.error("Error parseando JSON de Gemini (icebreaker):", error?.message || error);
      try {
        parsed = safeJsonParse(textResponse);
      } catch {
        parsed = null;
      }
    }

    if (!parsed) {
      return res.status(502).json({
        error: "Gemini devolvió una respuesta no parseable como JSON en icebreaker.",
        fallback: true
      });
    }

    return res.json({
      data: sanitizeIcebreakerResponse(parsed),
      meta: {
        provider: "google-gemini",
        model: "gemini-2.5-flash",
        locale
      }
    });
  } catch (error) {
    console.error("[ai/icebreaker] Error no controlado en endpoint /icebreaker:");
    console.error(error);
    return res.status(500).json({
      error: `Error generando rompehielos con Gemini: ${String(error?.message || "unknown error")}`,
      fallback: true
    });
  }
});

export { router as aiPlannerRoute };
