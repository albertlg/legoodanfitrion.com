import { createClient } from "@supabase/supabase-js";

let supabaseAdminClient = null;

function toSafeString(value) {
  return String(value || "").trim();
}

function toNullableString(value) {
  const normalized = toSafeString(value);
  return normalized || null;
}

function parseNullablePositiveInteger(value) {
  if (value == null || value === "") {
    return null;
  }
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return null;
  }
  return Math.round(parsed);
}

function normalizeSpaceType(value, fallback = "table") {
  const normalized = toSafeString(value).toLowerCase();
  if (!normalized) {
    return fallback;
  }
  if (["table", "room", "vehicle"].includes(normalized)) {
    return normalized;
  }
  return null;
}

function toBoolean(value) {
  if (typeof value === "boolean") {
    return value;
  }
  if (typeof value === "number") {
    return value !== 0;
  }
  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase();
    if (["true", "1", "yes", "si", "sí"].includes(normalized)) {
      return true;
    }
    if (["false", "0", "no"].includes(normalized)) {
      return false;
    }
  }
  return false;
}

function getSupabaseAdminClient() {
  if (supabaseAdminClient) {
    return supabaseAdminClient;
  }

  const supabaseUrl = toSafeString(process.env.SUPABASE_URL);
  const serviceRoleKey = toSafeString(process.env.SUPABASE_SERVICE_ROLE_KEY);
  if (!supabaseUrl || !serviceRoleKey) {
    const error = new Error("SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY son obligatorias.");
    error.code = "SPACES_CONFIG_ERROR";
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
    error.code = "SPACES_BAD_REQUEST";
    throw error;
  }

  const { data: eventData, error: eventError } = await supabase
    .from("events")
    .select("id, host_user_id")
    .eq("id", normalizedEventId)
    .maybeSingle();

  if (eventError) {
    const wrapped = new Error(`No se pudo validar el evento: ${eventError.message}`);
    wrapped.code = "SPACES_DB_ERROR";
    wrapped.details = eventError;
    throw wrapped;
  }

  if (!eventData?.id) {
    const error = new Error("Evento no encontrado.");
    error.code = "SPACES_EVENT_NOT_FOUND";
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
    wrapped.code = "SPACES_DB_ERROR";
    wrapped.details = cohostError;
    throw wrapped;
  }

  if (!count) {
    const error = new Error("No tienes permisos para gestionar espacios de este evento.");
    error.code = "SPACES_FORBIDDEN";
    throw error;
  }

  return {
    eventId: normalizedEventId,
    ownerUserId: ownerId
  };
}

async function getSpaceById(spaceId) {
  const supabase = getSupabaseAdminClient();
  const normalizedSpaceId = toSafeString(spaceId);
  if (!normalizedSpaceId) {
    const error = new Error("spaceId es obligatorio.");
    error.code = "SPACES_BAD_REQUEST";
    throw error;
  }

  const { data: spaceData, error: spaceError } = await supabase
    .from("event_spaces")
    .select("id, event_id, host_user_id, name, capacity, type, created_at, updated_at")
    .eq("id", normalizedSpaceId)
    .maybeSingle();

  if (spaceError) {
    const wrapped = new Error(`No se pudo cargar el espacio: ${spaceError.message}`);
    wrapped.code = "SPACES_DB_ERROR";
    wrapped.details = spaceError;
    throw wrapped;
  }

  if (!spaceData?.id) {
    const error = new Error("Espacio no encontrado.");
    error.code = "SPACES_NOT_FOUND";
    throw error;
  }

  return spaceData;
}

