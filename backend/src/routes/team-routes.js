import express from "express";
import { createClient } from "@supabase/supabase-js";
import { requireAuthenticatedUser } from "../middleware/auth-middleware.js";
import { sendCoHostInvitation } from "../services/email-service.js";

const router = express.Router();
const inMemoryInviteRateLimit = new Map();

function toSafeString(value) {
  return String(value || "").trim();
}

function normalizeEmail(value) {
  return toSafeString(value).toLowerCase();
}

function isValidEmail(value) {
  const normalizedValue = normalizeEmail(value);
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedValue);
}

function getInviteCooldownMinutes() {
  const parsed = Number(process.env.TEAM_INVITE_COOLDOWN_MINUTES || 60);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return 60;
  }
  return Math.round(parsed);
}

function getSupabaseAdminClient() {
  const supabaseUrl = toSafeString(process.env.SUPABASE_URL);
  const serviceRoleKey = toSafeString(process.env.SUPABASE_SERVICE_ROLE_KEY);
  if (!supabaseUrl || !serviceRoleKey) {
    const error = new Error("SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY son obligatorias.");
    error.code = "TEAM_INVITE_CONFIG_ERROR";
    throw error;
  }

  return createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  });
}

function getBearerTokenFromRequest(req) {
  const authorization = toSafeString(req?.headers?.authorization);
  if (!authorization.toLowerCase().startsWith("bearer ")) {
    return "";
  }
  return toSafeString(authorization.slice(7));
}

function getSupabaseUserClient(userToken) {
  const supabaseUrl = toSafeString(process.env.SUPABASE_URL);
  const anonKey = toSafeString(process.env.SUPABASE_ANON_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY);
  const normalizedToken = toSafeString(userToken);

  if (!supabaseUrl || !anonKey) {
    const error = new Error("SUPABASE_URL y SUPABASE_ANON_KEY (o SERVICE_ROLE_KEY) son obligatorias.");
    error.code = "TEAM_INVITE_CONFIG_ERROR";
    throw error;
  }

  if (!normalizedToken) {
    const error = new Error("Missing bearer token.");
    error.code = "TEAM_INVITE_BAD_REQUEST";
    throw error;
  }

  return createClient(supabaseUrl, anonKey, {
    global: {
      headers: {
        Authorization: `Bearer ${normalizedToken}`
      }
    },
    auth: {
      autoRefreshToken: false,
      persistSession: false,
      detectSessionInUrl: false
    }
  });
}

function getRecipientNameFromEmail(email) {
  const localPart = normalizeEmail(email).split("@")[0] || "";
  const firstChunk = localPart.split(/[._-]+/).find(Boolean) || localPart;
  const readableName = firstChunk.replace(/[0-9]+/g, "").trim() || firstChunk;
  if (!readableName) {
    return "esta persona";
  }
  return readableName.charAt(0).toUpperCase() + readableName.slice(1);
}

function getFallbackHostName(authUser) {
  const fallbackFromEmail = toSafeString(authUser?.email).split("@")[0];
  if (!fallbackFromEmail) {
    return "Un anfitrión de LeGoodAnfitrion";
  }
  return fallbackFromEmail.charAt(0).toUpperCase() + fallbackFromEmail.slice(1);
}

