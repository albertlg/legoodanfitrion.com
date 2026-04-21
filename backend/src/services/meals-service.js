import { createClient } from "@supabase/supabase-js";

let supabaseAdminClient = null;
const DEFAULT_MEALS_COURSE_KEY = "general";

function toSafeString(value) {
  return String(value || "").trim();
}

function toNullableString(value) {
  const normalized = toSafeString(value);
  return normalized || null;
}

function normalizeCourseKey(value, fallback = DEFAULT_MEALS_COURSE_KEY) {
  const normalized = toSafeString(value)
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s_-]/gu, "")
    .replace(/[\s-]+/g, "_")
    .replace(/_+/g, "_")
    .replace(/^_+|_+$/g, "");
  return normalized || fallback;
}

function normalizeCourseLabel(value) {
  return toNullableString(value);
}

function getSupabaseAdminClient() {
  if (supabaseAdminClient) {
    return supabaseAdminClient;
  }

  const supabaseUrl = toSafeString(process.env.SUPABASE_URL);
  const serviceRoleKey = toSafeString(process.env.SUPABASE_SERVICE_ROLE_KEY);
  if (!supabaseUrl || !serviceRoleKey) {
    const error = new Error("SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY son obligatorias.");
    error.code = "MEALS_CONFIG_ERROR";
    throw error;
  }

  supabaseAdminClient = createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  });

  return supabaseAdminClient;
}

async function assertEventEditorAccess(eventId, requesterUserId) {
  const supabase = getSupabaseAdminClient();
  const normalizedEventId = toSafeString(eventId);
  const normalizedRequesterId = toSafeString(requesterUserId);
  if (!normalizedEventId || !normalizedRequesterId) {
    const error = new Error("eventId y requesterUserId son obligatorios.");
    error.code = "MEALS_BAD_REQUEST";
    throw error;
  }

  const { data: eventData, error: eventError } = await supabase
    .from("events")
    .select("id, host_user_id")
    .eq("id", normalizedEventId)
    .maybeSingle();

  if (eventError) {
    const wrapped = new Error(`No se pudo validar el evento: ${eventError.message}`);
    wrapped.code = "MEALS_DB_ERROR";
    wrapped.details = eventError;
    throw wrapped;
  }

  if (!eventData?.id) {
    const error = new Error("Evento no encontrado.");
    error.code = "MEALS_EVENT_NOT_FOUND";
    throw error;
  }

  const ownerId = toSafeString(eventData.host_user_id);
  if (ownerId === normalizedRequesterId) {
    return {
      eventId: normalizedEventId,
      ownerUserId: ownerId
    };
  }

  const { count, error: cohostError } = await supabase
    .from("event_cohosts")
    .select("id", { count: "exact", head: true })
    .eq("event_id", normalizedEventId)
    .eq("host_id", normalizedRequesterId);

  if (cohostError) {
    const wrapped = new Error(`No se pudo validar acceso de co-anfitrión: ${cohostError.message}`);
    wrapped.code = "MEALS_DB_ERROR";
    wrapped.details = cohostError;
    throw wrapped;
  }

  if (!count) {
    const error = new Error("No tienes permisos para gestionar menús de este evento.");
    error.code = "MEALS_FORBIDDEN";
    throw error;
  }

  return {
    eventId: normalizedEventId,
    ownerUserId: ownerId
  };
}

async function getMealOptionById(optionId) {
  const supabase = getSupabaseAdminClient();
  const normalizedOptionId = toSafeString(optionId);
  if (!normalizedOptionId) {
    const error = new Error("optionId es obligatorio.");
    error.code = "MEALS_BAD_REQUEST";
    throw error;
  }

  const { data, error } = await supabase
    .from("event_meal_options")
    .select("id, event_id, host_user_id, course_key, course_label, label, description, created_at, updated_at")
    .eq("id", normalizedOptionId)
    .maybeSingle();

  if (error) {
    const wrapped = new Error(`No se pudo cargar la opción de menú: ${error.message}`);
    wrapped.code = "MEALS_DB_ERROR";
    wrapped.details = error;
    throw wrapped;
  }

  if (!data?.id) {
    const wrapped = new Error("Opción de menú no encontrada.");
    wrapped.code = "MEALS_NOT_FOUND";
    throw wrapped;
  }

  return data;
}

