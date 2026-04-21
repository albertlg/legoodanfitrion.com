import React, { useCallback, useEffect, useMemo, useState } from "react";
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
const MEALS_API_BASE_URL = String(configuredApiUrl || fallbackApiUrl).replace(/\/+$/, "");
const DEFAULT_COURSE_KEY = "general";

function buildMealsApiUrl(resource = "") {
  const normalizedBase = String(MEALS_API_BASE_URL || "").trim().replace(/\/+$/, "");
  if (!normalizedBase) {
    return "";
  }
  const normalizedResource = String(resource || "").trim().replace(/^\/+/, "");
  if (!normalizedResource) {
    return /(^|\/)api$/i.test(normalizedBase)
      ? `${normalizedBase}/meals`
      : `${normalizedBase}/api/meals`;
  }

  return /(^|\/)api$/i.test(normalizedBase)
    ? `${normalizedBase}/meals/${normalizedResource}`
    : `${normalizedBase}/api/meals/${normalizedResource}`;
}

function toSafeString(value) {
  return String(value || "").trim();
}

function toNullableString(value) {
  const normalized = toSafeString(value);
  return normalized || null;
}

function normalizeCourseKey(value) {
  const normalized = toSafeString(value)
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s_-]/gu, "")
    .replace(/[\s-]+/g, "_")
    .replace(/_+/g, "_")
    .replace(/^_+|_+$/g, "");
  return normalized || DEFAULT_COURSE_KEY;
}