function sendInviteError(res, error, fallbackMessage) {
  const code = toSafeString(error?.code);
  if (code === "TEAM_INVITE_BAD_REQUEST") {
    return res.status(400).json({ success: false, error: error?.message || fallbackMessage, code });
  }
  if (code === "TEAM_INVITE_FORBIDDEN") {
    return res.status(403).json({ success: false, error: error?.message || fallbackMessage, code });
  }
  if (code === "TEAM_INVITE_EVENT_NOT_FOUND") {
    return res.status(404).json({ success: false, error: error?.message || fallbackMessage, code });
  }
  if (code === "TEAM_INVITE_ALREADY_REGISTERED") {
    return res.status(409).json({ success: false, error: error?.message || fallbackMessage, code });
  }
  if (code === "TEAM_INVITE_RATE_LIMIT") {
    return res.status(429).json({
      success: false,
      error: error?.message || fallbackMessage,
      code,
      retryAfterMinutes: Number(error?.retryAfterMinutes || getInviteCooldownMinutes())
    });
  }
  if (code === "TEAM_INVITE_CONFIG_ERROR" || code === "EMAIL_CONFIG_ERROR") {
    return res.status(503).json({ success: false, error: error?.message || fallbackMessage, code });
  }
  if (code === "TEAM_INVITE_AUTH_CONTEXT_ERROR") {
    return res.status(401).json({ success: false, error: error?.message || fallbackMessage, code });
  }
  return res.status(500).json({
    success: false,
    error: error?.message || fallbackMessage,
    code: code || "TEAM_INVITE_ROUTE_ERROR"
  });
}

function assertCooldownNotExceededFromMemory(eventId, email) {
  const cooldownMinutes = getInviteCooldownMinutes();
  const now = Date.now();
  const key = `${eventId}::${email}`;
  const previousSentAt = inMemoryInviteRateLimit.get(key);
  if (Number.isFinite(previousSentAt)) {
    const elapsedMinutes = (now - previousSentAt) / 60000;
    if (elapsedMinutes < cooldownMinutes) {
      const error = new Error("Ya se envió una invitación recientemente para este email.");
      error.code = "TEAM_INVITE_RATE_LIMIT";
      error.retryAfterMinutes = Math.max(1, Math.ceil(cooldownMinutes - elapsedMinutes));
      throw error;
    }
  }
}

function registerCooldownInMemory(eventId, email) {
  const key = `${eventId}::${email}`;
  inMemoryInviteRateLimit.set(key, Date.now());
}

