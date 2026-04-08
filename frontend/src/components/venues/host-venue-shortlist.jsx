import { Icon } from "../icons";
import { InlineMessage } from "../inline-message";

function formatPriceLevel(priceLevel) {
  const numericValue = Number(priceLevel);
  if (!Number.isFinite(numericValue) || numericValue <= 0) {
    return "";
  }
  return "€".repeat(Math.min(4, numericValue));
}

function HostVenueShortlist({
  venues,
  isLoading,
  feedback,
  feedbackType = "info",
  onSelectFinal,
  selectingVenueId,
  t
}) {
  const translate = (key) => (typeof t === "function" ? t(key) : key);
  const normalizedVenues = Array.isArray(venues) ? venues : [];
  const finalVenue = normalizedVenues.find((venueItem) => Boolean(venueItem?.is_final_selection)) || null;
  const visibleVenues = finalVenue ? [finalVenue] : normalizedVenues;

  return (
    <div className="flex flex-col gap-4">
      {feedback ? <InlineMessage type={feedbackType} text={feedback} /> : null}

      {isLoading ? (
        <div className="rounded-2xl border border-black/5 dark:border-white/10 bg-white/70 dark:bg-black/20 px-4 py-5 flex items-center gap-3 text-sm text-gray-600 dark:text-gray-300">
          <Icon name="loader" className="w-4 h-4 animate-spin" />
          <span>{translate("event_venues_shortlist_loading")}</span>
        </div>
      ) : visibleVenues.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {visibleVenues.map((venue) => {
            const venueId = String(venue?.id || "").trim();
            const isSelecting = selectingVenueId === venueId;
            const priceLevelLabel = formatPriceLevel(venue?.google_price_level);
            const voteCount = Math.max(0, Number(venue?.vote_count || 0));

            return (
              <article
                key={venueId}
                className={`rounded-2xl border overflow-hidden shadow-sm flex flex-col ${
                  venue?.is_final_selection
                    ? "border-green-300 dark:border-green-700/40 bg-green-50/70 dark:bg-green-900/10"
                    : "border-black/5 dark:border-white/10 bg-white/80 dark:bg-black/20"
                }`}
              >
                <div className="w-full h-36 bg-black/5 dark:bg-white/5 flex items-center justify-center overflow-hidden">
                  {venue?.google_photo_url ? (
                    <img
                      src={venue.google_photo_url}
                      alt={String(venue?.name || "").trim() || translate("field_place")}
                      className="w-full h-full object-cover"
                      loading="lazy"
                    />
                  ) : (
                    <Icon name="location" className="w-6 h-6 text-gray-400" />
                  )}
                </div>

                <div className="p-4 flex flex-col gap-3 flex-1">
                  <div className="flex flex-wrap items-start gap-2">
                    <p className="text-sm font-black text-gray-900 dark:text-white leading-snug min-w-0 flex-1">
                      {venue?.name || translate("field_place")}
                    </p>
                    {venue?.is_final_selection ? (
                      <span className="inline-flex items-center rounded-full bg-green-100 text-green-700 dark:bg-green-900/20 dark:text-green-300 border border-green-200 dark:border-green-700/40 px-2 py-0.5 text-[11px] font-bold">
                        {translate("event_venues_final_badge")}
                      </span>
                    ) : null}
                  </div>

                  <div className="flex flex-wrap gap-2">
                    {Number.isFinite(Number(venue?.google_rating)) ? (
                      <span className="inline-flex items-center rounded-full bg-amber-50 text-amber-700 dark:bg-amber-900/20 dark:text-amber-300 border border-amber-200 dark:border-amber-700/40 px-2 py-0.5 text-[11px] font-bold">
                        ★ {Number(venue.google_rating).toFixed(1)}
                      </span>
                    ) : null}
                    {priceLevelLabel ? (
                      <span className="inline-flex items-center rounded-full bg-emerald-50 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-700/40 px-2 py-0.5 text-[11px] font-bold">
                        {priceLevelLabel}
                      </span>
                    ) : null}
                    <span className="inline-flex items-center rounded-full bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-300 border border-blue-200 dark:border-blue-700/40 px-2 py-0.5 text-[11px] font-bold">
                      {translate("event_venues_votes_count").replace("{count}", String(voteCount))}
                    </span>
                  </div>

                  {venue?.address ? (
                    <p className="text-xs text-gray-600 dark:text-gray-300 leading-relaxed">
                      {venue.address}
                    </p>
                  ) : null}

                  {!venue?.is_final_selection ? (
                    <button
                      type="button"
                      onClick={() => onSelectFinal?.(venue)}
                      disabled={Boolean(selectingVenueId)}
                      className="mt-auto inline-flex items-center justify-center gap-2 rounded-xl bg-green-600 hover:bg-green-700 text-white font-black py-2.5 px-4 text-xs transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
                    >
                      <Icon
                        name={isSelecting ? "loader" : "check"}
                        className={`w-4 h-4 ${isSelecting ? "animate-spin" : ""}`}
                      />
                      <span>{translate("event_venues_select_final_action")}</span>
                    </button>
                  ) : (
                    <div className="mt-auto rounded-xl border border-green-200 dark:border-green-700/40 bg-green-100/70 dark:bg-green-900/20 px-3 py-2 text-xs font-bold text-green-700 dark:text-green-300 text-center">
                      {translate("event_venues_final_hint")}
                    </div>
                  )}
                </div>
              </article>
            );
          })}
        </div>
      ) : (
        <p className="text-xs text-gray-500 dark:text-gray-400 italic">
          {translate("event_venues_shortlist_empty")}
        </p>
      )}
    </div>
  );
}

export { HostVenueShortlist };
