import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion as Motion } from "framer-motion";
import { BrandMark } from "../components/brand-mark";
import { Controls } from "../components/controls";
import { Icon } from "../components/icons";
import { InlineMessage } from "../components/inline-message";
import { SpotifyGuestWidget } from "../components/spotify/spotify-guest-widget";
import { PhotoGalleryPreview } from "../components/events/photo-gallery-preview";
import { GuestVenueVoting } from "../components/venues/guest-venue-voting";
import { supabase } from "../lib/supabaseClient";
import { Helmet } from "react-helmet-async";
import { formatDate, formatEventDateDisplay } from "../lib/formatters";

function toNullable(value) {
  const trimmed = value.trim();
  return trimmed === "" ? null : trimmed;
}

function isValidEmail(value) {
  const normalized = String(value || "").trim().toLowerCase();
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized);
}

function statusText(t, status) {
  return t(`status_${String(status || "").toLowerCase()}`);
}

function parseDietaryNeeds(value) {
  if (!Array.isArray(value)) {
    return [];
  }
  return value
    .map((item) => String(item || "").trim())
    .filter(Boolean);
}

function isLegacyRsvpFunctionError(error) {
  const message = String(error?.message || "").toLowerCase();
  return (
    message.includes("p_rsvp_plus_one") ||
    message.includes("p_rsvp_dietary_needs") ||
    message.includes("submit_rsvp_by_token") ||
    String(error?.code || "").toLowerCase() === "pgrst202"
  );
}

const EVENT_DATE_OPTION_DATETIME_KEYS = ["starts_at", "start_at", "proposed_at", "option_at", "datetime_at"];
const DATE_VOTE_STATUS_KEYS = ["status", "vote", "availability", "response", "answer"];

function getEventDateOptionStartAt(optionItem) {
  if (!optionItem || typeof optionItem !== "object") {
    return "";
  }
  for (const key of EVENT_DATE_OPTION_DATETIME_KEYS) {
    const value = String(optionItem?.[key] || "").trim();
    if (value) {
      return value;
    }
  }
  return "";
}

function normalizeDateVoteStatus(voteStatus) {
  const normalized = String(voteStatus || "").trim().toLowerCase();
  if (["yes", "si", "sí"].includes(normalized)) {
    return "yes";
  }
  if (["no"].includes(normalized)) {
    return "no";
  }
  if (["maybe", "potser", "tal vez", "tal_vez", "forse"].includes(normalized)) {
    return "maybe";
  }
  return "pending";
}

const RSVP_SOUND_BY_STATUS = {
  yes: "/sounds/clink.mp3",
  maybe: "/sounds/pop.mp3",
  pending: "/sounds/pop.mp3",
  no: "/sounds/break.mp3"
};

function trackPlgEvent(eventName, payload = {}) {
  try {
    const safePayload = payload && typeof payload === "object" ? payload : {};
    // Placeholder de analíticas: en la próxima iteración se conectará al provider real.
    console.log("[analytics][plg]", eventName, safePayload);
  } catch {
    // noop
  }
}

const RSVP_REFRESH_MARKER_KEY = "lga_rsvp_refresh_at";
const configuredApiUrl = String(
  import.meta.env.VITE_API_URL ||
    import.meta.env.VITE_API_BASE_URL ||
    ""
).trim();
const fallbackApiUrl = "/api";
const RSVP_BACKEND_API_BASE_URL = String(configuredApiUrl || fallbackApiUrl).replace(/\/+$/, "");

function buildVenueEndpoint(resource) {
  const normalizedBase = String(RSVP_BACKEND_API_BASE_URL || "").trim().replace(/\/+$/, "");
  if (!normalizedBase) {
    return "";
  }
  if (/(^|\/)api$/i.test(normalizedBase)) {
    return `${normalizedBase}/venues/${resource}`;
  }
  return `${normalizedBase}/api/venues/${resource}`;
}

function buildRsvpEndpoint(resource) {
  const normalizedBase = String(RSVP_BACKEND_API_BASE_URL || "").trim().replace(/\/+$/, "");
  if (!normalizedBase) {
    return "";
  }
  if (/(^|\/)api$/i.test(normalizedBase)) {
    return `${normalizedBase}/rsvp/${resource}`;
  }
  return `${normalizedBase}/api/rsvp/${resource}`;
}