router.post("/invite", requireAuthenticatedUser, async (req, res) => {
  const eventId = toSafeString(req.body?.eventId);
  const targetEmail = normalizeEmail(req.body?.email);
  const requesterToken = getBearerTokenFromRequest(req);

  if (!eventId || !targetEmail || !isValidEmail(targetEmail)) {
    return sendInviteError(
      res,
      {
        code: "TEAM_INVITE_BAD_REQUEST",
        message: "eventId y email válidos son obligatorios."
      },
      "No se pudo validar la invitación."
    );
  }

  let supabaseAdmin = null;
  let supabaseUser = null;
  try {
    supabaseAdmin = getSupabaseAdminClient();
    supabaseUser = getSupabaseUserClient(requesterToken);
  } catch (error) {
    return sendInviteError(res, error, "El backend no está configurado para enviar invitaciones.");
  }

  try {
    const { data: eventData, error: eventError } = await supabaseAdmin
      .from("events")
      .select("id, title, host_user_id")
      .eq("id", eventId)
      .maybeSingle();

    if (eventError) {
      const wrapped = new Error(`No se pudo comprobar el evento: ${eventError.message}`);
      wrapped.code = "TEAM_INVITE_DB_ERROR";
      wrapped.details = eventError;
      throw wrapped;
    }

    if (!eventData?.id) {
      const error = new Error("El evento no existe.");
      error.code = "TEAM_INVITE_EVENT_NOT_FOUND";
      throw error;
    }

    if (toSafeString(eventData.host_user_id) !== toSafeString(req.authUser?.id)) {
      const error = new Error("Solo el anfitrión principal puede enviar invitaciones de equipo.");
      error.code = "TEAM_INVITE_FORBIDDEN";
      throw error;
    }

    const { data: foundUserId, error: lookupError } = await supabaseUser.rpc("get_user_id_by_email", {
      p_email: targetEmail
    });
    if (lookupError) {
      const lookupCode = toSafeString(lookupError?.code).toUpperCase();
      if (lookupCode === "P0001" && toSafeString(lookupError?.message).toLowerCase() === "not_authenticated") {
        const wrapped = new Error(
          "No se pudo autenticar el contexto del usuario para validar este email."
        );
        wrapped.code = "TEAM_INVITE_AUTH_CONTEXT_ERROR";
        wrapped.details = lookupError;
        throw wrapped;
      }
      const wrapped = new Error(`No se pudo validar el email: ${lookupError.message}`);
      wrapped.code = "TEAM_INVITE_DB_ERROR";
      wrapped.details = lookupError;
      throw wrapped;
    }

    if (toSafeString(foundUserId)) {
      const error = new Error("Este email ya tiene una cuenta registrada.");
      error.code = "TEAM_INVITE_ALREADY_REGISTERED";
      throw error;
    }

    const cooldownMinutes = getInviteCooldownMinutes();
    let existingLog = null;
    let canUseDatabaseThrottle = true;

    const { data: inviteLogData, error: inviteLogReadError } = await supabaseUser
      .from("event_team_invite_logs")
      .select("id, sent_count, last_sent_at")
      .eq("event_id", eventId)
      .eq("invited_email", targetEmail)
      .maybeSingle();

    if (inviteLogReadError) {
      if (toSafeString(inviteLogReadError.code) === "42P01") {
        canUseDatabaseThrottle = false;
      } else {
        const wrapped = new Error(
          `No se pudo validar el límite de invitaciones: ${inviteLogReadError.message}`
        );
        wrapped.code = "TEAM_INVITE_DB_ERROR";
        wrapped.details = inviteLogReadError;
        throw wrapped;
      }
    } else {
      existingLog = inviteLogData || null;
    }

    if (canUseDatabaseThrottle && existingLog?.last_sent_at) {
      const elapsedMilliseconds = Date.now() - new Date(existingLog.last_sent_at).getTime();
      const elapsedMinutes = elapsedMilliseconds / 60000;
      if (elapsedMinutes < cooldownMinutes) {
        const error = new Error("Ya se envió una invitación recientemente para este email.");
        error.code = "TEAM_INVITE_RATE_LIMIT";
        error.retryAfterMinutes = Math.max(1, Math.ceil(cooldownMinutes - elapsedMinutes));
        throw error;
      }
    }

    if (!canUseDatabaseThrottle) {
      assertCooldownNotExceededFromMemory(eventId, targetEmail);
    }

    const { data: hostProfile, error: hostProfileError } = await supabaseAdmin
      .from("profiles")
      .select("full_name")
      .eq("id", toSafeString(eventData.host_user_id))
      .maybeSingle();

    if (hostProfileError) {
      console.error(
        "[team-invite] host profile lookup error:",
        hostProfileError?.message || hostProfileError
      );
    }

    const hostName =
      toSafeString(hostProfile?.full_name) || getFallbackHostName(req.authUser);
    const eventName = toSafeString(eventData.title) || "tu evento";

    const deliveryResult = await sendCoHostInvitation(targetEmail, hostName, eventName, {
      eventId,
      inviterUserId: toSafeString(req.authUser?.id)
    });

    if (canUseDatabaseThrottle) {
      const nextSentCount = Number(existingLog?.sent_count || 0) + 1;
      const { error: inviteLogUpsertError } = await supabaseUser
        .from("event_team_invite_logs")
        .upsert(
          {
            event_id: eventId,
            inviter_user_id: toSafeString(req.authUser?.id),
            invited_email: targetEmail,
            sent_count: nextSentCount,
            last_sent_at: new Date().toISOString()
          },
          {
            onConflict: "event_id,invited_email"
          }
        );

      if (inviteLogUpsertError) {
        console.error(
          "[team-invite] invite log upsert error:",
          inviteLogUpsertError?.message || inviteLogUpsertError
        );
      }
    } else {
      registerCooldownInMemory(eventId, targetEmail);
    }

    return res.json({
      success: true,
      recipientEmail: targetEmail,
      recipientName: getRecipientNameFromEmail(targetEmail),
      messageId: toSafeString(deliveryResult?.messageId)
    });
  } catch (error) {
    console.error(
      "[team-invite] route error:",
      error?.details || error?.message || error
    );
    return sendInviteError(res, error, "No se pudo enviar la invitación por email.");
  }
});

export { router as teamRoute };