function sanitizeSpacePayload(input, { mode = "create" } = {}) {
  const raw = input && typeof input === "object" ? input : {};
  const payload = {};

  if (mode === "create" || Object.prototype.hasOwnProperty.call(raw, "name")) {
    const name = toSafeString(raw.name);
    if (!name) {
      const error = new Error("El nombre del espacio es obligatorio.");
      error.code = "SPACES_BAD_REQUEST";
      throw error;
    }
    payload.name = name;
  }

  if (mode === "create" || Object.prototype.hasOwnProperty.call(raw, "capacity")) {
    const capacity = parseNullablePositiveInteger(raw.capacity);
    if (raw.capacity != null && raw.capacity !== "" && capacity == null) {
      const error = new Error("La capacidad debe ser un número mayor que cero.");
      error.code = "SPACES_BAD_REQUEST";
      throw error;
    }
    payload.capacity = capacity;
  }

  if (mode === "create" || Object.prototype.hasOwnProperty.call(raw, "type")) {
    const type = normalizeSpaceType(raw.type);
    if (!type) {
      const error = new Error("El tipo de espacio no es válido.");
      error.code = "SPACES_BAD_REQUEST";
      throw error;
    }
    payload.type = type;
  }

  return payload;
}

export async function getEventSpacesWithAssignments(eventId, requesterUserId) {
  const access = await assertEventEditorAccess(eventId, requesterUserId);
  const supabase = getSupabaseAdminClient();

  const [{ data: spaces, error: spacesError }, { data: assignments, error: assignmentsError }] = await Promise.all([
    supabase
      .from("event_spaces")
      .select("id, event_id, host_user_id, name, capacity, type, created_at, updated_at")
      .eq("event_id", access.eventId)
      .order("created_at", { ascending: true }),
    supabase
      .from("event_space_assignments")
      .select("id, space_id, guest_id, is_plus_one, event_id, host_user_id, created_at, updated_at")
      .eq("event_id", access.eventId)
      .order("created_at", { ascending: true })
  ]);

  if (spacesError) {
    const wrapped = new Error(`No se pudieron cargar los espacios: ${spacesError.message}`);
    wrapped.code = "SPACES_DB_ERROR";
    wrapped.details = spacesError;
    throw wrapped;
  }

  if (assignmentsError) {
    const wrapped = new Error(`No se pudieron cargar las asignaciones: ${assignmentsError.message}`);
    wrapped.code = "SPACES_DB_ERROR";
    wrapped.details = assignmentsError;
    throw wrapped;
  }

  return {
    spaces: Array.isArray(spaces) ? spaces : [],
    assignments: Array.isArray(assignments) ? assignments : []
  };
}

export async function createEventSpace(eventId, requesterUserId, input) {
  const access = await assertEventEditorAccess(eventId, requesterUserId);
  const payload = sanitizeSpacePayload(input, { mode: "create" });
  const supabase = getSupabaseAdminClient();

  const { data, error } = await supabase
    .from("event_spaces")
    .insert({
      event_id: access.eventId,
      host_user_id: access.ownerUserId,
      name: payload.name,
      capacity: payload.capacity,
      type: payload.type
    })
    .select("id, event_id, host_user_id, name, capacity, type, created_at, updated_at")
    .single();

  if (error) {
    const wrapped = new Error(`No se pudo crear el espacio: ${error.message}`);
    wrapped.code = "SPACES_DB_ERROR";
    wrapped.details = error;
    throw wrapped;
  }

  return data;
}

export async function updateEventSpace(spaceId, requesterUserId, input) {
  const currentSpace = await getSpaceById(spaceId);
  await assertEventEditorAccess(currentSpace.event_id, requesterUserId);
  const payload = sanitizeSpacePayload(input, { mode: "update" });
  if (!Object.keys(payload).length) {
    const error = new Error("No hay campos para actualizar.");
    error.code = "SPACES_BAD_REQUEST";
    throw error;
  }

  const supabase = getSupabaseAdminClient();
  const { data, error } = await supabase
    .from("event_spaces")
    .update({
      ...(Object.prototype.hasOwnProperty.call(payload, "name") ? { name: payload.name } : {}),
      ...(Object.prototype.hasOwnProperty.call(payload, "capacity") ? { capacity: payload.capacity } : {}),
      ...(Object.prototype.hasOwnProperty.call(payload, "type") ? { type: payload.type } : {})
    })
    .eq("id", currentSpace.id)
    .eq("event_id", currentSpace.event_id)
    .select("id, event_id, host_user_id, name, capacity, type, created_at, updated_at")
    .single();

  if (error) {
    const wrapped = new Error(`No se pudo actualizar el espacio: ${error.message}`);
    wrapped.code = "SPACES_DB_ERROR";
    wrapped.details = error;
    throw wrapped;
  }

  return data;
}

