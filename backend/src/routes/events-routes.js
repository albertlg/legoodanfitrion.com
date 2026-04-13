import express from "express";
import { createClient } from "@supabase/supabase-js";
import { requireAuthenticatedUser } from "../middleware/auth-middleware.js";
import { sendBroadcastEmail, sendGalleryNotificationEmail } from "../services/email-service.js";
import { normalizeEventActiveModules, resolveEventModules } from "../services/event-modules-service.js";

const router = express.Router();
const broadcastCooldownMap = new Map();

function toSafeString(value) {
  return String(value || "").trim();
}

function normalizeLocale(value) {
  const normalized = toSafeString(value).toLowerCase();
  if (!normalized) {
    return "es";
  }
  const base = normalized.split("-")[0];
  return ["es", "ca", "en", "fr", "it"].includes(base) ? base : "es";
}

function isValidEmail(value) {
  const normalized = toSafeString(value).toLowerCase();
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized);
}

function isValidHttpUrl(value) {
  const normalized = toSafeString(value);
  if (!normalized) {
    return false;
  }
  try {
    const parsed = new URL(normalized);
    return parsed.protocol === "http:" || parsed.protocol === "https:";
  } catch {
    return false;
  }
}

function getBroadcastCooldownMinutes() {
  const parsed = Number(process.env.EVENT_BROADCAST_COOLDOWN_MINUTES || 30);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return 30;
  }
  return Math.round(parsed);
}

function getCooldownKey(eventId, hostUserId) {
  return `${toSafeString(eventId)}::${toSafeString(hostUserId)}`;
}

function assertBroadcastNotCoolingDown(eventId, hostUserId) {
  const cooldownMinutes = getBroadcastCooldownMinutes();
  const cooldownMs = cooldownMinutes * 60 * 1000;
  const key = getCooldownKey(eventId, hostUserId);
  const previousTimestamp = Number(broadcastCooldownMap.get(key) || 0);
  const now = Date.now();
  if (previousTimestamp > 0 && now - previousTimestamp < cooldownMs) {
    const remainingMinutes = Math.max(1, Math.ceil((cooldownMs - (now - previousTimestamp)) / 60000));
    const error = new Error(`Broadcast cooldown active. Retry in ${remainingMinutes} minute(s).`);
    error.code = "EVENT_BROADCAST_COOLDOWN";
    error.retryAfterMinutes = remainingMinutes;
    throw error;
  }
}

function registerBroadcastTimestamp(eventId, hostUserId) {
  const key = getCooldownKey(eventId, hostUserId);
  broadcastCooldownMap.set(key, Date.now());
}

function getSupabaseAdminClient() {
  const supabaseUrl = toSafeString(process.env.SUPABASE_URL);
  const serviceRoleKey = toSafeString(process.env.SUPABASE_SERVICE_ROLE_KEY);
  if (!supabaseUrl || !serviceRoleKey) {
    const error = new Error("SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY son obligatorias.");
    error.code = "EVENT_BROADCAST_CONFIG_ERROR";
    throw error;
  }

  return createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  });
}

function toHostDisplayName(authUser) {
  const fromEmail = toSafeString(authUser?.email).split("@")[0];
  if (!fromEmail) {
    return "LeGoodAnfitrión";
  }
  return fromEmail.charAt(0).toUpperCase() + fromEmail.slice(1);
}

