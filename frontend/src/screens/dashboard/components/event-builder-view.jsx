import React from "react";
import { Icon } from "../../../components/icons";
import { FieldMeta } from "../../../components/field-meta";
import { InlineMessage } from "../../../components/inline-message";

export function EventBuilderView({
    t,
    timezone,
    handleSaveEvent,
    isSavingEvent,
    isEditingEvent,
    handleCancelEditEvent,
    eventTemplates,
    activeEventTemplateKey,
    handleApplyEventTemplate,
    eventTitle,
    setEventTitle,
    eventErrors,
    eventDescription,
    setEventDescription,
    eventType,
    setEventType,
    eventTypeOptions,
    eventStatus,
    setEventStatus,
    eventStartAt,
    setEventStartAt,
    eventEndAt,
    setEventEndAt,
    eventIsMultiDay,
    setEventIsMultiDay,
    eventSchedulingMode,
    setEventSchedulingMode,
    eventPollOptionDraft,
    setEventPollOptionDraft,
    eventPollOptions,
    handleAddEventPollOption,
    handleUpdateEventPollOption,
    handleRemoveEventPollOption,
    eventLocationName,
    setEventLocationName,
    eventLocationAddress,
    setEventLocationAddress,
    mapsStatus,
    mapsError,
    addressPredictions,
    isAddressLoading,
    handleSelectAddressPrediction,
    selectedPlace,
    getMapEmbedUrl,
    eventPhaseProgress,
    invitationCountForEditingEvent,
    editingEventId,
    eventAllowPlusOne,
    setEventAllowPlusOne,
    eventAutoReminders,
    setEventAutoReminders,
    eventDressCode,
    setEventDressCode,
    eventPlaylistMode,
    setEventPlaylistMode,
    eventBuilderPlaybookActions,
    handleApplySuggestedEventSettings,
    eventBuilderMealPlan,
    handleCopyEventBuilderShoppingChecklist,
    locationNameOptions,
    locationAddressOptions,
    eventMessage,
    eventHoneypotField,
    setEventHoneypotField
}) {
    return (
        <form className="bg-white/50 dark:bg-gray-900/50 backdrop-blur-xl border border-black/10 dark:border-white/10 rounded-3xl shadow-2xl p-5 md:p-8 flex flex-col xl:flex-row gap-8 w-full max-w-7xl mx-auto" onSubmit={handleSaveEvent} noValidate>
            <div className="absolute -left-[9999px] top-auto w-px h-px overflow-hidden" aria-hidden="true">
                <label htmlFor="event-website-field">Website</label>
                <input
                    id="event-website-field"
                    name="website"
                    type="text"
                    value={eventHoneypotField}
                    onChange={(event) => setEventHoneypotField(event.target.value)}
                    tabIndex={-1}
                    autoComplete="off"
                  />
            </div>

            {/* COLUMNA PRINCIPAL (IZQUIERDA) */}
            <div className="flex-1 flex flex-col gap-6 pb-24 xl:pb-0">

                {/* Plantillas */}
                <section className="bg-white/50 dark:bg-white/5 rounded-2xl border border-black/5 dark:border-white/10 p-5 flex flex-col gap-4" aria-label={t("event_templates_title")}>
                    <p className="flex items-center gap-2 text-sm font-bold text-gray-900 dark:text-white">
                        <Icon name="sparkle" className="w-5 h-5 text-blue-500" />
                        {t("event_templates_title")}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">{t("event_templates_hint")}</p>
                    <div className="relative mt-2">
                        <div className="flex flex-row gap-2 overflow-x-auto scrollbar-hide pb-1 pr-8">
                            {eventTemplates.map((templateItem) => (
                                <button
                                    key={templateItem.key}
                                    type="button"
                                    className={`shrink-0 whitespace-nowrap px-3 py-1.5 rounded-full text-xs font-bold transition-all shadow-sm border ${activeEventTemplateKey === templateItem.key ? "bg-gray-900 dark:bg-white text-white dark:text-gray-900 border-gray-900 dark:border-white" : "bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border-black/5 dark:border-white/10 hover:bg-gray-50 dark:hover:bg-gray-700"}`}
                                    aria-pressed={activeEventTemplateKey === templateItem.key}
                                    onClick={() => handleApplyEventTemplate(templateItem.key)}
                                >
                                    {t(templateItem.titleKey)}
                                </button>
                            ))}
                        </div>
                        <div className="pointer-events-none absolute inset-y-0 right-0 w-12 z-10 bg-gradient-to-l from-white/50 dark:from-white/5 to-transparent" aria-hidden="true" />
                    </div>
                </section>

                {/* Planificación */}
                <section className="flex flex-col gap-4">
                    <h3 className="text-sm font-bold uppercase tracking-wider text-gray-800 dark:text-gray-200 ml-1">{t("event_phase_planning")}</h3>

                    <div className="bg-white dark:bg-gray-800 rounded-2xl border border-black/5 dark:border-white/10 overflow-hidden shadow-sm">
                        <label className="flex flex-col gap-1 px-4 py-3.5 border-b border-black/5 dark:border-white/5">
                            <span className="text-[10px] font-bold uppercase tracking-widest text-gray-500 dark:text-gray-400">{t("field_title")} *</span>
                            <input
                                type="text"
                                className="bg-transparent outline-none text-sm text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-600 w-full"
                                value={eventTitle}
                                onChange={(event) => setEventTitle(event.target.value)}
                                placeholder={t("placeholder_event_title")}
                                aria-invalid={Boolean(eventErrors.title)}
                            />
                            {eventErrors.title ? <FieldMeta errorText={t(eventErrors.title)} /> : null}
                        </label>
                        <label className="flex flex-col gap-1 px-4 py-3.5 border-b border-black/5 dark:border-white/5">
                            <span className="text-[10px] font-bold uppercase tracking-widest text-gray-500 dark:text-gray-400">{t("field_event_description")}</span>
                            <textarea
                                rows={3}
                                className="bg-transparent outline-none text-sm text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-600 w-full resize-none"
                                value={eventDescription}
                                onChange={(event) => setEventDescription(event.target.value)}
                                placeholder={t("placeholder_event_description")}
                                aria-invalid={Boolean(eventErrors.description)}
                            />
                            <FieldMeta helpText={t("event_description_help")} errorText={eventErrors.description ? t(eventErrors.description) : ""} />
                        </label>
                        <label className="flex flex-col gap-1 px-4 py-3.5 border-b border-black/5 dark:border-white/5">
                            <span className="text-[10px] font-bold uppercase tracking-widest text-gray-500 dark:text-gray-400">{t("field_event_type")}</span>
                            <select
                                className="bg-transparent outline-none text-sm text-gray-900 dark:text-white w-full cursor-pointer"
                                value={eventType}
                                onChange={(event) => setEventType(event.target.value)}
                                aria-invalid={Boolean(eventErrors.eventType)}
                            >
                                <option value="">{t("select_option_prompt")}</option>
                                {eventTypeOptions.map((optionValue) => (
                                    <option key={optionValue} value={optionValue}>
                                        {optionValue}
                                    </option>
                                ))}
                            </select>
                            {eventErrors.eventType ? <FieldMeta errorText={t(eventErrors.eventType)} /> : null}
                        </label>
                        <label className="flex flex-col gap-1 px-4 py-3.5">
                            <span className="text-[10px] font-bold uppercase tracking-widest text-gray-500 dark:text-gray-400">{t("field_event_status")}</span>
                            <select className="bg-transparent outline-none text-sm text-gray-900 dark:text-white w-full cursor-pointer" value={eventStatus} onChange={(event) => setEventStatus(event.target.value)}>
                                <option value="draft">{t("status_draft")}</option>
                                <option value="published">{t("status_published")}</option>
                                <option value="completed">{t("status_completed")}</option>
                                <option value="cancelled">{t("status_cancelled")}</option>
                            </select>
                            <FieldMeta helpText={t("event_status_help")} />
                        </label>
                    </div>
                </section>

                {/* Logística */}
                <section className="flex flex-col gap-4">
                    <h3 className="text-sm font-bold uppercase tracking-wider text-gray-800 dark:text-gray-200 ml-1">{t("event_phase_logistics")}</h3>

                    <div className="bg-white dark:bg-gray-800 rounded-2xl border border-black/5 dark:border-white/10 p-4 flex flex-col gap-3 shadow-sm">
                        <p className="text-[10px] font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                            {t("event_date_mode_label")}
                        </p>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                            <button
                                type="button"
                                onClick={() => {
                                    setEventSchedulingMode("fixed");
                                }}
                                className={`rounded-xl border px-4 py-2.5 text-xs font-bold transition-all ${eventSchedulingMode !== "tbd"
                                    ? "bg-gray-900 dark:bg-white text-white dark:text-gray-900 border-gray-900 dark:border-white shadow-sm"
                                    : "bg-white/70 dark:bg-black/30 border-black/10 dark:border-white/10 text-gray-700 dark:text-gray-300 hover:bg-white dark:hover:bg-white/5"
                                    }`}
                                aria-pressed={eventSchedulingMode !== "tbd"}
                            >
                                {t("event_date_mode_fixed")}
                            </button>
                            <button
                                type="button"
                                onClick={() => {
                                    setEventSchedulingMode("tbd");
                                    setEventIsMultiDay(false);
                                    setEventEndAt("");
                                }}
                                className={`rounded-xl border px-4 py-2.5 text-xs font-bold transition-all ${eventSchedulingMode === "tbd"
                                    ? "bg-gray-900 dark:bg-white text-white dark:text-gray-900 border-gray-900 dark:border-white shadow-sm"
                                    : "bg-white/70 dark:bg-black/30 border-black/10 dark:border-white/10 text-gray-700 dark:text-gray-300 hover:bg-white dark:hover:bg-white/5"
                                    }`}
                                aria-pressed={eventSchedulingMode === "tbd"}
                            >
                                {t("event_date_mode_poll")}
                            </button>
                        </div>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                            {eventSchedulingMode === "tbd" ? t("event_date_mode_poll_hint") : t("event_date_mode_fixed_hint")}
                        </p>
                    </div>

                    {eventSchedulingMode === "tbd" ? (
                        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-black/5 dark:border-white/10 p-4 flex flex-col gap-3 shadow-sm">
                            <p className="text-[10px] font-bold uppercase tracking-widest text-gray-500 dark:text-gray-400">
                                {t("event_date_poll_options_title")}
                            </p>
                            <p className="text-xs text-gray-500 dark:text-gray-400">{t("event_date_poll_options_hint")}</p>
                            <div className="flex flex-col sm:flex-row gap-2">
                                <input
                                    type="datetime-local"
                                    className="flex-1 bg-black/[0.03] dark:bg-white/5 border border-black/5 dark:border-white/10 rounded-xl px-3 py-2.5 text-sm text-gray-900 dark:text-white outline-none"
                                    value={eventPollOptionDraft}
                                    onChange={(event) => setEventPollOptionDraft(event.target.value)}
                                    aria-label={t("event_date_poll_option_label")}
                                />
                                <button
                                    type="button"
                                    onClick={handleAddEventPollOption}
                                    className="inline-flex items-center justify-center gap-2 bg-gray-900 dark:bg-white hover:opacity-90 text-white dark:text-gray-900 font-bold text-xs px-4 py-2.5 rounded-xl transition-opacity"
                                >
                                    <Icon name="plus" className="w-4 h-4" />
                                    {t("event_date_poll_add_option")}
                                </button>
                            </div>
                            <div className="flex flex-col gap-2">
                                {eventPollOptions.length === 0 ? (
                                    <p className="text-xs italic text-gray-500 dark:text-gray-400">{t("event_date_poll_options_empty")}</p>
                                ) : (
                                    eventPollOptions.map((optionItem, index) => (
                                        <div
                                            key={optionItem.localId}
                                            className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 bg-black/[0.02] dark:bg-white/5 border border-black/5 dark:border-white/10 rounded-xl p-2"
                                        >
                                            <span className="text-[10px] font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400 px-2">
                                                #{index + 1}
                                            </span>
                                            <input
                                                type="datetime-local"
                                                className="flex-1 bg-transparent outline-none text-sm text-gray-900 dark:text-white"
                                                value={optionItem.startAt}
                                                onChange={(event) => handleUpdateEventPollOption(optionItem.localId, event.target.value)}
                                                aria-label={t("event_date_poll_option_label")}
                                            />
                                            <button
                                                type="button"
                                                onClick={() => handleRemoveEventPollOption(optionItem.localId)}
                                                className="inline-flex items-center justify-center gap-1 text-xs font-bold text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 px-3 py-2 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                                            >
                                                <Icon name="trash" className="w-4 h-4" />
                                                {t("event_date_poll_option_remove")}
                                            </button>
                                        </div>
                                    ))
                                )}
                            </div>
                            <FieldMeta errorText={eventErrors.pollOptions ? t(eventErrors.pollOptions) : ""} />
                        </div>
                    ) : (
                        <div className="flex flex-col gap-4">
                            <div className="flex items-start justify-between gap-4 p-4 bg-white dark:bg-gray-800 border border-black/5 dark:border-white/10 rounded-2xl shadow-sm">
                                <div className="flex flex-col gap-1">
                                    <span className="text-[10px] font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                                        {t("event_multiday_toggle_label")}
                                    </span>
                                    <span className="text-xs text-gray-500 dark:text-gray-400">
                                        {t("event_multiday_toggle_hint")}
                                    </span>
                                </div>
                                <label className="relative inline-flex items-center cursor-pointer mt-0.5 shrink-0">
                                    <input
                                        type="checkbox"
                                        className="sr-only peer"
                                        checked={Boolean(eventIsMultiDay)}
                                        onChange={(event) => {
                                            const checked = Boolean(event.target.checked);
                                            setEventIsMultiDay(checked);
                                            if (!checked) {
                                                setEventEndAt("");
                                            }
                                        }}
                                    />
                                    <div className="w-11 h-6 bg-gray-300 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300/40 dark:peer-focus:ring-blue-800/60 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"></div>
                                </label>
                            </div>
                            <div className="bg-white dark:bg-gray-800 rounded-2xl border border-black/5 dark:border-white/10 overflow-hidden shadow-sm">
                                <label className={`flex flex-col gap-1 px-4 py-3.5 ${eventIsMultiDay ? "border-b border-black/5 dark:border-white/5" : ""}`}>
                                    <span className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest text-gray-500 dark:text-gray-400">
                                        <Icon name="calendar" className="w-3.5 h-3.5" />
                                        {eventIsMultiDay ? t("field_datetime_start") : t("field_datetime")}
                                    </span>
                                    <input
                                        type="datetime-local"
                                        className="bg-transparent outline-none text-sm text-gray-900 dark:text-white w-full"
                                        value={eventStartAt}
                                        onChange={(event) => setEventStartAt(event.target.value)}
                                    />
                                    {eventErrors.startAt ? <FieldMeta errorText={t(eventErrors.startAt)} /> : null}
                                </label>
                                {eventIsMultiDay ? (
                                    <label className="flex flex-col gap-1 px-4 py-3.5">
                                        <span className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest text-gray-500 dark:text-gray-400">
                                            <Icon name="calendar" className="w-3.5 h-3.5" />
                                            {t("field_datetime_end")}
                                        </span>
                                        <input
                                            type="datetime-local"
                                            className="bg-transparent outline-none text-sm text-gray-900 dark:text-white w-full"
                                            value={eventEndAt}
                                            onChange={(event) => setEventEndAt(event.target.value)}
                                        />
                                        {eventErrors.endAt ? <FieldMeta errorText={t(eventErrors.endAt)} /> : null}
                                    </label>
                                ) : null}
                            </div>
                        </div>
                    )}

                    <div className="bg-white dark:bg-gray-800 rounded-2xl border border-black/5 dark:border-white/10 overflow-hidden shadow-sm">
                        <label className="flex flex-col gap-1 px-4 py-3.5 border-b border-black/5 dark:border-white/5">
                            <span className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest text-gray-500 dark:text-gray-400">
                                <Icon name="location" className="w-3.5 h-3.5" />
                                {t("field_place")}
                            </span>
                            <input
                                type="text"
                                className="bg-transparent outline-none text-sm text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-600 w-full"
                                value={eventLocationName}
                                onChange={(event) => setEventLocationName(event.target.value)}
                                placeholder={t("placeholder_place")}
                                list="event-place-options"
                                aria-invalid={Boolean(eventErrors.locationName)}
                            />
                            {eventErrors.locationName ? <FieldMeta errorText={t(eventErrors.locationName)} /> : null}
                        </label>
                        <label className="flex flex-col gap-1 px-4 py-3.5">
                            <span className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest text-gray-500 dark:text-gray-400">
                                <Icon name="location" className="w-3.5 h-3.5" />
                                {t("field_address")}
                            </span>
                            <input
                                type="text"
                                className="bg-transparent outline-none text-sm text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-600 w-full"
                                value={eventLocationAddress}
                                onChange={(event) => setEventLocationAddress(event.target.value)}
                                placeholder={t("placeholder_address")}
                                aria-invalid={Boolean(eventErrors.locationAddress)}
                                autoComplete="off"
                                list="event-address-options"
                            />
                            <FieldMeta
                                helpText={
                                    mapsStatus === "ready"
                                        ? t("address_google_hint")
                                        : mapsStatus === "loading"
                                            ? t("address_google_loading")
                                            : mapsStatus === "error"
                                                ? `${t("address_google_error")} ${mapsError}`
                                                : t("address_google_unconfigured")
                                }
                                errorText={eventErrors.locationAddress ? t(eventErrors.locationAddress) : ""}
                            />
                        </label>
                    </div>
                    {mapsStatus === "ready" && eventLocationAddress.trim().length >= 4 ? (
                        <ul className="flex flex-col gap-1 bg-white dark:bg-gray-800 border border-black/10 dark:border-white/10 rounded-xl overflow-hidden shadow-lg" role="listbox" aria-label={t("address_suggestions")}>
                            {isAddressLoading ? <li className="w-full text-left px-4 py-3 text-xs text-gray-500 italic">{t("address_searching")}</li> : null}
                            {!isAddressLoading && addressPredictions.length === 0 ? (
                                <li className="w-full text-left px-4 py-3 text-xs text-gray-500 italic">{t("address_no_matches")}</li>
                            ) : null}
                            {addressPredictions.map((prediction) => (
                                <li key={prediction.place_id}>
                                    <button
                                        type="button"
                                        className="w-full text-left px-4 py-3 text-sm hover:bg-black/5 dark:hover:bg-white/5 text-gray-700 dark:text-gray-300 transition-colors flex items-center gap-3"
                                        onClick={() => handleSelectAddressPrediction(prediction)}
                                    >
                                        <Icon name="location" className="w-4 h-4 text-gray-400 dark:text-gray-500" />
                                        {prediction.description}
                                    </button>
                                </li>
                            ))}
                        </ul>
                    ) : null}
                    {selectedPlace?.placeId ? (
                        <p className="text-xs font-bold text-green-600 dark:text-green-400">{t("address_validated")}</p>
                    ) : null}

                    {typeof selectedPlace?.lat === "number" && typeof selectedPlace?.lng === "number" ? (
                        <div className="w-full h-48 rounded-xl overflow-hidden shadow-inner border border-black/5 dark:border-white/10 mt-2" aria-label={t("map_preview_title")}>
                            <iframe
                                title={t("map_preview_title")}
                                className="w-full h-full"
                                src={getMapEmbedUrl(selectedPlace.lat, selectedPlace.lng)}
                                loading="lazy"
                                referrerPolicy="no-referrer-when-downgrade"
                            />
                        </div>
                    ) : null}
                </section>

                <p className="text-xs text-gray-500 dark:text-gray-400 ml-1">
                    {t("timezone_detected")}: {timezone}
                </p>

                <datalist id="event-type-options">
                    {eventTypeOptions.map((optionValue) => (
                        <option key={optionValue} value={optionValue} />
                    ))}
                </datalist>
                <datalist id="event-place-options">
                    {locationNameOptions.map((optionValue) => (
                        <option key={optionValue} value={optionValue} />
                    ))}
                </datalist>
                <datalist id="event-address-options">
                    {locationAddressOptions.map((optionValue) => (
                        <option key={optionValue} value={optionValue} />
                    ))}
                </datalist>
            </div>

            {/* ── Sticky mobile CTA ── visible below xl; at xl the aside's sticky card takes over */}
            <div className="xl:hidden sticky bottom-16 z-50 -mx-5 md:-mx-8 px-5 md:px-8 py-3 bg-white/90 dark:bg-gray-900/90 backdrop-blur-xl border-t border-black/10 dark:border-white/10 shadow-[0_-4px_20px_rgba(0,0,0,0.07)]">
                <InlineMessage text={eventMessage} />
                <div className={`flex items-center gap-2${eventMessage ? " mt-2" : ""}`}>
                    {isEditingEvent && (
                        <button
                            className="shrink-0 text-sm font-semibold text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 py-2.5 px-3 rounded-xl transition-colors outline-none"
                            type="button"
                            onClick={handleCancelEditEvent}
                        >
                            {t("cancel_edit")}
                        </button>
                    )}
                    <button
                        className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-6 rounded-2xl shadow-lg shadow-blue-500/25 transition-all active:scale-[0.98] disabled:opacity-50 text-sm"
                        type="submit"
                        disabled={isSavingEvent}
                    >
                        {isSavingEvent
                            ? isEditingEvent ? t("updating_event") : t("saving_event")
                            : isEditingEvent ? t("update_event") : t("save_event")}
                    </button>
                </div>
            </div>

            {/* COLUMNA ASIDE (DERECHA) */}
            <aside className="w-full xl:w-[380px] flex flex-col gap-6">

                {/* Acciones principales — solo visible en xl+ (en mobile hay un sticky footer) */}
                <section className="hidden xl:flex xl:flex-col bg-white/50 dark:bg-white/5 rounded-2xl border border-black/5 dark:border-white/10 p-5 gap-4 shadow-sm sticky top-[80px] lg:top-[100px] z-20">
                    <button className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-6 rounded-xl shadow-sm transition-all w-full flex justify-center items-center gap-2 disabled:opacity-50" type="submit" disabled={isSavingEvent}>
                        {isSavingEvent
                            ? isEditingEvent
                                ? t("updating_event")
                                : t("saving_event")
                            : isEditingEvent
                                ? t("update_event")
                                : t("save_event")}
                    </button>
                    {isEditingEvent ? (
                        <button className="bg-black/5 hover:bg-black/10 dark:bg-white/5 dark:hover:bg-white/10 text-gray-700 dark:text-gray-300 font-bold py-3 px-6 rounded-xl transition-all w-full flex justify-center items-center gap-2" type="button" onClick={handleCancelEditEvent}>
                            {t("cancel_edit")}
                        </button>
                    ) : null}
                    <InlineMessage text={eventMessage} />
                </section>

                {/* Progreso */}
                <section className="bg-white/50 dark:bg-white/5 rounded-2xl border border-black/5 dark:border-white/10 p-5 flex flex-col gap-4" aria-label={t("event_progress_title")}>
                    <div className="flex justify-between items-end">
                        <p className="text-[10px] font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">{t("event_progress_title")}</p>
                        <strong className="text-xl font-black text-gray-900 dark:text-white leading-none">{eventPhaseProgress.percent}%</strong>
                    </div>
                    <div className="w-full bg-black/5 dark:bg-white/10 rounded-full h-2 overflow-hidden" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={eventPhaseProgress.percent}>
                        <span className="bg-blue-500 h-full block rounded-full transition-all duration-500" style={{ width: `${eventPhaseProgress.percent}%` }} />
                    </div>
                    <div className="flex flex-wrap gap-2 mt-2">
                        {eventPhaseProgress.byPhase.map((phaseItem) => {
                            const isDone = phaseItem.done === phaseItem.total;
                            return (
                                <span key={phaseItem.key} className={`text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded-md ${isDone ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400" : "bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400"}`}>
                                    {t(`event_phase_${phaseItem.key}`)} {phaseItem.done}/{phaseItem.total}
                                </span>
                            );
                        })}
                    </div>
                </section>

                {/* Publicar */}
                <section className="bg-white/50 dark:bg-white/5 rounded-2xl border border-black/5 dark:border-white/10 p-5 flex flex-col gap-3">
                    <h3 className="text-sm font-bold text-gray-900 dark:text-white">{t("event_phase_publish")}</h3>
                    <p className="text-xs text-gray-500 dark:text-gray-400">{t("event_phase_publish_hint")}</p>
                    {editingEventId ? (
                        <p className="text-xs font-medium text-gray-700 dark:text-gray-300">
                            {t("event_phase_publish_invites")} <strong className="text-blue-600 dark:text-blue-400">{invitationCountForEditingEvent}</strong>
                        </p>
                    ) : (
                        <p className="text-xs text-gray-400 italic">{t("event_phase_publish_after_save")}</p>
                    )}
                </section>

                {/* Ajustes Avanzados */}
                <section className="bg-white/50 dark:bg-white/5 rounded-2xl border border-black/5 dark:border-white/10 p-5 flex flex-col gap-4">
                    <h3 className="text-sm font-bold text-gray-900 dark:text-white">{t("event_settings_title")}</h3>
                    <p className="text-xs text-gray-500 dark:text-gray-400">{t("event_settings_hint")}</p>

                    <div className="bg-white dark:bg-gray-800 rounded-2xl border border-black/5 dark:border-white/10 overflow-hidden shadow-sm">
                        <label className="flex items-center justify-between gap-3 px-4 py-3.5 border-b border-black/5 dark:border-white/5 cursor-pointer">
                            <span className="text-sm font-medium text-gray-900 dark:text-white">{t("event_setting_allow_plus_one")}</span>
                            <input
                                type="checkbox"
                                className="w-4 h-4 text-blue-600 bg-white border-gray-300 rounded focus:ring-blue-500 focus:ring-2 dark:bg-gray-700 dark:border-gray-600 shrink-0"
                                checked={eventAllowPlusOne}
                                onChange={(event) => setEventAllowPlusOne(event.target.checked)}
                            />
                        </label>
                        <label className="flex items-center justify-between gap-3 px-4 py-3.5 border-b border-black/5 dark:border-white/5 cursor-pointer">
                            <span className="text-sm font-medium text-gray-900 dark:text-white">{t("event_setting_auto_reminders")}</span>
                            <input
                                type="checkbox"
                                className="w-4 h-4 text-blue-600 bg-white border-gray-300 rounded focus:ring-blue-500 focus:ring-2 dark:bg-gray-700 dark:border-gray-600 shrink-0"
                                checked={eventAutoReminders}
                                onChange={(event) => setEventAutoReminders(event.target.checked)}
                            />
                        </label>
                        <label className="flex flex-col gap-1 px-4 py-3.5 border-b border-black/5 dark:border-white/5">
                            <span className="text-[10px] font-bold uppercase tracking-widest text-gray-500 dark:text-gray-400">{t("event_setting_dress_code")}</span>
                            <select className="bg-transparent outline-none text-sm text-gray-900 dark:text-white w-full cursor-pointer" value={eventDressCode} onChange={(event) => setEventDressCode(event.target.value)}>
                                <option value="none">{t("event_dress_code_none")}</option>
                                <option value="casual">{t("event_dress_code_casual")}</option>
                                <option value="elegant">{t("event_dress_code_elegant")}</option>
                                <option value="formal">{t("event_dress_code_formal")}</option>
                                <option value="themed">{t("event_dress_code_themed")}</option>
                            </select>
                            {eventErrors.dressCode ? <FieldMeta errorText={t(eventErrors.dressCode)} /> : null}
                        </label>
                        <label className="flex flex-col gap-1 px-4 py-3.5">
                            <span className="text-[10px] font-bold uppercase tracking-widest text-gray-500 dark:text-gray-400">{t("event_setting_playlist_mode")}</span>
                            <select className="bg-transparent outline-none text-sm text-gray-900 dark:text-white w-full cursor-pointer" value={eventPlaylistMode} onChange={(event) => setEventPlaylistMode(event.target.value)}>
                                <option value="host_only">{t("event_playlist_mode_host_only")}</option>
                                <option value="collaborative">{t("event_playlist_mode_collaborative")}</option>
                                <option value="spotify_collaborative">{t("event_playlist_mode_spotify_collaborative")}</option>
                            </select>
                            {eventErrors.playlistMode ? <FieldMeta errorText={t(eventErrors.playlistMode)} /> : null}
                        </label>
                    </div>
                </section>

                {/* Playbook */}
                <section className="bg-white/50 dark:bg-white/5 rounded-2xl border border-black/5 dark:border-white/10 p-5 flex flex-col gap-4">
                    <h3 className="text-sm font-bold flex items-center gap-2 text-gray-900 dark:text-white">
                        <Icon name="sparkle" className="w-4 h-4 text-purple-500" />
                        {t("smart_hosting_playbook_title")}
                    </h3>
                    <p className="text-xs text-gray-500 dark:text-gray-400">{t("smart_hosting_playbook_hint")}</p>
                    {eventBuilderPlaybookActions.length > 0 ? (
                        <ul className="flex flex-col gap-2">
                            {eventBuilderPlaybookActions.map((item, index) => (
                                <li key={`${index}-${item}`} className="text-xs text-gray-700 dark:text-gray-300 flex items-start gap-2 bg-white/40 dark:bg-black/20 p-2.5 rounded-lg border border-black/5 dark:border-white/5">
                                    <span className="text-purple-500 mt-0.5">•</span>
                                    <span>{item}</span>
                                </li>
                            ))}
                        </ul>
                    ) : (
                        <p className="text-xs text-gray-400 italic">{t("smart_hosting_empty")}</p>
                    )}
                    <button className="bg-black/5 hover:bg-black/10 dark:bg-white/5 dark:hover:bg-white/10 text-gray-700 dark:text-gray-300 font-bold py-2.5 px-4 rounded-xl transition-all text-xs w-full flex justify-center mt-2" type="button" onClick={handleApplySuggestedEventSettings}>
                        {t("smart_hosting_apply_settings")}
                    </button>
                </section>

                {/* Sugerencias de Menú */}
                <section className="bg-white/50 dark:bg-white/5 rounded-2xl border border-black/5 dark:border-white/10 p-5 flex flex-col gap-4">
                    <h3 className="text-sm font-bold flex items-center gap-2 text-gray-900 dark:text-white">
                        <Icon name="sparkle" className="w-4 h-4 text-orange-500" />
                        {t("event_menu_plan_title")}
                    </h3>
                    <p className="text-xs text-gray-500 dark:text-gray-400">{t("event_menu_plan_hint")}</p>

                    {eventBuilderMealPlan.recipeCards.length > 0 ? (
                        <div className="flex flex-col gap-3">
                            {eventBuilderMealPlan.recipeCards.map((recipeItem) => (
                                <article key={recipeItem.id} className="bg-white/40 dark:bg-black/20 p-3.5 rounded-xl border border-black/5 dark:border-white/5 shadow-sm">
                                    <p className="text-[10px] font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-1">{recipeItem.title}</p>
                                    <p className="text-sm font-medium text-gray-900 dark:text-white leading-tight mb-2">{recipeItem.subtitle}</p>
                                    <p className="text-[10px] text-gray-500">{recipeItem.note}</p>
                                </article>
                            ))}
                        </div>
                    ) : (
                        <p className="text-xs text-gray-400 italic">{t("event_menu_shopping_empty")}</p>
                    )}

                    <h4 className="text-xs font-bold uppercase tracking-wider text-gray-800 dark:text-gray-200 mt-2 border-t border-black/5 dark:border-white/10 pt-4">{t("event_menu_shopping_title")}</h4>
                    {eventBuilderMealPlan.shoppingChecklist.length > 0 ? (
                        <ul className="flex flex-col gap-1.5">
                            {eventBuilderMealPlan.shoppingChecklist.map((item) => (
                                <li key={item} className="text-xs text-gray-600 dark:text-gray-400 flex items-start gap-2">
                                    <span className="text-gray-400 mt-0.5">-</span>
                                    <span>{item}</span>
                                </li>
                            ))}
                        </ul>
                    ) : (
                        <p className="text-xs text-gray-400 italic">{t("event_menu_shopping_empty")}</p>
                    )}

                    <button className="bg-black/5 hover:bg-black/10 dark:bg-white/5 dark:hover:bg-white/10 text-gray-700 dark:text-gray-300 font-bold py-2.5 px-4 rounded-xl transition-all text-xs w-full flex justify-center items-center gap-2 mt-2" type="button" onClick={handleCopyEventBuilderShoppingChecklist}>
                        <Icon name="check" className="w-4 h-4" />
                        {t("event_menu_shopping_copy_action")}
                    </button>
                </section>

            </aside>
        </form>
    );
}

