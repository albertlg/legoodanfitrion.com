import express from "express";
import { createClient } from "@supabase/supabase-js";
import { requireAdmin } from "../middleware/admin-auth-middleware.js";
import { getTrafficOverview } from "../services/google-analytics-service.js";
import { getTopQueries } from "../services/search-console-service.js";

const router = express.Router();

function toSafeString(value) {
  return String(value || "").trim();
}

function normalizeLogMode(value) {
  const normalized = toSafeString(value).toLowerCase();
  if (["personal", "professional", "auth"].includes(normalized)) {
    return normalized;
  }
  return "";
}

const VALID_EMAIL_TYPES = new Set([
  "RSVP_TICKET",
  "INVITATION",
  "COHOST_INVITE",
  "BROADCAST",
  "GALLERY_NOTIFICATION",
  "SYSTEM"
]);

function normalizeEmailType(value) {
  const normalized = toSafeString(value).toUpperCase();
  return VALID_EMAIL_TYPES.has(normalized) ? normalized : "";
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
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  });
}

router.get("/overview", requireAdmin, async (req, res) => {
  const startDate = String(req.query.startDate || "").trim();
  const endDate = String(req.query.endDate || "").trim();

  try {
    const data = await getTrafficOverview(startDate, endDate);
    return res.json({
      ok: true,
      data
    });
  } catch (error) {
    const code = String(error?.code || "");
    if (code === "GA_CONFIG_ERROR") {
      return res.status(503).json({
        error: error.message || "Google Analytics is not configured.",
        code
      });
    }
    if (code === "GA_TIMEOUT") {
      return res.status(504).json({
        error: error.message || "Google Analytics request timed out.",
        code
      });
    }
    return res.status(500).json({
      error: error?.message || "Failed to fetch analytics overview."
    });
  }
});

router.get("/seo", requireAdmin, async (req, res) => {
  const startDate = String(req.query.startDate || "").trim();
  const endDate = String(req.query.endDate || "").trim();

  try {
    const data = await getTopQueries(startDate, endDate);
    return res.json({
      ok: true,
      data
    });
  } catch (error) {
    const code = String(error?.code || "");
    if (code === "GSC_CONFIG_ERROR") {
      return res.status(503).json({
        error: error.message || "Google Search Console is not configured.",
        code
      });
    }
    if (code === "GSC_TIMEOUT") {
      return res.status(504).json({
        error: error.message || "Google Search Console request timed out.",
        code
      });
    }
    return res.status(500).json({
      error: error?.message || "Failed to fetch SEO analytics."
    });
  }
});

router.get("/communications", requireAdmin, async (req, res) => {
  const recipientFilter = toSafeString(req.query.recipient || "");
  const modeFilter = normalizeLogMode(req.query.mode || "");
  const emailTypeFilter = normalizeEmailType(req.query.email_type || "");
  const rawLimit = Number(req.query.limit || 150);
  const limit = Number.isFinite(rawLimit) ? Math.min(Math.max(Math.round(rawLimit), 1), 500) : 150;

  try {
    const supabase = getSupabaseAdminClient();
    let query = supabase
      .from("communication_logs")
      .select("id, created_at, recipient, subject, mode, status, error_details, metadata, email_type, message_id, resend_status, resend_event_at")
      .order("created_at", { ascending: false })
      .limit(limit);

    if (recipientFilter) {
      query = query.ilike("recipient", `%${recipientFilter}%`);
    }
    if (modeFilter) {
      query = query.eq("mode", modeFilter);
    }
    if (emailTypeFilter) {
      query = query.eq("email_type", emailTypeFilter);
    }

    const { data, error } = await query;
    if (error) {
      throw error;
    }

    return res.json({
      ok: true,
      data: {
        logs: Array.isArray(data) ? data : []
      }
    });
  } catch (error) {
    const code = String(error?.code || "");
    if (code === "SUPABASE_CONFIG_ERROR") {
      return res.status(503).json({
        error: error.message || "Backend admin data source is not configured.",
        code
      });
    }
    return res.status(500).json({
      error: error?.message || "Failed to fetch communication logs."
    });
  }
});

router.get("/communications/metrics", requireAdmin, async (_req, res) => {
  try {
    const supabase = getSupabaseAdminClient();

    // Totales globales
    const { data: totals, error: totalsError } = await supabase
      .from("communication_logs")
      .select("status, resend_status, email_type");

    if (totalsError) throw totalsError;

    const rows = Array.isArray(totals) ? totals : [];
    const total = rows.length;
    const totalSent = rows.filter((r) => r.status === "sent").length;
    const totalFailed = rows.filter((r) => r.status === "failed").length;
    const totalDelivered = rows.filter((r) => r.resend_status === "delivered").length;
    const totalBounced = rows.filter((r) => r.resend_status === "bounced").length;
    const totalComplained = rows.filter((r) => r.resend_status === "complained").length;
    const deliveryRate = totalSent > 0
      ? Number(((totalDelivered / totalSent) * 100).toFixed(1))
      : null;

    // Desglose por email_type
    const byType = {};
    for (const row of rows) {
      const t = row.email_type || "UNKNOWN";
      if (!byType[t]) {
        byType[t] = { total: 0, sent: 0, failed: 0, delivered: 0, bounced: 0 };
      }
      byType[t].total++;
      if (row.status === "sent") byType[t].sent++;
      if (row.status === "failed") byType[t].failed++;
      if (row.resend_status === "delivered") byType[t].delivered++;
      if (row.resend_status === "bounced") byType[t].bounced++;
    }

    // Últimos 30 días
    const since30d = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
    const last30d = rows.filter((r) => {
      // created_at no está en la query directa, lo filtramos en la siguiente query
      return true;
    });

    const { count: sent30d } = await supabase
      .from("communication_logs")
      .select("id", { count: "exact", head: true })
      .eq("status", "sent")
      .gte("created_at", since30d);

    const { count: bounced30d } = await supabase
      .from("communication_logs")
      .select("id", { count: "exact", head: true })
      .eq("resend_status", "bounced")
      .gte("created_at", since30d);

    return res.json({
      ok: true,
      data: {
        total,
        totalSent,
        totalFailed,
        totalDelivered,
        totalBounced,
        totalComplained,
        deliveryRate,
        sent30d: Number(sent30d || 0),
        bounced30d: Number(bounced30d || 0),
        byType
      }
    });
  } catch (error) {
    const code = String(error?.code || "");
    if (code === "SUPABASE_CONFIG_ERROR") {
      return res.status(503).json({
        error: error.message || "Backend admin data source is not configured.",
        code
      });
    }
    return res.status(500).json({
      error: error?.message || "Failed to fetch communication metrics."
    });
  }
});

router.get("/security/summary", requireAdmin, async (_req, res) => {
  try {
    const supabase = getSupabaseAdminClient();
    const { count, error } = await supabase
      .from("communication_logs")
      .select("id", { count: "exact", head: true })
      .contains("metadata", { security_event: "honeypot_blocked" });

    if (error) {
      throw error;
    }

    return res.json({
      ok: true,
      data: {
        blockedSuspiciousRegistrations: Number(count || 0)
      }
    });
  } catch (error) {
    const code = String(error?.code || "");
    if (code === "SUPABASE_CONFIG_ERROR") {
      return res.status(503).json({
        error: error.message || "Backend admin data source is not configured.",
        code
      });
    }
    return res.status(500).json({
      error: error?.message || "Failed to fetch security summary."
    });
  }
});

export { router as adminAnalyticsRoute };