async function assertGuestConfirmedForEvent(eventId, hostUserId, guestId) {
  const normalizedGuestId = toSafeString(guestId);
  if (!normalizedGuestId) {
    const error = new Error("guestId es obligatorio.");
    error.code = "MEALS_BAD_REQUEST";
    throw error;
  }

  const supabase = getSupabaseAdminClient();
  const { data, error } = await supabase
    .from("invitations")
    .select("id, status")
    .eq("event_id", toSafeString(eventId))
    .eq("host_user_id", toSafeString(hostUserId))
    .eq("guest_id", normalizedGuestId)
    .maybeSingle();

  if (error) {
    const wrapped = new Error(`No se pudo validar la persona invitada: ${error.message}`);
    wrapped.code = "MEALS_DB_ERROR";
    wrapped.details = error;
    throw wrapped;
  }

  if (!data?.id) {
    const wrapped = new Error("La persona invitada no pertenece a este evento.");
    wrapped.code = "MEALS_BAD_REQUEST";
    throw wrapped;
  }

  if (toSafeString(data.status).toLowerCase() !== "yes") {
    const wrapped = new Error("Solo se pueden registrar elecciones de invitaciones confirmadas.");
    wrapped.code = "MEALS_BAD_REQUEST";
    throw wrapped;
  }
}

function sanitizeMealOptionPayload(input, { mode = "create" } = {}) {
  const raw = input && typeof input === "object" ? input : {};
  const payload = {};

  if (mode === "create" || Object.prototype.hasOwnProperty.call(raw, "label")) {
    const label = toSafeString(raw.label);
    if (!label) {
      const error = new Error("El nombre del menú/plato es obligatorio.");
      error.code = "MEALS_BAD_REQUEST";
      throw error;
    }
    payload.label = label;
  }

  if (mode === "create" || Object.prototype.hasOwnProperty.call(raw, "description")) {
    payload.description = toNullableString(raw.description);
  }

  if (
    mode === "create" ||
    Object.prototype.hasOwnProperty.call(raw, "courseKey") ||
    Object.prototype.hasOwnProperty.call(raw, "course_key")
  ) {
    payload.course_key = normalizeCourseKey(raw.courseKey || raw.course_key);
  }

  if (
    mode === "create" ||
    Object.prototype.hasOwnProperty.call(raw, "courseLabel") ||
    Object.prototype.hasOwnProperty.call(raw, "course_label")
  ) {
    payload.course_label = normalizeCourseLabel(raw.courseLabel || raw.course_label);
  }

  return payload;
}

async function resolveInvitationByToken(token) {
  const supabase = getSupabaseAdminClient();
  const normalizedToken = toSafeString(token);
  if (!normalizedToken) {
    const error = new Error("token es obligatorio.");
    error.code = "MEALS_BAD_REQUEST";
    throw error;
  }

  const { data, error } = await supabase
    .from("invitations")
    .select("id, event_id, host_user_id, guest_id, status, public_token")
    .eq("public_token", normalizedToken)
    .maybeSingle();

  if (error) {
    const wrapped = new Error(`No se pudo resolver la invitación: ${error.message}`);
    wrapped.code = "MEALS_DB_ERROR";
    wrapped.details = error;
    throw wrapped;
  }

  if (!data?.id) {
    const wrapped = new Error("Invitación no encontrada para este token.");
    wrapped.code = "MEALS_NOT_FOUND";
    throw wrapped;
  }

  if (!toSafeString(data.guest_id)) {
    const wrapped = new Error("La invitación no tiene una persona invitada vinculada.");
    wrapped.code = "MEALS_BAD_REQUEST";
    throw wrapped;
  }

  return data;
}

function normalizeIncomingPublicSelections(input) {
  const raw = input && typeof input === "object" ? input : {};
  const rawSelections = raw.selections;
  const rows = [];

  if (Array.isArray(rawSelections)) {
    for (const item of rawSelections) {
      rows.push({
        courseKey: normalizeCourseKey(item?.courseKey || item?.course_key),
        optionId: toNullableString(item?.optionId || item?.option_id)
      });
    }
  } else if (rawSelections && typeof rawSelections === "object") {
    for (const [courseKey, optionId] of Object.entries(rawSelections)) {
      rows.push({
        courseKey: normalizeCourseKey(courseKey),
        optionId: toNullableString(optionId)
      });
    }
  } else if (Object.prototype.hasOwnProperty.call(raw, "optionId") || Object.prototype.hasOwnProperty.call(raw, "option_id")) {
    rows.push({
      courseKey: normalizeCourseKey(raw.courseKey || raw.course_key),
      optionId: toNullableString(raw.optionId || raw.option_id)
    });
  }

  const deduplicated = new Map();
  for (const row of rows) {
    if (!row?.courseKey) {
      continue;
    }
    deduplicated.set(row.courseKey, {
      courseKey: row.courseKey,
      optionId: row.optionId
    });
  }

  return Array.from(deduplicated.values());
}

