import React from "react";
import { Icon } from "../../../components/icons";
import { InlineMessage } from "../../../components/inline-message";
import { PlanContextHeader } from "./plan-context-header";
import { PlanGuestSignalsBlock } from "./plan-guest-signals-block";
import { PlanTimelineHighlights } from "./plan-timeline-highlights";
import { PlanActionableCards } from "./plan-actionable-cards";

export function HostPlanView({
  standalone = false,
  selectedEventTitle,
  selectedEventDateLabel,
  selectedEventTimeLabel,
  selectedEventPlaceLabel,
  eventPlannerSectionRef,
  t,
  interpolateText,
  selectedEventMealPlan,
  selectedEventPlannerContextEffective,
  selectedEventPlannerSavedLabel,
  selectedEventPlannerSnapshotVersion = 0,
  selectedEventPlannerSnapshotHistory = [],
  selectedEventPlannerVariantSeed = 0,
  selectedEventPlannerTabSeed = {},
  selectedEventPlannerLastGeneratedByScope = {},
  selectedEventPlannerGenerationState,
  language = "en",
  handleOpenEventPlannerContext,
  handleRegenerateEventPlanner,
  handleRestoreEventPlannerSnapshot,
  eventDetailPlannerTab,
  handleExportEventPlannerShoppingList,
  selectedEventDetailStatusCounts,
  selectedEventDietTypesCount,
  selectedEventAllergiesCount,
  selectedEventMedicalConditionsCount,
  selectedEventDietaryMedicalRestrictionsCount,
  selectedEventHealthRestrictionHighlights,
  selectedEventRestrictionsCount,
  selectedEventIntolerancesCount,
  selectedEventHealthAlertsConfirmedCount,
  selectedEventHealthAlertsPendingCount,
  handleEventPlannerTabChange,
  selectedEventShoppingTotalIngredients,
  selectedEventEstimatedCostRange,
  selectedEventShoppingProgress,
  selectedEventShoppingItems,
  selectedEventShoppingCheckedSet,
  handleCopySelectedEventShoppingChecklist,
  handleMarkAllEventPlannerShoppingItems,
  handleClearEventPlannerShoppingCheckedItems,
  eventPlannerShoppingFilter,
  setEventPlannerShoppingFilter,
  selectedEventShoppingCounts,
  selectedEventShoppingGroupsFiltered,
  handleToggleEventPlannerShoppingItem,
  selectedEventHostPlaybook,
  handleCopyEventPlannerMessages,
  handleCopyEventPlannerPrompt,
  eventPlannerMessage,
  isProfessional = false,
  selectedEventDetailGuests = [],
  activeMods = {}
}) {
  const plannerTabs = [
    { key: "overview", label: t("event_planner_tab_overview") },
    { key: "menu", label: t("event_planner_tab_menu") },
    { key: "shopping", label: t("event_planner_tab_shopping") },
    { key: "ambience", label: t("event_planner_tab_ambience") },
    { key: "timings", label: t("event_planner_tab_timings") },
    { key: "communication", label: t("event_planner_tab_communication") },
    { key: "risks", label: t("event_planner_tab_risks") }
  ];
  const isGenerating = Boolean(selectedEventPlannerGenerationState?.isGenerating);
  const generatingScope = String(selectedEventPlannerGenerationState?.scope || "");
  const isGeneratingAll = isGenerating && generatingScope === "all";
  const isGeneratingCurrentTab = isGenerating && generatingScope === eventDetailPlannerTab;
  const REGENERATABLE_SCOPES = new Set(["menu", "shopping", "ambience", "timings", "communication", "risks"]);
  const regenerationTabScope = REGENERATABLE_SCOPES.has(eventDetailPlannerTab) ? eventDetailPlannerTab : "menu";
  const handleRegenerateCurrentTabClick = () => {
    console.log("Botón regenerar pulsado. Scope enviado:", regenerationTabScope);
    handleRegenerateEventPlanner(regenerationTabScope);
  };
  const selectedPlannerVersionValue = String(
    Number(selectedEventPlannerSnapshotVersion || selectedEventPlannerSnapshotHistory?.[0]?.version || 0) || ""
  );
  const menuTabRound = Math.max(
    Number(selectedEventPlannerTabSeed?.menu || 0),
    Number(selectedEventPlannerTabSeed?.shopping || 0)
  );
  const tabRounds = {
    menu: menuTabRound,
    shopping: menuTabRound,
    ambience: Number(selectedEventPlannerTabSeed?.ambience || 0),
    timings: Number(selectedEventPlannerTabSeed?.timings || 0),
    communication: Number(selectedEventPlannerTabSeed?.communication || 0),
    risks: Number(selectedEventPlannerTabSeed?.risks || 0)
  };
  const activeTabGenerationMeta =
    selectedEventPlannerLastGeneratedByScope[eventDetailPlannerTab] ||
    selectedEventPlannerLastGeneratedByScope.all ||
    null;
  const activeTabGeneratedAtLabel = activeTabGenerationMeta?.generatedAt
    ? new Date(activeTabGenerationMeta.generatedAt).toLocaleString(language || undefined, {
      day: "2-digit",
      month: "2-digit",
      hour: "2-digit",
      minute: "2-digit"
    })
    : "";
  const activeTabVersionLabel = activeTabGenerationMeta?.version
    ? `v${activeTabGenerationMeta.version}`
    : selectedEventPlannerVariantSeed
      ? `v${selectedEventPlannerVariantSeed}`
      : "";
  const ambienceTimelineHighlights = (selectedEventHostPlaybook?.timeline || []).slice(0, 3);
  const plannerDressCodeKey = ["none", "casual", "elegant", "formal", "themed"].includes(
    String(selectedEventPlannerContextEffective?.dressCode || "")
  )
    ? String(selectedEventPlannerContextEffective?.dressCode)
    : "none";
  const plannerPlaylistModeKey = ["host_only", "collaborative", "spotify_collaborative"].includes(
    String(selectedEventPlannerContextEffective?.playlistMode || "")
  )
    ? String(selectedEventPlannerContextEffective?.playlistMode)
    : "host_only";
  const plannerContextChips = [
    {
      key: "moment",
      icon: "clock",
      focusField: "momentKey",
      label: `${t("event_planner_context_chip_moment")}: ${t(
        `event_planner_moment_${selectedEventPlannerContextEffective?.momentKey || "evening"}`
      )}`
    },
    {
      key: "budget",
      icon: "trend",
      focusField: "budgetKey",
      label: `${t("event_planner_context_chip_budget")}: ${t(
        `event_planner_budget_${selectedEventPlannerContextEffective?.budgetKey || "medium"}`
      )}`
    },
    {
      key: "plusOne",
      icon: "user",
      focusField: "allowPlusOne",
      label: `${t("event_planner_context_chip_plus_one")}: ${selectedEventPlannerContextEffective?.allowPlusOne ? t("status_yes") : t("status_no")
        }`
    },
    {
      key: "reminders",
      icon: "clock",
      focusField: "autoReminders",
      label: `${t("event_planner_context_chip_reminders")}: ${selectedEventPlannerContextEffective?.autoReminders ? t("status_yes") : t("status_no")
        }`
    },
    {
      key: "dressCode",
      icon: "sparkle",
      focusField: "dressCode",
      label: `${t("event_planner_context_chip_dress_code")}: ${t(`event_dress_code_${plannerDressCodeKey}`)}`
    },
    {
      key: "playlist",
      icon: "music",
      focusField: "playlistMode",
      label: `${t("event_planner_context_chip_playlist")}: ${t(`event_playlist_mode_${plannerPlaylistModeKey}`)}`
    }
  ];

  return (
    <article
      ref={eventPlannerSectionRef}
      className={`bg-white/50 dark:bg-gray-900/50 backdrop-blur-xl border border-black/10 dark:border-white/10 rounded-3xl shadow-sm p-4 md:p-6 lg:p-8 flex flex-col gap-6 ${standalone ? "w-full max-w-7xl mx-auto" : "w-full"}`}
    >
      {/* CABECERA DEL PLANNER */}
      <div className={`flex flex-col gap-4 ${standalone ? "border-b border-black/5 dark:border-white/10 pb-6" : ""}`}>

        {/* Título y Acciones Globales */}
        <div className="rounded-2xl bg-gradient-to-br from-blue-50/90 via-indigo-50/60 to-purple-50/90 dark:from-blue-950/30 dark:via-indigo-950/20 dark:to-purple-950/30 border border-blue-100/70 dark:border-blue-800/25 p-4 md:p-5 flex flex-col md:flex-row md:items-start justify-between gap-4">
          <div className="flex flex-col gap-2.5 min-w-0">
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex items-center gap-2.5">
                <span className="w-9 h-9 rounded-xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center shadow-md shadow-blue-200/60 dark:shadow-blue-900/50 shrink-0">
                  <Icon name="sparkle" className="w-4 h-4 text-white" />
                </span>
                <p className="text-xl md:text-2xl font-black bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 bg-clip-text text-transparent leading-tight">
                  {t("event_planner_title")}
                </p>
              </div>
              <span className="px-2.5 py-1 bg-gradient-to-r from-blue-500 to-purple-500 text-white rounded-lg text-[10px] font-bold uppercase tracking-wider shadow-sm">
                {t("event_planner_ai_badge")}
              </span>
            </div>

            {standalone ? (
              <p className="text-xl font-black text-gray-900 dark:text-white truncate">{selectedEventTitle}</p>
            ) : (
              <p className="text-xs text-gray-500 dark:text-gray-400">{t("event_planner_hint")}</p>
            )}

            <div className="flex flex-wrap gap-1">
              {plannerTabs.map((tab) => (
                <span key={tab.key} className="px-1.5 py-0.5 bg-white/80 dark:bg-white/10 text-indigo-700 dark:text-indigo-300 rounded-full text-[9px] font-bold border border-indigo-100 dark:border-indigo-700/30 shadow-sm">
                  {tab.label}
                </span>
              ))}
            </div>

            <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-[11px] font-medium text-gray-500 dark:text-gray-400 mt-0.5">
              <span className="flex items-center gap-1.5"><Icon name="calendar" className="w-3.5 h-3.5" />{selectedEventDateLabel}</span>
              <span className="flex items-center gap-1.5"><Icon name="clock" className="w-3.5 h-3.5" />{selectedEventTimeLabel}</span>
              <span className="flex items-center gap-1.5"><Icon name="location" className="w-3.5 h-3.5" /><span className="truncate max-w-[200px]">{selectedEventPlaceLabel}</span></span>
            </div>
          </div>

          <div className="flex flex-wrap sm:flex-nowrap items-center gap-2 shrink-0 w-full sm:w-auto mt-1 sm:mt-0">
            <button className="flex-1 sm:flex-none bg-white/80 hover:bg-white dark:bg-gray-800/80 dark:hover:bg-gray-700 text-gray-800 dark:text-gray-200 border border-black/10 dark:border-white/10 font-bold py-2 sm:py-2.5 px-3 sm:px-4 rounded-xl transition-all text-[10px] sm:text-xs shadow-sm flex items-center justify-center gap-1.5 disabled:opacity-50" type="button" onClick={handleOpenEventPlannerContext} disabled={isGenerating}>
              <Icon name="edit" className="w-3.5 h-3.5" />
              <span>{t("event_planner_action_context")}</span>
            </button>
            <button className="flex-1 sm:flex-none bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white border-0 font-bold py-2 sm:py-2.5 px-3 sm:px-4 rounded-xl transition-all text-[10px] sm:text-xs shadow-md shadow-blue-200/50 dark:shadow-blue-900/40 flex items-center justify-center gap-1.5 disabled:opacity-50" type="button" onClick={() => handleRegenerateEventPlanner("all")} disabled={isGenerating}>
              <Icon name="sparkle" className="w-3.5 h-3.5" />
              <span>{isGeneratingAll ? t("event_planner_generating_all") : t("event_planner_action_regenerate")}</span>
            </button>
          </div>
        </div>

        {/* Resumen del Contexto / Ajustes Rápidos */}
        <details className="bg-white/40 dark:bg-black/20 rounded-xl border border-black/5 dark:border-white/5 p-4 shadow-sm group" aria-label={t("event_settings_title")}>
          <summary className="flex items-center gap-2 text-xs font-bold text-gray-900 dark:text-white cursor-pointer outline-none marker:text-gray-400">
            <Icon name="settings" className="w-4 h-4 text-gray-500" />
            {t("event_planner_quick_settings_label")}
          </summary>
          <div className="flex flex-col gap-3 mt-3 pt-3 border-t border-black/5 dark:border-white/10">
            <p className="text-[10px] uppercase tracking-wider font-bold text-gray-500">{t("event_planner_quick_settings_hint")}</p>
            <div className="flex flex-wrap gap-2">
              {plannerContextChips.map((chip) => (
                <button
                  key={chip.key}
                  type="button"
                  className="px-2.5 py-1.5 bg-white hover:bg-gray-50 dark:bg-gray-800 dark:hover:bg-gray-700 border border-black/10 dark:border-white/10 rounded-lg text-[10px] font-bold text-gray-700 dark:text-gray-300 shadow-sm transition-colors flex items-center gap-1.5 disabled:opacity-50"
                  onClick={() => handleOpenEventPlannerContext(chip.focusField)}
                  disabled={isGenerating}
                >
                  <Icon name={chip.icon} className="w-3 h-3 text-gray-400 dark:text-gray-500" />
                  {chip.label}
                </button>
              ))}
            </div>
            {!standalone ? (
              <p className="text-[11px] text-gray-500 dark:text-gray-400 italic">
                {interpolateText(t("event_planner_context_applied"), {
                  value: selectedEventMealPlan.contextSummary || selectedEventPlannerContextEffective.summary
                })}
              </p>
            ) : null}
          </div>
        </details>

        {/* Control de Versiones */}
        <div className="flex flex-wrap items-center justify-between gap-4 text-[10px] font-bold uppercase tracking-wider text-gray-500">
          {selectedEventPlannerSavedLabel ? (
            <span className="flex items-center gap-1.5">
              <Icon name="clock" className="w-3 h-3" />
              {selectedEventPlannerSavedLabel}
            </span>
          ) : <span />}

          {selectedEventPlannerSnapshotHistory.length > 1 ? (
            <div className="flex items-center gap-2">
              <span>{t("event_planner_versions_label")} ({selectedEventPlannerSnapshotHistory.length}):</span>
              <select
                className="bg-white/70 dark:bg-black/40 border border-black/10 dark:border-white/10 rounded-lg px-2 py-1 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500/30 outline-none cursor-pointer"
                value={selectedPlannerVersionValue}
                onChange={(event) => handleRestoreEventPlannerSnapshot(event.target.value)}
                disabled={isGenerating}
              >
                {selectedEventPlannerSnapshotHistory.map((entry) => (
                  <option key={`planner-version-${entry.version}`} value={String(entry.version)}>
                    {interpolateText(t("event_planner_version_option"), {
                      version: entry.version,
                      date: entry.generatedAt ? new Date(entry.generatedAt).toLocaleString() : "-"
                    })}
                  </option>
                ))}
              </select>
            </div>
          ) : null}
        </div>
      </div>

      {/* PESTAÑAS PRINCIPALES DEL PLANNER (STICKY) */}
      <div className="sticky top-[70px] lg:top-[80px] z-30 bg-gray-50/90 dark:bg-gray-900/90 backdrop-blur-xl border border-black/10 dark:border-white/10 rounded-2xl shadow-sm p-3 sm:p-4 flex flex-col gap-2.5 mb-4 mt-2">
        {eventDetailPlannerTab !== "overview" ? (
          <div className="flex justify-end">
            <button
              className="flex bg-purple-50 hover:bg-purple-100 text-purple-700 dark:bg-purple-900/20 dark:hover:bg-purple-900/40 dark:text-purple-300 border border-purple-200 dark:border-purple-800/30 font-bold py-1.5 px-3 rounded-xl transition-all text-[10px] shadow-sm items-center gap-1.5 disabled:opacity-50"
              type="button"
              onClick={handleRegenerateCurrentTabClick}
              disabled={isGenerating}
            >
              <Icon name="sparkle" className="w-3 h-3" />
              {isGeneratingCurrentTab ? t("event_planner_generating_tab") : t("event_planner_action_regenerate_tab")}
            </button>
          </div>
        ) : null}

        <div className="flex flex-wrap gap-2" role="tablist" aria-label={t("event_planner_title")}>
          {plannerTabs.map((tabItem) => {
            const isActive = eventDetailPlannerTab === tabItem.key;
            const hasVersion = Number(tabRounds[tabItem.key] || 0) > 0;
            const isTabGenerating = isGeneratingCurrentTab && isActive;
            return (
              <button
                key={tabItem.key}
                type="button"
                role="tab"
                aria-selected={isActive}
                className={`relative px-4 py-2 rounded-full text-xs font-bold transition-all shadow-sm border ${isActive ? "bg-gray-800 dark:bg-white text-white dark:text-gray-900 border-gray-900 dark:border-white" : "bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 border-black/5 dark:border-white/10 hover:bg-gray-50 dark:hover:bg-gray-700"} ${isTabGenerating ? "opacity-50 animate-pulse" : ""}`}
                onClick={() => handleEventPlannerTabChange(tabItem.key)}
              >
                <span className="flex items-center gap-1.5">
                  {tabItem.label}
                  {hasVersion ? <span className={`px-1.5 py-0.5 rounded-md text-[9px] ${isActive ? "bg-white/20 dark:bg-black/20" : "bg-black/5 dark:bg-white/10"}`}>v{tabRounds[tabItem.key]}</span> : null}
                </span>
              </button>
            );
          })}
        </div>

        {activeTabVersionLabel || activeTabGeneratedAtLabel ? (
          <p className="text-[10px] font-medium text-gray-500 uppercase tracking-wider flex items-center gap-1.5 ml-1 pt-1.5 border-t border-black/5 dark:border-white/10">
            <Icon name="clock" className="w-3 h-3" />
            {t("event_planner_versions_label")}: {[activeTabVersionLabel, activeTabGeneratedAtLabel].filter(Boolean).join(" · ")}
          </p>
        ) : null}
      </div>

      <InlineMessage text={eventPlannerMessage} />

      {/* CONTENIDO DE LAS PESTAÑAS */}
      <div className="bg-white/40 dark:bg-black/20 rounded-2xl border border-black/5 dark:border-white/5 p-4 md:p-6 shadow-inner min-h-[300px]">

        {/* --- TAB: OVERVIEW --- */}
        {eventDetailPlannerTab === "overview" ? (
          <div className="flex flex-col gap-5">
            <PlanContextHeader
              t={t}
              interpolateText={interpolateText}
              isProfessional={isProfessional}
              selectedEventDetailStatusCounts={selectedEventDetailStatusCounts}
              selectedEventDietTypesCount={selectedEventDietTypesCount}
              selectedEventRestrictionsCount={selectedEventRestrictionsCount}
              selectedEventMealPlan={selectedEventMealPlan}
              selectedEventHostPlaybook={selectedEventHostPlaybook}
            />

            {selectedEventHealthRestrictionHighlights.length > 0 ? (
              <div className="bg-red-50/80 dark:bg-red-900/20 rounded-2xl border border-red-200 dark:border-red-800/30 p-5 shadow-sm">
                <p className="text-sm font-bold text-red-800 dark:text-red-300 flex items-center gap-2 mb-2">
                  <Icon name="shield" className="w-4 h-4" />
                  {t("event_planner_alert_title")}
                </p>
                <p className="text-xs text-red-700/90 dark:text-red-300/80 mb-3">
                  {interpolateText(t("event_planner_alert_hint"), {
                    count: selectedEventRestrictionsCount,
                    items: selectedEventHealthRestrictionHighlights.join(", ")
                  })}
                </p>
                <div className="flex flex-col gap-1 mb-3">
                  {selectedEventIntolerancesCount > 0 ? <p className="text-[11px] text-red-700/80 dark:text-red-400/80">• {interpolateText(t("event_planner_alert_intolerances"), { count: selectedEventIntolerancesCount })}</p> : null}
                  {selectedEventMedicalConditionsCount > 0 ? <p className="text-[11px] text-red-700/80 dark:text-red-400/80">• {interpolateText(t("event_planner_alert_medical_conditions"), { count: selectedEventMedicalConditionsCount })}</p> : null}
                  {selectedEventDietaryMedicalRestrictionsCount > 0 ? <p className="text-[11px] text-red-700/80 dark:text-red-400/80">• {interpolateText(t("event_planner_alert_dietary_medical_restrictions"), { count: selectedEventDietaryMedicalRestrictionsCount })}</p> : null}
                </div>
                <p className="text-[10px] font-bold uppercase tracking-wider text-red-800 dark:text-red-400 mb-2">
                  {interpolateText(t("event_planner_alert_scope_breakdown"), {
                    confirmed: selectedEventHealthAlertsConfirmedCount,
                    pending: selectedEventHealthAlertsPendingCount
                  })}
                </p>
                <div className="flex flex-wrap gap-2">
                  <span className="px-2 py-0.5 bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300 rounded-md text-[10px] font-bold">
                    {t("event_planner_stat_allergies")}: {selectedEventAllergiesCount}
                  </span>
                  <span className="px-2 py-0.5 bg-orange-100 text-orange-800 dark:bg-orange-900/40 dark:text-orange-300 rounded-md text-[10px] font-bold">
                    {t("field_intolerances")}: {selectedEventIntolerancesCount}
                  </span>
                  <span className="px-2 py-0.5 bg-yellow-100 text-yellow-800 dark:bg-yellow-900/40 dark:text-yellow-300 rounded-md text-[10px] font-bold">
                    {t("field_medical_conditions")}: {selectedEventMedicalConditionsCount}
                  </span>
                  <span className="px-2 py-0.5 bg-purple-100 text-purple-800 dark:bg-purple-900/40 dark:text-purple-300 rounded-md text-[10px] font-bold">
                    {t("field_dietary_medical_restrictions")}: {selectedEventDietaryMedicalRestrictionsCount}
                  </span>
                </div>
              </div>
            ) : null}

            <PlanGuestSignalsBlock
              t={t}
              interpolateText={interpolateText}
              selectedEventDetailGuests={selectedEventDetailGuests}
              activeMods={activeMods}
            />
            <PlanTimelineHighlights
              t={t}
              timeline={selectedEventHostPlaybook?.timeline ?? []}
              handleEventPlannerTabChange={handleEventPlannerTabChange}
            />
            <PlanActionableCards
              t={t}
              interpolateText={interpolateText}
              ctas={selectedEventHostPlaybook?.ctas ?? []}
              handleEventPlannerTabChange={handleEventPlannerTabChange}
            />
          </div>

        /* --- TAB: MENU --- */
        ) : eventDetailPlannerTab === "menu" ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {selectedEventMealPlan.menuSections.map((sectionItem) => (
              <article key={sectionItem.id} className="bg-white/60 dark:bg-white/5 border border-black/5 dark:border-white/10 rounded-xl p-4 shadow-sm flex flex-col gap-3">
                <div className="flex items-start justify-between border-b border-black/5 dark:border-white/10 pb-2">
                  <p className="text-sm font-black text-gray-900 dark:text-white uppercase tracking-wide">{sectionItem.title}</p>
                </div>
                <ul className="flex flex-col gap-2.5">
                  {(sectionItem.items || []).map((item) => (
                    <li key={`${sectionItem.id}-${item}`} className="text-sm text-gray-700 dark:text-gray-300 flex items-start gap-2">
                      <span className="text-orange-400 mt-0.5 shrink-0">•</span>
                      <span className="leading-snug">{item}</span>
                    </li>
                  ))}
                </ul>
              </article>
            ))}
          </div>

          /* --- TAB: SHOPPING --- */
        ) : eventDetailPlannerTab === "shopping" ? (
          <div className="flex flex-col gap-6">

            {/* Header / Resumen Shopping */}
            <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 bg-white/60 dark:bg-white/5 p-4 rounded-xl border border-black/5 dark:border-white/10 shadow-sm">
              <div className="flex flex-col gap-2 w-full lg:w-1/2">
                <p className="text-xs font-bold text-gray-700 dark:text-gray-300">
                  {interpolateText(t("event_planner_summary_line"), {
                    ingredients: selectedEventShoppingTotalIngredients,
                    min: selectedEventEstimatedCostRange.min,
                    max: selectedEventEstimatedCostRange.max
                  })}
                </p>
                <div className="w-full bg-black/10 dark:bg-white/10 rounded-full h-2 overflow-hidden" aria-label={t("event_planner_shopping_progress_label")}>
                  <span
                    className={`h-full block rounded-full transition-all duration-500 ${selectedEventShoppingProgress >= 100 ? 'bg-green-500' : 'bg-blue-500'}`}
                    style={{ width: `${selectedEventShoppingProgress}%` }}
                  />
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-2 w-full lg:w-auto">
                <span className="px-2.5 py-1 bg-black/5 dark:bg-white/10 rounded-lg text-[10px] font-bold text-gray-700 dark:text-gray-300 mr-2">
                  {interpolateText(t("event_planner_shopping_items"), {
                    count: selectedEventShoppingItems.length,
                    checked: selectedEventShoppingCheckedSet.size
                  })}
                </span>
                <button className="bg-white hover:bg-gray-50 dark:bg-gray-800 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 border border-black/10 dark:border-white/10 font-bold py-1.5 px-3 rounded-lg transition-all text-[10px] uppercase tracking-wider shadow-sm flex items-center gap-1.5" type="button" onClick={handleCopySelectedEventShoppingChecklist}>
                  <Icon name="copy" className="w-3 h-3" />
                  {t("event_menu_shopping_copy_action")}
                </button>
                <button className="bg-white hover:bg-gray-50 dark:bg-gray-800 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 border border-black/10 dark:border-white/10 font-bold py-1.5 px-3 rounded-lg transition-all text-[10px] uppercase tracking-wider shadow-sm" type="button" onClick={handleMarkAllEventPlannerShoppingItems}>
                  {t("event_planner_shopping_select_all")}
                </button>
                <button className="bg-white hover:bg-gray-50 dark:bg-gray-800 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 border border-black/10 dark:border-white/10 font-bold py-1.5 px-3 rounded-lg transition-all text-[10px] uppercase tracking-wider shadow-sm" type="button" onClick={handleClearEventPlannerShoppingCheckedItems}>
                  {t("event_planner_shopping_clear_done")}
                </button>
                <button className="bg-white hover:bg-gray-50 dark:bg-gray-800 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 border border-black/10 dark:border-white/10 font-bold py-1.5 px-3 rounded-lg transition-all text-[10px] uppercase tracking-wider shadow-sm flex items-center gap-1.5" type="button" onClick={handleExportEventPlannerShoppingList}>
                  <Icon name="download" className="w-3 h-3" />
                  {t("event_planner_action_export")}
                </button>
              </div>
            </div>

            {/* Filtros */}
            <div className="flex flex-wrap gap-2" role="group" aria-label={t("event_planner_shopping_filter_label")}>
              <button className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all shadow-sm border ${eventPlannerShoppingFilter === "all" ? "bg-gray-800 dark:bg-white text-white dark:text-gray-900 border-gray-900 dark:border-white" : "bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 border-black/5 dark:border-white/10 hover:bg-gray-50 dark:hover:bg-gray-700"}`} type="button" onClick={() => setEventPlannerShoppingFilter("all")}>
                {interpolateText(t("event_planner_shopping_filter_all"), { count: selectedEventShoppingCounts.total })}
              </button>
              <button className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all shadow-sm border ${eventPlannerShoppingFilter === "pending" ? "bg-blue-600 text-white border-blue-700" : "bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 border-black/5 dark:border-white/10 hover:bg-gray-50 dark:hover:bg-gray-700"}`} type="button" onClick={() => setEventPlannerShoppingFilter("pending")}>
                {interpolateText(t("event_planner_shopping_filter_pending"), { count: selectedEventShoppingCounts.pending })}
              </button>
              <button className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all shadow-sm border ${eventPlannerShoppingFilter === "done" ? "bg-green-600 text-white border-green-700" : "bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 border-black/5 dark:border-white/10 hover:bg-gray-50 dark:hover:bg-gray-700"}`} type="button" onClick={() => setEventPlannerShoppingFilter("done")}>
                {interpolateText(t("event_planner_shopping_filter_done"), { count: selectedEventShoppingCounts.done })}
              </button>
            </div>

            {/* Lista de la compra */}
            {selectedEventShoppingGroupsFiltered.length > 0 ? (
              <div className="columns-1 md:columns-2 gap-6 space-y-6">
                {selectedEventShoppingGroupsFiltered.map((groupItem) => (
                  <div key={groupItem.id} className="break-inside-avoid bg-white/60 dark:bg-white/5 border border-black/5 dark:border-white/10 rounded-xl p-4 shadow-sm flex flex-col gap-3">
                    <p className="text-xs font-black text-gray-900 dark:text-white uppercase tracking-wider border-b border-black/5 dark:border-white/10 pb-2">{groupItem.title}</p>
                    {(groupItem.items || []).length > 0 ? (
                      <ul className="flex flex-col gap-2">
                        {groupItem.items.map((shoppingItem) => {
                          const isChecked = selectedEventShoppingCheckedSet.has(shoppingItem.id);
                          return (
                            <li
                              key={shoppingItem.id}
                              className={`flex items-start gap-3 p-2 rounded-lg transition-colors cursor-pointer hover:bg-white/50 dark:hover:bg-black/20 ${isChecked ? "opacity-60" : ""}`}
                              onClick={() => handleToggleEventPlannerShoppingItem(shoppingItem.id)}
                            >
                              {/* 1. Checkbox a la izquierda, bloqueado para que no se encoja */}
                              <div className="mt-0.5 shrink-0">
                                <input
                                  type="checkbox"
                                  className="w-4 h-4 text-blue-600 bg-white border-gray-300 rounded focus:ring-blue-500 focus:ring-2 dark:bg-gray-700 dark:border-gray-600 cursor-pointer pointer-events-none"
                                  checked={isChecked}
                                  readOnly
                                />
                              </div>

                              {/* 2. Contenedor principal en columna */}
                              <div className="flex flex-col flex-1 min-w-0 gap-1.5">

                                {/* Fila A: Nombre y Cantidad */}
                                <div className="flex flex-wrap items-start justify-between gap-x-3 gap-y-1">
                                  <span className={`text-sm font-medium transition-all leading-snug ${isChecked ? "text-gray-500 line-through" : "text-gray-800 dark:text-gray-200"}`}>
                                    {shoppingItem.name}
                                  </span>
                                  <span className="px-2 py-0.5 bg-black/5 dark:bg-white/10 rounded-md text-[10px] font-bold text-gray-600 dark:text-gray-300 whitespace-nowrap shrink-0 mt-0.5">
                                    {shoppingItem.quantity}
                                  </span>
                                </div>

                                {/* Fila B: Etiqueta roja de advertencia (Si existe) */}
                                {shoppingItem.warning ? (
                                  <div className="flex">
                                    <span className="px-2 py-0.5 bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 rounded-md text-[10px] font-bold leading-tight inline-block">
                                      {shoppingItem.warning}
                                    </span>
                                  </div>
                                ) : null}

                              </div>
                            </li>
                          );
                        })}
                      </ul>
                    ) : (
                      <p className="text-sm text-gray-400 italic p-2">{t("event_planner_shopping_empty")}</p>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-8 text-center bg-white/40 dark:bg-white/5 rounded-2xl border border-black/5 dark:border-white/10">
                <p className="text-sm text-gray-500 dark:text-gray-400 italic">{t("event_planner_shopping_empty_filtered")}</p>
              </div>
            )}
          </div>

          /* --- TAB: AMBIENCE --- */
        ) : eventDetailPlannerTab === "ambience" ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <article className="bg-white/60 dark:bg-white/5 border border-black/5 dark:border-white/10 rounded-xl p-5 shadow-sm flex flex-col gap-3">
              <div className="flex items-center justify-between border-b border-black/5 dark:border-white/10 pb-2">
                <p className="text-sm font-black text-gray-900 dark:text-white uppercase tracking-wide">{t("event_planner_host_actions_title")}</p>
                <span className="px-2.5 py-1 bg-green-50 text-green-700 dark:bg-green-900/20 dark:text-green-400 border border-green-200 dark:border-green-800/30 rounded-lg text-[9px] font-bold uppercase tracking-wider">
                  {interpolateText(t("event_planner_host_acceptance_rate"), { value: selectedEventHostPlaybook.acceptanceRate })}
                </span>
              </div>
              <ul className="flex flex-col gap-2.5 mt-1">
                {selectedEventHostPlaybook.actionableItems.map((item) => (
                  <li key={`host-action-${item}`} className="text-sm font-medium text-gray-700 dark:text-gray-300 flex items-start gap-2 bg-blue-50/50 dark:bg-blue-900/10 p-3 rounded-lg border border-blue-100/50 dark:border-blue-900/30">
                    <span className="text-blue-500 mt-0.5 shrink-0"><Icon name="check" className="w-3.5 h-3.5" /></span>
                    <span className="leading-snug">{item}</span>
                  </li>
                ))}
              </ul>
            </article>

            <article className="bg-white/60 dark:bg-white/5 border border-black/5 dark:border-white/10 rounded-xl p-5 shadow-sm flex flex-col gap-3">
              <p className="text-sm font-black text-gray-900 dark:text-white uppercase tracking-wide border-b border-black/5 dark:border-white/10 pb-2">{t("event_planner_host_ambience_title")}</p>
              <ul className="flex flex-col gap-2.5 mt-1">
                {selectedEventHostPlaybook.ambience.map((item) => (
                  <li key={`ambience-${item}`} className="text-sm text-gray-700 dark:text-gray-300 flex items-start gap-2">
                    <span className="text-yellow-500 mt-0.5 shrink-0">•</span>
                    <span className="leading-snug">{item}</span>
                  </li>
                ))}
              </ul>
            </article>

            <article className="bg-white/60 dark:bg-white/5 border border-black/5 dark:border-white/10 rounded-xl p-5 shadow-sm flex flex-col gap-3">
              <p className="text-sm font-black text-gray-900 dark:text-white uppercase tracking-wide border-b border-black/5 dark:border-white/10 pb-2">{t("event_planner_host_conversation_title")}</p>
              <ul className="flex flex-col gap-2.5 mt-1">
                {selectedEventHostPlaybook.conversation.map((item) => (
                  <li key={`conversation-${item}`} className="text-sm text-gray-700 dark:text-gray-300 flex items-start gap-2">
                    <span className="text-green-500 mt-0.5 shrink-0">•</span>
                    <span className="leading-snug">{item}</span>
                  </li>
                ))}
              </ul>
            </article>

            <article className="bg-white/60 dark:bg-white/5 border border-black/5 dark:border-white/10 rounded-xl p-5 shadow-sm flex flex-col gap-3">
              <p className="text-sm font-black text-gray-900 dark:text-white uppercase tracking-wide border-b border-black/5 dark:border-white/10 pb-2">{t("event_planner_host_timeline_title")}</p>
              <div className="relative pl-3 mt-1">
                <div className="absolute top-2 bottom-2 left-[11px] w-px bg-black/10 dark:bg-white/10"></div>
                <ul className="flex flex-col gap-4 relative z-10">
                  {ambienceTimelineHighlights.map((item) => (
                    <li key={`ambience-timeline-${item.id}`} className="flex gap-3 items-start">
                      <span className="w-2 h-2 rounded-full bg-purple-500 mt-1.5 ring-4 ring-white dark:ring-gray-800 shrink-0" />
                      <p className="text-sm text-gray-700 dark:text-gray-300 leading-snug">
                        <strong className="text-gray-900 dark:text-white mr-1">{item.title}:</strong>
                        {item.detail}
                      </p>
                    </li>
                  ))}
                </ul>
              </div>
            </article>
          </div>

          /* --- TAB: TIMINGS --- */
        ) : eventDetailPlannerTab === "timings" ? (
          <article className="bg-white/60 dark:bg-white/5 border border-black/5 dark:border-white/10 rounded-xl p-5 md:p-8 shadow-sm flex flex-col gap-6 max-w-3xl mx-auto">
            <p className="text-lg font-black text-gray-900 dark:text-white uppercase tracking-wide border-b border-black/5 dark:border-white/10 pb-3">{t("event_planner_host_timeline_title")}</p>
            <div className="relative pl-4 mt-2">
              <div className="absolute top-3 bottom-3 left-[19px] w-0.5 bg-gradient-to-b from-blue-300 via-purple-300 to-green-300 dark:from-blue-600 dark:via-purple-600 dark:to-green-600 opacity-50"></div>
              <ul className="flex flex-col gap-8 relative z-10">
                {selectedEventHostPlaybook.timeline.map((item, index) => {
                  const colors = ["bg-blue-500", "bg-purple-500", "bg-pink-500", "bg-green-500"];
                  const color = colors[index % colors.length];
                  return (
                    <li key={item.id} className="flex gap-5 items-start">
                      <span className={`w-3 h-3 rounded-full ${color} mt-1 ring-4 ring-white dark:ring-[#1E293B] shadow-sm shrink-0`} />
                      <div className="flex flex-col gap-1.5 bg-white/50 dark:bg-black/20 p-4 rounded-xl border border-black/5 dark:border-white/5 shadow-sm w-full">
                        <strong className="text-sm font-bold text-gray-900 dark:text-white uppercase tracking-wider">{item.title}</strong>
                        <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">{item.detail}</p>
                      </div>
                    </li>
                  );
                })}
              </ul>
            </div>
          </article>

          /* --- TAB: COMMUNICATION --- */
        ) : eventDetailPlannerTab === "communication" ? (
          <article className="bg-white/60 dark:bg-white/5 border border-black/5 dark:border-white/10 rounded-xl p-5 md:p-6 shadow-sm flex flex-col gap-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-black/5 dark:border-white/10 pb-4">
              <p className="text-lg font-black text-gray-900 dark:text-white uppercase tracking-wide">{t("event_planner_host_messages_title")}</p>
              <div className="flex flex-wrap gap-2">
                <button className="bg-white hover:bg-gray-50 dark:bg-gray-800 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-200 border border-black/10 dark:border-white/10 font-bold py-2 px-3 rounded-lg transition-all text-xs shadow-sm flex items-center gap-1.5" type="button" onClick={handleCopyEventPlannerMessages}>
                  <Icon name="mail" className="w-3.5 h-3.5" />
                  {t("event_planner_host_copy_messages")}
                </button>
                <button className="bg-white hover:bg-gray-50 dark:bg-gray-800 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-200 border border-black/10 dark:border-white/10 font-bold py-2 px-3 rounded-lg transition-all text-xs shadow-sm flex items-center gap-1.5" type="button" onClick={handleCopyEventPlannerPrompt}>
                  <Icon name="link" className="w-3.5 h-3.5" />
                  {t("event_planner_host_copy_prompt")}
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {selectedEventHostPlaybook.messages.map((item) => (
                <div key={item.id} className="bg-white/80 dark:bg-black/30 border border-black/5 dark:border-white/5 rounded-xl p-5 shadow-sm flex flex-col gap-3 relative">
                  <span className="absolute top-0 right-6 -mt-3 bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider shadow-sm border border-blue-200 dark:border-blue-700">
                    {item.title}
                  </span>
                  <div className="mt-2 text-sm text-gray-800 dark:text-gray-200 font-medium leading-relaxed whitespace-pre-wrap font-sans">
                    {item.text}
                  </div>
                </div>
              ))}
            </div>
          </article>

          /* --- TAB: RISKS --- */
        ) : (
          <article className="bg-white/60 dark:bg-white/5 border border-black/5 dark:border-white/10 rounded-xl p-5 md:p-6 shadow-sm flex flex-col gap-6 max-w-4xl mx-auto">
            <p className="text-lg font-black text-gray-900 dark:text-white uppercase tracking-wide border-b border-black/5 dark:border-white/10 pb-3">{t("event_planner_host_risks_title")}</p>
            <ul className="flex flex-col gap-3">
              {selectedEventHostPlaybook.risks.map((riskItem) => {
                // level semántica para riesgos:
                // "yes"     → riesgo confirmado, atención requerida  → ámbar
                // "maybe"   → riesgo posible, vigilar                → azul
                // "no"      → riesgo descartado, sin problema        → verde
                // "pending" → por evaluar                            → gris
                const level = String(riskItem.level || "").toLowerCase();
                const isConfirmed = level.includes("yes");
                const isPossible  = level.includes("maybe");
                const isDismissed = level.includes("no");

                const colorClasses = isConfirmed
                  ? "bg-amber-50/70 dark:bg-amber-900/15 border-amber-300 dark:border-amber-700/40 text-amber-900 dark:text-amber-300"
                  : isDismissed
                    ? "bg-green-50/50 dark:bg-green-900/10 border-green-200 dark:border-green-900/30 text-green-800 dark:text-green-300"
                    : isPossible
                      ? "bg-blue-50/50 dark:bg-blue-900/10 border-blue-200 dark:border-blue-900/30 text-blue-800 dark:text-blue-300"
                      : "bg-gray-50/70 dark:bg-white/5 border-gray-200 dark:border-white/10 text-gray-700 dark:text-gray-300";

                const iconName = isDismissed ? "check" : isConfirmed ? "shield" : "shield";

                return (
                  <li key={riskItem.id} className={`flex flex-col sm:flex-row sm:items-center gap-3 p-4 rounded-xl border shadow-sm ${colorClasses}`}>
                    <div className="flex items-center gap-2 w-full sm:w-1/3 shrink-0">
                      <Icon name={iconName} className="w-4 h-4" />
                      <strong className="text-sm font-bold uppercase tracking-wider">{riskItem.label}</strong>
                    </div>
                    <div className="w-full sm:w-2/3 text-sm font-medium opacity-90 leading-snug">
                      {riskItem.detail}
                    </div>
                  </li>
                );
              })}
            </ul>
          </article>
        )}
      </div>

    </article>
  );
}
