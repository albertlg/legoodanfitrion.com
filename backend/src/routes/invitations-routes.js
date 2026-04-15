import express from "express";
import { createClient } from "@supabase/supabase-js";
import { requireAuthenticatedUser } from "../middleware/auth-middleware.js";
import { sendEventInvitationEmail } from "../services/email-service.js";
import { isProfessionalEventContext } from "../services/event-modules-service.js";

const router = express.Router();

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

function normalizeLocale(value) {
  const normalized = toLowerString(value);
  if (!normalized) {
    return "es";
  }
  const baseLocale = normalized.split("-")[0];
  return ["es", "ca", "en", "fr", "it"].includes(baseLocale) ? baseLocale : "es";
}

function getSupabaseAdminClient() {
  const supabaseUrl = toSafeString(process.env.SUPABASE_URL);
  const serviceRoleKey = toSafeString(process.env.SUPABASE_SERVICE_ROLE_KEY);
  if (!supabaseUrl || !serviceRoleKey) {
    const error = new Error("SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY son obligatorias.");
    error.code = "INVITATION_SEND_CONFIG_ERROR";
    throw error;
  }

  return createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  });
}

function getPublicAppBaseUrl() {
  return (
    toSafeString(process.env.FRONTEND_URL) ||
    "https://legoodanfitrion.com"
  ).replace(/\/+$/, "");
}

function resolveGuestDisplayName({ invitationRow, guestRow }) {
  const fromInvitation = toSafeString(invitationRow?.guest_display_name);
  if (fromInvitation) {
    return fromInvitation;
  }
  const firstName = toSafeString(guestRow?.first_name);
  const lastName = toSafeString(guestRow?.last_name);
  const fullName = `${firstName} ${lastName}`.trim();
  if (fullName) {
    return fullName;
  }
  return "Invitado";
}

function resolveHostDisplayName({ authUser, profileRow }) {
  const profileName = toSafeString(profileRow?.full_name);
  if (profileName) {
    return profileName;
  }
  const emailLocalPart = toSafeString(authUser?.email).split("@")[0];
  if (emailLocalPart) {
    return emailLocalPart.charAt(0).toUpperCase() + emailLocalPart.slice(1);
  }
  return "LeGoodAnfitrión";
}

function resolveInvitationTargetEmail({
  isProfessionalEvent,
  guestRow,
  invitationRow,
  targetEmailHint
}) {
  const personalEmail = toLowerString(guestRow?.email);
  const professionalEmail = toLowerString(guestRow?.work_email);
  const invitationEmail = toLowerString(invitationRow?.invitee_email);
  const hintedEmail = toLowerString(targetEmailHint);

  const strictContextCandidates = isProfessionalEvent
    ? [professionalEmail, personalEmail]
    : [personalEmail, professionalEmail];
  const fallbackCandidates = [hintedEmail, invitationEmail];

  return [...strictContextCandidates, ...fallbackCandidates].find((value) => isValidEmail(value)) || "";
}

function sendRouteError(res, error, fallbackMessage) {
  const code = toSafeString(error?.code);
  if (code === "INVITATION_SEND_BAD_REQUEST") {
    return res.status(400).json({ success: false, error: error?.message || fallbackMessage, code });
  }
  if (code === "INVITATION_SEND_FORBIDDEN") {
    return res.status(403).json({ success: false, error: error?.message || fallbackMessage, code });
  }
  if (code === "INVITATION_SEND_NOT_FOUND") {
    return res.status(404).json({ success: false, error: error?.message || fallbackMessage, code });
  }
  if (code === "INVITATION_SEND_CONFIG_ERROR" || code === "EMAIL_CONFIG_ERROR") {
    return res.status(503).json({ success: false, error: error?.message || fallbackMessage, code });
  }
  return res.status(500).json({
    success: false,
    error: error?.message || fallbackMessage,
    code: code || "INVITATION_SEND_ERROR"
  });
}

