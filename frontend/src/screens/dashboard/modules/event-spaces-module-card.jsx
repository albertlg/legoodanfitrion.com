import React, { useCallback, useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { Icon } from "../../../components/icons";
import { InlineMessage } from "../../../components/inline-message";
import { supabase } from "../../../lib/supabaseClient";

const configuredApiUrl = String(
  import.meta.env.VITE_API_URL ||
    import.meta.env.VITE_API_BASE_URL ||
    ""
).trim();
const fallbackApiUrl = "/api";
const SPACES_API_BASE_URL = String(configuredApiUrl || fallbackApiUrl).replace(/\/+$/, "");

function buildSpacesApiUrl(resource = "") {
  const normalizedBase = String(SPACES_API_BASE_URL || "").trim().replace(/\/+$/, "");
  if (!normalizedBase) {
    return "";
  }
  const normalizedResource = String(resource || "").trim().replace(/^\/+/, "");
  if (!normalizedResource) {
    return /(^|\/)api$/i.test(normalizedBase)
      ? `${normalizedBase}/spaces`
      : `${normalizedBase}/api/spaces`;
  }
  return /(^|\/)api$/i.test(normalizedBase)
    ? `${normalizedBase}/spaces/${normalizedResource}`
    : `${normalizedBase}/api/spaces/${normalizedResource}`;
}

function toSafeString(value) {
  return String(value || "").trim();
}

function toPositiveIntegerOrNull(value) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return null;
  }
  return Math.round(parsed);
}

function normalizeSpaceType(value) {
  const normalized = toSafeString(value).toLowerCase();
  if (["table", "room", "vehicle"].includes(normalized)) {
    return normalized;
  }
  return "table";
}

function normalizeGuestFromRow(guestRow, t) {
  const invitationStatus = toSafeString(guestRow?.invitation?.status).toLowerCase();
  const guestId = toSafeString(guestRow?.guest?.id || guestRow?.invitation?.guest_id);
  const name = toSafeString(guestRow?.name || guestRow?.guest?.first_name || t("field_guest")) || t("field_guest");
  const contact =
    toSafeString(guestRow?.invitation?.invitee_email) ||
    toSafeString(guestRow?.guest?.email) ||
    toSafeString(guestRow?.contact);
  const company = toSafeString(guestRow?.guest?.company_name || guestRow?.guest?.company);

  return {
    id: guestId,
    name,
    contact,
    company,
    status: invitationStatus
  };
}

function getSpaceBadgeTypeLabel(spaceType, t) {
  const normalizedType = normalizeSpaceType(spaceType);
  if (normalizedType === "room") {
    return t("event_spaces_type_room");
  }
  if (normalizedType === "vehicle") {
    return t("event_spaces_type_vehicle");
  }
  return t("event_spaces_type_table");
}

