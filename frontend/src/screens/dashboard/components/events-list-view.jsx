import { createElement } from "react";
import { Icon } from "../../../components/icons";

export function EventsListView({
  t,
  eventSearch,
  setEventSearch,
  eventSort,
  setEventSort,
  eventPageSize,
  setEventPageSize,
  eventsPageSizeDefault,
  pageSizeOptions,
  eventStatusFilter,
  setEventStatusFilter,
  filteredEvents,
  pagedEvents,
  eventInvitationSummaryByEventId,
  openEventDetail,
  openEventPlanById,
  handleStartEditEvent,
  handleRequestDeleteEvent,
  isDeletingEventId,
  toCatalogLabel,
  formatDate,
  language,
  statusClass,
  statusText,
  eventPage,
  eventTotalPages,
  setEventPage,
  mapsStatus,
  mapsError,
  orderedEventMapPoints,
  GeoPointsMapPanel
}) {
  return (
    <section className="panel panel-list panel-events-latest">
      <div className="list-tools list-tools-events">
        <label className="list-tools-search">
          <span className="label-title">{t("search")}</span>
          <input
            type="search"
            value={eventSearch}
            onChange={(event) => setEventSearch(event.target.value)}
            placeholder={t("search_events_placeholder")}
          />
        </label>
        <div className="list-tools-secondary">
          <label>
            <span className="label-title">{t("sort_by")}</span>
            <select value={eventSort} onChange={(event) => setEventSort(event.target.value)}>
              <option value="created_desc">{t("sort_created_desc")}</option>
              <option value="created_asc">{t("sort_created_asc")}</option>
              <option value="start_asc">{t("sort_date_asc")}</option>
              <option value="start_desc">{t("sort_date_desc")}</option>
              <option value="title_asc">{t("sort_title_asc")}</option>
            </select>
          </label>
          <label>
            <span className="label-title">{t("pagination_items_per_page")}</span>
            <select value={eventPageSize} onChange={(event) => setEventPageSize(Number(event.target.value) || eventsPageSizeDefault)}>
              {pageSizeOptions.map((optionValue) => (
                <option key={optionValue} value={optionValue}>
                  {optionValue}
                </option>
              ))}
            </select>
          </label>
        </div>
      </div>
      <div className="list-filter-tabs list-filter-tabs-segmented" role="group" aria-label={t("filter_status")}>
        {[
          { key: "all", label: t("all_status") },
          { key: "published", label: t("status_published") },
          { key: "draft", label: t("status_draft") },
          { key: "completed", label: t("status_completed") },
          { key: "cancelled", label: t("status_cancelled") }
        ].map((statusOption) => (
          <button
            key={statusOption.key}
            className={`list-filter-tab ${eventStatusFilter === statusOption.key ? "active" : ""}`}
            type="button"
            aria-pressed={eventStatusFilter === statusOption.key}
            onClick={() => setEventStatusFilter(statusOption.key)}
          >
            {statusOption.label}
          </button>
        ))}
      </div>
      <p className="hint">
        {t("results_count")}: {filteredEvents.length}
      </p>
      {filteredEvents.length === 0 ? (
        <p>{t("no_events")}</p>
      ) : (
        <div className="list-table-shell">
          <div className="list-table-head list-table-head-events" aria-hidden="true">
            <span>{t("field_event")}</span>
            <span>{t("date")}</span>
            <span>{t("field_guest")}</span>
            <span>{t("status")}</span>
            <span>RSVP</span>
            <span>{t("actions_label")}</span>
          </div>
          <ul className="list list-table list-table-events">
            {pagedEvents.map((eventItem) => {
              const invitationSummary = eventInvitationSummaryByEventId[eventItem.id] || {
                total: 0,
                pending: 0,
                yes: 0,
                no: 0,
                maybe: 0,
                responded: 0,
                respondedRate: 0
              };
              const eventMapsUrl =
                eventItem.location_lat != null && eventItem.location_lng != null
                  ? `https://www.google.com/maps?q=${eventItem.location_lat},${eventItem.location_lng}`
                  : "";
              return (
                <li key={eventItem.id} className="list-table-row list-row-event">
                  <div className="cell-main">
                    <p className="item-title">
                      <button className="text-link-btn event-name-link" type="button" onClick={() => openEventDetail(eventItem.id)}>
                        {eventItem.title}
                      </button>
                    </p>
                    <p className="item-meta">
                      {eventItem.event_type ? toCatalogLabel("experience_type", eventItem.event_type, language) : "—"}
                    </p>
                    <p className="item-meta">{eventItem.location_name || eventItem.location_address || "—"}</p>
                  </div>
                  <p className="item-meta cell-event-date cell-meta">{formatDate(eventItem.start_at, language, t("no_date"))}</p>
                  <div className="cell-event-guests cell-extra">
                    <p className="item-title">{invitationSummary.total}</p>
                    <p className="item-meta">
                      {t("status_pending")}: {invitationSummary.pending}
                    </p>
                  </div>
                  <div className="cell-event-status cell-meta">
                    <span className={`status-pill ${statusClass(eventItem.status)}`}>{statusText(t, eventItem.status)}</span>
                  </div>
                  <div className="cell-event-rsvp cell-extra">
                    <div
                      className={`list-progress-track ${
                        invitationSummary.respondedRate >= 70
                          ? "progress-high"
                          : invitationSummary.respondedRate >= 35
                          ? "progress-medium"
                          : "progress-low"
                      }`}
                      role="progressbar"
                      aria-valuemin={0}
                      aria-valuemax={100}
                      aria-valuenow={invitationSummary.respondedRate}
                    >
                      <span style={{ width: `${invitationSummary.respondedRate}%` }} />
                    </div>
                    <p className="item-meta">
                      {invitationSummary.respondedRate}% · {invitationSummary.yes}/{invitationSummary.total}
                    </p>
                  </div>
                  <div className="list-mobile-quick-actions">
                    <button className="btn btn-sm" type="button" onClick={() => openEventDetail(eventItem.id)}>
                      <Icon name="eye" className="icon icon-sm" />
                      <span>{t("view_detail")}</span>
                    </button>
                    <button className="btn btn-ghost btn-sm" type="button" onClick={() => handleStartEditEvent(eventItem)}>
                      <Icon name="edit" className="icon icon-sm" />
                      <span>{t("edit_event")}</span>
                    </button>
                    <details className="list-actions-more list-actions-more-mobile">
                      <summary className="btn btn-ghost btn-sm btn-icon-only" aria-label={t("open_menu")} title={t("open_menu")}>
                        <Icon name="more_horizontal" className="icon icon-sm" />
                      </summary>
                      <div className="list-actions-more-menu" role="menu">
                        <button
                          className="btn btn-ghost btn-sm list-actions-more-item"
                          type="button"
                          onClick={() => openEventPlanById(eventItem.id, "ambience")}
                        >
                          <Icon name="sparkle" className="icon icon-sm" />
                          <span>{t("event_plan_cta_action")}</span>
                        </button>
                        {eventMapsUrl ? (
                          <a
                            className="btn btn-ghost btn-sm list-actions-more-item"
                            href={eventMapsUrl}
                            target="_blank"
                            rel="noreferrer"
                          >
                            <Icon name="location" className="icon icon-sm" />
                            <span>{t("map_open_external")}</span>
                          </a>
                        ) : null}
                        <button
                          className="btn btn-danger btn-sm list-actions-more-item"
                          type="button"
                          onClick={() => handleRequestDeleteEvent(eventItem)}
                          disabled={isDeletingEventId === eventItem.id}
                        >
                          <Icon name="x" className="icon icon-sm" />
                          <span>{isDeletingEventId === eventItem.id ? t("deleting") : t("delete_event")}</span>
                        </button>
                      </div>
                    </details>
                  </div>
                  <div className="button-row cell-actions list-row-actions list-row-actions-event">
                    <div className="list-row-actions-main">
                      <button
                        className="btn btn-ghost btn-sm btn-icon-only"
                        type="button"
                        onClick={() => openEventDetail(eventItem.id)}
                        aria-label={t("view_detail")}
                        title={t("view_detail")}
                      >
                        <Icon name="eye" className="icon icon-sm" />
                      </button>
                    </div>
                    <details className="list-actions-more">
                      <summary className="btn btn-ghost btn-sm btn-icon-only" aria-label={t("open_menu")} title={t("open_menu")}>
                        <Icon name="more_horizontal" className="icon icon-sm" />
                      </summary>
                      <div className="list-actions-more-menu" role="menu">
                        <button
                          className="btn btn-ghost btn-sm list-actions-more-item"
                          type="button"
                          onClick={() => openEventPlanById(eventItem.id, "ambience")}
                        >
                          <Icon name="sparkle" className="icon icon-sm" />
                          <span>{t("event_plan_cta_action")}</span>
                        </button>
                        <button className="btn btn-ghost btn-sm list-actions-more-item" type="button" onClick={() => handleStartEditEvent(eventItem)}>
                          <Icon name="edit" className="icon icon-sm" />
                          <span>{t("edit_event")}</span>
                        </button>
                        {eventMapsUrl ? (
                          <a
                            className="btn btn-ghost btn-sm list-actions-more-item"
                            href={eventMapsUrl}
                            target="_blank"
                            rel="noreferrer"
                          >
                            <Icon name="location" className="icon icon-sm" />
                            <span>{t("map_open_external")}</span>
                          </a>
                        ) : null}
                        <button
                          className="btn btn-danger btn-sm list-actions-more-item"
                          type="button"
                          onClick={() => handleRequestDeleteEvent(eventItem)}
                          disabled={isDeletingEventId === eventItem.id}
                        >
                          <Icon name="x" className="icon icon-sm" />
                          <span>{isDeletingEventId === eventItem.id ? t("deleting") : t("delete_event")}</span>
                        </button>
                      </div>
                    </details>
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      )}
      {filteredEvents.length > 0 ? (
        <div className="pagination-row">
          <p className="hint">
            {t("pagination_page")} {eventPage}/{eventTotalPages}
          </p>
          <div className="button-row">
            <button
              className="btn btn-ghost btn-sm"
              type="button"
              onClick={() => setEventPage((prev) => Math.max(1, prev - 1))}
              disabled={eventPage <= 1}
            >
              {t("pagination_prev")}
            </button>
            <button
              className="btn btn-ghost btn-sm"
              type="button"
              onClick={() => setEventPage((prev) => Math.min(eventTotalPages, prev + 1))}
              disabled={eventPage >= eventTotalPages}
            >
              {t("pagination_next")}
            </button>
          </div>
        </div>
      ) : null}
      {createElement(GeoPointsMapPanel, {
        mapsStatus,
        mapsError,
        points: orderedEventMapPoints,
        title: t("events_map_title"),
        hint: t("events_map_hint"),
        emptyText: t("events_map_empty"),
        openActionText: t("events_map_open_detail"),
        onOpenDetail: (eventId) => openEventDetail(eventId),
        t
      })}
    </section>
  );
}