export async function listEventMealsState(eventId, requesterUserId) {
  const access = await assertEventEditorAccess(eventId, requesterUserId);
  const supabase = getSupabaseAdminClient();

  const [optionsResult, selectionsResult] = await Promise.all([
    supabase
      .from("event_meal_options")
      .select("id, event_id, host_user_id, course_key, course_label, label, description, created_at, updated_at")
      .eq("event_id", access.eventId)
      .order("course_key", { ascending: true })
      .order("created_at", { ascending: true }),
    supabase
      .from("event_meal_selections")
      .select("id, event_id, host_user_id, option_id, guest_id, course_key, created_at, updated_at")
      .eq("event_id", access.eventId)
      .order("course_key", { ascending: true })
      .order("updated_at", { ascending: false })
  ]);

  if (optionsResult.error) {
    const wrapped = new Error(`No se pudieron cargar las opciones de menú: ${optionsResult.error.message}`);
    wrapped.code = "MEALS_DB_ERROR";
    wrapped.details = optionsResult.error;
    throw wrapped;
  }

  if (selectionsResult.error) {
    const wrapped = new Error(`No se pudieron cargar las elecciones de menú: ${selectionsResult.error.message}`);
    wrapped.code = "MEALS_DB_ERROR";
    wrapped.details = selectionsResult.error;
    throw wrapped;
  }

  return {
    options: Array.isArray(optionsResult.data) ? optionsResult.data : [],
    selections: Array.isArray(selectionsResult.data) ? selectionsResult.data : []
  };
}

export async function createMealOption(eventId, requesterUserId, input) {
  const access = await assertEventEditorAccess(eventId, requesterUserId);
  const payload = sanitizeMealOptionPayload(input, { mode: "create" });
  const supabase = getSupabaseAdminClient();

  const { data, error } = await supabase
    .from("event_meal_options")
    .insert({
      event_id: access.eventId,
      host_user_id: access.ownerUserId,
      course_key: payload.course_key,
      course_label: payload.course_label,
      label: payload.label,
      description: payload.description
    })
    .select("id, event_id, host_user_id, course_key, course_label, label, description, created_at, updated_at")
    .single();

  if (error) {
    const wrapped = new Error(`No se pudo crear la opción de menú: ${error.message}`);
    wrapped.code = "MEALS_DB_ERROR";
    wrapped.details = error;
    throw wrapped;
  }

  return data;
}

export async function updateMealOption(optionId, requesterUserId, input) {
  const currentOption = await getMealOptionById(optionId);
  await assertEventEditorAccess(currentOption.event_id, requesterUserId);
  const payload = sanitizeMealOptionPayload(input, { mode: "update" });

  if (!Object.keys(payload).length) {
    const error = new Error("No hay campos para actualizar.");
    error.code = "MEALS_BAD_REQUEST";
    throw error;
  }

  const supabase = getSupabaseAdminClient();
  const { data, error } = await supabase
    .from("event_meal_options")
    .update({
      ...(Object.prototype.hasOwnProperty.call(payload, "course_key")
        ? { course_key: payload.course_key }
        : {}),
      ...(Object.prototype.hasOwnProperty.call(payload, "course_label")
        ? { course_label: payload.course_label }
        : {}),
      ...(Object.prototype.hasOwnProperty.call(payload, "label") ? { label: payload.label } : {}),
      ...(Object.prototype.hasOwnProperty.call(payload, "description")
        ? { description: payload.description }
        : {})
    })
    .eq("id", currentOption.id)
    .eq("event_id", currentOption.event_id)
    .select("id, event_id, host_user_id, course_key, course_label, label, description, created_at, updated_at")
    .single();

  if (error) {
    const wrapped = new Error(`No se pudo actualizar la opción de menú: ${error.message}`);
    wrapped.code = "MEALS_DB_ERROR";
    wrapped.details = error;
    throw wrapped;
  }

  return data;
}

export async function deleteMealOption(optionId, requesterUserId) {
  const currentOption = await getMealOptionById(optionId);
  await assertEventEditorAccess(currentOption.event_id, requesterUserId);
  const supabase = getSupabaseAdminClient();

  const { error } = await supabase
    .from("event_meal_options")
    .delete()
    .eq("id", currentOption.id)
    .eq("event_id", currentOption.event_id);

  if (error) {
    const wrapped = new Error(`No se pudo eliminar la opción de menú: ${error.message}`);
    wrapped.code = "MEALS_DB_ERROR";
    wrapped.details = error;
    throw wrapped;
  }

  return { id: currentOption.id };
}

