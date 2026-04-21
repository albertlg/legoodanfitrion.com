import express from "express";
import { requireAuthenticatedUser } from "../middleware/auth-middleware.js";
import {
  createMealOption,
  deleteMealOption,
  listEventMealsState,
  listPublicMealsStateByToken,
  toClientMealOptionPayload,
  toClientMealSelectionPayload,
  updateMealOption,
  upsertMealSelection,
  upsertPublicMealSelectionsByToken
} from "../services/meals-service.js";

const router = express.Router();

function toSafeString(value) {
  return String(value || "").trim();
}

function sendMealsError(res, error, fallbackMessage) {
  const code = toSafeString(error?.code);

  if (code === "MEALS_BAD_REQUEST") {
    return res.status(400).json({
      success: false,
      error: error?.message || fallbackMessage,
      code
    });
  }

  if (code === "MEALS_FORBIDDEN") {
    return res.status(403).json({
      success: false,
      error: error?.message || fallbackMessage,
      code
    });
  }

  if (code === "MEALS_EVENT_NOT_FOUND" || code === "MEALS_NOT_FOUND") {
    return res.status(404).json({
      success: false,
      error: error?.message || fallbackMessage,
      code
    });
  }

  if (code === "MEALS_CONFIG_ERROR") {
    return res.status(503).json({
      success: false,
      error: error?.message || fallbackMessage,
      code
    });
  }

  return res.status(500).json({
    success: false,
    error: error?.message || fallbackMessage,
    code: code || "MEALS_ROUTE_ERROR"
  });
}

router.get("/", requireAuthenticatedUser, async (req, res) => {
  const eventId = toSafeString(req.query?.eventId);
  if (!eventId) {
    return sendMealsError(
      res,
      { code: "MEALS_BAD_REQUEST", message: "eventId es obligatorio." },
      "No se pudo cargar el módulo de menús."
    );
  }

  try {
    const payload = await listEventMealsState(eventId, req.authUser.id);
    return res.json({
      success: true,
      options: (Array.isArray(payload?.options) ? payload.options : []).map(toClientMealOptionPayload),
      selections: (Array.isArray(payload?.selections) ? payload.selections : []).map(toClientMealSelectionPayload)
    });
  } catch (error) {
    console.error("[meals] list error:", error?.details || error?.message || error);
    return sendMealsError(res, error, "No se pudo cargar el módulo de menús.");
  }
});

router.post("/options", requireAuthenticatedUser, async (req, res) => {
  const eventId = toSafeString(req.body?.eventId);
  try {
    const option = await createMealOption(eventId, req.authUser.id, req.body || {});
    return res.status(201).json({
      success: true,
      option: toClientMealOptionPayload(option)
    });
  } catch (error) {
    console.error("[meals] create option error:", error?.details || error?.message || error);
    return sendMealsError(res, error, "No se pudo crear la opción de menú.");
  }
});

router.put("/options/:optionId", requireAuthenticatedUser, async (req, res) => {
  const optionId = toSafeString(req.params?.optionId);
  try {
    const option = await updateMealOption(optionId, req.authUser.id, req.body || {});
    return res.json({
      success: true,
      option: toClientMealOptionPayload(option)
    });
  } catch (error) {
    console.error("[meals] update option error:", error?.details || error?.message || error);
    return sendMealsError(res, error, "No se pudo actualizar la opción de menú.");
  }
});

router.delete("/options/:optionId", requireAuthenticatedUser, async (req, res) => {
  const optionId = toSafeString(req.params?.optionId);
  try {
    const deleted = await deleteMealOption(optionId, req.authUser.id);
    return res.json({
      success: true,
      deleted
    });
  } catch (error) {
    console.error("[meals] delete option error:", error?.details || error?.message || error);
    return sendMealsError(res, error, "No se pudo eliminar la opción de menú.");
  }
});

router.post("/selections", requireAuthenticatedUser, async (req, res) => {
  const eventId = toSafeString(req.body?.eventId);
  try {
    const selection = await upsertMealSelection(eventId, req.authUser.id, req.body || {});
    return res.json({
      success: true,
      selection: selection ? toClientMealSelectionPayload(selection) : null
    });
  } catch (error) {
    console.error("[meals] upsert selection error:", error?.details || error?.message || error);
    return sendMealsError(res, error, "No se pudo guardar la elección de menú.");
  }
});

router.get("/public", async (req, res) => {
  const token = toSafeString(req.query?.token);
  if (!token) {
    return sendMealsError(
      res,
      { code: "MEALS_BAD_REQUEST", message: "token es obligatorio." },
      "No se pudo cargar el módulo de menús."
    );
  }

  try {
    const payload = await listPublicMealsStateByToken(token);
    return res.json({
      success: true,
      eventId: payload.eventId,
      guestId: payload.guestId,
      options: (Array.isArray(payload?.options) ? payload.options : []).map(toClientMealOptionPayload),
      selections: (Array.isArray(payload?.selections) ? payload.selections : []).map(toClientMealSelectionPayload)
    });
  } catch (error) {
    console.error("[meals] public list error:", error?.details || error?.message || error);
    return sendMealsError(res, error, "No se pudo cargar el módulo de menús.");
  }
});

router.post("/public/selections", async (req, res) => {
  const token = toSafeString(req.body?.token);
  if (!token) {
    return sendMealsError(
      res,
      { code: "MEALS_BAD_REQUEST", message: "token es obligatorio." },
      "No se pudo guardar la elección de menú."
    );
  }

  try {
    const payload = await upsertPublicMealSelectionsByToken(token, req.body || {});
    return res.json({
      success: true,
      eventId: payload.eventId,
      guestId: payload.guestId,
      selections: (Array.isArray(payload?.selections) ? payload.selections : []).map(toClientMealSelectionPayload)
    });
  } catch (error) {
    console.error("[meals] public upsert selection error:", error?.details || error?.message || error);
    return sendMealsError(res, error, "No se pudo guardar la elección de menú.");
  }
});

export { router as mealsRoute };
