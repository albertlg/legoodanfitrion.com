import React from "react";
import { useState } from "react";
import { Icon } from "../../../components/icons";
import { AvatarCircle } from "../../../components/avatar-circle";
import { getInitials } from "../../../lib/formatters";

export function InvitationsListView({
    t,
    language,
    invitationSearch,
    setInvitationSearch,
    invitationSort,
    setInvitationSort,
    invitationPageSize,
    setInvitationPageSize,
    INVITATIONS_PAGE_SIZE_DEFAULT,
    PAGE_SIZE_OPTIONS = [8, 16, 32, 64],
    invitationEventFilter,
    setInvitationEventFilter,
    invitationEventOptions,
    invitationStatusFilter,
    setInvitationStatusFilter,
    filteredInvitations,
    invitationMessage,
    openWorkspace,
    pagedInvitations,
    eventNamesById,
    guestNamesById,
    guestsById,
    eventsById,
    buildInvitationSharePayload,
    buildAppUrl,
    getGuestAvatarUrl,
    openGuestDetail,
    openEventDetail,
    formatDate,
    statusClass,
    statusText,
    handlePrepareInvitationShare,
    handleCopyInvitationLink,
    handleRequestDeleteInvitation,
    invitationPage,
    invitationTotalPages,
    setInvitationPage
}) {
    const [openDropdownId, setOpenDropdownId] = useState(null);
    return (
        <section className="bg-white/40 dark:bg-gray-900/40 backdrop-blur-xl rounded-3xl border border-black/10 dark:border-white/10 shadow-sm flex flex-col">
            {/* 1. TOOLBAR: Buscador, Filtro por Evento y Ordenación (PATRÓN UNIFICADO) */}
            <div className="flex flex-col md:flex-row gap-4 p-5 md:items-end justify-between border-b border-black/5 dark:border-white/10 bg-white/20 dark:bg-black/10">
                <div className="flex flex-col md:flex-row gap-4 flex-1">
                    <label className="flex flex-col flex-1 max-w-sm">
                        <span className="block text-[10px] font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-1.5">{t("search")}</span>
                        <div className="relative">
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
                                <Icon name="search" className="w-4 h-4" />
                            </span>
                            <input
                                type="search"
                                value={invitationSearch}
                                onChange={(event) => setInvitationSearch(event.target.value)}
                                placeholder={t("search_invitations_placeholder")}
                                className="w-full bg-white/5 dark:bg-black/20 border border-black/10 dark:border-white/10 rounded-xl pl-9 pr-4 py-2.5 text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500/20 transition-all"
                            />
                        </div>
                    </label>

                    <label className="flex flex-col flex-1 max-w-sm">
                        <span className="block text-[10px] font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-1.5">{t("field_event")}</span>
                        <select
                            value={invitationEventFilter}
                            onChange={(event) => setInvitationEventFilter(event.target.value)}
                            className="w-full bg-white/5 dark:bg-black/20 border border-black/10 dark:border-white/10 rounded-xl px-4 py-2.5 text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500/20 transition-all appearance-none cursor-pointer"
                        >
                            <option value="all">{t("all_events")}</option>
                            {invitationEventOptions.map((eventOption) => (
                                <option key={`invitation-filter-event-${eventOption.id}`} value={eventOption.id}>
                                    {eventOption.title}
                                </option>
                            ))}
                        </select>
                    </label>
                </div>

                <div className="flex flex-wrap gap-3 items-end">
                    <label className="flex flex-col">
                        <span className="block text-[10px] font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-1.5">{t("sort_by")}</span>
                        <select
                            value={invitationSort}
                            onChange={(event) => setInvitationSort(event.target.value)}
                            className="w-full bg-white/5 dark:bg-black/20 border border-black/10 dark:border-white/10 rounded-xl px-4 py-2.5 text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500/20 transition-all appearance-none cursor-pointer"
                        >
                            <option value="created_desc">{t("sort_created_desc")}</option>
                            <option value="created_asc">{t("sort_created_asc")}</option>
                            <option value="responded_desc">{t("sort_responded_desc")}</option>
                            <option value="responded_asc">{t("sort_responded_asc")}</option>
                        </select>
                    </label>
                    <label className="flex flex-col">
                        <span className="block text-[10px] font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-1.5">{t("pagination_items_per_page")}</span>
                        <select
                            value={invitationPageSize}
                            onChange={(event) => setInvitationPageSize(Number(event.target.value) || INVITATIONS_PAGE_SIZE_DEFAULT)}
                            className="w-full bg-white/5 dark:bg-black/20 border border-black/10 dark:border-white/10 rounded-xl px-4 py-2.5 text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500/20 transition-all appearance-none cursor-pointer"
                        >
                            {PAGE_SIZE_OPTIONS.map((optionValue) => (
                                <option key={optionValue} value={optionValue}>
                                    {optionValue}
                                </option>
                            ))}
                        </select>
                    </label>
                </div>
            </div>

            {/* 2. PESTAÑAS DE FILTRO Y RESULTADOS (SIEMPRE 2 FILAS - PATRÓN UNIFICADO) */}
            <div className="flex flex-col px-5 py-4 border-b border-black/5 dark:border-white/10 bg-black/5 dark:bg-white/5">
                <div className="flex flex-wrap gap-2 items-center" role="group" aria-label={t("filter_status")}>
                    {[
                        { key: "all", label: t("all_status") },
                        { key: "pending", label: t("status_pending") },
                        { key: "yes", label: t("status_yes") },
                        { key: "maybe", label: t("status_maybe") },
                        { key: "no", label: t("status_no") }
                    ].map((statusOption) => {
                        const isActive = invitationStatusFilter === statusOption.key;
                        return (
                            <button
                                key={statusOption.key}
                                className={isActive
                                    ? "bg-gray-600 text-white px-3 py-1.5 rounded-lg text-xs font-medium transition-colors"
                                    : "text-gray-600 dark:text-gray-400 hover:bg-black/5 dark:hover:bg-white/5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors"
                                }
                                type="button"
                                aria-pressed={isActive}
                                onClick={() => setInvitationStatusFilter(statusOption.key)}
                            >
                                {statusOption.label}
                            </button>
                        );
                    })}
                </div>

                <h3 className="text-xs font-bold uppercase tracking-wider text-gray-900 dark:text-white mt-6 mb-4">
                    {t("results_count")}: {filteredInvitations.length}
                </h3>
            </div>

            {invitationMessage && (
                <div className="px-5 py-3 border-b border-black/5 dark:border-white/10 bg-black/5 dark:bg-white/5">
                    <div className="p-3 bg-blue-50 dark:bg-blue-900/20 text-blue-800 dark:text-blue-300 border border-blue-200 dark:border-blue-800/50 rounded-xl text-sm">
                        {invitationMessage}
                    </div>
                </div>
            )}

            {/* 3. TABLA / LISTA (FLEXBOX EDITION - PATRÓN UNIFICADO) */}
            <div className="flex flex-col relative">
                {filteredInvitations.length === 0 ? (
                    <div className="px-5 py-16 text-center flex flex-col items-center justify-center gap-2">
                        <div className="w-12 h-12 rounded-full bg-black/5 dark:bg-white/5 flex items-center justify-center mb-2">
                            <Icon name="mail" className="w-6 h-6 text-gray-400" />
                        </div>
                        <p className="text-gray-500 font-medium">{t("no_invitations")}</p>
                        <div className="mt-4">
                            <button className="px-5 py-2.5 bg-gray-900 hover:bg-black dark:bg-white dark:hover:bg-gray-100 text-white dark:text-gray-900 rounded-xl text-sm font-bold shadow-sm transition-all flex items-center gap-2" type="button" onClick={() => openWorkspace("invitations", "create")}>
                                <Icon name="plus" className="w-4 h-4" />
                                {t("quick_create_invitation")}
                            </button>
                        </div>
                    </div>
                ) : (
                    <div className="w-full">
                        <div className="w-full">
                            <table className="w-full text-left border-collapse block md:table table-fixed">
                                <thead className="hidden md:table-header-group">
                                    <tr>
                                        <th className="w-[30%] py-4 px-4 text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400 border-b border-black/5 dark:border-white/10">{t("field_guest")}</th>
                                        <th className="w-[30%] py-4 px-4 text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400 border-b border-black/5 dark:border-white/10">{t("field_event")}</th>
                                        <th className="w-[7%] py-4 px-4 text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400 border-b border-black/5 dark:border-white/10">{t("status")}</th>
                                        <th className="w-[15%] py-4 px-4 text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400 border-b border-black/5 dark:border-white/10">{t("created")}</th>
                                        <th className="w-[18%] py-4 px-4 text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400 border-b border-black/5 dark:border-white/10 text-right">{t("actions_label")}</th>
                                    </tr>
                                </thead>
                                <tbody className="block md:table-row-group divide-y-0 md:divide-y divide-black/5 dark:divide-white/5">
                                    {pagedInvitations.map((invitation, index, array) => {
                                        const isLastRows = index >= array.length - 3;
                                        const eventName = eventNamesById[invitation.event_id] || invitation.event_id;
                                        const guestName = guestNamesById[invitation.guest_id] || invitation.guest_id;
                                        const guestItem = guestsById[invitation.guest_id] || null;
                                        const eventItem = eventsById[invitation.event_id] || null;
                                        const sharePayload = buildInvitationSharePayload(invitation);
                                        const url = sharePayload?.url || buildAppUrl(`/rsvp/${encodeURIComponent(invitation.public_token)}`);
                                        const itemLabel = `${eventName || t("field_event")} - ${guestName || t("field_guest")}`;
                                        const invitationStatus = String(invitation.status || "pending").toLowerCase();

                                        const mobileRsvpLabel =
                                            invitationStatus === "pending"
                                                ? t("invitation_mobile_rsvp_respond_now")
                                                : t("invitation_mobile_rsvp_view_response");

                                        const invitationActionHint =
                                            invitationStatus === "pending"
                                                ? t("invitation_action_hint_pending")
                                                : invitationStatus === "no"
                                                    ? t("invitation_action_hint_declined")
                                                    : t("invitation_action_hint_review");

                                        return (
                                            <tr key={invitation.id} className="block md:table-row flex flex-col mb-4 md:mb-0 p-4 md:p-0 rounded-2xl md:rounded-none border border-black/10 dark:border-white/10 md:border-transparent md:border-b bg-white/40 dark:bg-white/5 md:bg-transparent shadow-sm md:shadow-none transition-colors group">
                                                {/* Guest Info */}
                                                <td className="text-sm text-gray-900 dark:text-white align-middle block md:table-cell flex items-center justify-between py-2 md:py-3 px-0 md:px-4 border-b border-black/5 dark:border-white/5 md:border-none last:border-0">
                                                    <div className="flex items-center gap-3">
                                                        <AvatarCircle
                                                            className="shrink-0 shadow-sm"
                                                            label={guestName}
                                                            fallback={getInitials(guestName, "IN")}
                                                            imageUrl={getGuestAvatarUrl(guestItem, guestName)}
                                                            size={40}
                                                        />
                                                        <div className="flex flex-col min-w-0">
                                                            <button
                                                                className="font-bold text-[15px] text-gray-900 dark:text-white hover:text-blue-600 dark:hover:text-blue-400 truncate max-w-[200px] sm:max-w-xs text-left transition-colors focus:outline-none"
                                                                type="button"
                                                                onClick={() => openGuestDetail(invitation.guest_id)}
                                                            >
                                                                {guestName}
                                                            </button>
                                                            <p className="text-xs text-gray-500 dark:text-gray-400 truncate max-w-[200px] sm:max-w-xs block">
                                                                {guestItem?.email || guestItem?.phone || "—"}
                                                            </p>
                                                        </div>
                                                    </div>
                                                </td>

                                                {/* Event Info */}
                                                <td className="text-sm text-gray-600 dark:text-gray-400 align-middle block md:table-cell flex items-center justify-between py-2 md:py-3 px-0 md:px-4 border-b border-black/5 dark:border-white/5 md:border-none last:border-0">
                                                    <div className="flex flex-col justify-center">
                                                        <button
                                                            className="font-bold text-sm text-gray-900 dark:text-white hover:text-blue-600 dark:hover:text-blue-400 truncate max-w-[200px] sm:max-w-xs text-left transition-colors focus:outline-none mb-0.5"
                                                            type="button"
                                                            onClick={() => openEventDetail(invitation.event_id)}
                                                        >
                                                            {eventName}
                                                        </button>
                                                        <p className="text-[11px] text-gray-500 dark:text-gray-400 font-medium truncate uppercase tracking-wider">
                                                            {eventItem?.start_at ? formatDate(eventItem.start_at, language, t("no_date")) : t("no_date")}
                                                        </p>
                                                    </div>
                                                </td>

                                                {/* Status */}
                                                <td className="text-sm text-gray-900 dark:text-white align-middle block md:table-cell flex items-center justify-between py-2 md:py-3 px-0 md:px-4 border-b border-black/5 dark:border-white/5 md:border-none last:border-0">
                                                    <span className={statusClass(invitation.status)}>{statusText(t, invitation.status)}</span>
                                                </td>

                                                {/* Created */}
                                                <td className="text-sm text-gray-900 dark:text-white align-middle min-w-[120px] block md:table-cell flex items-center justify-between py-2 md:py-3 px-0 md:px-4 border-b border-black/5 dark:border-white/5 md:border-none last:border-0">
                                                    <div className="flex flex-col justify-center gap-1">
                                                        <p className="text-xs text-gray-900 dark:text-white font-medium">
                                                            {formatDate(invitation.created_at, language, t("no_date"))}
                                                        </p>
                                                        <p className={`text-[10px] font-bold uppercase tracking-wider break-words whitespace-normal ${invitationStatus === "pending" ? "text-yellow-600 dark:text-yellow-400" :
                                                            invitationStatus === "no" ? "text-red-600 dark:text-red-400" : "text-green-600 dark:text-green-400"
                                                            }`}>
                                                            {invitationActionHint}
                                                        </p>
                                                    </div>
                                                </td>

                                                {/* Actions */}
                                                <td className="align-middle block md:table-cell py-2 md:py-3 px-0 md:px-4 border-b border-black/5 dark:border-white/5 md:border-none last:border-0 relative">
                                                    <div className="flex items-center justify-end gap-1 w-full relative">
                                                        <button
                                                            className="inline-flex items-center justify-center px-2 py-1.5 w-full max-w-[100px] min-h-[32px] text-xs font-bold rounded-xl border transition-all bg-green-100 text-green-800 border-green-300 hover:bg-green-200 dark:bg-green-500/20 dark:text-green-300 dark:border-green-500/40 dark:hover:bg-green-500/30 shrink-0"
                                                            type="button"
                                                            onClick={() => {
                                                                const prepared = handlePrepareInvitationShare(invitation);
                                                                if (prepared?.whatsappUrl) {
                                                                    window.open(prepared.whatsappUrl, "_blank", "noopener,noreferrer");
                                                                }
                                                            }}
                                                            title={t("host_invite_whatsapp_action") || "Enviar per WhatsApp"}
                                                        >
                                                            WhatsApp
                                                        </button>
                                                        <a
                                                            className="p-1.5 text-gray-500 hover:text-gray-900 hover:bg-gray-100 dark:hover:bg-gray-800 dark:hover:text-white rounded-lg transition-colors flex items-center justify-center shrink-0"
                                                            href={url}
                                                            target="_blank"
                                                            rel="noreferrer"
                                                            aria-label={mobileRsvpLabel}
                                                            title={mobileRsvpLabel}
                                                        >
                                                            <Icon name="eye" className="w-4 h-4" />
                                                        </a>

                                                        {/* CONTENEDOR DEL MENÚ DESPLEGABLE */}
                                                        <div
                                                            className="relative shrink-0"
                                                            onMouseEnter={() => setOpenDropdownId(invitation.id)}
                                                            onMouseLeave={() => setOpenDropdownId(null)}
                                                        >
                                                            <button
                                                                className={`p-1.5 rounded-lg transition-colors focus:outline-none ${openDropdownId === invitation.id ? "text-gray-900 bg-gray-200 dark:bg-gray-700 dark:text-white" : "text-gray-500 hover:text-gray-900 hover:bg-gray-100 dark:hover:bg-gray-800 dark:hover:text-white"}`}
                                                                type="button"
                                                                aria-label={t("open_menu")}
                                                                title={t("actions_label")}
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    setOpenDropdownId(openDropdownId === invitation.id ? null : invitation.id);
                                                                }}
                                                            >
                                                                <Icon name="more_horizontal" className="w-4 h-4" />
                                                            </button>

                                                            {/* Renderizado condicional del menú */}
                                                            {openDropdownId === invitation.id && (
                                                                <>
                                                                    {/* Capa invisible para cerrar el menú en móvil */}
                                                                    <div
                                                                        className="fixed inset-0 z-[90] md:hidden"
                                                                        onClick={(e) => {
                                                                            e.stopPropagation();
                                                                            setOpenDropdownId(null);
                                                                        }}
                                                                    ></div>

                                                                    {/* Menú Dropdown con Z-Index y alineación corregida */}
                                                                    <div
                                                                        className={`absolute left-auto right-0 w-56 bg-white/90 dark:bg-gray-800/95 backdrop-blur-xl border border-black/10 dark:border-white/10 rounded-xl shadow-2xl z-[100] py-1 ${isLastRows ? "bottom-full mb-2 origin-bottom-right" : "top-full mt-1 origin-top-right"}`}
                                                                        onClick={() => setOpenDropdownId(null)}
                                                                    >
                                                                        <button
                                                                            className="w-full flex items-center gap-3 px-3 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700/50 hover:text-gray-900 dark:hover:text-white text-left transition-colors"
                                                                            type="button"
                                                                            onClick={() => {
                                                                                const prepared = handlePrepareInvitationShare(invitation);
                                                                                if (prepared?.mailtoUrl) {
                                                                                    window.open(prepared.mailtoUrl, "_blank", "noopener,noreferrer");
                                                                                }
                                                                            }}
                                                                        >
                                                                            <Icon name="mail" className="w-4 h-4" />
                                                                            <span>{t("invitation_open_email")}</span>
                                                                        </button>
                                                                        <button
                                                                            className="w-full flex items-center gap-3 px-3 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700/50 hover:text-gray-900 dark:hover:text-white text-left transition-colors"
                                                                            type="button"
                                                                            onClick={() => handleCopyInvitationLink(url)}
                                                                        >
                                                                            <Icon name="link" className="w-4 h-4" />
                                                                            <span>{t("copy_link")}</span>
                                                                        </button>
                                                                        <div className="h-px bg-black/5 dark:bg-white/10 my-1 mx-3" />
                                                                        <button
                                                                            className="w-full flex items-center gap-3 px-3 py-2 text-sm font-bold text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 text-left transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                                                            type="button"
                                                                            onClick={() => handleRequestDeleteInvitation(invitation, itemLabel)}
                                                                        >
                                                                            <Icon name="x" className="w-4 h-4" />
                                                                            <span>{t("delete_invitation")}</span>
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
            {filteredInvitations.length > 0 && (
                <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-5 border-t border-black/5 dark:border-white/10 bg-white/30 dark:bg-black/10">
                    <p className="text-sm text-gray-500 dark:text-gray-400 font-medium">
                        {t("pagination_page")} <span className="font-bold text-gray-900 dark:text-white">{invitationPage}</span> / <span className="font-bold text-gray-900 dark:text-white">{invitationTotalPages}</span>
                    </p>
                    <div className="flex items-center gap-2">
                        <button
                            className="px-4 py-2 text-sm font-bold text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 border border-black/10 dark:border-white/10 rounded-xl shadow-sm hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                            type="button"
                            onClick={() => setInvitationPage((prev) => Math.max(1, prev - 1))}
                            disabled={invitationPage <= 1}
                        >
                            {t("pagination_prev")}
                        </button>
                        <button
                            className="px-4 py-2 text-sm font-bold text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 border border-black/10 dark:border-white/10 rounded-xl shadow-sm hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                            type="button"
                            onClick={() => setInvitationPage((prev) => Math.min(invitationTotalPages, prev + 1))}
                            disabled={invitationPage >= invitationTotalPages}
                        >
                            {t("pagination_next")}
                        </button>
                    </div>
                </div>
            )}
        </section>
    );
}
