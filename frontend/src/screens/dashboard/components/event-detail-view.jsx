import { Icon } from "../../../components/icons";
import { InlineMessage } from "../../../components/inline-message";
import { AvatarCircle } from "../../../components/avatar-circle";
import { HostPlanView } from "./host-plan-view";

const EVENT_COVER_FALLBACK_BY_TYPE = {
  bbq: "https://images.unsplash.com/photo-1529193591184-b1d58069ecdd?auto=format&fit=crop&w=1600&q=80",
  celebration: "https://images.unsplash.com/photo-1519671482749-fd09be7ccebf?auto=format&fit=crop&w=1600&q=80",
  party: "https://images.unsplash.com/photo-1492684223066-81342ee5ff30?auto=format&fit=crop&w=1600&q=80",
  romantic_date: "https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&w=1600&q=80",
  book_club: "https://images.unsplash.com/photo-1524995997946-a1c2e315a42f?auto=format&fit=crop&w=1600&q=80",
  meeting: "https://images.unsplash.com/photo-1552664730-d307ca884978?auto=format&fit=crop&w=1600&q=80",
  brunch: "https://images.unsplash.com/photo-1525351484163-7529414344d8?auto=format&fit=crop&w=1600&q=80",
  dinner: "https://images.unsplash.com/photo-1414235077428-338989a2e8c0?auto=format&fit=crop&w=1600&q=80",
  default: "https://images.unsplash.com/photo-1527529482837-4698179dc6ce?auto=format&fit=crop&w=1600&q=80"
};

function getFallbackEventCoverUrl(eventType) {
  const key = String(eventType || "")
    .trim()
    .toLowerCase();
  return EVENT_COVER_FALLBACK_BY_TYPE[key] || EVENT_COVER_FALLBACK_BY_TYPE.default;
}

function getEventPlaceLookupValue(eventItem) {
  if (!eventItem) {
    return "";
  }
  if (typeof eventItem.location_lat === "number" && typeof eventItem.location_lng === "number") {
    return `${eventItem.location_lat},${eventItem.location_lng}`;
  }
  return String(eventItem.location_address || eventItem.location_name || "").trim();
}

function buildSatelliteEmbedUrl(eventItem, zoom = 17) {
  const placeLookup = getEventPlaceLookupValue(eventItem);
  if (!placeLookup) {
    return "";
  }
  return `https://maps.google.com/maps?q=${encodeURIComponent(placeLookup)}&t=k&z=${zoom}&ie=UTF8&output=embed`;
}

function getEventCoverImageUrl(eventItem) {
  if (!eventItem) {
    return "";
  }
  const explicitCover = [eventItem.cover_image_url, eventItem.image_url, eventItem.header_image_url]
    .map((item) => String(item || "").trim())
    .find(Boolean);
  if (explicitCover) {
    return explicitCover;
  }
  return getFallbackEventCoverUrl(eventItem.event_type);
}