export async function deleteEventSpace(spaceId, requesterUserId) {
  const currentSpace = await getSpaceById(spaceId);
  await assertEventEditorAccess(currentSpace.event_id, requesterUserId);
  const supabase = getSupabaseAdminClient();

  const { error } = await supabase
    .from("event_spaces")
    .delete()
    .eq("id", currentSpace.id)
    .eq("event_id", currentSpace.event_id);

  if (error) {
    const wrapped = new Error(`No se pudo eliminar el espacio: ${error.message}`);
    wrapped.code = "SPACES_DB_ERROR";
    wrapped.details = error;
    throw wrapped;
  }

  return {
    id: currentSpace.id
  };
}

export async function assignGuestToSpace(spaceId, guestId, requesterUserId, options = {}) {
  const normalizedGuestId = toSafeString(guestId);
  if (!normalizedGuestId) {
    const error = new Error("guestId es obligatorio.");
    error.code = "SPACES_BAD_REQUEST";
    throw error;
  }
  const isPlusOneAssignment = toBoolean(options?.isPlusOne ?? options?.is_plus_one);

  const currentSpace = await getSpaceById(spaceId);
  await assertEventEditorAccess(currentSpace.event_id, requesterUserId);
  const supabase = getSupabaseAdminClient();

  const { data: invitationRow, error: invitationError } = await supabase
    .from("invitations")
    .select("id, status, rsvp_plus_one")
    .eq("event_id", currentSpace.event_id)
    .eq("host_user_id", toSafeString(currentSpace.host_user_id))
    .eq("guest_id", normalizedGuestId)
    .maybeSingle();

  if (invitationError) {
    const wrapped = new Error(`No se pudo validar la invitación del guest: ${invitationError.message}`);
    wrapped.code = "SPACES_DB_ERROR";
    wrapped.details = invitationError;
    throw wrapped;
  }

  if (!invitationRow?.id) {
    const error = new Error("La persona invitada no pertenece a este evento.");
    error.code = "SPACES_BAD_REQUEST";
    throw error;
  }

  const invitationStatus = toSafeString(invitationRow.status).toLowerCase();
  if (invitationStatus !== "yes") {
    const error = new Error("Solo se pueden asignar invitados confirmados.");
    error.code = "SPACES_BAD_REQUEST";
    throw error;
  }
  if (isPlusOneAssignment && !invitationRow?.rsvp_plus_one) {
    const error = new Error("La invitación no tiene acompañante confirmado (+1).");
    error.code = "SPACES_BAD_REQUEST";
    throw error;
  }

  const normalizedCapacity = Number(currentSpace.capacity);
  const hasCapacityLimit = Number.isFinite(normalizedCapacity) && normalizedCapacity > 0;

  if (hasCapacityLimit) {
    const [{ data: currentGuestAssignment, error: currentGuestAssignmentError }, { count: currentSpaceCount, error: currentSpaceCountError }] =
      await Promise.all([
        supabase
          .from("event_space_assignments")
          .select("id, space_id")
          .eq("event_id", currentSpace.event_id)
          .eq("guest_id", normalizedGuestId)
          .eq("is_plus_one", isPlusOneAssignment)
          .maybeSingle(),
        supabase
          .from("event_space_assignments")
          .select("id", { count: "exact", head: true })
          .eq("event_id", currentSpace.event_id)
          .eq("space_id", currentSpace.id)
      ]);

    if (currentGuestAssignmentError || currentSpaceCountError) {
      const wrapped = new Error(
        `No se pudo validar la capacidad del espacio: ${
          currentGuestAssignmentError?.message || currentSpaceCountError?.message || "unknown_error"
        }`
      );
      wrapped.code = "SPACES_DB_ERROR";
      wrapped.details = currentGuestAssignmentError || currentSpaceCountError;
      throw wrapped;
    }

    const currentAssignmentSpaceId = toSafeString(currentGuestAssignment?.space_id);
    const isAlreadyInTargetSpace = currentAssignmentSpaceId === toSafeString(currentSpace.id);
    const usedSlots = Math.max(0, Number(currentSpaceCount || 0));
    if (!isAlreadyInTargetSpace && usedSlots >= normalizedCapacity) {
      const error = new Error("La capacidad del espacio ya está completa.");
      error.code = "SPACES_CAPACITY_REACHED";
      throw error;
    }
  }

  const { data, error } = await supabase
    .from("event_space_assignments")
    .upsert(
      {
        space_id: currentSpace.id,
        guest_id: normalizedGuestId,
        is_plus_one: isPlusOneAssignment,
        event_id: currentSpace.event_id,
        host_user_id: currentSpace.host_user_id
      },
      {
        onConflict: "event_id,guest_id,is_plus_one"
      }
    )
    .select("id, space_id, guest_id, is_plus_one, event_id, host_user_id, created_at, updated_at")
    .single();

  if (error) {
    const wrapped = new Error(`No se pudo asignar al invitado: ${error.message}`);
    wrapped.code = "SPACES_DB_ERROR";
    wrapped.details = error;
    throw wrapped;
  }

  return data;
}

