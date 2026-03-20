import React from "react";
import { Icon } from "../../../components/icons";
import { AvatarCircle } from "../../../components/avatar-circle";
import { getInitials } from "../../../lib/formatters";

export function GuestDetailView({
    t,
    language,
    openWorkspace,
    selectedGuestDetail,
    getGuestAvatarUrl,
    toCatalogLabel,
    handleStartEditGuest,
    handleOpenMergeGuest,
    handleRequestDeleteGuest,
    isDeletingGuestId,
    selectedGuestDetailInvitations,
    selectedGuestDetailStatusCounts,
    selectedGuestDetailRespondedRate,
    guestProfileTabs,
    guestProfileViewTab,
    setGuestProfileViewTab,
    selectedGuestDetailConversion,
    getConversionSource,
    getConversionSourceLabel,
    openInvitationCreate,
    handleCopyHostSignupLink,
    handleShareHostSignupLink,
    handleLinkProfileGuestToGlobal,
    isLinkingGlobalGuest,
    selectedGuestDetailNotes,
    selectedGuestDetailTags,
    selectedGuestFoodGroups,
    selectedGuestLifestyleGroups,
    selectedGuestActiveTabRecommendations,
    selectedGuestDetailPreference,
    selectedGuestAllergyLabels,
    selectedGuestIntoleranceLabels,
    selectedGuestPetAllergyLabels,
    selectedGuestMedicalConditionLabels,
    selectedGuestDietaryMedicalRestrictionLabels,
    toList,
    formatDate,
    statusClass,
    statusText,
    eventsById,
    eventNamesById,
    openEventDetail
}) {
    if (!selectedGuestDetail) {
        return (
            <section className="bg-white/50 dark:bg-gray-900/50 backdrop-blur-xl border border-black/10 dark:border-white/10 rounded-3xl shadow-2xl p-6 md:p-8 flex flex-col gap-6 w-full max-w-5xl mx-auto items-center justify-center min-h-[400px]">
                <p className="text-gray-500 dark:text-gray-400">{t("guest_detail_empty")}</p>
            </section>
        );
    }

    const guestFullName = `${selectedGuestDetail.first_name || ""} ${selectedGuestDetail.last_name || ""}`.trim() || t("field_guest");

    return (
        <section className="bg-white/50 dark:bg-gray-900/50 backdrop-blur-xl border border-black/10 dark:border-white/10 rounded-3xl shadow-2xl p-4 md:p-8 flex flex-col gap-6 w-full max-w-5xl mx-auto">

            {/* Breadcrumb */}
            <div className="flex items-center">
                <button
                    className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-wider text-gray-500 hover:text-gray-900 dark:hover:text-white transition-colors outline-none focus:ring-2 focus:ring-blue-500/50 rounded"
                    type="button"
                    onClick={() => openWorkspace("guests", "latest")}
                >
                    <Icon name="arrow_left" className="w-3.5 h-3.5" />
                    {t("latest_guests_title")}
                </button>
            </div>

            {/* Hero / Contact Card */}
            <div className="bg-white/40 dark:bg-black/20 rounded-3xl border border-black/5 dark:border-white/5 p-6 flex flex-col lg:flex-row gap-6 justify-between items-start lg:items-center shadow-inner">
                <div className="flex items-center gap-5 flex-1 min-w-0">
                    <AvatarCircle
                        className="border-2 border-white dark:border-gray-800 shadow-md flex-shrink-0"
                        label={guestFullName}
                        fallback={getInitials(guestFullName, "IN")}
                        imageUrl={getGuestAvatarUrl(selectedGuestDetail, guestFullName)}
                        size={72}
                    />
                    <div className="flex flex-col gap-1.5 min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                            <h2 className="text-xl md:text-2xl font-black text-gray-900 dark:text-white truncate">
                                {guestFullName}
                            </h2>
                            {selectedGuestDetail.relationship ? (
                                <span className="px-2.5 py-1 bg-gray-200 text-gray-700 dark:bg-gray-700 dark:text-gray-300 rounded-lg text-[10px] font-bold uppercase tracking-wide">
                                    {toCatalogLabel("relationship", selectedGuestDetail.relationship, language)}
                                </span>
                            ) : null}
                        </div>

                        <div className="flex flex-col sm:flex-row flex-wrap gap-x-4 gap-y-1.5 text-xs text-gray-600 dark:text-gray-400 font-medium">
                            {selectedGuestDetail.email ? (
                                <a className="flex items-center gap-1.5 hover:text-blue-600 dark:hover:text-blue-400 transition-colors" href={`mailto:${selectedGuestDetail.email}`}>
                                    <Icon name="mail" className="w-3.5 h-3.5" />
                                    <span className="truncate">{selectedGuestDetail.email}</span>
                                </a>
                            ) : null}
                            {selectedGuestDetail.phone ? (
                                <a className="flex items-center gap-1.5 hover:text-blue-600 dark:hover:text-blue-400 transition-colors" href={`tel:${selectedGuestDetail.phone}`}>
                                    <Icon name="phone" className="w-3.5 h-3.5" />
                                    <span className="truncate">{selectedGuestDetail.phone}</span>
                                </a>
                            ) : null}
                            {selectedGuestDetail.city || selectedGuestDetail.country ? (
                                <span className="flex items-center gap-1.5">
                                    <Icon name="location" className="w-3.5 h-3.5" />
                                    <span className="truncate">{[selectedGuestDetail.city, selectedGuestDetail.country].filter(Boolean).join(", ")}</span>
                                </span>
                            ) : null}
                            {!selectedGuestDetail.email && !selectedGuestDetail.phone && !selectedGuestDetail.city && !selectedGuestDetail.country ? (
                                <span>-</span>
                            ) : null}
                        </div>

                        <div className="flex flex-wrap items-center gap-2 mt-1">
                            {selectedGuestDetailConversion ? (
                                <>
                                    <span className="px-2 py-0.5 bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300 border border-blue-200 dark:border-blue-800/30 rounded-md text-[9px] font-bold uppercase tracking-wider flex items-center gap-1">
                                        <Icon name="check" className="w-2.5 h-2.5" />
                                        {t("host_converted_badge")}
                                    </span>
                                    <span className={`px-2 py-0.5 rounded-md text-[9px] font-bold uppercase tracking-wider border ${getConversionSource(selectedGuestDetailConversion) === "google" ? "bg-red-50 text-red-700 border-red-200 dark:bg-red-900/20 dark:text-red-400 dark:border-red-900/30" : "bg-gray-100 text-gray-700 border-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:border-gray-700"}`}>
                                        {getConversionSourceLabel(t, getConversionSource(selectedGuestDetailConversion))}
                                    </span>
                                    {selectedGuestDetailConversion.converted_at ? (
                                        <span className="text-[10px] text-gray-500 font-medium">
                                            {t("host_conversion_date_label")} {formatDate(selectedGuestDetailConversion.converted_at, language, t("no_date"))}
                                        </span>
                                    ) : null}
                                </>
                            ) : (
                                <span className="px-2 py-0.5 bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300 border border-yellow-200 dark:border-yellow-800/30 rounded-md text-[9px] font-bold uppercase tracking-wider">
                                    {t("host_potential_badge")}
                                </span>
                            )}
                        </div>
                    </div>
                </div>

                {/* Acciones principales del invitado */}
                <div className="flex flex-wrap items-center gap-2 w-full lg:w-auto shrink-0">
                    <button
                        className="bg-white hover:bg-gray-50 dark:bg-gray-800 dark:hover:bg-gray-700 text-gray-800 dark:text-gray-200 border border-black/10 dark:border-white/10 font-bold py-2.5 px-4 rounded-xl transition-all text-xs shadow-sm flex items-center gap-2 flex-1 justify-center outline-none focus:ring-2 focus:ring-blue-500/50"
                        type="button"
                        onClick={() => handleStartEditGuest(selectedGuestDetail, { openAdvanced: true })}
                    >
                        <Icon name="sparkle" className="w-4 h-4 text-blue-500" />
                        {t("guest_advanced_title")}
                    </button>
                    <button
                        className="bg-white hover:bg-gray-50 dark:bg-gray-800 dark:hover:bg-gray-700 text-gray-800 dark:text-gray-200 border border-black/10 dark:border-white/10 font-bold py-2.5 px-4 rounded-xl transition-all text-xs shadow-sm flex items-center gap-2 flex-1 justify-center outline-none focus:ring-2 focus:ring-blue-500/50"
                        type="button"
                        onClick={() => handleStartEditGuest(selectedGuestDetail)}
                    >
                        <Icon name="edit" className="w-4 h-4" />
                        {t("guest_detail_edit_action")}
                    </button>

                    {/* Dropdown de Acciones Principales (Merge/Delete) */}
                    <div className="relative ml-auto sm:ml-0">
                        <button className="peer bg-white hover:bg-gray-50 dark:bg-gray-800 dark:hover:bg-gray-700 text-gray-800 dark:text-gray-200 border border-black/10 dark:border-white/10 font-bold p-2.5 rounded-xl transition-all shadow-sm flex items-center justify-center outline-none focus:ring-2 focus:ring-blue-500/50" aria-label={t("open_menu")} title={t("open_menu")}>
                            <Icon name="more_horizontal" className="w-4 h-4" />
                        </button>

                        {/* 🚀 FIX: Dejamos SOLO right-0. Así el menú siempre crece hacia la izquierda. */}
                        <div className="absolute right-0 top-full pt-2 w-48 z-50 opacity-0 invisible peer-focus:opacity-100 peer-focus:visible hover:opacity-100 hover:visible transition-all duration-200">
                            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl border border-black/10 dark:border-white/10 overflow-hidden flex flex-col py-1">
                                <button
                                    className="w-full text-left px-4 py-3 text-xs font-bold text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 flex items-center gap-2 transition-colors outline-none"
                                    type="button"
                                    onMouseDown={(e) => { e.preventDefault(); handleOpenMergeGuest(selectedGuestDetail); }}
                                >
                                    <Icon name="link" className="w-3.5 h-3.5" />
                                    {t("merge_guest_action")}
                                </button>
                                <button
                                    className="w-full text-left px-4 py-3 text-xs font-bold text-red-600 hover:bg-red-50 dark:hover:bg-red-900/10 flex items-center gap-2 transition-colors disabled:opacity-50 border-t border-black/5 dark:border-white/5 outline-none"
                                    type="button"
                                    onMouseDown={(e) => {
                                        e.preventDefault();
                                        if (isDeletingGuestId !== selectedGuestDetail.id) handleRequestDeleteGuest(selectedGuestDetail);
                                    }}
                                    disabled={isDeletingGuestId === selectedGuestDetail.id}
                                >
                                    <Icon name="close" className="w-3.5 h-3.5" />
                                    {isDeletingGuestId === selectedGuestDetail.id ? t("deleting") : t("delete_guest")}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Acciones Rápidas (Invitar, Compartir) */}
            <div className="flex flex-wrap items-center gap-3 pb-4 border-b border-black/5 dark:border-white/10">
                <button
                    className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2.5 px-5 rounded-xl shadow-sm transition-all text-xs flex items-center gap-2 outline-none focus:ring-2 focus:ring-blue-500/50"
                    type="button"
                    onClick={() => openInvitationCreate({ guestId: selectedGuestDetail.id, messageKey: "invitation_prefill_guest" })}
                >
                    <Icon name="mail" className="w-4 h-4" />
                    {t("guest_detail_create_invitation_action")}
                </button>
                <button
                    className="bg-black/5 hover:bg-black/10 dark:bg-white/10 dark:hover:bg-white/20 text-gray-800 dark:text-white font-bold py-2.5 px-5 rounded-xl transition-all text-xs flex items-center gap-2 disabled:opacity-50 outline-none focus:ring-2 focus:ring-blue-500/50"
                    type="button"
                    onClick={() => handleCopyHostSignupLink(selectedGuestDetail)}
                    disabled={Boolean(selectedGuestDetailConversion)}
                >
                    <Icon name={selectedGuestDetailConversion ? "check" : "link"} className="w-4 h-4" />
                    {selectedGuestDetailConversion ? t("host_already_registered_action") : t("host_invite_action")}
                </button>

                {/* Dropdown de Acciones Extra */}
                <div className="relative ml-auto sm:ml-0">
                    <button className="peer bg-black/5 hover:bg-black/10 dark:bg-white/10 dark:hover:bg-white/20 text-gray-800 dark:text-white font-bold p-2.5 rounded-xl transition-all text-xs flex items-center justify-center outline-none focus:ring-2 focus:ring-blue-500/50" aria-label={t("open_menu")} title={t("open_menu")}>
                        <Icon name="more_horizontal" className="w-4 h-4" />
                    </button>

                    {/* 🚀 FIX: Dejamos SOLO right-0 aquí también por seguridad. */}
                    <div className="absolute right-0 top-full pt-2 w-60 z-40 opacity-0 invisible peer-focus:opacity-100 peer-focus:visible hover:opacity-100 hover:visible transition-all duration-200">
                        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl border border-black/10 dark:border-white/10 overflow-hidden flex flex-col py-1">
                            <button
                                className="w-full text-left px-4 py-3 text-xs font-bold text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 flex items-center gap-2 transition-colors disabled:opacity-50 outline-none"
                                type="button"
                                onMouseDown={(e) => {
                                    e.preventDefault();
                                    if (!isLinkingGlobalGuest) handleLinkProfileGuestToGlobal(selectedGuestDetail.id);
                                }}
                                disabled={isLinkingGlobalGuest}
                            >
                                <Icon name="shield" className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                                {isLinkingGlobalGuest ? t("global_profile_linking") : t("global_profile_link_guest_action")}
                            </button>

                            {!selectedGuestDetailConversion && (selectedGuestDetail.email || selectedGuestDetail.phone) ? (
                                <>
                                    <button
                                        className="w-full text-left px-4 py-3 text-xs font-bold text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 flex items-center gap-2 transition-colors outline-none border-t border-black/5 dark:border-white/5"
                                        type="button"
                                        onMouseDown={(e) => { e.preventDefault(); handleShareHostSignupLink(selectedGuestDetail, "whatsapp"); }}
                                    >
                                        <Icon name="message" className="w-3.5 h-3.5 text-[#25D366] shrink-0" />
                                        Convida'l a la App per WhatsApp
                                    </button>
                                    <button
                                        className="w-full text-left px-4 py-3 text-xs font-bold text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 flex items-center gap-2 transition-colors outline-none border-t border-black/5 dark:border-white/5"
                                        type="button"
                                        onMouseDown={(e) => { e.preventDefault(); handleShareHostSignupLink(selectedGuestDetail, "email"); }}
                                    >
                                        <Icon name="mail" className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                                        Convida'l a la App per Correu
                                    </button>
                                </>
                            ) : null}
                        </div>
                    </div>
                </div>
            </div>

            {/* KPIs */}
            <div className="grid grid-cols-3 gap-3 md:gap-6">
                <article className="bg-white/50 dark:bg-white/5 rounded-2xl border border-black/5 dark:border-white/10 p-4 md:p-6 flex flex-col items-center justify-center text-center shadow-sm hover:scale-[1.02] transition-transform">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-1">{t("nav_events")}</p>
                    <p className="text-2xl md:text-3xl font-black text-gray-900 dark:text-white leading-none">{selectedGuestDetailInvitations.length}</p>
                </article>
                <article className="bg-white/50 dark:bg-white/5 rounded-2xl border border-black/5 dark:border-white/10 p-4 md:p-6 flex flex-col items-center justify-center text-center shadow-sm hover:scale-[1.02] transition-transform">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-1">{t("status_yes")}</p>
                    <p className="text-2xl md:text-3xl font-black text-blue-600 dark:text-blue-400 leading-none">{selectedGuestDetailStatusCounts.yes}</p>
                </article>
                <article className="bg-white/50 dark:bg-white/5 rounded-2xl border border-black/5 dark:border-white/10 p-4 md:p-6 flex flex-col items-center justify-center text-center shadow-sm hover:scale-[1.02] transition-transform">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-1">RSVP</p>
                    <p className="text-2xl md:text-3xl font-black text-gray-900 dark:text-white leading-none">{selectedGuestDetailRespondedRate}%</p>
                </article>
            </div>

            {/* 🚀 NUEVOS TABS CON ICONOS (Estilo consistente) */}
            <div className="flex overflow-x-auto gap-2 pb-2 border-b border-black/5 dark:border-white/10 mt-2 scrollbar-none" role="tablist" aria-label={t("guest_advanced_title")}>
                {guestProfileTabs.map((tabItem) => {
                    // Asignación rápida de iconos según la clave
                    const tabIcon = tabItem.key === "general" ? "id_card"
                        : tabItem.key === "food" ? "utensils"
                            : tabItem.key === "lifestyle" ? "star"
                                : tabItem.key === "conversation" ? "message"
                                    : tabItem.key === "health" ? "heart"
                                        : "clock"; // history
                    const isActive = guestProfileViewTab === tabItem.key;

                    return (
                        <button
                            key={tabItem.key}
                            type="button"
                            role="tab"
                            aria-selected={isActive}
                            className={`flex items-center gap-2 px-3.5 py-1.5 md:px-4 md:py-2 rounded-full text-xs font-bold transition-all whitespace-nowrap shadow-sm border outline-none shrink-0 ${isActive ? "bg-blue-600 text-white border-blue-700" : "bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700"}`}
                            onClick={() => setGuestProfileViewTab(tabItem.key)}
                        >
                            <Icon name={tabIcon} className={`w-3.5 h-3.5 md:w-4 md:h-4 ${isActive ? "opacity-100" : "opacity-50"}`} />
                            <span>{tabItem.label}</span>
                        </button>
                    );
                })}
            </div>

            {/* Tab Content */}
            <div className="flex flex-col gap-6">

                {/* TAB: GENERAL */}
                {guestProfileViewTab === "general" ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <article className="bg-white/50 dark:bg-white/5 rounded-2xl border border-black/5 dark:border-white/10 p-5 flex flex-col gap-4 shadow-sm">
                            <p className="text-sm font-bold text-gray-900 dark:text-white flex items-center gap-2">
                                <Icon name="message" className="w-4 h-4 text-blue-500" />
                                {t("guest_detail_notes_title")}
                            </p>
                            {selectedGuestDetailNotes.length === 0 ? (
                                <p className="text-xs text-gray-500 italic">{t("guest_detail_notes_empty")}</p>
                            ) : (
                                <ul className="flex flex-col gap-2">
                                    {selectedGuestDetailNotes.map((noteItem) => (
                                        <li key={noteItem} className="text-xs text-gray-700 dark:text-gray-300 flex items-start gap-2 bg-white/60 dark:bg-black/20 p-3 rounded-xl border border-black/5 dark:border-white/5">
                                            <span className="text-blue-500 mt-0.5">•</span>
                                            <span>{noteItem}</span>
                                        </li>
                                    ))}
                                </ul>
                            )}
                        </article>

                        <article className="bg-white/50 dark:bg-white/5 rounded-2xl border border-black/5 dark:border-white/10 p-5 flex flex-col gap-4 shadow-sm">
                            <p className="text-sm font-bold text-gray-900 dark:text-white flex items-center gap-2">
                                <Icon name="sparkle" className="w-4 h-4 text-purple-500" />
                                {t("guest_detail_tags_title")}
                            </p>
                            {selectedGuestDetailTags.length === 0 ? (
                                <p className="text-xs text-gray-500 italic">{t("guest_detail_tags_empty")}</p>
                            ) : (
                                <div className="flex flex-wrap gap-2">
                                    {/* 🚀 NUEVO DISEÑO CHIP INFORMATIVO */}
                                    {selectedGuestDetailTags.map((tagItem) => (
                                        <span key={`guest-detail-tag-${tagItem}`} className="inline-flex items-center px-3.5 py-1.5 rounded-full text-[13px] font-semibold bg-purple-50 text-purple-700 border border-purple-100 dark:bg-purple-900/30 dark:text-purple-300 dark:border-purple-800/30 shadow-sm select-none">
                                            {tagItem}
                                        </span>
                                    ))}
                                </div>
                            )}
                        </article>
                    </div>
                ) : null}

                {/* TAB: FOOD */}
                {guestProfileViewTab === "food" ? (
                    <article className="bg-white/50 dark:bg-white/5 rounded-2xl border border-black/5 dark:border-white/10 p-5 flex flex-col gap-5 shadow-sm">
                        <p className="text-sm font-bold text-gray-900 dark:text-white flex items-center gap-2">
                            <Icon name="sparkle" className="w-4 h-4 text-orange-500" />
                            {t("guest_profile_tab_food")}
                        </p>
                        {selectedGuestFoodGroups.length === 0 ? (
                            <p className="text-xs text-gray-500 italic">{t("guest_detail_no_profile_data")}</p>
                        ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                {selectedGuestFoodGroups.map((group) => (
                                    <div key={group.title} className="flex flex-col gap-2">
                                        <p className="text-[10px] font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">{group.title}</p>
                                        <div className="flex flex-wrap gap-2">
                                            {/* 🚀 NUEVO DISEÑO CHIP INFORMATIVO */}
                                            {group.values.map((value) => (
                                                <span key={`${group.title}-${value}`} className="inline-flex items-center px-3.5 py-1.5 rounded-full text-[13px] font-semibold bg-blue-50 text-blue-700 border border-blue-100 dark:bg-blue-900/30 dark:text-blue-300 dark:border-blue-800/30 shadow-sm select-none">
                                                    {value}
                                                </span>
                                            ))}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </article>
                ) : null}

                {/* TAB: LIFESTYLE */}
                {guestProfileViewTab === "lifestyle" ? (
                    <article className="bg-white/50 dark:bg-white/5 rounded-2xl border border-black/5 dark:border-white/10 p-5 flex flex-col gap-5 shadow-sm">
                        <p className="text-sm font-bold text-gray-900 dark:text-white flex items-center gap-2">
                            <Icon name="star" className="w-4 h-4 text-yellow-500" />
                            {t("guest_profile_tab_lifestyle")}
                        </p>
                        {selectedGuestLifestyleGroups.length === 0 ? (
                            <p className="text-xs text-gray-500 italic">{t("guest_detail_no_profile_data")}</p>
                        ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                {selectedGuestLifestyleGroups.map((group) => (
                                    <div key={group.title} className="flex flex-col gap-2">
                                        <p className="text-[10px] font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">{group.title}</p>
                                        <div className="flex flex-wrap gap-2">
                                            {/* 🚀 NUEVO DISEÑO CHIP INFORMATIVO */}
                                            {group.values.map((value) => (
                                                <span key={`${group.title}-${value}`} className="inline-flex items-center px-3.5 py-1.5 rounded-full text-[13px] font-semibold bg-blue-50 text-blue-700 border border-blue-100 dark:bg-blue-900/30 dark:text-blue-300 dark:border-blue-800/30 shadow-sm select-none">
                                                    {value}
                                                </span>
                                            ))}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </article>
                ) : null}

                {/* TAB: CONVERSATION */}
                {guestProfileViewTab === "conversation" ? (
                    <article className="bg-white/50 dark:bg-white/5 rounded-2xl border border-black/5 dark:border-white/10 p-5 flex flex-col gap-4 shadow-sm">
                        <p className="text-sm font-bold text-gray-900 dark:text-white flex items-center gap-2">
                            <Icon name="message" className="w-4 h-4 text-green-500" />
                            {t("guest_profile_tab_conversation")}
                        </p>
                        <ul className="flex flex-col gap-2">
                            {selectedGuestDetailPreference?.last_talk_topic ? (
                                <li className="text-xs text-gray-700 dark:text-gray-300 flex items-start gap-2 bg-white/60 dark:bg-black/20 p-3.5 rounded-xl border border-black/5 dark:border-white/5 shadow-sm">
                                    <strong className="text-gray-900 dark:text-white shrink-0">{t("field_last_talk_topic")}:</strong>
                                    <span className="leading-relaxed">{selectedGuestDetailPreference.last_talk_topic}</span>
                                </li>
                            ) : null}
                            {toList(selectedGuestDetailPreference?.taboo_topics || []).length > 0 ? (
                                <li className="text-xs text-gray-700 dark:text-gray-300 flex items-start gap-2 bg-red-50/50 dark:bg-red-900/10 p-3.5 rounded-xl border border-red-100 dark:border-red-900/30 shadow-sm">
                                    <strong className="text-red-700 dark:text-red-400 shrink-0">{t("field_taboo_topics")}:</strong>
                                    <div className="flex flex-wrap gap-1.5">
                                        {/* 🚀 TABÚES EN FORMATO CHIP ROJO */}
                                        {toList(selectedGuestDetailPreference.taboo_topics).map(taboo => (
                                            <span key={taboo} className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-bold bg-red-100 text-red-700 border border-red-200 dark:bg-red-900/30 dark:text-red-300 dark:border-red-800/30">
                                                {taboo}
                                            </span>
                                        ))}
                                    </div>
                                </li>
                            ) : null}
                            {selectedGuestDetail.relationship ? (
                                <li className="text-xs text-gray-700 dark:text-gray-300 flex items-center gap-2 bg-white/60 dark:bg-black/20 p-3.5 rounded-xl border border-black/5 dark:border-white/5 shadow-sm">
                                    <strong className="text-gray-900 dark:text-white">{t("field_relationship")}:</strong>
                                    <span className="inline-flex items-center px-2.5 py-1 rounded-lg text-[11px] font-bold bg-blue-50 text-blue-700 border border-blue-100 dark:bg-blue-900/30 dark:text-blue-300 dark:border-blue-800/30">
                                        {toCatalogLabel("relationship", selectedGuestDetail.relationship, language)}
                                    </span>
                                </li>
                            ) : null}
                            {!selectedGuestDetailPreference?.last_talk_topic &&
                                toList(selectedGuestDetailPreference?.taboo_topics || []).length === 0 &&
                                !selectedGuestDetail.relationship ? (
                                <li className="text-xs text-gray-500 italic">{t("guest_detail_notes_empty")}</li>
                            ) : null}
                        </ul>
                    </article>
                ) : null}

                {/* TAB: HEALTH */}
                {guestProfileViewTab === "health" ? (
                    <article className="bg-white/50 dark:bg-white/5 rounded-2xl border border-black/5 dark:border-white/10 p-5 flex flex-col gap-5 shadow-sm">
                        <p className="text-sm font-bold text-gray-900 dark:text-white flex items-center gap-2">
                            <Icon name="shield" className="w-4 h-4 text-red-500" />
                            {t("guest_profile_tab_health")}
                        </p>
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">

                            <div className="flex flex-col gap-2">
                                <p className="text-[10px] font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">{t("field_allergies")}</p>
                                <div className="flex flex-wrap gap-2">
                                    {selectedGuestAllergyLabels.length > 0 ? (
                                        selectedGuestAllergyLabels.map((item) => (
                                            <span key={`allergy-${item}`} className="inline-flex items-center px-3.5 py-1.5 rounded-full text-[13px] font-semibold bg-red-50 text-red-700 border border-red-200 dark:bg-red-900/30 dark:text-red-300 dark:border-red-900/50 shadow-sm select-none">
                                                {item}
                                            </span>
                                        ))
                                    ) : (
                                        <span className="text-xs text-gray-400 italic">-</span>
                                    )}
                                </div>
                            </div>

                            <div className="flex flex-col gap-2">
                                <p className="text-[10px] font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">{t("field_intolerances")}</p>
                                <div className="flex flex-wrap gap-2">
                                    {selectedGuestIntoleranceLabels.length > 0 ? (
                                        selectedGuestIntoleranceLabels.map((item) => (
                                            <span key={`intolerance-${item}`} className="inline-flex items-center px-3.5 py-1.5 rounded-full text-[13px] font-semibold bg-orange-50 text-orange-700 border border-orange-200 dark:bg-orange-900/30 dark:text-orange-300 dark:border-orange-900/50 shadow-sm select-none">
                                                {item}
                                            </span>
                                        ))
                                    ) : (
                                        <span className="text-xs text-gray-400 italic">-</span>
                                    )}
                                </div>
                            </div>

                            <div className="flex flex-col gap-2">
                                <p className="text-[10px] font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">{t("field_pet_allergies")}</p>
                                <div className="flex flex-wrap gap-2">
                                    {selectedGuestPetAllergyLabels.length > 0 ? (
                                        selectedGuestPetAllergyLabels.map((item) => (
                                            <span key={`pet-allergy-${item}`} className="inline-flex items-center px-3.5 py-1.5 rounded-full text-[13px] font-semibold bg-yellow-50 text-yellow-800 border border-yellow-200 dark:bg-yellow-900/30 dark:text-yellow-300 dark:border-yellow-900/50 shadow-sm select-none">
                                                {item}
                                            </span>
                                        ))
                                    ) : (
                                        <span className="text-xs text-gray-400 italic">-</span>
                                    )}
                                </div>
                            </div>

                            <div className="flex flex-col gap-2">
                                <p className="text-[10px] font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">{t("field_medical_conditions")}</p>
                                <div className="flex flex-wrap gap-2">
                                    {selectedGuestMedicalConditionLabels.length > 0 ? (
                                        selectedGuestMedicalConditionLabels.map((item) => (
                                            <span key={`medical-condition-${item}`} className="inline-flex items-center px-3.5 py-1.5 rounded-full text-[13px] font-semibold bg-blue-50 text-blue-700 border border-blue-200 dark:bg-blue-900/30 dark:text-blue-300 dark:border-blue-900/50 shadow-sm select-none">
                                                {item}
                                            </span>
                                        ))
                                    ) : (
                                        <span className="text-xs text-gray-400 italic">-</span>
                                    )}
                                </div>
                            </div>

                            <div className="flex flex-col gap-2">
                                <p className="text-[10px] font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">{t("field_dietary_medical_restrictions")}</p>
                                <div className="flex flex-wrap gap-2">
                                    {selectedGuestDietaryMedicalRestrictionLabels.length > 0 ? (
                                        selectedGuestDietaryMedicalRestrictionLabels.map((item) => (
                                            <span key={`dietary-medical-restriction-${item}`} className="inline-flex items-center px-3.5 py-1.5 rounded-full text-[13px] font-semibold bg-purple-50 text-purple-700 border border-purple-200 dark:bg-purple-900/30 dark:text-purple-300 dark:border-purple-900/50 shadow-sm select-none">
                                                {item}
                                            </span>
                                        ))
                                    ) : (
                                        <span className="text-xs text-gray-400 italic">-</span>
                                    )}
                                </div>
                            </div>

                        </div>
                    </article>
                ) : null}

                {/* RECOMENDACIONES (Si existen para la tab activa) */}
                {selectedGuestActiveTabRecommendations ? (
                    <article className="bg-blue-50/50 dark:bg-blue-900/10 rounded-2xl border border-blue-100 dark:border-blue-900/30 p-5 flex flex-col gap-4 shadow-sm">
                        <div className="flex flex-col">
                            <p className="text-sm font-bold text-blue-900 dark:text-blue-400">{selectedGuestActiveTabRecommendations.title}</p>
                            <p className="text-xs text-blue-700/70 dark:text-blue-400/70">{selectedGuestActiveTabRecommendations.hint}</p>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mt-2">
                            {selectedGuestActiveTabRecommendations.cards.map((recommendationItem) => (
                                <div key={recommendationItem.key} className="bg-white/60 dark:bg-black/20 p-4 rounded-xl border border-blue-100/50 dark:border-white/5 shadow-sm">
                                    <p className="text-[10px] font-bold uppercase tracking-wider text-blue-800 dark:text-blue-300 mb-2">{recommendationItem.title}</p>
                                    {recommendationItem.values.length > 0 ? (
                                        <ul className="flex flex-col gap-1.5">
                                            {recommendationItem.values.map((value) => (
                                                <li key={`${recommendationItem.key}-${value}`} className="text-xs font-medium text-gray-800 dark:text-gray-200 flex items-start gap-1.5">
                                                    <span className="text-blue-400 mt-0.5">•</span>
                                                    {value}
                                                </li>
                                            ))}
                                        </ul>
                                    ) : (
                                        <p className="text-xs text-gray-400 italic">{t("smart_hosting_no_data")}</p>
                                    )}
                                </div>
                            ))}
                        </div>
                    </article>
                ) : null}

                {/* TAB: HISTORY */}
                {guestProfileViewTab === "history" ? (
                    <article className="bg-white/50 dark:bg-white/5 rounded-2xl border border-black/5 dark:border-white/10 overflow-hidden flex flex-col shadow-sm">
                        <div className="p-5 border-b border-black/5 dark:border-white/10">
                            <p className="text-sm font-bold text-gray-900 dark:text-white flex items-center gap-2">
                                <Icon name="calendar" className="w-4 h-4 text-blue-500" />
                                {t("guest_detail_invitations_title")}
                            </p>
                        </div>

                        {selectedGuestDetailInvitations.length === 0 ? (
                            <div className="p-8 text-center">
                                <p className="text-sm text-gray-500 dark:text-gray-400">{t("guest_detail_no_invitations")}</p>
                            </div>
                        ) : (
                            <div className="w-full overflow-x-auto overflow-y-hidden">
                                <table className="w-full text-left border-collapse block md:table">
                                    <thead className="hidden md:table-header-group bg-black/5 dark:bg-white/5">
                                        <tr>
                                            <th className="py-4 px-5 text-[11px] font-bold uppercase tracking-wider text-gray-600 dark:text-gray-300 border-b border-black/10 dark:border-white/10">{t("field_event")}</th>
                                            <th className="py-4 px-5 text-[11px] font-bold uppercase tracking-wider text-gray-600 dark:text-gray-300 border-b border-black/10 dark:border-white/10">{t("date")}</th>
                                            <th className="py-4 px-5 text-[11px] font-bold uppercase tracking-wider text-gray-600 dark:text-gray-300 border-b border-black/10 dark:border-white/10">RSVP</th>
                                            <th className="py-4 px-5 text-[11px] font-bold uppercase tracking-wider text-gray-600 dark:text-gray-300 border-b border-black/10 dark:border-white/10">+1</th>
                                        </tr>
                                    </thead>
                                    <tbody className="block md:table-row-group divide-y-0 md:divide-y divide-black/5 dark:divide-white/5 p-4 md:p-0">
                                        {selectedGuestDetailInvitations.map((invitationItem) => {
                                            const eventItem = eventsById[invitationItem.event_id];
                                            return (
                                                <tr key={invitationItem.id} className="block md:table-row flex flex-col mb-4 md:mb-0 p-4 md:p-0 rounded-2xl md:rounded-none border border-black/10 dark:border-white/10 md:border-transparent bg-white/60 dark:bg-black/20 md:bg-transparent shadow-sm md:shadow-none hover:bg-black/5 dark:hover:bg-white/5 transition-colors group">

                                                    <td className="block md:table-cell flex flex-col md:flex-row md:items-center justify-between py-2 md:py-4 px-0 md:px-5 border-b border-black/5 dark:border-white/5 md:border-none last:border-0">
                                                        <span className="md:hidden text-[10px] font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-1">{t("field_event")}</span>
                                                        <button
                                                            className="text-sm font-bold text-gray-900 dark:text-white hover:text-blue-600 dark:hover:text-blue-400 text-left transition-colors"
                                                            type="button"
                                                            onClick={() => openEventDetail(invitationItem.event_id)}
                                                        >
                                                            {eventItem?.title || eventNamesById[invitationItem.event_id] || t("field_event")}
                                                        </button>
                                                    </td>

                                                    <td className="block md:table-cell flex flex-col md:flex-row md:items-center justify-between py-2 md:py-4 px-0 md:px-5 border-b border-black/5 dark:border-white/5 md:border-none last:border-0">
                                                        <span className="md:hidden text-[10px] font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-1">{t("date")}</span>
                                                        <span className="text-xs font-medium text-gray-600 dark:text-gray-300">
                                                            {formatDate(eventItem?.start_at || invitationItem.created_at, language, t("no_date"))}
                                                        </span>
                                                    </td>

                                                    <td className="block md:table-cell flex flex-col md:flex-row md:items-center justify-between py-2 md:py-4 px-0 md:px-5 border-b border-black/5 dark:border-white/5 md:border-none last:border-0">
                                                        <span className="md:hidden text-[10px] font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-1">RSVP</span>
                                                        <span className={`inline-flex px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wide border w-fit ${statusClass(invitationItem.status)}`}>
                                                            {statusText(t, invitationItem.status)}
                                                        </span>
                                                    </td>

                                                    <td className="block md:table-cell flex flex-col md:flex-row md:items-center justify-between py-2 md:py-4 px-0 md:px-5 border-none md:border-none">
                                                        <span className="md:hidden text-[10px] font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-1">+1</span>
                                                        <span className="text-xs text-gray-500 font-medium">-</span>
                                                    </td>

                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </article>
                ) : null}

            </div>
        </section>
    );
}