import express from "express";
import { createClient } from "@supabase/supabase-js";
import { requireAuthenticatedUser } from "../middleware/auth-middleware.js";

const router = express.Router();

function toSafeString(value) {
  return String(value || "").trim();
}

function toNullableString(value) {
  const normalized = toSafeString(value);
  return normalized || null;
}

function toNullableEmail(value, fieldKey = "email") {
  const normalized = toSafeString(value).toLowerCase();
  if (!normalized) {
    return null;
  }
  const isValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized);
  if (!isValid) {
    const error = new Error(`Invalid ${fieldKey}.`);
    error.code = "GUEST_BAD_REQUEST";
    throw error;
  }
  return normalized;
}

function getSupabaseAdminClient() {
  const supabaseUrl = toSafeString(process.env.SUPABASE_URL);
  const serviceRoleKey = toSafeString(process.env.SUPABASE_SERVICE_ROLE_KEY);
  if (!supabaseUrl || !serviceRoleKey) {
    const error = new Error("SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY son obligatorias.");
    error.code = "GUEST_CONFIG_ERROR";
    throw error;
  }

  return createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  });
}

function hasOwn(objectValue, key) {
  return Object.prototype.hasOwnProperty.call(objectValue || {}, key);
}

function sanitizeGuestPayload(body, { mode = "create" } = {}) {
  const raw = body || {};
  const payload = {};

  if (hasOwn(raw, "first_name") || hasOwn(raw, "firstName") || mode === "create") {
    const firstNameCandidate = toSafeString(raw.first_name ?? raw.firstName);
    if (!firstNameCandidate) {
      const error = new Error("first_name is required.");
      error.code = "GUEST_BAD_REQUEST";
      throw error;
    }
    payload.first_name = firstNameCandidate;
  }

  if (hasOwn(raw, "last_name") || hasOwn(raw, "lastName")) {
    payload.last_name = toNullableString(raw.last_name ?? raw.lastName);
  }
  if (hasOwn(raw, "email")) {
    payload.email = toNullableEmail(raw.email, "email");
  }
  if (hasOwn(raw, "work_email") || hasOwn(raw, "workEmail")) {
    payload.work_email = toNullableEmail(raw.work_email ?? raw.workEmail, "work_email");
  }
  if (hasOwn(raw, "phone")) {
    payload.phone = toNullableString(raw.phone);
  }
  if (hasOwn(raw, "relationship")) {
    payload.relationship = toNullableString(raw.relationship);
  }
  if (hasOwn(raw, "city")) {
    payload.city = toNullableString(raw.city);
  }
  if (hasOwn(raw, "country")) {
    payload.country = toNullableString(raw.country);
  }
  if (hasOwn(raw, "address")) {
    payload.address = toNullableString(raw.address);
  }
  if (hasOwn(raw, "postal_code") || hasOwn(raw, "postalCode")) {
    payload.postal_code = toNullableString(raw.postal_code ?? raw.postalCode);
  }
  if (hasOwn(raw, "state_region") || hasOwn(raw, "stateRegion")) {
    payload.state_region = toNullableString(raw.state_region ?? raw.stateRegion);
  }
  if (hasOwn(raw, "company")) {
    payload.company = toNullableString(raw.company);
  }
  if (hasOwn(raw, "company_name") || hasOwn(raw, "companyName")) {
    payload.company_name = toNullableString(raw.company_name ?? raw.companyName);
  }
  if (hasOwn(raw, "birthday")) {
    payload.birthday = toNullableString(raw.birthday);
  }
  if (hasOwn(raw, "twitter")) {
    payload.twitter = toNullableString(raw.twitter);
  }
  if (hasOwn(raw, "instagram")) {
    payload.instagram = toNullableString(raw.instagram);
  }
  if (hasOwn(raw, "linkedin") || hasOwn(raw, "linkedIn")) {
    payload.linkedin = toNullableString(raw.linkedin ?? raw.linkedIn);
  }
  if (hasOwn(raw, "last_meet_at") || hasOwn(raw, "lastMeetAt")) {
    payload.last_meet_at = toNullableString(raw.last_meet_at ?? raw.lastMeetAt);
  }
  if (hasOwn(raw, "avatar_url") || hasOwn(raw, "avatarUrl")) {
    payload.avatar_url = toNullableString(raw.avatar_url ?? raw.avatarUrl);
  }
  if (hasOwn(raw, "content_language") || hasOwn(raw, "contentLanguage")) {
    payload.content_language = toNullableString(raw.content_language ?? raw.contentLanguage);
  }

  return payload;
}