router.post("/send", requireAuthenticatedUser, async (req, res) => {
  const requesterId = toSafeString(req.authUser?.id);
  const invitationId = toSafeString(req.body?.invitationId);
  const targetEmailHint = toLowerString(req.body?.targetEmail);
  const locale = normalizeLocale(req.body?.locale);

  if (!requesterId || !invitationId) {
    return sendRouteError(
      res,
      {
        code: "INVITATION_SEND_BAD_REQUEST",
        message: "invitationId es obligatorio."
      },
      "Faltan datos para enviar la invitación."
    );
  }

  let supabase = null;
  try {
    supabase = getSupabaseAdminClient();
  } catch (error) {
    console.error("[Send Invitation Error]:", {
      message: error?.message || "Supabase config error",
      code: error?.code || "",
      stack: error?.stack || null
    });
    return res.status(500).json({
      error: String(error?.message || "Backend de invitaciones no configurado.")
    });
  }

  try {
    const { data: invitationRow, error: invitationError } = await supabase
      .from("invitations")
      .select("id, host_user_id, event_id, guest_id, guest_display_name, invitee_email, public_token")
      .eq("id", invitationId)
      .maybeSingle();

    if (invitationError) {
      const wrapped = new Error(`No se pudo cargar la invitación: ${invitationError.message}`);
      wrapped.code = "INVITATION_SEND_DB_ERROR";
      wrapped.details = invitationError;
      throw wrapped;
    }

    if (!invitationRow?.id) {
      const error = new Error("Invitación no encontrada.");
      error.code = "INVITATION_SEND_NOT_FOUND";
      throw error;
    }

    if (toSafeString(invitationRow.host_user_id) !== requesterId) {
      const error = new Error("No tienes permisos para enviar esta invitación.");
      error.code = "INVITATION_SEND_FORBIDDEN";
      throw error;
    }

    const [eventResult, guestResult, profileResult] = await Promise.all([
      supabase
        .from("events")
        .select(
          "id, host_user_id, title, description, event_type, start_at, end_at, timezone, location_name, location_address"
        )
        .eq("id", toSafeString(invitationRow.event_id))
        .maybeSingle(),
      supabase
        .from("guests")
        .select("id, first_name, last_name, email, work_email")
        .eq("id", toSafeString(invitationRow.guest_id))
        .maybeSingle(),
      supabase
        .from("profiles")
        .select("id, full_name")
        .eq("id", requesterId)
        .maybeSingle()
    ]);

    if (eventResult.error) {
      const wrapped = new Error(`No se pudo cargar el evento: ${eventResult.error.message}`);
      wrapped.code = "INVITATION_SEND_DB_ERROR";
      wrapped.details = eventResult.error;
      throw wrapped;
    }
    if (!eventResult.data?.id) {
      const error = new Error("Evento no encontrado para esta invitación.");
      error.code = "INVITATION_SEND_NOT_FOUND";
      throw error;
    }

    if (guestResult.error) {
      const wrapped = new Error(`No se pudo cargar el invitado: ${guestResult.error.message}`);
      wrapped.code = "INVITATION_SEND_DB_ERROR";
      wrapped.details = guestResult.error;
      throw wrapped;
    }

    const eventRow = eventResult.data;
    const guestRow = guestResult.data || null;
    const profileRow = profileResult.error ? null : profileResult.data || null;

    const isProfessionalEvent = isProfessionalEventContext(eventRow);
    const targetEmail = resolveInvitationTargetEmail({
      isProfessionalEvent,
      guestRow,
      invitationRow,
      targetEmailHint
    });

    if (!targetEmail) {
      return sendRouteError(
        res,
        {
          code: "INVITATION_SEND_BAD_REQUEST",
          message: "No hay un email válido para esta invitación."
        },
        "Email inválido."
      );
    }

    if (targetEmail !== toLowerString(invitationRow.invitee_email)) {
      const { error: updateEmailError } = await supabase
        .from("invitations")
        .update({ invitee_email: targetEmail, invite_channel: "email" })
        .eq("id", invitationId)
        .eq("host_user_id", requesterId);
      if (updateEmailError) {
        console.warn("[invitation-send] failed to persist invitee_email", updateEmailError);
      }
    }

    const invitationUrl = `${getPublicAppBaseUrl()}/rsvp/${encodeURIComponent(toSafeString(invitationRow.public_token))}`;
    const guestName = resolveGuestDisplayName({ invitationRow, guestRow });
    const hostName = resolveHostDisplayName({ authUser: req.authUser, profileRow });
    console.log("[invitation-send] smart-email-routing", {
      invitationId,
      eventId: toSafeString(eventRow?.id),
      mode: isProfessionalEvent ? "professional" : "personal",
      selectedEmail: targetEmail,
      guestEmail: toLowerString(guestRow?.email),
      guestWorkEmail: toLowerString(guestRow?.work_email),
      hintedEmail: toLowerString(targetEmailHint),
      invitationStoredEmail: toLowerString(invitationRow?.invitee_email)
    });

    const result = await sendEventInvitationEmail({
      guestEmail: targetEmail,
      guestName,
      hostName,
      invitationUrl,
      locale,
      eventId: toSafeString(eventRow.id),
      invitationId,
      isProfessionalEvent,
      eventDetails: {
        eventName: toSafeString(eventRow.title) || "Evento",
        description: toSafeString(eventRow.description),
        startAt: eventRow.start_at,
        endAt: eventRow.end_at,
        timezone: toSafeString(eventRow.timezone) || "Europe/Madrid",
        locationName: toSafeString(eventRow.location_name),
        locationAddress: toSafeString(eventRow.location_address)
      }
    });

    return res.json({
      success: true,
      invitationId,
      sentTo: targetEmail,
      mode: isProfessionalEvent ? "professional" : "personal",
      messageId: toSafeString(result?.messageId),
      hasIcsAttachment: Boolean(result?.hasIcsAttachment)
    });
  } catch (error) {
    console.error("[Send Invitation Error]:", {
      message: error?.message || "Unknown error",
      code: error?.code || "",
      details: error?.details || null,
      stack: error?.stack || null
    });
    return res.status(500).json({
      error: String(error?.message || "No se pudo enviar la invitación por email.")
    });
  }
});

export { router as invitationsRoute };