function humanizeCourseKey(value) {
  return toSafeString(value)
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function resolveCourseLabel(optionRow, t) {
  const explicit = toSafeString(optionRow?.course_label);
  if (explicit) {
    return explicit;
  }
  const normalizedCourse = normalizeCourseKey(optionRow?.course_key);
  if (normalizedCourse === DEFAULT_COURSE_KEY) {
    return t("event_meals_course_default_label");
  }
  return humanizeCourseKey(normalizedCourse) || t("event_meals_course_default_label");
}

function normalizeGuestFromRow(guestRow, t) {
  const invitationStatus = toSafeString(guestRow?.invitation?.status).toLowerCase();
  const guestId = toSafeString(guestRow?.guest?.id || guestRow?.invitation?.guest_id);
  const name = toSafeString(guestRow?.name || guestRow?.guest?.first_name || t("field_guest")) || t("field_guest");
  const subtitle =
    toSafeString(guestRow?.guest?.company_name) ||
    toSafeString(guestRow?.guest?.company) ||
    toSafeString(guestRow?.invitation?.invitee_email) ||
    toSafeString(guestRow?.guest?.email) ||
    toSafeString(guestRow?.contact);

  return {
    id: guestId,
    name,
    subtitle,
    status: invitationStatus
  };
}

function toMealOptionState(optionRow, t) {
  return {
    id: toSafeString(optionRow?.id),
    course_key: normalizeCourseKey(optionRow?.course_key),
    course_label: toNullableString(optionRow?.course_label) || resolveCourseLabel(optionRow, t),
    label: toSafeString(optionRow?.label),
    description: toNullableString(optionRow?.description),
    created_at: toNullableString(optionRow?.created_at),
    updated_at: toNullableString(optionRow?.updated_at)
  };
}

function toMealSelectionState(selectionRow) {
  return {
    id: toSafeString(selectionRow?.id),
    option_id: toNullableString(selectionRow?.option_id),
    guest_id: toSafeString(selectionRow?.guest_id),
    course_key: normalizeCourseKey(selectionRow?.course_key),
    created_at: toNullableString(selectionRow?.created_at),
    updated_at: toNullableString(selectionRow?.updated_at)
  };
}

function groupOptionsByCourse(options) {
  const courseMap = new Map();
  for (const optionItem of Array.isArray(options) ? options : []) {
    const optionId = toSafeString(optionItem?.id);
    const optionLabel = toSafeString(optionItem?.label);
    if (!optionId || !optionLabel) {
      continue;
    }
    const courseKey = normalizeCourseKey(optionItem?.course_key);
    const existing = courseMap.get(courseKey) || {
      courseKey,
      courseLabel: toSafeString(optionItem?.course_label),
      options: []
    };
    if (!existing.courseLabel) {
      existing.courseLabel = toSafeString(optionItem?.course_label);
    }
    existing.options.push(optionItem);
    courseMap.set(courseKey, existing);
  }

  return Array.from(courseMap.values()).sort((left, right) => {
    if (left.courseKey === DEFAULT_COURSE_KEY) {
      return -1;
    }
    if (right.courseKey === DEFAULT_COURSE_KEY) {
      return 1;
    }
    return left.courseLabel.localeCompare(right.courseLabel, undefined, { sensitivity: "base" });
  });
}

export function EventMealsModuleCard({
  t,
  isProfessionalEvent: isProfessionalEventProp = false,
  selectedEventDetail,
  selectedEventDetailGuests
}) {
  const eventId = toSafeString(selectedEventDetail?.id);
  const isProfessionalEvent = useMemo(
    () => Boolean(isProfessionalEventProp) || isProfessionalEventContext(selectedEventDetail),
    [isProfessionalEventProp, selectedEventDetail]
  );

  const [options, setOptions] = useState([]);
  const [selections, setSelections] = useState([]);
  const [isLoadingMeals, setIsLoadingMeals] = useState(false);
  const [feedback, setFeedback] = useState("");
  const [feedbackType, setFeedbackType] = useState("info");
  const [optionLabelDraft, setOptionLabelDraft] = useState("");
  const [optionDescriptionDraft, setOptionDescriptionDraft] = useState("");
  const [optionCourseDraft, setOptionCourseDraft] = useState("");
  const [isCreatingOption, setIsCreatingOption] = useState(false);
  const [deletingOptionId, setDeletingOptionId] = useState("");
  const [selectedGuestId, setSelectedGuestId] = useState("");
  const [savingSelectionKey, setSavingSelectionKey] = useState("");

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

  const optionsById = useMemo(
    () =>
      (Array.isArray(options) ? options : []).reduce((accumulator, optionItem) => {
        accumulator[optionItem.id] = optionItem;
        return accumulator;
      }, {}),
    [options]
  );

  const groupedCourses = useMemo(() => groupOptionsByCourse(options), [options]);
  const hasCourseGroups = groupedCourses.length > 1 || groupedCourses.some((course) => course.courseKey !== DEFAULT_COURSE_KEY);

  const selectionsByGuestCourse = useMemo(() => {
    const accumulator = {};
    for (const selectionItem of Array.isArray(selections) ? selections : []) {
      const guestId = toSafeString(selectionItem?.guest_id);
      const courseKey = normalizeCourseKey(selectionItem?.course_key);
      if (!guestId) {
        continue;
      }
      if (!accumulator[guestId]) {
        accumulator[guestId] = {};
      }
      accumulator[guestId][courseKey] = selectionItem;
    }
    return accumulator;
  }, [selections]);

  const selectedGuestSelections = selectedGuestId ? selectionsByGuestCourse[selectedGuestId] || {} : {};

  const votesByOptionId = useMemo(
    () =>
      (Array.isArray(selections) ? selections : []).reduce((accumulator, selectionItem) => {
        const optionId = toNullableString(selectionItem?.option_id);
        if (!optionId) {
          return accumulator;
        }
        accumulator[optionId] = (accumulator[optionId] || 0) + 1;
        return accumulator;
      }, {}),
    [selections]
  );

  const totalVotes = Array.isArray(selections) ? selections.length : 0;
  const expectedVotes = confirmedGuests.length * Math.max(1, groupedCourses.length);
  const totalPending = Math.max(0, expectedVotes - totalVotes);

  const loadMealsState = useCallback(async () => {
    if (!eventId || !supabase) {
      setOptions([]);
      setSelections([]);
      setIsLoadingMeals(false);
      return;
    }

    const endpointUrl = buildMealsApiUrl();
    if (!endpointUrl) {
      setFeedbackType("error");
      setFeedback(t("event_meals_load_error"));
      return;
    }

    setIsLoadingMeals(true);
    try {
      const { data: sessionPayload, error: sessionError } = await supabase.auth.getSession();
      if (sessionError || !sessionPayload?.session?.access_token) {
        throw new Error(t("event_meals_load_error"));
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

      setOptions(
        (Array.isArray(payload?.options) ? payload.options : [])
          .map((optionItem) => toMealOptionState(optionItem, t))
          .filter((optionItem) => Boolean(optionItem.id && optionItem.label))
      );
      setSelections(
        (Array.isArray(payload?.selections) ? payload.selections : [])
          .map(toMealSelectionState)
          .filter((selectionItem) => Boolean(selectionItem.guest_id))
      );
    } catch (error) {
      console.error("[event-meals] load error", error);
      setFeedbackType("error");
      setFeedback(t("event_meals_load_error"));
      setOptions([]);
      setSelections([]);
    } finally {
      setIsLoadingMeals(false);
    }
  }, [eventId, t]);

  useEffect(() => {
    setFeedback("");
    setFeedbackType("info");
    setOptionLabelDraft("");
    setOptionDescriptionDraft("");
    setOptionCourseDraft("");
    setDeletingOptionId("");
    setSavingSelectionKey("");
    void loadMealsState();
  }, [loadMealsState]);

  useEffect(() => {
    if (!confirmedGuests.length) {
      setSelectedGuestId("");
      return;
    }

    const normalizedCurrentGuest = toSafeString(selectedGuestId);
    const hasCurrent = confirmedGuests.some((guest) => guest.id === normalizedCurrentGuest);
    if (!hasCurrent) {
      setSelectedGuestId(toSafeString(confirmedGuests[0]?.id));
    }
  }, [confirmedGuests, selectedGuestId]);

  const setGuestSelectionInState = useCallback((guestId, courseKey, selectionPayload) => {
    const normalizedGuestId = toSafeString(guestId);
    const normalizedCourseKey = normalizeCourseKey(courseKey);
    if (!normalizedGuestId) {
      return;
    }

    setSelections((current) => {
      const source = Array.isArray(current) ? current : [];
      const filtered = source.filter(
        (item) =>
          !(toSafeString(item?.guest_id) === normalizedGuestId && normalizeCourseKey(item?.course_key) === normalizedCourseKey)
      );
      if (!selectionPayload) {
        return filtered;
      }
      return [...filtered, toMealSelectionState(selectionPayload)];
    });
  }, []);

  const handleCreateOption = async () => {
    const normalizedLabel = toSafeString(optionLabelDraft);
    if (!normalizedLabel) {
      setFeedbackType("error");
      setFeedback(t("event_meals_option_required"));
      return;
    }
    if (!eventId || !supabase) {
      return;
    }

    const endpointUrl = buildMealsApiUrl("options");
    if (!endpointUrl) {
      setFeedbackType("error");
      setFeedback(t("event_meals_create_error"));
      return;
    }

    setIsCreatingOption(true);
    setFeedback("");
    setFeedbackType("info");
    try {
      const { data: sessionPayload, error: sessionError } = await supabase.auth.getSession();
      if (sessionError || !sessionPayload?.session?.access_token) {
        throw new Error(t("event_meals_create_error"));
      }

      const normalizedCourseLabel = toNullableString(optionCourseDraft);
      const response = await fetch(endpointUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
          Authorization: `Bearer ${sessionPayload.session.access_token}`
        },
        body: JSON.stringify({
          eventId,
          courseKey: normalizedCourseLabel,
          courseLabel: normalizedCourseLabel,
          label: normalizedLabel,
          description: toNullableString(optionDescriptionDraft)
        })
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok || payload?.success === false) {
        throw new Error(toSafeString(payload?.error) || `HTTP ${response.status}`);
      }

      const createdOption = toMealOptionState(payload?.option, t);
      if (!createdOption.id) {
        throw new Error(t("event_meals_create_error"));
      }

      setOptions((current) => [...(Array.isArray(current) ? current : []), createdOption]);
      setOptionLabelDraft("");
      setOptionDescriptionDraft("");
      setOptionCourseDraft("");
      setFeedbackType("success");
      setFeedback(t("event_meals_create_success"));
    } catch (error) {
      console.error("[event-meals] create option error", error);
      setFeedbackType("error");
      setFeedback(t("event_meals_create_error"));
    } finally {
      setIsCreatingOption(false);
    }
  };

  const handleDeleteOption = async (optionId) => {
    const normalizedOptionId = toSafeString(optionId);
    if (!normalizedOptionId || !supabase) {
      return;
    }
    if (!window.confirm(t("event_meals_delete_confirm"))) {
      return;
    }

    const endpointUrl = buildMealsApiUrl(`options/${normalizedOptionId}`);
    if (!endpointUrl) {
      setFeedbackType("error");
      setFeedback(t("event_meals_delete_error"));
      return;
    }

    setDeletingOptionId(normalizedOptionId);
    setFeedback("");
    setFeedbackType("info");
    try {
      const { data: sessionPayload, error: sessionError } = await supabase.auth.getSession();
      if (sessionError || !sessionPayload?.session?.access_token) {
        throw new Error(t("event_meals_delete_error"));
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

      setFeedbackType("success");
      setFeedback(t("event_meals_delete_success"));
      await loadMealsState();
    } catch (error) {
      console.error("[event-meals] delete option error", error);
      setFeedbackType("error");
      setFeedback(t("event_meals_delete_error"));
    } finally {
      setDeletingOptionId("");
    }
  };

  const handleSelectOptionForGuest = async (optionId, courseKey) => {
    const guestId = toSafeString(selectedGuestId);
    const normalizedOptionId = toNullableString(optionId);
    const normalizedCourseKey = normalizeCourseKey(courseKey);
    if (!eventId || !supabase || !guestId) {
      return;
    }

    const endpointUrl = buildMealsApiUrl("selections");
    if (!endpointUrl) {
      setFeedbackType("error");
      setFeedback(t("event_meals_vote_error"));
      return;
    }

    const savingKey = `${guestId}:${normalizedCourseKey}`;
    setSavingSelectionKey(savingKey);
    setFeedback("");
    setFeedbackType("info");
    try {
      const { data: sessionPayload, error: sessionError } = await supabase.auth.getSession();
      if (sessionError || !sessionPayload?.session?.access_token) {
        throw new Error(t("event_meals_vote_error"));
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
          guestId,
          courseKey: normalizedCourseKey,
          optionId: normalizedOptionId
        })
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok || payload?.success === false) {
        throw new Error(toSafeString(payload?.error) || `HTTP ${response.status}`);
      }

      setGuestSelectionInState(guestId, normalizedCourseKey, payload?.selection || null);
      if (normalizedOptionId) {
        const selectedLabel = optionsById[normalizedOptionId]?.label;
        setFeedbackType("success");
        setFeedback(
          selectedLabel
            ? t("event_meals_vote_success").replace("{option}", selectedLabel)
            : t("event_meals_vote_success_generic")
        );
      } else {
        setFeedbackType("success");
        setFeedback(t("event_meals_vote_cleared"));
      }
    } catch (error) {
      console.error("[event-meals] selection error", error);
      setFeedbackType("error");
      setFeedback(t("event_meals_vote_error"));
    } finally {
      setSavingSelectionKey("");
    }
  };

  return (
    <article className="order-7 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden p-5 flex flex-col gap-5">
      <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-2">
            <Icon name="utensils" className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
            <p className="text-sm font-black text-gray-900 dark:text-white">{t("event_meals_title")}</p>
          </div>
          <p className="text-xs text-gray-600 dark:text-gray-300 leading-relaxed max-w-2xl">
            {t("event_meals_hint")}
          </p>
        </div>

        <div className="grid grid-cols-3 gap-3 w-full md:w-auto md:min-w-[280px]">
          <article className="rounded-xl border border-black/5 dark:border-white/10 bg-white/70 dark:bg-black/20 px-3 py-2">
            <p className="text-[10px] font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">
              {t("event_meals_stats_options")}
            </p>
            <p className="text-xl font-black text-gray-900 dark:text-white leading-none mt-1">{options.length}</p>
          </article>
          <article className="rounded-xl border border-black/5 dark:border-white/10 bg-white/70 dark:bg-black/20 px-3 py-2">
            <p className="text-[10px] font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">
              {t("event_meals_stats_votes")}
            </p>
            <p className="text-xl font-black text-emerald-600 dark:text-emerald-300 leading-none mt-1">{totalVotes}</p>
          </article>
          <article className="rounded-xl border border-black/5 dark:border-white/10 bg-white/70 dark:bg-black/20 px-3 py-2">
            <p className="text-[10px] font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">
              {t("event_meals_stats_pending")}
            </p>
            <p className="text-xl font-black text-amber-600 dark:text-amber-300 leading-none mt-1">{totalPending}</p>
          </article>
        </div>
      </div>

      {feedback ? <InlineMessage type={feedbackType} text={feedback} /> : null}

      <div className="rounded-2xl border border-black/5 dark:border-white/10 bg-white/70 dark:bg-black/20 p-4 md:p-5 flex flex-col gap-5">
        <section className="flex flex-col gap-3">
          <p className="text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">
            {t("event_meals_host_mode_title")}
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] gap-2">
            <input
              type="text"
              value={optionCourseDraft}
              placeholder={t("event_meals_course_placeholder")}
              onChange={(event) => setOptionCourseDraft(event.target.value)}
              className="rounded-xl border border-black/10 dark:border-white/15 bg-white dark:bg-gray-900 px-3 py-2.5 text-sm font-semibold text-gray-900 dark:text-white outline-none focus:border-blue-500 transition-all duration-200"
            />
            <input
              type="text"
              value={optionLabelDraft}
              placeholder={t(isProfessionalEvent ? "placeholder_meals_pro" : "placeholder_meals_personal")}
              onChange={(event) => setOptionLabelDraft(event.target.value)}
              className="rounded-xl border border-black/10 dark:border-white/15 bg-white dark:bg-gray-900 px-3 py-2.5 text-sm font-semibold text-gray-900 dark:text-white outline-none focus:border-blue-500 transition-all duration-200"
            />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-[minmax(0,1fr)_auto] gap-2">
            <input
              type="text"
              value={optionDescriptionDraft}
              placeholder={t("event_meals_option_description_placeholder")}
              onChange={(event) => setOptionDescriptionDraft(event.target.value)}
              className="rounded-xl border border-black/10 dark:border-white/15 bg-white dark:bg-gray-900 px-3 py-2.5 text-sm font-medium text-gray-900 dark:text-white outline-none focus:border-blue-500 transition-all duration-200"
            />
            <button
              type="button"
              onClick={handleCreateOption}
              disabled={isCreatingOption}
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-indigo-300/70 dark:border-indigo-700/50 bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-900/20 dark:hover:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 font-black py-2.5 px-4 text-sm transition-all duration-200 cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
            >
              <Icon name={isCreatingOption ? "loader" : "plus"} className={`w-4 h-4 ${isCreatingOption ? "animate-spin" : ""}`} />
              <span>{t("event_meals_add_option_action")}</span>
            </button>
          </div>

          {isLoadingMeals ? (
            <p className="text-xs text-gray-500 dark:text-gray-400 italic">{t("event_meals_loading")}</p>
          ) : options.length === 0 ? (
            <p className="text-xs text-gray-500 dark:text-gray-400 italic">{t("event_meals_options_empty")}</p>
          ) : (
            <div className="flex flex-col gap-3">
              {groupedCourses.map((courseGroup) => (
                <article key={courseGroup.courseKey} className="rounded-xl border border-black/5 dark:border-white/10 bg-white/70 dark:bg-gray-900/35 p-3 flex flex-col gap-2">
                  {hasCourseGroups ? (
                    <p className="text-[11px] font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                      {courseGroup.courseLabel || t("event_meals_course_default_label")}
                    </p>
                  ) : null}
                  <ul className="flex flex-col gap-2">
                    {courseGroup.options.map((optionItem) => {
                      const isDeletingOption = deletingOptionId === optionItem.id;
                      return (
                        <li
                          key={optionItem.id}
                          className="rounded-xl border border-black/5 dark:border-white/10 bg-white/80 dark:bg-gray-900/40 px-3 py-2.5 flex items-center gap-3"
                        >
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-bold text-gray-900 dark:text-white truncate">{optionItem.label}</p>
                            {optionItem.description ? (
                              <p className="text-[11px] text-gray-500 dark:text-gray-400 truncate">{optionItem.description}</p>
                            ) : null}
                          </div>
                          <span className="inline-flex items-center rounded-full border border-black/10 dark:border-white/15 px-2 py-0.5 text-[11px] font-bold text-gray-600 dark:text-gray-300">
                            {t("event_meals_votes_badge").replace("{count}", String(votesByOptionId[optionItem.id] || 0))}
                          </span>
                          <button
                            type="button"
                            disabled={isDeletingOption}
                            onClick={() => {
                              void handleDeleteOption(optionItem.id);
                            }}
                            aria-label={t("event_meals_delete_option_action")}
                            title={t("event_meals_delete_option_action")}
                            className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-red-200/80 dark:border-red-700/40 text-red-600 dark:text-red-300 hover:bg-red-50 dark:hover:bg-red-900/20 transition-all duration-200 cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
                          >
                            <Icon name={isDeletingOption ? "loader" : "trash"} className={`w-3.5 h-3.5 ${isDeletingOption ? "animate-spin" : ""}`} />
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                </article>
              ))}
            </div>
          )}
        </section>

        <section className="flex flex-col gap-3">
          <p className="text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">
            {t("event_meals_guest_mode_title")}
          </p>

          {confirmedGuests.length === 0 ? (
            <p className="text-xs text-gray-500 dark:text-gray-400 italic">{t("event_meals_guest_mode_empty")}</p>
          ) : (
            <>
              <label className="flex flex-col gap-1.5">
                <span className="text-[11px] font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                  {t("event_meals_select_guest_label")}
                </span>
                <select
                  value={selectedGuestId}
                  onChange={(event) => setSelectedGuestId(event.target.value)}
                  className="w-full rounded-xl border border-black/10 dark:border-white/15 bg-white dark:bg-gray-900 px-3 py-2.5 text-sm font-semibold text-gray-900 dark:text-white outline-none focus:border-blue-500 transition-all duration-200"
                >
                  {confirmedGuests.map((guest) => (
                    <option key={guest.id} value={guest.id}>
                      {guest.name}
                    </option>
                  ))}
                </select>
              </label>

              {options.length === 0 ? (
                <p className="text-xs text-gray-500 dark:text-gray-400 italic">{t("event_meals_guest_mode_no_options")}</p>
              ) : (
                <div className="flex flex-col gap-3">
                  {groupedCourses.map((courseGroup) => {
                    const currentSelection = selectedGuestSelections[courseGroup.courseKey];
                    const selectedOptionId = toNullableString(currentSelection?.option_id);
                    const saveKey = `${selectedGuestId}:${courseGroup.courseKey}`;
                    const isSavingCurrentCourse = savingSelectionKey === saveKey;

                    return (
                      <article key={`guest-course-${courseGroup.courseKey}`} className="rounded-xl border border-black/5 dark:border-white/10 bg-white/80 dark:bg-gray-900/35 p-3 flex flex-col gap-2">
                        {hasCourseGroups ? (
                          <p className="text-[11px] font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                            {courseGroup.courseLabel || t("event_meals_course_default_label")}
                          </p>
                        ) : null}
                        <div className="grid grid-cols-1 gap-2">
                          {courseGroup.options.map((optionItem) => {
                            const isSelected = selectedOptionId === optionItem.id;
                            return (
                              <button
                                key={optionItem.id}
                                type="button"
                                onClick={() => {
                                  if (isSavingCurrentCourse) {
                                    return;
                                  }
                                  void handleSelectOptionForGuest(optionItem.id, courseGroup.courseKey);
                                }}
                                disabled={isSavingCurrentCourse}
                                className={`w-full text-left rounded-xl border px-3 py-2.5 transition-all duration-200 cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed ${
                                  isSelected
                                    ? "border-indigo-500 bg-indigo-50 dark:border-indigo-400/70 dark:bg-indigo-900/25"
                                    : "border-black/10 dark:border-white/15 bg-white dark:bg-gray-900 hover:border-indigo-300 dark:hover:border-indigo-700/40"
                                }`}
                              >
                                <div className="flex items-start justify-between gap-3">
                                  <div className="min-w-0">
                                    <p
                                      className={`text-sm font-bold truncate ${
                                        isSelected ? "text-indigo-700 dark:text-indigo-300" : "text-gray-900 dark:text-white"
                                      }`}
                                    >
                                      {optionItem.label}
                                    </p>
                                    {optionItem.description ? (
                                      <p className="text-[11px] text-gray-500 dark:text-gray-400 truncate">{optionItem.description}</p>
                                    ) : null}
                                  </div>
                                  <span
                                    className={`inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full border ${
                                      isSelected
                                        ? "border-indigo-500 bg-indigo-500 text-white"
                                        : "border-gray-300 dark:border-gray-600 text-transparent"
                                    }`}
                                  >
                                    <Icon name={isSelected ? "check" : "plus"} className="w-3 h-3" />
                                  </span>
                                </div>
                              </button>
                            );
                          })}
                        </div>
                        <div className="flex items-center justify-end">
                          <button
                            type="button"
                            disabled={!selectedOptionId || isSavingCurrentCourse}
                            onClick={() => {
                              void handleSelectOptionForGuest(null, courseGroup.courseKey);
                            }}
                            className="inline-flex items-center justify-center gap-2 rounded-lg border border-black/10 dark:border-white/15 bg-white dark:bg-gray-900 text-gray-600 dark:text-gray-300 hover:bg-black/5 dark:hover:bg-white/10 px-3 py-1.5 text-xs font-bold transition-all duration-200 cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
                          >
                            <Icon name="close" className="w-3.5 h-3.5" />
                            <span>{t("event_meals_clear_selection_action")}</span>
                          </button>
                        </div>
                      </article>
                    );
                  })}
                </div>
              )}

              <div className="flex items-center justify-between gap-2">
                <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                  {selectedGuestId
                    ? t("event_meals_selected_guest_caption").replace(
                        "{guest}",
                        toSafeString(guestById[selectedGuestId]?.name || t("field_guest"))
                      )
                    : t("event_meals_select_guest_label")}
                </p>
              </div>
            </>
          )}
        </section>

        <section className="flex flex-col gap-2">
          <p className="text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">
            {t("event_meals_results_title")}
          </p>
          {totalVotes === 0 ? (
            <p className="text-xs text-gray-500 dark:text-gray-400 italic">{t("event_meals_results_empty")}</p>
          ) : (
            <div className="flex flex-col gap-2">
              {groupedCourses.map((courseGroup) => {
                const courseOptions = courseGroup.options
                  .map((optionItem) => ({
                    ...optionItem,
                    votes: Number(votesByOptionId[optionItem.id] || 0)
                  }))
                  .filter((optionItem) => optionItem.votes > 0)
                  .sort((left, right) => right.votes - left.votes);

                if (!courseOptions.length) {
                  return null;
                }

                return (
                  <div key={`summary-${courseGroup.courseKey}`} className="flex flex-wrap items-center gap-2">
                    {hasCourseGroups ? (
                      <span className="text-[11px] font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400 mr-1">
                        {courseGroup.courseLabel || t("event_meals_course_default_label")}
                      </span>
                    ) : null}
                    {courseOptions.map((optionItem) => (
                      <span
                        key={`summary-chip-${optionItem.id}`}
                        className="inline-flex items-center gap-1 rounded-full border border-emerald-200 dark:border-emerald-700/40 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-300 px-2.5 py-1 text-xs font-bold"
                      >
                        <span>{optionItem.votes}x</span>
                        <span className="truncate max-w-[180px]">{optionItem.label}</span>
                      </span>
                    ))}
                  </div>
                );
              })}
            </div>
          )}
        </section>
      </div>
    </article>
  );
}