function sendRouteError(res, error, fallbackMessage) {
  const code = toSafeString(error?.code);
  if (code === "GUEST_BAD_REQUEST") {
    return res.status(400).json({ success: false, code, error: error?.message || fallbackMessage });
  }
  if (code === "GUEST_NOT_FOUND") {
    return res.status(404).json({ success: false, code, error: error?.message || fallbackMessage });
  }
  if (code === "GUEST_CONFIG_ERROR") {
    return res.status(503).json({ success: false, code, error: error?.message || fallbackMessage });
  }
  return res.status(500).json({
    success: false,
    code: code || "GUEST_ROUTE_ERROR",
    error: error?.message || fallbackMessage
  });
}

router.post("/", requireAuthenticatedUser, async (req, res) => {
  let supabase = null;
  try {
    supabase = getSupabaseAdminClient();
  } catch (error) {
    return sendRouteError(res, error, "Guests service is not configured.");
  }

  let payload = null;
  try {
    payload = sanitizeGuestPayload(req.body, { mode: "create" });
  } catch (error) {
    return sendRouteError(res, error, "Invalid guest payload.");
  }

  try {
    const { data, error } = await supabase
      .from("guests")
      .insert({
        ...payload,
        host_user_id: toSafeString(req.authUser?.id)
      })
      .select("*")
      .single();

    if (error) {
      const wrapped = new Error(`Could not create guest: ${error.message}`);
      wrapped.code = "GUEST_DB_ERROR";
      wrapped.details = error;
      throw wrapped;
    }

    return res.status(201).json({ success: true, guest: data });
  } catch (error) {
    return sendRouteError(res, error, "Failed to create guest.");
  }
});

router.put("/:id", requireAuthenticatedUser, async (req, res) => {
  const guestId = toSafeString(req.params?.id);
  if (!guestId) {
    return sendRouteError(
      res,
      { code: "GUEST_BAD_REQUEST", message: "Guest id is required." },
      "Guest id is required."
    );
  }

  let supabase = null;
  try {
    supabase = getSupabaseAdminClient();
  } catch (error) {
    return sendRouteError(res, error, "Guests service is not configured.");
  }

  let payload = null;
  try {
    payload = sanitizeGuestPayload(req.body, { mode: "update" });
  } catch (error) {
    return sendRouteError(res, error, "Invalid guest payload.");
  }

  if (Object.keys(payload).length === 0) {
    return sendRouteError(
      res,
      { code: "GUEST_BAD_REQUEST", message: "No fields to update." },
      "No fields to update."
    );
  }

  try {
    const { data, error } = await supabase
      .from("guests")
      .update(payload)
      .eq("id", guestId)
      .eq("host_user_id", toSafeString(req.authUser?.id))
      .select("*")
      .maybeSingle();

    if (error) {
      const wrapped = new Error(`Could not update guest: ${error.message}`);
      wrapped.code = "GUEST_DB_ERROR";
      wrapped.details = error;
      throw wrapped;
    }

    if (!data?.id) {
      const notFoundError = new Error("Guest not found for this host.");
      notFoundError.code = "GUEST_NOT_FOUND";
      throw notFoundError;
    }

    return res.json({ success: true, guest: data });
  } catch (error) {
    return sendRouteError(res, error, "Failed to update guest.");
  }
});

export const guestsRoute = router;
