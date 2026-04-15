import express from "express";
import { requireAuthenticatedUser } from "../middleware/auth-middleware.js";
import {
  createSharedTask,
  deleteSharedTask,
  listSharedTasksByEvent,
  toClientSharedTaskPayload,
  updateSharedTask
} from "../services/shared-tasks-service.js";

const router = express.Router();

function toSafeString(value) {
  return String(value || "").trim();
}

function sendSharedTasksError(res, error, fallbackMessage) {
  const code = toSafeString(error?.code);

  if (code === "SHARED_TASKS_BAD_REQUEST") {
    return res.status(400).json({
      success: false,
      error: error?.message || fallbackMessage,
      code
    });
  }

  if (code === "SHARED_TASKS_FORBIDDEN") {
    return res.status(403).json({
      success: false,
      error: error?.message || fallbackMessage,
      code
    });
  }

  if (code === "SHARED_TASKS_EVENT_NOT_FOUND" || code === "SHARED_TASKS_NOT_FOUND") {
    return res.status(404).json({
      success: false,
      error: error?.message || fallbackMessage,
      code
    });
  }

  if (code === "SHARED_TASKS_CONFIG_ERROR") {
    return res.status(503).json({
      success: false,
      error: error?.message || fallbackMessage,
      code
    });
  }

  return res.status(500).json({
    success: false,
    error: error?.message || fallbackMessage,
    code: code || "SHARED_TASKS_ROUTE_ERROR"
  });
}

router.get("/", requireAuthenticatedUser, async (req, res) => {
  const eventId = toSafeString(req.query?.eventId);
  if (!eventId) {
    return sendSharedTasksError(
      res,
      { code: "SHARED_TASKS_BAD_REQUEST", message: "eventId es obligatorio." },
      "No se pudieron cargar las tareas compartidas."
    );
  }

  try {
    const tasks = await listSharedTasksByEvent(eventId, req.authUser.id);
    return res.json({
      success: true,
      tasks: (Array.isArray(tasks) ? tasks : []).map(toClientSharedTaskPayload)
    });
  } catch (error) {
    console.error("[shared-tasks] list error:", error?.details || error?.message || error);
    return sendSharedTasksError(res, error, "No se pudieron cargar las tareas compartidas.");
  }
});

router.post("/", requireAuthenticatedUser, async (req, res) => {
  const eventId = toSafeString(req.body?.eventId);
  try {
    const task = await createSharedTask(eventId, req.authUser.id, req.body || {});
    return res.status(201).json({
      success: true,
      task: toClientSharedTaskPayload(task)
    });
  } catch (error) {
    console.error("[shared-tasks] create error:", error?.details || error?.message || error);
    return sendSharedTasksError(res, error, "No se pudo crear la tarea compartida.");
  }
});

router.patch("/:taskId", requireAuthenticatedUser, async (req, res) => {
  const taskId = toSafeString(req.params?.taskId);
  try {
    const task = await updateSharedTask(taskId, req.authUser.id, req.body || {});
    return res.json({
      success: true,
      task: toClientSharedTaskPayload(task)
    });
  } catch (error) {
    console.error("[shared-tasks] update error:", error?.details || error?.message || error);
    return sendSharedTasksError(res, error, "No se pudo actualizar la tarea compartida.");
  }
});

router.delete("/:taskId", requireAuthenticatedUser, async (req, res) => {
  const taskId = toSafeString(req.params?.taskId);
  try {
    const deleted = await deleteSharedTask(taskId, req.authUser.id);
    return res.json({
      success: true,
      deleted
    });
  } catch (error) {
    console.error("[shared-tasks] delete error:", error?.details || error?.message || error);
    return sendSharedTasksError(res, error, "No se pudo eliminar la tarea compartida.");
  }
});

export { router as sharedTasksRoute };