export async function upsertMealSelection(eventId, requesterUserId, input) {
  const access = await assertEventEditorAccess(eventId, requesterUserId);
  const guestId = toSafeString(input?.guestId || input?.guest_id);
  const optionId = toNullableString(input?.optionId || input?.option_id);
  const requestedCourseKey = normalizeCourseKey(input?.courseKey || input?.course_key);
  if (!guestId) {
    const error = new Error("guestId es obligatorio.");
    error.code = "MEALS_BAD_REQUEST";
    throw error;
  }

  await assertGuestConfirmedForEvent(access.eventId, access.ownerUserId, guestId);
  const supabase = getSupabaseAdminClient();

  if (!optionId) {
    let deleteQuery = supabase
      .from("event_meal_selections")
      .delete()
      .eq("event_id", access.eventId)
      .eq("guest_id", guestId);

    if (requestedCourseKey) {
      deleteQuery = deleteQuery.eq("course_key", requestedCourseKey);
    }

    const { error: deleteError } = await deleteQuery;

    if (deleteError) {
      const wrapped = new Error(`No se pudo limpiar la elección de menú: ${deleteError.message}`);
      wrapped.code = "MEALS_DB_ERROR";
      wrapped.details = deleteError;
      throw wrapped;
    }

    return null;
  }

  const selectedOption = await getMealOptionById(optionId);
  if (toSafeString(selectedOption.event_id) !== access.eventId) {
    const error = new Error("La opción seleccionada no pertenece a este evento.");
    error.code = "MEALS_BAD_REQUEST";
    throw error;
  }

  const resolvedCourseKey = normalizeCourseKey(selectedOption.course_key || requestedCourseKey);

  const { data, error } = await supabase
    .from("event_meal_selections")
    .upsert(
      [
        {
          event_id: access.eventId,
          host_user_id: access.ownerUserId,
          guest_id: guestId,
          course_key: resolvedCourseKey,
          option_id: optionId
        }
      ],
      { onConflict: "event_id,guest_id,course_key" }
    )
    .select("id, event_id, host_user_id, option_id, guest_id, course_key, created_at, updated_at")
    .single();

  if (error) {
    const wrapped = new Error(`No se pudo guardar la elección de menú: ${error.message}`);
    wrapped.code = "MEALS_DB_ERROR";
    wrapped.details = error;
    throw wrapped;
  }

  return data;
}

export async function listPublicMealsStateByToken(token) {
  const invitation = await resolveInvitationByToken(token);
  const supabase = getSupabaseAdminClient();

  const [optionsResult, selectionsResult] = await Promise.all([
    supabase
      .from("event_meal_options")
      .select("id, event_id, host_user_id, course_key, course_label, label, description, created_at, updated_at")
      .eq("event_id", toSafeString(invitation.event_id))
      .order("course_key", { ascending: true })
      .order("created_at", { ascending: true }),
    supabase
      .from("event_meal_selections")
      .select("id, event_id, host_user_id, option_id, guest_id, course_key, created_at, updated_at")
      .eq("event_id", toSafeString(invitation.event_id))
      .eq("guest_id", toSafeString(invitation.guest_id))
      .order("course_key", { ascending: true })
      .order("updated_at", { ascending: false })
  ]);

  if (optionsResult.error) {
    const wrapped = new Error(`No se pudieron cargar las opciones de menú: ${optionsResult.error.message}`);
    wrapped.code = "MEALS_DB_ERROR";
    wrapped.details = optionsResult.error;
    throw wrapped;
  }

  if (selectionsResult.error) {
    const wrapped = new Error(`No se pudieron cargar las elecciones de menú: ${selectionsResult.error.message}`);
    wrapped.code = "MEALS_DB_ERROR";
    wrapped.details = selectionsResult.error;
    throw wrapped;
  }

  return {
    eventId: toSafeString(invitation.event_id),
    guestId: toSafeString(invitation.guest_id),
    options: Array.isArray(optionsResult.data) ? optionsResult.data : [],
    selections: Array.isArray(selectionsResult.data) ? selectionsResult.data : []
  };
}

