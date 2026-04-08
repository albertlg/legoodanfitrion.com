import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { toBlob } from "html-to-image";
import { Icon } from "../../../components/icons";
import { InlineMessage } from "../../../components/inline-message";
import { AvatarCircle } from "../../../components/avatar-circle";
import { HostPlanView } from "./host-plan-view";
import { HostVenueShortlist } from "../../../components/venues/host-venue-shortlist";
import { formatEventDateDisplay, getInitials } from "../../../lib/formatters";
import { ShareCard } from "../../../components/events/ShareCard";
import { HostVenueSelector } from "../../../components/venues/host-venue-selector";
import { supabase } from "../../../lib/supabaseClient";
import { createGoogleCalendarUrl, downloadEventAsIcs } from "../../../utils/calendar-utils";

const EVENT_COVER_FALLBACK_BY_TYPE = {
  bbq: "https://images.unsplash.com/photo-1529193591184-b1d58069ecdd?auto=format&fit=crop&w=1600&q=80",
  celebration: "https://images.unsplash.com/photo-1519671482749-fd09be7ccebf?auto=format&fit=crop&w=1600&q=80",
  party: "https://images.unsplash.com/photo-1492684223066-81342ee5ff30?auto=format&fit=crop&w=1600&q=80",
  romantic_date: "https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&w=1600&q=80",
  book_club: "https://images.unsplash.com/photo-1524995997946-a1c2e315a42f?auto=format&fit=crop&w=1600&q=80",
  meeting: "https://images.unsplash.com/photo-1552664730-d307ca884978?auto=format&fit=crop&w=1600&q=80",
  brunch: "https://images.unsplash.com/photo-1525351484163-7529414344d8?auto=format&fit=crop&w=1600&q=80",
  dinner: "https://images.unsplash.com/photo-1414235077428-338989a2e8c0?auto=format&fit=crop&w=1600&q=80",
  default: "https://images.unsplash.com/photo-1527529482837-4698179dc6ce?auto=format&fit=crop&w=1600&q=80"
};

function getFallbackEventCoverUrl(eventType) {
  const key = String(eventType || "")
    .trim()
    .toLowerCase();
  return EVENT_COVER_FALLBACK_BY_TYPE[key] || EVENT_COVER_FALLBACK_BY_TYPE.default;
}

function normalizeLocationText(value) {
  if (typeof value === "string") {
    return value.trim();
  }
  if (!value || typeof value !== "object") {
    return "";
  }

  const candidateValues = [
    value.address,
    value.formatted_address,
    value.display_name,
    value.description,
    value.label,
    value.name,
    value.value
  ];

  for (const candidate of candidateValues) {
    if (typeof candidate === "string" && candidate.trim()) {
      return candidate.trim();
    }
  }

  return "";
}

function getEventPlaceLookupValue(eventItem) {
  if (!eventItem) {
    return "";
  }
  const latitude = Number(eventItem.location_lat);
  const longitude = Number(eventItem.location_lng);
  if (Number.isFinite(latitude) && Number.isFinite(longitude)) {
    return `${eventItem.location_lat},${eventItem.location_lng}`;
  }
  const addressLabel = normalizeLocationText(eventItem.location_address);
  const placeLabel = normalizeLocationText(eventItem.location_name);
  return String(addressLabel || placeLabel || "").trim();
}

function buildSatelliteEmbedUrl(eventItem, zoom = 17) {
  const placeLookup = getEventPlaceLookupValue(eventItem);
  if (!placeLookup) {
    return "";
  }
  return `https://maps.google.com/maps?q=${encodeURIComponent(placeLookup)}&t=k&z=${zoom}&ie=UTF8&output=embed`;
}

function renderGlobalModal(content) {
  if (typeof document === "undefined" || !document.body) {
    return null;
  }
  return createPortal(content, document.body);
}

function getEventCoverImageUrl(eventItem) {
  if (!eventItem) {
    return "";
  }
  const explicitCover = [eventItem.cover_image_url, eventItem.image_url, eventItem.header_image_url]
    .map((item) => String(item || "").trim())
    .find(Boolean);
  if (explicitCover) {
    return explicitCover;
  }
  return getFallbackEventCoverUrl(eventItem.event_type);
}

const LOCALE_BY_LANGUAGE = {
  es: "es-ES",
  ca: "ca-ES",
  en: "en-GB",
  fr: "fr-FR",
  it: "it-IT"
};
const configuredApiUrl = String(
  import.meta.env.VITE_API_URL ||
    import.meta.env.VITE_API_BASE_URL ||
    ""
).trim();
const fallbackApiUrl = import.meta.env.DEV ? "http://localhost:3000" : "/api";
const EVENT_DETAIL_API_BASE_URL = String(configuredApiUrl || fallbackApiUrl).replace(/\/+$/, "");

function buildSpotifyAuthUrl(eventId) {
  const normalizedEventId = String(eventId || "").trim();
  const normalizedBase = String(EVENT_DETAIL_API_BASE_URL || "").trim().replace(/\/+$/, "");
  if (!normalizedEventId || !normalizedBase) {
    return "";
  }
  const baseRoute = /(^|\/)api$/i.test(normalizedBase)
    ? `${normalizedBase}/spotify/auth`
    : `${normalizedBase}/api/spotify/auth`;
  return `${baseRoute}?eventId=${encodeURIComponent(normalizedEventId)}`;
}

function buildVenueApiUrl(resource) {
  const normalizedBase = String(EVENT_DETAIL_API_BASE_URL || "").trim().replace(/\/+$/, "");
  if (!normalizedBase) {
    return "";
  }
  const baseRoute = /(^|\/)api$/i.test(normalizedBase)
    ? `${normalizedBase}/venues/${resource}`
    : `${normalizedBase}/api/venues/${resource}`;
  return baseRoute;
}

function formatMoneyAmount(value, language) {
  const numericValue = Number(value);
  if (!Number.isFinite(numericValue)) {
    return "0,00";
  }
  const locale = LOCALE_BY_LANGUAGE[String(language || "").trim().toLowerCase()] || "es-ES";
  return new Intl.NumberFormat(locale, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(Math.max(0, numericValue));
}

function roundMoneyAmount(value) {
  return Math.round((Number(value) + Number.EPSILON) * 100) / 100;
}

function normalizeExpenseAmount(value) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return 0;
  }
  return roundMoneyAmount(parsed);
}

