import crypto from "crypto";
import express from "express";
import { createClient } from "@supabase/supabase-js";

const router = express.Router();

const RESEND_STATUS_MAP = {
  "email.delivered": "delivered",
  "email.bounced": "bounced",
  "email.complained": "complained",
  "email.clicked": "clicked",
  "email.opened": "opened"
};

// Max age for webhook events: 5 minutes (prevents replay attacks)
const MAX_WEBHOOK_AGE_SECONDS = 300;

function toSafeString(value) {
  return String(value || "").trim();
}

function getSupabaseAdminClient() {
  const supabaseUrl = toSafeString(process.env.SUPABASE_URL);
  const serviceRoleKey = toSafeString(process.env.SUPABASE_SERVICE_ROLE_KEY);
  if (!supabaseUrl || !serviceRoleKey) {
    const error = new Error("SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required.");
    error.code = "SUPABASE_CONFIG_ERROR";
    throw error;
  }
  return createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false }
  });
}

/**
 * Verifica la firma Svix que Resend adjunta a cada webhook.
 * Spec: https://docs.svix.com/receiving/verifying-payloads/how
 *
 * Si RESEND_WEBHOOK_SECRET no está configurada, la verificación se omite
 * (útil en desarrollo local). En producción debe estar siempre presente.
 */
function verifyResendWebhookSignature(rawBodyString, headers) {
  const webhookSecret = toSafeString(process.env.RESEND_WEBHOOK_SECRET);
  if (!webhookSecret) {
    console.warn("[webhooks/resend] RESEND_WEBHOOK_SECRET not set — skipping signature check");
    return true;
  }

  const svixId = toSafeString(headers["svix-id"]);
  const svixTimestamp = toSafeString(headers["svix-timestamp"]);
  const svixSignature = toSafeString(headers["svix-signature"]);

  if (!svixId || !svixTimestamp || !svixSignature) {
    console.warn("[webhooks/resend] Missing svix headers");
    return false;
  }

  // Replay attack prevention: reject events older than 5 minutes
  const ts = parseInt(svixTimestamp, 10);
  if (!Number.isFinite(ts) || Math.abs(Date.now() / 1000 - ts) > MAX_WEBHOOK_AGE_SECONDS) {
    console.warn("[webhooks/resend] Webhook timestamp too old or invalid");
    return false;
  }

  // Resend secrets are formatted as "whsec_<base64>"; strip the prefix before decoding
  const secretBase64 = webhookSecret.startsWith("whsec_")
    ? webhookSecret.slice(6)
    : webhookSecret;

  let secretKey;
  try {
    secretKey = Buffer.from(secretBase64, "base64");
  } catch {
    console.warn("[webhooks/resend] Could not decode webhook secret");
    return false;
  }

  const signedContent = `${svixId}.${svixTimestamp}.${rawBodyString}`;
  const expectedSig = crypto
    .createHmac("sha256", secretKey)
    .update(signedContent)
    .digest("base64");

  // svix-signature can contain multiple space-separated versions: "v1,<sig1> v1,<sig2>"
  const valid = svixSignature.split(" ").some((part) => {
    const [, sig] = part.split(",");
    return sig === expectedSig;
  });

  if (!valid) {
    console.warn("[webhooks/resend] Signature mismatch");
  }
  return valid;
}

/**
 * POST /api/webhooks/resend
 *
 * Recibe eventos de entrega de Resend y actualiza communication_logs.
 * Requiere que express.raw({ type: 'application/json' }) se aplique ANTES
 * de express.json() global para tener acceso al body crudo (necesario para
 * la verificación de firma Svix).
 */
router.post(
  "/resend",
  express.raw({ type: "application/json" }),
  async (req, res) => {
    // req.body es un Buffer cuando se usa express.raw()
    const rawBodyString = Buffer.isBuffer(req.body)
      ? req.body.toString("utf-8")
      : JSON.stringify(req.body);

    if (!verifyResendWebhookSignature(rawBodyString, req.headers)) {
      return res.status(401).json({ error: "Invalid webhook signature" });
    }

    let event;
    try {
      event = JSON.parse(rawBodyString);
    } catch {
      return res.status(400).json({ error: "Invalid JSON payload" });
    }

    const eventType = toSafeString(event?.type);
    const resendStatus = RESEND_STATUS_MAP[eventType];

    if (!resendStatus) {
      // Evento desconocido — acusamos recibo pero no procesamos
      return res.json({ ok: true, processed: false, reason: "unknown_event_type", type: eventType });
    }

    // Resend envía el message_id en data.email_id
    const messageId = toSafeString(event?.data?.email_id);
    if (!messageId) {
      return res.status(400).json({ error: "Missing data.email_id in webhook payload" });
    }

    try {
      const supabase = getSupabaseAdminClient();

      // Busca el log por message_id (columna dedicada añadida en migración 059)
      const { data: rows, error: selectError } = await supabase
        .from("communication_logs")
        .select("id, resend_status")
        .eq("message_id", messageId)
        .limit(1);

      if (selectError) throw selectError;

      if (!rows?.length) {
        // El mensaje puede ser anterior a la migración (sin message_id en columna)
        // o llegar de un envío fuera de LGA — acusamos recibo sin error
        console.warn(`[webhooks/resend] No log found for message_id=${messageId}`);
        return res.json({ ok: true, processed: false, reason: "message_id_not_found" });
      }

      const logId = rows[0].id;

      const { error: updateError } = await supabase
        .from("communication_logs")
        .update({
          resend_status: resendStatus,
          resend_event_at: new Date().toISOString()
        })
        .eq("id", logId);

      if (updateError) throw updateError;

      console.log(`[webhooks/resend] Updated log ${logId}: ${resendStatus} (message_id=${messageId})`);
      return res.json({ ok: true, processed: true, logId, resendStatus });
    } catch (error) {
      console.error("[webhooks/resend] DB error:", error?.message || error);
      return res.status(500).json({ error: "Internal server error processing webhook" });
    }
  }
);

export { router as webhooksRoute };