export function EventDetailView({
  eventsWorkspace,
  openWorkspace,
  handleBackToEventDetail,
  selectedEventDetail,
  t,
  statusClass,
  statusText,
  formatLongDate,
  language,
  formatTimeLabel,
  handleOpenEventPlan,
  handleStartEditEvent,
  selectedEventDetailPrimaryShare,
  openInvitationCreate,
  selectedEventDetailInvitations,
  selectedEventDetailStatusCounts,
  invitationMessage,
  toCatalogLabel,
  formatDate,
  normalizeEventDressCode,
  normalizeEventPlaylistMode,
  selectedEventChecklist,
  selectedEventHealthAlerts,
  selectedEventHealthAlertsConfirmedCount,
  selectedEventHealthAlertsPendingCount,
  eventPlannerSectionRef,
  interpolateText,
  selectedEventMealPlan,
  selectedEventPlannerContextEffective,
  selectedEventPlannerSavedLabel,
  selectedEventPlannerSnapshotVersion,
  selectedEventPlannerSnapshotHistory,
  selectedEventPlannerVariantSeed,
  selectedEventPlannerTabSeed,
  selectedEventPlannerLastGeneratedByScope,
  selectedEventPlannerGenerationState,
  handleOpenEventPlannerContext,
  handleRegenerateEventPlanner,
  handleRestoreEventPlannerSnapshot,
  eventDetailPlannerTab,
  handleExportEventPlannerShoppingList,
  selectedEventDietTypesCount,
  selectedEventAllergiesCount,
  selectedEventMedicalConditionsCount,
  selectedEventDietaryMedicalRestrictionsCount,
  selectedEventCriticalRestrictions,
  selectedEventHealthRestrictionHighlights,
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
  handleCopyEventPlannerPrompt,
  getMapEmbedUrl,
  getGuestAvatarUrl,
  selectedEventDetailGuests,
  openGuestDetail,
  handlePrepareInvitationShare,
  handleRequestDeleteInvitation,
  selectedEventRsvpTimeline
}) {
  const isPlanWorkspace = eventsWorkspace === "plan";
  const eventDateLabel = formatLongDate(selectedEventDetail?.start_at, language, t("no_date"));
  const eventTimeLabel = formatTimeLabel(selectedEventDetail?.start_at, language, t("no_date"));
  const eventPlaceLabel = selectedEventDetail?.location_name || selectedEventDetail?.location_address || "-";
  const eventMapsExternalUrl =
    typeof selectedEventDetail?.location_lat === "number" && typeof selectedEventDetail?.location_lng === "number"
      ? `https://www.google.com/maps?q=${selectedEventDetail.location_lat},${selectedEventDetail.location_lng}`
      : selectedEventDetail?.location_address
      ? `https://www.google.com/maps?q=${encodeURIComponent(selectedEventDetail.location_address)}`
      : "";
  const eventSatelliteEmbedUrl = buildSatelliteEmbedUrl(selectedEventDetail, 17);
  const eventSatelliteCoverEmbedUrl = buildSatelliteEmbedUrl(selectedEventDetail, 16);
  const eventCoverImageUrl = getEventCoverImageUrl(selectedEventDetail);
  const hasEventHeroCover = Boolean(selectedEventDetail && !isPlanWorkspace);

  return (
    <section className={`panel panel-wide detail-panel ${isPlanWorkspace ? "detail-panel-plan" : ""}`}>
      <div className="detail-breadcrumb detail-breadcrumb-row">
        <button className="btn btn-ghost btn-sm detail-breadcrumb-pill" type="button" onClick={() => openWorkspace("events", "latest")}>
          <Icon name="arrow_left" className="icon icon-sm" />
          {t("latest_events_title")}
        </button>
        {eventsWorkspace === "plan" ? (
          <>
            <span className="detail-breadcrumb-sep">/</span>
            <button className="text-link-btn breadcrumb-link" type="button" onClick={handleBackToEventDetail}>
              {selectedEventDetail?.title || t("event_detail_title")}
            </button>
            <span className="detail-breadcrumb-sep">/</span>
            <span>{t("event_planner_title")}</span>
          </>
        ) : null}
      </div>
      {selectedEventDetail && !isPlanWorkspace ? (
        <article className="event-detail-cover" aria-label={t("event_detail_cover_title")}>
          {eventSatelliteCoverEmbedUrl ? (
            <iframe
              title={interpolateText(t("event_detail_cover_alt"), { event: selectedEventDetail.title || t("field_event") })}
              src={eventSatelliteCoverEmbedUrl}
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
            />
          ) : (
            <img
              src={eventCoverImageUrl}
              alt={interpolateText(t("event_detail_cover_alt"), { event: selectedEventDetail.title || t("field_event") })}
              loading="lazy"
            />
          )}
          <div className="event-detail-cover-overlay">
            <div className="event-detail-cover-badges">
              <span className={`status-pill ${statusClass(selectedEventDetail.status)}`}>{statusText(t, selectedEventDetail.status)}</span>
              {selectedEventDetail.event_type ? (
                <span className="status-pill status-maybe">
                  {toCatalogLabel("experience_type", selectedEventDetail.event_type, language)}
                </span>
              ) : null}
            </div>
            <p className="event-detail-cover-title">{selectedEventDetail.title || t("event_detail_title")}</p>
            <div className="event-detail-cover-meta">
              <span>
                <Icon name="calendar" className="icon icon-xs" />
                {eventDateLabel}
              </span>
              <span>
                <Icon name="clock" className="icon icon-xs" />
                {eventTimeLabel}
              </span>
              <span>
                <Icon name="location" className="icon icon-xs" />
                {eventPlaceLabel}
              </span>
            </div>
          </div>
        </article>
      ) : null}
      {!isPlanWorkspace ? (
        <div className={`detail-head ${hasEventHeroCover ? "detail-head-event-actions" : "detail-head-rich"}`}>
          {!hasEventHeroCover ? (
            <div className="detail-head-primary">
              <div className="detail-head-title-row">
                <h2 className="section-title detail-title">{selectedEventDetail?.title || t("event_detail_title")}</h2>
                {selectedEventDetail ? (
                  <span className={`status-pill ${statusClass(selectedEventDetail.status)}`}>{statusText(t, selectedEventDetail.status)}</span>
                ) : null}
              </div>
              <div className="detail-meta-inline">
                <span>
                  <Icon name="calendar" className="icon icon-sm" />
                  {eventDateLabel}
                </span>
                <span>
                  <Icon name="clock" className="icon icon-sm" />
                  {eventTimeLabel}
                </span>
                <span>
                  <Icon name="location" className="icon icon-sm" />
                  {eventPlaceLabel}
                </span>
              </div>
            </div>
          ) : null}
          {selectedEventDetail ? (
            <div className="button-row detail-head-actions detail-head-actions-compact detail-head-actions-event">
              <button className="btn btn-ghost btn-sm" type="button" onClick={() => handleOpenEventPlan("ambience")}>
                <Icon name="sparkle" className="icon icon-sm" />
                {t("event_plan_cta_action")}
              </button>
              <button className="btn btn-ghost btn-sm" type="button" onClick={() => handleStartEditEvent(selectedEventDetail)}>
                <Icon name="edit" className="icon icon-sm" />
                {t("event_detail_edit_action")}
              </button>
              <details className="list-actions-more">
                <summary className="btn btn-ghost btn-sm btn-icon-only" aria-label={t("open_menu")} title={t("open_menu")}>
                  <Icon name="more_horizontal" className="icon icon-sm" />
                </summary>
                <div className="list-actions-more-menu" role="menu">
                  {selectedEventDetailPrimaryShare?.url ? (
                    <a
                      className="btn btn-ghost btn-sm list-actions-more-item"
                      href={selectedEventDetailPrimaryShare.url}
                      target="_blank"
                      rel="noreferrer"
                    >
                      <Icon name="mail" className="icon icon-sm" />
                      <span>{t("open_rsvp")}</span>
                    </a>
                  ) : (
                    <button
                      className="btn btn-ghost btn-sm list-actions-more-item"
                      type="button"
                      onClick={() =>
                        openInvitationCreate({
                          eventId: selectedEventDetail.id,
                          messageKey: "invitation_prefill_event"
                        })
                      }
                    >
                      <Icon name="mail" className="icon icon-sm" />
                      <span>{t("event_detail_create_invitation_action")}</span>
                    </button>
                  )}
                </div>
              </details>
            </div>
          ) : null}
        </div>
      ) : null}
      {selectedEventDetail && eventsWorkspace === "detail" ? (
        <div className="detail-kpi-row">
          <article className="detail-kpi-card">
            <p className="item-meta">{t("event_detail_total_invites")}</p>
            <p className="item-title">{selectedEventDetailInvitations.length}</p>
          </article>
          <article className="detail-kpi-card">
            <p className="item-meta">{t("status_yes")}</p>
            <p className="item-title">{selectedEventDetailStatusCounts.yes}</p>
          </article>
          <article className="detail-kpi-card">
            <p className="item-meta">{t("status_pending")}</p>
            <p className="item-title">{selectedEventDetailStatusCounts.pending}</p>
          </article>
          <article className="detail-kpi-card">
            <p className="item-meta">{t("status_no")}</p>
            <p className="item-title">{selectedEventDetailStatusCounts.no}</p>
          </article>
        </div>
      ) : null}
      <InlineMessage text={invitationMessage} />
      {!selectedEventDetail ? (
        <p className="hint">{t("event_detail_empty")}</p>
      ) : (
        <div className={`detail-layout detail-layout-event ${eventsWorkspace === "plan" ? "detail-layout-event-plan-only" : ""}`}>
          {eventsWorkspace === "detail" ? (
            <article className="detail-card detail-card-event-overview">
              {!hasEventHeroCover ? <p className="item-title">{selectedEventDetail.title}</p> : null}
              <p className="item-meta">
                {t("status")}: <span className={`status-pill ${statusClass(selectedEventDetail.status)}`}>{statusText(t, selectedEventDetail.status)}</span>
              </p>
              {selectedEventDetail.event_type ? (
                <p className="item-meta">
                  {t("field_event_type")}: {toCatalogLabel("experience_type", selectedEventDetail.event_type, language)}
                </p>
              ) : null}
              <p className="item-meta">
                {t("date")}: {formatDate(selectedEventDetail.start_at, language, t("no_date"))}
              </p>
              {selectedEventDetail.location_name ? <p className="item-meta">{t("field_place")}: {selectedEventDetail.location_name}</p> : null}
              {selectedEventDetail.location_address ? (
                <p className="item-meta">{t("field_address")}: {selectedEventDetail.location_address}</p>
              ) : null}
              {selectedEventDetail.description ? (
                <p className="item-meta">{t("field_event_description")}: {selectedEventDetail.description}</p>
              ) : null}
              <div className="detail-badge-row">
                <span className={`status-pill ${selectedEventDetail.allow_plus_one ? "status-yes" : "status-draft"}`}>
                  {t("event_setting_allow_plus_one")}: {selectedEventDetail.allow_plus_one ? t("status_yes") : t("status_no")}
                </span>
                <span className={`status-pill ${selectedEventDetail.auto_reminders ? "status-yes" : "status-draft"}`}>
                  {t("event_setting_auto_reminders")}: {selectedEventDetail.auto_reminders ? t("status_yes") : t("status_no")}
                </span>
                <span className="status-pill status-maybe">
                  {t("event_setting_dress_code")}: {t(`event_dress_code_${normalizeEventDressCode(selectedEventDetail.dress_code)}`)}
                </span>
                <span className="status-pill status-host-conversion-source-default">
                  {t("event_setting_playlist_mode")}: {t(`event_playlist_mode_${normalizeEventPlaylistMode(selectedEventDetail.playlist_mode)}`)}
                </span>
              </div>
              <div className="button-row">
                {selectedEventDetail.location_lat != null && selectedEventDetail.location_lng != null ? (
                  <a
                    className="btn btn-ghost btn-sm"
                    href={`https://www.google.com/maps?q=${selectedEventDetail.location_lat},${selectedEventDetail.location_lng}`}
                    target="_blank"
                    rel="noreferrer"
                  >
                    {t("map_open_external")}
                  </a>
                ) : null}
              </div>
            </article>
          ) : null}
          {eventsWorkspace === "detail" ? (
            <article className="detail-card detail-card-event-rsvp">
              <p className="item-title">{t("event_detail_rsvp_summary")}</p>
              <div className="detail-badge-row">
                <span className="status-pill status-pending">{t("status_pending")}: {selectedEventDetailStatusCounts.pending}</span>
                <span className="status-pill status-yes">{t("status_yes")}: {selectedEventDetailStatusCounts.yes}</span>
                <span className="status-pill status-no">{t("status_no")}: {selectedEventDetailStatusCounts.no}</span>
                <span className="status-pill status-maybe">{t("status_maybe")}: {selectedEventDetailStatusCounts.maybe}</span>
              </div>
              <p className="hint">
                {t("event_detail_total_invites")} {selectedEventDetailInvitations.length}
              </p>
              {selectedEventDetailInvitations.length === 0 ? <p className="hint">{t("event_detail_no_invites")}</p> : null}
            </article>
          ) : null}
          {eventsWorkspace === "detail" ? (
            <article className="detail-card detail-card-event-checklist">
              <p className="item-title">{t("event_detail_checklist_title")}</p>
              <ul className="checklist-list">
                {selectedEventChecklist.map((item) => (
                  <li key={item.key} className="checklist-item">
                    <span className={`status-pill ${item.done ? "status-yes" : "status-pending"}`}>
                      {item.done ? t("status_yes") : t("status_pending")}
                    </span>
                    <span>{item.label}</span>
                  </li>
                ))}
              </ul>
            </article>
          ) : null}
          {eventsWorkspace === "detail" ? (
            <article className="detail-card detail-card-event-alerts">
              <p className="item-title">{t("event_detail_alerts_title")}</p>
              <p className="item-meta">
                {t("status_yes")}: {selectedEventHealthAlertsConfirmedCount} · {t("status_pending")}:{" "}
                {selectedEventHealthAlertsPendingCount}
              </p>
              {selectedEventHealthAlerts.length > 0 ? (
                <ul className="list recommendation-list">
                  {selectedEventHealthAlerts.map((alertItem) => (
                    <li key={`${alertItem.guestName}-${alertItem.avoid.join("|")}`}>
                      <strong>{alertItem.guestName}:</strong> {alertItem.avoid.join(", ")}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="hint">{t("event_detail_alerts_empty")}</p>
              )}
            </article>
          ) : null}
          {eventsWorkspace === "detail" ? (
            <article className="detail-card detail-card-event-plan-cta">
              <div className="event-plan-cta">
                <div className="event-plan-cta-head">
                  <span className="event-plan-cta-title">
                    <Icon name="sparkle" className="icon icon-sm" />
                    {t("event_plan_cta_title")}
                  </span>
                  <span className="status-pill status-host-conversion-source-default">{t("event_planner_ai_badge")}</span>
                </div>
                <p className="item-meta">{t("event_plan_cta_hint")}</p>
                <button className="btn btn-sm" type="button" onClick={() => handleOpenEventPlan("ambience")}>
                  {t("event_plan_cta_action")}
                </button>
              </div>
            </article>
          ) : null}

          {eventsWorkspace === "plan" ? (
            <HostPlanView
              standalone
              selectedEventTitle={selectedEventDetail?.title || t("event_detail_title")}
              selectedEventDateLabel={eventDateLabel}
              selectedEventTimeLabel={eventTimeLabel}
              selectedEventPlaceLabel={eventPlaceLabel}
              eventPlannerSectionRef={eventPlannerSectionRef}
              t={t}
              interpolateText={interpolateText}
              selectedEventMealPlan={selectedEventMealPlan}
              selectedEventPlannerContextEffective={selectedEventPlannerContextEffective}
              selectedEventPlannerSavedLabel={selectedEventPlannerSavedLabel}
              selectedEventPlannerSnapshotVersion={selectedEventPlannerSnapshotVersion}
              selectedEventPlannerSnapshotHistory={selectedEventPlannerSnapshotHistory}
              selectedEventPlannerVariantSeed={selectedEventPlannerVariantSeed}
              selectedEventPlannerTabSeed={selectedEventPlannerTabSeed}
              selectedEventPlannerLastGeneratedByScope={selectedEventPlannerLastGeneratedByScope}
              selectedEventPlannerGenerationState={selectedEventPlannerGenerationState}
              language={language}
              handleOpenEventPlannerContext={handleOpenEventPlannerContext}
              handleRegenerateEventPlanner={handleRegenerateEventPlanner}
              handleRestoreEventPlannerSnapshot={handleRestoreEventPlannerSnapshot}
              eventDetailPlannerTab={eventDetailPlannerTab}
              handleExportEventPlannerShoppingList={handleExportEventPlannerShoppingList}
              selectedEventDetailStatusCounts={selectedEventDetailStatusCounts}
              selectedEventDietTypesCount={selectedEventDietTypesCount}
              selectedEventAllergiesCount={selectedEventAllergiesCount}
              selectedEventMedicalConditionsCount={selectedEventMedicalConditionsCount}
              selectedEventDietaryMedicalRestrictionsCount={selectedEventDietaryMedicalRestrictionsCount}
              selectedEventCriticalRestrictions={selectedEventCriticalRestrictions}
              selectedEventHealthRestrictionHighlights={selectedEventHealthRestrictionHighlights}
              selectedEventRestrictionsCount={selectedEventRestrictionsCount}
              selectedEventIntolerancesCount={selectedEventIntolerancesCount}
              selectedEventHealthAlertsConfirmedCount={selectedEventHealthAlertsConfirmedCount}
              selectedEventHealthAlertsPendingCount={selectedEventHealthAlertsPendingCount}
              handleEventPlannerTabChange={handleEventPlannerTabChange}
              selectedEventShoppingTotalIngredients={selectedEventShoppingTotalIngredients}
              selectedEventEstimatedCostRange={selectedEventEstimatedCostRange}
              selectedEventShoppingProgress={selectedEventShoppingProgress}
              selectedEventShoppingItems={selectedEventShoppingItems}
              selectedEventShoppingCheckedSet={selectedEventShoppingCheckedSet}
              handleCopySelectedEventShoppingChecklist={handleCopySelectedEventShoppingChecklist}
              handleMarkAllEventPlannerShoppingItems={handleMarkAllEventPlannerShoppingItems}
              handleClearEventPlannerShoppingCheckedItems={handleClearEventPlannerShoppingCheckedItems}
              eventPlannerShoppingFilter={eventPlannerShoppingFilter}
              setEventPlannerShoppingFilter={setEventPlannerShoppingFilter}
              selectedEventShoppingCounts={selectedEventShoppingCounts}
              selectedEventShoppingGroupsFiltered={selectedEventShoppingGroupsFiltered}
              handleToggleEventPlannerShoppingItem={handleToggleEventPlannerShoppingItem}
              selectedEventHostPlaybook={selectedEventHostPlaybook}
              handleCopyEventPlannerMessages={handleCopyEventPlannerMessages}
              handleCopyEventPlannerPrompt={handleCopyEventPlannerPrompt}
            />
          ) : null}

          {eventsWorkspace === "detail" ? (
            <article className="detail-card detail-card-map detail-card-event-location-photo">
              <p className="item-title">{t("event_detail_location_photo_title")}</p>
              <div className="event-location-photo" aria-label={t("event_detail_location_photo_title")}>
                {eventSatelliteEmbedUrl ? (
                  <iframe
                    title={interpolateText(t("event_detail_location_photo_alt"), { place: eventPlaceLabel })}
                    src={eventSatelliteEmbedUrl}
                    loading="lazy"
                    referrerPolicy="no-referrer-when-downgrade"
                  />
                ) : (
                  <img
                    src={eventCoverImageUrl}
                    alt={interpolateText(t("event_detail_location_photo_alt"), { place: eventPlaceLabel })}
                    loading="lazy"
                  />
                )}
              </div>
              <p className="item-meta">{eventPlaceLabel}</p>
              {eventMapsExternalUrl ? (
                <div className="button-row">
                  <a className="btn btn-ghost btn-sm" href={eventMapsExternalUrl} target="_blank" rel="noreferrer">
                    {t("map_open_external")}
                  </a>
                </div>
              ) : null}
            </article>
          ) : null}

          {eventsWorkspace === "detail" && typeof selectedEventDetail.location_lat === "number" && typeof selectedEventDetail.location_lng === "number" ? (
            <article className="detail-card detail-card-map detail-card-event-map">
              <p className="item-title">{t("map_preview_title")}</p>
              <div className="map-preview" aria-label={t("map_preview_title")}>
                <iframe
                  title={t("map_preview_title")}
                  src={getMapEmbedUrl(selectedEventDetail.location_lat, selectedEventDetail.location_lng)}
                  loading="lazy"
                  referrerPolicy="no-referrer-when-downgrade"
                />
              </div>
            </article>
          ) : null}

          {eventsWorkspace === "detail" ? (
            <article className="detail-card detail-card-wide detail-card-event-guests">
              <p className="item-title">{t("event_detail_guest_list_title")}</p>
              {selectedEventDetailGuests.length === 0 ? (
                <p className="hint">{t("event_detail_no_invites")}</p>
              ) : (
                <div className="detail-table-shell">
                  <div className="detail-table-head detail-table-head-event-guests" aria-hidden="true">
                    <span>{t("field_guest")}</span>
                    <span>{t("email")}</span>
                    <span>{t("status")}</span>
                    <span>+1</span>
                  </div>
                  <ul className="list detail-table-list detail-table-list-event-guests">
                    {selectedEventDetailGuests.map((row) => {
                      const itemLabel = `${selectedEventDetail.title || t("field_event")} - ${row.name || t("field_guest")}`;
                      const rowGuestLabel = row.name || t("field_guest");
                      return (
                        <li key={row.invitation.id} className="detail-table-row detail-table-row-event-guests">
                          <div className="cell-main list-title-with-avatar">
                            <AvatarCircle
                              className="list-avatar list-avatar-sm"
                              label={rowGuestLabel}
                              fallback="IN"
                              imageUrl={getGuestAvatarUrl(row.guest, rowGuestLabel)}
                              size={30}
                            />
                            <button
                              className="text-link-btn invitation-linked-name"
                              type="button"
                              onClick={() => openGuestDetail(row.guest?.id || row.invitation.guest_id)}
                            >
                              {rowGuestLabel}
                            </button>
                          </div>
                          <p className="item-meta cell-meta">{row.contact}</p>
                          <p className="item-meta cell-meta">
                            <span className={`status-pill ${statusClass(row.invitation.status)}`}>
                              {statusText(t, row.invitation.status)}
                            </span>
                          </p>
                          <div className="cell-meta detail-table-actions">
                            <span className="item-meta">-</span>
                            <button
                              className="btn btn-ghost btn-sm btn-icon-only"
                              type="button"
                              onClick={() => {
                                const prepared = handlePrepareInvitationShare(row.invitation);
                                if (prepared?.whatsappUrl) {
                                  window.open(prepared.whatsappUrl, "_blank", "noopener,noreferrer");
                                }
                              }}
                              aria-label={t("invitation_send_message_action")}
                              title={t("invitation_send_message_action")}
                            >
                              <Icon name="message" className="icon icon-sm" />
                            </button>
                            <button
                              className="btn btn-danger btn-sm btn-icon-only"
                              type="button"
                              onClick={() => handleRequestDeleteInvitation(row.invitation, itemLabel)}
                              aria-label={t("delete_invitation")}
                              title={t("delete_invitation")}
                            >
                              <Icon name="x" className="icon icon-sm" />
                            </button>
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              )}
            </article>
          ) : null}

          {eventsWorkspace === "detail" ? (
            <article className="detail-card detail-card-wide detail-card-event-activity">
              <p className="item-title">{t("recent_activity_title")}</p>
              {selectedEventRsvpTimeline.length === 0 ? (
                <p className="hint">{t("recent_activity_empty")}</p>
              ) : (
                <ul className="timeline-list">
                  {selectedEventRsvpTimeline.map((item) => (
                    <li key={item.id} className="timeline-item">
                      <span className={`timeline-dot ${statusClass(item.status)}`} />
                      <div className="timeline-content">
                        <p className="item-title">
                          {item.name} - <span className={`status-pill ${statusClass(item.status)}`}>{statusText(t, item.status)}</span>
                        </p>
                        <p className="item-meta">
                          {item.isResponse ? t("event_detail_timeline_response") : t("event_detail_timeline_sent")} - {" "}
                          {formatDate(item.date, language, t("no_date"))}
                        </p>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </article>
          ) : null}
        </div>
      )}
    </section>
  );
}