function normalizeExpenseEntry(expenseItem) {
  if (!expenseItem || typeof expenseItem !== "object") {
    return null;
  }
  const description = String(expenseItem.description || "").trim();
  const paidBy = String(expenseItem.paidBy || "").trim();
  const amount = normalizeExpenseAmount(expenseItem.amount);
  if (!description || !paidBy || amount <= 0) {
    return null;
  }
  return {
    id: String(expenseItem.id || "").trim() || `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    description,
    paidBy,
    amount
  };
}

function calculateDebts(expenses, totalGuests, participantNames = []) {
  const cleanedExpenses = Array.isArray(expenses)
    ? expenses
        .map((item) => ({
          paidBy: String(item?.paidBy || "").trim(),
          amount: normalizeExpenseAmount(item?.amount)
        }))
        .filter((item) => item.paidBy && item.amount > 0)
    : [];

  if (!cleanedExpenses.length) {
    return [];
  }

  const uniqueParticipants = new Set(
    (Array.isArray(participantNames) ? participantNames : [])
      .map((item) => String(item || "").trim())
      .filter(Boolean)
  );
  cleanedExpenses.forEach((item) => uniqueParticipants.add(item.paidBy));

  const participants = Array.from(uniqueParticipants);
  const participantsCount = Number(totalGuests) > 0 ? Number(totalGuests) : participants.length;
  if (participantsCount <= 0) {
    return [];
  }

  while (participants.length < participantsCount) {
    participants.push(`Invitado ${participants.length + 1}`);
  }

  const paidByPerson = participants.reduce((accumulator, participant) => {
    accumulator[participant] = 0;
    return accumulator;
  }, {});

  cleanedExpenses.forEach((item) => {
    paidByPerson[item.paidBy] = roundMoneyAmount((paidByPerson[item.paidBy] || 0) + item.amount);
  });

  const totalPaid = roundMoneyAmount(
    cleanedExpenses.reduce((accumulator, item) => accumulator + item.amount, 0)
  );
  const fairShare = roundMoneyAmount(totalPaid / participantsCount);

  const creditors = [];
  const debtors = [];
  participants.forEach((participant) => {
    const balance = roundMoneyAmount((paidByPerson[participant] || 0) - fairShare);
    if (balance > 0.009) {
      creditors.push({ name: participant, amount: balance });
    } else if (balance < -0.009) {
      debtors.push({ name: participant, amount: Math.abs(balance) });
    }
  });

  creditors.sort((left, right) => right.amount - left.amount);
  debtors.sort((left, right) => right.amount - left.amount);

  const transactions = [];
  let debtorIndex = 0;
  let creditorIndex = 0;

  while (debtorIndex < debtors.length && creditorIndex < creditors.length) {
    const debtor = debtors[debtorIndex];
    const creditor = creditors[creditorIndex];
    const amount = roundMoneyAmount(Math.min(debtor.amount, creditor.amount));

    if (amount <= 0.009) {
      break;
    }

    transactions.push({
      from: debtor.name,
      to: creditor.name,
      amount
    });

    debtor.amount = roundMoneyAmount(debtor.amount - amount);
    creditor.amount = roundMoneyAmount(creditor.amount - amount);

    if (debtor.amount <= 0.009) {
      debtorIndex += 1;
    }
    if (creditor.amount <= 0.009) {
      creditorIndex += 1;
    }
  }

  return transactions;
}

function buildEventDateDisplay({
  startAt,
  endAt,
  language,
  t,
  interpolateText
}) {
  return formatEventDateDisplay({
    startAt,
    endAt,
    language,
    t,
    interpolate: interpolateText
  });
}

export function EventDetailView({
  eventsWorkspace,
  openWorkspace,
  sessionUserId,
  loadDashboardData,
  handleBackToEventDetail,
  selectedEventDetail,
  t,
  statusClass,
  statusText,
  language,
  formatTimeLabel,
  handleOpenEventPlan,
  selectedEventIcebreakerState,
  handleGenerateEventIcebreaker,
  handleCloseEventIcebreakerPanel,
  handleOpenEventIcebreakerPanel,
  handleStartEditEvent,
  selectedEventDetailPrimaryShare,
  openInvitationCreate,
  selectedEventDetailInvitations,
  selectedEventDetailStatusCounts,
  selectedEventDatePollIsOpen,
  selectedEventDateOptions,
  selectedEventDateVotes,
  selectedEventDateVoteSummaryByOptionId,
  selectedEventDateVoteMatrixRows,
  selectedEventDatePollWinningOptionId,
  handleCloseEventDatePoll,
  isClosingEventDatePollOptionId,
  eventDatePollMessage,
  invitationMessage,
  toCatalogLabel,
  formatDate,
  formatShortDate,
  normalizeEventDressCode,
  normalizeEventPlaylistMode,
  selectedEventChecklist,
  selectedEventHealthAlerts,
  selectedEventHealthAlertsConfirmedCount,
  selectedEventHealthAlertsPendingCount,
  eventPlannerSectionRef,
  interpolateText,
  selectedEventMealPlan,
  selectedEventPlannerContextEffective,
  selectedEventPlannerSavedLabel,
  selectedEventPlannerSnapshotVersion,
  selectedEventPlannerSnapshotHistory,
  selectedEventPlannerVariantSeed,
  selectedEventPlannerTabSeed,
  selectedEventPlannerLastGeneratedByScope,
  selectedEventPlannerGenerationState,
  handleOpenEventPlannerContext,
  handleRegenerateEventPlanner,
  handleRestoreEventPlannerSnapshot,
  eventDetailPlannerTab,
  handleExportEventPlannerShoppingList,
  selectedEventDietTypesCount,
  selectedEventAllergiesCount,
  selectedEventMedicalConditionsCount,
  selectedEventDietaryMedicalRestrictionsCount,
  selectedEventCriticalRestrictions,
  selectedEventHealthRestrictionHighlights,
  selectedEventRestrictionsCount,
  selectedEventIntolerancesCount,
  handleEventPlannerTabChange,
  selectedEventShoppingTotalIngredients,
  selectedEventEstimatedCostRange,
  selectedEventShoppingProgress,
  selectedEventShoppingItems,
  selectedEventShoppingCheckedSet,
  handleCopySelectedEventShoppingChecklist,
  handleMarkAllEventPlannerShoppingItems,
  handleClearEventPlannerShoppingCheckedItems,
  eventPlannerShoppingFilter,
  setEventPlannerShoppingFilter,
  selectedEventShoppingCounts,
  selectedEventShoppingGroupsFiltered,
  handleToggleEventPlannerShoppingItem,
  selectedEventHostPlaybook,
  handleCopyEventPlannerMessages,
  handleCopyEventPlannerPrompt,
  eventPlannerMessage,
  getMapEmbedUrl,
  getGuestAvatarUrl,
  hostDisplayName,
  hostAvatarUrl,
  selectedEventDetailGuests,
  openGuestDetail,
  handlePrepareInvitationShare,
  handleRequestDeleteInvitation,
  selectedEventRsvpTimeline
}) {
  const shareCardRef = useRef(null);
  const calendarMenuMobileRef = useRef(null);
  const calendarMenuDesktopRef = useRef(null);
  const adminMenuMobileRef = useRef(null);
  const adminMenuDesktopRef = useRef(null);
  const [isSharingInvitationImage, setIsSharingInvitationImage] = useState(false);
  const [isCalendarMenuOpen, setIsCalendarMenuOpen] = useState(false);
  const [isEventAdminMenuOpen, setIsEventAdminMenuOpen] = useState(false);
  const [shareCardMessage, setShareCardMessage] = useState("");
  const [splitExpenses, setSplitExpenses] = useState([]);
  const [splitExpenseDescription, setSplitExpenseDescription] = useState("");
  const [splitExpenseAmount, setSplitExpenseAmount] = useState("");
  const [splitExpensePaidBy, setSplitExpensePaidBy] = useState("");
  const [splitHelperMessage, setSplitHelperMessage] = useState("");
  const [splitHelperMessageType, setSplitHelperMessageType] = useState("info");
  const [isTeamModalOpen, setIsTeamModalOpen] = useState(false);
  const [cohostEmailDraft, setCohostEmailDraft] = useState("");
  const [cohosts, setCohosts] = useState([]);
  const [isLoadingCohosts, setIsLoadingCohosts] = useState(false);
  const [isAddingCohost, setIsAddingCohost] = useState(false);
  const [removingCohostId, setRemovingCohostId] = useState("");
  const [cohostFeedback, setCohostFeedback] = useState("");
  const [cohostFeedbackType, setCohostFeedbackType] = useState("info");
  const [isGroupInviteModalOpen, setIsGroupInviteModalOpen] = useState(false);
  const [isLoadingGuestGroups, setIsLoadingGuestGroups] = useState(false);
  const [eventGuestGroups, setEventGuestGroups] = useState([]);
  const [selectedGuestGroupId, setSelectedGuestGroupId] = useState("");
  const [isInvitingGuestGroup, setIsInvitingGuestGroup] = useState(false);
  const [groupInviteFeedback, setGroupInviteFeedback] = useState("");
  const [groupInviteFeedbackType, setGroupInviteFeedbackType] = useState("info");
  const [spotifyPlaylist, setSpotifyPlaylist] = useState(null);
  const [isLoadingSpotifyState, setIsLoadingSpotifyState] = useState(false);
  const [spotifyFeedback, setSpotifyFeedback] = useState("");
  const [spotifyFeedbackType, setSpotifyFeedbackType] = useState("info");
  const [eventVenues, setEventVenues] = useState([]);
  const [isLoadingEventVenues, setIsLoadingEventVenues] = useState(false);
  const [eventVenuesFeedback, setEventVenuesFeedback] = useState("");
  const [eventVenuesFeedbackType, setEventVenuesFeedbackType] = useState("info");
  const [selectingFinalVenueId, setSelectingFinalVenueId] = useState("");
  const isPlanWorkspace = eventsWorkspace === "plan";
  const selectedEventOwnerId = String(
    selectedEventDetail?.host_user_id || selectedEventDetail?.host_id || selectedEventDetail?.owner_user_id || ""
  ).trim();
  const isEventOwner = Boolean(sessionUserId && selectedEventOwnerId && sessionUserId === selectedEventOwnerId);
  const eventDateDisplay = useMemo(
    () =>
      buildEventDateDisplay({
        startAt: selectedEventDetail?.start_at,
        endAt: selectedEventDetail?.end_at,
        language,
        t,
        interpolateText
      }),
    [selectedEventDetail?.start_at, selectedEventDetail?.end_at, language, t, interpolateText]
  );
  const eventDateLabel = eventDateDisplay.dateLabel;
  const eventTimeLabel = eventDateDisplay.timeLabel;
  const eventPlaceName = normalizeLocationText(selectedEventDetail?.location_name);
  const eventPlaceAddress = normalizeLocationText(selectedEventDetail?.location_address);
  const eventPlaceLabel = eventPlaceName || eventPlaceAddress || "-";
  const canAddToCalendar =
    Boolean(selectedEventDetail?.start_at) &&
    String(selectedEventDetail?.poll_status || "")
      .trim()
      .toLowerCase() !== "open";
  const spotifyPlaylistUrl = String(spotifyPlaylist?.spotify_playlist_url || "").trim();
  const hasSpotifyPlaylist = Boolean(spotifyPlaylistUrl);
  const eventSatelliteCoverEmbedUrl = buildSatelliteEmbedUrl(selectedEventDetail, 16);
  const eventCoverImageUrl = getEventCoverImageUrl(selectedEventDetail);
  const hasEventHeroCover = Boolean(selectedEventDetail && !isPlanWorkspace);
  const shareCardHostName = String(hostDisplayName || selectedEventDetail?.host_name || t("host_default_name")).trim();
  const isIcebreakerLoading = Boolean(selectedEventIcebreakerState?.isLoading);
  const isIcebreakerOpen = Boolean(selectedEventIcebreakerState?.isOpen);
  const icebreakerData = selectedEventIcebreakerState?.data || null;
  const hasIcebreakerData = Boolean(
    icebreakerData &&
      (icebreakerData.badJoke ||
        (Array.isArray(icebreakerData.conversationTopics) && icebreakerData.conversationTopics.length > 0) ||
        icebreakerData.quickGameIdea)
  );
  const icebreakerTopics = Array.isArray(icebreakerData?.conversationTopics)
    ? icebreakerData.conversationTopics.filter(Boolean)
    : [];
  const icebreakerError = String(selectedEventIcebreakerState?.error || "").trim();
  const icebreakerGeneratedAtLabel = selectedEventIcebreakerState?.generatedAt
    ? formatDate(selectedEventIcebreakerState.generatedAt, language, t("no_date"))
    : "";
  const hasDatePollOptions = Array.isArray(selectedEventDateOptions) && selectedEventDateOptions.length > 0;
  const isPollEvent =
    String(selectedEventDetail?.schedule_mode || "").trim().toLowerCase() === "tbd" ||
    String(selectedEventDetail?.poll_status || "").trim().toLowerCase() === "open";
  const datePollOpen = Boolean(selectedEventDatePollIsOpen);
  const shouldRenderDatePollSection = isPollEvent || hasDatePollOptions;
  const datePollTotalVotes = Array.isArray(selectedEventDateVotes) ? selectedEventDateVotes.length : 0;
  const confirmedGuestsCount = Math.max(0, Number(selectedEventDetailStatusCounts?.yes || 0));
  const confirmedGuestNames = useMemo(
    () =>
      (Array.isArray(selectedEventDetailGuests) ? selectedEventDetailGuests : [])
        .filter((guestRow) => {
          const statusValue = String(guestRow?.invitation?.status || "").trim().toLowerCase();
          return statusValue === "yes" || statusValue === "confirmed";
        })
        .map((guestRow) => String(guestRow?.name || "").trim())
        .filter(Boolean),
    [selectedEventDetailGuests]
  );
  const splitParticipants = useMemo(() => {
    if (confirmedGuestNames.length > 0) {
      return Array.from(new Set(confirmedGuestNames));
    }
    return Array.from(
      new Set(
        (Array.isArray(selectedEventDetailGuests) ? selectedEventDetailGuests : [])
          .map((guestRow) => String(guestRow?.name || "").trim())
          .filter(Boolean)
      )
    );
  }, [confirmedGuestNames, selectedEventDetailGuests]);
  const splitTotalGuests = confirmedGuestsCount > 0 ? confirmedGuestsCount : 0;
  const splitDefaultPayer = splitParticipants[0] || "";
  const splitTotalAmount = roundMoneyAmount(
    splitExpenses.reduce((accumulator, item) => accumulator + normalizeExpenseAmount(item?.amount), 0)
  );
  const splitPerPersonAmount = splitTotalGuests > 0 ? roundMoneyAmount(splitTotalAmount / splitTotalGuests) : 0;
  const splitPerPersonLabel = formatMoneyAmount(splitPerPersonAmount, language);
  const splitDebts = useMemo(
    () => calculateDebts(splitExpenses, splitTotalGuests, splitParticipants),
    [splitExpenses, splitTotalGuests, splitParticipants]
  );
  const splitSettlementShareText = useMemo(() => {
    const eventTitle = String(selectedEventDetail?.title || t("field_event")).trim();
    const totalLabel = `${formatMoneyAmount(splitTotalAmount, language)} €`;
    const perPersonLabel = `${formatMoneyAmount(splitPerPersonAmount, language)} €`;
    const debtsLines =
      splitDebts.length > 0
        ? splitDebts
            .map((item) =>
              interpolateText(t("event_expenses_settlement_share_row"), {
                from: item.from,
                to: item.to,
                amount: `${formatMoneyAmount(item.amount, language)} €`
              })
            )
            .join("\n")
        : t("event_expenses_settlement_share_no_debts");

    return interpolateText(t("event_expenses_settlement_share_template"), {
      event: eventTitle,
      total: totalLabel,
      perPerson: perPersonLabel,
      debts: debtsLines
    });
  }, [interpolateText, language, selectedEventDetail?.title, splitDebts, splitPerPersonAmount, splitTotalAmount, t]);

  useEffect(() => {
    const sourceExpenses = Array.isArray(selectedEventDetail?.expenses) ? selectedEventDetail.expenses : [];
    const normalized = sourceExpenses.map(normalizeExpenseEntry).filter(Boolean);
    setSplitExpenses(normalized);
    setSplitExpenseDescription("");
    setSplitExpenseAmount("");
    setSplitExpensePaidBy("");
    setSplitHelperMessage("");
    setSplitHelperMessageType("info");
  }, [selectedEventDetail?.id, selectedEventDetail?.expenses]);

  useEffect(() => {
    if (!splitExpensePaidBy && splitDefaultPayer) {
      setSplitExpensePaidBy(splitDefaultPayer);
    }
  }, [splitExpensePaidBy, splitDefaultPayer]);

  useEffect(() => {
    setIsCalendarMenuOpen(false);
    setIsEventAdminMenuOpen(false);
  }, [selectedEventDetail?.id]);

  const loadEventSpotifyPlaylist = useCallback(async () => {
    const eventId = String(selectedEventDetail?.id || "").trim();
    if (!eventId || !supabase) {
      setSpotifyPlaylist(null);
      setIsLoadingSpotifyState(false);
      return;
    }

    setIsLoadingSpotifyState(true);
    try {
      const { data, error } = await supabase
        .from("event_spotify_playlists")
        .select("id, event_id, spotify_playlist_id, spotify_playlist_url, created_at")
        .eq("event_id", eventId)
        .maybeSingle();

      if (error) {
        const errorCode = String(error.code || "").trim();
        if (errorCode !== "PGRST116") {
          console.error("[event-spotify] load playlist error", error);
        }
        setSpotifyPlaylist(null);
        return;
      }

      setSpotifyPlaylist(data || null);
    } catch (error) {
      console.error("[event-spotify] load playlist error", error);
      setSpotifyPlaylist(null);
    } finally {
      setIsLoadingSpotifyState(false);
    }
  }, [selectedEventDetail?.id]);

  useEffect(() => {
    setSpotifyFeedback("");
    setSpotifyFeedbackType("info");
    void loadEventSpotifyPlaylist();
  }, [loadEventSpotifyPlaylist]);

  const loadEventVenues = useCallback(async () => {
    const eventId = String(selectedEventDetail?.id || "").trim();
    const shortlistUrl = buildVenueApiUrl("shortlist");
    if (!eventId || !shortlistUrl || !supabase) {
      setEventVenues([]);
      setIsLoadingEventVenues(false);
      return;
    }

    setIsLoadingEventVenues(true);
    try {
      const { data: sessionPayload, error: sessionError } = await supabase.auth.getSession();
      if (sessionError || !sessionPayload?.session?.access_token) {
        throw new Error(t("event_venues_shortlist_unavailable"));
      }

      const url = new URL(shortlistUrl, window.location.origin);
      url.searchParams.set("eventId", eventId);

      const response = await fetch(url.toString(), {
        method: "GET",
        headers: {
          Accept: "application/json",
          Authorization: `Bearer ${sessionPayload.session.access_token}`
        }
      });
      const payload = await response.json();
      if (!response.ok || payload?.success === false) {
        throw new Error(String(payload?.error || `HTTP ${response.status}`));
      }

      setEventVenues(Array.isArray(payload?.venues) ? payload.venues : []);
    } catch (error) {
      console.error("[event-venues] load shortlist error", error);
      setEventVenues([]);
      setEventVenuesFeedbackType("error");
      setEventVenuesFeedback(t("event_venues_shortlist_error"));
    } finally {
      setIsLoadingEventVenues(false);
    }
  }, [selectedEventDetail?.id, t]);

  useEffect(() => {
    setEventVenuesFeedback("");
    setEventVenuesFeedbackType("info");
    void loadEventVenues();
  }, [loadEventVenues]);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }
    const urlParams = new URLSearchParams(window.location.search);
    const spotifyStatus = String(urlParams.get("spotify") || "")
      .trim()
      .toLowerCase();
    if (!spotifyStatus) {
      return;
    }
    const reason = String(urlParams.get("reason") || "")
      .trim()
      .toLowerCase();

    if (spotifyStatus === "connected") {
      setSpotifyFeedbackType("success");
      setSpotifyFeedback(t("event_spotify_connected_ok"));
      void loadEventSpotifyPlaylist();
    } else {
      const mappedErrorKey =
        reason === "access_denied"
          ? "event_spotify_error_access_denied"
          : reason === "missing_code"
            ? "event_spotify_error_missing_code"
            : "event_spotify_connect_error";
      setSpotifyFeedbackType("error");
      setSpotifyFeedback(t(mappedErrorKey));
    }

    urlParams.delete("spotify");
    urlParams.delete("reason");
    urlParams.delete("playlistId");
    const cleanedQuery = urlParams.toString();
    const cleanedUrl = `${window.location.pathname}${cleanedQuery ? `?${cleanedQuery}` : ""}${window.location.hash || ""}`;
    window.history.replaceState(window.history.state, "", cleanedUrl);
  }, [loadEventSpotifyPlaylist, t]);

  useEffect(() => {
    if (!isCalendarMenuOpen) {
      return undefined;
    }

    const isTargetInsideAnyRef = (target, refs) =>
      refs.some((refItem) => refItem?.current && refItem.current.contains(target));

    const handlePointerDownOutside = (event) => {
      if (
        !isTargetInsideAnyRef(event.target, [calendarMenuMobileRef, calendarMenuDesktopRef])
      ) {
        setIsCalendarMenuOpen(false);
      }
      if (
        !isTargetInsideAnyRef(event.target, [adminMenuMobileRef, adminMenuDesktopRef])
      ) {
        setIsEventAdminMenuOpen(false);
      }
    };
    const handleEscape = (event) => {
      if (event.key === "Escape") {
        setIsCalendarMenuOpen(false);
        setIsEventAdminMenuOpen(false);
      }
    };

    document.addEventListener("mousedown", handlePointerDownOutside);
    document.addEventListener("touchstart", handlePointerDownOutside, { passive: true });
    document.addEventListener("keydown", handleEscape);

    return () => {
      document.removeEventListener("mousedown", handlePointerDownOutside);
      document.removeEventListener("touchstart", handlePointerDownOutside);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [isCalendarMenuOpen, isEventAdminMenuOpen]);

  const loadEventCohosts = useCallback(async () => {
    if (!supabase || !selectedEventDetail?.id) {
      setCohosts([]);
      return;
    }

    setIsLoadingCohosts(true);
    try {
      const { data: cohostRows, error: cohostError } = await supabase
        .from("event_cohosts")
        .select("id, event_id, host_id, role, created_at")
        .eq("event_id", selectedEventDetail.id)
        .order("created_at", { ascending: true });

      if (cohostError) {
        throw cohostError;
      }

      const hostIds = Array.from(
        new Set(
          [selectedEventOwnerId, ...(Array.isArray(cohostRows) ? cohostRows.map((item) => item?.host_id) : [])]
            .map((item) => String(item || "").trim())
            .filter(Boolean)
        )
      );

      let profileInfoById = {};
      if (hostIds.length > 0) {
        const teamProfilesResult = await supabase.rpc("get_event_team_profiles", {
          p_event_id: selectedEventDetail.id
        });
        if (!teamProfilesResult.error && Array.isArray(teamProfilesResult.data)) {
          profileInfoById = teamProfilesResult.data.reduce((accumulator, profileItem) => {
            const profileId = String(profileItem?.user_id || "").trim();
            const profileName = String(profileItem?.full_name || "").trim();
            const avatarUrl = String(profileItem?.avatar_url || "").trim();
            if (profileId) {
              accumulator[profileId] = {
                fullName: profileName,
                avatarUrl
              };
            }
            return accumulator;
          }, {});
        }
      }

      const resolveName = (hostId) => {
        const normalizedHostId = String(hostId || "").trim();
        if (!normalizedHostId) {
          return t("event_team_member_unknown");
        }
        if (normalizedHostId === selectedEventOwnerId) {
          return (
            String(selectedEventDetail?.host_name || "").trim() ||
            String(hostDisplayName || "").trim() ||
            profileInfoById[normalizedHostId]?.fullName ||
            t("host_default_name")
          );
        }
        if (normalizedHostId === sessionUserId) {
          return t("event_team_you_label");
        }
        return (
          profileInfoById[normalizedHostId]?.fullName ||
          interpolateText(t("event_team_user_fallback"), {
            id: normalizedHostId.slice(0, 8)
          })
        );
      };

      const ownerRow =
        selectedEventOwnerId
          ? {
              id: `owner-${selectedEventOwnerId}`,
              event_id: selectedEventDetail.id,
              host_id: selectedEventOwnerId,
              role: "owner",
              created_at: selectedEventDetail?.created_at || null,
              isOwnerRow: true,
              displayName: resolveName(selectedEventOwnerId),
              avatarUrl: profileInfoById[selectedEventOwnerId]?.avatarUrl || ""
            }
          : null;

      const normalizedRows = (Array.isArray(cohostRows) ? cohostRows : []).map((rowItem) => {
        const hostId = String(rowItem?.host_id || "").trim();
        return {
          ...rowItem,
          host_id: hostId,
          role: String(rowItem?.role || "editor").trim() || "editor",
          isOwnerRow: false,
          displayName: resolveName(hostId),
          avatarUrl: profileInfoById[hostId]?.avatarUrl || ""
        };
      });

      setCohosts(ownerRow ? [ownerRow, ...normalizedRows] : normalizedRows);
    } catch (error) {
      console.error("[event-team] load cohosts error", error);
      setCohostFeedbackType("error");
      setCohostFeedback(t("event_team_load_error"));
      setCohosts([]);
    } finally {
      setIsLoadingCohosts(false);
    }
  }, [
    hostDisplayName,
    interpolateText,
    selectedEventDetail?.created_at,
    selectedEventDetail?.host_name,
    selectedEventDetail?.id,
    selectedEventOwnerId,
    sessionUserId,
    t
  ]);

  useEffect(() => {
    setIsTeamModalOpen(false);
    setCohostEmailDraft("");
    setCohostFeedback("");
    setCohostFeedbackType("info");
    setCohosts([]);
  }, [selectedEventDetail?.id]);

  useEffect(() => {
    if (!isTeamModalOpen) {
      return;
    }
    void loadEventCohosts();
  }, [isTeamModalOpen, loadEventCohosts]);

  const loadEventGuestGroups = useCallback(async () => {
    if (!supabase || !sessionUserId) {
      setEventGuestGroups([]);
      return;
    }

    setIsLoadingGuestGroups(true);
    try {
      const { data, error } = await supabase
        .from("guest_groups")
        .select("id, name, created_at")
        .eq("host_id", sessionUserId)
        .order("created_at", { ascending: true });

      if (error) {
        throw error;
      }

      setEventGuestGroups(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error("[event-group-invite] load groups error", error);
      setEventGuestGroups([]);
      setGroupInviteFeedbackType("error");
      setGroupInviteFeedback(t("event_group_invite_load_error"));
    } finally {
      setIsLoadingGuestGroups(false);
    }
  }, [sessionUserId, t]);

  useEffect(() => {
    setIsGroupInviteModalOpen(false);
    setIsLoadingGuestGroups(false);
    setEventGuestGroups([]);
    setSelectedGuestGroupId("");
    setIsInvitingGuestGroup(false);
    setGroupInviteFeedback("");
    setGroupInviteFeedbackType("info");
  }, [selectedEventDetail?.id]);

  useEffect(() => {
    if (!isGroupInviteModalOpen) {
      return;
    }
    void loadEventGuestGroups();
  }, [isGroupInviteModalOpen, loadEventGuestGroups]);

  const handleOpenEventTeamModal = () => {
    setCohostFeedback("");
    setCohostFeedbackType("info");
    setIsTeamModalOpen(true);
  };

  const handleCloseEventTeamModal = () => {
    if (isAddingCohost || removingCohostId) {
      return;
    }
    setIsTeamModalOpen(false);
  };

  const handleAddCohostByEmail = async () => {
    if (!isEventOwner) {
      setCohostFeedbackType("error");
      setCohostFeedback(t("event_team_owner_only_hint"));
      return;
    }
    const normalizedEmail = String(cohostEmailDraft || "").trim().toLowerCase();
    if (!normalizedEmail) {
      setCohostFeedbackType("error");
      setCohostFeedback(t("event_team_email_required"));
      return;
    }
    if (!supabase || !selectedEventDetail?.id) {
      setCohostFeedbackType("error");
      setCohostFeedback(t("event_team_generic_error"));
      return;
    }
    setIsAddingCohost(true);
    setCohostFeedback("");
    setCohostFeedbackType("info");
    try {
      const { data: foundUserId, error: lookupError } = await supabase.rpc("get_user_id_by_email", {
        p_email: normalizedEmail
      });
      if (lookupError) {
        throw lookupError;
      }
      const normalizedUserId = String(foundUserId || "").trim();
      if (!normalizedUserId) {
        setCohostFeedbackType("error");
        setCohostFeedback(t("event_team_user_not_found"));
        return;
      }
      if (normalizedUserId === selectedEventOwnerId) {
        setCohostFeedbackType("error");
        setCohostFeedback(t("event_team_owner_cannot_add"));
        return;
      }
      const { error: insertError } = await supabase.from("event_cohosts").insert({
        event_id: selectedEventDetail.id,
        host_id: normalizedUserId,
        role: "editor"
      });
      if (insertError) {
        if (String(insertError?.code || "") === "23505") {
          setCohostFeedbackType("error");
          setCohostFeedback(t("event_team_duplicate"));
          return;
        }
        throw insertError;
      }
      setCohostFeedbackType("success");
      setCohostFeedback(t("event_team_add_success"));
      setCohostEmailDraft("");
      await loadEventCohosts();
    } catch (error) {
      console.error("[event-team] add cohost error", error);
      setCohostFeedbackType("error");
      setCohostFeedback(t("event_team_add_error"));
    } finally {
      setIsAddingCohost(false);
    }
  };

  const handleRemoveCohost = async (cohostRow) => {
    const cohostRowId = String(cohostRow?.id || "").trim();
    if (!cohostRowId || !supabase || !selectedEventDetail?.id || !isEventOwner) {
      return;
    }
    setRemovingCohostId(cohostRowId);
    setCohostFeedback("");
    setCohostFeedbackType("info");
    try {
      const { error: deleteError } = await supabase
        .from("event_cohosts")
        .delete()
        .eq("id", cohostRowId)
        .eq("event_id", selectedEventDetail.id);
      if (deleteError) {
        throw deleteError;
      }
      setCohostFeedbackType("success");
      setCohostFeedback(t("event_team_remove_success"));
      await loadEventCohosts();
    } catch (error) {
      console.error("[event-team] remove cohost error", error);
      setCohostFeedbackType("error");
      setCohostFeedback(t("event_team_remove_error"));
    } finally {
      setRemovingCohostId("");
    }
  };

  const handleOpenGoogleCalendar = () => {
    if (!selectedEventDetail) {
      return;
    }
    const googleCalendarUrl = createGoogleCalendarUrl(selectedEventDetail, {
      fallbackDurationHours: 3,
      sourceUrl: selectedEventDetailPrimaryShare?.url
    });
    if (!googleCalendarUrl) {
      setShareCardMessage(t("event_calendar_unavailable"));
      return;
    }
    window.open(googleCalendarUrl, "_blank", "noopener,noreferrer");
    setIsCalendarMenuOpen(false);
    setShareCardMessage("");
  };

  const handleDownloadIcsCalendar = () => {
    if (!selectedEventDetail) {
      return;
    }
    const didDownload = downloadEventAsIcs(selectedEventDetail, {
      fallbackDurationHours: 3,
      sourceUrl: selectedEventDetailPrimaryShare?.url
    });
    if (!didDownload) {
      setShareCardMessage(t("event_calendar_unavailable"));
      return;
    }
    setIsCalendarMenuOpen(false);
    setShareCardMessage(t("event_calendar_downloaded_ok"));
  };

  const handleConnectSpotify = () => {
    const eventId = String(selectedEventDetail?.id || "").trim();
    if (!eventId) {
      setSpotifyFeedbackType("error");
      setSpotifyFeedback(t("event_spotify_connect_error"));
      return;
    }
    const authUrl = buildSpotifyAuthUrl(eventId);
    if (!authUrl) {
      setSpotifyFeedbackType("error");
      setSpotifyFeedback(t("event_spotify_connect_unavailable"));
      return;
    }
    setSpotifyFeedback("");
    window.location.href = authUrl;
  };

  const handleOpenSpotifyPlaylist = () => {
    if (!spotifyPlaylistUrl) {
      setSpotifyFeedbackType("error");
      setSpotifyFeedback(t("event_spotify_open_missing_url"));
      return;
    }
    window.open(spotifyPlaylistUrl, "_blank", "noopener,noreferrer");
  };

  const handleShareInvitationImage = async () => {
    if (!selectedEventDetail) {
      return;
    }
    const shareNode = shareCardRef.current;
    if (!shareNode) {
      setShareCardMessage(t("event_share_card_error"));
      return;
    }
    const rsvpUrl = String(selectedEventDetailPrimaryShare?.url || "").trim();
    if (!rsvpUrl) {
      setShareCardMessage(t("event_share_card_missing_rsvp"));
      return;
    }
    setIsSharingInvitationImage(true);
    setShareCardMessage("");
    try {
      const blob = await toBlob(shareNode, {
        cacheBust: true,
        pixelRatio: 2,
        backgroundColor: "#0b1220",
        skipFonts: true,
        preferredFontFormat: "woff2",
        fetchRequestInit: { mode: "cors", credentials: "omit" },
        filter: (node) => {
          if (node && typeof node === "object" && "tagName" in node) {
            const tagName = String(node.tagName || "").toUpperCase();
            if (tagName === "LINK") {
              return false;
            }
          }
          return true;
        }
      });
      if (!blob) {
        throw new Error("empty_blob");
      }
      const filenameBase = String(selectedEventDetail?.title || "event")
        .trim()
        .toLowerCase()
        .replace(/\s+/g, "-")
        .replace(/[^a-z0-9-_]/g, "");
      const fileName = `${filenameBase || "event"}-invitation.png`;
      const shareFile = new File([blob], fileName, { type: "image/png" });
      const shareTitle = interpolateText(t("event_share_card_share_title"), {
        event: selectedEventDetail?.title || t("field_event")
      });
      const shareLocationAddress = String(eventPlaceAddress || "").trim();
      const shareLocationName = String(eventPlaceName || eventPlaceLabel || "").trim();
      const shareLocation = shareLocationAddress && shareLocationName && shareLocationAddress !== shareLocationName
        ? `${shareLocationName} (${shareLocationAddress})`
        : shareLocationName || shareLocationAddress;
      const shareText = interpolateText(t("event_share_card_share_text"), {
        event: selectedEventDetail?.title || t("field_event"),
        date: `${String.fromCodePoint(0x1F4C5)} ${eventDateDisplay.fullLabel}`,
        location: `${String.fromCodePoint(0x1F4CD)} ${shareLocation}`,
        url: rsvpUrl
      });
      const canShareFiles =
        typeof navigator !== "undefined" &&
        typeof navigator.share === "function" &&
        (typeof navigator.canShare !== "function" || navigator.canShare({ files: [shareFile] }));

      if (canShareFiles) {
        // Send title + text + files. We omit `url` to prevent WhatsApp
        // from generating a duplicate link-preview card alongside the image.
        // The URL is already embedded inside shareText.
        await navigator.share({
          title: shareTitle,
          text: shareText,
          files: [shareFile]
        });
        setShareCardMessage(t("event_share_card_shared_ok"));
        return;
      }

      // Desktop fallback: copy the text (with RSVP link) to clipboard,
      // then download the image as a separate file.
      try {
        await navigator.clipboard.writeText(shareText);
      } catch (clipError) {
        // Non-critical: proceed with download even if clipboard fails
        console.warn("[share-card] clipboard copy failed", clipError);
      }

      const downloadUrl = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = downloadUrl;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(downloadUrl);
      setShareCardMessage(t("event_share_card_downloaded_ok"));
    } catch (error) {
      if (String(error?.name || "").toLowerCase() === "aborterror") {
        setShareCardMessage("");
      } else {
        setShareCardMessage(t("event_share_card_error"));
      }
    } finally {
      setIsSharingInvitationImage(false);
    }
  };

  const handleOpenGroupInviteModal = () => {
    setGroupInviteFeedback("");
    setGroupInviteFeedbackType("info");
    setSelectedGuestGroupId("");
    setIsGroupInviteModalOpen(true);
  };

  const handleCloseGroupInviteModal = () => {
    if (isInvitingGuestGroup) {
      return;
    }
    setIsGroupInviteModalOpen(false);
  };

  const handleInviteGroupToEvent = async () => {
    if (!selectedEventDetail?.id || !supabase) {
      return;
    }
    const normalizedGroupId = String(selectedGuestGroupId || "").trim();
    if (!normalizedGroupId) {
      setGroupInviteFeedbackType("error");
      setGroupInviteFeedback(t("event_group_invite_group_required"));
      return;
    }

    setIsInvitingGuestGroup(true);
    setGroupInviteFeedback("");
    setGroupInviteFeedbackType("info");
    try {
      const { data, error } = await supabase.rpc("invite_group_to_event", {
        p_event_id: selectedEventDetail.id,
        p_group_id: normalizedGroupId
      });
      if (error) {
        throw error;
      }

      const firstRow = Array.isArray(data) && data.length > 0 ? data[0] : null;
      const insertedCount = Math.max(0, Number(firstRow?.inserted_count || 0));
      const selectedGroup = eventGuestGroups.find((item) => String(item?.id || "") === normalizedGroupId);
      const selectedGroupName = String(selectedGroup?.name || "").trim() || t("guest_groups_tab");

      setGroupInviteFeedbackType("success");
      setGroupInviteFeedback(
        interpolateText(t("event_group_invite_success"), {
          count: insertedCount,
          group: selectedGroupName
        })
      );

      if (typeof loadDashboardData === "function") {
        await loadDashboardData();
      }
      setIsGroupInviteModalOpen(false);
    } catch (error) {
      console.error("[event-group-invite] rpc error", error);
      setGroupInviteFeedbackType("error");
      setGroupInviteFeedback(t("event_group_invite_error"));
    } finally {
      setIsInvitingGuestGroup(false);
    }
  };

  const handleSelectFinalVenue = async (venue) => {
    const venueId = String(venue?.id || "").trim();
    const eventId = String(selectedEventDetail?.id || "").trim();
    const selectFinalUrl = buildVenueApiUrl("select-final");

    if (!venueId || !eventId || !selectFinalUrl || !supabase) {
      setEventVenuesFeedbackType("error");
      setEventVenuesFeedback(t("event_venues_select_final_error"));
      return;
    }

    setSelectingFinalVenueId(venueId);
    setEventVenuesFeedback("");
    setEventVenuesFeedbackType("info");
    try {
      const { data: sessionPayload, error: sessionError } = await supabase.auth.getSession();
      if (sessionError || !sessionPayload?.session?.access_token) {
        throw new Error(t("event_venues_shortlist_unavailable"));
      }

      const response = await fetch(selectFinalUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
          Authorization: `Bearer ${sessionPayload.session.access_token}`
        },
        body: JSON.stringify({
          eventId,
          venueId
        })
      });
      const payload = await response.json();
      if (!response.ok || payload?.success === false) {
        throw new Error(String(payload?.error || `HTTP ${response.status}`));
      }

      setEventVenuesFeedbackType("success");
      setEventVenuesFeedback(
        t("event_venues_select_final_success").replace(
          "{venue}",
          String(venue?.name || "").trim() || t("field_place")
        )
      );
      await loadEventVenues();
    } catch (error) {
      console.error("[event-venues] select final error", error);
      setEventVenuesFeedbackType("error");
      setEventVenuesFeedback(t("event_venues_select_final_error"));
    } finally {
      setSelectingFinalVenueId("");
    }
  };

  const handleAddSplitExpense = () => {
    const description = String(splitExpenseDescription || "").trim();
    const paidBy = String(splitExpensePaidBy || "").trim();
    const amount = normalizeExpenseAmount(splitExpenseAmount);

    if (!description || !paidBy || amount <= 0) {
      setSplitHelperMessageType("error");
      setSplitHelperMessage(t("event_expenses_add_error"));
      return;
    }

    const nextExpense = {
      id:
        typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
          ? crypto.randomUUID()
          : `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      description,
      amount,
      paidBy
    };

    setSplitExpenses((current) => {
      const nextExpenses = [...current, nextExpense];
      if (!supabase || !selectedEventDetail?.id) {
        setSplitHelperMessageType("success");
        setSplitHelperMessage(t("event_expenses_add_success"));
        return nextExpenses;
      }
      void supabase
        .from("events")
        .update({ expenses: nextExpenses })
        .eq("id", selectedEventDetail.id)
        .then(({ error }) => {
          if (error) {
            console.error("[event-expenses] add persist error", error);
            setSplitHelperMessageType("error");
            setSplitHelperMessage(t("event_expenses_persist_error"));
            setSplitExpenses((rollbackCurrent) => rollbackCurrent.filter((item) => item.id !== nextExpense.id));
            return;
          }
          setSplitHelperMessageType("success");
          setSplitHelperMessage(t("event_expenses_add_success"));
        });
      return nextExpenses;
    });
    setSplitExpenseDescription("");
    setSplitExpenseAmount("");
  };

  const handleRemoveSplitExpense = (expenseId) => {
    const removedExpense = splitExpenses.find((item) => item.id === expenseId);
    setSplitExpenses((current) => {
      const nextExpenses = current.filter((item) => item.id !== expenseId);
      if (!supabase || !selectedEventDetail?.id) {
        setSplitHelperMessageType("info");
        setSplitHelperMessage(t("event_expenses_remove_success"));
        return nextExpenses;
      }
      void supabase
        .from("events")
        .update({ expenses: nextExpenses })
        .eq("id", selectedEventDetail.id)
        .then(({ error }) => {
          if (error) {
            console.error("[event-expenses] remove persist error", error);
            setSplitHelperMessageType("error");
            setSplitHelperMessage(t("event_expenses_persist_error"));
            if (removedExpense) {
              setSplitExpenses((rollbackCurrent) => [...rollbackCurrent, removedExpense]);
            }
            return;
          }
          setSplitHelperMessageType("info");
          setSplitHelperMessage(t("event_expenses_remove_success"));
        });
      return nextExpenses;
    });
  };

  const handleShareSettlementWhatsApp = () => {
    const payload = String(splitSettlementShareText || "").trim();
    if (!payload) {
      setSplitHelperMessageType("error");
      setSplitHelperMessage(t("event_expenses_message_empty"));
      return;
    }
    const encodedText = encodeURIComponent(payload);
    const whatsappUrl = `https://wa.me/?text=${encodedText}`;
    window.open(whatsappUrl, "_blank", "noopener,noreferrer");
  };

  const renderEventHeaderActions = ({ inHero = false } = {}) => {
    if (!selectedEventDetail) {
      return null;
    }

    const secondaryButtonClass = inHero
      ? "bg-white/85 hover:bg-white text-gray-900 border border-black/10 backdrop-blur-md dark:bg-black/35 dark:hover:bg-black/45 dark:text-white dark:border-white/30"
      : "bg-white hover:bg-gray-50 dark:bg-gray-800 dark:hover:bg-gray-700 text-gray-800 dark:text-gray-200 border border-black/10 dark:border-white/10";
    const menuTriggerClass = inHero
      ? "bg-white/85 hover:bg-white text-gray-900 border border-black/10 backdrop-blur-md dark:bg-black/35 dark:hover:bg-black/45 dark:text-white dark:border-white/30"
      : "bg-white hover:bg-gray-50 dark:bg-gray-800 dark:hover:bg-gray-700 text-gray-800 dark:text-gray-200 border border-black/10 dark:border-white/10";
    const dropdownPanelClass =
      "absolute right-0 top-full z-[80] mt-2 w-56 rounded-xl border border-gray-200 bg-white shadow-2xl dark:border-gray-700 dark:bg-gray-800 overflow-hidden";
    const dropdownItemClass =
      "flex items-center w-full px-4 py-3 text-sm text-left text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors";
    const spotifyButtonLabel = isLoadingSpotifyState
      ? t("event_spotify_loading")
      : hasSpotifyPlaylist
        ? t("event_spotify_open_action")
        : t("event_spotify_connect_action");
    const spotifyBrandIcon = (
      <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5 mr-2 shrink-0" aria-hidden="true">
        <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.84.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.6.18-1.2.72-1.38 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z" />
      </svg>
    );
    const spotifyButtonClass = hasSpotifyPlaylist
      ? "bg-transparent border border-[#1DB954] text-[#1DB954] hover:bg-[#1DB954]/10"
      : "bg-[#1DB954] hover:bg-[#1ed760] border border-[#1DB954] text-white shadow-lg";

    return (
      <div className="relative z-20 mt-3 w-full min-w-0">
        <div className="sm:hidden flex flex-col gap-2">
          <button
            className="bg-blue-600 hover:bg-blue-700 text-white border border-blue-600 font-bold py-2.5 px-4 rounded-xl transition-all text-xs shadow-sm flex items-center gap-2 justify-center w-full min-h-11"
            type="button"
            onClick={handleShareInvitationImage}
            disabled={isSharingInvitationImage}
          >
            <Icon name="camera" className="w-4 h-4" />
            {isSharingInvitationImage ? t("event_share_card_generating") : t("event_share_card_action")}
          </button>

          <button
            className={`${spotifyButtonClass} font-bold py-2.5 px-4 rounded-xl transition-all text-xs flex items-center justify-center w-full min-h-11 disabled:opacity-70 disabled:cursor-not-allowed`}
            type="button"
            onClick={hasSpotifyPlaylist ? handleOpenSpotifyPlaylist : handleConnectSpotify}
            disabled={isLoadingSpotifyState}
          >
            {spotifyBrandIcon}
            <span className="truncate">{spotifyButtonLabel}</span>
          </button>

          <div className="flex w-full items-center gap-2">
            {canAddToCalendar ? (
              <div className="relative flex-1 min-w-0" ref={calendarMenuMobileRef}>
                <button
                  className={`${secondaryButtonClass} font-bold py-2.5 px-4 rounded-xl transition-all text-xs shadow-sm flex items-center gap-2 justify-center w-full min-h-11`}
                  type="button"
                  onClick={() => {
                    setIsCalendarMenuOpen((currentValue) => !currentValue);
                    setIsEventAdminMenuOpen(false);
                  }}
                  aria-haspopup="menu"
                  aria-expanded={isCalendarMenuOpen}
                  aria-label={t("event_calendar_action")}
                >
                  <Icon name="calendar" className="w-4 h-4" />
                  <span className="truncate">{t("event_calendar_action")}</span>
                  <Icon name={isCalendarMenuOpen ? "chevron_up" : "chevron_down"} className="w-3.5 h-3.5" />
                </button>
                {isCalendarMenuOpen ? (
                  <div className={dropdownPanelClass}>
                    <button className={dropdownItemClass} type="button" onClick={handleOpenGoogleCalendar}>
                      <Icon name="calendar" className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                      {t("event_calendar_google")}
                    </button>
                    <button className={dropdownItemClass} type="button" onClick={handleDownloadIcsCalendar}>
                      <Icon name="download" className="w-4 h-4 text-purple-600 dark:text-purple-300" />
                      {t("event_calendar_ics")}
                    </button>
                  </div>
                ) : null}
              </div>
            ) : null}

            <div className={`relative ${canAddToCalendar ? "w-11" : "flex-1"}`} ref={adminMenuMobileRef}>
              <button
                className={`${menuTriggerClass} font-bold rounded-xl transition-all shadow-sm flex items-center justify-center min-h-11 h-11 w-full`}
                aria-label={t("open_menu")}
                title={t("open_menu")}
                aria-haspopup="menu"
                aria-expanded={isEventAdminMenuOpen}
                type="button"
                onClick={() => {
                  setIsEventAdminMenuOpen((currentValue) => !currentValue);
                  setIsCalendarMenuOpen(false);
                }}
              >
                <Icon name="more_horizontal" className="w-4 h-4" />
              </button>
              {isEventAdminMenuOpen ? (
                <div className={dropdownPanelClass}>
                  <button
                    className={dropdownItemClass}
                    type="button"
                    onClick={() => {
                      setIsEventAdminMenuOpen(false);
                      handleStartEditEvent(selectedEventDetail);
                    }}
                  >
                    <Icon name="edit" className="w-3.5 h-3.5 text-blue-500" />
                    <span>{t("event_detail_edit_action")}</span>
                  </button>
                  <button
                    className={dropdownItemClass}
                    type="button"
                    onClick={() => {
                      setIsEventAdminMenuOpen(false);
                      handleOpenEventTeamModal();
                    }}
                  >
                    <Icon name="users" className="w-3.5 h-3.5 text-purple-500" />
                    <span>{t("event_team_action")}</span>
                  </button>
                </div>
              ) : null}
            </div>
          </div>
        </div>

        <div className="hidden sm:flex sm:flex-row sm:flex-wrap sm:items-center gap-2 min-w-0">
          <button
            className="bg-blue-600 hover:bg-blue-700 text-white border border-blue-600 font-bold py-2.5 px-4 rounded-xl transition-all text-xs shadow-sm flex items-center gap-2 justify-center w-full sm:w-auto"
            type="button"
            onClick={handleShareInvitationImage}
            disabled={isSharingInvitationImage}
          >
            <Icon name="camera" className="w-4 h-4" />
            {isSharingInvitationImage ? t("event_share_card_generating") : t("event_share_card_action")}
          </button>

          <button
            className={`${spotifyButtonClass} font-bold py-2.5 px-4 rounded-xl transition-all text-xs flex items-center justify-center w-full sm:w-auto disabled:opacity-70 disabled:cursor-not-allowed`}
            type="button"
            onClick={hasSpotifyPlaylist ? handleOpenSpotifyPlaylist : handleConnectSpotify}
            disabled={isLoadingSpotifyState}
          >
            {spotifyBrandIcon}
            <span>{spotifyButtonLabel}</span>
          </button>

          {canAddToCalendar ? (
            <div className="relative w-full sm:w-auto" ref={calendarMenuDesktopRef}>
              <button
                className={`${secondaryButtonClass} font-bold py-2.5 px-4 rounded-xl transition-all text-xs shadow-sm flex items-center gap-2 justify-center w-full sm:w-auto min-h-11`}
                type="button"
                onClick={() => {
                  setIsCalendarMenuOpen((currentValue) => !currentValue);
                  setIsEventAdminMenuOpen(false);
                }}
                aria-haspopup="menu"
                aria-expanded={isCalendarMenuOpen}
                aria-label={t("event_calendar_action")}
              >
                <Icon name="calendar" className="w-4 h-4" />
                <span>{t("event_calendar_action")}</span>
                <Icon name={isCalendarMenuOpen ? "chevron_up" : "chevron_down"} className="w-3.5 h-3.5" />
              </button>
              {isCalendarMenuOpen ? (
                <div className={dropdownPanelClass}>
                  <button className={dropdownItemClass} type="button" onClick={handleOpenGoogleCalendar}>
                    <Icon name="calendar" className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                    {t("event_calendar_google")}
                  </button>
                  <button className={dropdownItemClass} type="button" onClick={handleDownloadIcsCalendar}>
                    <Icon name="download" className="w-4 h-4 text-purple-600 dark:text-purple-300" />
                    {t("event_calendar_ics")}
                  </button>
                </div>
              ) : null}
            </div>
          ) : null}

          <div className="relative w-full sm:w-auto sm:ml-auto" ref={adminMenuDesktopRef}>
            <button
              className={`${menuTriggerClass} font-bold rounded-xl transition-all shadow-sm flex items-center justify-center min-h-11 h-11 px-4 w-full sm:w-11 sm:px-0`}
              aria-label={t("open_menu")}
              title={t("open_menu")}
              aria-haspopup="menu"
              aria-expanded={isEventAdminMenuOpen}
              type="button"
              onClick={() => {
                setIsEventAdminMenuOpen((currentValue) => !currentValue);
                setIsCalendarMenuOpen(false);
              }}
            >
              <Icon name="more_horizontal" className="w-4 h-4" />
            </button>
            {isEventAdminMenuOpen ? (
              <div className={dropdownPanelClass}>
                <button
                  className={dropdownItemClass}
                  type="button"
                  onClick={() => {
                    setIsEventAdminMenuOpen(false);
                    handleStartEditEvent(selectedEventDetail);
                  }}
                >
                  <Icon name="edit" className="w-3.5 h-3.5 text-blue-500" />
                  <span>{t("event_detail_edit_action")}</span>
                </button>
                <button
                  className={dropdownItemClass}
                  type="button"
                  onClick={() => {
                    setIsEventAdminMenuOpen(false);
                    handleOpenEventTeamModal();
                  }}
                >
                  <Icon name="users" className="w-3.5 h-3.5 text-purple-500" />
                  <span>{t("event_team_action")}</span>
                </button>
              </div>
            ) : null}
          </div>
        </div>
      </div>
    );
  };

  return (
    <section className={`bg-white/50 dark:bg-gray-900/50 backdrop-blur-xl border border-black/10 dark:border-white/10 rounded-3xl shadow-2xl p-4 md:p-8 flex flex-col gap-6 w-full max-w-6xl mx-auto ${isPlanWorkspace ? "max-w-7xl" : ""}`}>

      {/* Breadcrumb */}
      <div className="flex flex-wrap items-center gap-2 text-[10px] font-bold uppercase tracking-wider text-gray-500">
        <button className="flex items-center gap-2 hover:text-gray-900 dark:hover:text-white transition-colors" type="button" onClick={() => openWorkspace("events", "latest")}>
          <Icon name="arrow_left" className="w-3.5 h-3.5" />
          {t("latest_events_title")}
        </button>
        {eventsWorkspace === "plan" ? (
          <>
            <span>/</span>
            <button className="hover:text-blue-600 dark:hover:text-blue-400 transition-colors truncate max-w-[150px] sm:max-w-xs" type="button" onClick={handleBackToEventDetail}>
              {selectedEventDetail?.title || t("event_detail_title")}
            </button>
            <span>/</span>
            <span className="text-gray-900 dark:text-white">{t("event_planner_title")}</span>
          </>
        ) : null}
      </div>

      {/* Hero Cover (Solo si no estamos en Plan) */}
      {selectedEventDetail && !isPlanWorkspace ? (
        <article className="relative w-full h-[21rem] sm:h-64 md:h-72 rounded-2xl overflow-visible shadow-inner" aria-label={t("event_detail_cover_title")}>
          <div className="absolute inset-0 rounded-2xl overflow-hidden">
            {eventSatelliteCoverEmbedUrl ? (
              <iframe
                className="absolute inset-0 w-full h-full object-cover pointer-events-none"
                title={interpolateText(t("event_detail_cover_alt"), { event: selectedEventDetail.title || t("field_event") })}
                src={eventSatelliteCoverEmbedUrl}
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
              />
            ) : (
              <img
                className="absolute inset-0 w-full h-full object-cover"
                src={eventCoverImageUrl}
                alt={interpolateText(t("event_detail_cover_alt"), { event: selectedEventDetail.title || t("field_event") })}
                loading="lazy"
              />
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-white via-white/85 to-transparent dark:from-gray-900 dark:via-gray-900/85 dark:to-transparent" />
          </div>
          <div className="relative z-10 h-full flex flex-col justify-end p-5 sm:p-6 md:p-8">
            <div className="flex flex-wrap gap-2 mb-3">
              <span className={`px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wide border shadow-sm ${statusClass(selectedEventDetail.status)}`}>
                {statusText(t, selectedEventDetail.status)}
              </span>
              {selectedEventDetail.event_type ? (
                <span className="px-2.5 py-1 bg-white/80 text-gray-900 border border-black/10 rounded-lg text-[10px] font-bold uppercase tracking-wide shadow-sm backdrop-blur-md dark:bg-white/20 dark:text-white dark:border-white/20">
                  {toCatalogLabel("experience_type", selectedEventDetail.event_type, language)}
                </span>
              ) : null}
            </div>
            <h2 className="text-xl sm:text-3xl md:text-4xl font-black text-gray-900 dark:text-white tracking-tight mb-2 truncate">
              {selectedEventDetail.title || t("event_detail_title")}
            </h2>
            <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-xs font-medium text-gray-700 dark:text-gray-300">
              <span className="flex items-center gap-1.5">
                <Icon name="calendar" className="w-4 h-4 text-gray-700 dark:text-gray-300" />
                {eventDateLabel}
              </span>
              {eventTimeLabel ? (
                <span className="flex items-center gap-1.5">
                  <Icon name="clock" className="w-4 h-4 text-gray-700 dark:text-gray-300" />
                  {eventTimeLabel}
                </span>
              ) : null}
              <span className="flex items-center gap-1.5">
                <Icon name="location" className="w-4 h-4 text-gray-700 dark:text-gray-300" />
                <span className="truncate max-w-[200px] sm:max-w-sm">{eventPlaceLabel}</span>
              </span>
            </div>
            {renderEventHeaderActions({ inHero: true })}
          </div>
        </article>
      ) : null}

      {/* Cabecera para Vista Plan (o fallback si no hay hero) */}
      {!isPlanWorkspace ? (
        <div className={`flex flex-col gap-4 ${hasEventHeroCover ? "pt-2" : "border-b border-black/5 dark:border-white/10 pb-6"}`}>
          {!hasEventHeroCover ? (
            <div className="flex flex-col gap-2 min-w-0">
              <div className="flex flex-wrap items-center gap-3">
                <h2 className="text-2xl font-black text-gray-900 dark:text-white truncate">{selectedEventDetail?.title || t("event_detail_title")}</h2>
                {selectedEventDetail ? (
                  <span className={`px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wide border ${statusClass(selectedEventDetail.status)}`}>{statusText(t, selectedEventDetail.status)}</span>
                ) : null}
              </div>
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs font-medium text-gray-500 dark:text-gray-400">
                <span className="flex items-center gap-1.5">
                  <Icon name="calendar" className="w-3.5 h-3.5" />
                  {eventDateLabel}
                </span>
                {eventTimeLabel ? (
                  <span className="flex items-center gap-1.5">
                    <Icon name="clock" className="w-3.5 h-3.5" />
                    {eventTimeLabel}
                  </span>
                ) : null}
                <span className="flex items-center gap-1.5">
                  <Icon name="location" className="w-3.5 h-3.5" />
                  <span className="truncate max-w-[250px]">{eventPlaceLabel}</span>
                </span>
              </div>
              {renderEventHeaderActions()}
            </div>
          ) : null}
        </div>
      ) : null}

      {/* KPIs Row */}
      {selectedEventDetail && eventsWorkspace === "detail" ? (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
          <article className="bg-white/40 dark:bg-white/5 rounded-2xl border border-black/5 dark:border-white/10 p-4 flex flex-col items-center justify-center text-center shadow-sm">
            <p className="text-[10px] font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-1">{t("event_detail_total_invites")}</p>
            <p className="text-2xl font-black text-gray-900 dark:text-white leading-none">{selectedEventDetailInvitations.length}</p>
          </article>
          <article className="bg-white/40 dark:bg-white/5 rounded-2xl border border-black/5 dark:border-white/10 p-4 flex flex-col items-center justify-center text-center shadow-sm">
            <p className="text-[10px] font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-1">{t("status_yes")}</p>
            <p className="text-2xl font-black text-green-600 dark:text-green-400 leading-none">{selectedEventDetailStatusCounts.yes}</p>
          </article>
          <article className="bg-white/40 dark:bg-white/5 rounded-2xl border border-black/5 dark:border-white/10 p-4 flex flex-col items-center justify-center text-center shadow-sm">
            <p className="text-[10px] font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-1">{t("status_pending")}</p>
            <p className="text-2xl font-black text-yellow-600 dark:text-yellow-400 leading-none">{selectedEventDetailStatusCounts.pending}</p>
          </article>
          <article className="bg-white/40 dark:bg-white/5 rounded-2xl border border-black/5 dark:border-white/10 p-4 flex flex-col items-center justify-center text-center shadow-sm">
            <p className="text-[10px] font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-1">{t("status_no")}</p>
            <p className="text-2xl font-black text-red-600 dark:text-red-400 leading-none">{selectedEventDetailStatusCounts.no}</p>
          </article>
        </div>
      ) : null}

      <InlineMessage text={invitationMessage} />
      <InlineMessage text={shareCardMessage} />
      <InlineMessage type={spotifyFeedbackType} text={spotifyFeedback} />
      <InlineMessage text={eventDatePollMessage} />
      <InlineMessage type={groupInviteFeedbackType} text={groupInviteFeedback} />

      {/* Contenido Principal Grid */}
      {!selectedEventDetail ? (
        <p className="text-sm text-gray-500 dark:text-gray-400 italic text-center p-8">{t("event_detail_empty")}</p>
      ) : (
        <div
          className={`flex flex-col lg:grid ${
            eventsWorkspace === "plan"
              ? "grid-cols-1"
              : "grid-cols-1 lg:grid-cols-[minmax(0,2.05fr)_minmax(0,1fr)]"
          } gap-6`}
        >

          {eventsWorkspace === "detail" ? (
            <>
              {/* Columna principal */}
              <div className="flex flex-col gap-6 min-w-0">

                <article id="event-invitations" className="order-2 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden p-5 flex flex-col gap-4 scroll-mt-28">
                  {!hasEventHeroCover ? <p className="text-lg font-black text-gray-900 dark:text-white">{selectedEventDetail.title}</p> : null}

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-3 gap-x-6">
                    {selectedEventDetail.event_type ? (
                      <p className="text-xs flex flex-col gap-1">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">{t("field_event_type")}</span>
                        <strong className="text-gray-900 dark:text-white">{toCatalogLabel("experience_type", selectedEventDetail.event_type, language)}</strong>
                      </p>
                    ) : null}
                    <p className="text-xs flex flex-col gap-1">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">{t("date")}</span>
                      <strong className="text-gray-900 dark:text-white">{eventDateDisplay.fullLabel}</strong>
                    </p>
                    {eventPlaceName ? (
                      <p className="text-xs flex flex-col gap-1">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">{t("field_place")}</span>
                        <strong className="text-gray-900 dark:text-white">{eventPlaceName}</strong>
                      </p>
                    ) : null}
                    {eventPlaceAddress ? (
                      <p className="text-xs flex flex-col gap-1 sm:col-span-2">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">{t("field_address")}</span>
                        <span className="text-gray-900 dark:text-white">{eventPlaceAddress}</span>
                      </p>
                    ) : null}
                    {selectedEventDetail.description ? (
                      <p className="text-xs flex flex-col gap-1 sm:col-span-2 mt-2 pt-3 border-t border-black/5 dark:border-white/10">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">{t("field_event_description")}</span>
                        <span className="text-gray-700 dark:text-gray-300 leading-relaxed">{selectedEventDetail.description}</span>
                      </p>
                    ) : null}
                  </div>

                  <div className="flex flex-wrap gap-2 mt-2 pt-4 border-t border-black/5 dark:border-white/10">
                    <span className={`px-2.5 py-1 rounded-md text-[9px] font-bold uppercase tracking-wider border shadow-sm ${selectedEventDetail.allow_plus_one ? "bg-green-50 text-green-700 border-green-200 dark:bg-green-900/20 dark:text-green-400" : "bg-gray-100 text-gray-500 border-gray-200 dark:bg-gray-800 dark:text-gray-400"}`}>
                      {t("event_setting_allow_plus_one")}: {selectedEventDetail.allow_plus_one ? t("status_yes") : t("status_no")}
                    </span>
                    <span className={`px-2.5 py-1 rounded-md text-[9px] font-bold uppercase tracking-wider border shadow-sm ${selectedEventDetail.auto_reminders ? "bg-green-50 text-green-700 border-green-200 dark:bg-green-900/20 dark:text-green-400" : "bg-gray-100 text-gray-500 border-gray-200 dark:bg-gray-800 dark:text-gray-400"}`}>
                      {t("event_setting_auto_reminders")}: {selectedEventDetail.auto_reminders ? t("status_yes") : t("status_no")}
                    </span>
                    <span className="px-2.5 py-1 rounded-md text-[9px] font-bold uppercase tracking-wider border shadow-sm bg-yellow-50 text-yellow-800 border-yellow-200 dark:bg-yellow-900/20 dark:text-yellow-400">
                      {t("event_setting_dress_code")}: {t(`event_dress_code_${normalizeEventDressCode(selectedEventDetail.dress_code)}`)}
                    </span>
                    <span className="px-2.5 py-1 rounded-md text-[9px] font-bold uppercase tracking-wider border shadow-sm bg-blue-50 text-blue-800 border-blue-200 dark:bg-blue-900/20 dark:text-blue-400">
                      {t("event_setting_playlist_mode")}: {t(`event_playlist_mode_${normalizeEventPlaylistMode(selectedEventDetail.playlist_mode)}`)}
                    </span>
                  </div>

                  {selectedEventDetail.location_lat != null && selectedEventDetail.location_lng != null ? (
                    <div className="flex mt-2">
                      <a className="bg-black/5 hover:bg-black/10 dark:bg-white/10 dark:hover:bg-white/20 text-gray-700 dark:text-gray-300 font-bold py-2 px-4 rounded-xl transition-all text-xs flex items-center gap-2" href={`https://www.google.com/maps?q=${selectedEventDetail.location_lat},${selectedEventDetail.location_lng}`} target="_blank" rel="noreferrer">
                        <Icon name="location" className="w-3.5 h-3.5" />
                        {t("map_open_external")}
                      </a>
                    </div>
                  ) : null}
                </article>

                {shouldRenderDatePollSection ? (
                  <article
                    id="event-date-poll"
                    className="order-3 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden p-5 flex flex-col gap-4 scroll-mt-28"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div className="flex flex-col gap-1">
                        <p className="text-sm font-bold text-gray-900 dark:text-white flex items-center gap-2">
                          <Icon name="calendar" className="w-4 h-4 text-blue-500" />
                          {t("event_date_poll_title")}
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">{t("event_date_poll_subtitle")}</p>
                      </div>
                      <span
                        className={`px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wide border ${datePollOpen
                            ? "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-900/20 dark:text-blue-300 dark:border-blue-800/40"
                            : "bg-gray-100 text-gray-600 border-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:border-white/10"
                          }`}
                      >
                        {datePollOpen ? t("event_date_poll_open_badge") : t("event_date_poll_closed_badge")}
                      </span>
                    </div>

                    {hasDatePollOptions ? (
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                        {selectedEventDateOptions.map((optionItem, index) => {
                          const optionSummary = selectedEventDateVoteSummaryByOptionId?.[optionItem.id] || {
                            yes: 0,
                            no: 0,
                          maybe: 0,
                          pending: 0,
                          score: 0
                        };
                        const computedPending = Math.max(
                          0,
                          selectedEventDateVoteMatrixRows.length -
                            Number(optionSummary.yes || 0) -
                            Number(optionSummary.no || 0) -
                            Number(optionSummary.maybe || 0)
                        );
                        const optionDateLabel = formatDate(optionItem.startAt, language, t("no_date"));
                        const optionTimeLabel = formatTimeLabel(optionItem.startAt, language, t("no_date"));
                        const isWinningOption = selectedEventDatePollWinningOptionId === optionItem.id;
                        const isClosingOption = isClosingEventDatePollOptionId === optionItem.id;
                        return (
                          <article
                            key={optionItem.id}
                            className={`rounded-xl border p-3 flex flex-col gap-3 ${isWinningOption
                                ? "border-green-300 bg-green-50/70 dark:border-green-700/40 dark:bg-green-900/20"
                                : "border-black/5 bg-white/70 dark:border-white/10 dark:bg-black/20"
                              }`}
                          >
                            <div className="flex flex-wrap items-center justify-between gap-2">
                              <p className="text-[10px] font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                                {t("event_date_poll_vote_matrix_option")} #{index + 1}
                              </p>
                              {isWinningOption ? (
                                <span className="px-2 py-0.5 rounded-md text-[9px] font-bold uppercase tracking-wider border bg-green-100 text-green-700 border-green-200 dark:bg-green-900/30 dark:text-green-300 dark:border-green-700/30">
                                  {t("event_date_poll_winner_badge")}
                                </span>
                              ) : null}
                            </div>
                            <p className="text-sm font-bold text-gray-900 dark:text-white leading-snug">
                              {optionDateLabel}
                            </p>
                            <p className="text-xs text-gray-500 dark:text-gray-400">{optionTimeLabel}</p>
                            <div className="flex flex-wrap gap-1.5">
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300">
                                {t("status_yes")}: {optionSummary.yes}
                              </span>
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300">
                                {t("status_maybe")}: {optionSummary.maybe}
                              </span>
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300">
                                {t("status_no")}: {optionSummary.no}
                              </span>
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-300">
                                {t("status_pending")}: {computedPending}
                              </span>
                            </div>
                            {datePollOpen ? (
                              <button
                                type="button"
                                className="mt-1 inline-flex items-center justify-center gap-2 rounded-xl border border-green-300 bg-green-600 text-white px-3 py-2 text-xs font-bold hover:bg-green-700 disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
                                onClick={() => handleCloseEventDatePoll(optionItem.id)}
                                disabled={Boolean(isClosingEventDatePollOptionId)}
                              >
                                <Icon name={isClosingOption ? "loader" : "check"} className={`w-4 h-4 ${isClosingOption ? "animate-spin" : ""}`} />
                                {isClosingOption ? t("event_date_poll_closing") : t("event_date_poll_close_action")}
                              </button>
                            ) : null}
                          </article>
                          );
                        })}
                      </div>
                    ) : (
                      <p className="text-xs italic text-gray-500 dark:text-gray-400">{t("event_date_poll_options_empty")}</p>
                    )}

                    {hasDatePollOptions ? (
                      <div className="w-full overflow-x-auto relative rounded-xl border border-black/5 dark:border-white/10 bg-white/40 dark:bg-black/20">
                        <table className="w-full table-fixed text-left border-collapse text-sm">
                          <thead>
                            <tr>
                              <th className="w-1/3 md:w-1/4 max-w-[150px] truncate sticky left-0 z-20 bg-white dark:bg-gray-900 shadow-[1px_0_0_0_#e5e7eb] dark:shadow-[1px_0_0_0_#374151] px-4 py-2 text-[10px] font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400 border-b border-black/5 dark:border-white/10">
                                {t("event_date_poll_vote_matrix_guest")}
                              </th>
                              {selectedEventDateOptions.map((optionItem, index) => (
                                <th
                                  key={optionItem.id}
                                  className="px-4 py-2 text-center text-[10px] font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400 border-b border-black/5 dark:border-white/10"
                                >
                                  <span className="block">{t("event_date_poll_vote_matrix_option")} #{index + 1}</span>
                                  <span className="block normal-case text-[11px] font-medium text-gray-700 dark:text-gray-200 mt-0.5">
                                    {formatShortDate(optionItem.startAt, language, t("no_date"))}
                                  </span>
                                </th>
                              ))}
                            </tr>
                          </thead>
                          <tbody>
                            {selectedEventDateVoteMatrixRows.map((guestRow) => (
                              <tr key={guestRow.invitation.id} className="border-b border-black/5 dark:border-white/10 last:border-b-0">
                                <td className="w-1/3 md:w-1/4 max-w-[150px] truncate sticky left-0 z-10 bg-white dark:bg-gray-900 shadow-[1px_0_0_0_#e5e7eb] dark:shadow-[1px_0_0_0_#374151] px-4 py-2.5 border-r border-black/5 dark:border-white/10">
                                  <div className="flex items-center gap-2">
                                    <AvatarCircle
                                      label={guestRow.name || t("field_guest")}
                                      fallback={getInitials(guestRow.name || t("field_guest"), "IN")}
                                      imageUrl={getGuestAvatarUrl(guestRow.guest, guestRow.name)}
                                      size={24}
                                    />
                                    <span className="text-xs font-bold text-gray-900 dark:text-white truncate block w-full">
                                      {guestRow.name}
                                    </span>
                                  </div>
                                </td>
                                {selectedEventDateOptions.map((optionItem) => {
                                  const voteStatus = String(guestRow.votesByOptionId?.[optionItem.id] || "pending")
                                    .trim()
                                    .toLowerCase();
                                  const badgeClass =
                                    voteStatus === "yes"
                                      ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300"
                                      : voteStatus === "no"
                                        ? "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300"
                                        : voteStatus === "maybe"
                                          ? "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300"
                                          : "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-300";
                                  const voteLabel =
                                    voteStatus === "yes"
                                      ? t("status_yes")
                                      : voteStatus === "no"
                                        ? t("status_no")
                                        : voteStatus === "maybe"
                                          ? t("status_maybe")
                                          : t("status_pending");
                                  return (
                                    <td key={`${guestRow.invitation.id}-${optionItem.id}`} className="px-4 py-2 text-center">
                                      <span className={`inline-flex items-center justify-center rounded-full px-2 py-1 text-[10px] font-bold ${badgeClass}`}>
                                        {voteLabel}
                                      </span>
                                    </td>
                                  );
                                })}
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    ) : null}

                    {hasDatePollOptions && datePollTotalVotes === 0 ? (
                      <p className="text-xs text-gray-500 dark:text-gray-400 italic">{t("event_date_poll_no_votes")}</p>
                    ) : null}
                  </article>
                ) : null}

                <article className="order-1 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden p-5 flex flex-col gap-4">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <p className="text-sm font-bold text-gray-900 dark:text-white flex items-center gap-2">
                      <Icon name="users" className="w-4 h-4 text-blue-500" />
                      {t("event_detail_guest_list_title")}
                    </p>
                    <div className="flex flex-wrap items-center gap-2">
                      <button
                        className="bg-white hover:bg-gray-50 dark:bg-gray-800 dark:hover:bg-gray-700 text-gray-800 dark:text-gray-200 border border-black/10 dark:border-white/10 font-bold py-2 px-3 rounded-xl transition-all text-xs shadow-sm flex items-center gap-2"
                        type="button"
                        onClick={() =>
                          openInvitationCreate({
                            eventId: selectedEventDetail.id,
                            messageKey: "invitation_prefill_event"
                          })
                        }
                      >
                        <Icon name="mail" className="w-4 h-4" />
                        {t("event_detail_add_invitee_action")}
                      </button>
                      <button
                        className="bg-blue-600 hover:bg-blue-700 text-white border border-blue-600 font-bold py-2 px-3 rounded-xl transition-all text-xs shadow-sm flex items-center gap-2"
                        type="button"
                        onClick={handleOpenGroupInviteModal}
                      >
                        <Icon name="users" className="w-4 h-4" />
                        {t("event_group_invite_action")}
                      </button>
                    </div>
                  </div>

                  {selectedEventDetailGuests.length === 0 ? (
                    <p className="text-xs text-gray-500 italic p-4 text-center">{t("event_detail_no_invites")}</p>
                  ) : (
                    <div className="w-full overflow-x-hidden">
                      <table className="w-full table-fixed text-left border-collapse block sm:table">
                        <thead className="hidden sm:table-header-group">
                          <tr>
                            <th className="py-3 px-3 w-[52%] text-[10px] font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400 border-b border-black/5 dark:border-white/10">{t("field_guest")}</th>
                            <th className="py-3 px-3 text-[10px] font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400 border-b border-black/5 dark:border-white/10">{t("email")}</th>
                            <th className="py-3 sm:px-2 w-[96px] text-[10px] font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400 border-b border-black/5 dark:border-white/10">{t("status")}</th>
                            <th className="py-3 sm:px-2 w-[84px] text-[10px] font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400 border-b border-black/5 dark:border-white/10 text-right">{t("actions_label")}</th>
                          </tr>
                        </thead>
                        <tbody className="block sm:table-row-group divide-y-0 sm:divide-y divide-black/5 dark:divide-white/5">
                          {selectedEventDetailGuests.map((row) => {
                            const itemLabel = `${selectedEventDetail.title || t("field_event")} - ${row.name || t("field_guest")}`;
                            const rowGuestLabel = row.name || t("field_guest");
                            return (
                              <tr key={row.invitation.id} className="block sm:table-row flex flex-col mb-3 sm:mb-0 p-4 sm:p-0 rounded-xl sm:rounded-none border border-black/5 dark:border-white/5 sm:border-transparent bg-white/40 dark:bg-white/5 sm:bg-transparent shadow-sm sm:shadow-none hover:bg-black/5 dark:hover:bg-white/5 transition-colors group">
                                <td className="block sm:table-cell w-full sm:w-[52%] py-2 sm:py-2.5 px-0 sm:px-3 border-b border-black/5 dark:border-white/5 sm:border-none last:border-0 align-middle min-w-0">
                                  <span className="sm:hidden text-[10px] font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-1">{t("field_guest")}</span>
                                  <div className="flex items-center gap-3 min-w-0">
                                    <AvatarCircle
                                      className="flex-shrink-0"
                                      label={rowGuestLabel}
                                      fallback={getInitials(rowGuestLabel, "IN")}
                                      imageUrl={getGuestAvatarUrl(row.guest, rowGuestLabel)}
                                      size={32}
                                    />
                                    <button
                                      className="text-sm font-bold text-gray-900 dark:text-white hover:text-blue-600 dark:hover:text-blue-400 transition-colors text-left min-w-0 w-full whitespace-normal break-words sm:whitespace-nowrap sm:truncate"
                                      type="button"
                                      title={rowGuestLabel}
                                      onClick={() => openGuestDetail(row.guest?.id || row.invitation.guest_id)}
                                    >
                                      {rowGuestLabel}
                                    </button>
                                  </div>
                                </td>
                                <td className="block sm:table-cell py-2 sm:py-2.5 px-0 sm:px-3 border-b border-black/5 dark:border-white/5 sm:border-none last:border-0 align-middle min-w-0">
                                  <span className="sm:hidden text-[10px] font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-1">{t("email")}</span>
                                  <span className="text-xs text-gray-500 dark:text-gray-400 truncate block min-w-0" title={row.contact}>
                                    {row.contact}
                                  </span>
                                </td>
                                <td className="block sm:table-cell w-[96px] py-2 sm:py-2.5 px-0 sm:px-2 border-b border-black/5 dark:border-white/5 sm:border-none last:border-0 align-middle min-w-0 overflow-hidden">
                                  <span className="sm:hidden text-[10px] font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-1">{t("status")}</span>
                                  <span className={`px-2 py-0.5 rounded-lg text-[9px] font-bold uppercase tracking-wider border shadow-sm inline-block max-w-full truncate align-middle ${statusClass(row.invitation.status)}`}>
                                    {statusText(t, row.invitation.status)}
                                  </span>
                                </td>
                                <td className="block sm:table-cell w-[84px] py-2 sm:py-2.5 px-0 sm:px-2 border-none sm:border-none align-middle text-right overflow-hidden">
                                  <span className="sm:hidden text-[10px] font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-1 block text-left">{t("actions_label")}</span>
                                  <div className="flex items-center justify-end gap-1 mt-2 sm:mt-0">
                                    <button
                                      className="inline-flex items-center justify-center h-8 w-8 text-gray-500 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-md transition-colors"
                                      type="button"
                                      onClick={() => {
                                        const prepared = handlePrepareInvitationShare(row.invitation);
                                        if (prepared?.whatsappUrl) {
                                          window.open(prepared.whatsappUrl, "_blank", "noopener,noreferrer");
                                        }
                                      }}
                                      aria-label={t("invitation_send_message_action")}
                                      title={t("invitation_send_message_action")}
                                    >
                                      <Icon name="message" className="w-5 h-5" />
                                    </button>
                                    <button
                                      className="inline-flex items-center justify-center h-8 w-8 text-red-600 hover:text-red-700 hover:bg-red-50 dark:text-red-300 dark:hover:bg-red-900/20 rounded-md transition-colors border border-red-200/70 dark:border-red-700/40"
                                      type="button"
                                      onClick={() => handleRequestDeleteInvitation(row.invitation, itemLabel)}
                                      aria-label={t("event_detail_remove_guest_action")}
                                      title={t("event_detail_remove_guest_action")}
                                    >
                                      <Icon name="trash" className="w-4 h-4" />
                                    </button>
                                  </div>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}
                </article>

                <article className="order-4 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden p-5 flex flex-col gap-4">
                  <div className="flex items-center gap-2">
                    <Icon name="location" className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                    <p className="text-sm font-black text-gray-900 dark:text-white">
                      {t("event_venues_title")}
                    </p>
                  </div>
                  <p className="text-xs text-gray-600 dark:text-gray-300 leading-relaxed">
                    {t("event_venues_hint")}
                  </p>
                  <HostVenueSelector
                    eventId={selectedEventDetail?.id}
                    t={t}
                    onVenueAdded={loadEventVenues}
                  />
                </article>

                <article className="order-5 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden p-5 flex flex-col gap-4">
                  <div className="flex items-center gap-2">
                    <Icon name="star" className="w-4 h-4 text-amber-500" />
                    <p className="text-sm font-black text-gray-900 dark:text-white">
                      {t("event_venues_shortlist_title")}
                    </p>
                  </div>
                  <p className="text-xs text-gray-600 dark:text-gray-300 leading-relaxed">
                    {t("event_venues_shortlist_hint")}
                  </p>
                  <HostVenueShortlist
                    venues={eventVenues}
                    isLoading={isLoadingEventVenues}
                    feedback={eventVenuesFeedback}
                    feedbackType={eventVenuesFeedbackType}
                    onSelectFinal={handleSelectFinalVenue}
                    selectingVenueId={selectingFinalVenueId}
                    t={t}
                  />
                </article>

                <article id="event-rsvp-timeline" className="order-6 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden p-5 flex flex-col gap-4 scroll-mt-28">
                  <p className="text-sm font-bold text-gray-900 dark:text-white flex items-center gap-2">
                    <Icon name="clock" className="w-4 h-4 text-gray-500" />
                    {t("recent_activity_title")}
                  </p>
                  {selectedEventRsvpTimeline.length === 0 ? (
                    <p className="text-xs text-gray-500 italic text-center p-4">{t("recent_activity_empty")}</p>
                  ) : (
                    <div className="relative pl-3 mt-2">
                      <div className="absolute top-2 bottom-2 left-[15px] w-px bg-black/10 dark:bg-white/10"></div>
                      <ul className="flex flex-col gap-5 relative z-10">
                        {selectedEventRsvpTimeline.map((item) => (
                          <li key={item.id} className="flex gap-4 items-start">
                            <span className={`w-2.5 h-2.5 rounded-full mt-1.5 ring-4 ring-white dark:ring-gray-900 shrink-0 ${statusClass(item.status).replace('text-', 'bg-').replace('border-', 'bg-') || 'bg-gray-400'}`} />
                            <div className="flex flex-col gap-1">
                              <p className="text-sm font-bold text-gray-900 dark:text-white flex items-center gap-2">
                                {item.name}
                                <span className={`px-2 py-0.5 rounded-md text-[9px] font-bold uppercase tracking-wider border shadow-sm ${statusClass(item.status)}`}>{statusText(t, item.status)}</span>
                              </p>
                              <p className="text-xs text-gray-500 dark:text-gray-400">
                                {item.isResponse ? t("event_detail_timeline_response") : t("event_detail_timeline_sent")} · {formatDate(item.date, language, t("no_date"))}
                              </p>
                            </div>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </article>

              </div>

              {/* Columna lateral */}
              <div className="flex flex-col gap-6 min-w-0">

                {/* AI Planner Banner */}
                <article className="order-1 bg-indigo-50/50 dark:bg-indigo-900/10 rounded-xl border border-indigo-100 dark:border-indigo-800/50 shadow-sm overflow-hidden relative p-5 flex flex-col gap-4">
                  <div className="pointer-events-none absolute top-0 left-0 right-0 h-0.5 rounded-t-xl bg-gradient-to-r from-indigo-600 via-purple-500 to-pink-500 dark:from-indigo-400 dark:via-purple-400 dark:to-pink-400 z-10" />
                  <div className="flex justify-between items-start">
                    <span className="flex items-center gap-2 text-sm font-black">
                      <Icon name="sparkle" className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                      <span className="bg-clip-text text-transparent bg-gradient-to-r from-indigo-600 to-purple-600 dark:from-indigo-400 dark:to-purple-400">
                        {t("event_plan_cta_title")}
                      </span>
                    </span>
                    <span className="px-2.5 py-1 bg-indigo-100/80 dark:bg-indigo-900/30 border border-indigo-200 dark:border-indigo-700 rounded-lg text-[9px] font-bold uppercase tracking-wider text-indigo-700 dark:text-indigo-300">
                      {t("event_planner_ai_badge")}
                    </span>
                  </div>
                  <p className="text-xs font-medium text-gray-700 dark:text-gray-300 leading-relaxed">{t("event_plan_cta_hint")}</p>
                  <button className="bg-indigo-600 text-white hover:bg-indigo-700 font-bold py-2.5 px-4 rounded-xl transition-all text-xs w-full shadow-sm flex justify-center items-center gap-2 mt-1" type="button" onClick={() => handleOpenEventPlan("ambience")}>
                    {t("event_plan_cta_action")}
                    <Icon name="arrow_right" className="w-3.5 h-3.5" />
                  </button>
                </article>

                <article className="order-3 bg-indigo-50/50 dark:bg-indigo-900/10 rounded-xl border border-indigo-100 dark:border-indigo-800/50 shadow-sm overflow-hidden relative p-5 flex flex-col gap-3">
                  <div className="pointer-events-none absolute top-0 left-0 right-0 h-0.5 rounded-t-xl bg-gradient-to-r from-indigo-600 via-purple-500 to-pink-500 dark:from-indigo-400 dark:via-purple-400 dark:to-pink-400 z-10" />
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-2">
                      <span className="inline-flex w-8 h-8 items-center justify-center rounded-xl bg-indigo-100 dark:bg-indigo-900/40 border border-indigo-200 dark:border-indigo-700">
                        <Icon name="sparkle" className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                      </span>
                      <p className="text-sm font-black tracking-wide bg-clip-text text-transparent bg-gradient-to-r from-indigo-600 to-purple-600 dark:from-indigo-400 dark:to-purple-400">{t("event_icebreaker_title")}</p>
                    </div>
                    <span className="px-2 py-0.5 rounded-lg text-[9px] font-black uppercase tracking-wider bg-indigo-100/80 dark:bg-indigo-900/30 border border-indigo-200 dark:border-indigo-700 text-indigo-700 dark:text-indigo-300">
                      IA
                    </span>
                  </div>
                  <p className="text-xs text-gray-700 dark:text-gray-300 leading-relaxed">{t("event_icebreaker_hint")}</p>
                  <div className="grid grid-cols-1 gap-2">
                    <button
                      className="bg-indigo-600 text-white hover:bg-indigo-700 font-black py-2.5 px-4 rounded-xl transition-all text-xs shadow-sm w-full inline-flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed"
                      type="button"
                      onClick={() => handleGenerateEventIcebreaker?.()}
                      disabled={isIcebreakerLoading}
                    >
                      <Icon name={isIcebreakerLoading ? "clock" : "sparkle"} className={`w-4 h-4 ${isIcebreakerLoading ? "animate-pulse" : ""}`} />
                      <span>{isIcebreakerLoading ? t("event_icebreaker_loading_label") : t("event_icebreaker_action_generate")}</span>
                    </button>
                    {hasIcebreakerData ? (
                      <button
                        className="bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 border border-gray-200 dark:border-gray-700 text-gray-800 dark:text-gray-200 font-black py-2.5 px-4 rounded-xl transition-all text-xs shadow-sm w-full inline-flex items-center justify-center gap-2"
                        type="button"
                        onClick={() => handleOpenEventIcebreakerPanel?.()}
                      >
                        <Icon name="eye" className="w-4 h-4" />
                        <span>{t("event_icebreaker_action_open")}</span>
                      </button>
                    ) : null}
                  </div>
                </article>

                <article className="order-2 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden p-5 flex flex-col gap-4">
                  <div className="flex items-center gap-2">
                    <Icon name="activity" className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                    <p className="text-sm font-black text-gray-900 dark:text-white">{t("event_expenses_title")}</p>
                  </div>
                  <p className="text-xs text-gray-600 dark:text-gray-300 leading-relaxed">{t("event_expenses_hint")}</p>

                  <div className="rounded-2xl border border-black/5 dark:border-white/10 bg-white/80 dark:bg-black/20 p-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <label className="flex flex-col gap-1.5 sm:col-span-2">
                      <span className="text-[11px] font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                        {t("event_expenses_description_label")}
                      </span>
                      <input
                        className="w-full bg-white/90 dark:bg-black/35 border border-black/10 dark:border-white/10 rounded-xl px-3 py-2.5 text-sm font-semibold text-gray-900 dark:text-white outline-none focus:border-blue-500 transition-colors"
                        type="text"
                        placeholder={t("event_expenses_description_placeholder")}
                        value={splitExpenseDescription}
                        onChange={(event) => {
                          setSplitExpenseDescription(event.target.value);
                          if (splitHelperMessage) {
                            setSplitHelperMessage("");
                          }
                        }}
                      />
                    </label>
                    <label className="flex flex-col gap-1.5">
                      <span className="text-[11px] font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                        {t("event_expenses_amount_label")}
                      </span>
                      <input
                        className="w-full bg-white/90 dark:bg-black/35 border border-black/10 dark:border-white/10 rounded-xl px-3 py-2.5 text-sm font-semibold text-gray-900 dark:text-white outline-none focus:border-blue-500 transition-colors"
                        type="number"
                        inputMode="decimal"
                        min="0"
                        step="0.01"
                        placeholder={t("event_expenses_amount_placeholder")}
                        value={splitExpenseAmount}
                        onChange={(event) => {
                          setSplitExpenseAmount(event.target.value);
                          if (splitHelperMessage) {
                            setSplitHelperMessage("");
                          }
                        }}
                      />
                    </label>
                    <label className="flex flex-col gap-1.5">
                      <span className="text-[11px] font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                        {t("event_expenses_paid_by_label")}
                      </span>
                      <select
                        className="w-full bg-white/90 dark:bg-black/35 border border-black/10 dark:border-white/10 rounded-xl px-3 py-2.5 text-sm font-semibold text-gray-900 dark:text-white outline-none focus:border-blue-500 transition-colors"
                        value={splitExpensePaidBy}
                        onChange={(event) => {
                          setSplitExpensePaidBy(event.target.value);
                          if (splitHelperMessage) {
                            setSplitHelperMessage("");
                          }
                        }}
                      >
                        {!splitParticipants.length ? (
                          <option value="">{t("event_expenses_paid_by_placeholder")}</option>
                        ) : null}
                        {splitParticipants.map((participantName) => (
                          <option key={participantName} value={participantName}>
                            {participantName}
                          </option>
                        ))}
                      </select>
                    </label>
                    <button
                      className="sm:col-span-2 bg-blue-600 hover:bg-blue-700 text-white font-black py-2.5 px-4 rounded-xl transition-colors text-xs inline-flex items-center justify-center gap-2"
                      type="button"
                      onClick={handleAddSplitExpense}
                      disabled={!splitParticipants.length}
                    >
                      <Icon name="plus" className="w-4 h-4" />
                      <span>{t("event_expenses_add_action")}</span>
                    </button>
                  </div>

                  <div className="rounded-2xl border border-black/5 dark:border-white/10 bg-white/80 dark:bg-black/20 p-4 flex flex-col gap-3">
                    <p className="text-[11px] font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                      {t("event_expenses_list_title")}
                    </p>
                    {splitExpenses.length === 0 ? (
                      <p className="text-xs text-gray-500 dark:text-gray-400 italic">{t("event_expenses_list_empty")}</p>
                    ) : (
                      <ul className="flex flex-col gap-2">
                        {splitExpenses.map((expense) => (
                          <li
                            key={expense.id}
                            className="rounded-xl border border-black/5 dark:border-white/10 bg-white/90 dark:bg-gray-900/50 px-3 py-2.5 flex items-center justify-between gap-3"
                          >
                            <div className="min-w-0">
                              <p className="text-sm font-bold text-gray-900 dark:text-white truncate">{expense.description}</p>
                              <p className="text-[11px] text-gray-500 dark:text-gray-400">
                                {interpolateText(t("event_expenses_paid_by_value"), { name: expense.paidBy })}
                              </p>
                            </div>
                            <div className="flex items-center gap-2 shrink-0">
                              <span className="text-sm font-black text-emerald-700 dark:text-emerald-300">
                                {formatMoneyAmount(expense.amount, language)} €
                              </span>
                              <button
                                className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-red-200 dark:border-red-700/40 text-red-600 dark:text-red-300 hover:bg-red-50 dark:hover:bg-red-900/30 transition-colors"
                                type="button"
                                onClick={() => handleRemoveSplitExpense(expense.id)}
                                aria-label={t("event_expenses_remove_action")}
                                title={t("event_expenses_remove_action")}
                              >
                                <Icon name="trash" className="w-4 h-4" />
                              </button>
                            </div>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <article className="rounded-2xl bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700/40 px-4 py-3 flex flex-col gap-1">
                      <span className="text-[11px] font-bold uppercase tracking-wider text-blue-700/80 dark:text-blue-300/80">
                        {t("event_expenses_total_spent_label")}
                      </span>
                      <p className="text-2xl font-black text-blue-700 dark:text-blue-300 leading-none">
                        {formatMoneyAmount(splitTotalAmount, language)} €
                      </p>
                    </article>
                    <article className="rounded-2xl bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-200 dark:border-indigo-700/40 px-4 py-3 flex flex-col gap-1">
                      <span className="text-[11px] font-bold uppercase tracking-wider text-indigo-700/80 dark:text-indigo-300/80">
                        {t("event_expenses_people_count_label")}
                      </span>
                      <p className="text-2xl font-black text-indigo-700 dark:text-indigo-300 leading-none">
                        {splitTotalGuests || 0}
                      </p>
                    </article>
                    <article className="col-span-2 rounded-2xl bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-700/30 px-4 py-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                      <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-700/80 dark:text-emerald-300/80">
                        {t("event_expenses_per_person_label")}
                      </span>
                      <p className="text-xl sm:text-2xl font-black text-emerald-700 dark:text-emerald-300 leading-tight break-words">
                        {interpolateText(t("event_expenses_per_person_value"), { amount: splitPerPersonLabel })}
                      </p>
                    </article>
                  </div>

                  <div className="rounded-2xl border border-black/5 dark:border-white/10 bg-white/80 dark:bg-black/20 p-4 flex flex-col gap-3">
                    <div className="flex items-center gap-2">
                      <Icon name="trend" className="w-4 h-4 text-purple-600 dark:text-purple-300" />
                      <p className="text-sm font-black text-gray-900 dark:text-white">{t("event_expenses_settlement_title")}</p>
                    </div>

                    {splitTotalGuests <= 0 ? (
                      <p className="text-xs text-gray-500 dark:text-gray-400 italic">{t("event_expenses_people_zero")}</p>
                    ) : splitExpenses.length === 0 ? (
                      <p className="text-xs text-gray-500 dark:text-gray-400 italic">{t("event_expenses_settlement_empty")}</p>
                    ) : splitDebts.length === 0 ? (
                      <p className="text-xs font-semibold text-emerald-700 dark:text-emerald-300">{t("event_expenses_settlement_balanced")}</p>
                    ) : (
                      <ul className="flex flex-col gap-2">
                        {splitDebts.map((transaction, index) => (
                          <li
                            key={`${transaction.from}-${transaction.to}-${index}`}
                            className="rounded-xl border border-purple-200/70 dark:border-purple-700/30 bg-purple-50/70 dark:bg-purple-900/20 px-3 py-2.5 flex items-center justify-between gap-3"
                          >
                            <p className="text-xs font-semibold text-gray-800 dark:text-gray-100">
                              {interpolateText(t("event_expenses_settlement_row"), {
                                from: transaction.from,
                                to: transaction.to,
                                amount: `${formatMoneyAmount(transaction.amount, language)} €`
                              })}
                            </p>
                          </li>
                        ))}
                      </ul>
                    )}

                    <button
                      className="mt-1 inline-flex items-center justify-center gap-2 rounded-xl border border-green-600/60 bg-green-500 hover:bg-green-600 text-white font-black py-2.5 px-4 text-xs transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
                      type="button"
                      onClick={handleShareSettlementWhatsApp}
                      disabled={splitTotalAmount <= 0 || splitTotalGuests <= 0}
                      aria-label={t("event_expenses_whatsapp_action")}
                      title={t("event_expenses_whatsapp_action")}
                    >
                      <Icon name="message" className="w-4 h-4" />
                      <span>{t("event_expenses_whatsapp_action")}</span>
                    </button>
                  </div>

                  <InlineMessage type={splitHelperMessageType} text={splitHelperMessage} />
                </article>

                <article className="order-5 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden p-5 flex flex-col gap-4">
                  <p className="text-sm font-bold text-gray-900 dark:text-white flex items-center gap-2">
                    <Icon name="check" className="w-4 h-4 text-green-500" />
                    {t("event_detail_checklist_title")}
                  </p>
                  <ul className="flex flex-col gap-2.5">
                    {selectedEventChecklist.map((item) => (
                      <li key={item.key} className="flex items-center gap-3 p-2 hover:bg-white/40 dark:hover:bg-white/5 rounded-lg transition-colors">
                        <span className={`flex items-center justify-center w-5 h-5 rounded-full shrink-0 ${item.done ? "bg-green-100 text-green-600 dark:bg-green-900/30" : "bg-gray-100 text-gray-400 dark:bg-gray-800"}`}>
                          <Icon name={item.done ? "check" : "clock"} className="w-3 h-3" />
                        </span>
                        <span className={`text-xs font-medium ${item.done ? "text-gray-900 dark:text-white" : "text-gray-500 dark:text-gray-400"}`}>{item.label}</span>
                      </li>
                    ))}
                  </ul>
                </article>

                <article className="order-6 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden p-5 flex flex-col gap-4">
                  <div className="flex justify-between items-start">
                    <p className="text-sm font-bold text-gray-900 dark:text-white flex items-center gap-2">
                      <Icon name="shield" className="w-4 h-4 text-red-500" />
                      {t("event_detail_alerts_title")}
                    </p>
                    <div className="flex gap-2">
                      <span className="px-2 py-0.5 bg-green-50 text-green-700 dark:bg-green-900/20 dark:text-green-400 rounded-md text-[10px] font-bold shadow-sm" title={t("status_yes")}>
                        {selectedEventHealthAlertsConfirmedCount}
                      </span>
                      <span className="px-2 py-0.5 bg-yellow-50 text-yellow-700 dark:bg-yellow-900/20 dark:text-yellow-400 rounded-md text-[10px] font-bold shadow-sm" title={t("status_pending")}>
                        {selectedEventHealthAlertsPendingCount}
                      </span>
                    </div>
                  </div>

                  {selectedEventHealthAlerts.length > 0 ? (
                    <ul className="flex flex-col gap-2">
                      {selectedEventHealthAlerts.map((alertItem) => (
                        <li key={`${alertItem.guestName}-${alertItem.avoid.join("|")}`} className="text-xs text-gray-700 dark:text-gray-300 flex items-start gap-2 bg-red-50/50 dark:bg-red-900/10 p-3 rounded-xl border border-red-100 dark:border-red-900/30">
                          <Icon name="shield" className="w-3.5 h-3.5 text-red-500 shrink-0 mt-0.5" />
                          <span>
                            <strong className="text-red-700 dark:text-red-400">{alertItem.guestName}:</strong> {alertItem.avoid.join(", ")}
                          </span>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-xs text-gray-500 italic text-center p-4 bg-black/5 dark:bg-white/5 rounded-xl">{t("event_detail_alerts_empty")}</p>
                  )}
                </article>

                {typeof selectedEventDetail.location_lat === "number" && typeof selectedEventDetail.location_lng === "number" ? (
                  <article className="order-7 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden p-5 flex flex-col gap-4">
                    <p className="text-sm font-bold text-gray-900 dark:text-white flex items-center gap-2">
                      <Icon name="location" className="w-4 h-4 text-blue-500" />
                      {t("map_preview_title")}
                    </p>
                    <div className="w-full h-48 rounded-xl overflow-hidden shadow-inner border border-black/5 dark:border-white/10" aria-label={t("map_preview_title")}>
                      <iframe
                        title={t("map_preview_title")}
                        className="w-full h-full"
                        src={getMapEmbedUrl(selectedEventDetail.location_lat, selectedEventDetail.location_lng)}
                        loading="lazy"
                        referrerPolicy="no-referrer-when-downgrade"
                      />
                    </div>
                  </article>
                ) : null}

              </div>
            </>
          ) : null}

          {/* VISTA PLANNER (Ocupa todo el grid) */}
          {eventsWorkspace === "plan" ? (
            <div className="col-span-1">
              <HostPlanView
                standalone
                selectedEventTitle={selectedEventDetail?.title || t("event_detail_title")}
                selectedEventDateLabel={eventDateLabel}
                selectedEventTimeLabel={eventTimeLabel}
                selectedEventPlaceLabel={eventPlaceLabel}
                eventPlannerSectionRef={eventPlannerSectionRef}
                t={t}
                interpolateText={interpolateText}
                selectedEventMealPlan={selectedEventMealPlan}
                selectedEventPlannerContextEffective={selectedEventPlannerContextEffective}
                selectedEventPlannerSavedLabel={selectedEventPlannerSavedLabel}
                selectedEventPlannerSnapshotVersion={selectedEventPlannerSnapshotVersion}
                selectedEventPlannerSnapshotHistory={selectedEventPlannerSnapshotHistory}
                selectedEventPlannerVariantSeed={selectedEventPlannerVariantSeed}
                selectedEventPlannerTabSeed={selectedEventPlannerTabSeed}
                selectedEventPlannerLastGeneratedByScope={selectedEventPlannerLastGeneratedByScope}
                selectedEventPlannerGenerationState={selectedEventPlannerGenerationState}
                language={language}
                handleOpenEventPlannerContext={handleOpenEventPlannerContext}
                handleRegenerateEventPlanner={handleRegenerateEventPlanner}
                handleRestoreEventPlannerSnapshot={handleRestoreEventPlannerSnapshot}
                eventDetailPlannerTab={eventDetailPlannerTab}
                handleExportEventPlannerShoppingList={handleExportEventPlannerShoppingList}
                selectedEventDetailStatusCounts={selectedEventDetailStatusCounts}
                selectedEventDietTypesCount={selectedEventDietTypesCount}
                selectedEventAllergiesCount={selectedEventAllergiesCount}
                selectedEventMedicalConditionsCount={selectedEventMedicalConditionsCount}
                selectedEventDietaryMedicalRestrictionsCount={selectedEventDietaryMedicalRestrictionsCount}
                selectedEventCriticalRestrictions={selectedEventCriticalRestrictions}
                selectedEventHealthRestrictionHighlights={selectedEventHealthRestrictionHighlights}
                selectedEventRestrictionsCount={selectedEventRestrictionsCount}
                selectedEventIntolerancesCount={selectedEventIntolerancesCount}
                selectedEventHealthAlertsConfirmedCount={selectedEventHealthAlertsConfirmedCount}
                selectedEventHealthAlertsPendingCount={selectedEventHealthAlertsPendingCount}
                handleEventPlannerTabChange={handleEventPlannerTabChange}
                selectedEventShoppingTotalIngredients={selectedEventShoppingTotalIngredients}
                selectedEventEstimatedCostRange={selectedEventEstimatedCostRange}
                selectedEventShoppingProgress={selectedEventShoppingProgress}
                selectedEventShoppingItems={selectedEventShoppingItems}
                selectedEventShoppingCheckedSet={selectedEventShoppingCheckedSet}
                handleCopySelectedEventShoppingChecklist={handleCopySelectedEventShoppingChecklist}
                handleMarkAllEventPlannerShoppingItems={handleMarkAllEventPlannerShoppingItems}
                handleClearEventPlannerShoppingCheckedItems={handleClearEventPlannerShoppingCheckedItems}
                eventPlannerShoppingFilter={eventPlannerShoppingFilter}
                setEventPlannerShoppingFilter={setEventPlannerShoppingFilter}
                selectedEventShoppingCounts={selectedEventShoppingCounts}
                selectedEventShoppingGroupsFiltered={selectedEventShoppingGroupsFiltered}
                handleToggleEventPlannerShoppingItem={handleToggleEventPlannerShoppingItem}
                selectedEventHostPlaybook={selectedEventHostPlaybook}
                handleCopyEventPlannerMessages={handleCopyEventPlannerMessages}
                handleCopyEventPlannerPrompt={handleCopyEventPlannerPrompt}
                eventPlannerMessage={eventPlannerMessage}
              />
            </div>
          ) : null}

        </div>
      )}

      {selectedEventDetail ? (
        <div className="fixed -left-[9999px] top-0 opacity-0 pointer-events-none" aria-hidden="true">
          <div ref={shareCardRef}>
            <ShareCard
              eventName={selectedEventDetail.title || t("field_event")}
              eventDate={eventTimeLabel ? `${eventDateLabel} · ${eventTimeLabel}` : eventDateLabel}
              eventLocation={eventPlaceLabel}
              eventLocationAddress={eventPlaceAddress || ""}
              hostName={shareCardHostName}
              hostAvatarUrl={hostAvatarUrl}
              appName={t("app_name")}
              subtitle={t("event_share_card_subtitle")}
              footerMessage={t("event_share_card_footer_message")}
              dateLabel={t("date")}
              locationLabel={t("field_place")}
              hostLabel={t("event_share_card_host_label")}
            />
          </div>
        </div>
      ) : null}

      {selectedEventDetail && isTeamModalOpen
        ? renderGlobalModal(
            <div className="fixed inset-0 z-[120] flex items-center justify-center overflow-y-auto bg-black/55 backdrop-blur-sm p-4 sm:p-6">
          <div className="w-full max-w-2xl bg-white/95 dark:bg-gray-900/95 border border-black/10 dark:border-white/10 rounded-3xl shadow-2xl p-5 sm:p-6 flex flex-col gap-4 max-h-[88vh] overflow-y-auto">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-2">
                <span className="inline-flex w-9 h-9 items-center justify-center rounded-xl bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300 border border-blue-200 dark:border-blue-700/30">
                  <Icon name="users" className="w-4.5 h-4.5" />
                </span>
                <div className="flex flex-col">
                  <h3 className="text-lg font-black text-gray-900 dark:text-white">{t("event_team_modal_title")}</h3>
                  <p className="text-xs text-gray-500 dark:text-gray-400">{t("event_team_modal_hint")}</p>
                </div>
              </div>
              <button
                className="p-2 rounded-xl bg-black/5 hover:bg-black/10 dark:bg-white/10 dark:hover:bg-white/20 text-gray-600 dark:text-gray-300 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
                type="button"
                onClick={handleCloseEventTeamModal}
                disabled={isAddingCohost || Boolean(removingCohostId)}
                aria-label={t("close_modal")}
                title={t("close_modal")}
              >
                <Icon name="close" className="w-5 h-5" />
              </button>
            </div>

            {isEventOwner ? (
              <div className="rounded-2xl border border-black/10 dark:border-white/10 bg-white/70 dark:bg-black/20 p-4 grid grid-cols-1 sm:grid-cols-[1fr_auto] gap-3 items-end">
                <label className="flex flex-col gap-1">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                    {t("event_team_email_label")}
                  </span>
                  <input
                    type="email"
                    value={cohostEmailDraft}
                    onChange={(event) => setCohostEmailDraft(event.target.value)}
                    placeholder={t("event_team_email_placeholder")}
                    className="w-full rounded-xl border border-black/10 dark:border-white/10 bg-white/90 dark:bg-gray-800/90 px-3 py-2.5 text-sm text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500/60"
                  />
                </label>
                <button
                  className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2.5 px-4 rounded-xl transition-colors text-sm shadow-sm disabled:opacity-60 disabled:cursor-not-allowed"
                  type="button"
                  onClick={handleAddCohostByEmail}
                  disabled={isAddingCohost}
                >
                  {isAddingCohost ? t("event_team_adding") : t("event_team_add_action")}
                </button>
              </div>
            ) : (
              <p className="text-xs rounded-xl border border-amber-300/50 dark:border-amber-700/40 bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-300 px-3 py-2">
                {t("event_team_owner_only_hint")}
              </p>
            )}

            {cohostFeedback ? (
              <p
                className={`text-xs rounded-xl px-3 py-2 border ${
                  cohostFeedbackType === "error"
                    ? "bg-red-50 text-red-700 border-red-200 dark:bg-red-900/20 dark:text-red-300 dark:border-red-800/40"
                    : cohostFeedbackType === "success"
                    ? "bg-green-50 text-green-700 border-green-200 dark:bg-green-900/20 dark:text-green-300 dark:border-green-800/40"
                    : "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-900/20 dark:text-blue-300 dark:border-blue-800/40"
                }`}
              >
                {cohostFeedback}
              </p>
            ) : null}

            <div className="rounded-2xl border border-black/10 dark:border-white/10 bg-white/70 dark:bg-black/20 overflow-hidden">
              <div className="px-4 py-3 border-b border-black/5 dark:border-white/10 flex items-center justify-between gap-3">
                <p className="text-sm font-black text-gray-900 dark:text-white">{t("event_team_list_title")}</p>
                {isLoadingCohosts ? (
                  <span className="text-[11px] text-gray-500 dark:text-gray-400">{t("event_team_loading_short")}</span>
                ) : (
                  <span className="text-[11px] text-gray-500 dark:text-gray-400">
                    {interpolateText(t("event_team_list_count"), { count: cohosts.length })}
                  </span>
                )}
              </div>
              {isLoadingCohosts ? (
                <p className="px-4 py-4 text-xs text-gray-500 dark:text-gray-400">{t("event_team_loading")}</p>
              ) : cohosts.length === 0 ? (
                <p className="px-4 py-4 text-xs text-gray-500 dark:text-gray-400">{t("event_team_empty")}</p>
              ) : (
                <ul className="divide-y divide-black/5 dark:divide-white/10">
                  {cohosts.map((cohostItem) => {
                    const cohostId = String(cohostItem?.host_id || "").trim();
                    const isOwnerRow = Boolean(cohostItem?.isOwnerRow);
                    const canRemove = isEventOwner && !isOwnerRow;
                    return (
                      <li key={String(cohostItem?.id || cohostId)} className="px-4 py-3 flex items-center justify-between gap-3">
                        <div className="min-w-0 flex items-center gap-3">
                          <AvatarCircle
                            label={cohostItem?.displayName || cohostId || t("event_team_member_unknown")}
                            fallback={getInitials(cohostItem?.displayName || cohostId || "")}
                            imageUrl={String(cohostItem?.avatarUrl || "").trim()}
                            size={36}
                            className="text-[11px] font-black"
                          />
                          <div className="min-w-0 flex flex-col">
                            <p className="text-sm font-bold text-gray-900 dark:text-white truncate">
                              {cohostItem?.displayName || t("event_team_member_unknown")}
                            </p>
                          </div>
                        </div>
                        <div className="shrink-0 flex items-center gap-2">
                          <span
                            className={`px-2 py-1 rounded-full text-[10px] font-bold uppercase tracking-wide ${
                              isOwnerRow
                                ? "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300 border border-indigo-200/80 dark:border-indigo-700/50"
                                : "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300 border border-blue-200/80 dark:border-blue-700/50"
                            }`}
                          >
                            {isOwnerRow ? t("event_team_role_owner") : t("event_team_role_editor")}
                          </span>
                          {canRemove ? (
                            <button
                              type="button"
                              className="px-2.5 py-1.5 rounded-lg text-[11px] font-bold border border-red-200 text-red-700 hover:bg-red-50 dark:border-red-800/40 dark:text-red-300 dark:hover:bg-red-900/20 disabled:opacity-60 disabled:cursor-not-allowed"
                              onClick={() => handleRemoveCohost(cohostItem)}
                              disabled={removingCohostId === String(cohostItem?.id || "")}
                            >
                              {removingCohostId === String(cohostItem?.id || "") ? t("deleting") : t("event_team_remove_action")}
                            </button>
                          ) : null}
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          </div>
            </div>
          )
        : null}

      {selectedEventDetail && isGroupInviteModalOpen
        ? renderGlobalModal(
            <div className="fixed inset-0 z-[120] flex items-center justify-center overflow-y-auto bg-black/55 backdrop-blur-sm p-4 sm:p-6">
              <div className="w-full max-w-lg bg-white/95 dark:bg-gray-900/95 border border-black/10 dark:border-white/10 rounded-3xl shadow-2xl p-5 sm:p-6 flex flex-col gap-4 max-h-[86vh] overflow-y-auto">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <span className="inline-flex w-9 h-9 items-center justify-center rounded-xl bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300 border border-blue-200 dark:border-blue-700/30">
                      <Icon name="users" className="w-4.5 h-4.5" />
                    </span>
                    <div className="flex flex-col">
                      <h3 className="text-lg font-black text-gray-900 dark:text-white">{t("event_group_invite_modal_title")}</h3>
                      <p className="text-xs text-gray-500 dark:text-gray-400">{t("event_group_invite_modal_hint")}</p>
                    </div>
                  </div>
                  <button
                    className="p-2 rounded-xl bg-black/5 hover:bg-black/10 dark:bg-white/10 dark:hover:bg-white/20 text-gray-600 dark:text-gray-300 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
                    type="button"
                    onClick={handleCloseGroupInviteModal}
                    disabled={isInvitingGuestGroup}
                    aria-label={t("close_modal")}
                    title={t("close_modal")}
                  >
                    <Icon name="close" className="w-5 h-5" />
                  </button>
                </div>

                {isLoadingGuestGroups ? (
                  <div className="rounded-2xl border border-black/10 dark:border-white/10 bg-white/70 dark:bg-black/20 p-4">
                    <p className="text-xs text-gray-500 dark:text-gray-400">{t("guest_groups_loading")}</p>
                  </div>
                ) : eventGuestGroups.length === 0 ? (
                  <div className="rounded-2xl border border-dashed border-black/20 dark:border-white/20 bg-white/50 dark:bg-black/20 p-5 flex flex-col gap-3 items-start">
                    <p className="text-sm font-bold text-gray-900 dark:text-white">{t("event_group_invite_empty_title")}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">{t("event_group_invite_empty_hint")}</p>
                    <button
                      className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-3 rounded-xl transition-colors text-xs"
                      type="button"
                      onClick={() => {
                        handleCloseGroupInviteModal();
                        openWorkspace("guests", "groups");
                      }}
                    >
                      {t("event_group_invite_open_groups_action")}
                    </button>
                  </div>
                ) : (
                  <div className="rounded-2xl border border-black/10 dark:border-white/10 bg-white/70 dark:bg-black/20 p-4 flex flex-col gap-3">
                    <label className="flex flex-col gap-1.5">
                      <span className="text-[11px] font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                        {t("event_group_invite_select_label")}
                      </span>
                      <select
                        className="w-full rounded-xl border border-black/10 dark:border-white/10 bg-white/90 dark:bg-gray-800/90 px-3 py-2.5 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/60"
                        value={selectedGuestGroupId}
                        onChange={(event) => setSelectedGuestGroupId(event.target.value)}
                      >
                        <option value="">{t("event_group_invite_select_placeholder")}</option>
                        {eventGuestGroups.map((groupItem) => (
                          <option key={groupItem.id} value={groupItem.id}>
                            {groupItem.name}
                          </option>
                        ))}
                      </select>
                    </label>
                    <button
                      className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2.5 px-4 rounded-xl transition-colors text-sm disabled:opacity-60 disabled:cursor-not-allowed"
                      type="button"
                      onClick={handleInviteGroupToEvent}
                      disabled={isInvitingGuestGroup}
                    >
                      {isInvitingGuestGroup ? t("event_group_invite_loading") : t("event_group_invite_confirm_action")}
                    </button>
                  </div>
                )}
              </div>
            </div>
          )
        : null}

      {selectedEventDetail && isIcebreakerOpen
        ? renderGlobalModal(
            <div className="fixed inset-0 z-[120] flex items-center justify-center overflow-y-auto bg-black/55 backdrop-blur-sm p-4 sm:p-6">
          <div className="w-full max-w-xl bg-white/95 dark:bg-gray-900/95 border border-black/10 dark:border-white/10 rounded-3xl shadow-2xl p-5 sm:p-6 flex flex-col gap-4 max-h-[85vh] overflow-y-auto">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-2">
                <span className="inline-flex w-9 h-9 items-center justify-center rounded-xl bg-fuchsia-100 text-fuchsia-700 dark:bg-fuchsia-900/30 dark:text-fuchsia-300 border border-fuchsia-200 dark:border-fuchsia-700/30">
                  <Icon name="sparkle" className="w-4.5 h-4.5" />
                </span>
                <div className="flex flex-col">
                  <h3 className="text-lg font-black text-gray-900 dark:text-white">{t("event_icebreaker_modal_title")}</h3>
                  {icebreakerGeneratedAtLabel ? (
                    <p className="text-[11px] text-gray-500 dark:text-gray-400">
                      {interpolateText(t("event_icebreaker_generated_at"), { date: icebreakerGeneratedAtLabel })}
                    </p>
                  ) : null}
                </div>
              </div>
              <button
                className="p-2 rounded-xl bg-black/5 hover:bg-black/10 dark:bg-white/10 dark:hover:bg-white/20 text-gray-600 dark:text-gray-300 transition-colors"
                type="button"
                onClick={() => handleCloseEventIcebreakerPanel?.()}
                aria-label={t("close_modal")}
                title={t("close_modal")}
              >
                <Icon name="close" className="w-5 h-5" />
              </button>
            </div>

            {isIcebreakerLoading ? (
              <div className="rounded-2xl border border-fuchsia-200/70 dark:border-fuchsia-700/30 bg-fuchsia-50/70 dark:bg-fuchsia-950/20 p-5 text-center flex flex-col gap-2 items-center">
                <Icon name="sparkle" className="w-8 h-8 text-fuchsia-500 animate-pulse" />
                <p className="text-sm font-black text-fuchsia-700 dark:text-fuchsia-300">{t("event_icebreaker_loading_title")}</p>
                <p className="text-xs text-fuchsia-600/90 dark:text-fuchsia-300/90">{t("event_icebreaker_loading_label")}</p>
              </div>
            ) : null}

            {!isIcebreakerLoading && icebreakerError ? (
              <div className="rounded-2xl border border-red-200 dark:border-red-800/40 bg-red-50 dark:bg-red-900/20 p-4 flex flex-col gap-2">
                <p className="text-sm font-bold text-red-700 dark:text-red-300">{t("event_icebreaker_error")}</p>
                <p className="text-xs text-red-600 dark:text-red-300/90">{icebreakerError}</p>
                <button
                  className="self-start mt-1 bg-red-100 hover:bg-red-200 dark:bg-red-900/40 dark:hover:bg-red-900/60 text-red-800 dark:text-red-200 border border-red-200 dark:border-red-700/50 font-bold px-3 py-2 rounded-lg text-xs transition-colors"
                  type="button"
                  onClick={() => handleGenerateEventIcebreaker?.()}
                >
                  {t("event_icebreaker_retry")}
                </button>
              </div>
            ) : null}

            {!isIcebreakerLoading && hasIcebreakerData ? (
              <div className="flex flex-col gap-4">
                <article className="rounded-2xl border border-black/5 dark:border-white/10 bg-white/80 dark:bg-black/20 p-4">
                  <p className="text-[11px] font-black uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-2">
                    {t("event_icebreaker_bad_joke_title")}
                  </p>
                  <p className="text-sm font-semibold text-gray-900 dark:text-white leading-relaxed">
                    {icebreakerData.badJoke || "—"}
                  </p>
                </article>

                <article className="rounded-2xl border border-black/5 dark:border-white/10 bg-white/80 dark:bg-black/20 p-4">
                  <p className="text-[11px] font-black uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-2">
                    {t("event_icebreaker_topics_title")}
                  </p>
                  <ul className="list-disc pl-5 space-y-1.5">
                    {(icebreakerTopics.length > 0 ? icebreakerTopics : [t("event_icebreaker_topics_empty")]).map((topicItem, index) => (
                      <li key={`topic-${index}`} className="text-sm text-gray-800 dark:text-gray-200 leading-relaxed">
                        {topicItem}
                      </li>
                    ))}
                  </ul>
                </article>

                <article className="rounded-2xl border border-black/5 dark:border-white/10 bg-white/80 dark:bg-black/20 p-4">
                  <p className="text-[11px] font-black uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-2">
                    {t("event_icebreaker_game_title")}
                  </p>
                  <p className="text-sm text-gray-800 dark:text-gray-200 leading-relaxed">
                    {icebreakerData.quickGameIdea || "—"}
                  </p>
                </article>
              </div>
            ) : null}
          </div>
            </div>
          )
        : null}
    </section>
  );
}
