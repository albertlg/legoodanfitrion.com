import { useState } from "react"; // <-- Añadido el import de useState
import { Icon } from "../../../components/icons";
import { MagicCard } from "./ui/magic-card";

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
  eventStatusCounts,
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
  // eslint-disable-next-line no-unused-vars
  GeoPointsMapPanel,
  openWorkspace
}) {
  // 🟢 1. EL ESTADO DEL MENÚ AÑADIDO AQUÍ
  const [openDropdownId, setOpenDropdownId] = useState(null);

  const statusCounts = eventStatusCounts || {
    all: filteredEvents.length,
    published: 0,
    draft: 0,
    completed: 0,
    cancelled: 0
  };

  return (
    // 🚀 1. Contenedor principal con relative y overflow-hidden para contener las bolas de color
    <section className="relative w-full rounded-[2.5rem] border border-black/10 dark:border-white/10 shadow-2xl flex flex-col overflow-hidden group bg-gray-50 dark:bg-gray-900">

      {/* 🚀 2. LA MAGIA: Bolas de color giratorias en el fondo (visibles por el blur) */}
      <div className="absolute top-0 left-0 w-full h-64 overflow-hidden pointer-events-none opacity-40 dark:opacity-30 mix-blend-multiply dark:mix-blend-screen transition-opacity duration-700">
        <div
          className="absolute -top-10 -left-10 w-64 h-64 rounded-full bg-gradient-to-tr from-blue-400 to-purple-400 blur-3xl animate-spin"
          style={{ animationDuration: "15s" }}
        ></div>
        <div
          className="absolute top-20 right-10 w-48 h-48 rounded-full bg-gradient-to-tr from-orange-300 to-pink-400 blur-3xl animate-spin"
          style={{ animationDuration: "20s", animationDirection: "reverse" }}
        ></div>
      </div>

      {/* 🚀 3. CAPA DE CRISTAL: El Glassmorphism que suaviza el fondo */}
      <div className="absolute inset-0 backdrop-blur-[60px] bg-white/60 dark:bg-black/40 z-0"></div>

      {/* 🚀 4. EL CONTENIDO REAL (Tu tabla): Lo ponemos en z-10 para que flote sobre el cristal */}
      <div className="relative z-10 flex flex-col w-full">

        {/* 1. TOOLBAR: Buscador y Ordenación */}
        <div className="flex flex-col md:flex-row gap-4 p-5 md:items-end justify-between border-b border-black/5 dark:border-white/10 bg-white/20 dark:bg-black/10 backdrop-blur-md">
          <label className="flex flex-col flex-1 max-w-sm">
            <span className="block text-[10px] font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-1.5">{t("search")}</span>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
                <Icon name="search" className="w-4 h-4" />
              </span>
              <input
                type="search"
                value={eventSearch}
                onChange={(event) => setEventSearch(event.target.value)}
                placeholder={t("search_events_placeholder")}
                className="w-full bg-white/5 dark:bg-black/20 border border-black/10 dark:border-white/10 rounded-xl pl-9 pr-4 py-2.5 text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500/20 transition-all"
              />
            </div>
          </label>

          <div className="flex flex-wrap gap-3 items-end">
            <label className="flex flex-col">
              <span className="block text-[10px] font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-1.5">{t("sort_by")}</span>
              <select
                value={eventSort}
                onChange={(event) => setEventSort(event.target.value)}
                className="w-full bg-white/5 dark:bg-black/20 border border-black/10 dark:border-white/10 rounded-xl px-4 py-2.5 text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500/20 transition-all appearance-none cursor-pointer"
              >
                <option value="created_desc">{t("sort_created_desc")}</option>
                <option value="created_asc">{t("sort_created_asc")}</option>
                <option value="start_asc">{t("sort_date_asc")}</option>
                <option value="start_desc">{t("sort_date_desc")}</option>
                <option value="title_asc">{t("sort_title_asc")}</option>
              </select>
            </label>
            <label className="flex flex-col">
              <span className="block text-[10px] font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-1.5">{t("pagination_items_per_page")}</span>
              <select
                value={eventPageSize}
                onChange={(event) => setEventPageSize(Number(event.target.value) || eventsPageSizeDefault)}
                className="w-full bg-white/5 dark:bg-black/20 border border-black/10 dark:border-white/10 rounded-xl px-4 py-2.5 text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500/20 transition-all appearance-none cursor-pointer"
              >
                {pageSizeOptions.map((optionValue) => (
                  <option key={optionValue} value={optionValue}>
                    {optionValue}
                  </option>
                ))}
              </select>
            </label>
          </div>
        </div>

        {/* 2. PESTAÑAS DE FILTRO */}
        <div className="flex flex-col px-5 py-4 border-b border-black/5 dark:border-white/10 bg-black/5 dark:bg-white/5 backdrop-blur-md">
          <div className="flex flex-wrap gap-2 items-center" role="group" aria-label={t("filter_status")}>
            {[
              { key: "all", label: t("all_status") },
              { key: "published", label: t("status_published") },
              { key: "draft", label: t("status_draft") },
              { key: "completed", label: t("status_completed") },
              { key: "cancelled", label: t("status_cancelled") }
            ].map((statusOption) => {
              const isActive = eventStatusFilter === statusOption.key;
              return (
                <button
                  key={statusOption.key}
                  className={isActive
                    ? "bg-gray-600 text-white px-3 py-1.5 rounded-lg text-xs font-medium transition-colors"
                    : "text-gray-600 dark:text-gray-400 hover:bg-black/5 dark:hover:bg-white/5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors"
                  }
                  type="button"
                  aria-pressed={isActive}
                  onClick={() => setEventStatusFilter(statusOption.key)}
                >
                  {statusOption.label} <span className="opacity-70 text-[10px] ml-1">({statusCounts[statusOption.key] || 0})</span>
                </button>
              );
            })}
          </div>

          <h3 className="text-xs font-bold uppercase tracking-wider text-gray-900 dark:text-white mt-6 mb-4">
            {t("results_count")}: {filteredEvents.length}
          </h3>
        </div>

        {/* 3. TABLA / LISTA */}
        <div className="flex flex-col relative">
          {filteredEvents.length === 0 ? (
            <div className="px-5 py-16 text-center flex flex-col items-center justify-center gap-2">
              <div className="w-12 h-12 rounded-full bg-black/5 dark:bg-white/5 flex items-center justify-center mb-2">
                <Icon name="calendar" className="w-6 h-6 text-gray-400" />
              </div>
              <p className="text-gray-500 font-medium">{t("no_events")}</p>
              <div className="mt-4">
                <button
                  className="px-5 py-2.5 bg-gray-900 hover:bg-black dark:bg-white dark:hover:bg-gray-100 text-white dark:text-gray-900 rounded-xl text-sm font-bold shadow-sm transition-all flex items-center gap-2"
                  type="button"
                  onClick={() => openWorkspace("events", "create")}
                >
                  <Icon name="plus" className="w-4 h-4" />
                  {t("quick_create_event")}
                </button>
              </div>
            </div>
          ) : (
            <div className="w-full">
              <div className="w-full">
                {/* 🟢 2. TABLA CON table-fixed Y PORCENTAJES EN TH */}
                <table className="w-full text-left border-collapse block md:table table-fixed">
                  <thead className="hidden md:table-header-group">
                    <tr>
                      <th className="w-[30%] py-4 px-4 text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400 border-b border-black/5 dark:border-white/10">{t("field_event")}</th>
                      <th className="w-[15%] py-4 px-4 text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400 border-b border-black/5 dark:border-white/10">{t("date")}</th>
                      <th className="w-[10%] py-4 px-4 text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400 border-b border-black/5 dark:border-white/10">{t("field_guest")}</th>
                      <th className="w-[15%] py-4 px-4 text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400 border-b border-black/5 dark:border-white/10">{t("status")}</th>
                      <th className="w-[20%] py-4 px-4 text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400 border-b border-black/5 dark:border-white/10">RSVP</th>
                      <th className="w-[10%] py-4 px-4 text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400 border-b border-black/5 dark:border-white/10 text-right">{t("actions_label")}</th>
                    </tr>
                  </thead>
                  <tbody className="block md:table-row-group divide-y-0 md:divide-y divide-black/5 dark:divide-white/5">
                    {pagedEvents.map((eventItem, index, array) => {
                      const isLastRows = index >= array.length - 3;
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
                        <tr key={eventItem.id} className="block md:table-row flex flex-col mb-4 md:mb-0 p-4 md:p-0 rounded-2xl md:rounded-none border border-black/10 dark:border-white/10 md:border-transparent md:border-b bg-white/40 dark:bg-white/5 md:bg-transparent shadow-sm md:shadow-none transition-colors group">

                          {/* Event Info (Truncado arreglado) */}
                          <td className="text-sm text-gray-900 dark:text-white align-middle block md:table-cell py-2 md:py-3 px-0 md:px-4 border-b border-black/5 dark:border-white/5 md:border-none last:border-0 overflow-hidden">
                            <div className="flex flex-col gap-1 w-full overflow-hidden">
                              <p className="font-bold text-[15px] text-gray-900 dark:text-white truncate block w-full">
                                <button className="hover:text-blue-600 dark:hover:text-blue-400 w-full text-left transition-colors focus:outline-none truncate block" type="button" onClick={() => openEventDetail(eventItem.id)} title={eventItem.title}>
                                  {eventItem.title}
                                </button>
                              </p>
                              <p className="text-xs text-gray-500 dark:text-gray-400 font-medium truncate w-full block" title={eventItem.event_type ? toCatalogLabel("experience_type", eventItem.event_type, language) : ""}>
                                {eventItem.event_type ? toCatalogLabel("experience_type", eventItem.event_type, language) : "—"}
                              </p>
                              <p className="text-xs text-gray-500 dark:text-gray-400 truncate w-full block" title={eventItem.location_name || eventItem.location_address || ""}>
                                {eventItem.location_name || eventItem.location_address || "—"}
                              </p>
                            </div>
                          </td>

                          {/* Date */}
                          <td className="text-sm text-gray-600 dark:text-gray-400 align-middle block md:table-cell py-2 md:py-3 px-0 md:px-4 border-b border-black/5 dark:border-white/5 md:border-none last:border-0 overflow-hidden">
                            <p className="text-sm font-medium text-gray-700 dark:text-gray-300 truncate w-full block">
                              {formatDate(eventItem.start_at, language, t("no_date"))}
                            </p>
                          </td>

                          {/* Guests */}
                          <td className="text-sm text-gray-900 dark:text-white align-middle block md:table-cell py-2 md:py-3 px-0 md:px-4 border-b border-black/5 dark:border-white/5 md:border-none last:border-0">
                            <div className="flex flex-col justify-center">
                              <p className="text-sm font-bold text-gray-900 dark:text-white">{invitationSummary.total}</p>
                              <p className="text-[10px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mt-0.5">
                                {t("status_pending")}: {invitationSummary.pending}
                              </p>
                            </div>
                          </td>

                          {/* Status */}
                          <td className="text-sm text-gray-900 dark:text-white align-middle block md:table-cell py-2 md:py-3 px-0 md:px-4 border-b border-black/5 dark:border-white/5 md:border-none last:border-0 overflow-hidden">
                            <span className={`${statusClass(eventItem.status)} truncate block max-w-max`} title={statusText(t, eventItem.status)}>{statusText(t, eventItem.status)}</span>
                          </td>

                          {/* RSVP Progress */}
                          <td className="text-sm text-gray-900 dark:text-white align-middle block md:table-cell py-2 md:py-3 px-0 md:px-4 border-b border-black/5 dark:border-white/5 md:border-none last:border-0 overflow-hidden">
                            <div className="flex flex-col justify-center gap-1.5 w-full pr-4">
                              <div className="w-full bg-black/10 dark:bg-white/10 rounded-full h-1.5">
                                <div
                                  className={`h-1.5 rounded-full shadow-sm ${invitationSummary.respondedRate >= 70
                                    ? "bg-green-500"
                                    : invitationSummary.respondedRate >= 35
                                      ? "bg-yellow-500"
                                      : "bg-red-500"
                                    }`}
                                  style={{ width: `${Math.max(3, invitationSummary.respondedRate)}%` }}
                                  role="progressbar"
                                  aria-valuemin={0}
                                  aria-valuemax={100}
                                  aria-valuenow={invitationSummary.respondedRate}
                                />
                              </div>
                              <p className="text-[10px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider truncate w-full block">
                                {invitationSummary.respondedRate}% · {invitationSummary.yes}/{invitationSummary.total}
                              </p>
                            </div>
                          </td>

                          {/* 🟢 3. ACCIONES CON MENÚ INTELIGENTE */}
                          <td className="align-middle block md:table-cell py-2 md:py-3 px-0 md:px-4 border-b border-black/5 dark:border-white/5 md:border-none last:border-0 relative">
                            <div className="flex items-center justify-end gap-1 w-full relative">
                              <button
                                className="p-2.5 text-gray-500 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 dark:hover:text-blue-400 rounded-lg transition-colors shrink-0"
                                type="button"
                                onClick={() => openEventDetail(eventItem.id)}
                                aria-label={t("view_detail")}
                                title={t("view_detail")}
                              >
                                <Icon name="eye" className="w-5 h-5" />
                              </button>

                              <div
                                className="relative shrink-0"
                                onMouseEnter={() => setOpenDropdownId(eventItem.id)}
                                onMouseLeave={() => setOpenDropdownId(null)}
                              >
                                <button
                                  className={`p-2.5 rounded-lg transition-colors focus:outline-none ${openDropdownId === eventItem.id ? "text-gray-900 bg-gray-200 dark:bg-gray-700 dark:text-white" : "text-gray-500 hover:text-gray-900 hover:bg-gray-100 dark:hover:bg-gray-800 dark:hover:text-white"}`}
                                  type="button"
                                  aria-label={t("open_menu")}
                                  title={t("actions_label")}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setOpenDropdownId(openDropdownId === eventItem.id ? null : eventItem.id);
                                  }}
                                >
                                  <Icon name="more_horizontal" className="w-4 h-4" />
                                </button>

                                {openDropdownId === eventItem.id && (
                                  <>
                                    <div
                                      className="fixed inset-0 z-[90] md:hidden"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setOpenDropdownId(null);
                                      }}
                                    ></div>

                                    <div
                                      className={`absolute left-auto right-0 w-56 bg-white/90 dark:bg-gray-800/95 backdrop-blur-xl border border-black/10 dark:border-white/10 rounded-xl shadow-2xl z-[100] py-1 ${isLastRows ? "bottom-full pb-2 origin-bottom-right" : "top-full pt-2 origin-top-right"}`}
                                      onClick={() => setOpenDropdownId(null)}
                                    >
                                      <button
                                        className="w-full flex items-center gap-3 px-3 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700/50 hover:text-gray-900 dark:hover:text-white text-left transition-colors"
                                        type="button"
                                        onClick={() => openEventPlanById(eventItem.id, "ambience")}
                                      >
                                        <Icon name="sparkle" className="w-4 h-4" />
                                        <span>{t("event_plan_cta_action")}</span>
                                      </button>
                                      <button
                                        className="w-full flex items-center gap-3 px-3 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700/50 hover:text-gray-900 dark:hover:text-white text-left transition-colors"
                                        type="button"
                                        onClick={() => handleStartEditEvent(eventItem)}
                                      >
                                        <Icon name="edit" className="w-4 h-4" />
                                        <span>{t("edit_event")}</span>
                                      </button>
                                      {eventMapsUrl ? (
                                        <a
                                          className="w-full flex items-center gap-3 px-3 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700/50 hover:text-gray-900 dark:hover:text-white text-left transition-colors"
                                          href={eventMapsUrl}
                                          target="_blank"
                                          rel="noreferrer"
                                        >
                                          <Icon name="location" className="w-4 h-4" />
                                          <span>{t("map_open_external")}</span>
                                        </a>
                                      ) : null}
                                      <div className="h-px bg-black/5 dark:bg-white/10 my-1 mx-3" />
                                      <button
                                        className="w-full flex items-center gap-3 px-3 py-2 text-sm font-bold text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 text-left transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                        type="button"
                                        onClick={() => handleRequestDeleteEvent(eventItem)}
                                        disabled={isDeletingEventId === eventItem.id}
                                      >
                                        <Icon name="x" className="w-4 h-4" />
                                        <span>{isDeletingEventId === eventItem.id ? t("deleting") : t("delete_event")}</span>
                                      </button>
                                    </div>
                                  </>
                                )}
                              </div>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        {/* Pagination */}
        {filteredEvents.length > 0 && (
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-5 border-t border-black/5 dark:border-white/10 bg-white/30 dark:bg-black/10 backdrop-blur-md">
            <p className="text-sm text-gray-500 dark:text-gray-400 font-medium">
              {t("pagination_page")} <span className="font-bold text-gray-900 dark:text-white">{eventPage}</span> / <span className="font-bold text-gray-900 dark:text-white">{eventTotalPages}</span>
            </p>
            <div className="flex items-center gap-2">
              <button
                className="px-4 py-2 text-sm font-bold text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 border border-black/10 dark:border-white/10 rounded-xl shadow-sm hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                type="button"
                onClick={() => setEventPage((prev) => Math.max(1, prev - 1))}
                disabled={eventPage <= 1}
              >
                {t("pagination_prev")}
              </button>
              <button
                className="px-4 py-2 text-sm font-bold text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 border border-black/10 dark:border-white/10 rounded-xl shadow-sm hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                type="button"
                onClick={() => setEventPage((prev) => Math.min(eventTotalPages, prev + 1))}
                disabled={eventPage >= eventTotalPages}
              >
                {t("pagination_next")}
              </button>
            </div>
          </div>
        )}

        {/* Map Panel */}
        <div className="border-t border-black/5 dark:border-white/10 p-5 bg-white/20 dark:bg-black/20">
          <GeoPointsMapPanel
            mapsStatus={mapsStatus}
            mapsError={mapsError}
            points={orderedEventMapPoints}
            title={t("events_map_title")}
            hint={t("events_map_hint")}
            emptyText={t("events_map_empty")}
            openActionText={t("events_map_open_detail")}
            onOpenDetail={(eventId) => openEventDetail(eventId)}
            t={t}
          />
        </div>
      </div>
    </section>
  );
}