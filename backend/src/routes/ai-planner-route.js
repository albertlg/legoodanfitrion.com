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

const PROFESSIONAL_EVENT_TYPES = new Set([
  "networking",
  "team_building",
  "corporate_dinner",
  "all_hands",
  "business_meeting",
  "conference"
]);

const PROFESSIONAL_TEMPLATE_KEYS = new Set([
  "team_building",
  "all_hands",
  "corporate_dinner"
]);

// Maps a guest question intent to a specific playbook action for the AI
const INTENT_ACTIONS = {
  date: "Confirmación de fecha/hora: Añade una entrada en playbook.messages con título 'Fecha y hora del evento' confirmando el día, hora de inicio y hora aproximada de fin.",
  location: "Instrucciones de llegada: Añade una entrada en playbook.messages con título 'Cómo llegar' con la dirección completa, referencias visuales del lugar, transporte público cercano y opciones de aparcamiento. Añade también el riesgo 'Posible confusión sobre cómo llegar' en playbook.risks.",
  menu: "Información del menú: Añade una entrada en playbook.messages con título 'Qué vamos a comer y beber' describiendo las opciones de comida y bebida, con mención especial a las alternativas para dietas especiales presentes en el grupo.",
  dress_code: "Código de vestimenta: Añade una entrada en playbook.messages con título 'Cómo venir vestido/a' aclarando el dress code con ejemplos concretos de qué llevar y qué evitar.",
  timeline: "Programa del evento: Añade una entrada en playbook.messages con título 'Programa del evento' con el orden del día, actividades principales y horarios orientativos.",
  ambience: "Atmósfera del evento: Añade una entrada en playbook.messages con título 'Ambiente y temática' describiendo el estilo visual, decoración y ambiente musical previsto.",
  host_notes: "Indicaciones del anfitrión: Añade una entrada en playbook.messages con título 'Indicaciones importantes' con las instrucciones clave para los asistentes (dónde aparcar, qué traer, qué no traer).",
  unknown: "Información general: Añade una entrada en playbook.messages con título 'Información del evento' con un resumen de los datos esenciales para resolver las dudas más frecuentes."
};

function detectProfessionalContext(eventPayload) {
  const eventType = String(eventPayload?.eventType || eventPayload?.event_type || "").trim().toLowerCase();
  const templateKey = String(
    eventPayload?.templateKey ||
    eventPayload?.template_key ||
    eventPayload?.templateId ||
    eventPayload?.template_id ||
    ""
  ).trim().toLowerCase();
  return PROFESSIONAL_EVENT_TYPES.has(eventType) || PROFESSIONAL_TEMPLATE_KEYS.has(templateKey);
}

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

