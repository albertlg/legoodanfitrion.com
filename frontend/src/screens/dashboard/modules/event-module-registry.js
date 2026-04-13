import React from "react";
import { isEventModuleEnabled } from "../../../lib/event-modules";
import { EventGalleryModuleCard } from "./event-gallery-module-card";
import { EventMegaphoneModuleCard } from "./event-megaphone-module-card";

export const EVENT_MODULE_ZONES = Object.freeze({
  MAIN: "main",
  SIDEBAR: "sidebar"
});

export const EVENT_MODULE_REGISTRY = Object.freeze([
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
  }
]);

export function getEventModulesByZone({ zone, resolvedModules }) {
  return EVENT_MODULE_REGISTRY
    .filter((moduleItem) => moduleItem.zone === zone)
    .filter((moduleItem) => isEventModuleEnabled(resolvedModules, moduleItem.key, true))
    .sort((left, right) => Number(left.order || 0) - Number(right.order || 0));
}
