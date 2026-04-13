import express from "express";
import { createClient } from "@supabase/supabase-js";
import { sendRsvpTicketEmail } from "../services/email-service.js";

const router = express.Router();
const ticketThrottleMap = new Map();

function toSafeString(value) {
  return String(value || "").trim();
}

function toLowerString(value) {
  return toSafeString(value).toLowerCase();
}

function isValidEmail(value) {
  const normalized = toLowerString(value);
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized);
}

function getCooldownMinutes() {
  const parsed = Number(process.env.RSVP_TICKET_COOLDOWN_MINUTES || 30);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return 30;
  }
  return Math.round(parsed);
}

function getAllowedOrigins() {
  const envAllowedOrigins = String(
    process.env.CORS_ORIGIN || "http://localhost:5173,http://127.0.0.1:5173"
  )
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
  const defaultProductionOrigins = [
    "https://legoodanfitrion.com",
    "https://www.legoodanfitrion.com"
  ];
  return new Set([...envAllowedOrigins, ...defaultProductionOrigins]);
}

function ensureAllowedOrigin(req) {
  const origin = toSafeString(req.headers.origin);
  if (!origin) {
    return;
  }
  const allowedOrigins = getAllowedOrigins();
  if (!allowedOrigins.has(origin)) {
    const error = new Error("Origin not allowed for RSVP ticket.");
    error.code = "RSVP_TICKET_FORBIDDEN_ORIGIN";
    throw error;
  }
}

function getSupabaseAdminClient() {
  const supabaseUrl = toSafeString(process.env.SUPABASE_URL);
  const serviceRoleKey = toSafeString(process.env.SUPABASE_SERVICE_ROLE_KEY);
  if (!supabaseUrl || !serviceRoleKey) {
    const error = new Error("SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY son obligatorias.");
    error.code = "RSVP_TICKET_CONFIG_ERROR";
    throw error;
  }

  return createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  });
}

function normalizeRsvpStatus(value) {
  const normalized = toLowerString(value);
  if (normalized === "yes" || normalized === "confirmed") {
    return "yes";
  }
  if (normalized === "no") {
    return "no";
  }
  if (normalized === "maybe") {
    return "maybe";
  }
  return normalized;
}

function normalizeLocale(value) {
  const normalized = toLowerString(value);
  if (!normalized) {
    return "es";
  }
  const baseLocale = normalized.split("-")[0];
  return ["es", "ca", "en", "fr", "it"].includes(baseLocale) ? baseLocale : "es";
}

function buildThrottleKey(invitationId, targetEmail) {
  return `${toSafeString(invitationId)}::${toLowerString(targetEmail)}`;
}

function assertNotThrottled(throttleKey) {
  const cooldownMs = getCooldownMinutes() * 60 * 1000;
  const previousSentAt = Number(ticketThrottleMap.get(throttleKey) || 0);
  const now = Date.now();
  if (previousSentAt > 0 && now - previousSentAt < cooldownMs) {
    const remainingMinutes = Math.max(1, Math.ceil((cooldownMs - (now - previousSentAt)) / 60000));
    const error = new Error(`Ticket already sent recently. Retry in ${remainingMinutes} minute(s).`);
    error.code = "RSVP_TICKET_RATE_LIMITED";
    error.retryAfterMinutes = remainingMinutes;
    throw error;
  }
}

function registerThrottle(throttleKey) {
  ticketThrottleMap.set(throttleKey, Date.now());
}

function getPublicAppBaseUrl() {
  return (
    toSafeString(process.env.FRONTEND_URL) ||
    "https://legoodanfitrion.com"
  ).replace(/\/+$/, "");
}

function sendError(res, error, fallbackMessage) {
  const code = toSafeString(error?.code);
  if (code === "RSVP_TICKET_BAD_REQUEST") {
    return res.status(400).json({ success: false, error: error?.message || fallbackMessage, code });
  }
  if (code === "RSVP_TICKET_NOT_FOUND") {
    return res.status(404).json({ success: false, error: error?.message || fallbackMessage, code });
  }
  if (code === "RSVP_TICKET_FORBIDDEN_ORIGIN") {
    return res.status(403).json({ success: false, error: error?.message || fallbackMessage, code });
  }
  if (code === "RSVP_TICKET_RATE_LIMITED") {
    return res.status(429).json({
      success: false,
      error: error?.message || fallbackMessage,
      code,
      retryAfterMinutes: Number(error?.retryAfterMinutes || getCooldownMinutes())
    });
  }
  if (code === "RSVP_TICKET_CONFIG_ERROR" || code === "EMAIL_CONFIG_ERROR") {
    return res.status(503).json({ success: false, error: error?.message || fallbackMessage, code });
  }
  return res.status(500).json({ success: false, error: error?.message || fallbackMessage, code: code || "RSVP_TICKET_ERROR" });
}