function buildSystemPrompt({ locale = "es", scope = "all", eventContext = {}, activeModules = {}, insightSignals = {} } = {}) {
  const safeLocale = normalizeLocale(locale, "es");
  const safeScope = normalizeScope(scope, "all");
  const safeEventContext = ensureObject(eventContext);
  const safeEvent = ensureObject(safeEventContext.event);
  const safeActiveModules = ensureObject(activeModules);
  const { startAt, endAt, isMultiDay, isTbd, hasEventDate } = extractEventScheduleContext(safeEventContext);

  const confirmedCount = Number(safeEventContext.statusCounts?.yes || 0);
  const guestCount = safeEventContext.guests?.length || (confirmedCount > 0 ? confirmedCount : "un número no especificado de");

  const isProfessional = detectProfessionalContext(safeEvent);

  // VENUE DETECTION: event at restaurant, hotel, bar, catering space, etc.
  const venueSearchText = [
    normalizeText(safeEvent.locationName || safeEvent.location_name || ""),
    normalizeText(safeEvent.locationAddress || safeEvent.location_address || ""),
    normalizeText(safeEvent.description || "")
  ].join(" ").toLowerCase();
  const isHostedAtVenue = /restaur|hotel|bar\b|cafeter|bistro|catering|sala\s|trattoria|osteria|brasserie|bodega|pub\b|taberna|fond[ao]|mes[oó]n|local\s|chiringuito|terraza/i.test(venueSearchText);
  const venueName = normalizeText(safeEvent.locationName || safeEvent.location_name || safeEvent.locationAddress || safeEvent.location_address || "");

  // PERSONA: Senior Executive Planner (B2B) vs Head Event Planner & Chef (B2C)
  const persona = isProfessional
    ? [
        "Eres el 'Senior Executive Event Planner' de LeGoodAnfitrión, especializado en eventos corporativos y B2B de alto nivel.",
        "Tu enfoque prioriza: logística impecable, puntualidad estricta, networking estructurado y la imagen profesional de la organización.",
        "Tu tono es ejecutivo, sofisticado y directo. Piensas en agenda, productividad del evento y experiencia del asistente. Evita lo frívolo o excesivamente informal."
      ].join(" ")
    : [
        "Eres el 'Head Event Planner' y 'Chef Privado' de élite de LeGoodAnfitrión.",
        "Tienes 15 años de experiencia organizando desde cenas íntimas de lujo hasta bodas y eventos sociales multitudinarios.",
        "Tu tono es empático, cercano y sofisticado. Eres el mejor amigo experto del anfitrión."
      ].join(" ");

  // RSVP SIGNALS: extract friction and desire signals from guest notes
  const guestRsvpSignals = normalizeArray(safeEventContext.guestRsvpSignals);
  const rsvpNotes = guestRsvpSignals
    .map((sig) => normalizeText(ensureObject(sig).note))
    .filter(Boolean)
    .slice(0, 10);

  const rsvpSignalsBlock = rsvpNotes.length > 0
    ? [
        `VOZ DE LOS INVITADOS (${rsvpNotes.length} notas RSVP confirmadas):`,
        `"${rsvpNotes.join('" | "')}"`,
        "INSTRUCCIÓN CRÍTICA: Analiza estas notas y extrae dos tipos de señales:",
        "• FRICCIONES (llegadas tarde, restricciones, necesidades especiales, problemas logísticos) → Refléjalas en playbook.risks y playbook.timeline con soluciones concretas.",
        "• DESEOS Y EXPECTATIVAS (ganas de bailar, expectativas de celebración, peticiones especiales) → Refléjalos en playbook.ambience, playbook.conversation y playbook.messages.",
        "Estas notas son información privilegiada. Personaliza el plan al máximo con ellas."
      ].join("\n")
    : "";

  // INSIGHT SIGNALS: recurring guest questions that need specific playbook actions
  const safeInsightSignals = ensureObject(insightSignals);
  const signalEntries = Object.entries(safeInsightSignals)
    .map(([intent, count]) => [intent, Number(count)])
    .filter(([, count]) => count >= 2)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 6);

  const insightSignalsBlock = signalEntries.length > 0
    ? [
        "⚠ SEÑALES PRIORITARIAS: DUDAS RECURRENTES DE LOS INVITADOS SIN RESOLVER",
        "Los invitados han hecho las siguientes preguntas de forma repetida y AÚN NO HAN SIDO RESPONDIDAS en el plan.",
        "INSTRUCCIÓN CRÍTICA: Para cada señal, DEBES generar una entrada en playbook.messages. Estas acciones son OBLIGATORIAS y tienen PRIORIDAD MÁXIMA sobre cualquier otro mensaje:",
        signalEntries
          .map(([intent, count]) => `• ${(INTENT_ACTIONS[intent] || INTENT_ACTIONS.unknown).replace(/^([^:]+):/, `[×${count} preguntas] $1:`)}`)
          .join("\n")
      ].join("\n")
    : "";

  // MODULE-AWARE RULES: adapt advice based on active modules
  const moduleRules = [];
  if (safeActiveModules.finance) {
    moduleRules.push("• FINANZAS ACTIVO: En shoppingList.estimatedCostRange sé preciso con los rangos. En playbook.actionableItems incluye al menos 1 consejo de optimización de costes.");
  }
  if (safeActiveModules.spotify) {
    moduleRules.push("• SPOTIFY ACTIVO: El anfitrión tiene playlist vinculada. En playbook.ambience coordina el estilo musical con el ambiente general y referencia la playlist como parte integral del plan.");
  }
  if (safeActiveModules.meals) {
    const mealVotes = normalizeArray(safeEventContext.insights?.mealVotes);
    const hasMealVotes = mealVotes.length > 0;
    moduleRules.push(
      isHostedAtVenue
        ? hasMealVotes
          ? `• MÓDULO DE MENÚS ACTIVO (LOCAL EXTERNO, ${mealVotes.length} PLATOS VOTADOS): Los invitados han votado platos específicos. Están en \`insights.mealVotes\` del INPUT_JSON (campos: label, courseKey, courseLabel, votes). PRIORIDAD MÁXIMA: El mealPlan DEBE construirse alrededor de estos platos votados. Úsalos como la base de lo que el grupo quiere pedir en el local (los más votados primero en su sección). Adapta las notas al chef para solicitar exactamente estos platos o los más similares del menú, respetando siempre las restricciones del grupo.`
          : "• MÓDULO DE MENÚS ACTIVO (LOCAL EXTERNO): Los invitados han expresado preferencias de comida. Encuéntralas en `insights.foodSuggestions` e `insights.drinkSuggestions` del INPUT_JSON. Úsalas para identificar qué platos y bebidas del local encajan mejor con el grupo y cuáles evitar por restricciones. No sugieras cocinar."
        : hasMealVotes
          ? `• MÓDULO DE MENÚS ACTIVO (${mealVotes.length} PLATOS VOTADOS): Los invitados han votado platos específicos. Están en \`insights.mealVotes\` del INPUT_JSON (campos: label, courseKey, courseLabel, votes). PRIORIDAD MÁXIMA: El mealPlan DEBE construirse con estos platos votados — no los sustituyas por otros genéricos. Los más votados van primero en su sección (courseKey). Puedes sugerir cómo prepararlos, maridajes o complementos, pero los platos votados son los platos del menú.`
          : "• MÓDULO DE MENÚS ACTIVO: Los invitados han votado preferencias de menú. Encuéntralas en `insights.foodSuggestions` e `insights.drinkSuggestions` del INPUT_JSON. Son el dato de mayor prioridad para el mealPlan: basa los platos directamente en estas preferencias, no las trates como sugerencias opcionales."
    );
  }
  if (safeActiveModules.spaces) {
    moduleRules.push("• MÓDULO DE ESPACIOS ACTIVO: Hay asignación de asientos/zonas en marcha. En playbook.timeline incluye tiempo explícito de configuración y disposición del espacio.");
  }
  const modulesBlock = moduleRules.length > 0
    ? `MÓDULOS ACTIVOS DEL EVENTO:\n${moduleRules.join("\n")}`
    : "";

  // VENUE BLOCK: overrides menu and shopping rules for hosted-at-venue events
  const mealVotesForVenue = normalizeArray(safeEventContext.insights?.mealVotes);
  const hasMealVotesForVenue = mealVotesForVenue.length > 0;
  const venueBlock = isHostedAtVenue
    ? [
        `⚠ CONTEXTO ESPECIAL: EVENTO EN LOCAL DE HOSTELERÍA`,
        `El evento se celebra en "${venueName}", un espacio externo (restaurante, hotel, bar u otro local).`,
        `Las reglas 2 y 3 generales quedan ANULADAS y sustituidas por estas instrucciones de obligado cumplimiento:`,
        hasMealVotesForVenue
          ? `• MENÚ (mealPlan): NO propongas recetas caseras. Los invitados ya han votado ${mealVotesForVenue.length} platos específicos que quieren pedir (ver \`insights.mealVotes\` en el INPUT_JSON). El mealPlan DEBE construirse alrededor de esos platos votados — agrúpalos por su courseKey ("starter", "main", "dessert", "drink", etc.), pon los más votados primero, y añade notas al chef sobre restricciones. Complementa con sugerencias de maridaje o acompañamientos si falta alguna sección.`
          : `• MENÚ (mealPlan): NO propongas recetas caseras ni platos para cocinar en casa. El mealPlan debe reflejar QUÉ PEDIR O SOLICITAR en el local, adaptado a las restricciones y gustos del grupo (usa insights.foodSuggestions e insights.drinkSuggestions del INPUT_JSON). Titula las secciones como "Entrantes a solicitar", "Principales recomendados", "Maridaje sugerido", etc. Si no conoces el menú exacto del local, propón opciones de platos coherentes con el tipo de establecimiento y el perfil del grupo.`,
        `• LISTA DE COORDINACIÓN (shoppingList): NO incluyas ingredientes de supermercado. Genera una "Lista de coordinación con el local" cuyos grupos sean: (a) "Restricciones a comunicar al restaurante" — lista las alergias/intolerancias del grupo que el local debe conocer, (b) "Extras a llevar si está permitido" — vino especial, tarta, decoración, etc., (c) "Confirmaciones pendientes" — menú, alérgenos, distribución de mesas, señal o pago anticipado. Adapta el estimatedCostRange al coste por persona estimado en este tipo de local.`
      ].join("\n")
    : "";

  // PROFESSIONAL-SPECIFIC RULES (only for B2B events)
  const professionalBlock = isProfessional
    ? [
        "REGLAS ADICIONALES PARA EVENTO CORPORATIVO/B2B:",
        "P1) AGENDA EJECUTIVA: El playbook.timeline debe incluir horarios precisos con buffers explícitos entre actividades. Los retrasos en eventos B2B tienen coste real para la organización.",
        "P2) NETWORKING ESTRUCTURADO: En playbook.conversation, propón dinámicas de networking concretas (speed networking, mesas temáticas, introductions estructuradas), no solo temas de charla.",
        "P3) CATERING EJECUTIVO: El mealPlan debe ser adecuado para entorno profesional: finger foods, opciones que no requieran cubiertos mientras se hace networking, sin alcohol si es contexto all_hands.",
        "P4) IMAGEN CORPORATIVA: En playbook.ambience prioriza coherencia visual, señalización clara y branding. Sugiere elementos de imagen de marca cuando sea relevante.",
        "P5) RIESGOS B2B: En playbook.risks incluye riesgos específicos del entorno profesional: no-shows de ejecutivos, fallos técnicos AV/proyector, gestión de VIPs y protocolos de empresa."
      ].join("\n")
    : "";

  // SCHEDULE GUARDRAIL
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
    persona,
    "Tu tarea es devolver SOLO JSON válido, sin markdown, sin bloques ```.",
    `IMPORTANT: All text fields in the output JSON MUST be written in the language corresponding to the locale code: ${safeLocale}.`,
    "Debes responder EXACTAMENTE con esta estructura y claves:",
    JSON.stringify(PLANNER_RESPONSE_EXAMPLE, null, 2),
    insightSignalsBlock,
    rsvpSignalsBlock,
    modulesBlock,
    venueBlock,
    professionalBlock,
    "REGLAS OBLIGATORIAS Y METODOLOGÍA:",
    isProfessional
      ? "1) TONO EJECUTIVO: Usa un tono profesional, directo y sofisticado. Evita el masculino genérico. Prioriza claridad, eficiencia y relevancia para el entorno de empresa."
      : "1) LENGUAJE INCLUSIVO Y CÁLIDO: Usa siempre un tono empático, cercano pero sofisticado. Evita el masculino genérico (ej: en vez de 'bienvenidos los invitados', usa 'te damos la bienvenida' o 'quienes asistan'). Escribe como si fueras su mejor amigo y asesor experto.",
    isHostedAtVenue
      ? "2) MENÚ EN LOCAL: Ver instrucciones del bloque CONTEXTO ESPECIAL arriba. No propongas recetas caseras."
      : "2) MENÚS CON SENTIDO: Diseña el 'mealPlan' pensando en la armonía de sabores, la temporada y la viabilidad para el anfitrión. No sugieras platos que requieran estar en la cocina mientras la gente disfruta.",
    isHostedAtVenue
      ? "3) LISTA DE COORDINACIÓN: Ver instrucciones del bloque CONTEXTO ESPECIAL arriba. No incluyas ingredientes de supermercado."
      : `3) LISTA DE LA COMPRA REALISTA: Calcula cantidades estimadas basándote en que es un evento para ${guestCount} personas. Agrupa los ingredientes por pasillos del supermercado lógico (ej: Frescos, Carnicería, Despensa, Bebidas).`,
    isProfessional
      ? "4) TIMELINE CORPORATIVO: En el 'playbook.timeline', usa formato de hora estricto (HH:MM). Incluye buffers de transición, tiempos de networking estructurado y breaks explícitos."
      : "4) TIMELINE PROFESIONAL (T-MINUS): En el 'playbook.timeline', usa el framework de Wedding Planners. Ej: 'T-1 Semana', 'T-24h', 'T-2h (Ice & Chill)', 'H-0 (Llegada)'. Da consejos tácticos (ej: 'Saca la carne de la nevera 1h antes').",
    "5) AMBIENTACIÓN MULTISENSORIAL: En 'playbook.ambience', no digas solo 'Pon luces'. Sugiere una atmósfera completa: tipo de iluminación, estilo exacto de playlist musical (ej: 'Bossa nova de fondo a volumen conversacional') y aromas (ej: 'Velas sin olor cerca de la comida').",
    "6) GESTIÓN DE RIESGOS ESTRICTA: Respeta estrictamente alergias, intolerancias y afecciones de INPUT_JSON. NUNCA sugieras un ingrediente prohibido. Si hay alergias críticas, añade advertencias de contaminación cruzada explícitas en 'risks' y 'shoppingList warnings'.",
    scheduleGuardrail || "7) TEMPORALIDAD: Como no hay fecha exacta, sugiere opciones atemporales y versátiles.",
    hasEventDate && !isTbd
      ? `8) FECHA DEL EVENTO: El evento comienza el ${startAt}. Adapta el menú y el plan B a la estación del año correspondiente.`
      : "8) Si no hay fecha cerrada, evita referencias temporales rígidas.",
    "9) RIESGOS Y PLAN B: En 'playbook.risks', anticipa problemas reales y da soluciones de experto. 'level' debe ser: yes | no | maybe | pending.",
    "10) No añadas claves fuera del esquema especificado. Si faltan datos, aplica tu experiencia para proponer la opción más elegante y segura.",
    scopeRule
  ].filter(Boolean).join("\n");
}

