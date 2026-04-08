import { useMemo, useState } from "react";
import { Icon } from "../icons";
import { InlineMessage } from "../inline-message";
import { supabase } from "../../lib/supabaseClient";

const configuredApiUrl = String(
  import.meta.env.VITE_API_URL ||
    import.meta.env.VITE_API_BASE_URL ||
    ""
).trim();
const fallbackApiUrl = import.meta.env.DEV ? "http://localhost:3000" : "/api";
const VENUE_API_BASE_URL = String(configuredApiUrl || fallbackApiUrl).replace(/\/+$/, "");

function buildVenueEndpoint(resource) {
  const normalizedBase = String(VENUE_API_BASE_URL || "").trim().replace(/\/+$/, "");
  if (!normalizedBase) {
    return "";
  }
  if (/(^|\/)api$/i.test(normalizedBase)) {
    return `${normalizedBase}/venues/${resource}`;
  }
  return `${normalizedBase}/api/venues/${resource}`;
}

function ensureAbsoluteUrl(url) {
  if (!url) {
    return "";
  }
  if (/^https?:\/\//i.test(url)) {
    return url;
  }
  if (typeof window !== "undefined") {
    return new URL(url, window.location.origin).toString();
  }
  return url;
}

function withErrorMessage(error, fallbackText) {
  const detail = String(error?.message || "").trim();
  return detail ? `${fallbackText} ${detail}` : fallbackText;
}

function formatPriceLevel(priceLevel) {
  const numericValue = Number(priceLevel);
  if (!Number.isFinite(numericValue) || numericValue <= 0) {
    return "";
  }
  return "€".repeat(Math.min(4, numericValue));
}

async function fetchWithAuth(url, options = {}) {
  const { data: sessionPayload, error: sessionError } = await supabase.auth.getSession();
  if (sessionError || !sessionPayload?.session?.access_token) {
    throw new Error("No se pudo obtener una sesión válida.");
  }

  const response = await fetch(url, {
    ...options,
    headers: {
      Accept: "application/json",
      ...(options.headers || {}),
      Authorization: `Bearer ${sessionPayload.session.access_token}`
    }
  });

  let payload = null;
  try {
    payload = await response.json();
  } catch {
    payload = null;
  }

  if (!response.ok || payload?.success === false) {
    throw new Error(String(payload?.error || `HTTP ${response.status}`));
  }

  return payload;
}

