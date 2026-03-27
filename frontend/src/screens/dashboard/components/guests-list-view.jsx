import React from "react";
import { useState } from "react";
import { Icon } from "../../../components/icons";
import { AvatarCircle } from "../../../components/avatar-circle";
import { getInitials } from "../../../lib/formatters";
import { MagicCard } from "./ui/magic-card";

export function GuestsListView({
    t,
    language,
    guestSearch,
    setGuestSearch,
    guestSort,
    setGuestSort,
    guestPageSize,
    setGuestPageSize,
    PAGE_SIZE_OPTIONS,
    GUESTS_PAGE_SIZE_DEFAULT,
    guestContactFilter,
    setGuestContactFilter,
    filteredGuests,
    pagedGuests,
    hostPotentialGuestsCount,
    convertedHostGuestsCount,
    pendingHostGuestsCount,
    guestMessage,
    guestHostConversionById,
    getConversionSource,
    getConversionSourceLabel,
    guestEventCountByGuestId,
    guestSensitiveById,
    toCatalogLabels,
    uniqueValues,
    toCatalogLabel,
    getGuestAvatarUrl,
    openGuestDetail,
    handleStartEditGuest,
    handleOpenMergeGuest,
    handleCopyHostSignupLink,
    handleShareHostSignupLink,
    handleRequestDeleteGuest,
    isDeletingGuestId,
    guestPage,
    guestTotalPages,
    setGuestPage,
    mapsStatus,
    mapsError,
    orderedGuestMapPoints,
    // eslint-disable-next-line no-unused-vars
    GeoPointsMapPanel,
    openWorkspace
}) {
    const [openDropdownId, setOpenDropdownId] = useState(null);
    return (
        <section className="relative w-full rounded-[2.5rem] border border-black/10 dark:border-white/10 shadow-2xl flex flex-col overflow-hidden group bg-gray-50 dark:bg-gray-900">

            {/* 🚀 LA MAGIA: Bolas de color giratorias */}
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

            {/* 🚀 CAPA DE CRISTAL: El Glassmorphism */}
            <div className="absolute inset-0 backdrop-blur-[60px] bg-white/60 dark:bg-black/40 z-0"></div>

            {/* 🚀 EL CONTENIDO REAL: Ponemos el z-10 y envolvemos el resto */}
            <div className="relative z-10 flex flex-col w-full h-full">
                <div className="px-5 pt-5 pb-3 border-b border-black/5 dark:border-white/10 bg-white/20 dark:bg-black/10">
                    <div className="inline-flex items-center p-1 rounded-xl border border-black/10 dark:border-white/10 bg-white/50 dark:bg-black/30 backdrop-blur-md gap-1">
                        <button
                            type="button"
                            className="px-4 py-2 text-sm font-bold rounded-lg transition-colors bg-blue-600 text-white"
                            onClick={() => openWorkspace("guests", "latest")}
                        >
                            {t("guest_people_tab")}
                        </button>
                        <button
                            type="button"
                            className="px-4 py-2 text-sm font-bold rounded-lg transition-colors text-gray-700 dark:text-gray-300 hover:bg-black/5 dark:hover:bg-white/10"
                            onClick={() => openWorkspace("guests", "groups")}
                        >
                            {t("guest_groups_tab")}
                        </button>
                    </div>
                </div>

                {/* 1. TOOLBAR: Buscador y Ordenación */}
                <div className="flex flex-col md:flex-row gap-4 p-5 md:items-end justify-between border-b border-black/5 dark:border-white/10 bg-white/20 dark:bg-black/10">
                    <label className="flex flex-col flex-1 max-w-sm">
                        <span className="block text-[10px] font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-1.5">{t("search")}</span>
                        <div className="relative">
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
                                <Icon name="search" className="w-4 h-4" />
                            </span>
                            <input
                                type="search"
                                value={guestSearch}
                                onChange={(event) => setGuestSearch(event.target.value)}
                                placeholder={t("search_guests_placeholder")}
                                className="w-full bg-white/5 dark:bg-black/20 border border-black/10 dark:border-white/10 rounded-xl pl-9 pr-4 py-2.5 text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500/20 transition-all"
                            />
                        </div>
                    </label>

                    <div className="flex flex-wrap gap-3 items-end">
                        <label className="flex flex-col">
                            <span className="block text-[10px] font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-1.5">{t("sort_by")}</span>
                            <select
                                value={guestSort}
                                onChange={(event) => setGuestSort(event.target.value)}
                                className="w-full bg-white/5 dark:bg-black/20 border border-black/10 dark:border-white/10 rounded-xl px-4 py-2.5 text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500/20 transition-all appearance-none cursor-pointer"
                            >
                                <option value="created_desc">{t("sort_created_desc")}</option>
                                <option value="created_asc">{t("sort_created_asc")}</option>
                                <option value="name_asc">{t("sort_name_asc")}</option>
                                <option value="name_desc">{t("sort_name_desc")}</option>
                            </select>
                        </label>
                        <label className="flex flex-col">
                            <span className="block text-[10px] font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-1.5">{t("pagination_items_per_page")}</span>
                            <select
                                value={guestPageSize}
                                onChange={(event) => setGuestPageSize(Number(event.target.value) || GUESTS_PAGE_SIZE_DEFAULT)}
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

                {/* 2. PESTAÑAS DE FILTRO Y KPIs */}
                <div className="flex flex-col px-5 py-4 border-b border-black/5 dark:border-white/10 bg-black/5 dark:bg-white/5 backdrop-blur-md">
                    <div className="flex flex-wrap gap-2 items-center" role="group">
                        {[
                            { key: "all", label: t("all_contacts") },
                            { key: "contact", label: t("contact_any") },
                            { key: "email", label: t("contact_email_only") },
                            { key: "phone", label: t("contact_phone_only") }
                        ].map((contactOption) => {
                            const isActive = guestContactFilter === contactOption.key;
                            return (
                                <button
                                    key={contactOption.key}
                                    className={isActive
                                        ? "bg-gray-600 text-white px-3 py-2 rounded-lg text-xs font-medium transition-colors"
                                        : "text-gray-600 dark:text-gray-400 hover:bg-black/5 dark:hover:bg-white/5 px-3 py-2 rounded-lg text-xs font-medium transition-colors"
                                    }
                                    type="button"
                                    aria-pressed={isActive}
                                    onClick={() => setGuestContactFilter(contactOption.key)}
                                >
                                    {contactOption.label}
                                </button>
                            );
                        })}
                    </div>

                    <div className="flex flex-wrap items-center gap-3">
                        <h3 className="text-xs font-bold uppercase tracking-wider text-gray-900 dark:text-white mt-6 mb-4">
                            {t("results_count")}: {filteredGuests.length}
                        </h3>
                        <div className="flex flex-wrap gap-2 mt-6 mb-4">
                            <span className="px-2 py-1 bg-blue-100/80 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300 rounded-md text-[10px] font-bold uppercase tracking-wider border border-blue-200 dark:border-blue-800/50 backdrop-blur-sm">
                                {t("host_potential_count_label")} {hostPotentialGuestsCount}
                            </span>
                            <span className="px-2 py-1 bg-green-100/80 text-green-700 dark:bg-green-900/30 dark:text-green-300 rounded-md text-[10px] font-bold uppercase tracking-wider border border-green-200 dark:border-green-800/50 backdrop-blur-sm">
                                {t("host_converted_count_label")} {convertedHostGuestsCount}
                            </span>
                            <span className="px-2 py-1 bg-yellow-100/80 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300 rounded-md text-[10px] font-bold uppercase tracking-wider border border-yellow-200 dark:border-yellow-800/50 backdrop-blur-sm">
                                {t("host_pending_conversion_label")} {pendingHostGuestsCount}
                            </span>
                        </div>
                    </div>
                </div>

                {guestMessage && (
                    <div className="px-5 py-3 border-b border-black/5 dark:border-white/10 bg-black/5 dark:bg-white/5">
                        <div className="p-3 bg-blue-50 dark:bg-blue-900/20 text-blue-800 dark:text-blue-300 border border-blue-200 dark:border-blue-800/50 rounded-xl text-sm">
                            {guestMessage}
                        </div>
                    </div>
                )}

                {/* 3. TABLA / LISTA (FLEXBOX EDITION - PATRÓN UNIFICADO) */}
                <div className="flex flex-col relative">
                    {filteredGuests.length === 0 ? (
                        <div className="px-5 py-16 text-center flex flex-col items-center justify-center gap-2">
                            <div className="w-12 h-12 rounded-full bg-black/5 dark:bg-white/5 flex items-center justify-center mb-2">
                                <Icon name="users" className="w-6 h-6 text-gray-400 dark:text-gray-500" />
                            </div>
                            <p className="text-gray-500 font-medium">{t("no_guests")}</p>
                            <div className="mt-4">
                                <button
                                    className="px-5 py-2.5 bg-gray-900 hover:bg-black dark:bg-white dark:hover:bg-gray-100 text-white dark:text-gray-900 rounded-xl text-sm font-bold shadow-sm transition-all flex items-center gap-2"
                                    type="button"
                                    onClick={() => openWorkspace("guests", "create")}
                                >
                                    <Icon name="plus" className="w-4 h-4" />
                                    {t("quick_create_guest")}
                                </button>
                            </div>
                        </div>
                    ) : (
                        <div className="w-full">
                            <div className="w-full">
                                <table className="w-full text-left border-collapse block md:table table-fixed">
                                    <thead className="hidden md:table-header-group">
                                        <tr>
                                            <th className="w-[28%] py-4 px-4 text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400 border-b border-black/5 dark:border-white/10">{t("field_guest")}</th>
                                            <th className="w-[24%] py-4 px-4 text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400 border-b border-black/5 dark:border-white/10">{t("email")} / {t("field_phone")}</th>
                                            <th className="w-[26%] py-4 px-4 text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400 border-b border-black/5 dark:border-white/10">{t("field_allergies")} / {t("table_host_status")}</th>
                                            <th className="w-[8%] py-4 px-4 text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400 border-b border-black/5 dark:border-white/10 text-center">{t("field_event")}</th>
                                            <th className="w-[14%] py-4 px-4 text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400 border-b border-black/5 dark:border-white/10 text-right">{t("actions_label")}</th>
                                        </tr>
                                    </thead>
                                    <tbody className="block md:table-row-group divide-y-0 md:divide-y divide-black/5 dark:divide-white/5">
                                        {pagedGuests.map((guestItem, index, array) => {
                                            const isLastRows = index >= array.length - 4;
                                            const conversion = guestHostConversionById[guestItem.id] || null;
                                            const conversionSource = getConversionSource(conversion);
                                            const conversionSourceLabel = getConversionSourceLabel(t, conversionSource);
                                            const guestFullName = `${guestItem.first_name || ""} ${guestItem.last_name || ""}`.trim() || t("field_guest");
                                            const guestEventsCount = guestEventCountByGuestId[guestItem.id] || 0;
                                            const sensitiveData = guestSensitiveById[guestItem.id] || {};

                                            const allergyPreview = toCatalogLabels("allergy", sensitiveData.allergies || [], language).slice(0, 2);
                                            const intolerancePreview = toCatalogLabels("intolerance", sensitiveData.intolerances || [], language).slice(0, 2);
                                            const medicalConditionPreview = toCatalogLabels("medical_condition", sensitiveData.medical_conditions || [], language).slice(0, 1);
                                            const dietaryMedicalRestrictionPreview = toCatalogLabels("dietary_medical_restriction", sensitiveData.dietary_medical_restrictions || [], language).slice(0, 1);
                                            const healthPreview = uniqueValues([
                                                ...allergyPreview,
                                                ...intolerancePreview,
                                                ...medicalConditionPreview,
                                                ...dietaryMedicalRestrictionPreview
                                            ]);
                                            const healthPreviewVisible = healthPreview.slice(0, 2);
                                            const healthPreviewRemaining = Math.max(0, healthPreview.length - healthPreviewVisible.length);

                                            return (
                                                <tr key={guestItem.id} className="relative focus-within:z-50 block md:table-row flex flex-col mb-4 md:mb-0 p-4 md:p-0 rounded-2xl md:rounded-none border border-black/10 dark:border-white/10 md:border-transparent md:border-b bg-white/40 dark:bg-white/5 md:bg-transparent shadow-sm md:shadow-none transition-colors group">

                                                    {/* Guest Name & Avatar */}
                                                    <td className="text-sm text-gray-900 dark:text-white align-middle block md:table-cell py-2 md:py-3 px-0 md:px-4 border-b border-black/5 dark:border-white/5 md:border-none last:border-0 overflow-hidden">
                                                        <div className="flex items-center gap-3 w-full">
                                                            <AvatarCircle
                                                                className="shrink-0"
                                                                label={guestFullName}
                                                                fallback={getInitials(guestFullName, "IN")}
                                                                imageUrl={getGuestAvatarUrl(guestItem, guestFullName)}
                                                                size={42}
                                                            />
                                                            <div className="min-w-0 flex-1 overflow-hidden">
                                                                <button
                                                                    className="font-bold text-[15px] text-gray-900 dark:text-white hover:text-blue-600 dark:hover:text-blue-400 block truncate w-full text-left focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-colors"
                                                                    type="button"
                                                                    onClick={() => openGuestDetail(guestItem.id)}
                                                                    title={guestFullName}
                                                                >
                                                                    {guestFullName}
                                                                </button>
                                                                {guestItem.relationship ? (
                                                                    <p className="text-xs text-gray-500 dark:text-gray-400 truncate mt-0.5 font-medium block w-full" title={toCatalogLabel("relationship", guestItem.relationship, language)}>
                                                                        {toCatalogLabel("relationship", guestItem.relationship, language)}
                                                                    </p>
                                                                ) : null}
                                                            </div>
                                                        </div>
                                                    </td>

                                                    {/* Email & Phone */}
                                                    <td className="text-sm text-gray-600 dark:text-gray-400 align-middle block md:table-cell py-2 md:py-3 px-0 md:px-4 border-b border-black/5 dark:border-white/5 md:border-none last:border-0 overflow-hidden">
                                                        <div className="flex flex-col gap-1 w-full overflow-hidden">
                                                            {guestItem.email ? (
                                                                <span className="text-sm font-medium text-gray-700 dark:text-gray-300 truncate block w-full" title={guestItem.email}>
                                                                    {guestItem.email}
                                                                </span>
                                                            ) : (
                                                                <span className="text-sm text-gray-400 dark:text-gray-600 block">—</span>
                                                            )}
                                                            {guestItem.phone && (
                                                                <span className="text-xs text-gray-500 dark:text-gray-400 truncate block w-full" title={guestItem.phone}>
                                                                    {guestItem.phone}
                                                                </span>
                                                            )}
                                                        </div>
                                                    </td>

                                                    {/* Health & Status */}
                                                    <td className="text-sm text-gray-900 dark:text-white align-middle block md:table-cell py-2 md:py-3 px-0 md:px-4 border-b border-black/5 dark:border-white/5 md:border-none last:border-0 overflow-hidden">
                                                        <div className="flex flex-wrap items-center gap-1.5 w-full">

                                                            {/* 🚀 LÓGICA EXCLUYENTE: Convertido VS Potencial */}
                                                            {conversion ? (
                                                                <>
                                                                    <span className="px-1.5 py-0.5 bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300 rounded text-[10px] font-bold border border-green-200 dark:border-green-800/50 truncate max-w-full">
                                                                        {t("host_converted_badge")}
                                                                    </span>
                                                                    <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold border truncate max-w-full ${conversionSource === "google" ? "bg-red-100 text-red-700 border-red-200 dark:bg-red-900/30 dark:text-red-300 dark:border-red-800/50" : "bg-purple-100 text-purple-700 border-purple-200 dark:bg-purple-900/30 dark:text-purple-300 dark:border-purple-800/50"}`}>
                                                                        {conversionSourceLabel}
                                                                    </span>
                                                                </>
                                                            ) : (guestItem.email || guestItem.phone) ? (
                                                                <span className="px-1.5 py-0.5 bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300 rounded text-[10px] font-bold border border-blue-200 dark:border-blue-800/50 truncate max-w-full">
                                                                    {t("host_potential_badge")}
                                                                </span>
                                                            ) : null}

                                                            {/* Alergias / Etiquetas de Salud (Esto se mantiene independiente) */}
                                                            {healthPreviewVisible.length > 0 ? (
                                                                <>
                                                                    {healthPreviewVisible.map((item) => (
                                                                        <span key={`${guestItem.id}-${item}`} className="px-1.5 py-0.5 bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300 rounded text-[10px] font-bold border border-orange-200 dark:border-orange-800/50 truncate max-w-full" title={item}>
                                                                            {item}
                                                                        </span>
                                                                    ))}
                                                                    {healthPreviewRemaining > 0 ? (
                                                                        <span className="px-1.5 py-0.5 bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400 rounded text-[10px] font-bold border border-gray-200 dark:border-gray-700 shrink-0">
                                                                            +{healthPreviewRemaining}
                                                                        </span>
                                                                    ) : null}
                                                                </>
                                                            ) : null}

                                                        </div>
                                                    </td>

                                                    {/* Events Count */}
                                                    <td className="text-sm text-gray-900 dark:text-white align-middle block md:table-cell py-2 md:py-3 px-0 md:px-4 border-b border-black/5 dark:border-white/5 md:border-none last:border-0">
                                                        <div className="flex md:justify-center">
                                                            <span className="inline-flex items-center justify-center min-w-[28px] h-7 px-2 bg-white dark:bg-black/30 rounded-lg text-sm font-bold text-gray-900 dark:text-white border border-black/5 dark:border-white/10 shadow-sm" title={t("kpi_events")}>
                                                                {guestEventsCount}
                                                            </span>
                                                        </div>
                                                    </td>

                                                    {/* Actions */}
                                                    <td className="align-middle block md:table-cell py-2 md:py-3 px-0 md:px-4 border-b border-black/5 dark:border-white/5 md:border-none last:border-0 relative">
                                                        {/* CAMBIO 1: quitamos el 'md:' antes de justify-end para que siempre se alinee a la derecha */}
                                                        <div className="flex items-center justify-end gap-1 w-full relative">
                                                            <button
                                                                className="p-2.5 text-gray-500 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 dark:hover:text-blue-400 rounded-lg transition-colors shrink-0"
                                                                type="button"
                                                                onClick={() => openGuestDetail(guestItem.id)}
                                                                aria-label={t("view_detail")}
                                                                title={t("view_detail")}
                                                            >
                                                                <Icon name="eye" className="w-5 h-5" />
                                                            </button>
                                                            <button
                                                                className="p-2.5 text-gray-500 hover:text-gray-900 hover:bg-gray-100 dark:hover:bg-gray-800 dark:hover:text-white rounded-lg transition-colors shrink-0"
                                                                type="button"
                                                                onClick={() => handleStartEditGuest(guestItem)}
                                                                aria-label={t("edit_guest")}
                                                                title={t("edit_guest")}
                                                            >
                                                                <Icon name="edit" className="w-5 h-5" />
                                                            </button>

                                                            {/* CAMBIO 2: Añadimos eventos de ratón para recuperar el hover en escritorio */}
                                                            <div
                                                                className="relative shrink-0"
                                                                onMouseEnter={() => setOpenDropdownId(guestItem.id)}
                                                                onMouseLeave={() => setOpenDropdownId(null)}
                                                            >
                                                                <button
                                                                    className={`p-2.5 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500/50 ${openDropdownId === guestItem.id ? "text-gray-900 bg-gray-200 dark:bg-gray-700 dark:text-white" : "text-gray-500 hover:text-gray-900 hover:bg-gray-100 dark:hover:bg-gray-800 dark:hover:text-white"}`}
                                                                    type="button"
                                                                    aria-label={t("open_menu")}
                                                                    title={t("actions_label")}
                                                                    onClick={(e) => {
                                                                        e.stopPropagation();
                                                                        setOpenDropdownId(openDropdownId === guestItem.id ? null : guestItem.id);
                                                                    }}
                                                                >
                                                                    <Icon name="more_horizontal" className="w-4 h-4" />
                                                                </button>

                                                                {openDropdownId === guestItem.id && (
                                                                    <>
                                                                        {/* Capa invisible para cerrar el menú en móvil. Le ponemos md:hidden para que no moleste al ratón en escritorio */}
                                                                        <div
                                                                            className="fixed inset-0 z-[90] md:hidden"
                                                                            onClick={(e) => {
                                                                                e.stopPropagation();
                                                                                setOpenDropdownId(null);
                                                                            }}
                                                                        ></div>

                                                                        {/* El Menú */}
                                                                        <div
                                                                            className={`absolute left-auto right-0 w-56 bg-white/90 dark:bg-gray-800/95 backdrop-blur-xl border border-black/10 dark:border-white/10 rounded-xl shadow-2xl z-[100] py-1 ${isLastRows ? "bottom-full pb-2 origin-bottom-right" : "top-full pt-2 origin-top-right"}`}
                                                                            onClick={() => setOpenDropdownId(null)}
                                                                        >
                                                                            <button
                                                                                className="w-full flex items-center gap-3 px-3 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700/50 hover:text-gray-900 dark:hover:text-white text-left transition-colors"
                                                                                type="button"
                                                                                onClick={() => handleStartEditGuest(guestItem, { openAdvanced: true })}
                                                                            >
                                                                                <Icon name="sparkle" className="w-4 h-4" />
                                                                                <span>{t("guest_advanced_title")}</span>
                                                                            </button>

                                                                            <button
                                                                                className="w-full flex items-center gap-3 px-3 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700/50 hover:text-gray-900 dark:hover:text-white text-left transition-colors"
                                                                                type="button"
                                                                                onClick={() => handleOpenMergeGuest(guestItem)}
                                                                            >
                                                                                <Icon name="link" className="w-4 h-4" />
                                                                                <span>{t("merge_guest_action")}</span>
                                                                            </button>

                                                                            {guestItem.email || guestItem.phone ? (
                                                                                <>
                                                                                    <div className="h-px bg-black/5 dark:bg-white/10 my-1 mx-3" />
                                                                                    <button
                                                                                        className="w-full flex items-center gap-3 px-3 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700/50 hover:text-gray-900 dark:hover:text-white text-left transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                                                                        type="button"
                                                                                        onClick={() => handleCopyHostSignupLink(guestItem)}
                                                                                        disabled={Boolean(conversion)}
                                                                                    >
                                                                                        <Icon name={conversion ? "check" : "link"} className="w-4 h-4" />
                                                                                        <span>{conversion ? t("host_already_registered_action") : t("host_invite_action")}</span>
                                                                                    </button>
                                                                                    <button
                                                                                        className="w-full flex items-center gap-3 px-3 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700/50 hover:text-gray-900 dark:hover:text-white text-left transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                                                                        type="button"
                                                                                        onClick={() => handleShareHostSignupLink(guestItem, "whatsapp")}
                                                                                        disabled={Boolean(conversion)}
                                                                                    >
                                                                                        <Icon name="message" className="w-4 h-4" />
                                                                                        <span>{t("host_invite_whatsapp_action")}</span>
                                                                                    </button>
                                                                                    <button
                                                                                        className="w-full flex items-center gap-3 px-3 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700/50 hover:text-gray-900 dark:hover:text-white text-left transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                                                                        type="button"
                                                                                        onClick={() => handleShareHostSignupLink(guestItem, "email")}
                                                                                        disabled={Boolean(conversion)}
                                                                                    >
                                                                                        <Icon name="mail" className="w-4 h-4" />
                                                                                        <span>{t("host_invite_email_action")}</span>
                                                                                    </button>
                                                                                </>
                                                                            ) : null}

                                                                            <div className="h-px bg-black/5 dark:bg-white/10 my-1 mx-3" />
                                                                            <button
                                                                                className="w-full flex items-center gap-3 px-3 py-2 text-sm font-bold text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 text-left transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                                                                type="button"
                                                                                onClick={() => handleRequestDeleteGuest(guestItem)}
                                                                                disabled={isDeletingGuestId === guestItem.id}
                                                                            >
                                                                                <Icon name="close" className="w-4 h-4" />
                                                                                <span>{isDeletingGuestId === guestItem.id ? t("deleting") : t("delete_guest")}</span>
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
                {filteredGuests.length > 0 && (
                    <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-5 border-t border-black/5 dark:border-white/10 bg-white/30 dark:bg-black/10 backdrop-blur-md">
                        <p className="text-sm text-gray-500 dark:text-gray-400 font-medium">
                            {t("pagination_page")} <span className="font-bold text-gray-900 dark:text-white">{guestPage}</span> / <span className="font-bold text-gray-900 dark:text-white">{guestTotalPages}</span>
                        </p>
                        <div className="flex items-center gap-2">
                            <button
                                className="px-4 py-2 text-sm font-bold text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 border border-black/10 dark:border-white/10 rounded-xl shadow-sm hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                type="button"
                                onClick={() => setGuestPage((prev) => Math.max(1, prev - 1))}
                                disabled={guestPage <= 1}
                            >
                                {t("pagination_prev")}
                            </button>
                            <button
                                className="px-4 py-2 text-sm font-bold text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 border border-black/10 dark:border-white/10 rounded-xl shadow-sm hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                type="button"
                                onClick={() => setGuestPage((prev) => Math.min(guestTotalPages, prev + 1))}
                                disabled={guestPage >= guestTotalPages}
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
                        points={orderedGuestMapPoints}
                        title={t("guests_map_title")}
                        hint={t("guests_map_hint")}
                        emptyText={t("guests_map_empty")}
                        openActionText={t("guests_map_open_detail")}
                        onOpenDetail={(guestId) => openGuestDetail(guestId)}
                        t={t}
                    />
                </div>
            </div>
        </section>
    );
}
