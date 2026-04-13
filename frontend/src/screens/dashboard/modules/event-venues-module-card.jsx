import React from "react";
import { Icon } from "../../../components/icons";
import { HostVenueSelector } from "../../../components/venues/host-venue-selector";
import { HostVenueShortlist } from "../../../components/venues/host-venue-shortlist";

export function EventVenuesModuleCard({
  t,
  selectedEventDetail,
  loadEventVenues,
  eventVenues,
  isLoadingEventVenues,
  eventVenuesFeedback,
  eventVenuesFeedbackType,
  handleSelectFinalVenue,
  selectingFinalVenueId
}) {
  return (
    <>
      <article className="order-5 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden p-5 flex flex-col gap-4">
        <div className="flex items-center gap-2">
          <Icon name="location" className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
          <p className="text-sm font-black text-gray-900 dark:text-white">{t("event_venues_title")}</p>
        </div>
        <p className="text-xs text-gray-600 dark:text-gray-300 leading-relaxed">{t("event_venues_hint")}</p>
        <HostVenueSelector eventId={selectedEventDetail?.id} t={t} onVenueAdded={loadEventVenues} />
      </article>

      <article className="order-6 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden p-5 flex flex-col gap-4">
        <div className="flex items-center gap-2">
          <Icon name="star" className="w-4 h-4 text-amber-500" />
          <p className="text-sm font-black text-gray-900 dark:text-white">{t("event_venues_shortlist_title")}</p>
        </div>
        <p className="text-xs text-gray-600 dark:text-gray-300 leading-relaxed">{t("event_venues_shortlist_hint")}</p>
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
    </>
  );
}
