import React, { useEffect, useRef, useState } from "react";
import { toBlob } from "html-to-image";
import { Icon } from "../../../components/icons";
import { InlineMessage } from "../../../components/inline-message";
import { AvatarCircle } from "../../../components/avatar-circle";
import { HostPlanView } from "./host-plan-view";
import { getInitials } from "../../../lib/formatters";
import { ShareCard } from "../../../components/events/ShareCard";

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

function getEventPlaceLookupValue(eventItem) {
  if (!eventItem) {
    return "";
  }
  if (typeof eventItem.location_lat === "number" && typeof eventItem.location_lng === "number") {
    return `${eventItem.location_lat},${eventItem.location_lng}`;
  }
  return String(eventItem.location_address || eventItem.location_name || "").trim();
}

function buildSatelliteEmbedUrl(eventItem, zoom = 17) {
  const placeLookup = getEventPlaceLookupValue(eventItem);
  if (!placeLookup) {
    return "";
  }
  return `https://maps.google.com/maps?q=${encodeURIComponent(placeLookup)}&t=k&z=${zoom}&ie=UTF8&output=embed`;
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

export function EventDetailView({
  eventsWorkspace,
  openWorkspace,
  handleBackToEventDetail,
  selectedEventDetail,
  t,
  statusClass,
  statusText,
  formatLongDate,
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
  invitationMessage,
  toCatalogLabel,
  formatDate,
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
  const [isSharingInvitationImage, setIsSharingInvitationImage] = useState(false);
  const [shareCardMessage, setShareCardMessage] = useState("");
  const [splitTotalAmount, setSplitTotalAmount] = useState("");
  const [splitBizumTarget, setSplitBizumTarget] = useState("");
  const [splitGeneratedMessage, setSplitGeneratedMessage] = useState("");
  const [splitHelperMessage, setSplitHelperMessage] = useState("");
  const [splitHelperMessageType, setSplitHelperMessageType] = useState("info");
  const isPlanWorkspace = eventsWorkspace === "plan";
  const eventDateLabel = formatLongDate(selectedEventDetail?.start_at, language, t("no_date"));
  const eventTimeLabel = formatTimeLabel(selectedEventDetail?.start_at, language, t("no_date"));
  const eventPlaceLabel = selectedEventDetail?.location_name || selectedEventDetail?.location_address || "-";
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
  const confirmedGuestsCount = Math.max(0, Number(selectedEventDetailStatusCounts?.yes || 0));
  const splitTotalNumeric = Number(splitTotalAmount);
  const safeSplitTotal = Number.isFinite(splitTotalNumeric) && splitTotalNumeric > 0 ? splitTotalNumeric : 0;
  const splitPerPersonAmount = confirmedGuestsCount > 0 ? safeSplitTotal / confirmedGuestsCount : 0;
  const splitPerPersonLabel = formatMoneyAmount(splitPerPersonAmount, language);
  const canGenerateSplitMessage =
    safeSplitTotal > 0 && confirmedGuestsCount > 0 && Boolean(String(splitBizumTarget || "").trim());

  useEffect(() => {
    setSplitTotalAmount("");
    setSplitBizumTarget("");
    setSplitGeneratedMessage("");
    setSplitHelperMessage("");
    setSplitHelperMessageType("info");
  }, [selectedEventDetail?.id]);

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
      const shareText = interpolateText(t("event_share_card_share_text"), {
        event: selectedEventDetail?.title || t("field_event"),
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
      } catch (_clipError) {
        // Non-critical: proceed with download even if clipboard fails
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

  const handleGenerateSplitMessage = () => {
    if (!canGenerateSplitMessage) {
      setSplitHelperMessageType("error");
      setSplitHelperMessage(t("event_expenses_missing_data"));
      return;
    }
    const totalLabel = `${formatMoneyAmount(safeSplitTotal, language)} €`;
    const amountLabel = `${formatMoneyAmount(splitPerPersonAmount, language)} €`;
    const nextMessage = interpolateText(t("event_expenses_generated_template"), {
      event: selectedEventDetail?.title || t("field_event"),
      total: totalLabel,
      count: confirmedGuestsCount,
      amount: amountLabel,
      bizum: String(splitBizumTarget || "").trim()
    });
    setSplitGeneratedMessage(nextMessage);
    setSplitHelperMessage("");
  };

  const handleCopySplitMessage = async () => {
    const payload = String(splitGeneratedMessage || "").trim();
    if (!payload) {
      setSplitHelperMessageType("error");
      setSplitHelperMessage(t("event_expenses_message_empty"));
      return;
    }
    try {
      await navigator.clipboard.writeText(payload);
      setSplitHelperMessageType("success");
      setSplitHelperMessage(t("event_expenses_copied"));
    } catch {
      setSplitHelperMessageType("error");
      setSplitHelperMessage(t("event_expenses_copy_error"));
    }
  };

  const handleSendSplitMessageWhatsApp = () => {
    const payload = String(splitGeneratedMessage || "").trim();
    if (!payload) {
      setSplitHelperMessageType("error");
      setSplitHelperMessage(t("event_expenses_message_empty"));
      return;
    }
    const encodedText = encodeURIComponent(payload);
    const whatsappUrl = `https://wa.me/?text=${encodedText}`;
    window.open(whatsappUrl, "_blank", "noopener,noreferrer");
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
        <article className="relative w-full h-48 sm:h-64 md:h-72 rounded-2xl overflow-hidden shadow-inner group" aria-label={t("event_detail_cover_title")}>
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
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent flex flex-col justify-end p-5 sm:p-6 md:p-8">
            <div className="flex flex-wrap gap-2 mb-3">
              <span className={`px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wide border shadow-sm ${statusClass(selectedEventDetail.status)}`}>
                {statusText(t, selectedEventDetail.status)}
              </span>
              {selectedEventDetail.event_type ? (
                <span className="px-2.5 py-1 bg-white/20 backdrop-blur-md text-white border border-white/20 rounded-lg text-[10px] font-bold uppercase tracking-wide shadow-sm">
                  {toCatalogLabel("experience_type", selectedEventDetail.event_type, language)}
                </span>
              ) : null}
            </div>
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-black text-white tracking-tight mb-3 drop-shadow-md">
              {selectedEventDetail.title || t("event_detail_title")}
            </h2>
            <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-xs font-medium text-white/90">
              <span className="flex items-center gap-1.5 drop-shadow-sm">
                <Icon name="calendar" className="w-4 h-4" />
                {eventDateLabel}
              </span>
              <span className="flex items-center gap-1.5 drop-shadow-sm">
                <Icon name="clock" className="w-4 h-4" />
                {eventTimeLabel}
              </span>
              <span className="flex items-center gap-1.5 drop-shadow-sm">
                <Icon name="location" className="w-4 h-4" />
                <span className="truncate max-w-[200px] sm:max-w-sm">{eventPlaceLabel}</span>
              </span>
            </div>
          </div>
        </article>
      ) : null}

      {/* Cabecera para Vista Plan (o fallback si no hay hero) */}
      {!isPlanWorkspace ? (
        <div className={`flex flex-col sm:flex-row flex-wrap justify-between items-start sm:items-center gap-4 ${hasEventHeroCover ? "pt-2" : "border-b border-black/5 dark:border-white/10 pb-6"}`}>
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
                <span className="flex items-center gap-1.5">
                  <Icon name="clock" className="w-3.5 h-3.5" />
                  {eventTimeLabel}
                </span>
                <span className="flex items-center gap-1.5">
                  <Icon name="location" className="w-3.5 h-3.5" />
                  <span className="truncate max-w-[250px]">{eventPlaceLabel}</span>
                </span>
              </div>
            </div>
          ) : null}

          {/* Acciones principales de la Ficha */}
          {selectedEventDetail ? (
            <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto shrink-0">
              <button className="bg-purple-100 hover:bg-purple-200 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300 dark:hover:bg-purple-900/50 border border-purple-200 dark:border-purple-800/30 font-bold py-2.5 px-4 rounded-xl transition-all text-xs shadow-sm flex items-center gap-2 flex-1 sm:flex-initial justify-center" type="button" onClick={() => handleOpenEventPlan("ambience")}>
                <Icon name="sparkle" className="w-4 h-4" />
                {t("event_plan_cta_action")}
              </button>
              <button className="bg-white hover:bg-gray-50 dark:bg-gray-800 dark:hover:bg-gray-700 text-gray-800 dark:text-gray-200 border border-black/10 dark:border-white/10 font-bold py-2.5 px-4 rounded-xl transition-all text-xs shadow-sm flex items-center gap-2 flex-1 sm:flex-initial justify-center" type="button" onClick={() => handleStartEditEvent(selectedEventDetail)}>
                <Icon name="edit" className="w-4 h-4" />
                {t("event_detail_edit_action")}
              </button>
              <button
                className="bg-white hover:bg-gray-50 dark:bg-gray-800 dark:hover:bg-gray-700 text-gray-800 dark:text-gray-200 border border-black/10 dark:border-white/10 font-bold py-2.5 px-4 rounded-xl transition-all text-xs shadow-sm flex items-center gap-2 flex-1 sm:flex-initial justify-center disabled:opacity-60 disabled:cursor-not-allowed"
                type="button"
                onClick={handleShareInvitationImage}
                disabled={isSharingInvitationImage}
              >
                <Icon name="camera" className="w-4 h-4" />
                {isSharingInvitationImage ? t("event_share_card_generating") : t("event_share_card_action")}
              </button>

              <div className="relative group">
                <button className="bg-white hover:bg-gray-50 dark:bg-gray-800 dark:hover:bg-gray-700 text-gray-800 dark:text-gray-200 border border-black/10 dark:border-white/10 font-bold p-2.5 rounded-xl transition-all shadow-sm flex items-center justify-center" aria-label={t("open_menu")} title={t("open_menu")}>
                  <Icon name="more_horizontal" className="w-4 h-4" />
                </button>
                <div className="absolute right-0 top-full mt-2 w-56 bg-white dark:bg-gray-800 border border-black/5 dark:border-white/10 rounded-xl shadow-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-50 overflow-hidden">
                  {selectedEventDetailPrimaryShare?.url ? (
                    <a
                      className="w-full text-left px-4 py-3 text-xs font-bold text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 flex items-center gap-2 transition-colors"
                      href={selectedEventDetailPrimaryShare.url}
                      target="_blank"
                      rel="noreferrer"
                    >
                      <Icon name="mail" className="w-3.5 h-3.5" />
                      <span>{t("open_rsvp")}</span>
                    </a>
                  ) : (
                    <button
                      className="w-full text-left px-4 py-3 text-xs font-bold text-gray-700 dark:text-gray-300 hover:bg-black/5 dark:hover:bg-white/5 flex items-center gap-2 transition-colors"
                      type="button"
                      onClick={() =>
                        openInvitationCreate({
                          eventId: selectedEventDetail.id,
                          messageKey: "invitation_prefill_event"
                        })
                      }
                    >
                      <Icon name="mail" className="w-3.5 h-3.5 text-blue-500" />
                      <span>{t("event_detail_create_invitation_action")}</span>
                    </button>
                  )}
                </div>
              </div>
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

      {/* Contenido Principal Grid */}
      {!selectedEventDetail ? (
        <p className="text-sm text-gray-500 dark:text-gray-400 italic text-center p-8">{t("event_detail_empty")}</p>
      ) : (
        <div className={`flex flex-col lg:grid ${eventsWorkspace === "plan" ? "grid-cols-1" : "grid-cols-12"} gap-6`}>

          {eventsWorkspace === "detail" ? (
            <>
              {/* Columna Izquierda (7/12) */}
              <div className="col-span-12 lg:col-span-7 flex flex-col gap-6">

                <article id="event-invitations" className="bg-white/50 dark:bg-white/5 rounded-2xl border border-black/5 dark:border-white/10 p-5 shadow-sm flex flex-col gap-4 scroll-mt-28">
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
                      <strong className="text-gray-900 dark:text-white">{formatDate(selectedEventDetail.start_at, language, t("no_date"))}</strong>
                    </p>
                    {selectedEventDetail.location_name ? (
                      <p className="text-xs flex flex-col gap-1">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">{t("field_place")}</span>
                        <strong className="text-gray-900 dark:text-white">{selectedEventDetail.location_name}</strong>
                      </p>
                    ) : null}
                    {selectedEventDetail.location_address ? (
                      <p className="text-xs flex flex-col gap-1 sm:col-span-2">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">{t("field_address")}</span>
                        <span className="text-gray-900 dark:text-white">{selectedEventDetail.location_address}</span>
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

                <article className="bg-white/50 dark:bg-white/5 rounded-2xl border border-black/5 dark:border-white/10 p-5 shadow-sm flex flex-col gap-4 overflow-hidden">
                  <p className="text-sm font-bold text-gray-900 dark:text-white flex items-center gap-2">
                    <Icon name="users" className="w-4 h-4 text-blue-500" />
                    {t("event_detail_guest_list_title")}
                  </p>

                  {selectedEventDetailGuests.length === 0 ? (
                    <p className="text-xs text-gray-500 italic p-4 text-center">{t("event_detail_no_invites")}</p>
                  ) : (
                    <div className="w-full">
                      <table className="w-full text-left border-collapse block sm:table">
                        <thead className="hidden sm:table-header-group">
                          <tr>
                            <th className="py-3 px-3 text-[10px] font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400 border-b border-black/5 dark:border-white/10">{t("field_guest")}</th>
                            <th className="py-3 px-3 text-[10px] font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400 border-b border-black/5 dark:border-white/10">{t("email")}</th>
                            <th className="py-3 px-3 text-[10px] font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400 border-b border-black/5 dark:border-white/10">{t("status")}</th>
                            <th className="py-3 px-3 text-[10px] font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400 border-b border-black/5 dark:border-white/10 text-right"></th>
                          </tr>
                        </thead>
                        <tbody className="block sm:table-row-group divide-y-0 sm:divide-y divide-black/5 dark:divide-white/5">
                          {selectedEventDetailGuests.map((row) => {
                            const itemLabel = `${selectedEventDetail.title || t("field_event")} - ${row.name || t("field_guest")}`;
                            const rowGuestLabel = row.name || t("field_guest");
                            return (
                              <tr key={row.invitation.id} className="block sm:table-row flex flex-col mb-3 sm:mb-0 p-4 sm:p-0 rounded-xl sm:rounded-none border border-black/5 dark:border-white/5 sm:border-transparent bg-white/40 dark:bg-white/5 sm:bg-transparent shadow-sm sm:shadow-none hover:bg-black/5 dark:hover:bg-white/5 transition-colors group">
                                <td className="block sm:table-cell flex flex-col sm:flex-row sm:items-center justify-between py-2 sm:py-2.5 px-0 sm:px-3 border-b border-black/5 dark:border-white/5 sm:border-none last:border-0 align-middle">
                                  <span className="sm:hidden text-[10px] font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-1">{t("field_guest")}</span>
                                  <div className="flex items-center gap-3">
                                    <AvatarCircle
                                      className="flex-shrink-0"
                                      label={rowGuestLabel}
                                      fallback={getInitials(rowGuestLabel, "IN")}
                                      imageUrl={getGuestAvatarUrl(row.guest, rowGuestLabel)}
                                      size={32}
                                    />
                                    <button
                                      className="text-sm font-bold text-gray-900 dark:text-white hover:text-blue-600 dark:hover:text-blue-400 transition-colors text-left truncate max-w-[150px]"
                                      type="button"
                                      onClick={() => openGuestDetail(row.guest?.id || row.invitation.guest_id)}
                                    >
                                      {rowGuestLabel}
                                    </button>
                                  </div>
                                </td>
                                <td className="block sm:table-cell flex flex-col sm:flex-row sm:items-center justify-between py-2 sm:py-2.5 px-0 sm:px-3 border-b border-black/5 dark:border-white/5 sm:border-none last:border-0 align-middle">
                                  <span className="sm:hidden text-[10px] font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-1">{t("email")}</span>
                                  <span className="text-xs text-gray-500 dark:text-gray-400 truncate max-w-[150px] inline-block" title={row.contact}>
                                    {row.contact}
                                  </span>
                                </td>
                                <td className="block sm:table-cell flex flex-col sm:flex-row sm:items-center justify-between py-2 sm:py-2.5 px-0 sm:px-3 border-b border-black/5 dark:border-white/5 sm:border-none last:border-0 align-middle">
                                  <span className="sm:hidden text-[10px] font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-1">{t("status")}</span>
                                  <span className={`px-2 py-0.5 rounded-lg text-[9px] font-bold uppercase tracking-wider border shadow-sm w-fit ${statusClass(row.invitation.status)}`}>
                                    {statusText(t, row.invitation.status)}
                                  </span>
                                </td>
                                <td className="block sm:table-cell flex flex-col sm:flex-row sm:items-center justify-between py-2 sm:py-2.5 px-0 sm:px-3 border-none sm:border-none align-middle text-right">
                                  <div className="flex items-center justify-end gap-1 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity mt-2 sm:mt-0">
                                    <button
                                      className="p-2.5 text-gray-500 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-md transition-colors"
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
                                      className="p-2.5 text-gray-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-md transition-colors"
                                      type="button"
                                      onClick={() => handleRequestDeleteInvitation(row.invitation, itemLabel)}
                                      aria-label={t("delete_invitation")}
                                      title={t("delete_invitation")}
                                    >
                                      <Icon name="close" className="w-5 h-5" />
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

                <article id="event-rsvp-timeline" className="bg-white/50 dark:bg-white/5 rounded-2xl border border-black/5 dark:border-white/10 p-5 shadow-sm flex flex-col gap-4 scroll-mt-28">
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

              {/* Columna Derecha (5/12) */}
              <div className="col-span-12 lg:col-span-5 flex flex-col gap-6">

                {/* AI Planner Banner */}
                <article className="bg-gradient-to-br from-purple-600 to-blue-600 rounded-2xl p-5 shadow-lg flex flex-col gap-4 text-white">
                  <div className="flex justify-between items-start">
                    <span className="flex items-center gap-2 text-sm font-black">
                      <Icon name="sparkle" className="w-5 h-5 text-yellow-300" />
                      {t("event_plan_cta_title")}
                    </span>
                    <span className="px-2.5 py-1 bg-white/20 backdrop-blur-md border border-white/30 rounded-lg text-[9px] font-bold uppercase tracking-wider shadow-sm">
                      {t("event_planner_ai_badge")}
                    </span>
                  </div>
                  <p className="text-xs font-medium text-white/90 leading-relaxed">{t("event_plan_cta_hint")}</p>
                  <button className="bg-white text-blue-700 hover:bg-gray-50 font-bold py-2.5 px-4 rounded-xl transition-all text-xs w-full shadow-md flex justify-center items-center gap-2 mt-1" type="button" onClick={() => handleOpenEventPlan("ambience")}>
                    {t("event_plan_cta_action")}
                    <Icon name="arrow_right" className="w-3.5 h-3.5" />
                  </button>
                </article>

                <article className="bg-gradient-to-br from-fuchsia-600 via-purple-600 to-indigo-700 rounded-2xl p-5 shadow-lg flex flex-col gap-3 text-white border border-white/15">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-2">
                      <span className="inline-flex w-8 h-8 items-center justify-center rounded-xl bg-white/20 border border-white/30 backdrop-blur-md">
                        <Icon name="sparkle" className="w-4 h-4 text-yellow-300" />
                      </span>
                      <p className="text-sm font-black tracking-wide">{t("event_icebreaker_title")}</p>
                    </div>
                    <span className="px-2 py-0.5 rounded-lg text-[9px] font-black uppercase tracking-wider bg-black/20 border border-white/20">
                      IA
                    </span>
                  </div>
                  <p className="text-xs text-white/90 leading-relaxed">{t("event_icebreaker_hint")}</p>
                  <div className="flex flex-col sm:flex-row gap-2">
                    <button
                      className="bg-white text-purple-700 hover:bg-gray-100 font-black py-2.5 px-4 rounded-xl transition-all text-xs shadow-md flex-1 inline-flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed"
                      type="button"
                      onClick={() => handleGenerateEventIcebreaker?.()}
                      disabled={isIcebreakerLoading}
                    >
                      <Icon name={isIcebreakerLoading ? "clock" : "sparkle"} className={`w-4 h-4 ${isIcebreakerLoading ? "animate-pulse" : ""}`} />
                      <span>{isIcebreakerLoading ? t("event_icebreaker_loading_label") : t("event_icebreaker_action_generate")}</span>
                    </button>
                    {hasIcebreakerData ? (
                      <button
                        className="bg-white/15 hover:bg-white/25 border border-white/25 text-white font-black py-2.5 px-4 rounded-xl transition-all text-xs shadow-sm flex-1 inline-flex items-center justify-center gap-2"
                        type="button"
                        onClick={() => handleOpenEventIcebreakerPanel?.()}
                      >
                        <Icon name="eye" className="w-4 h-4" />
                        <span>{t("event_icebreaker_action_open")}</span>
                      </button>
                    ) : null}
                  </div>
                </article>

                <article className="bg-white/50 dark:bg-white/5 rounded-2xl border border-black/5 dark:border-white/10 p-5 shadow-sm flex flex-col gap-4">
                  <div className="flex items-center gap-2">
                    <Icon name="activity" className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                    <p className="text-sm font-black text-gray-900 dark:text-white">{t("event_expenses_title")}</p>
                  </div>
                  <p className="text-xs text-gray-600 dark:text-gray-300 leading-relaxed">{t("event_expenses_hint")}</p>

                  <label className="flex flex-col gap-1.5">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                      {t("event_expenses_total_label")}
                    </span>
                    <input
                      className="w-full bg-white/85 dark:bg-black/35 border border-black/10 dark:border-white/10 rounded-xl px-4 py-3 text-xl font-black text-gray-900 dark:text-white outline-none focus:border-emerald-500 transition-colors"
                      type="number"
                      inputMode="decimal"
                      min="0"
                      step="0.01"
                      placeholder={t("event_expenses_total_placeholder")}
                      value={splitTotalAmount}
                      onChange={(event) => {
                        setSplitTotalAmount(event.target.value);
                        if (splitHelperMessage) {
                          setSplitHelperMessage("");
                        }
                      }}
                    />
                  </label>

                  <p className="text-xs font-semibold text-gray-600 dark:text-gray-300">
                    {confirmedGuestsCount > 0
                      ? interpolateText(t("event_expenses_people_label"), { count: confirmedGuestsCount })
                      : t("event_expenses_people_zero")}
                  </p>

                  <div className="rounded-2xl bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-700/30 px-4 py-3 flex flex-col gap-1">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-700/80 dark:text-emerald-300/80">
                      {t("event_expenses_per_person_label")}
                    </span>
                    <p className="text-3xl font-black text-emerald-700 dark:text-emerald-300 leading-none">
                      {interpolateText(t("event_expenses_per_person_value"), { amount: splitPerPersonLabel })}
                    </p>
                  </div>

                  <label className="flex flex-col gap-1.5">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                      {t("event_expenses_bizum_label")}
                    </span>
                    <input
                      className="w-full bg-white/85 dark:bg-black/35 border border-black/10 dark:border-white/10 rounded-xl px-4 py-3 text-sm font-bold text-gray-900 dark:text-white outline-none focus:border-blue-500 transition-colors"
                      type="text"
                      placeholder={t("event_expenses_bizum_placeholder")}
                      value={splitBizumTarget}
                      onChange={(event) => {
                        setSplitBizumTarget(event.target.value);
                        if (splitHelperMessage) {
                          setSplitHelperMessage("");
                        }
                      }}
                    />
                  </label>

                  <button
                    className="bg-blue-600 hover:bg-blue-700 text-white font-black py-2.5 px-4 rounded-xl transition-colors text-xs inline-flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed"
                    type="button"
                    onClick={handleGenerateSplitMessage}
                    disabled={!canGenerateSplitMessage}
                  >
                    <Icon name="message" className="w-4 h-4" />
                    <span>{t("event_expenses_generate_action")}</span>
                  </button>

                  <div className="rounded-2xl border border-black/5 dark:border-white/10 bg-white/80 dark:bg-black/20 p-4 flex flex-col gap-3">
                    <div className="flex items-center justify-between gap-3">
                      <p className="text-[11px] font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                        {t("event_expenses_message_title")}
                      </p>
                      <div className="flex items-center gap-2">
                        <button
                          className="text-xs font-bold px-2.5 py-1.5 rounded-lg border border-black/10 dark:border-white/10 bg-white hover:bg-gray-50 dark:bg-gray-800 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-200 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
                          type="button"
                          onClick={handleCopySplitMessage}
                          disabled={!splitGeneratedMessage}
                        >
                          {t("event_expenses_copy_action")}
                        </button>
                        <button
                          className="text-xs font-bold px-2.5 py-1.5 rounded-lg border border-green-600/60 bg-green-500 hover:bg-green-600 text-white transition-colors inline-flex items-center gap-1.5 disabled:opacity-60 disabled:cursor-not-allowed"
                          type="button"
                          onClick={handleSendSplitMessageWhatsApp}
                          disabled={!splitGeneratedMessage}
                          aria-label={t("event_expenses_whatsapp_action")}
                          title={t("event_expenses_whatsapp_action")}
                        >
                          <Icon name="message" className="w-3.5 h-3.5" />
                          <span>{t("event_expenses_whatsapp_action")}</span>
                        </button>
                      </div>
                    </div>
                    <p className="text-sm text-gray-700 dark:text-gray-200 whitespace-pre-wrap leading-relaxed">
                      {splitGeneratedMessage || t("event_expenses_message_empty")}
                    </p>
                  </div>

                  <InlineMessage type={splitHelperMessageType} text={splitHelperMessage} />
                </article>

                <article className="bg-white/50 dark:bg-white/5 rounded-2xl border border-black/5 dark:border-white/10 p-5 shadow-sm flex flex-col gap-4">
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

                <article className="bg-white/50 dark:bg-white/5 rounded-2xl border border-black/5 dark:border-white/10 p-5 shadow-sm flex flex-col gap-4">
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
                  <article className="bg-white/50 dark:bg-white/5 rounded-2xl border border-black/5 dark:border-white/10 p-5 shadow-sm flex flex-col gap-4">
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
              eventDate={`${eventDateLabel} · ${eventTimeLabel}`}
              eventLocation={eventPlaceLabel}
              eventLocationAddress={selectedEventDetail.location_address || ""}
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

      {selectedEventDetail && isIcebreakerOpen ? (
        <div className="fixed inset-0 z-[90] bg-black/55 backdrop-blur-sm p-4 sm:p-6 flex items-end sm:items-center justify-center">
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
      ) : null}
    </section>
  );
}
