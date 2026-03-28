import express from "express";
import { requireAdmin } from "../middleware/admin-auth-middleware.js";
import { getTrafficOverview } from "../services/google-analytics-service.js";
import { getTopQueries } from "../services/search-console-service.js";

const router = express.Router();

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

export { router as adminAnalyticsRoute };
