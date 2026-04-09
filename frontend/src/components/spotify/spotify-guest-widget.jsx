import { useMemo, useState } from "react";
import { Icon } from "../icons";
import { InlineMessage } from "../inline-message";

const configuredApiUrl = String(
  import.meta.env.VITE_API_URL ||
    import.meta.env.VITE_API_BASE_URL ||
    ""
).trim();
const fallbackApiUrl = "/api";
const SPOTIFY_GUEST_API_BASE_URL = String(configuredApiUrl || fallbackApiUrl).replace(/\/+$/, "");

function buildSpotifyGuestEndpoint(resource) {
  const normalizedBase = String(SPOTIFY_GUEST_API_BASE_URL || "").trim().replace(/\/+$/, "");
  if (!normalizedBase) {
    return "";
  }
  if (/(^|\/)api$/i.test(normalizedBase)) {
    return `${normalizedBase}/spotify/${resource}`;
  }
  return `${normalizedBase}/api/spotify/${resource}`;
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
  if (!detail) {
    return fallbackText;
  }
  return `${fallbackText} ${detail}`;
}

function SpotifyGuestWidget({ eventId, t }) {
  const translate = (key) => (typeof t === "function" ? t(key) : key);
  const normalizedEventId = useMemo(() => String(eventId || "").trim(), [eventId]);
  const searchEndpoint = useMemo(() => buildSpotifyGuestEndpoint("search"), []);
  const addTrackEndpoint = useMemo(() => buildSpotifyGuestEndpoint("add-track"), []);

  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [addingTrackId, setAddingTrackId] = useState("");
  const [feedback, setFeedback] = useState("");
  const [feedbackType, setFeedbackType] = useState("info");

  const handleSearch = async () => {
    const trimmedQuery = String(query || "").trim();
    if (!normalizedEventId) {
      setFeedbackType("error");
      setFeedback(translate("rsvp_spotify_missing_event"));
      return;
    }
    if (trimmedQuery.length < 2) {
      setFeedbackType("error");
      setFeedback(translate("rsvp_spotify_query_required"));
      return;
    }
    const fullSearchUrl = ensureAbsoluteUrl(searchEndpoint);
    if (!fullSearchUrl) {
      setFeedbackType("error");
      setFeedback(translate("rsvp_spotify_search_unavailable"));
      return;
    }

    setLoading(true);
    setFeedback("");
    setFeedbackType("info");
    try {
      const url = new URL(fullSearchUrl);
      url.searchParams.set("eventId", normalizedEventId);
      url.searchParams.set("q", trimmedQuery);

      const response = await fetch(url.toString(), {
        method: "GET",
        headers: {
          Accept: "application/json"
        }
      });
      const payload = await response.json();
      if (!response.ok || payload?.success === false) {
        throw new Error(String(payload?.error || `HTTP ${response.status}`));
      }

      const tracks = Array.isArray(payload?.tracks) ? payload.tracks : [];
      setResults(
        tracks.filter((track) => String(track?.id || track?.uri || "").trim())
      );
      if (tracks.length === 0) {
        setFeedbackType("info");
        setFeedback(translate("rsvp_spotify_results_empty"));
      }
    } catch (error) {
      setResults([]);
      setFeedbackType("error");
      setFeedback(withErrorMessage(error, translate("rsvp_spotify_search_error")));
    } finally {
      setLoading(false);
    }
  };

  const handleAddTrack = async (track) => {
    const trackId = String(track?.id || track?.uri || "").trim();
    const trackUri = String(track?.uri || "").trim();
    if (!normalizedEventId || !trackId || !trackUri) {
      return;
    }
    const fullAddTrackUrl = ensureAbsoluteUrl(addTrackEndpoint);
    if (!fullAddTrackUrl) {
      setFeedbackType("error");
      setFeedback(translate("rsvp_spotify_add_unavailable"));
      return;
    }

    setAddingTrackId(trackId);
    setFeedback("");
    setFeedbackType("info");
    try {
      const response = await fetch(fullAddTrackUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json"
        },
        body: JSON.stringify({
          eventId: normalizedEventId,
          trackUri
        })
      });
      const payload = await response.json();
      if (!response.ok || payload?.success === false) {
        throw new Error(String(payload?.error || `HTTP ${response.status}`));
      }

      const songName = String(track?.name || "").trim() || translate("rsvp_spotify_song_unknown");
      setFeedbackType("success");
      setFeedback(translate("rsvp_spotify_add_success").replace("{song}", songName));
    } catch (error) {
      setFeedbackType("error");
      setFeedback(withErrorMessage(error, translate("rsvp_spotify_add_error")));
    } finally {
      setAddingTrackId("");
    }
  };

  return (
    <section className="rounded-2xl border border-black/10 dark:border-white/10 bg-white/70 dark:bg-black/30 p-4 md:p-5 flex flex-col gap-4">
      <div className="flex items-start gap-3">
        <span className="w-10 h-10 rounded-xl bg-[#1DB954]/10 text-[#1DB954] border border-[#1DB954]/30 flex items-center justify-center shrink-0">
          <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5" aria-hidden="true">
            <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.84.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.6.18-1.2.72-1.38 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z" />
          </svg>
        </span>
        <div className="min-w-0">
          <h3 className="text-sm md:text-base font-black text-gray-900 dark:text-white">
            {translate("rsvp_spotify_title")}
          </h3>
          <p className="text-xs text-gray-600 dark:text-gray-300 mt-1">
            {translate("rsvp_spotify_subtitle")}
          </p>
        </div>
      </div>

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
            placeholder={translate("rsvp_spotify_input_placeholder")}
            className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-black/10 dark:border-white/10 bg-white/90 dark:bg-black/40 text-sm text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-[#1DB954]/30 focus:border-[#1DB954]/50"
          />
        </label>
        <button
          type="button"
          onClick={handleSearch}
          disabled={loading}
          className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-[#1DB954] hover:bg-[#1ed760] text-white text-sm font-bold transition-all disabled:opacity-60 disabled:cursor-not-allowed"
        >
          {loading ? <Icon name="loader" className="w-4 h-4 animate-spin" /> : <Icon name="search" className="w-4 h-4" />}
          <span>{loading ? translate("rsvp_spotify_searching") : translate("rsvp_spotify_search_action")}</span>
        </button>
      </div>

      {feedback ? <InlineMessage type={feedbackType} text={feedback} /> : null}

      {results.length > 0 ? (
        <ul className="flex flex-col gap-2">
          {results.map((track) => {
            const trackId = String(track?.id || track?.uri || "").trim();
            const isAdding = addingTrackId === trackId;
            const trackName = String(track?.name || "").trim() || translate("rsvp_spotify_song_unknown");
            const trackArtist = String(track?.artist || "").trim() || translate("rsvp_spotify_artist_unknown");
            return (
              <li
                key={trackId}
                className="flex items-center gap-3 rounded-xl border border-black/10 dark:border-white/10 bg-white/80 dark:bg-black/20 px-3 py-2.5"
              >
                <div className="w-10 h-10 rounded-lg overflow-hidden border border-black/10 dark:border-white/10 bg-black/5 dark:bg-white/5 shrink-0 flex items-center justify-center">
                  {track?.cover ? (
                    <img
                      src={track.cover}
                      alt={translate("rsvp_spotify_cover_alt").replace("{song}", trackName)}
                      className="w-full h-full object-cover"
                      loading="lazy"
                    />
                  ) : (
                    <Icon name="sparkle" className="w-4 h-4 text-gray-400" />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-bold text-gray-900 dark:text-white truncate">
                    {trackName}
                  </p>
                  <p className="text-xs text-gray-600 dark:text-gray-300 truncate">
                    {trackArtist}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => handleAddTrack(track)}
                  disabled={Boolean(addingTrackId)}
                  className="w-9 h-9 rounded-full border border-[#1DB954]/50 text-[#1DB954] hover:bg-[#1DB954]/10 transition-all flex items-center justify-center disabled:opacity-60 disabled:cursor-not-allowed"
                  aria-label={`${translate("rsvp_spotify_add_action")}: ${trackName}`}
                >
                  {isAdding ? (
                    <Icon name="loader" className="w-4 h-4 animate-spin" />
                  ) : (
                    <Icon name="plus" className="w-4 h-4" />
                  )}
                </button>
              </li>
            );
          })}
        </ul>
      ) : (
        <p className="text-xs text-gray-500 dark:text-gray-400 italic">
          {translate("rsvp_spotify_empty_hint")}
        </p>
      )}
    </section>
  );
}

export { SpotifyGuestWidget };
