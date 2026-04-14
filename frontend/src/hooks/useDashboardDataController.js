import { useCallback, useState } from "react";
import { toCatalogLabel } from "../lib/guest-catalogs";
import { uniqueValues } from "../lib/formatters";
import {
  normalizeEmailKey,
  normalizePhoneKey,
  normalizeSensitiveRecord
} from "../lib/guest-helpers";
import { getHostPlanStateFromSnapshot } from "../lib/host-plan";
import { hasEventSettingsColumns, normalizeEventSettings } from "../lib/event-planner-helpers";
import { normalizeEventActiveModules, resolveEventModules } from "../lib/event-modules";
import {
  isCompatibilityError,
  isMissingRelationError,
  readEventSettingsCache
} from "../lib/system-helpers";

export function useDashboardDataController({
  supabase,
  sessionUserId,
  sessionUserEmail,
  language,
  t,
  appRoute,
  onPreferencesSynced,
  refreshSharedProfileData,
  setDashboardError,
  setEvents,
  setEventSettingsCacheById,
  setGuests,
  setInvitations,
  setEventPlannerSnapshotsByEventId,
  setEventPlannerSnapshotHistoryByEventId,
  setEventPlannerRegenerationByEventId,
  setEventPlannerRegenerationByEventIdByTab,
  setEventPlannerContextOverridesByEventId,
  setGuestPreferencesById,
  setGuestSensitiveById,
  setGuestHostConversionById,
  setEventDateOptions,
  setEventDateVotes,
  setReceivedInvitations,
  setHostProfileName,
  setHostProfilePhone,
  setHostProfileCity,
  setHostProfileCountry,
  setHostProfileRelationship,
  setHostProfileCreatedAt
}) {
  const [isLoading, setIsLoading] = useState(false);
  const loadDashboardData = useCallback(async () => {
    if (!supabase || !sessionUserId) {
      return;
    }
    setIsLoading(true);
    setDashboardError("");
    onPreferencesSynced?.();

    const routeEventDetailId =
      appRoute?.view === "events" && ["detail", "plan"].includes(String(appRoute?.workspace || "").trim())
        ? String(appRoute?.eventId || "").trim()
        : "";
    const routeGuestDetailId =
      appRoute?.view === "guests" && ["detail", "create"].includes(String(appRoute?.workspace || "").trim())
        ? String(appRoute?.guestId || "").trim()
        : "";

    const guestsPromise = supabase
      .from("guests")
      .select(
        "id, first_name, last_name, email, work_email, phone, relationship, city, country, address, postal_code, state_region, company, company_name, birthday, twitter, instagram, linkedin, last_meet_at, avatar_url, created_at"
      )
      .eq("host_user_id", sessionUserId)
      .order("created_at", { ascending: false })
      .limit(100);
    const hostProfilePromise = supabase
      .from("profiles")
      .select("full_name, phone, created_at")
      .eq("id", sessionUserId)
      .maybeSingle();

    const invitationsPromise = supabase
      .from("invitations")
      .select(
        "id, event_id, guest_id, status, invitee_email, public_token, created_at, responded_at, updated_at, response_note, rsvp_plus_one, rsvp_dietary_needs"
      )
      .eq("host_user_id", sessionUserId)
      .order("created_at", { ascending: false })
      .limit(100);
    const receivedInvitationsPromise = supabase.rpc("get_my_received_invitations");

    let { data: eventsData, error: eventsError } = await supabase
      .from("events")
      .select(
        "id, host_user_id, title, status, event_type, description, allow_plus_one, auto_reminders, dress_code, playlist_mode, schedule_mode, poll_status, expenses, photo_gallery_url, finance_mode, finance_fixed_price, finance_payment_info, finance_total_budget, active_modules, modules_version, start_at, end_at, created_at, updated_at, location_name, location_address, location_place_id, location_lat, location_lng"
      )
      .order("created_at", { ascending: false })
      .limit(50);

    if (
      eventsError &&
      isCompatibilityError(eventsError, [
        "location_place_id",
        "location_lat",
        "location_lng",
        "description",
        "allow_plus_one",
        "auto_reminders",
        "dress_code",
        "playlist_mode",
        "schedule_mode",
        "poll_status",
        "expenses",
        "photo_gallery_url",
        "finance_mode",
        "finance_fixed_price",
        "finance_payment_info",
        "finance_total_budget",
        "active_modules",
        "modules_version",
        "end_at"
      ])
    ) {
      const fallback = await supabase
        .from("events")
        .select("id, host_user_id, title, status, event_type, start_at, end_at, created_at, updated_at, location_name, location_address")
        .order("created_at", { ascending: false })
        .limit(50);
      eventsData = fallback.data || [];
      eventsError = fallback.error;
    }

    let [
      { data: guestsData, error: guestsError },
      { data: invitationsData, error: invitationsError },
      { data: hostProfileData, error: hostProfileError },
      { data: receivedInvitationsData, error: receivedInvitationsError }
    ] = await Promise.all([guestsPromise, invitationsPromise, hostProfilePromise, receivedInvitationsPromise]);

    if (
      guestsError &&
      isCompatibilityError(guestsError, [
        "postal_code",
        "state_region",
        "address",
        "company",
        "work_email",
        "company_name",
        "twitter",
        "instagram",
        "linkedin",
        "last_meet_at",
        "avatar_url"
      ])
    ) {
      const fallbackGuests = await supabase
        .from("guests")
        .select("id, first_name, last_name, email, phone, relationship, city, country, created_at")
        .eq("host_user_id", sessionUserId)
        .order("created_at", { ascending: false })
        .limit(100);
      guestsData = fallbackGuests.data || [];
      guestsError = fallbackGuests.error;
    }

    if (
      invitationsError &&
      isCompatibilityError(invitationsError, ["response_note", "rsvp_plus_one", "rsvp_dietary_needs"])
    ) {
      const fallbackInvitations = await supabase
        .from("invitations")
        .select("id, event_id, guest_id, status, invitee_email, public_token, created_at, responded_at, updated_at")
        .eq("host_user_id", sessionUserId)
        .order("created_at", { ascending: false })
        .limit(100);
      invitationsData = fallbackInvitations.data || [];
      invitationsError = fallbackInvitations.error;
    }

    if (
      receivedInvitationsError &&
      isCompatibilityError(receivedInvitationsError, ["get_my_received_invitations"])
    ) {
      receivedInvitationsData = [];
      receivedInvitationsError = null;
    }

    if (!receivedInvitationsError && Array.isArray(receivedInvitationsData) && receivedInvitationsData.length > 0) {
      const missingEndAtEventIds = uniqueValues(
        receivedInvitationsData
          .filter((item) => !item?.event_end_at && item?.event_id)
          .map((item) => item.event_id)
      );

      if (missingEndAtEventIds.length > 0) {
        const receivedEventMeta = await supabase
          .from("events")
          .select("id, start_at, end_at")
          .in("id", missingEndAtEventIds);

        if (!receivedEventMeta.error && Array.isArray(receivedEventMeta.data) && receivedEventMeta.data.length > 0) {
          const metaByEventId = Object.fromEntries(
            receivedEventMeta.data.map((row) => [String(row.id), row])
          );
          receivedInvitationsData = receivedInvitationsData.map((item) => {
            const meta = metaByEventId[String(item?.event_id || "")];
            if (!meta) {
              return item;
            }
            return {
              ...item,
              event_start_at: item?.event_start_at || meta?.start_at || null,
              event_end_at: item?.event_end_at || meta?.end_at || null
            };
          });
        }
      }
    }

    if (!eventsError && routeEventDetailId && !(eventsData || []).some((eventItem) => eventItem.id === routeEventDetailId)) {
      let routeEventResult = await supabase
        .from("events")
        .select(
          "id, host_user_id, title, status, event_type, description, allow_plus_one, auto_reminders, dress_code, playlist_mode, schedule_mode, poll_status, expenses, photo_gallery_url, finance_mode, finance_fixed_price, finance_payment_info, finance_total_budget, active_modules, modules_version, start_at, end_at, created_at, updated_at, location_name, location_address, location_place_id, location_lat, location_lng"
        )
        .eq("id", routeEventDetailId)
        .maybeSingle();

      if (
        routeEventResult.error &&
        isCompatibilityError(routeEventResult.error, [
          "location_place_id",
          "location_lat",
          "location_lng",
          "description",
          "allow_plus_one",
          "auto_reminders",
          "dress_code",
          "playlist_mode",
          "schedule_mode",
          "poll_status",
          "expenses",
          "photo_gallery_url",
          "finance_mode",
          "finance_fixed_price",
          "finance_payment_info",
          "finance_total_budget",
          "active_modules",
          "modules_version",
          "end_at"
        ])
      ) {
        routeEventResult = await supabase
          .from("events")
          .select("id, host_user_id, title, status, event_type, start_at, end_at, created_at, updated_at, location_name, location_address")
          .eq("id", routeEventDetailId)
          .maybeSingle();
      }

      if (routeEventResult.error) {
        eventsError = routeEventResult.error;
      } else if (routeEventResult.data) {
        eventsData = [routeEventResult.data, ...(eventsData || [])];
      }
    }

    if (!guestsError && routeGuestDetailId && !(guestsData || []).some((guestItem) => guestItem.id === routeGuestDetailId)) {
      let routeGuestResult = await supabase
        .from("guests")
        .select(
          "id, first_name, last_name, email, work_email, phone, relationship, city, country, address, postal_code, state_region, company, company_name, birthday, twitter, instagram, linkedin, last_meet_at, avatar_url, created_at"
        )
        .eq("host_user_id", sessionUserId)
        .eq("id", routeGuestDetailId)
        .maybeSingle();

      if (
        routeGuestResult.error &&
        isCompatibilityError(routeGuestResult.error, [
          "postal_code",
          "state_region",
          "address",
          "company",
          "work_email",
          "company_name",
          "twitter",
          "instagram",
          "linkedin",
          "last_meet_at",
          "avatar_url"
        ])
      ) {
        routeGuestResult = await supabase
          .from("guests")
          .select("id, first_name, last_name, email, phone, relationship, city, country, created_at")
          .eq("host_user_id", sessionUserId)
          .eq("id", routeGuestDetailId)
          .maybeSingle();
      }

      if (routeGuestResult.error) {
        guestsError = routeGuestResult.error;
      } else if (routeGuestResult.data) {
        guestsData = [routeGuestResult.data, ...(guestsData || [])];
      }
    }

    let eventPlannerRows = [];
    let eventPlannerError = null;
    let eventDateOptionsRows = [];
    let eventDateVotesRows = [];
    let eventDatePollError = null;
    const eventIdsForPlans = uniqueValues((eventsData || []).map((eventItem) => eventItem.id));
    if (eventIdsForPlans.length > 0) {
      const plannerResult = await supabase
        .from("event_host_plans")
        .select("event_id, version, generated_at, source, model_meta, plan_context, plan_snapshot")
        .in("event_id", eventIdsForPlans)
        .order("generated_at", { ascending: false });

      if (plannerResult.error) {
        if (!isMissingRelationError(plannerResult.error, "event_host_plans")) {
          eventPlannerError = plannerResult.error;
        }
      } else {
        eventPlannerRows = Array.isArray(plannerResult.data) ? plannerResult.data : [];
      }

      const optionsResult = await supabase
        .from("event_date_options")
        .select("*")
        .in("event_id", eventIdsForPlans)
        .order("starts_at", { ascending: true });

      if (optionsResult.error) {
        if (
          isCompatibilityError(optionsResult.error, ["starts_at", "option_order", "start_at"]) ||
          isMissingRelationError(optionsResult.error, "event_date_options")
        ) {
          const fallbackOptions = await supabase
            .from("event_date_options")
            .select("*")
            .in("event_id", eventIdsForPlans);
          if (fallbackOptions.error) {
            if (!isMissingRelationError(fallbackOptions.error, "event_date_options")) {
              eventDatePollError = fallbackOptions.error;
            }
          } else {
            eventDateOptionsRows = Array.isArray(fallbackOptions.data) ? fallbackOptions.data : [];
          }
        } else {
          eventDatePollError = optionsResult.error;
        }
      } else {
        eventDateOptionsRows = Array.isArray(optionsResult.data) ? optionsResult.data : [];
      }

      if (!eventDatePollError && eventDateOptionsRows.length > 0) {
        const votesResult = await supabase
          .from("event_date_votes")
          .select("id, event_id, guest_id, event_date_option_id, vote, updated_at")
          .in("event_id", eventIdsForPlans);
        if (votesResult.error) {
          if (!isMissingRelationError(votesResult.error, "event_date_votes")) {
            eventDatePollError = votesResult.error;
          }
        } else {
          eventDateVotesRows = Array.isArray(votesResult.data) ? votesResult.data : [];
        }
      }
    }

    if (
      eventsError ||
      guestsError ||
      invitationsError ||
      receivedInvitationsError ||
      hostProfileError ||
      eventPlannerError ||
      eventDatePollError
    ) {
      setDashboardError(
        eventsError?.message ||
          guestsError?.message ||
          invitationsError?.message ||
          receivedInvitationsError?.message ||
          hostProfileError?.message ||
          eventPlannerError?.message ||
          eventDatePollError?.message ||
          t("error_load_data")
      );
      setIsLoading(false);
      return;
    }

    const guestIds = (guestsData || []).map((guest) => guest.id);
    let guestHostConversionRows = [];
    if (guestIds.length > 0) {
      const guestConversionsResult = await supabase.rpc("get_host_guest_conversions");
      if (
        guestConversionsResult.error &&
        !isCompatibilityError(guestConversionsResult.error, ["get_host_guest_conversions"])
      ) {
        setDashboardError(guestConversionsResult.error.message || t("error_load_data"));
        setIsLoading(false);
        return;
      }
      guestHostConversionRows = guestConversionsResult.data || [];
    }
    let guestPreferencesRows = [];
    let guestSensitiveRows = [];

    if (guestIds.length > 0) {
      let preferencesResult = await supabase
        .from("guest_preferences")
        .select(
          "guest_id, diet_type, tasting_preferences, food_likes, food_dislikes, drink_likes, drink_dislikes, music_genres, favorite_color, books, movies, series, sports, team_fan, punctuality, last_talk_topic, taboo_topics, experience_types, preferred_guest_relationships, preferred_day_moments, periodicity, cuisine_types, pets"
        )
        .in("guest_id", guestIds);

      if (
        preferencesResult.error &&
        isCompatibilityError(preferencesResult.error, [
          "experience_types",
          "preferred_guest_relationships",
          "preferred_day_moments",
          "periodicity",
          "cuisine_types",
          "pets"
        ])
      ) {
        preferencesResult = await supabase
          .from("guest_preferences")
          .select(
            "guest_id, diet_type, tasting_preferences, food_likes, food_dislikes, drink_likes, drink_dislikes, music_genres, favorite_color, books, movies, series, sports, team_fan, punctuality, last_talk_topic, taboo_topics"
          )
          .in("guest_id", guestIds);
      }

      if (preferencesResult.error && !isMissingRelationError(preferencesResult.error, "guest_preferences")) {
        setDashboardError(preferencesResult.error.message || t("error_load_data"));
        setIsLoading(false);
        return;
      }

      guestPreferencesRows = preferencesResult.data || [];

      let sensitiveResult = await supabase
        .from("guest_sensitive_preferences")
        .select(
          "guest_id, allergies, intolerances, pet_allergies, medical_conditions, dietary_medical_restrictions, consent_granted, consent_version, consent_granted_at"
        )
        .in("guest_id", guestIds);

      if (
        sensitiveResult.error &&
        isCompatibilityError(sensitiveResult.error, ["medical_conditions", "dietary_medical_restrictions"])
      ) {
        sensitiveResult = await supabase
          .from("guest_sensitive_preferences")
          .select("guest_id, allergies, intolerances, pet_allergies, consent_granted, consent_version, consent_granted_at")
          .in("guest_id", guestIds);
      }

      if (sensitiveResult.error && !isMissingRelationError(sensitiveResult.error, "guest_sensitive_preferences")) {
        setDashboardError(sensitiveResult.error.message || t("error_load_data"));
        setIsLoading(false);
        return;
      }

      guestSensitiveRows = sensitiveResult.data || [];
    }

    const cachedEventSettingsById = readEventSettingsCache(sessionUserId);
    const datePollOptionEventIds = new Set(
      (Array.isArray(eventDateOptionsRows) ? eventDateOptionsRows : [])
        .map((optionItem) => String(optionItem?.event_id || "").trim())
        .filter(Boolean)
    );
    const normalizedEventsData = (eventsData || []).map((eventItem) => {
      const settingsFromRow = normalizeEventSettings(eventItem);
      const settingsFromCache = normalizeEventSettings(cachedEventSettingsById[eventItem.id] || {});
      const rowHasAnyValue = Boolean(
        settingsFromRow.description ||
          settingsFromRow.allow_plus_one ||
          settingsFromRow.auto_reminders ||
          settingsFromRow.dress_code !== "none" ||
          settingsFromRow.playlist_mode !== "host_only"
      );
      const cacheHasAnyValue = Boolean(
        settingsFromCache.description ||
          settingsFromCache.allow_plus_one ||
          settingsFromCache.auto_reminders ||
          settingsFromCache.dress_code !== "none" ||
          settingsFromCache.playlist_mode !== "host_only"
      );
      const shouldUseCache = !hasEventSettingsColumns(eventItem) || (!rowHasAnyValue && cacheHasAnyValue);
      const effectiveSettings = shouldUseCache ? settingsFromCache : settingsFromRow;
      const rawActiveModules = normalizeEventActiveModules(eventItem?.active_modules);
      const resolvedModules = resolveEventModules(eventItem, {
        hasDatePollOptions: datePollOptionEventIds.has(String(eventItem?.id || "").trim())
      });
      return {
        ...eventItem,
        description: effectiveSettings.description,
        allow_plus_one: effectiveSettings.allow_plus_one,
        auto_reminders: effectiveSettings.auto_reminders,
        dress_code: effectiveSettings.dress_code,
        playlist_mode: effectiveSettings.playlist_mode,
        active_modules: rawActiveModules,
        modules_version: Number(eventItem?.modules_version || 1),
        resolved_modules: resolvedModules
      };
    });

    setEvents(normalizedEventsData);
    setEventSettingsCacheById(cachedEventSettingsById);
    setGuests(guestsData || []);
    setInvitations(invitationsData || []);
    setReceivedInvitations(receivedInvitationsData || []);
    const latestPlannerByEventId = {};
    const plannerHistoryByEventId = {};
    for (const row of eventPlannerRows) {
      const eventId = String(row?.event_id || "").trim();
      if (!eventId) {
        continue;
      }
      const snapshotState = getHostPlanStateFromSnapshot(row?.plan_snapshot);
      if (!snapshotState) {
        continue;
      }
      if (!latestPlannerByEventId[eventId]) {
        latestPlannerByEventId[eventId] = snapshotState;
      }
      const currentHistory = plannerHistoryByEventId[eventId] || [];
      const hasSameVersion = currentHistory.some((item) => Number(item.version) === Number(snapshotState.version));
      if (!hasSameVersion) {
        currentHistory.push({
          version: Number(snapshotState.version || 0),
          generatedAt: String(snapshotState.generatedAt || ""),
          scope: String(snapshotState?.modelMeta?.scope || "all"),
          snapshotState
        });
      }
      plannerHistoryByEventId[eventId] = currentHistory;
    }
    for (const eventId of Object.keys(plannerHistoryByEventId)) {
      plannerHistoryByEventId[eventId].sort((a, b) => {
        const versionDiff = Number(b.version || 0) - Number(a.version || 0);
        if (versionDiff !== 0) {
          return versionDiff;
        }
        return String(b.generatedAt || "").localeCompare(String(a.generatedAt || ""));
      });
    }
    setEventPlannerSnapshotsByEventId(latestPlannerByEventId);
    setEventPlannerSnapshotHistoryByEventId(plannerHistoryByEventId);
    const nextPlannerSeedByEventId = {};
    const nextPlannerSeedByEventIdByTab = {};
    const nextPlannerContextOverridesByEventId = {};
    for (const [eventId, snapshotState] of Object.entries(latestPlannerByEventId)) {
      nextPlannerSeedByEventId[eventId] = Math.max(0, Number(snapshotState.seedAll || 0));
      nextPlannerSeedByEventIdByTab[eventId] = snapshotState.seedByTab || {};
      nextPlannerContextOverridesByEventId[eventId] =
        snapshotState.contextOverrides && typeof snapshotState.contextOverrides === "object"
          ? snapshotState.contextOverrides
          : {};
    }
    setEventPlannerRegenerationByEventId(nextPlannerSeedByEventId);
    setEventPlannerRegenerationByEventIdByTab(nextPlannerSeedByEventIdByTab);
    setEventPlannerContextOverridesByEventId(nextPlannerContextOverridesByEventId);
    setGuestPreferencesById(
      Object.fromEntries((guestPreferencesRows || []).map((preferenceItem) => [preferenceItem.guest_id, preferenceItem]))
    );
    setGuestSensitiveById(
      Object.fromEntries(
        (guestSensitiveRows || []).map((sensitiveItem) => [sensitiveItem.guest_id, normalizeSensitiveRecord(sensitiveItem)])
      )
    );
    setGuestHostConversionById(
      Object.fromEntries((guestHostConversionRows || []).map((conversionItem) => [conversionItem.guest_id, conversionItem]))
    );
    setEventDateOptions(eventDateOptionsRows || []);
    setEventDateVotes(eventDateVotesRows || []);
    const selfEmailKey = normalizeEmailKey(sessionUserEmail || "");
    const selfPhoneKey = normalizePhoneKey(hostProfileData?.phone || "");
    const selfGuest =
      (guestsData || []).find((guestItem) => {
        const guestEmailKey = normalizeEmailKey(guestItem.email || "");
        const guestPhoneKey = normalizePhoneKey(guestItem.phone || "");
        return Boolean((selfEmailKey && guestEmailKey === selfEmailKey) || (selfPhoneKey && guestPhoneKey === selfPhoneKey));
      }) || null;
    setHostProfileName(
      String(hostProfileData?.full_name || "")
        .trim()
        .replace(/\s+/g, " ") || (sessionUserEmail || "").split("@")[0] || ""
    );
    setHostProfilePhone(String(hostProfileData?.phone || "").trim());
    setHostProfileCity(String(selfGuest?.city || "").trim());
    setHostProfileCountry(String(selfGuest?.country || "").trim());
    setHostProfileRelationship(toCatalogLabel("relationship", selfGuest?.relationship, language));
    setHostProfileCreatedAt(String(hostProfileData?.created_at || "").trim());
    await refreshSharedProfileData();
    setIsLoading(false);
  }, [
    appRoute,
    language,
    onPreferencesSynced,
    refreshSharedProfileData,
    sessionUserEmail,
    sessionUserId,
    setDashboardError,
    setEventPlannerContextOverridesByEventId,
    setEventPlannerRegenerationByEventId,
    setEventPlannerRegenerationByEventIdByTab,
    setEventPlannerSnapshotHistoryByEventId,
    setEventPlannerSnapshotsByEventId,
    setEventSettingsCacheById,
    setEvents,
    setGuestHostConversionById,
    setEventDateOptions,
    setEventDateVotes,
    setGuestPreferencesById,
    setReceivedInvitations,
    setGuestSensitiveById,
    setGuests,
    setHostProfileCity,
    setHostProfileCountry,
    setHostProfileCreatedAt,
    setHostProfileName,
    setHostProfilePhone,
    setHostProfileRelationship,
    setInvitations,
    setIsLoading,
    supabase,
    t
  ]);

  return {
    loadDashboardData,
    isLoading
  };
}