async function getConfirmedRecipientEmails({ supabase, eventId, requesterId, debugPrefix = "[BROADCAST DEBUG]" }) {
  const { data: invitations, error: invitationsError } = await supabase
    .from("invitations")
    .select("id, guest_id, invitee_email, status")
    .eq("event_id", eventId)
    .eq("status", "yes");

  if (invitationsError) {
    const wrapped = new Error(`No se pudieron cargar invitaciones confirmadas: ${invitationsError.message}`);
    wrapped.code = "EVENT_BROADCAST_DB_ERROR";
    wrapped.details = invitationsError;
    throw wrapped;
  }

  console.log(
    `${debugPrefix} Invitaciones recuperadas: `,
    Array.isArray(invitations) ? invitations.length : 0
  );

  const invitationRows = Array.isArray(invitations) ? invitations : [];
  const guestIdsForFallback = Array.from(
    new Set(
      invitationRows
        .filter((row) => !isValidEmail(row?.invitee_email))
        .map((row) => toSafeString(row?.guest_id))
        .filter(Boolean)
    )
  );

  let guestEmailById = {};
  if (guestIdsForFallback.length > 0) {
    const { data: guestsFallbackData, error: guestsFallbackError } = await supabase
      .from("guests")
      .select("id, email")
      .eq("host_user_id", requesterId)
      .in("id", guestIdsForFallback);

    if (guestsFallbackError) {
      const wrapped = new Error(`No se pudieron cargar emails fallback de agenda: ${guestsFallbackError.message}`);
      wrapped.code = "EVENT_BROADCAST_DB_ERROR";
      wrapped.details = guestsFallbackError;
      throw wrapped;
    }

    guestEmailById = Object.fromEntries(
      (Array.isArray(guestsFallbackData) ? guestsFallbackData : [])
        .map((guestRow) => [toSafeString(guestRow?.id), toSafeString(guestRow?.email).toLowerCase()])
        .filter(([guestId, email]) => Boolean(guestId && email))
    );
  }

  return Array.from(
    new Set(
      invitationRows
        .map((row) => {
          const invitationEmail = toSafeString(row?.invitee_email).toLowerCase();
          if (isValidEmail(invitationEmail)) {
            return invitationEmail;
          }
          const guestId = toSafeString(row?.guest_id);
          return toSafeString(guestEmailById[guestId]).toLowerCase();
        })
        .filter((email) => isValidEmail(email))
    )
  );
}

function sendRouteError(res, error, fallbackMessage) {
  const code = toSafeString(error?.code);
  if (code === "EVENT_BROADCAST_BAD_REQUEST") {
    return res.status(400).json({ success: false, error: error?.message || fallbackMessage, code });
  }
  if (code === "EVENT_BROADCAST_FORBIDDEN") {
    return res.status(403).json({ success: false, error: error?.message || fallbackMessage, code });
  }
  if (code === "EVENT_BROADCAST_NOT_FOUND") {
    return res.status(404).json({ success: false, error: error?.message || fallbackMessage, code });
  }
  if (code === "EVENT_BROADCAST_COOLDOWN") {
    return res.status(429).json({
      success: false,
      error: error?.message || fallbackMessage,
      code,
      retryAfterMinutes: Number(error?.retryAfterMinutes || getBroadcastCooldownMinutes())
    });
  }
  if (code === "EVENT_BROADCAST_CONFIG_ERROR" || code === "EMAIL_CONFIG_ERROR") {
    return res.status(503).json({ success: false, error: error?.message || fallbackMessage, code });
  }
  return res.status(500).json({
    success: false,
    error: error?.message || fallbackMessage,
    code: code || "EVENT_BROADCAST_ERROR"
  });
}