export function EventSpacesModuleCard({
  t,
  selectedEventDetail,
  selectedEventDetailGuests
}) {
  const spaceModalTitleId = "event-spaces-modal-title";
  const eventId = toSafeString(selectedEventDetail?.id);

  const [spaces, setSpaces] = useState([]);
  const [assignments, setAssignments] = useState([]);
  const [isLoadingSpaces, setIsLoadingSpaces] = useState(false);
  const [feedback, setFeedback] = useState("");
  const [feedbackType, setFeedbackType] = useState("info");

  const [isSpaceModalOpen, setIsSpaceModalOpen] = useState(false);
  const [editingSpaceId, setEditingSpaceId] = useState("");
  const [spaceNameDraft, setSpaceNameDraft] = useState("");
  const [spaceCapacityDraft, setSpaceCapacityDraft] = useState("");
  const [spaceTypeDraft, setSpaceTypeDraft] = useState("table");
  const [isSavingSpace, setIsSavingSpace] = useState(false);
  const [deletingSpaceId, setDeletingSpaceId] = useState("");

  const [assigningGuestPickerId, setAssigningGuestPickerId] = useState("");
  const [assignTargetSpaceId, setAssignTargetSpaceId] = useState("");
  const [assigningGuestId, setAssigningGuestId] = useState("");
  const [unassigningAssignmentId, setUnassigningAssignmentId] = useState("");

  const confirmedGuests = useMemo(
    () =>
      (Array.isArray(selectedEventDetailGuests) ? selectedEventDetailGuests : [])
        .map((row) => normalizeGuestFromRow(row, t))
        .filter((guest) => guest.status === "yes" && Boolean(guest.id)),
    [selectedEventDetailGuests, t]
  );

  const guestById = useMemo(
    () =>
      confirmedGuests.reduce((accumulator, guest) => {
        accumulator[guest.id] = guest;
        return accumulator;
      }, {}),
    [confirmedGuests]
  );

  const assignmentByGuestId = useMemo(
    () =>
      (Array.isArray(assignments) ? assignments : []).reduce((accumulator, assignment) => {
        const guestId = toSafeString(assignment?.guest_id);
        if (!guestId) {
          return accumulator;
        }
        accumulator[guestId] = assignment;
        return accumulator;
      }, {}),
    [assignments]
  );

  const pendingGuests = useMemo(
    () => confirmedGuests.filter((guest) => !assignmentByGuestId[guest.id]),
    [confirmedGuests, assignmentByGuestId]
  );

  const usedCountBySpaceId = useMemo(
    () =>
      (Array.isArray(assignments) ? assignments : []).reduce((accumulator, assignment) => {
        const spaceId = toSafeString(assignment?.space_id);
        if (!spaceId) {
          return accumulator;
        }
        accumulator[spaceId] = (accumulator[spaceId] || 0) + 1;
        return accumulator;
      }, {}),
    [assignments]
  );

  const totalPendingCount = pendingGuests.length;
  const totalSpacesCount = Array.isArray(spaces) ? spaces.length : 0;
  const totalAssignedCount = Array.isArray(assignments) ? assignments.length : 0;
  const totalCapacity = useMemo(
    () =>
      (Array.isArray(spaces) ? spaces : []).reduce((accumulator, space) => {
        const capacity = toPositiveIntegerOrNull(space?.capacity);
        return accumulator + (capacity || 0);
      }, 0),
    [spaces]
  );
  const occupancyLabel = totalCapacity > 0 ? `${totalAssignedCount}/${totalCapacity}` : `${totalAssignedCount}/∞`;

  const spacesWithGuests = useMemo(
    () =>
      (Array.isArray(spaces) ? spaces : []).map((space) => {
        const spaceId = toSafeString(space?.id);
        const members = (Array.isArray(assignments) ? assignments : [])
          .filter((assignment) => toSafeString(assignment?.space_id) === spaceId)
          .map((assignment) => {
            const guestId = toSafeString(assignment?.guest_id);
            const guest = guestById[guestId];
            return {
              assignmentId: toSafeString(assignment?.id),
              guestId,
              name: toSafeString(guest?.name || t("field_guest")) || t("field_guest"),
              contact: toSafeString(guest?.contact),
              company: toSafeString(guest?.company)
            };
          });
        return {
          ...space,
          members
        };
      }),
    [spaces, assignments, guestById, t]
  );

  const loadSpaces = useCallback(async () => {
    if (!eventId || !supabase) {
      setSpaces([]);
      setAssignments([]);
      setIsLoadingSpaces(false);
      return;
    }

    const listUrl = buildSpacesApiUrl();
    if (!listUrl) {
      setFeedbackType("error");
      setFeedback(t("event_spaces_load_error"));
      return;
    }

    setIsLoadingSpaces(true);
    try {
      const { data: sessionPayload, error: sessionError } = await supabase.auth.getSession();
      if (sessionError || !sessionPayload?.session?.access_token) {
        throw new Error(t("event_spaces_load_error"));
      }

      const url = new URL(listUrl, window.location.origin);
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

      setSpaces(Array.isArray(payload?.spaces) ? payload.spaces : []);
      setAssignments(Array.isArray(payload?.assignments) ? payload.assignments : []);
    } catch (error) {
      console.error("[event-spaces] load error", error);
      setSpaces([]);
      setAssignments([]);
      setFeedbackType("error");
      setFeedback(t("event_spaces_load_error"));
    } finally {
      setIsLoadingSpaces(false);
    }
  }, [eventId, t]);

  useEffect(() => {
    setFeedback("");
    setFeedbackType("info");
    void loadSpaces();
  }, [loadSpaces]);

  const resetSpaceModal = useCallback(() => {
    setIsSpaceModalOpen(false);
    setEditingSpaceId("");
    setSpaceNameDraft("");
    setSpaceCapacityDraft("");
    setSpaceTypeDraft("table");
  }, []);

  useEffect(() => {
    if (!isSpaceModalOpen) {
      return undefined;
    }

    const handleGlobalKeyDown = (event) => {
      if (event.key === "Escape" || event.key === "Esc") {
        event.preventDefault();
        resetSpaceModal();
      }
    };

    window.addEventListener("keydown", handleGlobalKeyDown);
    return () => {
      window.removeEventListener("keydown", handleGlobalKeyDown);
    };
  }, [isSpaceModalOpen, resetSpaceModal]);

  const handleOpenCreateSpaceModal = () => {
    setFeedback("");
    setFeedbackType("info");
    setEditingSpaceId("");
    setSpaceNameDraft("");
    setSpaceCapacityDraft("");
    setSpaceTypeDraft("table");
    setIsSpaceModalOpen(true);
  };

  const handleOpenEditSpaceModal = (space) => {
    setFeedback("");
    setFeedbackType("info");
    setEditingSpaceId(toSafeString(space?.id));
    setSpaceNameDraft(toSafeString(space?.name));
    setSpaceCapacityDraft(
      Number.isFinite(Number(space?.capacity)) && Number(space.capacity) > 0
        ? String(Math.round(Number(space.capacity)))
        : ""
    );
    setSpaceTypeDraft(normalizeSpaceType(space?.type));
    setIsSpaceModalOpen(true);
  };

  const handleSaveSpace = async () => {
    const normalizedName = toSafeString(spaceNameDraft);
    if (!normalizedName) {
      setFeedbackType("error");
      setFeedback(t("event_spaces_name_required"));
      return;
    }
    if (!eventId || !supabase) {
      return;
    }

    const capacity = toPositiveIntegerOrNull(spaceCapacityDraft);
    if (spaceCapacityDraft !== "" && capacity == null) {
      setFeedbackType("error");
      setFeedback(t("event_spaces_capacity_invalid"));
      return;
    }

    const payload = {
      eventId,
      name: normalizedName,
      capacity,
      type: normalizeSpaceType(spaceTypeDraft)
    };

    const isEditing = Boolean(toSafeString(editingSpaceId));
    const endpointUrl = isEditing
      ? buildSpacesApiUrl(toSafeString(editingSpaceId))
      : buildSpacesApiUrl();
    if (!endpointUrl) {
      setFeedbackType("error");
      setFeedback(t("event_spaces_save_error"));
      return;
    }

    setIsSavingSpace(true);
    setFeedback("");
    setFeedbackType("info");
    try {
      const { data: sessionPayload, error: sessionError } = await supabase.auth.getSession();
      if (sessionError || !sessionPayload?.session?.access_token) {
        throw new Error(t("event_spaces_save_error"));
      }

      const response = await fetch(endpointUrl, {
        method: isEditing ? "PUT" : "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
          Authorization: `Bearer ${sessionPayload.session.access_token}`
        },
        body: JSON.stringify(payload)
      });
      const responsePayload = await response.json().catch(() => ({}));
      if (!response.ok || responsePayload?.success === false) {
        throw new Error(toSafeString(responsePayload?.error) || `HTTP ${response.status}`);
      }

      setFeedbackType("success");
      setFeedback(t("event_spaces_save_success"));
      resetSpaceModal();
      await loadSpaces();
    } catch (error) {
      console.error("[event-spaces] save error", error);
      setFeedbackType("error");
      setFeedback(t("event_spaces_save_error"));
    } finally {
      setIsSavingSpace(false);
    }
  };

  const handleDeleteSpace = async (spaceId) => {
    const normalizedSpaceId = toSafeString(spaceId);
    if (!normalizedSpaceId || !supabase) {
      return;
    }
    if (!window.confirm(t("event_spaces_delete_confirm"))) {
      return;
    }

    const endpointUrl = buildSpacesApiUrl(normalizedSpaceId);
    if (!endpointUrl) {
      setFeedbackType("error");
      setFeedback(t("event_spaces_delete_error"));
      return;
    }

    setDeletingSpaceId(normalizedSpaceId);
    setFeedback("");
    setFeedbackType("info");
    try {
      const { data: sessionPayload, error: sessionError } = await supabase.auth.getSession();
      if (sessionError || !sessionPayload?.session?.access_token) {
        throw new Error(t("event_spaces_delete_error"));
      }

      const response = await fetch(endpointUrl, {
        method: "DELETE",
        headers: {
          Accept: "application/json",
          Authorization: `Bearer ${sessionPayload.session.access_token}`
        }
      });
      const responsePayload = await response.json().catch(() => ({}));
      if (!response.ok || responsePayload?.success === false) {
        throw new Error(toSafeString(responsePayload?.error) || `HTTP ${response.status}`);
      }

      setFeedbackType("success");
      setFeedback(t("event_spaces_delete_success"));
      await loadSpaces();
    } catch (error) {
      console.error("[event-spaces] delete error", error);
      setFeedbackType("error");
      setFeedback(t("event_spaces_delete_error"));
    } finally {
      setDeletingSpaceId("");
    }
  };

  const getAvailableSpacesForGuest = useCallback(
    (guestId) => {
      const normalizedGuestId = toSafeString(guestId);
      return (Array.isArray(spaces) ? spaces : []).filter((space) => {
        const spaceId = toSafeString(space?.id);
        if (!spaceId) {
          return false;
        }
        const capacity = toPositiveIntegerOrNull(space?.capacity);
        if (!capacity) {
          return true;
        }
        const currentUsed = Number(usedCountBySpaceId[spaceId] || 0);
        const guestCurrentAssignment = assignmentByGuestId[normalizedGuestId];
        const isAlreadyAssignedHere = toSafeString(guestCurrentAssignment?.space_id) === spaceId;
        return isAlreadyAssignedHere || currentUsed < capacity;
      });
    },
    [spaces, usedCountBySpaceId, assignmentByGuestId]
  );

  const handleOpenAssignPicker = (guestId) => {
    const normalizedGuestId = toSafeString(guestId);
    if (!normalizedGuestId) {
      return;
    }
    const availableSpaces = getAvailableSpacesForGuest(normalizedGuestId);
    setAssigningGuestPickerId(normalizedGuestId);
    setAssignTargetSpaceId(toSafeString(availableSpaces[0]?.id));
  };

  const handleAssignGuest = async (guestId) => {
    const normalizedGuestId = toSafeString(guestId);
    const normalizedSpaceId = toSafeString(assignTargetSpaceId);
    if (!normalizedGuestId || !normalizedSpaceId || !supabase) {
      setFeedbackType("error");
      setFeedback(t("event_spaces_assign_error"));
      return;
    }

    const endpointUrl = buildSpacesApiUrl("assignments");
    if (!endpointUrl) {
      setFeedbackType("error");
      setFeedback(t("event_spaces_assign_error"));
      return;
    }

    setAssigningGuestId(normalizedGuestId);
    setFeedback("");
    setFeedbackType("info");
    try {
      const { data: sessionPayload, error: sessionError } = await supabase.auth.getSession();
      if (sessionError || !sessionPayload?.session?.access_token) {
        throw new Error(t("event_spaces_assign_error"));
      }

      const response = await fetch(endpointUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
          Authorization: `Bearer ${sessionPayload.session.access_token}`
        },
        body: JSON.stringify({
          spaceId: normalizedSpaceId,
          guestId: normalizedGuestId
        })
      });
      const responsePayload = await response.json().catch(() => ({}));
      if (!response.ok || responsePayload?.success === false) {
        throw new Error(toSafeString(responsePayload?.error) || `HTTP ${response.status}`);
      }

      setFeedbackType("success");
      setFeedback(t("event_spaces_assign_success"));
      setAssigningGuestPickerId("");
      setAssignTargetSpaceId("");
      await loadSpaces();
    } catch (error) {
      console.error("[event-spaces] assign error", error);
      setFeedbackType("error");
      setFeedback(t("event_spaces_assign_error"));
    } finally {
      setAssigningGuestId("");
    }
  };

  const handleUnassignGuest = async (assignmentId) => {
    const normalizedAssignmentId = toSafeString(assignmentId);
    if (!normalizedAssignmentId || !supabase) {
      setFeedbackType("error");
      setFeedback(t("event_spaces_unassign_error"));
      return;
    }

    const endpointUrl = buildSpacesApiUrl(`assignments/${normalizedAssignmentId}`);
    if (!endpointUrl) {
      setFeedbackType("error");
      setFeedback(t("event_spaces_unassign_error"));
      return;
    }

    setUnassigningAssignmentId(normalizedAssignmentId);
    setFeedback("");
    setFeedbackType("info");
    try {
      const { data: sessionPayload, error: sessionError } = await supabase.auth.getSession();
      if (sessionError || !sessionPayload?.session?.access_token) {
        throw new Error(t("event_spaces_unassign_error"));
      }

      const response = await fetch(endpointUrl, {
        method: "DELETE",
        headers: {
          Accept: "application/json",
          Authorization: `Bearer ${sessionPayload.session.access_token}`
        }
      });
      const responsePayload = await response.json().catch(() => ({}));
      if (!response.ok || responsePayload?.success === false) {
        throw new Error(toSafeString(responsePayload?.error) || `HTTP ${response.status}`);
      }

      setFeedbackType("success");
      setFeedback(t("event_spaces_unassign_success"));
      await loadSpaces();
    } catch (error) {
      console.error("[event-spaces] unassign error", error);
      setFeedbackType("error");
      setFeedback(t("event_spaces_unassign_error"));
    } finally {
      setUnassigningAssignmentId("");
    }
  };

  return (
    <article className="order-7 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden p-5 flex flex-col gap-5">
      <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-2">
            <Icon name="location" className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
            <p className="text-sm font-black text-gray-900 dark:text-white">{t("event_spaces_title")}</p>
          </div>
          <p className="text-xs text-gray-600 dark:text-gray-300 leading-relaxed max-w-2xl">{t("event_spaces_hint")}</p>
        </div>

        <div className="grid grid-cols-3 gap-3 w-full md:w-auto md:min-w-[280px]">
          <article className="rounded-xl border border-black/5 dark:border-white/10 bg-white/70 dark:bg-black/20 px-3 py-2">
            <p className="text-[10px] font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">
              {t("event_spaces_stats_pending")}
            </p>
            <p className="text-xl font-black text-gray-900 dark:text-white leading-none mt-1">{totalPendingCount}</p>
          </article>
          <article className="rounded-xl border border-black/5 dark:border-white/10 bg-white/70 dark:bg-black/20 px-3 py-2">
            <p className="text-[10px] font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">
              {t("event_spaces_stats_spaces")}
            </p>
            <p className="text-xl font-black text-gray-900 dark:text-white leading-none mt-1">{totalSpacesCount}</p>
          </article>
          <article className="rounded-xl border border-black/5 dark:border-white/10 bg-white/70 dark:bg-black/20 px-3 py-2">
            <p className="text-[10px] font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">
              {t("event_spaces_stats_occupancy")}
            </p>
            <p className="text-xl font-black text-gray-900 dark:text-white leading-none mt-1">{occupancyLabel}</p>
          </article>
        </div>
      </div>

      {feedback ? <InlineMessage type={feedbackType} text={feedback} /> : null}

      <div className="rounded-2xl border border-black/5 dark:border-white/10 bg-white/70 dark:bg-black/20 p-4 md:p-5 flex flex-col gap-6">
        <section className="flex flex-col gap-3">
          <div className="flex items-center gap-2">
            <Icon name="users" className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
            <p className="text-sm font-black text-gray-900 dark:text-white">{t("event_spaces_unassigned_title")}</p>
          </div>

          {isLoadingSpaces ? (
            <p className="text-xs text-gray-500 dark:text-gray-400 italic">{t("event_spaces_loading")}</p>
          ) : pendingGuests.length === 0 ? (
            <p className="text-xs text-gray-500 dark:text-gray-400 italic">{t("event_spaces_unassigned_empty")}</p>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
              {pendingGuests.map((guest) => {
                const availableSpaces = getAvailableSpacesForGuest(guest.id);
                const isAssigningThisGuest = assigningGuestId === guest.id;
                const isPickerOpen = assigningGuestPickerId === guest.id;
                return (
                  <article
                    key={guest.id}
                    className="rounded-xl border border-black/5 dark:border-white/10 bg-white/80 dark:bg-gray-900/40 px-3 py-3 flex items-center gap-3"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold text-gray-900 dark:text-white truncate">{guest.name}</p>
                      <p className="text-[11px] text-gray-500 dark:text-gray-400 truncate">
                        {guest.company || guest.contact || t("event_spaces_no_company")}
                      </p>
                    </div>

                    {!isPickerOpen ? (
                      <button
                        className="inline-flex items-center justify-center gap-2 rounded-xl border border-blue-200 dark:border-blue-700/40 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 px-3 py-1.5 text-xs font-bold transition-colors hover:bg-blue-100 dark:hover:bg-blue-900/30"
                        type="button"
                        onClick={() => handleOpenAssignPicker(guest.id)}
                        disabled={availableSpaces.length === 0}
                      >
                        <Icon name="plus" className="w-3.5 h-3.5" />
                        <span>{t("event_spaces_assign_action")}</span>
                      </button>
                    ) : (
                      <div className="flex items-center gap-2">
                        <select
                          className="rounded-lg border border-black/10 dark:border-white/15 bg-white dark:bg-gray-900 px-2 py-1.5 text-xs font-semibold text-gray-900 dark:text-white outline-none focus:border-blue-500"
                          value={assignTargetSpaceId}
                          onChange={(event) => setAssignTargetSpaceId(event.target.value)}
                        >
                          <option value="">{t("event_spaces_select_space_placeholder")}</option>
                          {availableSpaces.map((space) => (
                            <option key={space.id} value={space.id}>
                              {space.name}
                            </option>
                          ))}
                        </select>
                        <button
                          className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
                          type="button"
                          onClick={() => handleAssignGuest(guest.id)}
                          disabled={!assignTargetSpaceId || isAssigningThisGuest}
                          aria-label={t("event_spaces_assign_confirm")}
                          title={t("event_spaces_assign_confirm")}
                        >
                          <Icon name={isAssigningThisGuest ? "loader" : "check"} className={`w-4 h-4 ${isAssigningThisGuest ? "animate-spin" : ""}`} />
                        </button>
                        <button
                          className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-black/10 dark:border-white/15 text-gray-600 dark:text-gray-300 hover:bg-black/5 dark:hover:bg-white/10 transition-colors"
                          type="button"
                          onClick={() => {
                            setAssigningGuestPickerId("");
                            setAssignTargetSpaceId("");
                          }}
                          aria-label={t("event_spaces_assign_cancel")}
                          title={t("event_spaces_assign_cancel")}
                        >
                          <Icon name="close" className="w-4 h-4" />
                        </button>
                      </div>
                    )}
                  </article>
                );
              })}
            </div>
          )}
        </section>

        <section className="flex flex-col gap-3">
          <div className="flex items-center gap-2">
            <Icon name="folder" className="w-4 h-4 text-purple-600 dark:text-purple-300" />
            <p className="text-sm font-black text-gray-900 dark:text-white">{t("event_spaces_assigned_title")}</p>
          </div>

          {isLoadingSpaces ? (
            <p className="text-xs text-gray-500 dark:text-gray-400 italic">{t("event_spaces_loading")}</p>
          ) : spacesWithGuests.length === 0 ? (
            <p className="text-xs text-gray-500 dark:text-gray-400 italic">{t("event_spaces_no_spaces")}</p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {spacesWithGuests.map((space) => {
                const spaceId = toSafeString(space?.id);
                const used = Number(usedCountBySpaceId[spaceId] || 0);
                const capacity = toPositiveIntegerOrNull(space?.capacity);
                const occupancyPercent =
                  capacity && capacity > 0 ? Math.max(0, Math.min(100, Math.round((used / capacity) * 100))) : 0;
                const isFull = Boolean(capacity && used >= capacity);
                const isDeletingSpace = deletingSpaceId === spaceId;

                return (
                  <article
                    key={spaceId}
                    className="rounded-2xl border border-black/5 dark:border-white/10 bg-white/80 dark:bg-gray-900/40 p-4 flex flex-col gap-3"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-lg font-black text-gray-900 dark:text-white truncate">{space.name}</p>
                        <p className="text-[11px] uppercase tracking-wider text-gray-500 dark:text-gray-400 mt-1">
                          {getSpaceBadgeTypeLabel(space.type, t)}
                        </p>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-black/10 dark:border-white/15 text-gray-600 dark:text-gray-300 hover:bg-black/5 dark:hover:bg-white/10 transition-colors"
                          type="button"
                          onClick={() => handleOpenEditSpaceModal(space)}
                          aria-label={t("event_spaces_edit_action")}
                          title={t("event_spaces_edit_action")}
                        >
                          <Icon name="edit" className="w-4 h-4" />
                        </button>
                        <button
                          className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-red-200/80 dark:border-red-700/40 text-red-600 dark:text-red-300 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
                          type="button"
                          onClick={() => handleDeleteSpace(spaceId)}
                          disabled={isDeletingSpace}
                          aria-label={t("event_spaces_delete_action")}
                          title={t("event_spaces_delete_action")}
                        >
                          <Icon name={isDeletingSpace ? "loader" : "trash"} className={`w-4 h-4 ${isDeletingSpace ? "animate-spin" : ""}`} />
                        </button>
                      </div>
                    </div>

                    <div className="flex items-center justify-between gap-3">
                      <span className="text-[11px] font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                        {t("event_spaces_capacity_label")}
                      </span>
                      <span
                        className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-black ${
                          isFull
                            ? "border-red-300 text-red-600 dark:border-red-700/40 dark:text-red-300"
                            : "border-gray-300 text-gray-700 dark:border-gray-600 dark:text-gray-200"
                        }`}
                      >
                        {capacity ? `${used}/${capacity}` : `${used}/∞`}
                      </span>
                    </div>

                    <div className="h-1.5 w-full rounded-full bg-gray-200 dark:bg-gray-700 overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all ${isFull ? "bg-red-500" : "bg-indigo-500"}`}
                        style={{ width: `${capacity ? occupancyPercent : 0}%` }}
                      />
                    </div>

                    {space.members.length === 0 ? (
                      <p className="text-xs text-gray-500 dark:text-gray-400 italic">{t("event_spaces_space_empty")}</p>
                    ) : (
                      <ul className="flex flex-col gap-2">
                        {space.members.map((member) => {
                          const isUnassigning = unassigningAssignmentId === member.assignmentId;
                          return (
                            <li
                              key={member.assignmentId}
                              className="rounded-lg border border-black/5 dark:border-white/10 bg-white/90 dark:bg-black/20 px-2.5 py-2 flex items-center gap-2"
                            >
                              <div className="min-w-0 flex-1">
                                <p className="text-sm font-semibold text-gray-900 dark:text-white truncate">{member.name}</p>
                                <p className="text-[11px] text-gray-500 dark:text-gray-400 truncate">
                                  {member.company || member.contact || t("event_spaces_no_company")}
                                </p>
                              </div>
                              <button
                                className="inline-flex h-7 w-7 items-center justify-center rounded-md border border-red-200/80 dark:border-red-700/40 text-red-600 dark:text-red-300 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
                                type="button"
                                onClick={() => handleUnassignGuest(member.assignmentId)}
                                disabled={isUnassigning}
                                aria-label={t("event_spaces_remove_assignment_action")}
                                title={t("event_spaces_remove_assignment_action")}
                              >
                                <Icon name={isUnassigning ? "loader" : "close"} className={`w-3.5 h-3.5 ${isUnassigning ? "animate-spin" : ""}`} />
                              </button>
                            </li>
                          );
                        })}
                      </ul>
                    )}
                  </article>
                );
              })}
            </div>
          )}
        </section>
      </div>

      <button
        className="w-full rounded-xl border border-indigo-300/70 dark:border-indigo-700/50 bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-900/20 dark:hover:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 font-black py-2.5 px-4 text-sm transition-colors inline-flex items-center justify-center gap-2"
        type="button"
        onClick={handleOpenCreateSpaceModal}
      >
        <Icon name="plus" className="w-4 h-4" />
        <span>{t("event_spaces_add_action")}</span>
      </button>

      {isSpaceModalOpen && typeof document !== "undefined"
        ? createPortal(
            <div
              className="fixed inset-0 z-[100] w-screen h-screen bg-black/40 backdrop-blur-sm flex items-center justify-center p-4"
              role="dialog"
              aria-modal="true"
              aria-labelledby={spaceModalTitleId}
            >
          <div className="w-full max-w-md rounded-2xl border border-black/10 dark:border-white/10 bg-white dark:bg-gray-900 shadow-2xl p-5 flex flex-col gap-4">
            <div className="flex items-center justify-between gap-2">
              <p id={spaceModalTitleId} className="text-base font-black text-gray-900 dark:text-white">
                {editingSpaceId ? t("event_spaces_edit_modal_title") : t("event_spaces_add_modal_title")}
              </p>
              <button
                className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-black/10 dark:border-white/10 text-gray-600 dark:text-gray-300 hover:bg-black/5 dark:hover:bg-white/10 transition-colors"
                type="button"
                onClick={resetSpaceModal}
                aria-label={t("cancel_action")}
                title={t("cancel_action")}
              >
                <Icon name="close" className="w-4 h-4" />
              </button>
            </div>

            <label className="flex flex-col gap-1.5">
              <span className="text-[11px] font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                {t("event_spaces_name_label")}
              </span>
              <input
                className="w-full rounded-xl border border-black/10 dark:border-white/15 bg-white dark:bg-gray-950 px-3 py-2.5 text-sm font-semibold text-gray-900 dark:text-white outline-none focus:border-blue-500 transition-colors"
                type="text"
                value={spaceNameDraft}
                placeholder={t("event_spaces_name_placeholder")}
                onChange={(event) => setSpaceNameDraft(event.target.value)}
              />
            </label>

            <div className="grid grid-cols-2 gap-3">
              <label className="flex flex-col gap-1.5">
                <span className="text-[11px] font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                  {t("event_spaces_capacity_label")}
                </span>
                <input
                  className="w-full rounded-xl border border-black/10 dark:border-white/15 bg-white dark:bg-gray-950 px-3 py-2.5 text-sm font-semibold text-gray-900 dark:text-white outline-none focus:border-blue-500 transition-colors"
                  type="number"
                  min="1"
                  step="1"
                  value={spaceCapacityDraft}
                  placeholder={t("event_spaces_capacity_placeholder")}
                  onChange={(event) => setSpaceCapacityDraft(event.target.value)}
                />
              </label>
              <label className="flex flex-col gap-1.5">
                <span className="text-[11px] font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                  {t("event_spaces_type_label")}
                </span>
                <select
                  className="w-full rounded-xl border border-black/10 dark:border-white/15 bg-white dark:bg-gray-950 px-3 py-2.5 text-sm font-semibold text-gray-900 dark:text-white outline-none focus:border-blue-500 transition-colors"
                  value={spaceTypeDraft}
                  onChange={(event) => setSpaceTypeDraft(event.target.value)}
                >
                  <option value="table">{t("event_spaces_type_table")}</option>
                  <option value="room">{t("event_spaces_type_room")}</option>
                  <option value="vehicle">{t("event_spaces_type_vehicle")}</option>
                </select>
              </label>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                className="rounded-xl border border-black/10 dark:border-white/15 px-3 py-2 text-xs font-bold text-gray-700 dark:text-gray-200 hover:bg-black/5 dark:hover:bg-white/10 transition-colors"
                type="button"
                onClick={resetSpaceModal}
                disabled={isSavingSpace}
              >
                {t("cancel_action")}
              </button>
              <button
                className="rounded-xl bg-blue-600 hover:bg-blue-700 text-white px-3 py-2 text-xs font-black transition-colors inline-flex items-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed"
                type="button"
                onClick={handleSaveSpace}
                disabled={isSavingSpace}
              >
                <Icon name={isSavingSpace ? "loader" : "check"} className={`w-3.5 h-3.5 ${isSavingSpace ? "animate-spin" : ""}`} />
                <span>{t("event_spaces_save_action")}</span>
              </button>
            </div>
          </div>
        </div>,
            document.body
          )
        : null}
    </article>
  );
}
