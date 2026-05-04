import React from "react";
import { Icon } from "../../../components/icons";
import { FieldMeta } from "../../../components/field-meta";
import { InlineMessage } from "../../../components/inline-message";

export function InvitationBuilderView({
    t,
    handleCreateInvitation,
    selectedEventId,
    setSelectedEventId,
    events,
    invitationErrors,
    selectedGuestId,
    setSelectedGuestId,
    guests,
    allGuestsAlreadyInvitedForSelectedEvent,
    invitedGuestIdsForSelectedEvent,
    bulkInvitationSearch,
    setBulkInvitationSearch,
    INVITATION_BULK_SEGMENTS,
    bulkInvitationSegment,
    setBulkInvitationSegment,
    bulkSegmentCounts,
    handleSelectVisibleBulkGuests,
    bulkFilteredGuests,
    handleClearBulkGuests,
    bulkInvitationGuestIds,
    toggleBulkInvitationGuest,
    invitationBulkGroups,
    selectedBulkInvitationGroupId,
    handleSelectBulkInvitationGroup,
    isCreatingInvitation,
    handleCreateBulkInvitations,
    isCreatingBulkInvitations,
    invitationMessage,
    lastInvitationUrl,
    handleCopyInvitationLink,
    lastInvitationShareText,
    handleCopyInvitationMessage,
    lastInvitationWhatsappUrl,
    lastInvitationEmailUrl
}) {
    return (
        <form className="bg-white/50 dark:bg-gray-900/50 backdrop-blur-xl border border-black/10 dark:border-white/10 rounded-3xl shadow-2xl p-5 md:p-8 flex flex-col gap-6 w-full max-w-4xl mx-auto" onSubmit={handleCreateInvitation} noValidate>

            {/* SELECCIÓN DE EVENTO Y GUEST (MODO INDIVIDUAL) */}
            <section className="bg-white/40 dark:bg-black/20 rounded-2xl border border-black/5 dark:border-white/5 p-5 flex flex-col gap-5 shadow-inner">
                <div className="flex items-center gap-2 mb-2 border-b border-black/5 dark:border-white/10 pb-3">
                    <Icon name="user" className="w-5 h-5 text-blue-500" />
                    <h3 className="text-sm font-bold text-gray-900 dark:text-white uppercase tracking-wider">{t("create_invitation_title")}</h3>
                </div>

                <div className="bg-white dark:bg-gray-800 rounded-2xl border border-black/5 dark:border-white/10 overflow-hidden shadow-sm">
                    <label className="flex flex-col gap-1 px-4 py-3.5 border-b border-black/5 dark:border-white/5">
                        <span className="text-[10px] font-bold uppercase tracking-widest text-gray-500 dark:text-gray-400">{t("field_event")}</span>
                        <select
                            className="bg-transparent outline-none text-sm text-gray-900 dark:text-white w-full cursor-pointer disabled:opacity-50"
                            value={selectedEventId}
                            onChange={(event) => setSelectedEventId(event.target.value)}
                            disabled={!events.length}
                            aria-invalid={Boolean(invitationErrors.eventId)}
                        >
                            {!events.length ? <option value="">{t("select_event_first")}</option> : null}
                            {events.map((eventItem) => (
                                <option key={eventItem.id} value={eventItem.id}>
                                    {eventItem.title}
                                </option>
                            ))}
                        </select>
                    </label>
                    <label className="flex flex-col gap-1 px-4 py-3.5">
                        <span className="text-[10px] font-bold uppercase tracking-widest text-gray-500 dark:text-gray-400">{t("field_guest")}</span>
                        <select
                            className="bg-transparent outline-none text-sm text-gray-900 dark:text-white w-full cursor-pointer disabled:opacity-50"
                            value={selectedGuestId}
                            onChange={(event) => setSelectedGuestId(event.target.value)}
                            disabled={!guests.length || allGuestsAlreadyInvitedForSelectedEvent}
                            aria-invalid={Boolean(invitationErrors.guestId)}
                        >
                            {!guests.length ? <option value="">{t("select_guest_first")}</option> : null}
                            {allGuestsAlreadyInvitedForSelectedEvent ? (
                                <option value="">{t("invitation_all_guests_already_invited")}</option>
                            ) : null}
                            {guests.map((guestItem) => (
                                <option
                                    key={guestItem.id}
                                    value={guestItem.id}
                                    disabled={invitedGuestIdsForSelectedEvent.has(guestItem.id)}
                                >
                                    {guestItem.first_name} {guestItem.last_name || ""}
                                    {invitedGuestIdsForSelectedEvent.has(guestItem.id)
                                        ? ` (${t("invitation_guest_already_invited_tag")})`
                                        : ""}
                                </option>
                            ))}
                        </select>
                    </label>
                </div>

                <FieldMeta
                    helpText={
                        allGuestsAlreadyInvitedForSelectedEvent
                            ? t("invitation_all_guests_already_invited")
                            : `${t("hint_invitation_public")} ${t("invitation_guest_tag_hint")}`
                    }
                    errorText={
                        invitationErrors.eventId ? t(invitationErrors.eventId) : invitationErrors.guestId ? t(invitationErrors.guestId) : ""
                    }
                />

                <div className="flex justify-end pt-2">
                    <button
                        className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2.5 px-6 rounded-xl shadow-sm transition-all w-full sm:w-auto flex justify-center items-center gap-2 disabled:opacity-50"
                        type="submit"
                        disabled={isCreatingInvitation || !events.length || !guests.length || allGuestsAlreadyInvitedForSelectedEvent}
                    >
                        <Icon name="mail" className="w-4 h-4" />
                        {isCreatingInvitation ? t("generating_invitation") : t("generate_rsvp")}
                    </button>
                </div>
            </section>

            {/* PANEL DE INVITACIONES MASIVAS */}
            <section id="invitation-bulk-panel" className="bg-white/50 dark:bg-white/5 rounded-2xl border border-black/5 dark:border-white/10 p-5 flex flex-col gap-5 shadow-sm">
                <div className="flex flex-col gap-1 border-b border-black/5 dark:border-white/10 pb-3">
                    <p className="flex items-center gap-2 text-sm font-bold text-gray-900 dark:text-white uppercase tracking-wider">
                        <Icon name="users" className="w-5 h-5 text-purple-500" />
                        {t("invitation_bulk_title")}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">{t("invitation_bulk_hint")}</p>
                </div>

                {/* Filtros y Búsqueda */}
                <div className="flex flex-col gap-4">
                    <div className="bg-white dark:bg-gray-800 rounded-2xl border border-black/5 dark:border-white/10 overflow-hidden shadow-sm">
                        <label className="flex flex-col gap-1 px-4 py-3.5 border-b border-black/5 dark:border-white/5">
                            <span className="text-[10px] font-bold uppercase tracking-widest text-gray-500 dark:text-gray-400">
                                {t("invitation_bulk_group_label")}
                            </span>
                            <select
                                className="bg-transparent outline-none text-sm text-gray-900 dark:text-white w-full cursor-pointer disabled:opacity-50"
                                value={selectedBulkInvitationGroupId}
                                onChange={(event) => handleSelectBulkInvitationGroup(event.target.value)}
                                disabled={!events.length || allGuestsAlreadyInvitedForSelectedEvent || invitationBulkGroups.length === 0}
                            >
                                <option value="">{t("invitation_bulk_group_placeholder")}</option>
                                {invitationBulkGroups.map((groupItem) => (
                                    <option key={groupItem.id} value={groupItem.id}>
                                        {groupItem.name}
                                    </option>
                                ))}
                            </select>
                        </label>
                        <label className="flex flex-col gap-1 px-4 py-3.5">
                            <span className="text-[10px] font-bold uppercase tracking-widest text-gray-500 dark:text-gray-400">{t("search")}</span>
                            <input
                                type="search"
                                className="bg-transparent outline-none text-sm text-gray-900 dark:text-white w-full placeholder:text-gray-400 dark:placeholder:text-gray-600"
                                value={bulkInvitationSearch}
                                onChange={(event) => setBulkInvitationSearch(event.target.value)}
                                placeholder={t("invitation_bulk_search_placeholder")}
                                disabled={!events.length || allGuestsAlreadyInvitedForSelectedEvent}
                            />
                        </label>
                    </div>

                    {invitationBulkGroups.length === 0 ? (
                        <p className="text-[11px] text-gray-500 dark:text-gray-400">
                            {t("invitation_bulk_group_empty_hint")}
                        </p>
                    ) : null}

                    <div className="flex flex-col gap-2">
                        <div className="flex flex-wrap gap-2" role="group" aria-label={t("invitation_bulk_segment_label")}>
                            {INVITATION_BULK_SEGMENTS.map((segmentKey) => (
                                <button
                                    key={segmentKey}
                                    className={`px-3 py-2 rounded-full text-[11px] font-bold transition-all shadow-sm border ${bulkInvitationSegment === segmentKey ? "bg-gray-800 dark:bg-white text-white dark:text-gray-900 border-gray-900 dark:border-white" : "bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 border-black/5 dark:border-white/10 hover:bg-gray-50 dark:hover:bg-gray-700"}`}
                                    type="button"
                                    aria-pressed={bulkInvitationSegment === segmentKey}
                                    onClick={() => setBulkInvitationSegment(segmentKey)}
                                >
                                    {t(`invitation_bulk_segment_${segmentKey}`)} ({bulkSegmentCounts[segmentKey] || 0})
                                </button>
                            ))}
                        </div>
                        <p className="text-[10px] text-gray-400 uppercase tracking-wider font-bold ml-1">{t("invitation_bulk_segment_hint")}</p>
                    </div>
                </div>

                {/* Controles de Selección */}
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-black/5 dark:bg-white/5 p-3 rounded-xl border border-black/5 dark:border-white/10">
                    <p className="text-xs font-medium text-gray-700 dark:text-gray-300">
                        {t("invitation_bulk_selected_count")} <strong className="text-blue-600 dark:text-blue-400">{bulkInvitationGuestIds.length}</strong> - {t("results_count")} {bulkFilteredGuests.length}
                    </p>
                    <div className="flex flex-wrap gap-2 w-full sm:w-auto">
                        <button
                            className="bg-white hover:bg-gray-50 dark:bg-gray-800 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-200 border border-black/10 dark:border-white/10 font-bold py-2 px-3 rounded-lg transition-all text-[11px] disabled:opacity-50 shadow-sm flex-1 sm:flex-none text-center"
                            type="button"
                            onClick={handleSelectVisibleBulkGuests}
                            disabled={bulkFilteredGuests.length === 0 || allGuestsAlreadyInvitedForSelectedEvent}
                        >
                            {t("invitation_bulk_select_visible")}
                        </button>
                        <button
                            className="bg-red-50 hover:bg-red-100 text-red-600 dark:bg-red-900/20 dark:hover:bg-red-900/40 dark:text-red-400 border border-red-200 dark:border-red-900/30 font-bold py-2 px-3 rounded-lg transition-all text-[11px] disabled:opacity-50 shadow-sm flex-1 sm:flex-none text-center"
                            type="button"
                            onClick={handleClearBulkGuests}
                            disabled={bulkInvitationGuestIds.length === 0}
                        >
                            {t("invitation_bulk_clear_selection")}
                        </button>
                    </div>
                </div>

                {/* Lista de Invitados Candidatos */}
                {!events.length || allGuestsAlreadyInvitedForSelectedEvent ? (
                    <div className="p-8 border border-dashed border-black/10 dark:border-white/10 rounded-2xl flex items-center justify-center">
                        <p className="text-sm text-gray-400 italic text-center">{t("invitation_all_guests_already_invited")}</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-[350px] overflow-y-auto pr-2 scrollbar-thin" role="group" aria-label={t("invitation_bulk_title")}>
                        {bulkFilteredGuests.slice(0, 20).map((guestItem) => {
                            const guestLabel = `${guestItem.first_name || ""} ${guestItem.last_name || ""}`.trim() || t("field_guest");
                            const isSelected = bulkInvitationGuestIds.includes(guestItem.id);
                            return (
                                <label key={guestItem.id} className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-colors ${isSelected ? "bg-blue-50/50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800/50" : "bg-white/40 dark:bg-black/20 border-black/5 dark:border-white/5 hover:bg-white/60 dark:hover:bg-white/5"}`}>
                                    <input
                                        type="checkbox"
                                        className="w-4 h-4 text-blue-600 bg-white border-gray-300 rounded focus:ring-blue-500 dark:focus:ring-blue-600 dark:ring-offset-gray-800 focus:ring-2 dark:bg-gray-700 dark:border-gray-600 cursor-pointer"
                                        checked={isSelected}
                                        onChange={() => toggleBulkInvitationGuest(guestItem.id)}
                                    />
                                    <div className="flex flex-col min-w-0">
                                        <strong className={`text-sm font-bold truncate ${isSelected ? "text-blue-900 dark:text-blue-100" : "text-gray-900 dark:text-white"}`}>{guestLabel}</strong>
                                        <span className={`text-[11px] truncate ${isSelected ? "text-blue-700/80 dark:text-blue-300/80" : "text-gray-500 dark:text-gray-400"}`}>{guestItem.email || guestItem.phone || "-"}</span>
                                    </div>
                                </label>
                            );
                        })}
                        {bulkFilteredGuests.length > 20 ? (
                            <p className="col-span-1 sm:col-span-2 text-xs font-bold uppercase tracking-wider text-gray-400 text-center py-3">
                                {t("contact_import_preview_more")} {bulkFilteredGuests.length - 20}
                            </p>
                        ) : null}
                    </div>
                )}

                <div className="flex justify-end pt-2 border-t border-black/5 dark:border-white/10">
                    <button
                        className="bg-purple-100 hover:bg-purple-200 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300 dark:hover:bg-purple-900/50 border border-purple-200 dark:border-purple-800/30 font-bold py-2.5 px-6 rounded-xl shadow-sm transition-all w-full sm:w-auto flex justify-center items-center gap-2 disabled:opacity-50"
                        type="button"
                        onClick={handleCreateBulkInvitations}
                        disabled={isCreatingBulkInvitations || !events.length || bulkInvitationGuestIds.length === 0}
                    >
                        <Icon name="check" className="w-4 h-4" />
                        {isCreatingBulkInvitations ? t("invitation_bulk_creating") : t("invitation_bulk_create_button")}
                    </button>
                </div>
            </section>

            <InlineMessage text={invitationMessage} />

            {/* RESULTADO Y LINKS (Aparece tras generar RSVP) */}
            {lastInvitationUrl ? (
                <section className="bg-green-50/80 dark:bg-green-900/20 border border-green-200 dark:border-green-800/50 rounded-2xl p-5 md:p-6 flex flex-col gap-5 shadow-sm animate-in fade-in slide-in-from-bottom-4 duration-500">
                    <div className="flex items-center gap-2 text-green-800 dark:text-green-400 mb-1 border-b border-green-200/50 dark:border-green-800/30 pb-3">
                        <Icon name="check" className="w-5 h-5" />
                        <h4 className="text-sm font-bold uppercase tracking-wider">{t("invitation_created")}</h4>
                    </div>

                    <div className="flex flex-col gap-2">
                        <p className="text-[10px] font-bold uppercase tracking-wider text-green-700 dark:text-green-500 ml-1">{t("invitation_link_label")}</p>
                        <div className="flex flex-col sm:flex-row gap-2">
                            <input className="w-full bg-white dark:bg-black/40 border border-green-200 dark:border-green-800/50 rounded-xl px-4 py-2.5 text-sm text-gray-900 dark:text-white outline-none shadow-sm" value={lastInvitationUrl} readOnly />
                            <div className="flex gap-2 shrink-0">
                                <button className="bg-white hover:bg-gray-50 dark:bg-gray-800 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-200 border border-black/10 dark:border-white/10 font-bold py-2.5 px-4 rounded-xl transition-all text-xs shadow-sm flex items-center justify-center flex-1 sm:flex-none" type="button" onClick={() => handleCopyInvitationLink(lastInvitationUrl)} aria-label={t("copy_link")} title={t("copy_link")}>
                                    <Icon name="copy" className="w-3.5 h-3.5" />
                                </button>
                                <a className="bg-white hover:bg-gray-50 dark:bg-gray-800 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-200 border border-black/10 dark:border-white/10 font-bold py-2.5 px-4 rounded-xl transition-all text-xs shadow-sm flex items-center justify-center gap-1.5 flex-1 sm:flex-none" href={lastInvitationUrl} target="_blank" rel="noreferrer">
                                    {t("open_rsvp")}
                                    <Icon name="arrow_right" className="w-3.5 h-3.5" />
                                </a>
                            </div>
                        </div>
                    </div>

                    {lastInvitationShareText ? (
                        <div className="flex flex-col gap-2 pt-2 border-t border-green-200/50 dark:border-green-800/30">
                            <p className="text-[10px] font-bold uppercase tracking-wider text-green-700 dark:text-green-500 ml-1">{t("invitation_share_message_label")}</p>
                            <textarea className="w-full bg-white dark:bg-black/40 border border-green-200 dark:border-green-800/50 rounded-xl px-4 py-3 text-sm text-gray-900 dark:text-white outline-none resize-none shadow-sm font-sans" value={lastInvitationShareText} readOnly rows={5} />

                            <div className="flex flex-wrap items-center gap-2 mt-2">
                                <button
                                    className="bg-white hover:bg-gray-50 dark:bg-gray-800 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-200 border border-black/10 dark:border-white/10 font-bold py-2.5 px-4 rounded-xl transition-all text-xs shadow-sm flex items-center gap-1.5"
                                    type="button"
                                    onClick={() => handleCopyInvitationMessage(lastInvitationShareText)}
                                >
                                    <Icon name="copy" className="w-3.5 h-3.5" />
                                    {t("invitation_copy_message")}
                                </button>

                                {lastInvitationWhatsappUrl ? (
                                    <a className="bg-[#25D366]/10 hover:bg-[#25D366]/20 text-[#128C7E] dark:text-[#25D366] border border-[#25D366]/30 font-bold py-2.5 px-4 rounded-xl transition-all text-xs shadow-sm flex items-center gap-1.5" href={lastInvitationWhatsappUrl} target="_blank" rel="noreferrer">
                                        <Icon name="message" className="w-3.5 h-3.5" />
                                        {t("invitation_open_whatsapp")}
                                    </a>
                                ) : null}

                                {lastInvitationEmailUrl ? (
                                    <a className="bg-blue-50 hover:bg-blue-100 text-blue-700 dark:bg-blue-900/20 dark:hover:bg-blue-900/40 dark:text-blue-400 border border-blue-200 dark:border-blue-800/30 font-bold py-2.5 px-4 rounded-xl transition-all text-xs shadow-sm flex items-center gap-1.5" href={lastInvitationEmailUrl}>
                                        <Icon name="mail" className="w-3.5 h-3.5" />
                                        {t("invitation_open_email")}
                                    </a>
                                ) : null}
                            </div>
                        </div>
                    ) : null}
                </section>
            ) : null}
        </form>
    );
}
