import React from "react";
import { isEventModuleEnabled } from "../../../lib/event-modules";
import { EventDatePollModuleCard } from "./event-date-poll-module-card";
import { EventFinanceModuleCard } from "./event-finance-module-card";
import { EventGalleryModuleCard } from "./event-gallery-module-card";
import { EventIcebreakerModuleCard } from "./event-icebreaker-module-card";
import { EventMegaphoneModuleCard } from "./event-megaphone-module-card";
import { EventSpotifyHeaderAction } from "./event-spotify-header-action";
import { EventVenuesModuleCard } from "./event-venues-module-card";

export const EVENT_MODULE_ZONES = Object.freeze({
  MAIN: "main",
  SIDEBAR: "sidebar",
  HEADER_ACTIONS: "header_actions"
});

export const EVENT_MODULE_REGISTRY = Object.freeze([
  {
    key: "spotify",
    zone: EVENT_MODULE_ZONES.HEADER_ACTIONS,
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
    key: "megaphone",
    zone: EVENT_MODULE_ZONES.MAIN,
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
    order: 20,
    render: (context) =>
      React.createElement(EventFinanceModuleCard, {
        t: context.t,
        interpolateText: context.interpolateText,
        language: context.language,
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

export function getEventModulesByZone({ zone, resolvedModules }) {
  return EVENT_MODULE_REGISTRY
    .filter((moduleItem) => moduleItem.zone === zone)
    .filter((moduleItem) => isEventModuleEnabled(resolvedModules, moduleItem.key, true))
    .sort((left, right) => Number(left.order || 0) - Number(right.order || 0));
}
