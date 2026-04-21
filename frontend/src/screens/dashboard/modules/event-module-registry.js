import React from "react";
import { isEventModuleEnabled } from "../../../lib/event-modules";
import { EventDatePollModuleCard } from "./event-date-poll-module-card";
import { EventFinanceModuleCard } from "./event-finance-module-card";
import { EventGalleryModuleCard } from "./event-gallery-module-card";
import { EventIcebreakerModuleCard } from "./event-icebreaker-module-card";
import { EventMealsModuleCard } from "./event-meals-module-card";
import { EventMegaphoneModuleCard } from "./event-megaphone-module-card";
import { EventSpotifyHeaderAction } from "./event-spotify-header-action";
import { EventSpacesModuleCard } from "./event-spaces-module-card";
import { EventSharedTasksModuleCard } from "./event-shared-tasks-module-card";
import { EventVenuesModuleCard } from "./event-venues-module-card";

export const EVENT_MODULE_ZONES = Object.freeze({
  MAIN: "main",
  SIDEBAR: "sidebar",
  HEADER_ACTIONS: "header_actions"
});

export const EVENT_MODULE_CATEGORIES = Object.freeze({
  CORE: "core",
  LOGISTICS: "logistics",
  COMMUNICATION: "communication",
  EXPERIENCE: "experience"
});

export const EVENT_MODULE_DISCLOSURE = Object.freeze({
  CORE: "core",
  PRIMARY: "primary",
  SECONDARY: "secondary"
});

