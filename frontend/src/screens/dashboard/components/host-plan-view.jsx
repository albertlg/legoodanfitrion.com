import { Icon } from "../../../components/icons";

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
  selectedEventPlannerGenerationState,
  handleOpenEventPlannerContext,
  handleRegenerateEventPlanner,
  eventDetailPlannerTab,
  handleExportEventPlannerShoppingList,
  selectedEventDetailStatusCounts,
  selectedEventDietTypesCount,
  selectedEventAllergiesCount,
  selectedEventCriticalRestrictions,
  selectedEventRestrictionsCount,
  selectedEventIntolerancesCount,
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
  handleCopyEventPlannerPrompt
}) {
  const isGenerating = Boolean(selectedEventPlannerGenerationState?.isGenerating);
  const generatingScope = String(selectedEventPlannerGenerationState?.scope || "");
  const isGeneratingAll = isGenerating && generatingScope === "all";
  const isGeneratingCurrentTab = isGenerating && generatingScope === eventDetailPlannerTab;
  const ambienceTimelineHighlights = (selectedEventHostPlaybook?.timeline || []).slice(0, 3);

  return (
    <article
      ref={eventPlannerSectionRef}
      className={`detail-card detail-card-wide detail-card-event-planner ${standalone ? "event-planner-screen" : ""}`}
    >
      <div className="event-planner-head">
        <div className="event-planner-head-title-block">
          <div className="event-planner-head-title-row">
            <p className="item-title">{t("event_planner_title")}</p>
            <div className="event-planner-head-title-tools">
              <span className="status-pill status-host-conversion-source-default">{t("event_planner_ai_badge")}</span>
              <button
                className="btn btn-ghost btn-sm btn-icon-only event-planner-context-icon-btn"
                type="button"
                onClick={handleOpenEventPlannerContext}
                disabled={isGenerating}
                aria-label={t("event_planner_action_context")}
                title={t("event_planner_action_context")}
              >
                <Icon name="edit" className="icon icon-sm" />
              </button>
            </div>
          </div>
          {standalone ? <p className="event-planner-event-title">{selectedEventTitle}</p> : <p className="field-help">{t("event_planner_hint")}</p>}
          <div className="detail-meta-inline event-planner-meta-inline">
            <span>
              <Icon name="calendar" className="icon icon-sm" />
              {selectedEventDateLabel}
            </span>
            <span>
              <Icon name="clock" className="icon icon-sm" />
              {selectedEventTimeLabel}
            </span>
            <span>
              <Icon name="location" className="icon icon-sm" />
              {selectedEventPlaceLabel}
            </span>
          </div>
          {!standalone ? (
            <p className="hint">
              {interpolateText(t("event_planner_context_applied"), {
                value: selectedEventMealPlan.contextSummary || selectedEventPlannerContextEffective.summary
              })}
            </p>
          ) : null}
          {selectedEventPlannerSavedLabel ? (
            <p className={`hint ${standalone ? "event-planner-saved-hint" : ""}`}>{selectedEventPlannerSavedLabel}</p>
          ) : null}
        </div>
        <div className="button-row event-planner-head-actions">
          <button className="btn btn-ghost btn-sm event-planner-context-btn" type="button" onClick={handleOpenEventPlannerContext} disabled={isGenerating}>
            <Icon name="edit" className="icon icon-sm" />
            {t("event_planner_action_context")}
          </button>
          <button
            className="btn btn-sm event-planner-action-all"
            type="button"
            onClick={() => handleRegenerateEventPlanner("all")}
            disabled={isGenerating}
          >
            <Icon name="sparkle" className="icon icon-sm" />
            {isGeneratingAll ? t("event_planner_generating_all") : t("event_planner_action_regenerate")}
          </button>
          <button className="btn btn-ghost btn-sm event-planner-action-export" type="button" onClick={handleExportEventPlannerShoppingList} disabled={isGenerating}>
            <Icon name="mail" className="icon icon-sm" />
            {t("event_planner_action_export")}
          </button>
        </div>
      </div>
      <div className="event-planner-stats">
        <article className="detail-kpi-card">
          <div className="event-planner-stat-head">
            <p className="item-meta">{t("event_planner_stat_confirmed")}</p>
            <Icon name="check" className="icon icon-sm" />
          </div>
          <p className="item-title">{selectedEventDetailStatusCounts.yes}</p>
          <p className="hint">{interpolateText(t("event_planner_stat_hint_confirmed"), { count: selectedEventDetailStatusCounts.pending })}</p>
        </article>
        <article className="detail-kpi-card">
          <div className="event-planner-stat-head">
            <p className="item-meta">{t("event_planner_stat_diets")}</p>
            <Icon name="user" className="icon icon-sm" />
          </div>
          <p className="item-title">{selectedEventDietTypesCount}</p>
          <p className="hint">{interpolateText(t("event_planner_stat_hint_diets"), { count: selectedEventDietTypesCount })}</p>
        </article>
        <article className="detail-kpi-card">
          <div className="event-planner-stat-head">
            <p className="item-meta">{t("event_planner_stat_allergies")}</p>
            <Icon name="x" className="icon icon-sm" />
          </div>
          <p className="item-title">{selectedEventAllergiesCount}</p>
          <p className="hint">{interpolateText(t("event_planner_stat_hint_allergies"), { count: selectedEventAllergiesCount })}</p>
        </article>
      </div>
      {selectedEventCriticalRestrictions.length > 0 ? (
        <div className="recommendation-card warning event-planner-alert">
          <p className="item-title">{t("event_planner_alert_title")}</p>
          <p className="item-meta">
            {interpolateText(t("event_planner_alert_hint"), {
              count: selectedEventRestrictionsCount,
              items: selectedEventCriticalRestrictions.join(", ")
            })}
          </p>
          {selectedEventIntolerancesCount > 0 ? (
            <p className="hint">{interpolateText(t("event_planner_alert_intolerances"), { count: selectedEventIntolerancesCount })}</p>
          ) : null}
        </div>
      ) : null}
      <div className="event-planner-tabs-row">
        <div className="list-filter-tabs list-filter-tabs-segmented event-planner-tabs" role="tablist" aria-label={t("event_planner_title")}>
          <button
            className={`list-filter-tab ${eventDetailPlannerTab === "menu" ? "active" : ""}`}
            type="button"
            role="tab"
            aria-selected={eventDetailPlannerTab === "menu"}
            onClick={() => handleEventPlannerTabChange("menu")}
          >
            {t("event_planner_tab_menu")}
          </button>
          <button
            className={`list-filter-tab ${eventDetailPlannerTab === "shopping" ? "active" : ""}`}
            type="button"
            role="tab"
            aria-selected={eventDetailPlannerTab === "shopping"}
            onClick={() => handleEventPlannerTabChange("shopping")}
          >
            {t("event_planner_tab_shopping")}
          </button>
          <button
            className={`list-filter-tab ${eventDetailPlannerTab === "ambience" ? "active" : ""}`}
            type="button"
            role="tab"
            aria-selected={eventDetailPlannerTab === "ambience"}
            onClick={() => handleEventPlannerTabChange("ambience")}
          >
            {t("event_planner_tab_ambience")}
          </button>
          <button
            className={`list-filter-tab ${eventDetailPlannerTab === "timings" ? "active" : ""}`}
            type="button"
            role="tab"
            aria-selected={eventDetailPlannerTab === "timings"}
            onClick={() => handleEventPlannerTabChange("timings")}
          >
            {t("event_planner_tab_timings")}
          </button>
          <button
            className={`list-filter-tab ${eventDetailPlannerTab === "communication" ? "active" : ""}`}
            type="button"
            role="tab"
            aria-selected={eventDetailPlannerTab === "communication"}
            onClick={() => handleEventPlannerTabChange("communication")}
          >
            {t("event_planner_tab_communication")}
          </button>
          <button
            className={`list-filter-tab ${eventDetailPlannerTab === "risks" ? "active" : ""}`}
            type="button"
            role="tab"
            aria-selected={eventDetailPlannerTab === "risks"}
            onClick={() => handleEventPlannerTabChange("risks")}
          >
            {t("event_planner_tab_risks")}
          </button>
        </div>
        <button
          className="btn btn-ghost btn-sm event-planner-tab-regen-btn"
          type="button"
          onClick={() => handleRegenerateEventPlanner(eventDetailPlannerTab)}
          disabled={isGenerating}
        >
          <Icon name="sparkle" className="icon icon-sm" />
          {isGeneratingCurrentTab ? t("event_planner_generating_tab") : t("event_planner_action_regenerate_tab")}
        </button>
      </div>
      {eventDetailPlannerTab === "menu" ? (
        <div className="event-planner-menu-grid">
          {selectedEventMealPlan.menuSections.map((sectionItem) => (
            <article key={sectionItem.id} className="event-planner-menu-card">
              <div className="event-planner-menu-card-head">
                <p className="item-title">{sectionItem.title}</p>
                <span className="status-pill status-host-conversion-source-default">{t("event_planner_ai_badge")}</span>
              </div>
              <ul className="list recommendation-list">
                {(sectionItem.items || []).map((item) => (
                  <li key={`${sectionItem.id}-${item}`}>{item}</li>
                ))}
              </ul>
            </article>
          ))}
        </div>
      ) : eventDetailPlannerTab === "shopping" ? (
        <div className="event-planner-shopping-stack">
          <div className="event-planner-shopping-summary">
            <div className="event-planner-shopping-summary-main">
              <p className="item-meta">
                {interpolateText(t("event_planner_summary_line"), {
                  ingredients: selectedEventShoppingTotalIngredients,
                  min: selectedEventEstimatedCostRange.min,
                  max: selectedEventEstimatedCostRange.max
                })}
              </p>
              <div
                className={`list-progress-track ${
                  selectedEventShoppingProgress >= 70
                    ? "progress-high"
                    : selectedEventShoppingProgress >= 35
                    ? "progress-medium"
                    : ""
                }`}
                aria-label={t("event_planner_shopping_progress_label")}
              >
                <span style={{ width: `${selectedEventShoppingProgress}%` }} />
              </div>
            </div>
            <div className="event-planner-shopping-actions">
              <span className="status-pill status-host-conversion-source-default">
                {interpolateText(t("event_planner_shopping_items"), {
                  count: selectedEventShoppingItems.length,
                  checked: selectedEventShoppingCheckedSet.size
                })}
              </span>
              <button className="btn btn-ghost btn-sm" type="button" onClick={handleCopySelectedEventShoppingChecklist}>
                {t("event_menu_shopping_copy_action")}
              </button>
              <button className="btn btn-ghost btn-sm" type="button" onClick={handleMarkAllEventPlannerShoppingItems}>
                {t("event_planner_shopping_select_all")}
              </button>
              <button className="btn btn-ghost btn-sm" type="button" onClick={handleClearEventPlannerShoppingCheckedItems}>
                {t("event_planner_shopping_clear_done")}
              </button>
            </div>
          </div>
          <div className="list-filter-tabs list-filter-tabs-segmented event-planner-shopping-filters" role="group" aria-label={t("event_planner_shopping_filter_label")}>
            <button className={`list-filter-tab ${eventPlannerShoppingFilter === "all" ? "active" : ""}`} type="button" onClick={() => setEventPlannerShoppingFilter("all")}>
              {interpolateText(t("event_planner_shopping_filter_all"), { count: selectedEventShoppingCounts.total })}
            </button>
            <button
              className={`list-filter-tab ${eventPlannerShoppingFilter === "pending" ? "active" : ""}`}
              type="button"
              onClick={() => setEventPlannerShoppingFilter("pending")}
            >
              {interpolateText(t("event_planner_shopping_filter_pending"), { count: selectedEventShoppingCounts.pending })}
            </button>
            <button className={`list-filter-tab ${eventPlannerShoppingFilter === "done" ? "active" : ""}`} type="button" onClick={() => setEventPlannerShoppingFilter("done")}>
              {interpolateText(t("event_planner_shopping_filter_done"), { count: selectedEventShoppingCounts.done })}
            </button>
          </div>
          {selectedEventShoppingGroupsFiltered.length > 0 ? (
            <ul className="list event-planner-shopping-table">
              {selectedEventShoppingGroupsFiltered.map((groupItem) => (
                <li key={groupItem.id} className="event-planner-shopping-table-group">
                  <p className="event-planner-shopping-table-group-title">{groupItem.title}</p>
                  {(groupItem.items || []).length > 0 ? (
                    <ul className="list event-planner-shopping-table-rows">
                      {groupItem.items.map((shoppingItem) => (
                        <li key={shoppingItem.id} className="event-planner-shopping-table-row">
                          <label className="event-planner-shopping-label">
                            <input
                              type="checkbox"
                              checked={selectedEventShoppingCheckedSet.has(shoppingItem.id)}
                              onChange={() => handleToggleEventPlannerShoppingItem(shoppingItem.id)}
                            />
                            <span>{shoppingItem.name}</span>
                          </label>
                          <div className="event-planner-shopping-meta">
                            <span className="status-pill status-maybe">{shoppingItem.quantity}</span>
                            {shoppingItem.warning ? <span className="status-pill status-no">{shoppingItem.warning}</span> : null}
                          </div>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="hint">{t("event_planner_shopping_empty")}</p>
                  )}
                </li>
              ))}
            </ul>
          ) : (
            <p className="hint">{t("event_planner_shopping_empty_filtered")}</p>
          )}
        </div>
      ) : eventDetailPlannerTab === "ambience" ? (
        <div className="event-planner-host-grid event-planner-host-grid-ambience">
          <article className="event-planner-host-card">
            <div className="event-planner-menu-card-head">
              <p className="item-title">{t("event_planner_host_actions_title")}</p>
              <span className="status-pill status-host-conversion-source-default">
                {interpolateText(t("event_planner_host_acceptance_rate"), {
                  value: selectedEventHostPlaybook.acceptanceRate
                })}
              </span>
            </div>
            <ul className="list recommendation-list">
              {selectedEventHostPlaybook.actionableItems.map((item) => (
                <li key={`host-action-${item}`}>{item}</li>
              ))}
            </ul>
          </article>
          <article className="event-planner-host-card">
            <p className="item-title">{t("event_planner_host_ambience_title")}</p>
            <ul className="list recommendation-list">
              {selectedEventHostPlaybook.ambience.map((item) => (
                <li key={`ambience-${item}`}>{item}</li>
              ))}
            </ul>
          </article>
          <article className="event-planner-host-card">
            <p className="item-title">{t("event_planner_host_conversation_title")}</p>
            <ul className="list recommendation-list">
              {selectedEventHostPlaybook.conversation.map((item) => (
                <li key={`conversation-${item}`}>{item}</li>
              ))}
            </ul>
          </article>
          <article className="event-planner-host-card">
            <p className="item-title">{t("event_planner_host_timeline_title")}</p>
            <ul className="list recommendation-list">
              {ambienceTimelineHighlights.map((item) => (
                <li key={`ambience-timeline-${item.id}`}>
                  <strong>{item.title}</strong> - {item.detail}
                </li>
              ))}
            </ul>
          </article>
        </div>
      ) : eventDetailPlannerTab === "timings" ? (
        <article className="event-planner-host-card event-planner-host-card-wide">
          <p className="item-title">{t("event_planner_host_timeline_title")}</p>
          <ul className="list recommendation-list">
            {selectedEventHostPlaybook.timeline.map((item) => (
              <li key={item.id}>
                <strong>{item.title}</strong> - {item.detail}
              </li>
            ))}
          </ul>
        </article>
      ) : eventDetailPlannerTab === "communication" ? (
        <article className="event-planner-host-card event-planner-host-card-wide">
          <div className="event-planner-host-card-head">
            <p className="item-title">{t("event_planner_host_messages_title")}</p>
            <div className="button-row">
              <button className="btn btn-ghost btn-sm" type="button" onClick={handleCopyEventPlannerMessages}>
                <Icon name="mail" className="icon icon-sm" />
                {t("event_planner_host_copy_messages")}
              </button>
              <button className="btn btn-ghost btn-sm" type="button" onClick={handleCopyEventPlannerPrompt}>
                <Icon name="link" className="icon icon-sm" />
                {t("event_planner_host_copy_prompt")}
              </button>
            </div>
          </div>
          <div className="event-planner-host-messages">
            {selectedEventHostPlaybook.messages.map((item) => (
              <article key={item.id} className="event-planner-host-message-item">
                <p className="item-meta">{item.title}</p>
                <p>{item.text}</p>
              </article>
            ))}
          </div>
        </article>
      ) : (
        <article className="event-planner-host-card event-planner-host-card-wide">
          <p className="item-title">{t("event_planner_host_risks_title")}</p>
          <ul className="list recommendation-list">
            {selectedEventHostPlaybook.risks.map((riskItem) => (
              <li key={riskItem.id}>
                <span className={`status-pill ${riskItem.level}`}>{riskItem.label}</span> {riskItem.detail}
              </li>
            ))}
          </ul>
        </article>
      )}
      <div className="event-planner-mobile-footer">
        <button className="btn btn-ghost btn-sm" type="button" onClick={() => handleRegenerateEventPlanner(eventDetailPlannerTab)} disabled={isGenerating}>
          <Icon name="sparkle" className="icon icon-sm" />
          {isGeneratingCurrentTab ? t("event_planner_generating_tab") : t("event_planner_action_regenerate_tab")}
        </button>
        <button className="btn btn-sm" type="button" onClick={handleExportEventPlannerShoppingList} disabled={isGenerating}>
          <Icon name="mail" className="icon icon-sm" />
          {t("event_planner_action_export")}
        </button>
      </div>
    </article>
  );
}
