import express from "express";
import { extractHoneypotValue, logSuspiciousHoneypotAttempt } from "../services/anti-bot-service.js";

const router = express.Router();

function toSafeString(value) {
  return String(value || "").trim();
}

router.post("/honeypot", async (req, res) => {
  const honeypotValue = extractHoneypotValue(req.body || {});
  if (!honeypotValue) {
    return res.status(204).send();
  }

  await logSuspiciousHoneypotAttempt({
    formType: toSafeString(req.body?.formType || req.body?.form_type) || "unknown",
    route: toSafeString(req.body?.route),
    source: "frontend_honeypot",
    honeypotValue,
    payloadKeys: Object.keys(req.body || {})
  });

  return res.status(202).json({
    success: true,
    blocked: true
  });
});

export { router as securityRoute };