export async function upsertPublicMealSelectionsByToken(token, input) {
  const invitation = await resolveInvitationByToken(token);
  const eventId = toSafeString(invitation.event_id);
  const hostUserId = toSafeString(invitation.host_user_id);
  const guestId = toSafeString(invitation.guest_id);
  const normalizedSelections = normalizeIncomingPublicSelections(input);
  const supabase = getSupabaseAdminClient();

  const { data: optionsRows, error: optionsError } = await supabase
    .from("event_meal_options")
    .select("id, event_id, host_user_id, course_key")
    .eq("event_id", eventId);

  if (optionsError) {
    const wrapped = new Error(`No se pudieron validar las opciones de menú: ${optionsError.message}`);
    wrapped.code = "MEALS_DB_ERROR";
    wrapped.details = optionsError;
    throw wrapped;
  }

  const optionById = new Map();
  const availableCourseKeys = new Set();
  for (const optionRow of Array.isArray(optionsRows) ? optionsRows : []) {
    const optionId = toSafeString(optionRow?.id);
    if (!optionId) {
      continue;
    }
    const courseKey = normalizeCourseKey(optionRow?.course_key);
    optionById.set(optionId, {
      ...optionRow,
      course_key: courseKey
    });
    availableCourseKeys.add(courseKey);
  }

  const desiredByCourse = new Map();
  const coursesToClear = new Set();
  for (const row of normalizedSelections) {
    const inputCourseKey = normalizeCourseKey(row.courseKey);
    if (!row.optionId) {
      coursesToClear.add(inputCourseKey);
      continue;
    }
    const option = optionById.get(toSafeString(row.optionId));
    if (!option || toSafeString(option.event_id) !== eventId) {
      const wrapped = new Error("Hay una opción de menú inválida para esta invitación.");
      wrapped.code = "MEALS_BAD_REQUEST";
      throw wrapped;
    }
    desiredByCourse.set(option.course_key, toSafeString(option.id));
    coursesToClear.delete(option.course_key);
  }

  const courseKeysToProcess = new Set([...availableCourseKeys, ...coursesToClear, ...desiredByCourse.keys()]);

  for (const courseKey of courseKeysToProcess) {
    const desiredOptionId = desiredByCourse.get(courseKey) || null;
    if (!desiredOptionId) {
      const { error: deleteError } = await supabase
        .from("event_meal_selections")
        .delete()
        .eq("event_id", eventId)
        .eq("guest_id", guestId)
        .eq("course_key", courseKey);

      if (deleteError) {
        const wrapped = new Error(`No se pudo limpiar la selección de menú: ${deleteError.message}`);
        wrapped.code = "MEALS_DB_ERROR";
        wrapped.details = deleteError;
        throw wrapped;
      }
      continue;
    }

    const { error: upsertError } = await supabase
      .from("event_meal_selections")
      .upsert(
        [
          {
            event_id: eventId,
            host_user_id: hostUserId,
            guest_id: guestId,
            course_key: courseKey,
            option_id: desiredOptionId
          }
        ],
        { onConflict: "event_id,guest_id,course_key" }
      );

    if (upsertError) {
      const wrapped = new Error(`No se pudo guardar la selección de menú: ${upsertError.message}`);
      wrapped.code = "MEALS_DB_ERROR";
      wrapped.details = upsertError;
      throw wrapped;
    }
  }

  const { data: persistedSelections, error: persistedError } = await supabase
    .from("event_meal_selections")
    .select("id, event_id, host_user_id, option_id, guest_id, course_key, created_at, updated_at")
    .eq("event_id", eventId)
    .eq("guest_id", guestId)
    .order("course_key", { ascending: true })
    .order("updated_at", { ascending: false });

  if (persistedError) {
    const wrapped = new Error(`No se pudieron cargar las selecciones guardadas: ${persistedError.message}`);
    wrapped.code = "MEALS_DB_ERROR";
    wrapped.details = persistedError;
    throw wrapped;
  }

  return {
    eventId,
    guestId,
    selections: Array.isArray(persistedSelections) ? persistedSelections : []
  };
}

export function toClientMealOptionPayload(option) {
  return {
    id: toSafeString(option?.id),
    event_id: toSafeString(option?.event_id),
    host_user_id: toSafeString(option?.host_user_id),
    course_key: normalizeCourseKey(option?.course_key),
    course_label: toNullableString(option?.course_label),
    label: toSafeString(option?.label),
    description: toNullableString(option?.description),
    created_at: toNullableString(option?.created_at),
    updated_at: toNullableString(option?.updated_at)
  };
}

export function toClientMealSelectionPayload(selection) {
  return {
    id: toSafeString(selection?.id),
    event_id: toSafeString(selection?.event_id),
    host_user_id: toSafeString(selection?.host_user_id),
    option_id: toNullableString(selection?.option_id),
    guest_id: toSafeString(selection?.guest_id),
    course_key: normalizeCourseKey(selection?.course_key),
    created_at: toNullableString(selection?.created_at),
    updated_at: toNullableString(selection?.updated_at)
  };
}
