import { useEffect, useRef, useState } from "react";
import { Icon } from "../../../components/icons";

const DEFAULT_OPEN_SECTIONS = {
  event: true,
  guests: true,
  host: false,
  style: false,
  instructions: false
};

const FIELD_SECTION_MAP = {
  preset: "event",
  momentKey: "event",
  toneKey: "event",
  budgetKey: "event",
  durationHours: "event",
  allowPlusOne: "event",
  autoReminders: "event",
  dressCode: "event",
  playlistMode: "event",
  foodSuggestions: "guests",
  drinkSuggestions: "guests",
  avoidItems: "guests",
  medicalConditions: "guests",
  dietaryMedicalRestrictions: "guests",
  musicGenres: "host",
  decorColors: "host",
  icebreakers: "style",
  tabooTopics: "style",
  additionalInstructions: "instructions"
};

export function EventPlannerContextModal({
  isOpen,
  onClose,
  t,
  draft,
  setDraft,
  focusField,
  showTechnicalPrompt,
  onToggleTechnicalPrompt,
  technicalPrompt,
  onGenerate,
  isGenerating
}) {
  const updateDraftField = (key, value) => {
    setDraft((prev) => ({ ...prev, [key]: value }));
  };
  const fieldRefs = useRef({});
  const [openSections, setOpenSections] = useState(DEFAULT_OPEN_SECTIONS);

  const registerFieldRef = (fieldKey) => (node) => {
    if (!node) {
      return;
    }
    fieldRefs.current[fieldKey] = node;
  };
  const updateSectionOpen = (sectionKey, isOpenValue) => {
    setOpenSections((prev) => ({
      ...prev,
      [sectionKey]: Boolean(isOpenValue)
    }));
  };

  useEffect(() => {
    if (!isOpen) {
      return;
    }
    setOpenSections(DEFAULT_OPEN_SECTIONS);
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen || !focusField) {
      return;
    }
    const targetFieldKey = String(focusField).trim();
    const targetSection = FIELD_SECTION_MAP[targetFieldKey];
    if (targetSection) {
      setOpenSections((prev) => ({ ...prev, [targetSection]: true }));
    }
    const targetField = fieldRefs.current[targetFieldKey];
    if (!targetField || typeof targetField.focus !== "function") {
      return;
    }
    const request = typeof window !== "undefined" && window.requestAnimationFrame ? window.requestAnimationFrame : null;
    if (request) {
      request(() => {
        request(() => {
          targetField.focus();
          if (typeof targetField.scrollIntoView === "function") {
            targetField.scrollIntoView({ block: "center", behavior: "smooth" });
          }
        });
      });
      return;
    }
    targetField.focus();
    if (typeof targetField.scrollIntoView === "function") {
      targetField.scrollIntoView({ block: "center", behavior: "smooth" });
    }
  }, [isOpen, focusField]);

  if (!isOpen) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 sm:p-6" aria-labelledby="planner-context-title" role="dialog" aria-modal="true">
      {/* Fondo oscuro con desenfoque */}
      <div
        className="fixed inset-0 bg-black/60 backdrop-blur-sm transition-opacity"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Caja Modal Glassmorphism */}
      <section
        className="relative m-auto bg-white/90 dark:bg-gray-900/95 backdrop-blur-2xl w-full max-w-3xl max-h-[90vh] rounded-3xl shadow-2xl border border-white/20 dark:border-white/10 flex flex-col overflow-hidden animate-in zoom-in-95 duration-200"
        onClick={(event) => event.stopPropagation()}
      >
        {/* Cabecera pegajosa */}
        <header className="flex-none px-6 py-5 border-b border-black/5 dark:border-white/10 flex items-start justify-between bg-white/50 dark:bg-black/20 backdrop-blur-md sticky top-0 z-10">
          <div>
            <h3 id="planner-context-title" className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
              <Icon name="sparkle" className="w-5 h-5 text-blue-500" />
              {t("event_planner_context_modal_title")}
            </h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{t("event_planner_context_modal_hint")}</p>
          </div>
          <button
            className="p-2 -mr-2 text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/10 rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500/50"
            type="button"
            onClick={onClose}
            aria-label={t("close_modal")}
            title={t("close_modal")}
          >
            <Icon name="close" className="w-5 h-5" />
          </button>
        </header>

        {/* Contenido scrolleable con Scrollbar personalizada para que no sea blanca en modo oscuro */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6 [&::-webkit-scrollbar]:w-2 [&::-webkit-scrollbar-thumb]:bg-black/10 dark:[&::-webkit-scrollbar-thumb]:bg-white/10 [&::-webkit-scrollbar-thumb]:rounded-full">

          {/* SECCIÓN: EVENTO */}
          <details
            className="group"
            open={openSections.event}
            onToggle={(event) => updateSectionOpen("event", event.currentTarget?.open)}
          >
            <summary className="flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-gray-900 dark:text-white cursor-pointer select-none mb-4 focus:outline-none">
              <Icon name="chevron_down" className="w-4 h-4 text-gray-400 transition-transform group-open:rotate-180" />
              {t("event_planner_context_section_event")}
            </summary>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pl-6">
              <label className="flex flex-col gap-1.5">
                <span className="text-xs font-semibold text-gray-600 dark:text-gray-400">{t("event_planner_context_field_style")}</span>
                <select
                  className="w-full bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 rounded-xl px-4 py-2.5 text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-all outline-none appearance-none"
                  ref={registerFieldRef("preset")} value={draft.preset} onChange={(event) => updateDraftField("preset", event.target.value)}
                >
                  <option value="social">{t("event_planner_style_social")}</option>
                  <option value="bbq">{t("event_planner_style_bbq")}</option>
                  <option value="brunch">{t("event_planner_style_brunch")}</option>
                  <option value="romantic">{t("event_planner_style_romantic")}</option>
                  <option value="celebration">{t("event_planner_style_celebration")}</option>
                  <option value="movie">{t("event_planner_style_movie")}</option>
                  <option value="bookclub">{t("event_planner_style_bookclub")}</option>
                </select>
              </label>
              <label className="flex flex-col gap-1.5">
                <span className="text-xs font-semibold text-gray-600 dark:text-gray-400">{t("event_planner_context_field_moment")}</span>
                <select
                  className="w-full bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 rounded-xl px-4 py-2.5 text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-all outline-none appearance-none"
                  ref={registerFieldRef("momentKey")} value={draft.momentKey} onChange={(event) => updateDraftField("momentKey", event.target.value)}
                >
                  <option value="morning">{t("event_planner_moment_morning")}</option>
                  <option value="afternoon">{t("event_planner_moment_afternoon")}</option>
                  <option value="evening">{t("event_planner_moment_evening")}</option>
                  <option value="night">{t("event_planner_moment_night")}</option>
                </select>
              </label>
              <label className="flex flex-col gap-1.5">
                <span className="text-xs font-semibold text-gray-600 dark:text-gray-400">{t("event_planner_context_field_tone")}</span>
                <select
                  className="w-full bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 rounded-xl px-4 py-2.5 text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-all outline-none appearance-none"
                  ref={registerFieldRef("toneKey")} value={draft.toneKey} onChange={(event) => updateDraftField("toneKey", event.target.value)}
                >
                  <option value="casual">{t("event_planner_tone_casual")}</option>
                  <option value="formal">{t("event_planner_tone_formal")}</option>
                </select>
              </label>
              <label className="flex flex-col gap-1.5">
                <span className="text-xs font-semibold text-gray-600 dark:text-gray-400">{t("event_planner_context_field_budget")}</span>
                <select
                  className="w-full bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 rounded-xl px-4 py-2.5 text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-all outline-none appearance-none"
                  ref={registerFieldRef("budgetKey")} value={draft.budgetKey} onChange={(event) => updateDraftField("budgetKey", event.target.value)}
                >
                  <option value="low">{t("event_planner_budget_low")}</option>
                  <option value="medium">{t("event_planner_budget_medium")}</option>
                  <option value="high">{t("event_planner_budget_high")}</option>
                </select>
              </label>
              <label className="flex flex-col gap-1.5">
                <span className="text-xs font-semibold text-gray-600 dark:text-gray-400">{t("event_planner_context_field_duration")}</span>
                <input
                  className="w-full bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 rounded-xl px-4 py-2.5 text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-all outline-none"
                  ref={registerFieldRef("durationHours")}
                  type="number"
                  min="2"
                  max="12"
                  value={draft.durationHours}
                  onChange={(event) => updateDraftField("durationHours", event.target.value)}
                />
              </label>
              <label className="flex flex-col gap-1.5">
                <span className="text-xs font-semibold text-gray-600 dark:text-gray-400">{t("event_setting_allow_plus_one")}</span>
                <select
                  className="w-full bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 rounded-xl px-4 py-2.5 text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-all outline-none appearance-none"
                  ref={registerFieldRef("allowPlusOne")}
                  value={draft.allowPlusOne ? "yes" : "no"}
                  onChange={(event) => updateDraftField("allowPlusOne", event.target.value === "yes")}
                >
                  <option value="yes">{t("status_yes")}</option>
                  <option value="no">{t("status_no")}</option>
                </select>
              </label>
              <label className="flex flex-col gap-1.5">
                <span className="text-xs font-semibold text-gray-600 dark:text-gray-400">{t("event_setting_auto_reminders")}</span>
                <select
                  className="w-full bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 rounded-xl px-4 py-2.5 text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-all outline-none appearance-none"
                  ref={registerFieldRef("autoReminders")}
                  value={draft.autoReminders ? "yes" : "no"}
                  onChange={(event) => updateDraftField("autoReminders", event.target.value === "yes")}
                >
                  <option value="yes">{t("status_yes")}</option>
                  <option value="no">{t("status_no")}</option>
                </select>
              </label>
              <label className="flex flex-col gap-1.5">
                <span className="text-xs font-semibold text-gray-600 dark:text-gray-400">{t("event_setting_dress_code")}</span>
                <select
                  className="w-full bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 rounded-xl px-4 py-2.5 text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-all outline-none appearance-none"
                  ref={registerFieldRef("dressCode")} value={draft.dressCode} onChange={(event) => updateDraftField("dressCode", event.target.value)}>
                  <option value="none">{t("event_dress_code_none")}</option>
                  <option value="casual">{t("event_dress_code_casual")}</option>
                  <option value="elegant">{t("event_dress_code_elegant")}</option>
                  <option value="formal">{t("event_dress_code_formal")}</option>
                  <option value="themed">{t("event_dress_code_themed")}</option>
                </select>
              </label>
              <label className="flex flex-col gap-1.5 sm:col-span-2">
                <span className="text-xs font-semibold text-gray-600 dark:text-gray-400">{t("event_setting_playlist_mode")}</span>
                <select
                  className="w-full bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 rounded-xl px-4 py-2.5 text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-all outline-none appearance-none"
                  ref={registerFieldRef("playlistMode")}
                  value={draft.playlistMode}
                  onChange={(event) => updateDraftField("playlistMode", event.target.value)}
                >
                  <option value="host_only">{t("event_playlist_mode_host_only")}</option>
                  <option value="collaborative">{t("event_playlist_mode_collaborative")}</option>
                  <option value="spotify_collaborative">{t("event_playlist_mode_spotify_collaborative")}</option>
                </select>
              </label>
            </div>
          </details>

          <div className="h-px bg-black/5 dark:bg-white/10 w-full" />

          {/* SECCIÓN: INVITADOS */}
          <details
            className="group"
            open={openSections.guests}
            onToggle={(event) => updateSectionOpen("guests", event.currentTarget?.open)}
          >
            <summary className="flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-gray-900 dark:text-white cursor-pointer select-none mb-4 focus:outline-none">
              <Icon name="chevron_down" className="w-4 h-4 text-gray-400 transition-transform group-open:rotate-180" />
              {t("event_planner_context_section_guests")}
            </summary>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pl-6">
              <label className="flex flex-col gap-1.5">
                <span className="text-xs font-semibold text-gray-600 dark:text-gray-400">{t("smart_hosting_food")}</span>
                <textarea
                  className="w-full bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 rounded-xl px-4 py-3 text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-all outline-none resize-y min-h-[80px]"
                  ref={registerFieldRef("foodSuggestions")}
                  rows={2}
                  value={draft.foodSuggestions}
                  onChange={(event) => updateDraftField("foodSuggestions", event.target.value)}
                />
              </label>
              <label className="flex flex-col gap-1.5">
                <span className="text-xs font-semibold text-gray-600 dark:text-gray-400">{t("smart_hosting_drink")}</span>
                <textarea
                  className="w-full bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 rounded-xl px-4 py-3 text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-all outline-none resize-y min-h-[80px]"
                  ref={registerFieldRef("drinkSuggestions")}
                  rows={2}
                  value={draft.drinkSuggestions}
                  onChange={(event) => updateDraftField("drinkSuggestions", event.target.value)}
                />
              </label>
              <label className="flex flex-col gap-1.5">
                <span className="text-xs font-semibold text-gray-600 dark:text-gray-400">{t("smart_hosting_avoid")}</span>
                <textarea
                  className="w-full bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 rounded-xl px-4 py-3 text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-all outline-none resize-y min-h-[80px]"
                  ref={registerFieldRef("avoidItems")}
                  rows={2}
                  value={draft.avoidItems}
                  onChange={(event) => updateDraftField("avoidItems", event.target.value)}
                />
              </label>
              <label className="flex flex-col gap-1.5">
                <span className="text-xs font-semibold text-gray-600 dark:text-gray-400">{t("field_medical_conditions")}</span>
                <textarea
                  className="w-full bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 rounded-xl px-4 py-3 text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-all outline-none resize-y min-h-[80px]"
                  ref={registerFieldRef("medicalConditions")}
                  rows={2}
                  value={draft.medicalConditions}
                  onChange={(event) => updateDraftField("medicalConditions", event.target.value)}
                />
              </label>
              <label className="flex flex-col gap-1.5 sm:col-span-2">
                <span className="text-xs font-semibold text-gray-600 dark:text-gray-400">{t("field_dietary_medical_restrictions")}</span>
                <textarea
                  className="w-full bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 rounded-xl px-4 py-3 text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-all outline-none resize-y min-h-[80px]"
                  ref={registerFieldRef("dietaryMedicalRestrictions")}
                  rows={2}
                  value={draft.dietaryMedicalRestrictions}
                  onChange={(event) => updateDraftField("dietaryMedicalRestrictions", event.target.value)}
                />
              </label>
            </div>
          </details>

          <div className="h-px bg-black/5 dark:bg-white/10 w-full" />

          {/* SECCIÓN: HOST */}
          <details
            className="group"
            open={openSections.host}
            onToggle={(event) => updateSectionOpen("host", event.currentTarget?.open)}
          >
            <summary className="flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-gray-900 dark:text-white cursor-pointer select-none mb-4 focus:outline-none">
              <Icon name="chevron_down" className="w-4 h-4 text-gray-400 transition-transform group-open:rotate-180" />
              {t("event_planner_context_section_host")}
            </summary>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pl-6">
              <label className="flex flex-col gap-1.5">
                <span className="text-xs font-semibold text-gray-600 dark:text-gray-400">{t("smart_hosting_music")}</span>
                <textarea
                  className="w-full bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 rounded-xl px-4 py-3 text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-all outline-none resize-y min-h-[80px]"
                  ref={registerFieldRef("musicGenres")}
                  rows={2}
                  value={draft.musicGenres}
                  onChange={(event) => updateDraftField("musicGenres", event.target.value)}
                />
              </label>
              <label className="flex flex-col gap-1.5">
                <span className="text-xs font-semibold text-gray-600 dark:text-gray-400">{t("smart_hosting_decor")}</span>
                <textarea
                  className="w-full bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 rounded-xl px-4 py-3 text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-all outline-none resize-y min-h-[80px]"
                  ref={registerFieldRef("decorColors")}
                  rows={2}
                  value={draft.decorColors}
                  onChange={(event) => updateDraftField("decorColors", event.target.value)}
                />
              </label>
            </div>
          </details>

          <div className="h-px bg-black/5 dark:bg-white/10 w-full" />

          {/* SECCIÓN: ESTILO */}
          <details
            className="group"
            open={openSections.style}
            onToggle={(event) => updateSectionOpen("style", event.currentTarget?.open)}
          >
            <summary className="flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-gray-900 dark:text-white cursor-pointer select-none mb-4 focus:outline-none">
              <Icon name="chevron_down" className="w-4 h-4 text-gray-400 transition-transform group-open:rotate-180" />
              {t("event_planner_context_section_style")}
            </summary>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pl-6">
              <label className="flex flex-col gap-1.5">
                <span className="text-xs font-semibold text-gray-600 dark:text-gray-400">{t("smart_hosting_icebreakers")}</span>
                <textarea
                  className="w-full bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 rounded-xl px-4 py-3 text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-all outline-none resize-y min-h-[80px]"
                  ref={registerFieldRef("icebreakers")}
                  rows={2}
                  value={draft.icebreakers}
                  onChange={(event) => updateDraftField("icebreakers", event.target.value)}
                />
              </label>
              <label className="flex flex-col gap-1.5">
                <span className="text-xs font-semibold text-gray-600 dark:text-gray-400">{t("smart_hosting_taboo")}</span>
                <textarea
                  className="w-full bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 rounded-xl px-4 py-3 text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-all outline-none resize-y min-h-[80px]"
                  ref={registerFieldRef("tabooTopics")}
                  rows={2}
                  value={draft.tabooTopics}
                  onChange={(event) => updateDraftField("tabooTopics", event.target.value)}
                />
              </label>
            </div>
          </details>

          <div className="h-px bg-black/5 dark:bg-white/10 w-full" />

          {/* SECCIÓN: INSTRUCCIONES */}
          <details
            className="group"
            open={openSections.instructions}
            onToggle={(event) => updateSectionOpen("instructions", event.currentTarget?.open)}
          >
            <summary className="flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-gray-900 dark:text-white cursor-pointer select-none mb-4 focus:outline-none">
              <Icon name="chevron_down" className="w-4 h-4 text-gray-400 transition-transform group-open:rotate-180" />
              {t("event_planner_context_section_instructions")}
            </summary>
            <div className="pl-6">
              <label className="flex flex-col gap-1.5">
                <span className="text-xs font-semibold text-gray-600 dark:text-gray-400">{t("event_planner_context_field_instructions")}</span>
                <textarea
                  className="w-full bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 rounded-xl px-4 py-3 text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-all outline-none resize-y min-h-[80px]"
                  ref={registerFieldRef("additionalInstructions")}
                  rows={3}
                  value={draft.additionalInstructions}
                  onChange={(event) => updateDraftField("additionalInstructions", event.target.value)}
                />
              </label>
            </div>
          </details>

          {showTechnicalPrompt ? (
            <div className="mt-4 p-4 bg-gray-900 text-green-400 rounded-xl text-xs font-mono overflow-x-auto shadow-inner">
              <pre className="whitespace-pre-wrap">{technicalPrompt}</pre>
            </div>
          ) : null}

        </div>

        {/* Footer pegajoso con botones */}
        <footer className="flex-none px-6 py-4 border-t border-black/5 dark:border-white/10 bg-gray-50/80 dark:bg-gray-900/80 backdrop-blur-md flex flex-col sm:flex-row items-center justify-between gap-4">
          <button
            className="text-xs font-medium text-gray-500 hover:text-gray-900 dark:hover:text-white transition-colors underline underline-offset-4"
            type="button"
            onClick={onToggleTechnicalPrompt}
          >
            {showTechnicalPrompt ? t("event_planner_context_prompt_hide") : t("event_planner_context_prompt_show")}
          </button>
          <div className="flex items-center gap-3 w-full sm:w-auto">
            <button
              className="flex-1 sm:flex-none px-4 py-2.5 text-sm font-bold text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 border border-black/10 dark:border-white/10 rounded-xl shadow-sm hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
              type="button"
              onClick={onClose}
            >
              {t("cancel_action")}
            </button>
            <button
              className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-6 py-2.5 text-sm font-bold text-white bg-blue-600 border border-transparent rounded-xl shadow-sm hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              type="button"
              onClick={onGenerate}
              disabled={isGenerating}
            >
              {isGenerating ? (
                <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
              ) : (
                <Icon name="sparkle" className="w-4 h-4" />
              )}
              {isGenerating ? t("event_planner_generating_all") : t("event_planner_context_generate")}
            </button>
          </div>
        </footer>
      </section>
    </div>
  );
}