function HostVenueSelector({ eventId, t, onVenueAdded }) {
  const translate = (key) => (typeof t === "function" ? t(key) : key);
  const normalizedEventId = useMemo(() => String(eventId || "").trim(), [eventId]);
  const searchEndpoint = useMemo(() => buildVenueEndpoint("search"), []);
  const shortlistEndpoint = useMemo(() => buildVenueEndpoint("shortlist"), []);

  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [addingVenueId, setAddingVenueId] = useState("");
  const [feedback, setFeedback] = useState("");
  const [feedbackType, setFeedbackType] = useState("info");

  const handleSearch = async () => {
    const trimmedQuery = String(query || "").trim();
    if (!trimmedQuery) {
      setFeedbackType("error");
      setFeedback(translate("event_venues_query_required"));
      return;
    }

    const fullSearchUrl = ensureAbsoluteUrl(searchEndpoint);
    if (!fullSearchUrl) {
      setFeedbackType("error");
      setFeedback(translate("event_venues_search_unavailable"));
      return;
    }

    setLoading(true);
    setFeedback("");
    setFeedbackType("info");
    try {
      const url = new URL(fullSearchUrl);
      url.searchParams.set("q", trimmedQuery);

      const payload = await fetchWithAuth(url.toString(), { method: "GET" });
      const venues = Array.isArray(payload?.venues) ? payload.venues : [];
      setResults(venues.filter((venue) => String(venue?.id || "").trim()));

      if (venues.length === 0) {
        setFeedbackType("info");
        setFeedback(translate("event_venues_results_empty"));
      }
    } catch (error) {
      setResults([]);
      setFeedbackType("error");
      setFeedback(withErrorMessage(error, translate("event_venues_search_error")));
    } finally {
      setLoading(false);
    }
  };

  const handleAddVenue = async (venue) => {
    const venueId = String(venue?.id || "").trim();
    const fullShortlistUrl = ensureAbsoluteUrl(shortlistEndpoint);

    if (!normalizedEventId || !venueId) {
      setFeedbackType("error");
      setFeedback(translate("event_venues_add_error"));
      return;
    }

    if (!fullShortlistUrl) {
      setFeedbackType("error");
      setFeedback(translate("event_venues_shortlist_unavailable"));
      return;
    }

    setAddingVenueId(venueId);
    setFeedback("");
    setFeedbackType("info");
    try {
      await fetchWithAuth(fullShortlistUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          eventId: normalizedEventId,
          venue
        })
      });

      setFeedbackType("success");
      setFeedback(
        translate("event_venues_add_success").replace(
          "{venue}",
          String(venue?.name || "").trim() || translate("field_place")
        )
      );

      if (typeof onVenueAdded === "function") {
        await onVenueAdded();
      }
    } catch (error) {
      setFeedbackType("error");
      setFeedback(withErrorMessage(error, translate("event_venues_add_error")));
    } finally {
      setAddingVenueId("");
    }
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col sm:flex-row gap-2">
        <label className="relative flex-1 min-w-0">
          <Icon
            name="search"
            className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
          />
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.preventDefault();
                handleSearch();
              }
            }}
            placeholder={translate("event_venues_search_placeholder")}
            className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-black/10 dark:border-white/10 bg-white/90 dark:bg-black/35 text-sm text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500/40"
          />
        </label>
        <button
          type="button"
          onClick={handleSearch}
          disabled={loading}
          className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-black transition-all shadow-sm disabled:opacity-60 disabled:cursor-not-allowed"
        >
          {loading ? (
            <Icon name="loader" className="w-4 h-4 animate-spin" />
          ) : (
            <Icon name="search" className="w-4 h-4" />
          )}
          <span>{loading ? translate("event_venues_searching") : translate("search")}</span>
        </button>
      </div>

      {feedback ? <InlineMessage type={feedbackType} text={feedback} /> : null}

      {results.length > 0 ? (
        <ul className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {results.map((venue) => {
            const venueId = String(venue?.id || "").trim();
            const isAdding = addingVenueId === venueId;
            const photoUrl = String(venue?.photoUrl || "").trim();
            const rating = Number(venue?.rating);
            const priceLevelLabel = formatPriceLevel(venue?.priceLevel);

            return (
              <li
                key={venueId}
                className="rounded-2xl border border-black/5 dark:border-white/10 bg-white/80 dark:bg-black/20 overflow-hidden shadow-sm flex flex-col"
              >
                <div className="w-full h-32 overflow-hidden bg-black/5 dark:bg-white/5 shrink-0 flex items-center justify-center">
                  {photoUrl ? (
                    <img
                      src={photoUrl}
                      alt={String(venue?.name || "").trim() || translate("field_place")}
                      className="w-full h-full object-cover"
                      loading="lazy"
                    />
                  ) : (
                    <Icon name="location" className="w-5 h-5 text-gray-400" />
                  )}
                </div>

                <div className="p-4 flex flex-col gap-3 min-w-0 flex-1">
                  <div className="flex flex-wrap items-start gap-2">
                    <p className="text-sm font-black text-gray-900 dark:text-white leading-snug min-w-0 flex-1">
                      {String(venue?.name || "").trim() || translate("field_place")}
                    </p>
                    {Number.isFinite(rating) ? (
                      <span className="inline-flex items-center rounded-full bg-amber-50 text-amber-700 dark:bg-amber-900/20 dark:text-amber-300 border border-amber-200 dark:border-amber-700/40 px-2 py-0.5 text-[11px] font-bold">
                        ★ {rating.toFixed(1)}
                      </span>
                    ) : null}
                    {priceLevelLabel ? (
                      <span className="inline-flex items-center rounded-full bg-emerald-50 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-700/40 px-2 py-0.5 text-[11px] font-bold">
                        {priceLevelLabel}
                      </span>
                    ) : null}
                  </div>
                  {venue?.address ? (
                    <p className="text-xs text-gray-600 dark:text-gray-300 leading-relaxed min-h-[2.5rem]">
                      {venue.address}
                    </p>
                  ) : null}

                  <button
                    type="button"
                    onClick={() => handleAddVenue(venue)}
                    disabled={Boolean(addingVenueId)}
                    className="mt-auto inline-flex items-center justify-center gap-2 rounded-xl border border-indigo-200 dark:border-indigo-700/40 bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-900/20 dark:hover:bg-indigo-900/30 text-indigo-700 dark:text-indigo-200 font-black py-2.5 px-4 text-xs transition-colors disabled:opacity-60 disabled:cursor-not-allowed w-full"
                  >
                    {isAdding ? (
                      <Icon name="loader" className="w-4 h-4 animate-spin" />
                    ) : (
                      <Icon name="plus" className="w-4 h-4" />
                    )}
                    <span>{translate("event_venues_add_action")}</span>
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      ) : (
        <p className="text-xs text-gray-500 dark:text-gray-400 italic">
          {translate("event_venues_empty_hint")}
        </p>
      )}
    </div>
  );
}

export { HostVenueSelector };
