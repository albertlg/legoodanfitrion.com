import { useEffect, useMemo, useState } from "react";
import { BrandMark } from "../components/brand-mark";
import { Controls } from "../components/controls";
import { Icon } from "../components/icons";
import { InlineMessage } from "../components/inline-message";
import { supabase } from "../lib/supabaseClient";
import { Helmet } from "react-helmet-async";

function toNullable(value) {
  const trimmed = value.trim();
  return trimmed === "" ? null : trimmed;
}

function formatDate(dateText, language, fallbackText) {
  if (!dateText) {
    return fallbackText;
  }
  try {
    return new Date(dateText).toLocaleString(language);
  } catch {
    return new Date(dateText).toLocaleString();
  }
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

function PublicRsvpScreen({ token, language, setLanguage, themeMode, setThemeMode, t }) {
  const [isLoading, setIsLoading] = useState(true);
  const [pageError, setPageError] = useState("");
  const [invitation, setInvitation] = useState(null);
  const [status, setStatus] = useState("yes");
  const [guestName, setGuestName] = useState("");
  const [note, setNote] = useState("");
  const [plusOne, setPlusOne] = useState(false);
  const [dietaryNeeds, setDietaryNeeds] = useState([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitMessage, setSubmitMessage] = useState("");

  const invitationLocation = String(
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

  useEffect(() => {
    if (!supabase) {
      setIsLoading(false);
      return;
    }
    const load = async () => {
      setIsLoading(true);
      setPageError("");
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
      if (first.rsvp_status && first.rsvp_status !== "pending") {
        setStatus(first.rsvp_status);
      }
      setNote(typeof first.response_note === "string" ? first.response_note : "");
      setPlusOne(Boolean(first.rsvp_plus_one));
      setDietaryNeeds(parseDietaryNeeds(first.rsvp_dietary_needs));
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
      setSubmitMessage(`${t("error_submit_rsvp")} ${error.message}`);
      return;
    }

    setSubmitMessage(t("rsvp_saved"));
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
  };

  const toggleDietaryNeed = (value) => {
    setDietaryNeeds((previous) => (previous.includes(value) ? previous.filter((item) => item !== value) : [...previous, value]));
  };

  const statusColors = {
    yes: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400 border-green-200 dark:border-green-800/30",
    maybe: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400 border-yellow-200 dark:border-yellow-800/30",
    no: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400 border-red-200 dark:border-red-800/30",
    pending: "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400 border-gray-200 dark:border-gray-700"
  };

  return (
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
        <header className="bg-white/40 dark:bg-gray-900/40 backdrop-blur-xl border border-black/5 dark:border-white/10 rounded-3xl shadow-sm p-4 px-6 flex items-center justify-between">
          <div className="flex flex-col">
            <p className="text-[10px] font-bold uppercase tracking-widest text-gray-500 dark:text-gray-400 leading-none mb-1">{t("app_name")}</p>
            <div className="flex items-center gap-2">
              <BrandMark text="" fallback={t("logo_fallback")} className="w-6 h-6" />
              <h1 className="text-lg font-black text-gray-900 dark:text-white leading-none tracking-tight">{t("rsvp_title")}</h1>
            </div>
          </div>
          <Controls themeMode={themeMode} setThemeMode={setThemeMode} language={language} setLanguage={setLanguage} t={t} />
        </header>

        {isLoading ? (
          <div className="bg-white/40 dark:bg-gray-900/40 backdrop-blur-xl border border-black/5 dark:border-white/10 rounded-3xl shadow-sm p-12 flex flex-col items-center justify-center gap-4">
            <Icon name="sparkle" className="w-8 h-8 text-blue-500 animate-pulse" />
            <p className="text-sm font-medium text-gray-500 dark:text-gray-400">{t("loading_invitation")}</p>
          </div>
        ) : null}

        {pageError ? (
          <div className="bg-red-50/80 dark:bg-red-900/20 backdrop-blur-xl border border-red-200 dark:border-red-800/30 rounded-3xl shadow-sm p-8 text-center">
            <Icon name="x" className="w-8 h-8 text-red-500 mx-auto mb-3" />
            <p className="text-sm font-bold text-red-800 dark:text-red-300">{pageError}</p>
          </div>
        ) : null}

        {invitation ? (
          <>
            {/* TARJETA DEL EVENTO */}
            <article className="bg-white/60 dark:bg-gray-900/60 backdrop-blur-2xl border border-black/5 dark:border-white/10 rounded-3xl shadow-xl overflow-hidden flex flex-col items-center text-center p-8 md:p-10 relative">
              <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500"></div>

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
                  <p className="text-sm font-bold text-gray-900 dark:text-white">{formatDate(invitation.event_start_at, language, t("no_date"))}</p>
                </div>

                {invitationLocation ? (
                  <div className="flex flex-col items-center justify-center p-4 bg-white/40 dark:bg-black/20 rounded-2xl border border-black/5 dark:border-white/5">
                    <Icon name="location" className="w-5 h-5 text-orange-500 mb-2" />
                    <p className="text-[10px] font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-1">{t("field_place")}</p>
                    <p className="text-sm font-bold text-gray-900 dark:text-white truncate w-full px-2" title={invitationLocation}>{invitationLocation}</p>
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

            {/* FORMULARIO RSVP */}
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

              {/* Botones Sí/No gigantes */}
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

              {/* Toggle Plus One (Solo visible si el host lo habilitó) */}
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

              {/* Dieta */}
              <div className="flex flex-col gap-2">
                <p className="text-[10px] font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400 ml-1">{t("rsvp_dietary_label")}</p>
                <div className="flex flex-wrap gap-2">
                  {dietaryOptions.map((optionItem) => {
                    const isActive = dietaryNeeds.includes(optionItem.value);
                    return (
                      <button
                        key={optionItem.value}
                        type="button"
                        className={`px-4 py-2 rounded-full text-xs font-bold transition-all shadow-sm border ${isActive ? "bg-blue-600 text-white border-blue-700" : "bg-white dark:bg-black/40 text-gray-700 dark:text-gray-300 border-black/10 dark:border-white/10 hover:bg-gray-50 dark:hover:bg-white/5"}`}
                        onClick={() => toggleDietaryNeed(optionItem.value)}
                        aria-pressed={isActive}
                      >
                        {optionItem.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Notas */}
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

              {/* Botón Enviar */}
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
                    <InlineMessage text={submitMessage} />
                  </div>
                ) : null}
              </div>
            </form>
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
  );
}

export { PublicRsvpScreen };