function buildIcebreakerSystemPrompt({ locale = "es", eventContext = {}, guestRsvpSignals = [] } = {}) {
  const safeLocale = normalizeLocale(locale, "es");
  const safeEventContext = ensureObject(eventContext);
  const safeEvent = ensureObject(safeEventContext.event);
  const { isMultiDay } = extractEventScheduleContext(safeEventContext);
  const title = normalizeText(safeEvent.title || "encuentro social");
  const description = normalizeText(safeEvent.description || "un encuentro para disfrutar");

  const isProfessional = detectProfessionalContext(safeEvent);

  // Build guest profile from RSVP signals
  const safeSignals = normalizeArray(guestRsvpSignals);
  const guestNotes = safeSignals
    .map((sig) => normalizeText(ensureObject(sig).note))
    .filter(Boolean)
    .slice(0, 8);
  const dietaryDiversity = [...new Set(
    safeSignals
      .flatMap((sig) => normalizeArray(ensureObject(sig).dietaryNeeds))
      .map((need) => normalizeText(need))
      .filter(Boolean)
  )].slice(0, 6);
  const hasPlusOnes = safeSignals.some((sig) => Boolean(ensureObject(sig).plusOne));

  const guestContextBlock = guestNotes.length > 0
    ? [
        `PERFIL REAL DE LOS INVITADOS (${safeSignals.length} RSVPs recibidos):`,
        `Notas libres: "${guestNotes.join('" | "')}"`,
        dietaryDiversity.length > 0 ? `Perfil dietético del grupo: ${dietaryDiversity.join(", ")}` : "",
        hasPlusOnes ? "Hay invitados que vienen con acompañante (hay parejas en el grupo)." : "",
        "INSTRUCCIÓN: Usa estos datos para personalizar las dinámicas. Detecta patrones (viajeros, parejas, entusiastas de la música, personas con expectativas altas) y refléjalos en el badJoke, conversationTopics y quickGameIdea."
      ].filter(Boolean).join("\n")
    : "";

  return [
    isProfessional
      ? "Eres el 'Facilitador de Dinámicas Corporativas' de LeGoodAnfitrión, experto en engagement, team building y conexiones profesionales de alto nivel."
      : "Eres el 'Maestro de Ceremonias' experto en dinámicas sociales de LeGoodAnfitrión.",
    isProfessional
      ? "Tu objetivo es crear conexiones profesionales genuinas entre los asistentes de forma estructurada, elegante y con un punto de humor ejecutivo, sin que se sienta una actividad obligatoria."
      : "Tu objetivo es crear conexiones genuinas entre las personas de forma natural, elegante y divertida, sin que se sienta forzado.",
    "Devuelve SOLO JSON válido, sin markdown y sin bloques ```.",
    `IMPORTANT: All text fields in the output JSON MUST be written in the language corresponding to the locale code: ${safeLocale}.`,
    "Debes responder EXACTAMENTE con esta estructura y claves:",
    JSON.stringify(ICEBREAKER_RESPONSE_EXAMPLE, null, 2),
    guestContextBlock,
    "REGLAS OBLIGATORIAS:",
    `1) CONTEXTO CRÍTICO: Adapta completamente el tono al evento -> Título: "${title}", Descripción: "${description}". ${isProfessional ? "Es un evento corporativo/profesional: sé elegante, ingenioso y profesional. Nada demasiado informal." : "Si parece formal, sé elegante e ingenioso. Si parece casual, sé divertido y fresco."}`,
    "2) LENGUAJE INCLUSIVO Y CÁLIDO: Evita el masculino genérico. Usa fórmulas que integren a todo el grupo por igual. Mantén frases cortas, pensadas para leerse rápidamente en un móvil.",
    isProfessional
      ? "3) ICEBREAKER (badJoke): Usa una anécdota corta e irónica sobre reuniones de empresa, presentaciones que salen mal o la vida de oficina. Que provoque complicidad y sonrisas, no vergüenza ajena."
      : "3) ICEBREAKER (badJoke): No tiene que ser un 'chiste malo' literal. Puede ser una anécdota corta, irónica y muy identificable sobre ser anfitrión o asistir a eventos, que sirva para que todos sonrían al llegar.",
    isProfessional
      ? "4) TEMAS DE CONVERSACIÓN: Propón 2 thought-starters que inviten a compartir experiencias profesionales interesantes o dilemas del trabajo de forma amena, sin convertirse en una entrevista de trabajo."
      : "4) TEMAS DE CONVERSACIÓN: Propón 2 temas que provoquen debate ameno o historias personales interesantes. Evita temas básicos ('qué tal el clima'). Busca 'thought-starters' creativos.",
    isProfessional
      ? "5) DINÁMICA RÁPIDA (quickGameIdea): Propón 1 dinámica de máximo 5 minutos orientada a team building. Sin materiales, inclusiva, que funcione con personas que no se conocen y pueda hacerse de pie."
      : "5) DINÁMICA RÁPIDA (quickGameIdea): Propón 1 dinámica de máximo 5 minutos. Debe ser 'Low Friction' (baja vergüenza, sin materiales, que se pueda jugar con una copa en la mano).",
    isMultiDay
      ? '6) ATENCIÓN: Al ser una escapada de varios días, en tus sugerencias prioriza incluir al menos un "juego de fondo" o reto continuo que los invitados puedan jugar a lo largo de toda la convivencia (ej: el asesino, roles secretos), además de juegos puntuales.'
      : "6) Evita temas divisorios (política, religión) o juegos invasivos.",
    "7) Evita temas divisorios (política, religión) o juegos invasivos."
  ].filter(Boolean).join("\n");
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
  const activeModules = ensureObject(requestPayload.activeModules || eventContext.activeModules);
  const insightSignals = ensureObject(requestPayload.insightSignals || eventContext.insightSignals);

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
            systemInstruction: buildSystemPrompt({ locale, scope, eventContext, activeModules, insightSignals }),
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
  const guestRsvpSignals = normalizeArray(requestPayload.guestRsvpSignals || eventContext.guestRsvpSignals);

  try {
    const client = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
    const userPayload = {
      locale,
      eventContext,
      guestRsvpSignals
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
            systemInstruction: buildIcebreakerSystemPrompt({ locale, eventContext, guestRsvpSignals }),
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
