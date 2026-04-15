import { createClient } from "@supabase/supabase-js";

let supabaseAdminClient = null;

function toSafeString(value) {
  return String(value || "").trim();
}

function toNullableString(value) {
  const normalized = toSafeString(value);
  return normalized || null;
}

function toNullableBoolean(value) {
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
  return null;
}

function getSupabaseAdminClient() {
  if (supabaseAdminClient) {
    return supabaseAdminClient;
  }

  const supabaseUrl = toSafeString(process.env.SUPABASE_URL);
  const serviceRoleKey = toSafeString(process.env.SUPABASE_SERVICE_ROLE_KEY);
  if (!supabaseUrl || !serviceRoleKey) {
    const error = new Error("SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY son obligatorias.");
    error.code = "SHARED_TASKS_CONFIG_ERROR";
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
    error.code = "SHARED_TASKS_BAD_REQUEST";
    throw error;
  }

  const { data: eventData, error: eventError } = await supabase
    .from("events")
    .select("id, host_user_id")
    .eq("id", normalizedEventId)
    .maybeSingle();

  if (eventError) {
    const wrapped = new Error(`No se pudo validar el evento: ${eventError.message}`);
    wrapped.code = "SHARED_TASKS_DB_ERROR";
    wrapped.details = eventError;
    throw wrapped;
  }

  if (!eventData?.id) {
    const error = new Error("Evento no encontrado.");
    error.code = "SHARED_TASKS_EVENT_NOT_FOUND";
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
    wrapped.code = "SHARED_TASKS_DB_ERROR";
    wrapped.details = cohostError;
    throw wrapped;
  }

  if (!count) {
    const error = new Error("No tienes permisos para gestionar tareas compartidas de este evento.");
    error.code = "SHARED_TASKS_FORBIDDEN";
    throw error;
  }

  return {
    eventId: normalizedEventId,
    ownerUserId: ownerId
  };
}

async function getSharedTaskById(taskId) {
  const supabase = getSupabaseAdminClient();
  const normalizedTaskId = toSafeString(taskId);
  if (!normalizedTaskId) {
    const error = new Error("taskId es obligatorio.");
    error.code = "SHARED_TASKS_BAD_REQUEST";
    throw error;
  }

  const { data: taskData, error: taskError } = await supabase
    .from("event_shared_tasks")
    .select("id, event_id, host_user_id, title, assigned_to_guest_id, is_completed, created_at, updated_at")
    .eq("id", normalizedTaskId)
    .maybeSingle();

  if (taskError) {
    const wrapped = new Error(`No se pudo cargar la tarea: ${taskError.message}`);
    wrapped.code = "SHARED_TASKS_DB_ERROR";
    wrapped.details = taskError;
    throw wrapped;
  }

  if (!taskData?.id) {
    const error = new Error("Tarea compartida no encontrada.");
    error.code = "SHARED_TASKS_NOT_FOUND";
    throw error;
  }

  return taskData;
}

async function assertAssignableGuest(eventId, hostUserId, guestId) {
  const normalizedGuestId = toSafeString(guestId);
  if (!normalizedGuestId) {
    return;
  }

  const supabase = getSupabaseAdminClient();
  const { data: invitationData, error: invitationError } = await supabase
    .from("invitations")
    .select("id, status")
    .eq("event_id", toSafeString(eventId))
    .eq("host_user_id", toSafeString(hostUserId))
    .eq("guest_id", normalizedGuestId)
    .maybeSingle();

  if (invitationError) {
    const wrapped = new Error(`No se pudo validar el invitado asignado: ${invitationError.message}`);
    wrapped.code = "SHARED_TASKS_DB_ERROR";
    wrapped.details = invitationError;
    throw wrapped;
  }

  if (!invitationData?.id) {
    const error = new Error("La persona asignada no pertenece a este evento.");
    error.code = "SHARED_TASKS_BAD_REQUEST";
    throw error;
  }

  const status = toSafeString(invitationData.status).toLowerCase();
  if (status !== "yes") {
    const error = new Error("Solo se pueden asignar tareas a personas confirmadas.");
    error.code = "SHARED_TASKS_BAD_REQUEST";
    throw error;
  }
}

function sanitizeSharedTaskPayload(input, { mode = "create" } = {}) {
  const raw = input && typeof input === "object" ? input : {};
  const payload = {};

  if (mode === "create" || Object.prototype.hasOwnProperty.call(raw, "title")) {
    const title = toSafeString(raw.title);
    if (!title) {
      const error = new Error("El título de la tarea es obligatorio.");
      error.code = "SHARED_TASKS_BAD_REQUEST";
      throw error;
    }
    payload.title = title;
  }

  if (mode === "create" || Object.prototype.hasOwnProperty.call(raw, "assigned_to_guest_id")) {
    payload.assigned_to_guest_id = toNullableString(raw.assigned_to_guest_id);
  }

  if (mode === "create" || Object.prototype.hasOwnProperty.call(raw, "is_completed")) {
    const parsed = toNullableBoolean(raw.is_completed);
    if (parsed == null && mode === "update") {
      const error = new Error("is_completed no es válido.");
      error.code = "SHARED_TASKS_BAD_REQUEST";
      throw error;
    }
    payload.is_completed = Boolean(parsed);
  }

  return payload;
}

