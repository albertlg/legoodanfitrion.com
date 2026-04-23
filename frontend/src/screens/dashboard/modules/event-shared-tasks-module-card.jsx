import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AvatarCircle } from "../../../components/avatar-circle";
import { Icon } from "../../../components/icons";
import { InlineMessage } from "../../../components/inline-message";
import { isProfessionalEventContext } from "../../../lib/event-modules";
import { supabase } from "../../../lib/supabaseClient";

const configuredApiUrl = String(
  import.meta.env.VITE_API_URL ||
    import.meta.env.VITE_API_BASE_URL ||
    ""
).trim();
const fallbackApiUrl = "/api";
const SHARED_TASKS_API_BASE_URL = String(configuredApiUrl || fallbackApiUrl).replace(/\/+$/, "");

function buildSharedTasksApiUrl(resource = "") {
  const normalizedBase = String(SHARED_TASKS_API_BASE_URL || "").trim().replace(/\/+$/, "");
  if (!normalizedBase) {
    return "";
  }
  const normalizedResource = String(resource || "").trim().replace(/^\/+/, "");
  if (!normalizedResource) {
    return /(^|\/)api$/i.test(normalizedBase)
      ? `${normalizedBase}/shared-tasks`
      : `${normalizedBase}/api/shared-tasks`;
  }

  return /(^|\/)api$/i.test(normalizedBase)
    ? `${normalizedBase}/shared-tasks/${normalizedResource}`
    : `${normalizedBase}/api/shared-tasks/${normalizedResource}`;
}

function toSafeString(value) {
  return String(value || "").trim();
}

function normalizeGuestFromRow(guestRow, t) {
  const invitationStatus = toSafeString(guestRow?.invitation?.status).toLowerCase();
  const guestId = toSafeString(guestRow?.guest?.id || guestRow?.invitation?.guest_id);
  const name = toSafeString(guestRow?.name || guestRow?.guest?.first_name || t("field_guest")) || t("field_guest");
  const company =
    toSafeString(guestRow?.guest?.company_name) ||
    toSafeString(guestRow?.guest?.company) ||
    toSafeString(guestRow?.invitation?.invitee_email) ||
    toSafeString(guestRow?.guest?.email) ||
    toSafeString(guestRow?.contact);
  const avatarUrl = toSafeString(guestRow?.guest?.avatar_url || guestRow?.avatar_url);

  return {
    id: guestId,
    name,
    company,
    avatar_url: avatarUrl || "",
    status: invitationStatus
  };
}

function getInitials(value) {
  const normalized = toSafeString(value);
  if (!normalized) {
    return "IN";
  }
  const tokens = normalized.split(/\s+/).filter(Boolean);
  const initials = tokens
    .slice(0, 2)
    .map((token) => token.charAt(0).toUpperCase())
    .join("");
  return initials || "IN";
}

function toTaskClientState(taskRow) {
  return {
    id: toSafeString(taskRow?.id),
    title: toSafeString(taskRow?.title),
    assigned_to_guest_id: toSafeString(taskRow?.assigned_to_guest_id) || "",
    is_completed: Boolean(taskRow?.is_completed),
    created_at: toSafeString(taskRow?.created_at),
    updated_at: toSafeString(taskRow?.updated_at)
  };
}

