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
  const rawLimit = Number(req.query.limit || 150);
  const limit = Number.isFinite(rawLimit) ? Math.min(Math.max(Math.round(rawLimit), 1), 500) : 150;

  try {
    const supabase = getSupabaseAdminClient();
    let query = supabase
      .from("communication_logs")
      .select("id, created_at, recipient, subject, mode, status, error_details, metadata")
      .order("created_at", { ascending: false })
      .limit(limit);

    if (recipientFilter) {
      query = query.ilike("recipient", `%${recipientFilter}%`);
    }
    if (modeFilter) {
      query = query.eq("mode", modeFilter);
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