router.post("/:id/broadcast", requireAuthenticatedUser, async (req, res) => {
  const eventId = toSafeString(req.params?.id);
  const customMessage = toSafeString(req.body?.customMessage);
  const locale = normalizeLocale(req.body?.locale);
  const requesterId = toSafeString(req.authUser?.id);

  if (!eventId || !customMessage) {
    return sendRouteError(
      res,
      {
        code: "EVENT_BROADCAST_BAD_REQUEST",
        message: "eventId y customMessage son obligatorios."
      },
      "Faltan datos para enviar el mensaje."
    );
  }

  if (customMessage.length < 5) {
    return sendRouteError(
      res,
      {
        code: "EVENT_BROADCAST_BAD_REQUEST",
        message: "El mensaje es demasiado corto."
      },
      "Mensaje inválido."
    );
  }

  let supabase = null;
  try {
    supabase = getSupabaseAdminClient();
  } catch (error) {
    return sendRouteError(res, error, "El backend no está configurado para enviar correos.");
  }

  try {
    const { data: eventData, error: eventError } = await supabase
      .from("events")
      .select("id, title, host_user_id")
      .eq("id", eventId)
      .maybeSingle();

    if (eventError) {
      const wrapped = new Error(`No se pudo cargar el evento: ${eventError.message}`);
      wrapped.code = "EVENT_BROADCAST_DB_ERROR";
      wrapped.details = eventError;
      throw wrapped;
    }

    if (!eventData?.id) {
      const error = new Error("Evento no encontrado.");
      error.code = "EVENT_BROADCAST_NOT_FOUND";
      throw error;
    }

    if (toSafeString(eventData.host_user_id) !== requesterId) {
      const error = new Error("Solo el anfitrión principal puede usar el megáfono.");
      error.code = "EVENT_BROADCAST_FORBIDDEN";
      throw error;
    }

    assertBroadcastNotCoolingDown(eventId, requesterId);

    const recipientEmails = await getConfirmedRecipientEmails({
      supabase,
      eventId,
      requesterId,
      debugPrefix: "[BROADCAST DEBUG]"
    });

    if (recipientEmails.length === 0) {
      return res.json({
        success: true,
        skipped: true,
        sentCount: 0,
        failedCount: 0,
        totalRecipients: 0
      });
    }

    const hostName = toHostDisplayName(req.authUser);
    const eventName = toSafeString(eventData.title) || "Evento";

    const sendResults = await Promise.allSettled(
      recipientEmails.map((email) =>
        sendBroadcastEmail(email, hostName, eventName, customMessage, locale)
      )
    );

    let sentCount = 0;
    let failedCount = 0;

    sendResults.forEach((resultItem) => {
      if (resultItem.status === "fulfilled") {
        sentCount += 1;
      } else {
        failedCount += 1;
        console.error("[event-broadcast] send email error:", resultItem.reason);
      }
    });

    if (sentCount > 0) {
      registerBroadcastTimestamp(eventId, requesterId);
    }

    return res.json({
      success: sentCount > 0,
      sentCount,
      failedCount,
      totalRecipients: recipientEmails.length,
      cooldownMinutes: getBroadcastCooldownMinutes()
    });
  } catch (error) {
    console.error("[event-broadcast] route error:", error?.details || error?.message || error);
    return sendRouteError(res, error, "No se pudo enviar el mensaje masivo.");
  }
});