router.post("/ticket", async (req, res) => {
  try {
    ensureAllowedOrigin(req);
  } catch (error) {
    return sendError(res, error, "RSVP ticket request blocked.");
  }

  const invitationToken = toSafeString(req.body?.invitationToken);
  const guestNameHint = toSafeString(req.body?.guestName);
  const guestEmailHint = toLowerString(req.body?.guestEmail);
  const localeHint = normalizeLocale(req.body?.locale);
  const eventIdHint = toSafeString(req.body?.eventId);
  const submittedStatus = normalizeRsvpStatus(req.body?.status);

  if (!invitationToken) {
    return sendError(
      res,
      {
        code: "RSVP_TICKET_BAD_REQUEST",
        message: "invitationToken es obligatorio."
      },
      "Missing invitation token."
    );
  }

  let supabase = null;
  try {
    supabase = getSupabaseAdminClient();
  } catch (error) {
    return sendError(res, error, "Backend configuration error.");
  }

  try {
    const { data: invitationRow, error: invitationError } = await supabase
      .from("invitations")
      .select("id, event_id, host_user_id, status, responded_at, invitee_email, guest_display_name")
      .eq("public_token", invitationToken)
      .maybeSingle();

    if (invitationError) {
      const wrapped = new Error(`No se pudo cargar la invitacion: ${invitationError.message}`);
      wrapped.code = "RSVP_TICKET_DB_ERROR";
      wrapped.details = invitationError;
      throw wrapped;
    }

    if (!invitationRow?.id) {
      const error = new Error("Invitation not found.");
      error.code = "RSVP_TICKET_NOT_FOUND";
      throw error;
    }

    if (eventIdHint && toSafeString(invitationRow.event_id) !== eventIdHint) {
      const error = new Error("Event mismatch for invitation token.");
      error.code = "RSVP_TICKET_BAD_REQUEST";
      throw error;
    }

    const finalStatus = normalizeRsvpStatus(invitationRow.status || submittedStatus);
    if (finalStatus !== "yes") {
      return res.status(202).json({
        success: true,
        skipped: true,
        reason: "status_not_confirmed"
      });
    }

    const currentInvitationEmail = isValidEmail(invitationRow.invitee_email)
      ? toLowerString(invitationRow.invitee_email)
      : "";
    const providedGuestEmail = isValidEmail(guestEmailHint) ? guestEmailHint : "";

    if (providedGuestEmail && providedGuestEmail !== currentInvitationEmail) {
      const { error: updateInvitationEmailError } = await supabase
        .from("invitations")
        .update({ invitee_email: providedGuestEmail })
        .eq("id", invitationRow.id);

      if (updateInvitationEmailError) {
        console.error("[rsvp-ticket] failed to persist invitee_email:", updateInvitationEmailError);
      } else {
        invitationRow.invitee_email = providedGuestEmail;
      }
    }

    const targetEmail = providedGuestEmail || currentInvitationEmail;

    if (!targetEmail) {
      return res.status(202).json({
        success: true,
        skipped: true,
        reason: "missing_valid_email"
      });
    }

    const throttleKey = buildThrottleKey(invitationRow.id, targetEmail);
    assertNotThrottled(throttleKey);

    const { data: eventRow, error: eventError } = await supabase
      .from("events")
      .select("id, title, start_at, end_at, timezone, location_name, location_address, status")
      .eq("id", toSafeString(invitationRow.event_id))
      .eq("host_user_id", toSafeString(invitationRow.host_user_id))
      .maybeSingle();

    if (eventError) {
      const wrapped = new Error(`No se pudo cargar el evento: ${eventError.message}`);
      wrapped.code = "RSVP_TICKET_DB_ERROR";
      wrapped.details = eventError;
      throw wrapped;
    }

    if (!eventRow?.id || toLowerString(eventRow.status) === "cancelled") {
      const error = new Error("Event not available.");
      error.code = "RSVP_TICKET_NOT_FOUND";
      throw error;
    }

    const appBaseUrl = getPublicAppBaseUrl();
    const detailsUrl = `${appBaseUrl}/rsvp/${encodeURIComponent(invitationToken)}`;
    const ticketResult = await sendRsvpTicketEmail(
      targetEmail,
      guestNameHint || toSafeString(invitationRow.guest_display_name) || "Invitado",
      {
        eventName: toSafeString(eventRow.title) || "Evento",
        startAt: eventRow.start_at,
        endAt: eventRow.end_at,
        timezone: toSafeString(eventRow.timezone) || "Europe/Madrid",
        locationName: toSafeString(eventRow.location_name),
        locationAddress: toSafeString(eventRow.location_address),
        detailsUrl
      },
      localeHint
    );

    registerThrottle(throttleKey);

    return res.json({
      success: true,
      messageId: toSafeString(ticketResult?.messageId),
      sentTo: targetEmail
    });
  } catch (error) {
    console.error("[rsvp-ticket] route error:", error?.details || error?.message || error);
    return sendError(res, error, "No se pudo enviar el ticket digital.");
  }
});

export { router as rsvpRoute };