export async function unassignGuestFromSpace(assignmentId, requesterUserId) {
  const normalizedAssignmentId = toSafeString(assignmentId);
  if (!normalizedAssignmentId) {
    const error = new Error("assignmentId es obligatorio.");
    error.code = "SPACES_BAD_REQUEST";
    throw error;
  }

  const supabase = getSupabaseAdminClient();
  const { data: assignmentData, error: assignmentError } = await supabase
    .from("event_space_assignments")
    .select("id, event_id")
    .eq("id", normalizedAssignmentId)
    .maybeSingle();

  if (assignmentError) {
    const wrapped = new Error(`No se pudo cargar la asignación: ${assignmentError.message}`);
    wrapped.code = "SPACES_DB_ERROR";
    wrapped.details = assignmentError;
    throw wrapped;
  }

  if (!assignmentData?.id) {
    const error = new Error("Asignación no encontrada.");
    error.code = "SPACES_NOT_FOUND";
    throw error;
  }

  await assertEventEditorAccess(assignmentData.event_id, requesterUserId);
  const { error } = await supabase
    .from("event_space_assignments")
    .delete()
    .eq("id", assignmentData.id);

  if (error) {
    const wrapped = new Error(`No se pudo desasignar al invitado: ${error.message}`);
    wrapped.code = "SPACES_DB_ERROR";
    wrapped.details = error;
    throw wrapped;
  }

  return {
    id: assignmentData.id
  };
}

export function normalizeSpaceTypeForClient(value) {
  return normalizeSpaceType(value);
}

export function toClientSpacePayload(spaceData) {
  return {
    id: toSafeString(spaceData?.id),
    event_id: toSafeString(spaceData?.event_id),
    host_user_id: toSafeString(spaceData?.host_user_id),
    name: toSafeString(spaceData?.name),
    capacity: Number.isFinite(Number(spaceData?.capacity)) ? Number(spaceData.capacity) : null,
    type: toSafeString(spaceData?.type) || "table",
    created_at: toNullableString(spaceData?.created_at),
    updated_at: toNullableString(spaceData?.updated_at)
  };
}

export function toClientAssignmentPayload(assignmentData) {
  return {
    id: toSafeString(assignmentData?.id),
    space_id: toSafeString(assignmentData?.space_id),
    guest_id: toSafeString(assignmentData?.guest_id),
    is_plus_one: Boolean(assignmentData?.is_plus_one),
    event_id: toSafeString(assignmentData?.event_id),
    host_user_id: toSafeString(assignmentData?.host_user_id),
    created_at: toNullableString(assignmentData?.created_at),
    updated_at: toNullableString(assignmentData?.updated_at)
  };
}