// 🚀 NUEVO COMPONENTE: El Asistente Paso a Paso (Pégalo debajo de EventBuilderView)
export function EventBuilderWizardView(props) {
    const {
        t,
        handleSaveEvent,
        isSavingEvent,
        eventTemplates,
        activeEventTemplateKey,
        handleApplyEventTemplate,
        handleChangeEventTemplateAudience,
        eventTitle,
        setEventTitle,
        eventErrors,
        eventDescription,
        setEventDescription,
        eventType,
        setEventType,
        eventTypeOptions,
        eventStartAt,
        setEventStartAt,
        eventEndAt,
        setEventEndAt,
        eventIsMultiDay,
        setEventIsMultiDay,
        eventSchedulingMode,
        setEventSchedulingMode,
        eventPollOptionDraft,
        setEventPollOptionDraft,
        eventPollOptions,
        handleAddEventPollOption,
        handleUpdateEventPollOption,
        handleRemoveEventPollOption,
        eventLocationName,
        setEventLocationName,
        eventLocationAddress,
        setEventLocationAddress,
        mapsStatus,
        addressPredictions,
        isAddressLoading,
        handleSelectAddressPrediction,
        selectedPlace,
        getMapEmbedUrl,
        eventAllowPlusOne,
        setEventAllowPlusOne,
        eventAutoReminders,
        setEventAutoReminders,
        eventMessage,
        eventHoneypotField,
        setEventHoneypotField,
        locationNameOptions,
        locationAddressOptions
    } = props;

    const [currentStep, setCurrentStep] = React.useState(1);
    const [templateAudienceTab, setTemplateAudienceTab] = React.useState("personal");
    const [templateSelectionError, setTemplateSelectionError] = React.useState("");
    const totalSteps = 2;
    const visibleTemplates = React.useMemo(
        () =>
            (Array.isArray(eventTemplates) ? eventTemplates : []).filter((templateItem) => {
                const audience = String(templateItem?.audience || "personal").trim().toLowerCase();
                return audience === "both" || audience === templateAudienceTab;
            }),
        [eventTemplates, templateAudienceTab]
    );

    const handleNext = React.useCallback(() => {
        if (currentStep === 1 && !String(activeEventTemplateKey || "").trim()) {
            setTemplateSelectionError("event_onboarding_template_required");
            return;
        }
        setTemplateSelectionError("");
        setCurrentStep((prev) => Math.min(prev + 1, totalSteps));
    }, [activeEventTemplateKey, currentStep, totalSteps]);
    const handleBack = () => setCurrentStep((prev) => Math.max(prev - 1, 1));
    const handleAudienceTabChange = (nextAudience) => {
        const normalizedAudience = String(nextAudience || "").trim().toLowerCase() === "professional"
            ? "professional"
            : "personal";
        setTemplateAudienceTab(normalizedAudience);
        if (typeof handleChangeEventTemplateAudience === "function") {
            handleChangeEventTemplateAudience(normalizedAudience);
        }
    };
    const handleTemplateSelection = (event, templateKey) => {
        event.preventDefault();
        event.stopPropagation();
        setTemplateSelectionError("");
        handleApplyEventTemplate(templateKey);
    };
    const handleWizardFormSubmit = (event) => {
        event.preventDefault();
    };
    const handleFinalSave = (event) => {
        event.preventDefault();
        if (typeof handleSaveEvent === "function") {
            handleSaveEvent(event);
        }
    };
    const progressPercent = currentStep === 1 ? 50 : 100;
    const currentStepTitleKey = currentStep === 1 ? "event_onboarding_step_templates" : "event_onboarding_step_details";

    return (
        <div className="w-full max-w-3xl mx-auto flex flex-col gap-6 animate-in fade-in zoom-in-95 duration-500">
            <header className="bg-white/50 dark:bg-gray-900/50 backdrop-blur-xl border border-black/10 dark:border-white/10 rounded-3xl p-6 shadow-sm">
                <div className="flex justify-between items-end mb-4">
                    <div>
                        <p className="text-[10px] font-bold uppercase tracking-wider text-blue-600 dark:text-blue-400 mb-1">
                            {t("event_onboarding_progress")}
                        </p>
                        <h2 className="text-2xl font-black text-gray-900 dark:text-white">
                            {t(currentStepTitleKey)}
                        </h2>
                    </div>
                    <strong className="text-xl font-black text-gray-300 dark:text-gray-700">{currentStep}/{totalSteps}</strong>
                </div>
                <div className="w-full bg-black/5 dark:bg-white/10 rounded-full h-2 overflow-hidden">
                    <span
                        className="bg-blue-600 h-full block rounded-full transition-all duration-500 ease-out"
                        style={{ width: `${progressPercent}%` }}
                    />
                </div>
            </header>

            <form className="bg-white/50 dark:bg-gray-900/50 backdrop-blur-xl border border-black/10 dark:border-white/10 rounded-3xl shadow-xl p-6 md:p-8 flex flex-col gap-8" onSubmit={handleWizardFormSubmit} noValidate>
                <div className="absolute -left-[9999px] top-auto w-px h-px overflow-hidden" aria-hidden="true">
                    <label htmlFor="event-wizard-website-field">Website</label>
                    <input
                        id="event-wizard-website-field"
                        name="website"
                        type="text"
                        value={eventHoneypotField}
                        onChange={(event) => setEventHoneypotField(event.target.value)}
                        tabIndex={-1}
                        autoComplete="off"
                    />
                </div>
                <div className={currentStep === 1 ? "flex flex-col gap-6 animate-in slide-in-from-right-8 duration-300" : "hidden"}>
                    <section className="bg-blue-50/50 dark:bg-blue-900/10 rounded-2xl border border-blue-100 dark:border-blue-900/30 p-5 flex flex-col gap-4">
                        <p className="flex items-center gap-2 text-sm font-bold text-blue-900 dark:text-blue-200">
                            <Icon name="sparkle" className="w-5 h-5" />
                            {t("event_onboarding_templates_title")}
                        </p>
                        <p className="text-xs text-blue-800/70 dark:text-blue-200/70">{t("event_onboarding_templates_hint")}</p>
                        <div className="inline-flex w-full sm:w-auto rounded-xl border border-black/10 dark:border-white/10 bg-white/70 dark:bg-black/20 p-1 gap-1">
                            <button
                                type="button"
                                onClick={() => handleAudienceTabChange("personal")}
                                className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-colors ${templateAudienceTab === "personal"
                                        ? "bg-gray-900 dark:bg-white text-white dark:text-gray-900"
                                        : "text-gray-700 dark:text-gray-300 hover:bg-black/5 dark:hover:bg-white/5"
                                    }`}
                                aria-pressed={templateAudienceTab === "personal"}
                            >
                                {t("event_onboarding_tab_personal")}
                            </button>
                            <button
                                type="button"
                                onClick={() => handleAudienceTabChange("professional")}
                                className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-colors ${templateAudienceTab === "professional"
                                        ? "bg-gray-900 dark:bg-white text-white dark:text-gray-900"
                                        : "text-gray-700 dark:text-gray-300 hover:bg-black/5 dark:hover:bg-white/5"
                                    }`}
                                aria-pressed={templateAudienceTab === "professional"}
                            >
                                {t("event_onboarding_tab_professional")}
                            </button>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-1">
                            {visibleTemplates.map((templateItem) => (
                                <button
                                    key={templateItem.key}
                                    type="button"
                                    className={`text-left rounded-2xl border px-4 py-3 transition-all shadow-sm ${activeEventTemplateKey === templateItem.key
                                        ? "bg-gray-900 dark:bg-white text-white dark:text-gray-900 border-gray-900 dark:border-white shadow-md"
                                        : "bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200 border-black/5 dark:border-white/10 hover:bg-gray-50 dark:hover:bg-gray-700"
                                        }`}
                                    onClick={(event) => handleTemplateSelection(event, templateItem.key)}
                                >
                                    <div className="flex items-center justify-between gap-3">
                                        <div className="flex items-center gap-2">
                                            <Icon name={templateItem.icon || "sparkle"} className="w-4 h-4" />
                                            <span className="text-sm font-bold">{t(templateItem.titleKey)}</span>
                                        </div>
                                        {activeEventTemplateKey === templateItem.key ? (
                                            <span className="text-[10px] font-bold uppercase tracking-wider">{t("event_onboarding_selected")}</span>
                                        ) : null}
                                    </div>
                                    <p className={`mt-2 text-xs leading-relaxed ${activeEventTemplateKey === templateItem.key ? "text-white/90" : "text-gray-500 dark:text-gray-400"}`}>
                                        {t(templateItem.descriptionKey)}
                                    </p>
                                </button>
                            ))}
                        </div>
                        {templateSelectionError ? (
                            <FieldMeta errorText={t(templateSelectionError)} />
                        ) : null}
                    </section>
                </div>

                <div className={currentStep === 2 ? "flex flex-col gap-6 animate-in slide-in-from-right-8 duration-300" : "hidden"}>
                    <label>
                        <span className="block mb-2 ml-1 text-xs font-bold uppercase tracking-wider text-gray-700 dark:text-gray-300">{t("field_title")} *</span>
                        <input
                            type="text"
                            className="w-full bg-white dark:bg-black/40 border border-black/10 dark:border-white/10 rounded-xl px-4 py-4 text-base font-medium text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 transition-all outline-none shadow-sm"
                            value={eventTitle}
                            onChange={(event) => setEventTitle(event.target.value)}
                            placeholder={t("placeholder_event_title")}
                        />
                        <FieldMeta errorText={eventErrors.title ? t(eventErrors.title) : ""} />
                    </label>

                    <label>
                        <span className="block mb-2 ml-1 text-xs font-bold uppercase tracking-wider text-gray-700 dark:text-gray-300">{t("field_event_description")}</span>
                        <textarea
                            rows={3}
                            className="w-full bg-white dark:bg-black/40 border border-black/10 dark:border-white/10 rounded-xl px-4 py-4 text-base text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 transition-all outline-none shadow-sm"
                            value={eventDescription}
                            onChange={(event) => setEventDescription(event.target.value)}
                            placeholder={t("placeholder_event_description")}
                        />
                        <FieldMeta errorText={eventErrors.description ? t(eventErrors.description) : ""} />
                    </label>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <label>
                            <span className="block mb-2 ml-1 text-xs font-bold uppercase tracking-wider text-gray-700 dark:text-gray-300">{t("field_event_type")}</span>
                            <select
                                className="w-full bg-white dark:bg-black/40 border border-black/10 dark:border-white/10 rounded-xl px-4 py-4 text-base font-medium text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 transition-all outline-none shadow-sm"
                                value={eventType}
                                onChange={(event) => setEventType(event.target.value)}
                                aria-invalid={Boolean(eventErrors.eventType)}
                            >
                                <option value="">{t("select_option_prompt")}</option>
                                {eventTypeOptions.map((opt) => (
                                    <option key={opt} value={opt}>{opt}</option>
                                ))}
                            </select>
                            <FieldMeta errorText={eventErrors.eventType ? t(eventErrors.eventType) : ""} />
                        </label>
                    </div>

                    <div className="bg-white/70 dark:bg-black/30 border border-black/10 dark:border-white/10 rounded-2xl p-4 flex flex-col gap-3">
                        <p className="text-xs font-bold uppercase tracking-wider text-gray-700 dark:text-gray-300">
                            {t("event_date_mode_label")}
                        </p>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                            <button
                                type="button"
                                onClick={() => {
                                    setEventSchedulingMode("fixed");
                                }}
                                className={`rounded-xl border px-4 py-2.5 text-sm font-bold transition-all ${eventSchedulingMode !== "tbd"
                                    ? "bg-gray-900 dark:bg-white text-white dark:text-gray-900 border-gray-900 dark:border-white shadow-sm"
                                    : "bg-white dark:bg-black/20 border-black/10 dark:border-white/10 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-white/5"
                                    }`}
                            >
                                {t("event_date_mode_fixed")}
                            </button>
                            <button
                                type="button"
                                onClick={() => {
                                    setEventSchedulingMode("tbd");
                                    setEventIsMultiDay(false);
                                    setEventEndAt("");
                                }}
                                className={`rounded-xl border px-4 py-2.5 text-sm font-bold transition-all ${eventSchedulingMode === "tbd"
                                    ? "bg-gray-900 dark:bg-white text-white dark:text-gray-900 border-gray-900 dark:border-white shadow-sm"
                                    : "bg-white dark:bg-black/20 border-black/10 dark:border-white/10 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-white/5"
                                    }`}
                            >
                                {t("event_date_mode_poll")}
                            </button>
                        </div>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                            {eventSchedulingMode === "tbd" ? t("event_date_mode_poll_hint") : t("event_date_mode_fixed_hint")}
                        </p>
                    </div>

                    {eventSchedulingMode === "tbd" ? (
                        <div className="bg-white/70 dark:bg-black/30 border border-black/10 dark:border-white/10 rounded-2xl p-4 flex flex-col gap-3">
                            <p className="text-xs font-bold uppercase tracking-wider text-gray-700 dark:text-gray-300">
                                {t("event_date_poll_options_title")}
                            </p>
                            <div className="flex flex-col sm:flex-row gap-2">
                                <input
                                    type="datetime-local"
                                    className="flex-1 bg-white dark:bg-black/30 border border-black/10 dark:border-white/10 rounded-xl px-4 py-3 text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 transition-all outline-none"
                                    value={eventPollOptionDraft}
                                    onChange={(event) => setEventPollOptionDraft(event.target.value)}
                                />
                                <button
                                    type="button"
                                    onClick={handleAddEventPollOption}
                                    className="inline-flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm px-4 py-3 rounded-xl transition-colors"
                                >
                                    <Icon name="plus" className="w-4 h-4" />
                                    {t("event_date_poll_add_option")}
                                </button>
                            </div>
                            {eventPollOptions.length === 0 ? (
                                <p className="text-xs italic text-gray-500 dark:text-gray-400">{t("event_date_poll_options_empty")}</p>
                            ) : (
                                <div className="flex flex-col gap-2">
                                    {eventPollOptions.map((optionItem, index) => (
                                        <div key={optionItem.localId} className="flex items-center gap-2">
                                            <span className="text-[10px] font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400 w-7 shrink-0">#{index + 1}</span>
                                            <input
                                                type="datetime-local"
                                                className="flex-1 bg-white dark:bg-black/30 border border-black/10 dark:border-white/10 rounded-xl px-3 py-2.5 text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 transition-all outline-none"
                                                value={optionItem.startAt}
                                                onChange={(event) => handleUpdateEventPollOption(optionItem.localId, event.target.value)}
                                            />
                                            <button
                                                type="button"
                                                onClick={() => handleRemoveEventPollOption(optionItem.localId)}
                                                className="text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 p-2 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                                                aria-label={t("event_date_poll_option_remove")}
                                            >
                                                <Icon name="trash" className="w-4 h-4" />
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            )}
                            <FieldMeta errorText={eventErrors.pollOptions ? t(eventErrors.pollOptions) : ""} />
                        </div>
                    ) : (
                        <div className="flex flex-col gap-4">
                            <div className="flex items-start justify-between gap-4 p-4 bg-white dark:bg-black/20 border border-black/10 dark:border-white/10 rounded-2xl">
                                <div className="flex flex-col gap-1">
                                    <span className="text-xs font-bold uppercase tracking-wider text-gray-700 dark:text-gray-300">
                                        {t("event_multiday_toggle_label")}
                                    </span>
                                    <span className="text-xs text-gray-500 dark:text-gray-400">
                                        {t("event_multiday_toggle_hint")}
                                    </span>
                                </div>
                                <label className="relative inline-flex items-center cursor-pointer shrink-0">
                                    <input
                                        type="checkbox"
                                        className="sr-only peer"
                                        checked={Boolean(eventIsMultiDay)}
                                        onChange={(event) => {
                                            const checked = Boolean(event.target.checked);
                                            setEventIsMultiDay(checked);
                                            if (!checked) {
                                                setEventEndAt("");
                                            }
                                        }}
                                    />
                                    <div className="w-11 h-6 bg-gray-300 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300/40 dark:peer-focus:ring-blue-800/60 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"></div>
                                </label>
                            </div>
                            <div className={`grid grid-cols-1 ${eventIsMultiDay ? "sm:grid-cols-2" : ""} gap-4`}>
                                <label>
                                    <span className="flex items-center gap-2 mb-2 ml-1 text-xs font-bold uppercase tracking-wider text-gray-700 dark:text-gray-300">
                                        <Icon name="calendar" className="w-4 h-4 text-blue-500" />
                                        {eventIsMultiDay ? t("field_datetime_start") : t("field_datetime")}
                                    </span>
                                    <input
                                        type="datetime-local"
                                        className="w-full bg-white dark:bg-black/40 border border-black/10 dark:border-white/10 rounded-xl px-4 py-4 text-base font-medium text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 transition-all outline-none shadow-sm"
                                        value={eventStartAt}
                                        onChange={(event) => setEventStartAt(event.target.value)}
                                    />
                                    <FieldMeta errorText={eventErrors.startAt ? t(eventErrors.startAt) : ""} />
                                </label>
                                {eventIsMultiDay ? (
                                    <label>
                                        <span className="flex items-center gap-2 mb-2 ml-1 text-xs font-bold uppercase tracking-wider text-gray-700 dark:text-gray-300">
                                            <Icon name="calendar" className="w-4 h-4 text-blue-500" />
                                            {t("field_datetime_end")}
                                        </span>
                                        <input
                                            type="datetime-local"
                                            className="w-full bg-white dark:bg-black/40 border border-black/10 dark:border-white/10 rounded-xl px-4 py-4 text-base font-medium text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 transition-all outline-none shadow-sm"
                                            value={eventEndAt}
                                            onChange={(event) => setEventEndAt(event.target.value)}
                                        />
                                        <FieldMeta errorText={eventErrors.endAt ? t(eventErrors.endAt) : ""} />
                                    </label>
                                ) : null}
                            </div>
                        </div>
                    )}

                    <label>
                        <span className="flex items-center gap-2 mb-2 ml-1 text-xs font-bold uppercase tracking-wider text-gray-700 dark:text-gray-300">
                            <Icon name="location" className="w-4 h-4 text-blue-500" />
                            {t("field_place")}
                        </span>
                        <input
                            type="text"
                            className="w-full bg-white dark:bg-black/40 border border-black/10 dark:border-white/10 rounded-xl px-4 py-4 text-base font-medium text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 transition-all outline-none shadow-sm"
                            value={eventLocationName}
                            onChange={(event) => setEventLocationName(event.target.value)}
                            placeholder={t("placeholder_place")}
                            list="wizard-place-options"
                        />
                    </label>

                    <label>
                        <span className="flex items-center gap-2 mb-2 ml-1 text-xs font-bold uppercase tracking-wider text-gray-700 dark:text-gray-300">
                            <Icon name="location" className="w-4 h-4 text-blue-500" />
                            {t("field_address")}
                        </span>
                        <input
                            type="text"
                            className="w-full bg-white dark:bg-black/40 border border-black/10 dark:border-white/10 rounded-xl px-4 py-4 text-base text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 transition-all outline-none shadow-sm"
                            value={eventLocationAddress}
                            onChange={(event) => setEventLocationAddress(event.target.value)}
                            placeholder={t("placeholder_address")}
                            autoComplete="off"
                            list="wizard-address-options"
                        />
                        {/* Lógica de Google Maps idéntica a tu vista avanzada... */}
                        {mapsStatus === "ready" && eventLocationAddress.trim().length >= 4 ? (
                            <ul className="mt-2 flex flex-col gap-1 bg-white dark:bg-gray-800 border border-black/10 dark:border-white/10 rounded-xl overflow-hidden shadow-lg" role="listbox" aria-label={t("address_suggestions")}>
                                {isAddressLoading ? <li className="w-full text-left px-4 py-3 text-xs text-gray-500 italic">{t("address_searching")}</li> : null}
                                {!isAddressLoading && addressPredictions.length === 0 ? (
                                    <li className="w-full text-left px-4 py-3 text-xs text-gray-500 italic">{t("address_no_matches")}</li>
                                ) : null}
                                {addressPredictions.map((prediction) => (
                                    <li key={prediction.place_id}>
                                        <button
                                            type="button"
                                            className="w-full text-left px-4 py-3 text-sm hover:bg-black/5 dark:hover:bg-white/5 text-gray-700 dark:text-gray-300 transition-colors flex items-center gap-3"
                                            onClick={() => handleSelectAddressPrediction(prediction)}
                                        >
                                            <Icon name="location" className="w-4 h-4 text-gray-400 dark:text-gray-500" />
                                            {prediction.description}
                                        </button>
                                    </li>
                                ))}
                            </ul>
                        ) : null}
                        {selectedPlace?.placeId ? (
                            <p className="text-xs font-bold text-green-600 dark:text-green-400 mt-2">{t("address_validated")}</p>
                        ) : null}
                    </label>

                    {typeof selectedPlace?.lat === "number" ? (
                        <div className="w-full h-48 rounded-xl overflow-hidden shadow-inner border border-black/5 dark:border-white/10 mt-2">
                            <iframe title={t("map_preview_title")} className="w-full h-full" src={getMapEmbedUrl(selectedPlace.lat, selectedPlace.lng)} loading="lazy" />
                        </div>
                    ) : null}

                    <label className="flex flex-row items-center gap-4 p-4 bg-white dark:bg-black/20 border border-black/10 dark:border-white/10 rounded-2xl cursor-pointer hover:border-blue-500/50 transition-colors shadow-sm">
                        <input type="checkbox" className="w-6 h-6 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600" checked={eventAllowPlusOne} onChange={(event) => setEventAllowPlusOne(event.target.checked)} />
                        <span className="text-base font-bold text-gray-900 dark:text-white flex-1">{t("event_setting_allow_plus_one")}</span>
                    </label>

                    <label className="flex flex-row items-center gap-4 p-4 bg-white dark:bg-black/20 border border-black/10 dark:border-white/10 rounded-2xl cursor-pointer hover:border-blue-500/50 transition-colors shadow-sm">
                        <input type="checkbox" className="w-6 h-6 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600" checked={eventAutoReminders} onChange={(event) => setEventAutoReminders(event.target.checked)} />
                        <span className="text-base font-bold text-gray-900 dark:text-white flex-1">{t("event_setting_auto_reminders")}</span>
                    </label>
                </div>

                <div className="flex justify-between items-center pt-6 border-t border-black/5 dark:border-white/5 mt-4">
                    {currentStep > 1 ? (
                        <button type="button" onClick={handleBack} className="text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white font-bold py-2 px-4 rounded-xl transition-colors flex items-center gap-2">
                            <Icon name="arrow-left" className="w-4 h-4" /> {t("wizard_btn_back")}
                        </button>
                    ) : <div />}

                    {currentStep < totalSteps ? (
                        <button type="button" onClick={handleNext} className="bg-gray-900 dark:bg-white text-white dark:text-gray-900 font-bold py-3 px-8 rounded-xl shadow-md hover:scale-105 transition-all flex items-center gap-2">
                            {t("wizard_btn_next")} <Icon name="arrow-right" className="w-4 h-4" />
                        </button>
                    ) : (
                        <button className="bg-blue-600 hover:bg-blue-700 text-white font-black py-3 px-8 rounded-xl shadow-md transition-all w-full sm:w-auto flex justify-center items-center gap-2 disabled:opacity-50" type="button" onClick={handleFinalSave} disabled={isSavingEvent}>
                            <Icon name="check" className="w-5 h-5" />
                            {isSavingEvent ? t("saving_event") : t("wizard_btn_save")}
                        </button>
                    )}
                </div>
                <InlineMessage text={eventMessage} />

                <datalist id="wizard-place-options">
                    {locationNameOptions?.map((opt) => <option key={opt} value={opt} />)}
                </datalist>
                <datalist id="wizard-address-options">
                    {locationAddressOptions?.map((opt) => <option key={opt} value={opt} />)}
                </datalist>
            </form>
        </div>
    );
}
