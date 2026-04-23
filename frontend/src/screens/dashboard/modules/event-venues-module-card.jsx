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
    <article className="order-5 bg-white/80 dark:bg-gray-900/80 backdrop-blur-md rounded-xl border border-gray-200/80 dark:border-gray-700/80 ring-1 ring-black/5 dark:ring-white/10 shadow-sm overflow-hidden p-5 flex flex-col gap-5 transition-all duration-300 hover:-translate-y-1 hover:shadow-md">
      <div className="flex items-center gap-2">
        <Icon name="location" className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
        <p className="text-lg font-bold text-gray-900 dark:text-white">{t("event_venues_combined_title")}</p>
      </div>
      <p className="text-sm text-gray-600 dark:text-gray-300 leading-relaxed">{t("event_venues_combined_hint")}</p>

      <div className="flex flex-col gap-4">
        <HostVenueSelector eventId={selectedEventDetail?.id} t={t} onVenueAdded={loadEventVenues} />
      </div>

      <div className="flex flex-col gap-3">
        <p className="text-sm font-semibold tracking-wide text-gray-700 dark:text-gray-300">
          {t("event_venues_shortlist_title")}
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
      </div>
    </article>
  );
}
