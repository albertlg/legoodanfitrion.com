import express from "express";
import { requireAuthenticatedUser } from "../middleware/auth-middleware.js";
import {
  assignGuestToSpace,
  createEventSpace,
  deleteEventSpace,
  getEventSpacesWithAssignments,
  toClientAssignmentPayload,
  toClientSpacePayload,
  unassignGuestFromSpace,
  updateEventSpace
} from "../services/spaces-service.js";

const router = express.Router();

function toSafeString(value) {
  return String(value || "").trim();
}

function sendSpacesError(res, error, fallbackMessage) {
  const code = toSafeString(error?.code);

  if (code === "SPACES_BAD_REQUEST") {
    return res.status(400).json({
      success: false,
      error: error?.message || fallbackMessage,
      code
    });
  }

  if (code === "SPACES_FORBIDDEN") {
    return res.status(403).json({
      success: false,
      error: error?.message || fallbackMessage,
      code
    });
  }

  if (code === "SPACES_EVENT_NOT_FOUND" || code === "SPACES_NOT_FOUND") {
    return res.status(404).json({
      success: false,
      error: error?.message || fallbackMessage,
      code
    });
  }

  if (code === "SPACES_CAPACITY_REACHED") {
    return res.status(409).json({
      success: false,
      error: error?.message || fallbackMessage,
      code
    });
  }

  if (code === "SPACES_CONFIG_ERROR") {
    return res.status(503).json({
      success: false,
      error: error?.message || fallbackMessage,
      code
    });
  }

  return res.status(500).json({
    success: false,
    error: error?.message || fallbackMessage,
    code: code || "SPACES_ROUTE_ERROR"
  });
}

router.get("/", requireAuthenticatedUser, async (req, res) => {
  const eventId = toSafeString(req.query?.eventId);
  if (!eventId) {
    return sendSpacesError(
      res,
      { code: "SPACES_BAD_REQUEST", message: "eventId es obligatorio." },
      "No se pudo cargar la gestión de espacios."
    );
  }

  try {
    const payload = await getEventSpacesWithAssignments(eventId, req.authUser.id);
    return res.json({
      success: true,
      spaces: (Array.isArray(payload?.spaces) ? payload.spaces : []).map(toClientSpacePayload),
      assignments: (Array.isArray(payload?.assignments) ? payload.assignments : []).map(toClientAssignmentPayload)
    });
  } catch (error) {
    console.error("[spaces] get error:", error?.details || error?.message || error);
    return sendSpacesError(res, error, "No se pudo cargar la gestión de espacios.");
  }
});

router.post("/", requireAuthenticatedUser, async (req, res) => {
  const eventId = toSafeString(req.body?.eventId);
  try {
    const createdSpace = await createEventSpace(eventId, req.authUser.id, req.body || {});
    return res.status(201).json({
      success: true,
      space: toClientSpacePayload(createdSpace)
    });
  } catch (error) {
    console.error("[spaces] create error:", error?.details || error?.message || error);
    return sendSpacesError(res, error, "No se pudo crear el espacio.");
  }
});

router.put("/:spaceId", requireAuthenticatedUser, async (req, res) => {
  const spaceId = toSafeString(req.params?.spaceId);
  try {
    const updatedSpace = await updateEventSpace(spaceId, req.authUser.id, req.body || {});
    return res.json({
      success: true,
      space: toClientSpacePayload(updatedSpace)
    });
  } catch (error) {
    console.error("[spaces] update error:", error?.details || error?.message || error);
    return sendSpacesError(res, error, "No se pudo actualizar el espacio.");
  }
});

router.delete("/:spaceId", requireAuthenticatedUser, async (req, res) => {
  const spaceId = toSafeString(req.params?.spaceId);
  try {
    const deletedPayload = await deleteEventSpace(spaceId, req.authUser.id);
    return res.json({
      success: true,
      deleted: deletedPayload
    });
  } catch (error) {
    console.error("[spaces] delete error:", error?.details || error?.message || error);
    return sendSpacesError(res, error, "No se pudo eliminar el espacio.");
  }
});

router.post("/assignments", requireAuthenticatedUser, async (req, res) => {
  const spaceId = toSafeString(req.body?.spaceId);
  const guestId = toSafeString(req.body?.guestId);
  try {
    const assignment = await assignGuestToSpace(spaceId, guestId, req.authUser.id);
    return res.json({
      success: true,
      assignment: toClientAssignmentPayload(assignment)
    });
  } catch (error) {
    console.error("[spaces] assign error:", error?.details || error?.message || error);
    return sendSpacesError(res, error, "No se pudo asignar el invitado al espacio.");
  }
});

router.delete("/assignments/:assignmentId", requireAuthenticatedUser, async (req, res) => {
  const assignmentId = toSafeString(req.params?.assignmentId);
  try {
    const deletedPayload = await unassignGuestFromSpace(assignmentId, req.authUser.id);
    return res.json({
      success: true,
      deleted: deletedPayload
    });
  } catch (error) {
    console.error("[spaces] unassign error:", error?.details || error?.message || error);
    return sendSpacesError(res, error, "No se pudo desasignar el invitado.");
  }
});

export { router as spacesRoute };