function RsvpFormView({
  t,
  language,
  status,
  setStatus,
  guestName,
  setGuestName,
  guestEmail,
  setGuestEmail,
  plusOne,
  setPlusOne,
  dietaryNeeds,
  dietaryOptions,
  toggleDietaryNeed,
  note,
  setNote,
  handleSubmit,
  eventId,
  isDatePollOpen,
  hasSpotifyPlaylist,
  allowPlusOne,
  datePollOptions,
  dateVotesByOptionId,
  onVoteDateOption,
  isSubmittingDateVoteOptionId,
  dateVoteMessage,
  dateVoteMessageType,
  guestVenueVotingSection,
  isSubmitting,
  submitMessage
}) {
  return (
    <form className="bg-white/60 dark:bg-gray-900/60 backdrop-blur-2xl border border-black/5 dark:border-white/10 rounded-3xl shadow-xl p-6 md:p-8 flex flex-col gap-8 relative z-20" onSubmit={handleSubmit} aria-labelledby="rsvp-form-title">
      <h2 id="rsvp-form-title" className="text-xl font-black text-gray-900 dark:text-white text-center pb-4 border-b border-black/5 dark:border-white/10">
        {t("rsvp_title")}
      </h2>

      <label className="flex flex-col gap-2">
        <span className="text-[10px] font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400 ml-1 flex items-center gap-1.5">
          <Icon name="user" className="w-3.5 h-3.5" />
          {t("rsvp_name_optional")}
        </span>
        <input
          type="text"
          className="w-full px-4 py-3 bg-white/70 dark:bg-black/40 border border-black/10 dark:border-white/10 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/30 rounded-xl text-sm font-medium text-gray-900 dark:text-white transition-all shadow-sm outline-none"
          value={guestName}
          onChange={(event) => setGuestName(event.target.value)}
          maxLength={120}
        />
      </label>

      {!isDatePollOpen && status === "yes" ? (
        <label className="flex flex-col gap-2">
          <span className="text-[10px] font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400 ml-1 flex items-center gap-1.5">
            <Icon name="mail" className="w-3.5 h-3.5" />
            {t("rsvp_email_label")}
          </span>
          <input
            type="email"
            className="w-full px-4 py-3 bg-white/70 dark:bg-black/40 border border-black/10 dark:border-white/10 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/30 rounded-xl text-sm font-medium text-gray-900 dark:text-white transition-all shadow-sm outline-none"
            value={guestEmail}
            onChange={(event) => setGuestEmail(event.target.value)}
            placeholder={t("rsvp_email_placeholder")}
            autoComplete="email"
            required
            maxLength={160}
          />
          <p className="text-[11px] text-gray-500 dark:text-gray-400 ml-1">
            {t("rsvp_email_help")}
          </p>
        </label>
      ) : null}

      {isDatePollOpen ? (
        <RsvpDatePollView
          t={t}
          language={language}
          options={datePollOptions}
          votesByOptionId={dateVotesByOptionId}
          onVote={onVoteDateOption}
          isSubmittingOptionId={isSubmittingDateVoteOptionId}
          submitMessage={dateVoteMessage}
          submitMessageType={dateVoteMessageType}
        />
      ) : (
        <div className="flex flex-col gap-2">
          <span className="text-[10px] font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400 ml-1 flex items-center gap-1.5">
            <Icon name="check" className="w-3.5 h-3.5" />
            {t("rsvp_question")}
          </span>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3" role="radiogroup" aria-label={t("rsvp_question")}>
            <button
              type="button"
              className={`py-4 px-4 rounded-2xl font-black text-sm border-2 transition-all shadow-sm ${status === "yes" ? "bg-green-50 border-green-500 text-green-700 dark:bg-green-900/30 dark:border-green-500 dark:text-green-300 ring-4 ring-green-500/20 scale-[1.02]" : "bg-white border-transparent text-gray-600 hover:border-green-200 hover:bg-green-50/50 dark:bg-black/20 dark:text-gray-400 dark:hover:border-green-900/50 dark:hover:bg-green-900/10"}`}
              aria-pressed={status === "yes"}
              onClick={() => setStatus("yes")}
            >
              {statusText(t, "yes")}
            </button>
            <button
              type="button"
              className={`py-4 px-4 rounded-2xl font-black text-sm border-2 transition-all shadow-sm ${status === "maybe" ? "bg-yellow-50 border-yellow-500 text-yellow-700 dark:bg-yellow-900/30 dark:border-yellow-500 dark:text-yellow-300 ring-4 ring-yellow-500/20 scale-[1.02]" : "bg-white border-transparent text-gray-600 hover:border-yellow-200 hover:bg-yellow-50/50 dark:bg-black/20 dark:text-gray-400 dark:hover:border-yellow-900/50 dark:hover:bg-yellow-900/10"}`}
              aria-pressed={status === "maybe"}
              onClick={() => setStatus("maybe")}
            >
              {statusText(t, "maybe")}
            </button>
            <button
              type="button"
              className={`py-4 px-4 rounded-2xl font-black text-sm border-2 transition-all shadow-sm ${status === "no" ? "bg-red-50 border-red-500 text-red-700 dark:bg-red-900/30 dark:border-red-500 dark:text-red-300 ring-4 ring-red-500/20 scale-[1.02]" : "bg-white border-transparent text-gray-600 hover:border-red-200 hover:bg-red-50/50 dark:bg-black/20 dark:text-gray-400 dark:hover:border-red-900/50 dark:hover:bg-red-900/10"}`}
              aria-pressed={status === "no"}
              onClick={() => setStatus("no")}
            >
              {statusText(t, "no")}
            </button>
          </div>
        </div>
      )}

      {allowPlusOne ? (
        <div className="flex items-start justify-between gap-4 p-4 bg-white/40 dark:bg-black/20 border border-black/5 dark:border-white/5 rounded-2xl">
          <div className="flex flex-col gap-1">
            <span className="text-sm font-bold text-gray-900 dark:text-white">{t("rsvp_plus_one_question")}</span>
            <span className="text-[10px] text-gray-500 dark:text-gray-400 uppercase tracking-wider">{t("rsvp_plus_one_hint")}</span>
          </div>
          <label className="relative inline-flex items-center cursor-pointer mt-1 shrink-0">
            <input
              type="checkbox"
              className="sr-only peer"
              checked={plusOne}
              onChange={(event) => setPlusOne(event.target.checked)}
            />
            <div className="w-11 h-6 bg-gray-300 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"></div>
          </label>
        </div>
      ) : null}

      <div className="flex flex-col gap-2">
        <p className="text-[10px] font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400 ml-1">{t("rsvp_dietary_label")}</p>
        <div className="flex flex-wrap gap-2">
          {dietaryOptions.map((optionItem) => {
            const isActive = dietaryNeeds.includes(optionItem.value);
            return (
              <button
                key={optionItem.value}
                type="button"
                className={`px-4 py-3 rounded-full text-xs font-bold transition-all shadow-sm border ${isActive ? "bg-blue-600 text-white border-blue-700" : "bg-white dark:bg-black/40 text-gray-700 dark:text-gray-300 border-black/10 dark:border-white/10 hover:bg-gray-50 dark:hover:bg-white/5"}`}
                onClick={() => toggleDietaryNeed(optionItem.value)}
                aria-pressed={isActive}
              >
                {optionItem.label}
              </button>
            );
          })}
        </div>
      </div>

      {guestVenueVotingSection}

      {eventId && hasSpotifyPlaylist ? <SpotifyGuestWidget eventId={eventId} t={t} /> : null}

      <label className="flex flex-col gap-2">
        <span className="text-[10px] font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400 ml-1 flex items-center gap-1.5">
          <Icon name="mail" className="w-3.5 h-3.5" />
          {t("rsvp_note_optional")}
        </span>
        <textarea
          className="w-full px-4 py-3 bg-white/70 dark:bg-black/40 border border-black/10 dark:border-white/10 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/30 rounded-xl text-sm font-medium text-gray-900 dark:text-white transition-all shadow-sm outline-none resize-none"
          rows="3"
          value={note}
          onChange={(event) => setNote(event.target.value)}
          placeholder={t("rsvp_note_placeholder")}
          maxLength={500}
        />
      </label>

      <div className="pt-4 border-t border-black/5 dark:border-white/10">
        <button
          className="w-full py-4 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white font-black text-lg rounded-2xl shadow-lg hover:shadow-xl hover:-translate-y-1 transition-all disabled:opacity-50 disabled:hover:translate-y-0 disabled:cursor-not-allowed disabled:hover:shadow-none"
          type="submit"
          disabled={isSubmitting}
        >
          {isSubmitting ? t("submitting_rsvp") : t("submit_rsvp")}
        </button>
        {submitMessage ? (
          <div className="mt-4 flex justify-center">
            <InlineMessage text={submitMessage} type="error" />
          </div>
        ) : null}
      </div>
    </form>
  );
}

