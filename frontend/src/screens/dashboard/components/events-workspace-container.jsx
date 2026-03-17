import { Icon } from "../../../components/icons";
import { EventBuilderView, EventBuilderWizardView } from "./event-builder-view";
import { EventDetailView } from "./event-detail-view";
import { EventsListView } from "./events-list-view";
import { MagicCard } from "./ui/magic-card";

function EventsWorkspaceContainer(props) {
  const { routeEventsWorkspace, WORKSPACE_ITEMS, t, openWorkspace } = props;

  // 🎨 Paleta rotativa para que cada tarjeta tenga un aura distinta
  const magicColors = ["blue", "purple", "orange"];

  return (
    <section className="workspace-shell view-transition">
      {routeEventsWorkspace === "hub" ? (

        // 🚀 2. Aplicamos un grid de Tailwind perfecto para las MagicCards
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 p-4 md:p-8 w-full max-w-6xl mx-auto">
          {WORKSPACE_ITEMS.events
            .filter((item) => !["hub", "create", "plan"].includes(item.key))
            .map((workspaceItem, index) => (

              // 🚀 3. ¡Inyectamos el componente!
              <MagicCard
                key={workspaceItem.key}
                title={t(workspaceItem.labelKey)}
                subtitle={t(workspaceItem.descriptionKey)}
                icon={workspaceItem.icon}
                colorVariant={magicColors[index % magicColors.length]}
                onClick={() => openWorkspace("events", workspaceItem.key)}
              />

            ))}
        </div>

      ) : (
        <div key={`events-${routeEventsWorkspace}`} className="dashboard-grid single-section workspace-content">
          {routeEventsWorkspace === "create" ? (
            (!props.events || props.events.length === 0)
              ? <EventBuilderWizardView {...props} /> // Asistente para el primer evento
              : <EventBuilderView {...props} />       // Formulario avanzado para los siguientes
          ) : null}

          {routeEventsWorkspace === "latest" ? (
            <EventsListView
              {...props}
              eventsPageSizeDefault={props.EVENTS_PAGE_SIZE_DEFAULT}
              pageSizeOptions={props.PAGE_SIZE_OPTIONS}
            />
          ) : null}

          {routeEventsWorkspace === "detail" || routeEventsWorkspace === "plan" ? (
            <EventDetailView
              {...props}
              eventsWorkspace={routeEventsWorkspace}
              eventDetailPlannerTab={props.routeEventPlannerTab}
            />
          ) : null}

          {routeEventsWorkspace === "insights" ? (
            <section className="panel panel-wide">
              {props.events.length > 0 ? (
                <label>
                  <span className="label-title">{t("smart_hosting_event_select")}</span>
                  <select value={props.insightsEventId} onChange={(event) => props.setInsightsEventId(event.target.value)}>
                    {props.events.map((eventItem) => (
                      <option key={eventItem.id} value={eventItem.id}>
                        {eventItem.title}
                      </option>
                    ))}
                  </select>
                </label>
              ) : null}
              <p className="hint">
                {t("smart_hosting_scope_label")}:{" "}
                {props.eventInsights.scope === "event" ? t("smart_hosting_scope_event") : t("smart_hosting_scope_all")} -{" "}
                {t("smart_hosting_considered_guests")}: {props.eventInsights.consideredGuestsCount}
              </p>
              {props.eventInsights.hasData ? (
                <div className="stack-md">
                  <div className="insights-grid">
                    <article className="insight-card">
                      <p className="item-title">{t("smart_hosting_food")}</p>
                      <p className="item-meta">
                        {props.eventInsights.foodSuggestions.length > 0
                          ? props.eventInsights.foodSuggestions.join(", ")
                          : t("smart_hosting_no_data")}
                      </p>
                    </article>
                    <article className="insight-card">
                      <p className="item-title">{t("smart_hosting_drink")}</p>
                      <p className="item-meta">
                        {props.eventInsights.drinkSuggestions.length > 0
                          ? props.eventInsights.drinkSuggestions.join(", ")
                          : t("smart_hosting_no_data")}
                      </p>
                    </article>
                    <article className="insight-card">
                      <p className="item-title">{t("smart_hosting_avoid")}</p>
                      <p className="item-meta">
                        {props.eventInsights.avoidItems.length > 0
                          ? props.eventInsights.avoidItems.join(", ")
                          : t("smart_hosting_no_data")}
                      </p>
                    </article>
                    <article className="insight-card">
                      <p className="item-title">{t("smart_hosting_decor")}</p>
                      <p className="item-meta">
                        {props.eventInsights.decorColors.length > 0
                          ? props.eventInsights.decorColors.join(", ")
                          : t("smart_hosting_no_data")}
                      </p>
                    </article>
                    <article className="insight-card">
                      <p className="item-title">{t("smart_hosting_music")}</p>
                      <p className="item-meta">
                        {props.eventInsights.musicGenres.length > 0
                          ? props.eventInsights.musicGenres.join(", ")
                          : t("smart_hosting_no_data")}
                      </p>
                    </article>
                    <article className="insight-card">
                      <p className="item-title">{t("smart_hosting_icebreakers")}</p>
                      <p className="item-meta">
                        {props.eventInsights.icebreakers.length > 0
                          ? props.eventInsights.icebreakers.join(", ")
                          : t("smart_hosting_no_data")}
                      </p>
                    </article>
                    <article className="insight-card">
                      <p className="item-title">{t("smart_hosting_taboo")}</p>
                      <p className="item-meta">
                        {props.eventInsights.tabooTopics.length > 0
                          ? props.eventInsights.tabooTopics.join(", ")
                          : t("smart_hosting_no_data")}
                      </p>
                    </article>
                    <article className="insight-card">
                      <p className="item-title">{t("smart_hosting_timing")}</p>
                      <p className="item-meta">
                        {props.eventInsights.timingRecommendation === "start_with_buffer"
                          ? t("smart_hosting_timing_buffer")
                          : t("smart_hosting_timing_on_time")}
                      </p>
                    </article>
                  </div>
                  <article className="recommendation-card">
                    <p className="item-title">{t("smart_hosting_playbook_title")}</p>
                    <p className="field-help">{t("smart_hosting_playbook_hint")}</p>
                    {props.insightsPlaybookActions.length > 0 ? (
                      <ul className="list recommendation-list">
                        {props.insightsPlaybookActions.map((item, index) => (
                          <li key={`${index}-${item}`}>{item}</li>
                        ))}
                      </ul>
                    ) : (
                      <p className="hint">{t("smart_hosting_empty")}</p>
                    )}
                  </article>
                </div>
              ) : (
                <p className="hint">{t("smart_hosting_empty")}</p>
              )}
            </section>
          ) : null}
        </div>
      )}
    </section>
  );
}

export { EventsWorkspaceContainer };