export const EVENT_MODULE_REGISTRY = Object.freeze([
  {
    key: "spotify",
    zone: EVENT_MODULE_ZONES.HEADER_ACTIONS,
    category: EVENT_MODULE_CATEGORIES.EXPERIENCE,
    disclosure: EVENT_MODULE_DISCLOSURE.SECONDARY,
    emptyStateVariant: "compact",
    labelKey: "event_modules_toggle_spotify_label",
    hintKey: "event_modules_toggle_spotify_hint",
    order: 20,
    render: (context) =>
      React.createElement(EventSpotifyHeaderAction, {
        t: context.t,
        hasSpotifyPlaylist: context.hasSpotifyPlaylist,
        isLoadingSpotifyState: context.isLoadingSpotifyState,
        handleOpenSpotifyPlaylist: context.handleOpenSpotifyPlaylist,
        handleConnectSpotify: context.handleConnectSpotify,
        variant: context.variant
      })
  },
  {
    key: "gallery",
    zone: EVENT_MODULE_ZONES.MAIN,
    category: EVENT_MODULE_CATEGORIES.COMMUNICATION,
    disclosure: EVENT_MODULE_DISCLOSURE.PRIMARY,
    emptyStateVariant: "rich",
    labelKey: "event_modules_toggle_gallery_label",
    hintKey: "event_modules_toggle_gallery_hint",
    order: 30,
    render: (context) =>
      React.createElement(EventGalleryModuleCard, {
        t: context.t,
        selectedEventDetail: context.selectedEventDetail,
        eventPhotoGalleryUrlDraft: context.eventPhotoGalleryUrlDraft,
        setEventPhotoGalleryUrlDraft: context.setEventPhotoGalleryUrlDraft,
        handleSaveEventPhotoGalleryUrl: context.handleSaveEventPhotoGalleryUrl,
        isSavingEventPhotoGalleryUrl: context.isSavingEventPhotoGalleryUrl,
        eventPhotoGalleryNotifyGuests: context.eventPhotoGalleryNotifyGuests,
        setEventPhotoGalleryNotifyGuests: context.setEventPhotoGalleryNotifyGuests,
        eventPhotoGalleryFeedback: context.eventPhotoGalleryFeedback,
        eventPhotoGalleryFeedbackType: context.eventPhotoGalleryFeedbackType
      })
  },
  {
    key: "date_poll",
    zone: EVENT_MODULE_ZONES.MAIN,
    category: EVENT_MODULE_CATEGORIES.CORE,
    disclosure: EVENT_MODULE_DISCLOSURE.CORE,
    emptyStateVariant: "compact",
    labelKey: "event_modules_toggle_date_poll_label",
    hintKey: "event_modules_toggle_date_poll_hint",
    order: 40,
    render: (context) =>
      React.createElement(EventDatePollModuleCard, {
        t: context.t,
        language: context.language,
        shouldRenderDatePollSection: context.shouldRenderDatePollSection,
        datePollOpen: context.datePollOpen,
        hasDatePollOptions: context.hasDatePollOptions,
        selectedEventDateOptions: context.selectedEventDateOptions,
        selectedEventDateVoteSummaryByOptionId: context.selectedEventDateVoteSummaryByOptionId,
        selectedEventDateVoteMatrixRows: context.selectedEventDateVoteMatrixRows,
        selectedEventDatePollWinningOptionId: context.selectedEventDatePollWinningOptionId,
        isClosingEventDatePollOptionId: context.isClosingEventDatePollOptionId,
        handleCloseEventDatePoll: context.handleCloseEventDatePoll,
        formatDate: context.formatDate,
        formatTimeLabel: context.formatTimeLabel,
        formatShortDate: context.formatShortDate,
        getGuestAvatarUrl: context.getGuestAvatarUrl,
        datePollTotalVotes: context.datePollTotalVotes
      })
  },
  {
    key: "venues",
    zone: EVENT_MODULE_ZONES.MAIN,
    category: EVENT_MODULE_CATEGORIES.LOGISTICS,
    disclosure: EVENT_MODULE_DISCLOSURE.PRIMARY,
    emptyStateVariant: "rich",
    labelKey: "event_modules_toggle_venues_label",
    hintKey: "event_modules_toggle_venues_hint",
    order: 50,
    render: (context) =>
      React.createElement(EventVenuesModuleCard, {
        t: context.t,
        selectedEventDetail: context.selectedEventDetail,
        loadEventVenues: context.loadEventVenues,
        eventVenues: context.eventVenues,
        isLoadingEventVenues: context.isLoadingEventVenues,
        eventVenuesFeedback: context.eventVenuesFeedback,
        eventVenuesFeedbackType: context.eventVenuesFeedbackType,
        handleSelectFinalVenue: context.handleSelectFinalVenue,
        selectingFinalVenueId: context.selectingFinalVenueId
      })
  },
  {
    key: "spaces",
    zone: EVENT_MODULE_ZONES.MAIN,
    category: EVENT_MODULE_CATEGORIES.LOGISTICS,
    disclosure: EVENT_MODULE_DISCLOSURE.SECONDARY,
    emptyStateVariant: "compact",
    labelKey: "event_modules_toggle_spaces_label",
    hintKey: "event_modules_toggle_spaces_hint",
    order: 80,
    render: (context) =>
      React.createElement(EventSpacesModuleCard, {
        t: context.t,
        isProfessionalEvent: context.isProfessionalEvent,
        selectedEventDetail: context.selectedEventDetail,
        selectedEventDetailGuests: context.selectedEventDetailGuests
      })
  },
  {
    key: "shared_tasks",
    zone: EVENT_MODULE_ZONES.MAIN,
    category: EVENT_MODULE_CATEGORIES.LOGISTICS,
    disclosure: EVENT_MODULE_DISCLOSURE.SECONDARY,
    emptyStateVariant: "compact",
    labelKey: "event_modules_toggle_shared_tasks_label",
    hintKey: "event_modules_toggle_shared_tasks_hint",
    order: 85,
    render: (context) =>
      React.createElement(EventSharedTasksModuleCard, {
        t: context.t,
        isProfessionalEvent: context.isProfessionalEvent,
        selectedEventDetail: context.selectedEventDetail,
        selectedEventDetailGuests: context.selectedEventDetailGuests
      })
  },
  {
    key: "meals",
    zone: EVENT_MODULE_ZONES.MAIN,
    category: EVENT_MODULE_CATEGORIES.LOGISTICS,
    disclosure: EVENT_MODULE_DISCLOSURE.SECONDARY,
    emptyStateVariant: "compact",
    labelKey: "event_modules_toggle_meals_label",
    hintKey: "event_modules_toggle_meals_hint",
    order: 66,
    render: (context) =>
      React.createElement(EventMealsModuleCard, {
        t: context.t,
        isProfessionalEvent: context.isProfessionalEvent,
        selectedEventDetail: context.selectedEventDetail,
        selectedEventDetailGuests: context.selectedEventDetailGuests
      })
  },
  {
    key: "megaphone",
    zone: EVENT_MODULE_ZONES.MAIN,
    category: EVENT_MODULE_CATEGORIES.COMMUNICATION,
    disclosure: EVENT_MODULE_DISCLOSURE.PRIMARY,
    emptyStateVariant: "rich",
    labelKey: "event_modules_toggle_megaphone_label",
    hintKey: "event_modules_toggle_megaphone_hint",
    order: 70,
    render: (context) =>
      React.createElement(EventMegaphoneModuleCard, {
        t: context.t,
        interpolateText: context.interpolateText,
        broadcastMessageDraft: context.broadcastMessageDraft,
        setBroadcastMessageDraft: context.setBroadcastMessageDraft,
        broadcastFeedback: context.broadcastFeedback,
        setBroadcastFeedback: context.setBroadcastFeedback,
        confirmedRecipientsCount: context.confirmedRecipientsCount,
        handleSendBroadcastMessage: context.handleSendBroadcastMessage,
        isSendingBroadcastMessage: context.isSendingBroadcastMessage,
        broadcastFeedbackType: context.broadcastFeedbackType
      })
  },
  {
    key: "finance",
    zone: EVENT_MODULE_ZONES.SIDEBAR,
    category: EVENT_MODULE_CATEGORIES.LOGISTICS,
    disclosure: EVENT_MODULE_DISCLOSURE.PRIMARY,
    emptyStateVariant: "rich",
    labelKey: "event_modules_toggle_finance_label",
    hintKey: "event_modules_toggle_finance_hint",
    order: 20,
    render: (context) =>
      React.createElement(EventFinanceModuleCard, {
        t: context.t,
        interpolateText: context.interpolateText,
        language: context.language,
        isProfessionalEvent: context.isProfessionalEvent,
        splitExpenseDescription: context.splitExpenseDescription,
        setSplitExpenseDescription: context.setSplitExpenseDescription,
        splitExpenseAmount: context.splitExpenseAmount,
        setSplitExpenseAmount: context.setSplitExpenseAmount,
        splitExpensePaidBy: context.splitExpensePaidBy,
        setSplitExpensePaidBy: context.setSplitExpensePaidBy,
        splitParticipants: context.splitParticipants,
        splitHelperMessage: context.splitHelperMessage,
        setSplitHelperMessage: context.setSplitHelperMessage,
        handleAddSplitExpense: context.handleAddSplitExpense,
        splitExpenses: context.splitExpenses,
        formatMoneyAmount: context.formatMoneyAmount,
        handleRemoveSplitExpense: context.handleRemoveSplitExpense,
        splitTotalAmount: context.splitTotalAmount,
        splitTotalGuests: context.splitTotalGuests,
        splitPerPersonLabel: context.splitPerPersonLabel,
        splitDebts: context.splitDebts,
        handleShareSettlementWhatsApp: context.handleShareSettlementWhatsApp,
        splitHelperMessageType: context.splitHelperMessageType,
        financeMode: context.financeMode,
        setFinanceMode: context.setFinanceMode,
        financeFixedPrice: context.financeFixedPrice,
        setFinanceFixedPrice: context.setFinanceFixedPrice,
        financePaymentInfo: context.financePaymentInfo,
        setFinancePaymentInfo: context.setFinancePaymentInfo,
        financeTotalBudget: context.financeTotalBudget,
        setFinanceTotalBudget: context.setFinanceTotalBudget,
        handleSaveFinanceConfig: context.handleSaveFinanceConfig,
        isSavingFinanceConfig: context.isSavingFinanceConfig,
        financeFeedback: context.financeFeedback,
        financeFeedbackType: context.financeFeedbackType,
        fixedPriceGuests: context.fixedPriceGuests,
        fixedPricePaidInvitationIds: context.fixedPricePaidInvitationIds,
        isLoadingFixedPricePayments: context.isLoadingFixedPricePayments,
        togglingFixedPaymentInvitationId: context.togglingFixedPaymentInvitationId,
        handleToggleFixedPriceGuestPaid: context.handleToggleFixedPriceGuestPaid,
        fixedPricePaidCount: context.fixedPricePaidCount,
        fixedPricePendingCount: context.fixedPricePendingCount,
        fixedPriceCollectedAmount: context.fixedPriceCollectedAmount,
        fixedPricePendingAmount: context.fixedPricePendingAmount
      })
  },
  {
    key: "icebreaker",
    zone: EVENT_MODULE_ZONES.SIDEBAR,
    category: EVENT_MODULE_CATEGORIES.EXPERIENCE,
    disclosure: EVENT_MODULE_DISCLOSURE.SECONDARY,
    emptyStateVariant: "compact",
    labelKey: "event_modules_toggle_icebreaker_label",
    hintKey: "event_modules_toggle_icebreaker_hint",
    order: 30,
    render: (context) =>
      React.createElement(EventIcebreakerModuleCard, {
        t: context.t,
        isIcebreakerLoading: context.isIcebreakerLoading,
        handleGenerateEventIcebreaker: context.handleGenerateEventIcebreaker,
        hasIcebreakerData: context.hasIcebreakerData,
        handleOpenEventIcebreakerPanel: context.handleOpenEventIcebreakerPanel
      })
  }
]);

export function getEventModulesByZone({
  zone,
  resolvedModules,
  disclosures,
  includeEnabledOutsideDisclosures = false
}) {
  const normalizedDisclosures = Array.isArray(disclosures)
    ? disclosures
        .map((item) => String(item || "").trim().toLowerCase())
        .filter(Boolean)
    : [];

  return EVENT_MODULE_REGISTRY
    .filter((moduleItem) => moduleItem.zone === zone)
    .filter((moduleItem) => {
      const isEnabled = isEventModuleEnabled(resolvedModules, moduleItem.key, true);
      if (!isEnabled) {
        return false;
      }

      if (normalizedDisclosures.length === 0) {
        return true;
      }

      const disclosure = String(moduleItem.disclosure || "").trim().toLowerCase();
      if (normalizedDisclosures.includes(disclosure)) {
        return true;
      }

      return Boolean(includeEnabledOutsideDisclosures);
    })
    .sort((left, right) => Number(left.order || 0) - Number(right.order || 0));
}