function RsvpDatePollView({
  t,
  language,
  options,
  votesByOptionId,
  onVote,
  isSubmittingOptionId,
  submitMessage,
  submitMessageType = "success"
}) {
  const statusButtonClass = (isActive, status) => {
    if (status === "yes") {
      return isActive
        ? "bg-green-600 text-white border-green-700 ring-2 ring-green-400/40"
        : "bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300 border-green-200 dark:border-green-700/40 hover:bg-green-100 dark:hover:bg-green-900/30";
    }
    if (status === "maybe") {
      return isActive
        ? "bg-amber-500 text-white border-amber-600 ring-2 ring-amber-400/40"
        : "bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-700/40 hover:bg-amber-100 dark:hover:bg-amber-900/30";
    }
    return isActive
      ? "bg-red-600 text-white border-red-700 ring-2 ring-red-400/40"
      : "bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300 border-red-200 dark:border-red-700/40 hover:bg-red-100 dark:hover:bg-red-900/30";
  };

  return (
    <section className="flex flex-col gap-5">
      <div className="flex flex-col gap-1">
        <h2 className="text-xl font-black text-gray-900 dark:text-white">{t("rsvp_poll_title")}</h2>
        <p className="text-sm text-gray-600 dark:text-gray-300">{t("rsvp_poll_subtitle")}</p>
      </div>
      {(Array.isArray(options) ? options : []).map((optionItem, index) => {
        const optionId = String(optionItem?.id || "").trim();
        const currentVote = normalizeDateVoteStatus(votesByOptionId?.[optionId] || "pending");
        const optionDateText = formatDate(optionItem?.startAt, language, t("no_date"));
        const isSavingThisOption = isSubmittingOptionId === optionId;
        return (
          <article
            key={optionId || `option-${index}`}
            className="rounded-2xl border border-black/10 dark:border-white/10 bg-white/70 dark:bg-black/30 p-4 flex flex-col gap-3"
          >
            <div className="flex items-center justify-between gap-3">
              <p className="text-sm font-bold text-gray-900 dark:text-white">{optionDateText}</p>
              <span className="text-[10px] px-2 py-1 rounded-full bg-black/5 dark:bg-white/10 text-gray-600 dark:text-gray-300 font-bold uppercase tracking-wide">
                {t("event_date_poll_vote_matrix_option")} #{index + 1}
              </span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              {[
                { value: "yes", emoji: "✅", label: t("status_yes") },
                { value: "maybe", emoji: "🤷", label: t("status_maybe") },
                { value: "no", emoji: "❌", label: t("status_no") }
              ].map((action) => (
                <button
                  key={`${optionId}-${action.value}`}
                  type="button"
                  onClick={() => onVote(optionId, action.value)}
                  disabled={Boolean(isSubmittingOptionId)}
                  className={`inline-flex items-center justify-center gap-1.5 rounded-xl border px-3 py-2 text-xs font-black transition-all disabled:opacity-50 disabled:cursor-not-allowed ${statusButtonClass(currentVote === action.value, action.value)}`}
                >
                  <span>{action.emoji}</span>
                  <span>{action.label}</span>
                </button>
              ))}
            </div>
            <p className="text-[11px] text-gray-500 dark:text-gray-400">
              {currentVote === "pending"
                ? t("status_pending")
                : `${t("rsvp_poll_your_vote")}: ${statusText(t, currentVote)}`}
            </p>
            {isSavingThisOption ? (
              <p className="text-[11px] font-semibold text-blue-600 dark:text-blue-300">{t("submitting_rsvp")}</p>
            ) : null}
          </article>
        );
      })}
      {(!Array.isArray(options) || options.length === 0) ? (
        <p className="text-sm text-gray-500 dark:text-gray-400 italic">{t("event_date_poll_options_empty")}</p>
      ) : null}
      {submitMessage ? <InlineMessage text={submitMessage} type={submitMessageType} /> : null}
    </section>
  );
}