router.put("/:id", requireAuthenticatedUser, async (req, res) => {
  const eventId = toSafeString(req.params?.id);
  const requesterId = toSafeString(req.authUser?.id);
  const locale = normalizeLocale(req.body?.locale);
  const notifyGallery = Boolean(req.body?.notifyGallery);
  const shouldUpdateActiveModules = Object.prototype.hasOwnProperty.call(req.body || {}, "active_modules");
  const activeModulesInput = req.body?.active_modules;
  const photoGalleryUrlRaw = req.body?.photo_gallery_url;
  const normalizedPhotoGalleryUrl = photoGalleryUrlRaw == null ? null : toSafeString(photoGalleryUrlRaw);

  if (!eventId) {
    return sendRouteError(
      res,
      { code: "EVENT_BROADCAST_BAD_REQUEST", message: "eventId es obligatorio." },
      "Faltan datos del evento."
    );
  }

  if (normalizedPhotoGalleryUrl && !isValidHttpUrl(normalizedPhotoGalleryUrl)) {
    return sendRouteError(
      res,
      { code: "EVENT_BROADCAST_BAD_REQUEST", message: "photo_gallery_url debe ser una URL http(s) válida." },
      "URL de galería no válida."
    );
  }

  if (
    shouldUpdateActiveModules &&
    (activeModulesInput == null || typeof activeModulesInput !== "object" || Array.isArray(activeModulesInput))
  ) {
    return sendRouteError(
      res,
      { code: "EVENT_BROADCAST_BAD_REQUEST", message: "active_modules debe ser un objeto JSON." },
      "Formato de módulos inválido."
    );
  }

  const normalizedActiveModules = shouldUpdateActiveModules
    ? normalizeEventActiveModules(activeModulesInput)
    : null;

  let supabase = null;
  try {
    supabase = getSupabaseAdminClient();
  } catch (error) {
    return sendRouteError(res, error, "El backend no está configurado correctamente.");
  }

  try {
    const { data: eventData, error: eventError } = await supabase
      .from("events")
      .select("id, title, host_user_id, schedule_mode, poll_status, expenses, photo_gallery_url, active_modules, modules_version")
      .eq("id", eventId)
      .maybeSingle();

    if (eventError) {
      const wrapped = new Error(`No se pudo cargar el evento: ${eventError.message}`);
      wrapped.code = "EVENT_BROADCAST_DB_ERROR";
      wrapped.details = eventError;
      throw wrapped;
    }

    if (!eventData?.id) {
      const error = new Error("Evento no encontrado.");
      error.code = "EVENT_BROADCAST_NOT_FOUND";
      throw error;
    }

    if (toSafeString(eventData.host_user_id) !== requesterId) {
      const error = new Error("Solo el anfitrión principal puede editar este evento.");
      error.code = "EVENT_BROADCAST_FORBIDDEN";
      throw error;
    }

    const updatePayload = {
      photo_gallery_url: normalizedPhotoGalleryUrl || null
    };
    if (shouldUpdateActiveModules) {
      updatePayload.active_modules = normalizedActiveModules;
      updatePayload.modules_version = 1;
    }

    const { error: updateError } = await supabase
      .from("events")
      .update(updatePayload)
      .eq("id", eventId)
      .eq("host_user_id", requesterId);

    if (updateError) {
      const wrapped = new Error(`No se pudo actualizar el evento: ${updateError.message}`);
      wrapped.code = "EVENT_BROADCAST_DB_ERROR";
      wrapped.details = updateError;
      throw wrapped;
    }

    let totalRecipients = 0;
    let notifiedCount = 0;
    let failedCount = 0;

    if (notifyGallery && normalizedPhotoGalleryUrl) {
      const recipientEmails = await getConfirmedRecipientEmails({
        supabase,
        eventId,
        requesterId,
        debugPrefix: "[GALLERY NOTIFY DEBUG]"
      });
      totalRecipients = recipientEmails.length;

      if (totalRecipients > 0) {
        const hostName = toHostDisplayName(req.authUser);
        const eventName = toSafeString(eventData.title) || "Evento";
        const sendResults = await Promise.allSettled(
          recipientEmails.map((email) =>
            sendGalleryNotificationEmail(
              email,
              hostName,
              eventName,
              normalizedPhotoGalleryUrl,
              locale
            )
          )
        );

        sendResults.forEach((resultItem) => {
          if (resultItem.status === "fulfilled") {
            notifiedCount += 1;
          } else {
            failedCount += 1;
            console.error("[gallery-notify] send email error:", resultItem.reason);
          }
        });
      }
    }

    return res.json({
      success: true,
      eventId,
      photo_gallery_url: normalizedPhotoGalleryUrl || null,
      active_modules: shouldUpdateActiveModules
        ? normalizedActiveModules
        : normalizeEventActiveModules(eventData?.active_modules),
      modules_version: shouldUpdateActiveModules ? 1 : Number(eventData?.modules_version || 1),
      resolved_modules: resolveEventModules({
        ...(eventData || {}),
        photo_gallery_url: normalizedPhotoGalleryUrl || null,
        active_modules: shouldUpdateActiveModules
          ? normalizedActiveModules
          : eventData?.active_modules,
        modules_version: shouldUpdateActiveModules ? 1 : Number(eventData?.modules_version || 1)
      }),
      notifyGallery,
      totalRecipients,
      notifiedCount,
      failedCount
    });
  } catch (error) {
    console.error("[event-update] route error:", error?.details || error?.message || error);
    return sendRouteError(res, error, "No se pudo actualizar el evento.");
  }
});

export { router as eventsRoute };