export function EventSharedTasksModuleCard({
  t,
  isProfessionalEvent: isProfessionalEventProp = false,
  selectedEventDetail,
  selectedEventDetailGuests
}) {
  const softAddButtonClass =
    "inline-flex items-center justify-center gap-2 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-300 font-semibold rounded-xl px-4 py-2 hover:bg-indigo-100 dark:hover:bg-indigo-900/50 transition-all duration-200 disabled:opacity-60 disabled:cursor-not-allowed";

  const eventId = toSafeString(selectedEventDetail?.id);
  const isProfessionalEvent = useMemo(
    () => Boolean(isProfessionalEventProp) || isProfessionalEventContext(selectedEventDetail),
    [isProfessionalEventProp, selectedEventDetail]
  );

  const [tasks, setTasks] = useState([]);
  const [isLoadingTasks, setIsLoadingTasks] = useState(false);
  const [feedback, setFeedback] = useState("");
  const [feedbackType, setFeedbackType] = useState("info");
  const [newTaskTitle, setNewTaskTitle] = useState("");
  const [isCreatingTask, setIsCreatingTask] = useState(false);
  const [updatingTaskId, setUpdatingTaskId] = useState("");
  const [deletingTaskId, setDeletingTaskId] = useState("");
  const [editingTaskId, setEditingTaskId] = useState("");
  const [editingTaskTitle, setEditingTaskTitle] = useState("");
  const [assignmentMenuTaskId, setAssignmentMenuTaskId] = useState("");
  const assignmentMenuRef = useRef(null);

  const confirmedGuests = useMemo(
    () =>
      (Array.isArray(selectedEventDetailGuests) ? selectedEventDetailGuests : [])
        .map((row) => normalizeGuestFromRow(row, t))
        .filter((guest) => guest.status === "yes" && Boolean(guest.id)),
    [selectedEventDetailGuests, t]
  );

  const allGuestsById = useMemo(
    () =>
      (Array.isArray(selectedEventDetailGuests) ? selectedEventDetailGuests : [])
        .map((row) => normalizeGuestFromRow(row, t))
        .filter((guest) => Boolean(guest.id))
        .reduce((accumulator, guest) => {
          accumulator[guest.id] = guest;
          return accumulator;
        }, {}),
    [selectedEventDetailGuests, t]
  );

  const orderedTasks = useMemo(() => {
    const list = Array.isArray(tasks) ? tasks.slice() : [];
    return list.sort((left, right) => {
      if (Boolean(left?.is_completed) !== Boolean(right?.is_completed)) {
        return left?.is_completed ? 1 : -1;
      }
      const leftTime = Number(new Date(left?.updated_at || left?.created_at || 0));
      const rightTime = Number(new Date(right?.updated_at || right?.created_at || 0));
      if (Number.isFinite(leftTime) && Number.isFinite(rightTime) && leftTime !== rightTime) {
        return leftTime - rightTime;
      }
      return toSafeString(left?.title).localeCompare(toSafeString(right?.title), undefined, { sensitivity: "base" });
    });
  }, [tasks]);

  const pendingCount = useMemo(
    () => orderedTasks.filter((task) => !task.is_completed).length,
    [orderedTasks]
  );
  const completedCount = Math.max(0, orderedTasks.length - pendingCount);

  const loadTasks = useCallback(async () => {
    if (!eventId || !supabase) {
      setTasks([]);
      setIsLoadingTasks(false);
      return;
    }

    const endpointUrl = buildSharedTasksApiUrl();
    if (!endpointUrl) {
      setFeedbackType("error");
      setFeedback(t("event_shared_tasks_load_error"));
      return;
    }

    setIsLoadingTasks(true);
    try {
      const { data: sessionPayload, error: sessionError } = await supabase.auth.getSession();
      if (sessionError || !sessionPayload?.session?.access_token) {
        throw new Error(t("event_shared_tasks_load_error"));
      }

      const url = new URL(endpointUrl, window.location.origin);
      url.searchParams.set("eventId", eventId);
      const response = await fetch(url.toString(), {
        method: "GET",
        headers: {
          Accept: "application/json",
          Authorization: `Bearer ${sessionPayload.session.access_token}`
        }
      });

      const payload = await response.json().catch(() => ({}));
      if (!response.ok || payload?.success === false) {
        throw new Error(toSafeString(payload?.error) || `HTTP ${response.status}`);
      }

      setTasks(
        (Array.isArray(payload?.tasks) ? payload.tasks : [])
          .map(toTaskClientState)
          .filter((task) => Boolean(task.id && task.title))
      );
    } catch (error) {
      console.error("[shared-tasks] load error", error);
      setFeedbackType("error");
      setFeedback(t("event_shared_tasks_load_error"));
    } finally {
      setIsLoadingTasks(false);
    }
  }, [eventId, t]);

  React.useEffect(() => {
    setFeedback("");
    setFeedbackType("info");
    setNewTaskTitle("");
    setEditingTaskId("");
    setEditingTaskTitle("");
    setAssignmentMenuTaskId("");
    void loadTasks();
  }, [loadTasks]);

  useEffect(() => {
    if (!assignmentMenuTaskId) {
      return undefined;
    }

    const handlePointerDownOutside = (event) => {
      if (assignmentMenuRef.current && !assignmentMenuRef.current.contains(event.target)) {
        setAssignmentMenuTaskId("");
      }
    };

    const handleEscape = (event) => {
      if (event.key === "Escape") {
        setAssignmentMenuTaskId("");
      }
    };

    document.addEventListener("mousedown", handlePointerDownOutside);
    document.addEventListener("touchstart", handlePointerDownOutside);
    window.addEventListener("keydown", handleEscape);
    return () => {
      document.removeEventListener("mousedown", handlePointerDownOutside);
      document.removeEventListener("touchstart", handlePointerDownOutside);
      window.removeEventListener("keydown", handleEscape);
    };
  }, [assignmentMenuTaskId]);

  const updateTask = useCallback(
    async (taskId, patchPayload) => {
      const normalizedTaskId = toSafeString(taskId);
      if (!normalizedTaskId || !supabase) {
        setFeedbackType("error");
        setFeedback(t("event_shared_tasks_update_error"));
        return;
      }

      const endpointUrl = buildSharedTasksApiUrl(normalizedTaskId);
      if (!endpointUrl) {
        setFeedbackType("error");
        setFeedback(t("event_shared_tasks_update_error"));
        return;
      }

      setUpdatingTaskId(normalizedTaskId);
      try {
        const { data: sessionPayload, error: sessionError } = await supabase.auth.getSession();
        if (sessionError || !sessionPayload?.session?.access_token) {
          throw new Error(t("event_shared_tasks_update_error"));
        }

        const response = await fetch(endpointUrl, {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            Accept: "application/json",
            Authorization: `Bearer ${sessionPayload.session.access_token}`
          },
          body: JSON.stringify(patchPayload)
        });

        const payload = await response.json().catch(() => ({}));
        if (!response.ok || payload?.success === false) {
          throw new Error(toSafeString(payload?.error) || `HTTP ${response.status}`);
        }

        const updatedTask = toTaskClientState(payload?.task);
        if (!updatedTask.id) {
          throw new Error(t("event_shared_tasks_update_error"));
        }

        setTasks((current) =>
          (Array.isArray(current) ? current : []).map((taskRow) =>
            taskRow.id === updatedTask.id ? updatedTask : taskRow
          )
        );
      } catch (error) {
        console.error("[shared-tasks] update error", error);
        setFeedbackType("error");
        setFeedback(t("event_shared_tasks_update_error"));
      } finally {
        setUpdatingTaskId("");
      }
    },
    [t]
  );

  const handleCreateTask = async () => {
    const normalizedTitle = toSafeString(newTaskTitle);
    if (!normalizedTitle) {
      setFeedbackType("error");
      setFeedback(t("event_shared_tasks_name_required"));
      return;
    }
    if (!eventId || !supabase) {
      return;
    }

    const endpointUrl = buildSharedTasksApiUrl();
    if (!endpointUrl) {
      setFeedbackType("error");
      setFeedback(t("event_shared_tasks_create_error"));
      return;
    }

    setIsCreatingTask(true);
    setFeedback("");
    setFeedbackType("info");
    try {
      const { data: sessionPayload, error: sessionError } = await supabase.auth.getSession();
      if (sessionError || !sessionPayload?.session?.access_token) {
        throw new Error(t("event_shared_tasks_create_error"));
      }

      const response = await fetch(endpointUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
          Authorization: `Bearer ${sessionPayload.session.access_token}`
        },
        body: JSON.stringify({
          eventId,
          title: normalizedTitle,
          assigned_to_guest_id: null,
          is_completed: false
        })
      });

      const payload = await response.json().catch(() => ({}));
      if (!response.ok || payload?.success === false) {
        throw new Error(toSafeString(payload?.error) || `HTTP ${response.status}`);
      }

      const createdTask = toTaskClientState(payload?.task);
      if (!createdTask.id) {
        throw new Error(t("event_shared_tasks_create_error"));
      }

      setTasks((current) => [...(Array.isArray(current) ? current : []), createdTask]);
      setNewTaskTitle("");
      setFeedbackType("success");
      setFeedback(t("event_shared_tasks_create_success"));
    } catch (error) {
      console.error("[shared-tasks] create error", error);
      setFeedbackType("error");
      setFeedback(t("event_shared_tasks_create_error"));
    } finally {
      setIsCreatingTask(false);
    }
  };

  const handleDeleteTask = async (taskId) => {
    const normalizedTaskId = toSafeString(taskId);
    if (!normalizedTaskId || !supabase) {
      return;
    }

    const endpointUrl = buildSharedTasksApiUrl(normalizedTaskId);
    if (!endpointUrl) {
      setFeedbackType("error");
      setFeedback(t("event_shared_tasks_delete_error"));
      return;
    }

    setDeletingTaskId(normalizedTaskId);
    setFeedback("");
    setFeedbackType("info");
    try {
      const { data: sessionPayload, error: sessionError } = await supabase.auth.getSession();
      if (sessionError || !sessionPayload?.session?.access_token) {
        throw new Error(t("event_shared_tasks_delete_error"));
      }

      const response = await fetch(endpointUrl, {
        method: "DELETE",
        headers: {
          Accept: "application/json",
          Authorization: `Bearer ${sessionPayload.session.access_token}`
        }
      });

      const payload = await response.json().catch(() => ({}));
      if (!response.ok || payload?.success === false) {
        throw new Error(toSafeString(payload?.error) || `HTTP ${response.status}`);
      }

      setTasks((current) => (Array.isArray(current) ? current : []).filter((taskRow) => taskRow.id !== normalizedTaskId));
    } catch (error) {
      console.error("[shared-tasks] delete error", error);
      setFeedbackType("error");
      setFeedback(t("event_shared_tasks_delete_error"));
    } finally {
      setDeletingTaskId("");
    }
  };

  return (
    <article className="order-8 bg-white/80 dark:bg-gray-900/80 backdrop-blur-md rounded-xl border border-gray-200/80 dark:border-gray-700/80 ring-1 ring-black/5 dark:ring-white/10 shadow-sm overflow-hidden p-5 flex flex-col gap-5 transition-all duration-300 hover:-translate-y-1 hover:shadow-md">
      <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-2">
            <Icon name="check" className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
            <p className="text-lg font-bold text-gray-900 dark:text-white">{t("event_shared_tasks_title")}</p>
          </div>
          <p className="text-xs text-gray-600 dark:text-gray-300 leading-relaxed max-w-2xl">{t("event_shared_tasks_hint")}</p>
        </div>

        <div className="grid grid-cols-3 gap-3 w-full md:w-auto md:min-w-[280px]">
          <article className="rounded-xl border border-black/5 dark:border-white/10 bg-white/70 dark:bg-black/20 px-3 py-2">
            <p className="text-[10px] font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">
              {t("event_shared_tasks_stats_total")}
            </p>
            <p className="text-xl font-black text-gray-900 dark:text-white leading-none mt-1">{orderedTasks.length}</p>
          </article>
          <article className="rounded-xl border border-black/5 dark:border-white/10 bg-white/70 dark:bg-black/20 px-3 py-2">
            <p className="text-[10px] font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">
              {t("event_shared_tasks_stats_completed")}
            </p>
            <p className="text-xl font-black text-emerald-600 dark:text-emerald-300 leading-none mt-1">{completedCount}</p>
          </article>
          <article className="rounded-xl border border-black/5 dark:border-white/10 bg-white/70 dark:bg-black/20 px-3 py-2">
            <p className="text-[10px] font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">
              {t("event_shared_tasks_stats_pending")}
            </p>
            <p className="text-xl font-black text-amber-600 dark:text-amber-300 leading-none mt-1">{pendingCount}</p>
          </article>
        </div>
      </div>

      {feedback ? <InlineMessage type={feedbackType} text={feedback} /> : null}

      <div className="rounded-2xl border border-black/5 dark:border-white/10 bg-white/70 dark:bg-black/20 p-4 md:p-5 flex flex-col gap-4">
        <div className="flex flex-col sm:flex-row gap-2">
          <input
            className="flex-1 rounded-xl border border-black/10 dark:border-white/15 bg-white dark:bg-gray-900 px-3 py-2.5 text-sm font-semibold text-gray-900 dark:text-white outline-none focus:border-blue-500 transition-colors"
            type="text"
            value={newTaskTitle}
            placeholder={t(isProfessionalEvent ? "placeholder_task_pro" : "placeholder_task_personal")}
            onChange={(event) => setNewTaskTitle(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.preventDefault();
                if (!isCreatingTask) {
                  void handleCreateTask();
                }
              }
            }}
          />
          <button
            className={`${softAddButtonClass} text-sm`}
            type="button"
            onClick={handleCreateTask}
            disabled={isCreatingTask}
          >
            <Icon name={isCreatingTask ? "loader" : "plus"} className={`w-4 h-4 ${isCreatingTask ? "animate-spin" : ""}`} />
            <span>{t("event_shared_tasks_add_action")}</span>
          </button>
        </div>

        {isLoadingTasks ? (
          <p className="text-xs text-gray-500 dark:text-gray-400 italic">{t("event_shared_tasks_loading")}</p>
        ) : orderedTasks.length === 0 ? (
          <p className="text-xs text-gray-500 dark:text-gray-400 italic">{t("event_shared_tasks_empty")}</p>
        ) : (
          <ul className="flex flex-col gap-3">
            {orderedTasks.map((taskItem) => {
              const taskId = taskItem.id;
              const isUpdatingThisTask = updatingTaskId === taskId;
              const isDeletingThisTask = deletingTaskId === taskId;
              const canInteract = !isUpdatingThisTask && !isDeletingThisTask;
              const isEditingThisTask = editingTaskId === taskId;
              const isAssignmentMenuOpen = assignmentMenuTaskId === taskId;
              const assignedGuestId = toSafeString(taskItem.assigned_to_guest_id);
              const assignedGuest = allGuestsById[assignedGuestId];
              const assignOptions = (() => {
                const options = confirmedGuests.slice();
                if (
                  assignedGuestId &&
                  !options.some((guest) => guest.id === assignedGuestId) &&
                  assignedGuest
                ) {
                  options.push(assignedGuest);
                }
                return options;
              })();

              return (
                <li
                  key={taskId}
                  className={`rounded-xl border border-black/5 dark:border-white/10 bg-white/80 dark:bg-gray-900/40 px-3 py-3 flex flex-col sm:flex-row sm:items-center gap-3 min-w-0 ${
                    taskItem.is_completed ? "opacity-75" : ""
                  }`}
                >
                  <div className="flex flex-row items-center gap-3 flex-1 min-w-0 w-full">
                    <label className="inline-flex items-center shrink-0">
                      <input
                        type="checkbox"
                        checked={Boolean(taskItem.is_completed)}
                        disabled={!canInteract}
                        onChange={(event) => {
                          void updateTask(taskId, { is_completed: Boolean(event.target.checked) });
                        }}
                        className="h-4 w-4 rounded border-gray-300 dark:border-gray-600 text-indigo-600 focus:ring-indigo-500/40 bg-white dark:bg-gray-900"
                      />
                    </label>

                    <div className="flex-1 min-w-0">
                      {isEditingThisTask ? (
                        <input
                          className="w-full rounded-lg border border-black/10 dark:border-white/15 bg-white dark:bg-gray-900 px-2.5 py-2 text-sm font-semibold text-gray-900 dark:text-white outline-none focus:border-blue-500 transition-colors"
                          type="text"
                          value={editingTaskTitle}
                          onChange={(event) => setEditingTaskTitle(event.target.value)}
                          onKeyDown={(event) => {
                            if (event.key === "Enter") {
                              event.preventDefault();
                              const normalizedTitle = toSafeString(editingTaskTitle);
                              if (!normalizedTitle) {
                                return;
                              }
                              void updateTask(taskId, { title: normalizedTitle });
                              setEditingTaskId("");
                              setEditingTaskTitle("");
                            }
                            if (event.key === "Escape") {
                              event.preventDefault();
                              setEditingTaskId("");
                              setEditingTaskTitle("");
                            }
                          }}
                        />
                      ) : (
                        <p
                          className={`text-sm font-bold text-gray-900 dark:text-white flex-1 truncate ${
                            taskItem.is_completed ? "line-through text-gray-500 dark:text-gray-400" : ""
                          }`}
                        >
                          {taskItem.title}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="flex flex-row items-center gap-2 w-full sm:w-auto pl-8 sm:pl-0 min-w-0">
                    <div className="relative flex-1 min-w-0 sm:flex-none" ref={isAssignmentMenuOpen ? assignmentMenuRef : null}>
                      <button
                        type="button"
                        disabled={!canInteract || isEditingThisTask}
                        onClick={() => {
                          setAssignmentMenuTaskId((current) => (current === taskId ? "" : taskId));
                        }}
                        className="inline-flex w-full sm:w-auto min-w-0 max-w-full sm:max-w-[180px] items-center gap-2 rounded-full border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 px-2.5 py-1.5 text-xs font-semibold transition-all duration-200 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-60 disabled:cursor-not-allowed"
                        aria-label={t("event_shared_tasks_assign_label")}
                        title={t("event_shared_tasks_assign_label")}
                      >
                        {assignedGuest ? (
                          <AvatarCircle
                            size={24}
                            label={assignedGuest.name}
                            fallback={getInitials(assignedGuest.name)}
                            imageUrl={assignedGuest.avatar_url}
                            className="border border-black/10 dark:border-white/15"
                          />
                        ) : (
                          <span className="inline-flex h-6 w-6 items-center justify-center rounded-full border border-dashed border-gray-300 dark:border-gray-600 text-gray-400 dark:text-gray-500 shrink-0">
                            <Icon name="plus" className="w-3 h-3" />
                          </span>
                        )}
                        <span className="block min-w-0 truncate whitespace-nowrap">
                          {assignedGuest?.name || t("event_shared_tasks_unassigned")}
                        </span>
                      </button>

                      {isAssignmentMenuOpen ? (
                        <div className="absolute right-0 top-full mt-2 min-w-[210px] max-w-[260px] z-20 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 shadow-sm p-1.5">
                          <button
                            type="button"
                            className="w-full flex items-center gap-2 rounded-lg px-2.5 py-2 text-xs text-left text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                            onClick={() => {
                              void updateTask(taskId, { assigned_to_guest_id: null });
                              setAssignmentMenuTaskId("");
                            }}
                          >
                            <span className="inline-flex h-6 w-6 items-center justify-center rounded-full border border-dashed border-gray-300 dark:border-gray-600 text-gray-400 dark:text-gray-500 shrink-0">
                              <Icon name="plus" className="w-3 h-3" />
                            </span>
                            <span className="truncate">{t("event_shared_tasks_unassigned")}</span>
                          </button>
                          {assignOptions.map((guestOption) => (
                            <button
                              key={guestOption.id}
                              type="button"
                              className="w-full flex items-center gap-2 rounded-lg px-2.5 py-2 text-xs text-left text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                              onClick={() => {
                                void updateTask(taskId, { assigned_to_guest_id: guestOption.id });
                                setAssignmentMenuTaskId("");
                              }}
                            >
                              <AvatarCircle
                                size={24}
                                label={guestOption.name}
                                fallback={getInitials(guestOption.name)}
                                imageUrl={guestOption.avatar_url}
                                className="border border-black/10 dark:border-white/15"
                              />
                              <span className="truncate">{guestOption.name}</span>
                            </button>
                          ))}
                        </div>
                      ) : null}
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      {isEditingThisTask ? (
                        <>
                          <button
                            type="button"
                            className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white transition-all duration-200 hover:-translate-y-0.5 hover:shadow-sm disabled:opacity-60 disabled:cursor-not-allowed"
                            disabled={!canInteract}
                            onClick={() => {
                              const normalizedTitle = toSafeString(editingTaskTitle);
                              if (!normalizedTitle) {
                                return;
                              }
                              void updateTask(taskId, { title: normalizedTitle });
                              setEditingTaskId("");
                              setEditingTaskTitle("");
                            }}
                            aria-label={t("event_shared_tasks_save_action")}
                            title={t("event_shared_tasks_save_action")}
                          >
                            <Icon name="check" className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-white border border-gray-200 text-gray-700 hover:bg-gray-50 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-sm dark:bg-gray-800 dark:border-gray-700 dark:text-gray-200 dark:hover:bg-gray-700"
                            onClick={() => {
                              setEditingTaskId("");
                              setEditingTaskTitle("");
                            }}
                            aria-label={t("cancel_action")}
                            title={t("cancel_action")}
                          >
                            <Icon name="close" className="w-4 h-4" />
                          </button>
                        </>
                      ) : (
                        <>
                          <button
                            className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-white border border-gray-200 text-gray-700 hover:bg-gray-50 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-sm dark:bg-gray-800 dark:border-gray-700 dark:text-gray-200 dark:hover:bg-gray-700 disabled:opacity-60 disabled:cursor-not-allowed"
                            type="button"
                            disabled={!canInteract}
                            onClick={() => {
                              setEditingTaskId(taskId);
                              setEditingTaskTitle(taskItem.title);
                              setAssignmentMenuTaskId("");
                            }}
                            aria-label={t("event_shared_tasks_edit_action")}
                            title={t("event_shared_tasks_edit_action")}
                          >
                            <Icon name="edit" className="w-3.5 h-3.5" />
                          </button>

                          <button
                            className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-red-200/80 dark:border-red-700/40 text-red-600 dark:text-red-300 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
                            type="button"
                            disabled={!canInteract}
                            onClick={() => {
                              setAssignmentMenuTaskId("");
                              void handleDeleteTask(taskId);
                            }}
                            aria-label={t("event_shared_tasks_delete_action")}
                            title={t("event_shared_tasks_delete_action")}
                          >
                            <Icon name={isDeletingThisTask ? "loader" : "trash"} className={`w-3.5 h-3.5 ${isDeletingThisTask ? "animate-spin" : ""}`} />
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </article>
  );
}