function RsvpSuccessView({ t, onOpenGlobalGuestProfile, onOpenHostApp, dietaryNeeds, dietaryOptions }) {
  // Texto dinámico personalizado según dietas seleccionadas
  const hasDiets = Array.isArray(dietaryNeeds) && dietaryNeeds.length > 0;
  const dietLabels = hasDiets
    ? dietaryNeeds.map((v) => {
        const opt = (dietaryOptions || []).find((o) => o.value === v);
        return opt ? opt.label : v;
      }).join(", ")
    : "";

  return (
    <section className="bg-white/60 dark:bg-gray-900/60 backdrop-blur-2xl border border-black/5 dark:border-white/10 rounded-3xl shadow-xl p-6 md:p-8 flex flex-col gap-6 relative z-20">

      {/* 1. MENSAJE DE ÉXITO (Validación) */}
      <div className="flex flex-col items-center text-center gap-3">
        <div className="w-12 h-12 rounded-2xl bg-green-100 dark:bg-green-900/30 border border-green-200 dark:border-green-800/30 flex items-center justify-center shadow-sm">
          <Icon name="check" className="w-6 h-6 text-green-700 dark:text-green-300" />
        </div>
        <h2 className="text-2xl md:text-3xl font-black text-gray-900 dark:text-white">
          {t("rsvp_success_title")}
        </h2>
        <p className="text-sm md:text-base text-gray-600 dark:text-gray-300 max-w-xl">
          {t("rsvp_success_subtitle")}
        </p>
      </div>

      {/* 2. 🚀 TARJETA PLG INVITADO (Estilo Magic Card) */}
      <div className="relative w-full rounded-[2rem] border border-black/10 dark:border-white/10 shadow-2xl flex flex-col overflow-hidden group bg-gray-50 dark:bg-gray-900 mx-auto text-left">

        {/* LA MAGIA: Bolas de color giratorias en el fondo */}
        <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none opacity-40 dark:opacity-30 mix-blend-multiply dark:mix-blend-screen transition-opacity duration-700">
          <div
            className="absolute -top-10 -left-10 w-64 h-64 rounded-full bg-gradient-to-tr from-blue-400 to-purple-400 blur-3xl animate-spin"
            style={{ animationDuration: "15s" }}
          ></div>
          <div
            className="absolute top-20 right-10 w-48 h-48 rounded-full bg-gradient-to-tr from-orange-300 to-pink-400 blur-3xl animate-spin"
            style={{ animationDuration: "20s", animationDirection: "reverse" }}
          ></div>
        </div>

        {/* CAPA DE CRISTAL: Glassmorphism */}
        <div className="absolute inset-0 backdrop-blur-[60px] bg-white/60 dark:bg-black/40 z-0"></div>

        {/* CONTENIDO REAL DE LA TARJETA */}
        <div className="relative z-10 flex flex-col w-full h-full p-6 md:p-8 gap-3">
          <p className="text-[10px] font-bold uppercase tracking-widest text-blue-700 dark:text-blue-400 drop-shadow-sm">
            {t("rsvp_plg_card_kicker")}
          </p>
          <h3 className="text-xl md:text-2xl font-black text-gray-900 dark:text-white leading-tight">
            {hasDiets
              ? t("rsvp_plg_card_title_diet").replace("{{diets}}", dietLabels)
              : t("rsvp_plg_card_title")}
          </h3>
          <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed max-w-md">
            {hasDiets ? t("rsvp_plg_card_description_diet") : t("rsvp_plg_card_description")}
          </p>
          <div className="pt-4">
            <button
              type="button"
              onClick={onOpenGlobalGuestProfile}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-sm transition-all hover:-translate-y-0.5 shadow-lg hover:shadow-blue-500/30"
            >
              <Icon name="user" className="w-4 h-4" />
              {t("rsvp_plg_primary_cta")}
            </button>
          </div>
        </div>
      </div>

      {/* 3. 🚀 TARJETA PLG ANFITRIÓN (Mismo nivel visual) */}
      <div className="relative w-full rounded-[2rem] border border-purple-200/60 dark:border-purple-500/20 shadow-2xl flex flex-col overflow-hidden group bg-gray-50 dark:bg-gray-900 mx-auto text-left">

        {/* Borde superior con gradiente */}
        <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-purple-500 via-pink-500 to-orange-400 z-20"></div>

        {/* Bolas decorativas */}
        <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none opacity-30 dark:opacity-20 mix-blend-multiply dark:mix-blend-screen">
          <div
            className="absolute -bottom-10 -right-10 w-56 h-56 rounded-full bg-gradient-to-tr from-purple-400 to-pink-400 blur-3xl animate-spin"
            style={{ animationDuration: "18s" }}
          ></div>
          <div
            className="absolute top-10 left-10 w-40 h-40 rounded-full bg-gradient-to-tr from-orange-300 to-yellow-400 blur-3xl animate-spin"
            style={{ animationDuration: "22s", animationDirection: "reverse" }}
          ></div>
        </div>

        {/* Glassmorphism */}
        <div className="absolute inset-0 backdrop-blur-[60px] bg-white/60 dark:bg-black/40 z-0"></div>

        {/* Contenido */}
        <div className="relative z-10 flex flex-col w-full h-full p-6 md:p-8 gap-3">
          <p className="text-[10px] font-bold uppercase tracking-widest text-purple-700 dark:text-purple-400 drop-shadow-sm flex items-center gap-1.5">
            <Icon name="sparkle" className="w-3.5 h-3.5" />
            {t("rsvp_plg_host_kicker")}
          </p>
          <h3 className="text-xl md:text-2xl font-black text-gray-900 dark:text-white leading-tight">
            {t("rsvp_plg_host_title")}
          </h3>
          <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed max-w-md">
            {t("rsvp_plg_host_description")}
          </p>
          <div className="pt-4">
            <button
              type="button"
              onClick={onOpenHostApp}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-purple-600 to-pink-500 hover:from-purple-500 hover:to-pink-400 text-white font-bold text-sm transition-all hover:-translate-y-0.5 shadow-lg hover:shadow-purple-500/30"
            >
              <Icon name="calendar" className="w-4 h-4" />
              {t("rsvp_plg_host_cta")}
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}

function PublicRsvpScreen({ token, language, setLanguage, themeMode, setThemeMode, t }) {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(true);
  const [pageError, setPageError] = useState("");
  const [invitation, setInvitation] = useState(null);
  const [status, setStatus] = useState("yes");
  const [guestName, setGuestName] = useState("");
  const [guestEmail, setGuestEmail] = useState("");
  const [note, setNote] = useState("");
  const [plusOne, setPlusOne] = useState(false);
  const [dietaryNeeds, setDietaryNeeds] = useState([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmittingDateVoteOptionId, setIsSubmittingDateVoteOptionId] = useState("");
  const [submitMessage, setSubmitMessage] = useState("");
  const [dateVoteMessage, setDateVoteMessage] = useState("");
  const [dateVoteMessageType, setDateVoteMessageType] = useState("success");
  const [isRsvpSaved, setIsRsvpSaved] = useState(false);
  const [eventScheduleMode, setEventScheduleMode] = useState("fixed");
  const [eventPollStatus, setEventPollStatus] = useState("closed");
  const [eventAllowPlusOne, setEventAllowPlusOne] = useState(false);
  const [eventStartAt, setEventStartAt] = useState("");
  const [eventEndAt, setEventEndAt] = useState("");
  const [eventPhotoGalleryUrl, setEventPhotoGalleryUrl] = useState("");
  const [datePollOptions, setDatePollOptions] = useState([]);
  const [dateVotesByOptionId, setDateVotesByOptionId] = useState({});
  const [hasSpotifyPlaylist, setHasSpotifyPlaylist] = useState(false);
  const [fetchedVotes, setFetchedVotes] = useState(null);
  const [eventVenues, setEventVenues] = useState([]);
  const [finalVenue, setFinalVenue] = useState(null);
  const [userVotedVenueIds, setUserVotedVenueIds] = useState([]);
  const optionVotes = dateVotesByOptionId;
  const setOptionVotes = setDateVotesByOptionId;

  const invitationLocation = String(
    finalVenue?.name ||
    finalVenue?.address ||
    invitation?.event_location_name ||
    invitation?.event_location_address ||
    invitation?.location_name ||
    invitation?.location_address ||
    invitation?.event_location ||
    ""
  ).trim();

  const invitationOrganizer = String(
    invitation?.host_name || invitation?.host_display_name || invitation?.organizer_name || t("app_name")
  ).trim();

  const isDatePollOpen = useMemo(() => {
    const invitationPollStatus = String(invitation?.poll_status || "").trim().toLowerCase();
    const invitationScheduleMode = String(invitation?.schedule_mode || "").trim().toLowerCase();
    const normalizedPollStatus = String(eventPollStatus || invitationPollStatus).trim().toLowerCase();
    const normalizedScheduleMode = String(eventScheduleMode || invitationScheduleMode).trim().toLowerCase();
    if (normalizedPollStatus) {
      return normalizedPollStatus === "open";
    }
    return normalizedScheduleMode === "tbd";
  }, [eventPollStatus, eventScheduleMode, invitation?.poll_status, invitation?.schedule_mode]);
  const eventDateDisplay = useMemo(
    () =>
      formatEventDateDisplay({
        startAt: eventStartAt || invitation?.event_start_at,
        endAt: eventEndAt || invitation?.event_end_at,
        language,
        t
      }),
    [eventStartAt, eventEndAt, invitation?.event_start_at, invitation?.event_end_at, language, t]
  );
  const galleryPreviewUrl = String(finalVenue?.photo_gallery_url || eventPhotoGalleryUrl || "").trim();

  const isPastEvent = useMemo(() => {
    if (isDatePollOpen) {
      return false;
    }
    const referenceDate = String(
      eventEndAt || invitation?.event_end_at || eventStartAt || invitation?.event_start_at || ""
    ).trim();
    if (!referenceDate) {
      return false;
    }
    const parsedTimestamp = new Date(referenceDate).getTime();
    if (!Number.isFinite(parsedTimestamp)) {
      return false;
    }
    return parsedTimestamp < Date.now();
  }, [eventEndAt, eventStartAt, invitation?.event_end_at, invitation?.event_start_at, isDatePollOpen]);
  const showPostEventGallery = isPastEvent && Boolean(galleryPreviewUrl);
  const showPastEventClosedCard = isPastEvent && !showPostEventGallery;

  useEffect(() => {
    if (fetchedVotes && Array.isArray(fetchedVotes)) {
      const diccionarioVotos = {};
      fetchedVotes.forEach((voteItem) => {
        const optionId = String(voteItem?.event_date_option_id || voteItem?.option_id || "").trim();
        if (!optionId) {
          return;
        }
        diccionarioVotos[optionId] = normalizeDateVoteStatus(voteItem?.vote || voteItem?.status || voteItem?.availability);
      });
      setOptionVotes(diccionarioVotos);
    }
  }, [fetchedVotes, setOptionVotes]);

  const invitationLocationMapsUrl = invitationLocation
    ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(invitationLocation)}`
    : "";

  const dietaryOptions = useMemo(
    () => [
      { value: "gluten_free", label: t("rsvp_dietary_gluten_free") },
      { value: "vegetarian", label: t("rsvp_dietary_vegetarian") },
      { value: "vegan", label: t("rsvp_dietary_vegan") },
      { value: "lactose_free", label: t("rsvp_dietary_lactose_free") }
    ],
    [t]
  );

  // 🔊 Reproduce sonido según estado RSVP.
  // Archivos esperados en: /public/sounds/{clink,pop,break}.mp3
  const playRsvpSound = (rsvpStatus) => {
    try {
      const normalizedStatus = String(rsvpStatus || "maybe").trim().toLowerCase();
      const soundUrl = RSVP_SOUND_BY_STATUS[normalizedStatus] || RSVP_SOUND_BY_STATUS.maybe;
      const audio = new Audio(soundUrl);
      audio.volume = 0.6;
      audio.play().catch(() => {
        // Algunos navegadores bloquean audio si consideran que ya no hay gesto del usuario.
      });
    } catch {
      // noop
    }
  };

  // 📳 Función para la vibración (Android)
  const triggerHaptics = () => {
    // Comprobamos que estamos en el navegador y soporta vibración
    if (typeof window !== 'undefined' && window.navigator && window.navigator.vibrate) {
      // Vibra 50ms, pausa 50ms, vibra 50ms (efecto de doble confirmación)
      window.navigator.vibrate([50, 50, 50]);
    }
  };

  useEffect(() => {
    if (!supabase) {
      setIsLoading(false);
      return;
    }
    const load = async () => {
      setIsLoading(true);
      setPageError("");
      setFetchedVotes(null);
      const { data, error } = await supabase.rpc("get_invitation_public", { p_token: token });

      if (error) {
        setPageError(error.message);
        setInvitation(null);
        setIsLoading(false);
        return;
      }
      const first = data?.[0];
      if (!first) {
        setPageError(t("invitation_not_found"));
        setInvitation(null);
        setIsLoading(false);
        return;
      }

      setInvitation(first);
      setGuestName(first.guest_name || "");
      setGuestEmail(String(first.invitee_email || "").trim());
      if (first.rsvp_status && first.rsvp_status !== "pending") {
        setStatus(first.rsvp_status);
      }
      setNote(typeof first.response_note === "string" ? first.response_note : "");
      setPlusOne(Boolean(first.rsvp_plus_one));
      setDietaryNeeds(parseDietaryNeeds(first.rsvp_dietary_needs));
      setEventScheduleMode(String(first.schedule_mode || "fixed").trim().toLowerCase() || "fixed");
      setEventPollStatus(String(first.poll_status || "closed").trim().toLowerCase() || "closed");
      setEventAllowPlusOne(Boolean(first.allow_plus_one ?? first.event_allow_plus_one ?? false));
      setEventStartAt(String(first.event_start_at || first.start_at || "").trim());
      setEventEndAt(String(first.event_end_at || first.end_at || "").trim());
      setDatePollOptions([]);
      setDateVotesByOptionId({});
      setHasSpotifyPlaylist(false);
      setEventPhotoGalleryUrl(String(first.photo_gallery_url || first.event_photo_gallery_url || "").trim());
      setEventVenues([]);
      setFinalVenue(null);
      setUserVotedVenueIds([]);
      setDateVoteMessage("");
      setDateVoteMessageType("success");
      setIsRsvpSaved(false);
      if (!(first.allow_plus_one ?? first.event_allow_plus_one ?? false)) {
        setPlusOne(false);
      }

      const eventId = String(first.event_id || "").trim();
      if (eventId) {
        let shouldLoadPollData = true;

        const spotifyResult = await supabase
          .from("event_spotify_playlists")
          .select("id")
          .eq("event_id", eventId)
          .maybeSingle();
        if (spotifyResult.error) {
          console.error("[rsvp-spotify] Error cargando estado de Spotify", spotifyResult.error);
          setHasSpotifyPlaylist(false);
        } else {
          setHasSpotifyPlaylist(Boolean(spotifyResult.data?.id));
        }

        const effectiveEventDateRaw = String(
          first.event_end_at ||
            first.end_at ||
            first.event_start_at ||
            first.start_at ||
            ""
        ).trim();
        if (effectiveEventDateRaw) {
          const effectiveEventTimestamp = new Date(effectiveEventDateRaw).getTime();
          if (Number.isFinite(effectiveEventTimestamp) && effectiveEventTimestamp < Date.now()) {
            shouldLoadPollData = false;
          }
        }

        if (shouldLoadPollData && token) {
          let rawOptions = [];
          const optionsByTokenResult = await supabase
            .rpc("get_event_date_options_by_token", { p_token: token });

          if (optionsByTokenResult.error) {
            console.error("[rsvp-poll] Error cargando opciones por token (RPC)", optionsByTokenResult.error);
            const optionsFallbackResult = await supabase
              .from("event_date_options")
              .select("*")
              .eq("event_id", eventId)
              .order("starts_at", { ascending: true });
            if (optionsFallbackResult.error) {
              console.error("[rsvp-poll] Error cargando opciones de encuesta (fallback)", optionsFallbackResult.error);
            } else {
              rawOptions = Array.isArray(optionsFallbackResult.data) ? optionsFallbackResult.data : [];
            }
          } else {
            rawOptions = Array.isArray(optionsByTokenResult.data) ? optionsByTokenResult.data : [];
          }

          const normalizedOptions = rawOptions
            .map((optionItem) => {
              const optionId = String(optionItem?.id || "").trim();
              const startAt = getEventDateOptionStartAt(optionItem);
              if (!optionId || !startAt) {
                return null;
              }
              return {
                ...optionItem,
                id: optionId,
                startAt
              };
            })
            .filter(Boolean);

          setDatePollOptions(normalizedOptions);

          if (normalizedOptions.length > 0) {
            const { data: myVotes, error: votesError } = await supabase
              .rpc("get_event_date_votes_by_token", { p_token: token });
            if (votesError) {
              console.error("[rsvp-poll] Error cargando votos del invitado", votesError);
            } else {
              setFetchedVotes(Array.isArray(myVotes) ? myVotes : []);
            }
          }
        }

        const venuePublicUrl = buildVenueEndpoint("public");
        if (token && venuePublicUrl) {
          try {
            const url = new URL(venuePublicUrl, window.location.origin);
            url.searchParams.set("token", token);
            const venueResponse = await fetch(url.toString(), {
              method: "GET",
              headers: {
                Accept: "application/json"
              }
            });
            const venuePayload = await venueResponse.json();
            if (!venueResponse.ok || venuePayload?.success === false) {
              throw new Error(String(venuePayload?.error || `HTTP ${venueResponse.status}`));
            }

            const venues = Array.isArray(venuePayload?.venues) ? venuePayload.venues : [];
            const finalVenueItem =
              venuePayload?.finalVenue && typeof venuePayload.finalVenue === "object"
                ? venuePayload.finalVenue
                : venues.find((venueItem) => Boolean(venueItem?.is_final_selection)) || null;
            const votingVenues = venues.filter((venueItem) => !venueItem?.is_final_selection);
            const votedVenueIds = Array.isArray(venuePayload?.userVotedVenueIds)
              ? venuePayload.userVotedVenueIds.map((value) => String(value || "").trim()).filter(Boolean)
              : [];

            setFinalVenue(finalVenueItem);
            setEventVenues(votingVenues);
            setUserVotedVenueIds(votedVenueIds);
          } catch (venueError) {
            console.error("[rsvp-venues] Error cargando lugares", venueError);
            setFinalVenue(null);
            setEventVenues([]);
            setUserVotedVenueIds([]);
          }
        }
      }
      setIsLoading(false);
    };
    load();
  }, [token, t]);

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!supabase) {
      return;
    }
    setSubmitMessage("");
    setDateVoteMessage("");
    setPageError("");
    setIsSubmitting(true);

    const payload = {
      p_token: token,
      p_status: status,
      p_response_note: toNullable(note),
      p_guest_display_name: toNullable(guestName),
      p_rsvp_plus_one: plusOne,
      p_rsvp_dietary_needs: dietaryNeeds
    };

    const normalizedGuestEmail = toNullable(guestEmail || "");
    if (!isDatePollOpen && status === "yes" && (!normalizedGuestEmail || !isValidEmail(normalizedGuestEmail))) {
      setIsSubmitting(false);
      setIsRsvpSaved(false);
      setSubmitMessage(t("rsvp_email_required_error"));
      return;
    }

    let { data, error } = await supabase.rpc("submit_rsvp_by_token", payload);

    if (error && isLegacyRsvpFunctionError(error)) {
      const selectedDietaryLabels = dietaryOptions
        .filter((optionItem) => dietaryNeeds.includes(optionItem.value))
        .map((optionItem) => optionItem.label);
      const rsvpMetaLines = [
        plusOne ? t("rsvp_plus_one_selected") : "",
        selectedDietaryLabels.length > 0 ? `${t("rsvp_dietary_label")}: ${selectedDietaryLabels.join(", ")}` : ""
      ].filter(Boolean);
      const fallbackNote = toNullable([note.trim(), ...rsvpMetaLines].filter(Boolean).join("\n"));
      ({ data, error } = await supabase.rpc("submit_rsvp_by_token", {
        p_token: token,
        p_status: status,
        p_response_note: fallbackNote,
        p_guest_display_name: toNullable(guestName)
      }));
    }

    setIsSubmitting(false);
    if (error) {
      setIsRsvpSaved(false);
      setSubmitMessage(`${t("error_submit_rsvp")} ${error.message}`);
      return;
    }

    setSubmitMessage(t("rsvp_saved"));
    setIsRsvpSaved(true);
    try {
      const refreshMarker = String(Date.now());
      window.localStorage.setItem(RSVP_REFRESH_MARKER_KEY, refreshMarker);
      // Dispara evento cross-tab para dashboards abiertos en otras pestañas.
      window.dispatchEvent(
        new StorageEvent("storage", {
          key: RSVP_REFRESH_MARKER_KEY,
          newValue: refreshMarker,
          storageArea: window.localStorage
        })
      );
    } catch {
      // noop: la actualización del RSVP ya se guardó; el refresh se hará al volver.
    }
    // 🚀 Feedback de éxito dinámico según respuesta RSVP.
    playRsvpSound(status);
    triggerHaptics();
    trackPlgEvent("rsvp_submitted_success", {
      token,
      status,
      plusOne,
      dietaryNeedsCount: dietaryNeeds.length
    });
    if (data?.[0]) {
      setInvitation((prev) => ({
        ...prev,
        rsvp_status: data[0].status,
        response_note: note.trim() || null,
        rsvp_plus_one: plusOne,
        rsvp_dietary_needs: [...dietaryNeeds]
      }));
    } else {
      setInvitation((prev) =>
        prev
          ? {
            ...prev,
            rsvp_status: status,
            response_note: note.trim() || null,
            rsvp_plus_one: plusOne,
            rsvp_dietary_needs: [...dietaryNeeds]
          }
          : prev
      );
    }

    const normalizedFinalStatus = String(data?.[0]?.status || status || "").trim().toLowerCase();
    const ticketEndpoint = buildRsvpEndpoint("ticket");
    if (normalizedFinalStatus === "yes" && ticketEndpoint && token) {
      const eventIdForTicket = String(data?.[0]?.event_id || invitation?.event_id || "").trim();
      const guestNameForTicket = toNullable(guestName) || toNullable(invitation?.guest_name || "");
      const guestEmailForTicket = toNullable(guestEmail || invitation?.invitee_email || "");

      // Fire-and-forget: nunca bloquea la confirmacion de RSVP.
      void fetch(ticketEndpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json"
        },
        body: JSON.stringify({
          invitationToken: token,
          status: normalizedFinalStatus,
          eventId: eventIdForTicket || null,
          guestName: guestNameForTicket || null,
          guestEmail: guestEmailForTicket || null
        })
      })
        .then(async (response) => {
          const payload = await response.json().catch(() => ({}));
          if (!response.ok || payload?.success === false) {
            console.warn("[rsvp-ticket] Ticket email not sent:", payload?.error || `HTTP ${response.status}`);
          }
        })
        .catch((ticketError) => {
          console.warn("[rsvp-ticket] Ticket request failed:", ticketError);
        });
    }
  };

  const handleSubmitDateVote = async (optionId, vote) => {
    if (!supabase || !optionId || !token) {
      return;
    }
    setDateVoteMessage("");
    setPageError("");
    setIsSubmittingDateVoteOptionId(optionId);
    const normalizedVote = normalizeDateVoteStatus(vote);
    const { error } = await supabase.rpc("submit_event_date_vote_by_token", {
      p_token: token,
      p_event_date_option_id: optionId,
      p_vote: normalizedVote
    });
    setIsSubmittingDateVoteOptionId("");
    if (error) {
      setDateVoteMessageType("error");
      setDateVoteMessage(`${t("rsvp_poll_vote_error")} ${error.message || ""}`.trim());
      return;
    }
    setDateVotesByOptionId((prev) => ({
      ...(prev || {}),
      [optionId]: normalizedVote
    }));
    setDateVoteMessageType("success");
    setDateVoteMessage(t("rsvp_poll_vote_saved"));
  };

  const toggleDietaryNeed = (value) => {
    setDietaryNeeds((previous) => (previous.includes(value) ? previous.filter((item) => item !== value) : [...previous, value]));
  };

  const handleOpenGlobalGuestProfile = () => {
    // 🚀 1. Guardamos la "magia" temporalmente
    if (guestName) sessionStorage.setItem("lga_temp_name", guestName);
    if (dietaryNeeds && dietaryNeeds.length > 0) {
      sessionStorage.setItem("lga_temp_diet", JSON.stringify(dietaryNeeds));
    }

    trackPlgEvent("rsvp_to_host_cta_click", {
      token,
      destination: "/login",
      source: "rsvp_success"
    });

    // 🚀 2. Navegamos al login indicando sus intenciones
    navigate("/login?intent=claim_profile");
  };

  const handleOpenHostApp = () => {
    // 🚀 1. Guardamos su nombre para personalizar su bienvenida si se registra
    if (guestName) sessionStorage.setItem("lga_temp_name", guestName);

    trackPlgEvent("rsvp_host_create_event_click", {
      token,
      destination: "/app/events/new",
      source: "rsvp_success"
    });

    // 🚀 2. Aquí hay un detalle técnico importante:
    // Si el usuario no está logueado y va a "/app/events/new", supongo que tu app 
    // lo redirige automáticamente al "/login". 
    // Para asegurarnos de que la pantalla de login le hable de "Crear su primer evento",
    // lo mandamos directamente al login con la redirección preparada:
    navigate("/login?intent=create_event&next=/app/events/new");
  };

  const statusColors = {
    yes: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400 border-green-200 dark:border-green-800/30",
    maybe: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400 border-yellow-200 dark:border-yellow-800/30",
    no: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400 border-red-200 dark:border-red-800/30",
    pending: "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400 border-gray-200 dark:border-gray-700"
  };

  const guestVenueVotingSection =
    !finalVenue && eventVenues.length > 0 ? (
      <section className="flex flex-col gap-4">
        <div className="flex flex-col gap-1">
          <h3 className="text-base font-black text-gray-900 dark:text-white">
            {t("event_venues_guest_title")}
          </h3>
          <p className="text-xs text-gray-600 dark:text-gray-300">
            {t("event_venues_guest_hint")}
          </p>
        </div>
        <GuestVenueVoting
          venues={eventVenues}
          invitationToken={token}
          initialVotedVenueIds={userVotedVenueIds}
          t={t}
        />
      </section>
    ) : null;

  const finalVenueSection = finalVenue ? (
    <article className="bg-white/60 dark:bg-gray-900/60 backdrop-blur-2xl border border-black/5 dark:border-white/10 rounded-3xl shadow-xl overflow-hidden">
      <div className="p-6 md:p-8 flex flex-col gap-5">
        <div className="flex items-start gap-3">
          <div className="w-11 h-11 rounded-2xl bg-green-100 text-green-700 dark:bg-green-900/20 dark:text-green-300 flex items-center justify-center shrink-0">
            <Icon name="location" className="w-5 h-5" />
          </div>
          <div className="min-w-0 flex-1 flex flex-col gap-1">
            <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-gray-500 dark:text-gray-400">
              {t("event_venues_final_location_title")}
            </p>
            <h3 className="text-lg font-black text-gray-900 dark:text-white leading-tight">
              {finalVenue?.name || t("field_place")}
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-300 leading-relaxed">
              {t("event_venues_final_location_hint")}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-[180px,1fr] gap-5 items-stretch">
          <div className="w-full h-44 md:h-full rounded-2xl overflow-hidden bg-black/5 dark:bg-white/5 flex items-center justify-center">
            {finalVenue?.google_photo_url || finalVenue?.photoUrl ? (
              <img
                src={finalVenue.google_photo_url || finalVenue.photoUrl}
                alt={String(finalVenue?.name || "").trim() || t("field_place")}
                className="w-full h-full object-cover"
                loading="lazy"
              />
            ) : (
              <Icon name="location" className="w-8 h-8 text-gray-400" />
            )}
          </div>

          <div className="flex flex-col gap-3">
            <div className="flex flex-wrap gap-2">
              {Number.isFinite(Number(finalVenue?.google_rating || finalVenue?.rating)) ? (
                <span className="inline-flex items-center rounded-full bg-amber-50 text-amber-700 dark:bg-amber-900/20 dark:text-amber-300 border border-amber-200 dark:border-amber-700/40 px-2.5 py-1 text-[11px] font-bold">
                  ★ {Number(finalVenue.google_rating || finalVenue.rating).toFixed(1)}
                </span>
              ) : null}
              <span className="inline-flex items-center rounded-full bg-green-100 text-green-700 dark:bg-green-900/20 dark:text-green-300 border border-green-200 dark:border-green-700/40 px-2.5 py-1 text-[11px] font-bold uppercase tracking-wider">
                {t("event_venues_final_badge")}
              </span>
            </div>

            {finalVenue?.address ? (
              <p className="text-sm font-medium text-gray-700 dark:text-gray-200 leading-relaxed">
                {finalVenue.address}
              </p>
            ) : null}

            {invitationLocationMapsUrl ? (
              <div className="pt-1">
                <a
                  href={invitationLocationMapsUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white px-4 py-2.5 text-xs font-black transition-colors"
                >
                  <Icon name="location" className="w-4 h-4" />
                  <span>{t("map_open_external")}</span>
                </a>
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </article>
  ) : null;

  const memoriesGallerySection = galleryPreviewUrl ? (
    <Motion.article
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className={`bg-white/60 dark:bg-gray-900/60 backdrop-blur-2xl border border-black/5 dark:border-white/10 rounded-3xl shadow-xl overflow-hidden ${showPostEventGallery ? "ring-2 ring-indigo-500/20 dark:ring-indigo-400/30 shadow-2xl" : ""}`}
    >
      <div className="p-6 md:p-8 flex flex-col gap-5">
        <div className="flex items-start gap-3 min-w-0">
          <div className="w-11 h-11 rounded-2xl bg-indigo-100 text-indigo-700 dark:bg-indigo-900/20 dark:text-indigo-300 flex items-center justify-center shrink-0">
            <Icon name="camera" className="w-5 h-5" />
          </div>
          <div className="min-w-0 flex-1 flex flex-col gap-1">
            <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-gray-500 dark:text-gray-400">
              {t("rsvp_gallery_title")}
            </p>
            <h3 className="text-lg font-black text-gray-900 dark:text-white leading-tight">
              {t("rsvp_gallery_heading")}
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-300 leading-relaxed">
              {t("rsvp_gallery_hint")}
            </p>
          </div>
        </div>

        <div className="flex flex-col md:flex-row gap-5 md:items-end md:justify-between">
          <PhotoGalleryPreview url={galleryPreviewUrl} />
          <a
            href={galleryPreviewUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2.5 text-xs font-black transition-colors self-start md:self-auto"
          >
            <Icon name="camera" className="w-4 h-4" />
            <span>{t("rsvp_gallery_open_action")}</span>
          </a>
        </div>
      </div>
    </Motion.article>
  ) : null;

  return (
    <Motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
    >
      <main className="relative min-h-screen bg-gray-50 dark:bg-[#131720] text-gray-900 dark:text-white font-sans selection:bg-blue-200 dark:selection:bg-blue-900 selection:text-blue-900 dark:selection:text-white flex flex-col items-center py-8 px-4 overflow-hidden">
      {/* 🚀 FIX SEO: Inyección dinámica de metadatos según el idioma */}
      <Helmet htmlAttributes={{ lang: language }}>
        <title>{t("seo_title")}</title>
        <meta name="description" content={t("seo_desc")} />

        {/* Open Graph Dinámico */}
        <meta property="og:title" content={t("seo_title")} />
        <meta property="og:description" content={t("seo_desc")} />

        {/* Twitter Card Dinámico */}
        <meta name="twitter:title" content={t("seo_title")} />
        <meta name="twitter:description" content={t("seo_desc")} />
      </Helmet>

      {/* Decorative Blobs */}
      <div className="fixed top-[-10%] right-[-5%] w-[300px] md:w-[500px] h-[300px] md:h-[500px] bg-blue-500/20 dark:bg-blue-600/10 rounded-full mix-blend-multiply filter blur-3xl opacity-70 pointer-events-none z-0"></div>
      <div className="fixed bottom-[-10%] left-[-5%] w-[300px] md:w-[500px] h-[300px] md:h-[500px] bg-purple-500/20 dark:bg-purple-600/10 rounded-full mix-blend-multiply filter blur-3xl opacity-70 pointer-events-none z-0"></div>

      <div className="w-full max-w-2xl relative z-10 flex flex-col gap-6">

        {/* CABECERA (Logo y Controles) */}
        <header className="bg-white/40 dark:bg-gray-900/40 backdrop-blur-xl border border-black/5 dark:border-white/10 rounded-3xl shadow-sm p-4 px-6 flex items-center justify-between z-20">
          <div className="flex flex-col">
            <p className="text-[10px] font-bold uppercase tracking-widest text-gray-500 dark:text-gray-400 leading-none mb-1">{t("app_name")}</p>
            <div className="flex items-center gap-2">
              <BrandMark text="" fallback={t("logo_fallback")} className="w-6 h-6" />
              <h1 className="text-lg font-black text-gray-900 dark:text-white leading-none tracking-tight">{t("rsvp_title")}</h1>
            </div>
          </div>
          <Controls themeMode={themeMode} setThemeMode={setThemeMode} language={language} setLanguage={setLanguage} t={t} dropdownDirection="down" />
        </header>

        {isLoading ? (
          <div className="bg-white/40 dark:bg-gray-900/40 backdrop-blur-xl border border-black/5 dark:border-white/10 rounded-3xl shadow-sm p-12 flex flex-col items-center justify-center gap-4">
            <Icon name="sparkle" className="w-8 h-8 text-blue-500 animate-pulse" />
            <p className="text-sm font-medium text-gray-500 dark:text-gray-400">{t("loading_invitation")}</p>
          </div>
        ) : null}

        {pageError ? (
          <div className="bg-red-50/80 dark:bg-red-900/20 backdrop-blur-xl border border-red-200 dark:border-red-800/30 rounded-3xl shadow-sm p-8 text-center">
            <Icon name="close" className="w-8 h-8 text-red-500 mx-auto mb-3" />
            <p className="text-sm font-bold text-red-800 dark:text-red-300">{pageError}</p>
          </div>
        ) : null}

        {invitation ? (
          <>
            {/* TARJETA DEL EVENTO */}
            <article className="bg-white/60 dark:bg-gray-900/60 backdrop-blur-2xl border border-black/5 dark:border-white/10 rounded-3xl shadow-xl overflow-hidden flex flex-col items-center text-center p-8 md:p-10 relative">
              <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500"></div>

              <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-gray-500 dark:text-gray-400 mb-2">
                {showPostEventGallery ? t("rsvp_past_event_thanks") : t("rsvp_invited_heading")}
              </p>
              <p className="text-xs font-bold uppercase tracking-widest text-blue-600 dark:text-blue-400 mb-2">{t("app_name")}</p>
              <h2 className="text-3xl md:text-4xl font-black text-gray-900 dark:text-white leading-tight tracking-tight mb-4">
                {invitation.event_title}
              </h2>

              <div className="flex items-center gap-2 px-4 py-2 bg-black/5 dark:bg-white/5 rounded-full mb-8">
                <Icon name="user" className="w-4 h-4 text-gray-500" />
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{invitationOrganizer}</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 w-full">
                <div className="flex flex-col items-center justify-center p-4 bg-white/40 dark:bg-black/20 rounded-2xl border border-black/5 dark:border-white/5">
                  <Icon name="calendar" className="w-5 h-5 text-purple-500 mb-2" />
                  <p className="text-[10px] font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-1">{t("date")}</p>
                  <p className="text-sm font-bold text-gray-900 dark:text-white">
                    {isDatePollOpen && !(eventStartAt || invitation.event_start_at)
                      ? t("rsvp_poll_date_pending")
                      : eventDateDisplay.fullLabel}
                  </p>
                </div>

                {invitationLocation ? (
                  <div className="flex flex-col items-center justify-center p-4 bg-white/40 dark:bg-black/20 rounded-2xl border border-black/5 dark:border-white/5">
                    <Icon name="location" className="w-5 h-5 text-orange-500 mb-2" />
                    <p className="text-[10px] font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-1">{t("field_place")}</p>
                    <p className="text-sm font-bold text-gray-900 dark:text-white truncate w-full px-2" title={invitationLocation}>{invitationLocation}</p>
                    {finalVenue ? (
                      <span className="mt-2 inline-flex items-center rounded-full bg-green-100 text-green-700 dark:bg-green-900/20 dark:text-green-300 border border-green-200 dark:border-green-700/40 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider">
                        {t("event_venues_final_badge")}
                      </span>
                    ) : null}
                    {invitationLocationMapsUrl ? (
                      <a href={invitationLocationMapsUrl} target="_blank" rel="noreferrer" className="text-[10px] font-bold text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 mt-2 uppercase tracking-wider flex items-center gap-1 transition-colors">
                        {t("map_open_external")} <Icon name="arrow_right" className="w-3 h-3" />
                      </a>
                    ) : null}
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center p-4 bg-white/40 dark:bg-black/20 rounded-2xl border border-black/5 dark:border-white/5">
                    <Icon name="check" className="w-5 h-5 text-green-500 mb-2" />
                    <p className="text-[10px] font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-1">{t("status")}</p>
                    <span className={`px-2.5 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider border shadow-sm ${statusColors[invitation.rsvp_status] || statusColors.pending}`}>
                      {statusText(t, invitation.rsvp_status)}
                    </span>
                  </div>
                )}
              </div>
            </article>

            {isRsvpSaved && !isPastEvent ? (
              <RsvpSuccessView
                t={t}
                onOpenGlobalGuestProfile={handleOpenGlobalGuestProfile}
                onOpenHostApp={handleOpenHostApp}
                dietaryNeeds={dietaryNeeds}
                dietaryOptions={dietaryOptions}
              />
            ) : (
              <>
                {finalVenueSection}
                {memoriesGallerySection}
                {showPastEventClosedCard ? (
                  <Motion.article
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.4 }}
                    className="bg-white/60 dark:bg-gray-900/60 backdrop-blur-2xl border border-black/5 dark:border-white/10 rounded-3xl shadow-xl p-6 md:p-8 text-center"
                  >
                    <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 mb-4">
                      <Icon name="clock" className="w-6 h-6" />
                    </div>
                    <p className="text-xl font-black text-gray-900 dark:text-white mb-2">{t("rsvp_past_event_closed")}</p>
                    <p className="text-sm text-gray-600 dark:text-gray-300">{t("rsvp_past_event_closed_hint")}</p>
                  </Motion.article>
                ) : null}
                {!isPastEvent ? (
                  <RsvpFormView
                    t={t}
                    language={language}
                    status={status}
                    setStatus={setStatus}
                    guestName={guestName}
                    setGuestName={setGuestName}
                    guestEmail={guestEmail}
                    setGuestEmail={setGuestEmail}
                    plusOne={plusOne}
                    setPlusOne={setPlusOne}
                    dietaryNeeds={dietaryNeeds}
                    dietaryOptions={dietaryOptions}
                    toggleDietaryNeed={toggleDietaryNeed}
                    note={note}
                    setNote={setNote}
                    handleSubmit={handleSubmit}
                    eventId={invitation?.event_id}
                    hasSpotifyPlaylist={hasSpotifyPlaylist}
                    isDatePollOpen={isDatePollOpen}
                    allowPlusOne={eventAllowPlusOne}
                    datePollOptions={datePollOptions}
                    dateVotesByOptionId={optionVotes}
                    onVoteDateOption={handleSubmitDateVote}
                    isSubmittingDateVoteOptionId={isSubmittingDateVoteOptionId}
                    dateVoteMessage={dateVoteMessage}
                    dateVoteMessageType={dateVoteMessageType}
                    guestVenueVotingSection={guestVenueVotingSection}
                    isSubmitting={isSubmitting}
                    submitMessage={submitMessage}
                  />
                ) : null}
              </>
            )}
          </>
        ) : null}

        <footer className="text-center mt-8 pb-12 flex flex-col items-center gap-2">
          <a className="text-xs font-bold text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors" href="/">
            {t("back_panel")}
          </a>
          <p className="text-[10px] font-medium text-gray-400 dark:text-gray-500 uppercase tracking-widest">
            Powered by LeGoodAnfitrión
          </p>
        </footer>
      </div>
      </main>
    </Motion.div>
  );
}

export { PublicRsvpScreen };