export async function listSharedTasksByEvent(eventId, requesterUserId) {
  const access = await assertEventEditorAccess(eventId, requesterUserId);
  const supabase = getSupabaseAdminClient();

  const { data, error } = await supabase
    .from("event_shared_tasks")
    .select("id, event_id, host_user_id, title, assigned_to_guest_id, is_completed, created_at, updated_at")
    .eq("event_id", access.eventId)
    .order("is_completed", { ascending: true })
    .order("created_at", { ascending: true });

  if (error) {
    const wrapped = new Error(`No se pudieron cargar las tareas compartidas: ${error.message}`);
    wrapped.code = "SHARED_TASKS_DB_ERROR";
    wrapped.details = error;
    throw wrapped;
  }

  return Array.isArray(data) ? data : [];
}

export async function createSharedTask(eventId, requesterUserId, input) {
  const access = await assertEventEditorAccess(eventId, requesterUserId);
  const payload = sanitizeSharedTaskPayload(input, { mode: "create" });
  await assertAssignableGuest(access.eventId, access.ownerUserId, payload.assigned_to_guest_id);

  const supabase = getSupabaseAdminClient();
  const { data, error } = await supabase
    .from("event_shared_tasks")
    .insert({
      event_id: access.eventId,
      host_user_id: access.ownerUserId,
      title: payload.title,
      assigned_to_guest_id: payload.assigned_to_guest_id,
      is_completed: Boolean(payload.is_completed)
    })
    .select("id, event_id, host_user_id, title, assigned_to_guest_id, is_completed, created_at, updated_at")
    .single();

  if (error) {
    const wrapped = new Error(`No se pudo crear la tarea compartida: ${error.message}`);
    wrapped.code = "SHARED_TASKS_DB_ERROR";
    wrapped.details = error;
    throw wrapped;
  }

  return data;
}

export async function updateSharedTask(taskId, requesterUserId, input) {
  const currentTask = await getSharedTaskById(taskId);
  await assertEventEditorAccess(currentTask.event_id, requesterUserId);
  const payload = sanitizeSharedTaskPayload(input, { mode: "update" });
  if (!Object.keys(payload).length) {
    const error = new Error("No hay campos para actualizar.");
    error.code = "SHARED_TASKS_BAD_REQUEST";
    throw error;
  }

  if (Object.prototype.hasOwnProperty.call(payload, "assigned_to_guest_id")) {
    await assertAssignableGuest(currentTask.event_id, currentTask.host_user_id, payload.assigned_to_guest_id);
  }

  const supabase = getSupabaseAdminClient();
  const { data, error } = await supabase
    .from("event_shared_tasks")
    .update({
      ...(Object.prototype.hasOwnProperty.call(payload, "title") ? { title: payload.title } : {}),
      ...(Object.prototype.hasOwnProperty.call(payload, "assigned_to_guest_id")
        ? { assigned_to_guest_id: payload.assigned_to_guest_id }
        : {}),
      ...(Object.prototype.hasOwnProperty.call(payload, "is_completed")
        ? { is_completed: Boolean(payload.is_completed) }
        : {})
    })
    .eq("id", currentTask.id)
    .eq("event_id", currentTask.event_id)
    .select("id, event_id, host_user_id, title, assigned_to_guest_id, is_completed, created_at, updated_at")
    .single();

  if (error) {
    const wrapped = new Error(`No se pudo actualizar la tarea compartida: ${error.message}`);
    wrapped.code = "SHARED_TASKS_DB_ERROR";
    wrapped.details = error;
    throw wrapped;
  }

  return data;
}

export async function deleteSharedTask(taskId, requesterUserId) {
  const currentTask = await getSharedTaskById(taskId);
  await assertEventEditorAccess(currentTask.event_id, requesterUserId);
  const supabase = getSupabaseAdminClient();

  const { error } = await supabase
    .from("event_shared_tasks")
    .delete()
    .eq("id", currentTask.id)
    .eq("event_id", currentTask.event_id);

  if (error) {
    const wrapped = new Error(`No se pudo eliminar la tarea compartida: ${error.message}`);
    wrapped.code = "SHARED_TASKS_DB_ERROR";
    wrapped.details = error;
    throw wrapped;
  }

  return { id: currentTask.id };
}

export function toClientSharedTaskPayload(task) {
  return {
    id: toSafeString(task?.id),
    event_id: toSafeString(task?.event_id),
    host_user_id: toSafeString(task?.host_user_id),
    title: toSafeString(task?.title),
    assigned_to_guest_id: toNullableString(task?.assigned_to_guest_id),
    is_completed: Boolean(task?.is_completed),
    created_at: toNullableString(task?.created_at),
    updated_at: toNullableString(task?.updated_at)
  };
}
