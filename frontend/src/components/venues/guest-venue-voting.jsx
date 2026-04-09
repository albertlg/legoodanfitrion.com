import { useEffect, useMemo, useState } from "react";
import { motion as Motion } from "framer-motion";
import { Icon } from "../icons";
import { InlineMessage } from "../inline-message";

const configuredApiUrl = String(
  import.meta.env.VITE_API_URL ||
    import.meta.env.VITE_API_BASE_URL ||
    ""
).trim();
const fallbackApiUrl = "/api";
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

function formatPriceLevel(priceLevel) {
  const numericValue = Number(priceLevel);
  if (!Number.isFinite(numericValue) || numericValue <= 0) {
    return "";
  }
  return "€".repeat(Math.min(4, numericValue));
}

const venueGridVariants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.08,
      delayChildren: 0.05
    }
  }
};

const venueCardVariants = {
  hidden: { opacity: 0, y: 20 },
  show: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.35
    }
  }
};

function GuestVenueVoting({ venues, invitationToken, initialVotedVenueIds = [], t }) {
  const translate = (key) => (typeof t === "function" ? t(key) : key);
  const voteEndpoint = useMemo(() => buildVenueEndpoint("vote"), []);
  const [votedVenueIds, setVotedVenueIds] = useState(
    Array.from(new Set((Array.isArray(initialVotedVenueIds) ? initialVotedVenueIds : []).map((id) => String(id || "").trim()).filter(Boolean)))
  );
  const [submittingVenueId, setSubmittingVenueId] = useState("");
  const [feedback, setFeedback] = useState("");
  const [feedbackType, setFeedbackType] = useState("info");

  useEffect(() => {
    const normalizedIds = Array.from(
      new Set(
        (Array.isArray(initialVotedVenueIds) ? initialVotedVenueIds : [])
          .map((id) => String(id || "").trim())
          .filter(Boolean)
      )
    );
    setVotedVenueIds(normalizedIds);
  }, [initialVotedVenueIds]);

  const handleVote = async (venue) => {
    const venueId = String(venue?.id || "").trim();
    const token = String(invitationToken || "").trim();
    const fullVoteUrl = ensureAbsoluteUrl(voteEndpoint);

    if (!venueId || !token || !fullVoteUrl) {
      setFeedbackType("error");
      setFeedback(translate("event_venues_vote_error"));
      return;
    }

    setSubmittingVenueId(venueId);
    setFeedback("");
    setFeedbackType("info");
    try {
      const response = await fetch(fullVoteUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json"
        },
        body: JSON.stringify({
          token,
          venueId
        })
      });

      const payload = await response.json();
      if (!response.ok || payload?.success === false) {
        throw new Error(String(payload?.error || `HTTP ${response.status}`));
      }

      setVotedVenueIds((previous) => Array.from(new Set([...previous, venueId])));
      setFeedbackType("success");
      setFeedback(
        translate("event_venues_vote_success").replace(
          "{venue}",
          String(venue?.name || "").trim() || translate("field_place")
        )
      );
    } catch (error) {
      setFeedbackType("error");
      setFeedback(`${translate("event_venues_vote_error")} ${String(error?.message || "").trim()}`.trim());
    } finally {
      setSubmittingVenueId("");
    }
  };

  return (
    <section className="flex flex-col gap-4">
      {feedback ? <InlineMessage type={feedbackType} text={feedback} /> : null}

      <Motion.div
        className="grid grid-cols-1 gap-4"
        variants={venueGridVariants}
        initial="hidden"
        animate="show"
      >
        {(Array.isArray(venues) ? venues : []).map((venue) => {
          const venueId = String(venue?.id || "").trim();
          const isSubmitting = submittingVenueId === venueId;
          const hasVoted = votedVenueIds.includes(venueId);
          const priceLevelLabel = formatPriceLevel(venue?.google_price_level || venue?.priceLevel);
          const voteCount = Math.max(0, Number(venue?.vote_count || 0));

          return (
            <Motion.article
              key={venueId}
              className="rounded-2xl border border-black/10 dark:border-white/10 bg-white/70 dark:bg-black/30 overflow-hidden shadow-sm flex flex-col"
              variants={venueCardVariants}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              <div className="w-full h-36 bg-black/5 dark:bg-white/5 flex items-center justify-center overflow-hidden">
                {venue?.google_photo_url || venue?.photoUrl ? (
                  <img
                    src={venue.google_photo_url || venue.photoUrl}
                    alt={String(venue?.name || "").trim() || translate("field_place")}
                    className="w-full h-full object-cover"
                    loading="lazy"
                  />
                ) : (
                  <Icon name="location" className="w-6 h-6 text-gray-400" />
                )}
              </div>

              <div className="p-4 flex flex-col gap-3">
                <div className="flex flex-wrap items-start gap-2">
                  <p className="text-sm font-black text-gray-900 dark:text-white leading-snug min-w-0 flex-1">
                    {venue?.name || translate("field_place")}
                  </p>
                  {Number.isFinite(Number(venue?.google_rating || venue?.rating)) ? (
                    <span className="inline-flex items-center rounded-full bg-amber-50 text-amber-700 dark:bg-amber-900/20 dark:text-amber-300 border border-amber-200 dark:border-amber-700/40 px-2 py-0.5 text-[11px] font-bold">
                      ★ {Number(venue.google_rating || venue.rating).toFixed(1)}
                    </span>
                  ) : null}
                  {priceLevelLabel ? (
                    <span className="inline-flex items-center rounded-full bg-emerald-50 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-700/40 px-2 py-0.5 text-[11px] font-bold">
                      {priceLevelLabel}
                    </span>
                  ) : null}
                </div>

                {venue?.address ? (
                  <p className="text-xs text-gray-600 dark:text-gray-300 leading-relaxed">
                    {venue.address}
                  </p>
                ) : null}

                <div className="flex items-center justify-between gap-3">
                  <span className="text-[11px] font-bold text-gray-500 dark:text-gray-400">
                    {translate("event_venues_votes_count").replace("{count}", String(voteCount))}
                  </span>
                  <button
                    type="button"
                    onClick={() => handleVote(venue)}
                    disabled={Boolean(submittingVenueId)}
                    className={`inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-xs font-black transition-colors disabled:opacity-60 disabled:cursor-not-allowed ${
                      hasVoted
                        ? "bg-green-600 text-white"
                        : "bg-blue-600 hover:bg-blue-700 text-white"
                    }`}
                  >
                    <Icon
                      name={isSubmitting ? "loader" : hasVoted ? "check" : "heart"}
                      className={`w-4 h-4 ${isSubmitting ? "animate-spin" : ""}`}
                    />
                    <span>
                      {hasVoted
                        ? translate("event_venues_vote_selected")
                        : translate("event_venues_vote_action")}
                    </span>
                  </button>
                </div>
              </div>
            </Motion.article>
          );
        })}
      </Motion.div>
    </section>
  );
}

export { GuestVenueVoting };
