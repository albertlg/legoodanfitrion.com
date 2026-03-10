import React from "react";
import { Icon } from "../../../components/icons";
import { FieldMeta } from "../../../components/field-meta";
import { InlineMessage } from "../../../components/inline-message";
import { AvatarCircle } from "../../../components/avatar-circle";

export function GuestBuilderView({
  t,
  handleSaveGuest,
  canUseDeviceContacts,
  contactPickerUnsupportedReason,
  handleFillGuestFromDeviceContact,
  openFileImportFallback,
  contactImportDetailsRef,
  handlePickDeviceContacts,
  handleImportGoogleContacts,
  isImportingGoogleContacts,
  canUseGoogleContacts,
  contactImportFileInputRef,
  handleImportContactsFile,
  importContactsDraft,
  setImportContactsDraft,
  handlePreviewContactsFromDraft,
  handleClearImportContacts,
  importContactsAnalysis,
  importContactsReady,
  importContactsSelectedReady,
  importContactsStatusSummary,
  importDuplicateMode,
  handleImportDuplicateModeChange,
  importContactsSearch,
  setImportContactsSearch,
  importContactsGroupFilter,
  setImportContactsGroupFilter,
  importContactsGroupOptions,
  importContactsPotentialFilter,
  setImportContactsPotentialFilter,
  importContactsSourceFilter,
  setImportContactsSourceFilter,
  importContactsSort,
  setImportContactsSort,
  IMPORT_CONTACTS_SORT_OPTIONS,
  importContactsPageSize,
  setImportContactsPageSize,
  IMPORT_PREVIEW_PAGE_SIZE_DEFAULT,
  IMPORT_PREVIEW_PAGE_SIZE_OPTIONS,
  handleSelectSuggestedImportContacts,
  handleSelectAllReadyImportContacts,
  handleSelectHighPotentialImportContacts,
  handleSelectDualChannelImportContacts,
  handleSelectDuplicateMergeImportContacts,
  handleApproveAllLowConfidenceMergeContacts,
  handleSelectFilteredReadyImportContacts,
  handleSelectCurrentImportPageReady,
  handleSelectOnlyNewImportContacts,
  handleClearReadyImportContactsSelection,
  importContactsSuggested,
  interpolateText,
  pagedImportContacts,
  selectedImportContactIds,
  toggleImportContactSelection,
  handleOpenLowConfidenceMergeReview,
  importContactsFiltered,
  importContactsPage,
  importContactsTotalPages,
  setImportContactsPage,
  handleImportContacts,
  isImportingContacts,
  importContactsMessage,
  guestFirstName,
  setGuestFirstName,
  guestErrors,
  guestLastName,
  setGuestLastName,
  guestPhotoUrl,
  guestPhotoInputValue,
  handleGuestPhotoUrlChange,
  handleGuestPhotoFileChange,
  handleRemoveGuestPhoto,
  guestEmail,
  setGuestEmail,
  guestPhone,
  setGuestPhone,
  guestRelationship,
  setGuestRelationship,
  relationshipOptions,
  guestCity,
  setGuestCity,
  guestCountry,
  setGuestCountry,
  guestAdvancedProfileCompleted,
  guestAdvancedProfileSignals,
  guestAdvancedProfilePercent,
  guestNextBirthday,
  handleCreateBirthdayEventFromGuest,
  scrollToGuestAdvancedSection,
  guestPriorityCompleted,
  guestPriorityTotal,
  guestPriorityPercent,
  guestPriorityMissing,
  getGuestAdvancedSectionFromPriorityKey,
  handleOpenGuestAdvancedPriority,
  guestAdvancedDetailsRef,
  guestAdvancedToolbarRef,
  guestAdvancedEditTabs,
  guestAdvancedSignalsBySection,
  guestAdvancedEditTab,
  guestAdvancedCurrentStep,
  guestAdvancedCurrentTabLabel,
  guestAdvancedCurrentChecklistDone,
  guestAdvancedCurrentChecklistTotal,
  guestAdvancedCurrentChecklist,
  isSavingGuest,
  guestLastSavedLabel,
  handleGoToPreviousGuestAdvancedSection,
  guestAdvancedPrevTab,
  handleSaveGuestDraft,
  handleSaveAndGoNextPendingGuestAdvancedSection,
  guestAdvancedNextPendingTab,
  guestAdvancedNextPendingLabel,
  handleGoToNextGuestAdvancedSection,
  guestAdvancedNextTab,
  handleGoToFirstPendingGuestAdvancedSection,
  guestAdvancedFirstPendingTab,
  guestAdvancedFirstPendingLabel,
  guestAdvancedSectionRefs,
  guestAdvanced,
  setGuestAdvancedField,
  setGuestErrors,
  setGuestMessage,
  selectedGuestAddressPlace,
  normalizeLookupValue,
  setSelectedGuestAddressPlace,
  mapsStatus,
  mapsError,
  isGuestAddressLoading,
  guestAddressPredictions,
  handleSelectGuestAddressPrediction,
  eventTypeOptions,
  handleAdvancedMultiSelectChange,
  dietTypeOptions,
  tastingPreferenceOptions,
  drinkOptions,
  musicGenreOptions,
  colorOptions,
  sportOptions,
  dayMomentOptions,
  periodicityOptions,
  punctualityOptions,
  cuisineTypeOptions,
  petOptions,
  allergyOptions,
  intoleranceOptions,
  petAllergyOptions,
  medicalConditionOptions,
  dietaryMedicalRestrictionOptions,
  cityOptions,
  countryOptions,
  isEditingGuest,
  handleCancelEditGuest,
  guestMessage,
  MultiSelectField
}) {
  return (
    <form className="bg-white/40 dark:bg-gray-900/40 backdrop-blur-xl border border-black/10 dark:border-white/10 rounded-3xl shadow-2xl p-5 md:p-8 flex flex-col gap-6 w-full max-w-4xl mx-auto" onSubmit={handleSaveGuest} noValidate>
      <p className="text-sm text-gray-500 dark:text-gray-400 ml-1">{t("guest_host_potential_hint")}</p>

      <section className="bg-white/50 dark:bg-white/5 rounded-2xl border border-black/5 dark:border-white/10 p-5 flex flex-col gap-4">
        <p className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">
          <Icon name="phone" className="w-4 h-4" />
          {t("contact_import_mobile_quick_title")}
        </p>
        <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">
          {canUseDeviceContacts ? t("contact_import_mobile_quick_hint") : t("contact_import_mobile_quick_fallback")}
        </p>
        {!canUseDeviceContacts ? (
          <p className="text-xs text-red-500 font-medium">{contactPickerUnsupportedReason}</p>
        ) : null}
        <div className="flex flex-col sm:flex-row flex-wrap items-center gap-3">
          <button
            className="bg-black/5 hover:bg-black/10 dark:bg-white/10 dark:hover:bg-white/20 text-gray-800 dark:text-white font-bold py-2.5 px-5 rounded-xl transition-all w-full sm:w-auto flex justify-center items-center gap-2 text-sm shadow-sm"
            type="button"
            onClick={handleFillGuestFromDeviceContact}
          >
            {t("contact_import_mobile_quick_button")}
          </button>
          {!canUseDeviceContacts ? (
            <button className="bg-black/5 hover:bg-black/10 dark:bg-white/5 dark:hover:bg-white/10 text-gray-700 dark:text-gray-300 font-bold py-2.5 px-5 rounded-xl transition-all w-full sm:w-auto flex justify-center items-center gap-2 text-sm" type="button" onClick={openFileImportFallback}>
              {t("contact_import_open_file_button")}
            </button>
          ) : null}
        </div>
      </section>

      <details ref={contactImportDetailsRef} className="bg-white/50 dark:bg-white/5 rounded-2xl border border-black/5 dark:border-white/10 p-5 flex flex-col gap-4 group">
        <summary className="font-bold text-gray-900 dark:text-white cursor-pointer outline-none marker:text-gray-400">{t("contact_import_title")}</summary>
        <div className="flex flex-col gap-4 mt-4">
          <p className="text-xs text-gray-500 dark:text-gray-400">{t("contact_import_hint")}</p>
          <p className="text-xs text-gray-500 dark:text-gray-400">{t("contact_import_google_hint")}</p>
          <div className="flex flex-col sm:flex-row flex-wrap items-center gap-3">
            <button
              className="bg-black/5 hover:bg-black/10 dark:bg-white/10 dark:hover:bg-white/20 text-gray-800 dark:text-white font-bold py-2.5 px-5 rounded-xl transition-all w-full sm:w-auto flex justify-center items-center gap-2 text-sm shadow-sm"
              type="button"
              onClick={handlePickDeviceContacts}
            >
              {t("contact_import_device_button")}
            </button>
            <button
              className="bg-black/5 hover:bg-black/10 dark:bg-white/5 dark:hover:bg-white/10 text-gray-700 dark:text-gray-300 font-bold py-2.5 px-5 rounded-xl transition-all w-full sm:w-auto flex justify-center items-center gap-2 text-sm"
              type="button"
              onClick={handleImportGoogleContacts}
              disabled={isImportingGoogleContacts || !canUseGoogleContacts}
            >
              {isImportingGoogleContacts ? t("contact_import_google_loading") : t("contact_import_google_button")}
            </button>
          </div>
          <label>
            <span className="block mb-2 ml-1 text-[10px] font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">{t("contact_import_file_label")}</span>
            <input
              ref={contactImportFileInputRef}
              type="file"
              className="w-full text-sm text-gray-500 dark:text-gray-400 file:mr-4 file:py-2.5 file:px-4 file:rounded-xl file:border-0 file:text-sm file:font-bold file:bg-black/5 file:text-gray-700 hover:file:bg-black/10 dark:file:bg-white/10 dark:file:text-white dark:hover:file:bg-white/20 transition-all cursor-pointer"
              accept=".csv,.vcf,.vcard,text/csv,text/vcard"
              onChange={handleImportContactsFile}
            />
            <FieldMeta helpText={t("contact_import_file_help")} />
          </label>
          <label>
            <span className="block mb-2 ml-1 text-[10px] font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">{t("contact_import_paste_label")}</span>
            <textarea className="w-full bg-white/70 dark:bg-black/40 border border-black/10 dark:border-white/10 rounded-xl px-4 py-3 text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 transition-all outline-none shadow-sm" rows={4}
              value={importContactsDraft}
              onChange={(event) => setImportContactsDraft(event.target.value)}
              placeholder={t("contact_import_paste_placeholder")}
            />
          </label>
          <div className="flex flex-col sm:flex-row flex-wrap items-center gap-3">
            <button className="bg-black/5 hover:bg-black/10 dark:bg-white/5 dark:hover:bg-white/10 text-gray-700 dark:text-gray-300 font-bold py-2.5 px-5 rounded-xl transition-all w-full sm:w-auto flex justify-center items-center gap-2 text-sm" type="button" onClick={handlePreviewContactsFromDraft}>
              {t("contact_import_preview_button")}
            </button>
            <button className="bg-black/5 hover:bg-black/10 dark:bg-white/5 dark:hover:bg-white/10 text-gray-700 dark:text-gray-300 font-bold py-2.5 px-5 rounded-xl transition-all w-full sm:w-auto flex justify-center items-center gap-2 text-sm" type="button" onClick={handleClearImportContacts}>
              {t("contact_import_clear_button")}
            </button>
          </div>
          {importContactsAnalysis.length > 0 ? (
            <div className="grid gap-2">
              <p className="text-xs text-gray-500 dark:text-gray-400">
                {t("contact_import_preview_total")} {importContactsAnalysis.length}. {t("contact_import_preview_ready")}{" "}
                {importContactsReady.length}. {t("contact_import_selected_ready")} {importContactsSelectedReady.length}.
              </p>
              <div className="flex flex-wrap gap-2 mt-2" aria-label={t("contact_import_status_summary")}>
                <span className="px-2.5 py-1 bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300 border border-green-200 dark:border-green-800/30 rounded-lg text-[10px] font-bold uppercase tracking-wide">
                  {t("contact_import_status_ready")} {importContactsStatusSummary.ready}
                </span>
                <span className="px-2.5 py-1 bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300 border border-blue-200 dark:border-blue-800/30 rounded-lg text-[10px] font-bold uppercase tracking-wide">
                  {t("contact_import_status_high_potential")} {importContactsStatusSummary.highPotential}
                </span>
                <span className="px-2.5 py-1 bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300 border border-yellow-200 dark:border-yellow-800/30 rounded-lg text-[10px] font-bold uppercase tracking-wide">
                  {t("contact_import_status_medium_potential")} {importContactsStatusSummary.mediumPotential}
                </span>
                <span className="px-2.5 py-1 bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300 border border-red-200 dark:border-red-800/30 rounded-lg text-[10px] font-bold uppercase tracking-wide">
                  {t("contact_import_status_duplicate_file")} {importContactsStatusSummary.duplicateInPreview}
                </span>
              </div>
            </div>
          ) : null}
          {importContactsAnalysis.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mt-4">
              <label>
                <span className="block mb-2 ml-1 text-[10px] font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">{t("contact_import_duplicate_mode_label")}</span>
                <select className="w-full bg-white/70 dark:bg-black/40 border border-black/10 dark:border-white/10 rounded-xl px-4 py-3 text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 transition-all outline-none shadow-sm" value={importDuplicateMode}
                  onChange={(event) => handleImportDuplicateModeChange(event.target.value)}
                >
                  <option value="skip">{t("contact_import_duplicate_mode_skip")}</option>
                  <option value="merge">{t("contact_import_duplicate_mode_merge")}</option>
                </select>
                <FieldMeta helpText={t("contact_import_duplicate_mode_hint")} />
              </label>
              <label>
                <span className="block mb-2 ml-1 text-[10px] font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">{t("search")}</span>
                <input
                  type="search"
                  className="w-full bg-white/70 dark:bg-black/40 border border-black/10 dark:border-white/10 rounded-xl px-4 py-3 text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 transition-all outline-none shadow-sm"
                  value={importContactsSearch}
                  onChange={(event) => setImportContactsSearch(event.target.value)}
                  placeholder={t("contact_import_filter_placeholder")}
                />
              </label>
              <label>
                <span className="block mb-2 ml-1 text-[10px] font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">{t("contact_import_group_filter")}</span>
                <select className="w-full bg-white/70 dark:bg-black/40 border border-black/10 dark:border-white/10 rounded-xl px-4 py-3 text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 transition-all outline-none shadow-sm" value={importContactsGroupFilter}
                  onChange={(event) => setImportContactsGroupFilter(event.target.value)}
                >
                  <option value="all">{t("all_contacts")}</option>
                  {importContactsGroupOptions.map((groupLabel) => (
                    <option key={groupLabel} value={groupLabel}>
                      {groupLabel}
                    </option>
                  ))}
                </select>
              </label>
            </div>
          ) : null}
          {/* --- INICIO BLOQUE RECUPERADO: PREVISUALIZACIÓN DE CONTACTOS --- */}
          {importContactsAnalysis.length > 0 ? (
            <div className="flex flex-wrap gap-2 mt-4">
              <button className="bg-black/5 hover:bg-black/10 dark:bg-white/5 dark:hover:bg-white/10 text-gray-700 dark:text-gray-300 font-bold py-2 px-3 rounded-lg transition-all text-[11px]" type="button" onClick={handleSelectSuggestedImportContacts}>{t("contact_import_select_suggested")}</button>
              <button className="bg-black/5 hover:bg-black/10 dark:bg-white/5 dark:hover:bg-white/10 text-gray-700 dark:text-gray-300 font-bold py-2 px-3 rounded-lg transition-all text-[11px]" type="button" onClick={handleSelectAllReadyImportContacts}>{t("contact_import_select_all_ready")}</button>
              <button className="bg-black/5 hover:bg-black/10 dark:bg-white/5 dark:hover:bg-white/10 text-gray-700 dark:text-gray-300 font-bold py-2 px-3 rounded-lg transition-all text-[11px]" type="button" onClick={handleSelectHighPotentialImportContacts}>{t("contact_import_select_high_potential")}</button>
              <button className="bg-black/5 hover:bg-black/10 dark:bg-white/5 dark:hover:bg-white/10 text-gray-700 dark:text-gray-300 font-bold py-2 px-3 rounded-lg transition-all text-[11px]" type="button" onClick={handleSelectDualChannelImportContacts}>{t("contact_import_select_dual_channel")}</button>
              <button className="bg-black/5 hover:bg-black/10 dark:bg-white/5 dark:hover:bg-white/10 text-gray-700 dark:text-gray-300 font-bold py-2 px-3 rounded-lg transition-all text-[11px]" type="button" onClick={handleSelectDuplicateMergeImportContacts}>{t("contact_import_select_merge_safe")}</button>
              <button className="bg-black/5 hover:bg-black/10 dark:bg-white/5 dark:hover:bg-white/10 text-gray-700 dark:text-gray-300 font-bold py-2 px-3 rounded-lg transition-all text-[11px]" type="button" onClick={handleApproveAllLowConfidenceMergeContacts}>{t("contact_import_merge_approve_all_low")}</button>
              <button className="bg-black/5 hover:bg-black/10 dark:bg-white/5 dark:hover:bg-white/10 text-gray-700 dark:text-gray-300 font-bold py-2 px-3 rounded-lg transition-all text-[11px]" type="button" onClick={handleSelectFilteredReadyImportContacts}>{t("contact_import_select_filtered_ready")}</button>
              <button className="bg-black/5 hover:bg-black/10 dark:bg-white/5 dark:hover:bg-white/10 text-gray-700 dark:text-gray-300 font-bold py-2 px-3 rounded-lg transition-all text-[11px]" type="button" onClick={handleSelectCurrentImportPageReady}>{t("contact_import_select_page_ready")}</button>
              <button className="bg-black/5 hover:bg-black/10 dark:bg-white/5 dark:hover:bg-white/10 text-gray-700 dark:text-gray-300 font-bold py-2 px-3 rounded-lg transition-all text-[11px]" type="button" onClick={handleSelectOnlyNewImportContacts}>{t("contact_import_select_new_only")}</button>
              <button className="bg-red-50 hover:bg-red-100 text-red-600 dark:bg-red-900/20 dark:hover:bg-red-900/40 dark:text-red-400 font-bold py-2 px-3 rounded-lg transition-all text-[11px]" type="button" onClick={handleClearReadyImportContactsSelection}>{t("contact_import_clear_selection")}</button>
            </div>
          ) : null}

          {importContactsAnalysis.length > 0 ? (
            <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-2">
              {interpolateText(t("contact_import_suggested_count"), { count: importContactsSuggested.length })}
            </p>
          ) : null}

          {importContactsAnalysis.length > 0 ? (
            <ul className="flex flex-col gap-2 mt-2 max-h-[400px] overflow-y-auto pr-2 scrollbar-thin">
              {pagedImportContacts.map((contactItem) => (
                <li key={contactItem.previewId}>
                  <label className="flex items-start gap-3 p-4 bg-white/40 dark:bg-black/20 border border-black/5 dark:border-white/5 rounded-xl cursor-pointer hover:bg-white/60 dark:hover:bg-white/5 transition-colors">
                    <input
                      type="checkbox"
                      className="mt-1 w-4 h-4 text-blue-600 bg-white border-gray-300 rounded focus:ring-blue-500 focus:ring-2 dark:bg-gray-700 dark:border-gray-600"
                      checked={selectedImportContactIds.includes(contactItem.previewId)}
                      disabled={!contactItem.canImport}
                      onChange={() => toggleImportContactSelection(contactItem.previewId)}
                    />
                    <div className="flex flex-col min-w-0 flex-1">
                      <strong className="text-sm font-bold text-gray-900 dark:text-white truncate">
                        {contactItem.firstName || t("field_guest")} {contactItem.lastName || ""}
                      </strong>
                      <span className="text-xs text-gray-500 dark:text-gray-400 truncate">{contactItem.email || contactItem.phone || "-"}</span>
                      <span className="text-xs text-gray-500 dark:text-gray-400 truncate">{[contactItem.city, contactItem.country].filter(Boolean).join(", ") || "-"}</span>
                      {contactItem.birthday ? <span className="text-xs text-gray-500 dark:text-gray-400">{`${t("field_birthday")}: ${contactItem.birthday}`}</span> : null}

                      <div className="flex flex-wrap gap-1.5 mt-2">
                        <span className="px-2 py-0.5 bg-black/5 dark:bg-white/10 rounded-md text-[9px] font-bold uppercase tracking-wider text-gray-600 dark:text-gray-300">
                          {t("contact_import_source_label")}: {t(`contact_import_source_${contactItem.importSource}`)}
                        </span>
                        <span className="px-2 py-0.5 bg-black/5 dark:bg-white/10 rounded-md text-[9px] font-bold uppercase tracking-wider text-gray-600 dark:text-gray-300">
                          {t("contact_import_capture_score")}: {contactItem.captureScore}/100 · {t(`contact_import_potential_${contactItem.potentialLevel}`)}
                        </span>
                        {contactItem.groups?.length ? (
                          <span className="px-2 py-0.5 bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-300 rounded-md text-[9px] font-bold uppercase tracking-wider">
                            {t("contact_import_group_filter")}: {contactItem.groups.join(", ")}
                          </span>
                        ) : null}

                        <span className={`px-2 py-0.5 rounded-md text-[9px] font-bold uppercase tracking-wider ${contactItem.duplicateExisting ? 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300' : contactItem.duplicateInPreview ? 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300' : 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300'}`}>
                          {contactItem.duplicateExisting
                            ? contactItem.willMerge
                              ? t("contact_import_status_duplicate_merge")
                              : t("contact_import_status_duplicate_existing")
                            : contactItem.duplicateInPreview
                              ? t("contact_import_status_duplicate_file")
                              : t("contact_import_status_ready")}
                        </span>
                      </div>

                      {contactItem.duplicateExisting && contactItem.existingGuestName ? (
                        <span className="text-xs text-gray-600 dark:text-gray-400 mt-1.5">
                          {t("merge_guest_target_label")}: <strong>{contactItem.existingGuestName}</strong>
                        </span>
                      ) : null}

                      {contactItem.duplicateExisting && contactItem.duplicateReasonLabel ? (
                        <span className="text-[10px] text-gray-500 mt-0.5">
                          {t("contact_import_match_reason_label")}: {contactItem.duplicateReasonLabel}
                        </span>
                      ) : null}

                      {contactItem.requiresMergeApproval ? (
                        <span className="text-xs font-bold text-red-600 dark:text-red-400 mt-1">
                          {t("contact_import_merge_requires_approval")}
                        </span>
                      ) : null}

                      {contactItem.duplicateExisting ? (
                        <span className="text-[10px] text-gray-500 mt-0.5">
                          {t("contact_import_merge_confidence_label")}: {t(`contact_import_merge_confidence_${contactItem.duplicateMergeConfidence || "low"}`)}
                        </span>
                      ) : null}

                      {contactItem.requiresMergeApproval ? (
                        <button
                          className="mt-2 bg-red-50 hover:bg-red-100 text-red-700 dark:bg-red-900/20 dark:hover:bg-red-900/40 dark:text-red-400 font-bold py-1.5 px-3 rounded-lg transition-all text-xs w-fit"
                          type="button"
                          onClick={(event) => {
                            event.preventDefault();
                            event.stopPropagation();
                            handleOpenLowConfidenceMergeReview(contactItem.previewId);
                          }}
                        >
                          {t("contact_import_merge_review_action")}
                        </button>
                      ) : null}
                    </div>
                  </label>
                </li>
              ))}
            </ul>
          ) : null}

          {importContactsFiltered.length > 0 ? (
            <div className="flex flex-col sm:flex-row justify-between items-center gap-4 mt-2 pt-4 border-t border-black/5 dark:border-white/10">
              <p className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                {t("pagination_page")} {Math.min(importContactsPage, importContactsTotalPages)}/{importContactsTotalPages}
              </p>
              <div className="flex gap-2">
                <button
                  className="bg-black/5 hover:bg-black/10 dark:bg-white/5 dark:hover:bg-white/10 text-gray-700 dark:text-gray-300 font-bold py-2 px-4 rounded-xl transition-all text-sm disabled:opacity-50"
                  type="button"
                  onClick={() => setImportContactsPage((prev) => Math.max(1, prev - 1))}
                  disabled={importContactsPage <= 1}
                >
                  {t("pagination_prev")}
                </button>
                <button
                  className="bg-black/5 hover:bg-black/10 dark:bg-white/5 dark:hover:bg-white/10 text-gray-700 dark:text-gray-300 font-bold py-2 px-4 rounded-xl transition-all text-sm disabled:opacity-50"
                  type="button"
                  onClick={() => setImportContactsPage((prev) => Math.min(importContactsTotalPages, prev + 1))}
                  disabled={importContactsPage >= importContactsTotalPages}
                >
                  {t("pagination_next")}
                </button>
              </div>
            </div>
          ) : null}
          {/* --- FIN BLOQUE RECUPERADO --- */}
          <div className="mt-4">
            <button
              className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-6 rounded-xl shadow-sm transition-all w-full sm:w-auto flex justify-center items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              type="button"
              onClick={handleImportContacts}
              disabled={isImportingContacts || importContactsSelectedReady.length === 0}
            >
              {isImportingContacts ? t("contact_import_importing") : t("contact_import_import_button")}
            </button>
          </div>
          <InlineMessage text={importContactsMessage} />
        </div>
      </details>

      <label>
        <span className="block mb-2 ml-1 text-[10px] font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">{t("field_first_name")} *</span>
        <input type="text" className="w-full bg-white/70 dark:bg-black/40 border border-black/10 dark:border-white/10 rounded-xl px-4 py-3 text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 transition-all outline-none shadow-sm" value={guestFirstName}
          onChange={(event) => setGuestFirstName(event.target.value)}
          placeholder={t("placeholder_first_name")}
          aria-invalid={Boolean(guestErrors.firstName)}
        />
        <FieldMeta errorText={guestErrors.firstName ? t(guestErrors.firstName) : ""} />
      </label>

      <label>
        <span className="block mb-2 ml-1 text-[10px] font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">{t("field_last_name")}</span>
        <input type="text" className="w-full bg-white/70 dark:bg-black/40 border border-black/10 dark:border-white/10 rounded-xl px-4 py-3 text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 transition-all outline-none shadow-sm" value={guestLastName}
          onChange={(event) => setGuestLastName(event.target.value)}
          placeholder={t("placeholder_last_name")}
          aria-invalid={Boolean(guestErrors.lastName)}
        />
        <FieldMeta errorText={guestErrors.lastName ? t(guestErrors.lastName) : ""} />
      </label>

      <label>
        <span className="block mb-2 ml-1 text-[10px] font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">{t("field_guest_photo")}</span>
        <div className="flex items-center gap-4 mb-4">
          <AvatarCircle
            className="border-2 border-white dark:border-gray-800 shadow-sm flex-shrink-0"
            label={`${guestFirstName || ""} ${guestLastName || ""}`.trim() || t("field_guest")}
            fallback="IN"
            imageUrl={guestPhotoUrl}
            size={56}
          />
          <input type="url" className="w-full bg-white/70 dark:bg-black/40 border border-black/10 dark:border-white/10 rounded-xl px-4 py-3 text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 transition-all outline-none shadow-sm" value={guestPhotoInputValue}
            onChange={(event) => handleGuestPhotoUrlChange(event.target.value)}
            placeholder={t("placeholder_guest_photo")}
          />
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <label className="bg-black/5 hover:bg-black/10 dark:bg-white/5 dark:hover:bg-white/10 text-gray-700 dark:text-gray-300 font-bold py-2 px-4 rounded-xl transition-all text-sm cursor-pointer flex items-center justify-center">
            {t("guest_photo_upload")}
            <input type="file" accept="image/*" className="hidden" onChange={handleGuestPhotoFileChange} />
          </label>
          <button className="bg-red-50 hover:bg-red-100 text-red-600 dark:bg-red-900/20 dark:hover:bg-red-900/40 dark:text-red-400 font-bold py-2 px-4 rounded-xl transition-all text-sm disabled:opacity-50 disabled:cursor-not-allowed" type="button" onClick={handleRemoveGuestPhoto} disabled={!guestPhotoUrl}>
            {t("guest_photo_remove")}
          </button>
        </div>
        <FieldMeta helpText={t("guest_photo_hint")} />
      </label>

      <label>
        <span className="flex items-center gap-2 mb-2 ml-1 text-[10px] font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">
          <Icon name="mail" className="w-4 h-4" />
          {t("email")}
        </span>
        <input type="email" className="w-full bg-white/70 dark:bg-black/40 border border-black/10 dark:border-white/10 rounded-xl px-4 py-3 text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 transition-all outline-none shadow-sm" value={guestEmail}
          onChange={(event) => setGuestEmail(event.target.value)}
          placeholder={t("placeholder_email")}
          aria-invalid={Boolean(guestErrors.email)}
        />
        <FieldMeta errorText={guestErrors.email ? t(guestErrors.email) : ""} />
      </label>

      <label>
        <span className="flex items-center gap-2 mb-2 ml-1 text-[10px] font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">
          <Icon name="phone" className="w-4 h-4" />
          {t("field_phone")}
        </span>
        <input type="tel" className="w-full bg-white/70 dark:bg-black/40 border border-black/10 dark:border-white/10 rounded-xl px-4 py-3 text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 transition-all outline-none shadow-sm" value={guestPhone}
          onChange={(event) => setGuestPhone(event.target.value)}
          placeholder={t("placeholder_phone")}
          aria-invalid={Boolean(guestErrors.phone)}
        />
        <FieldMeta
          helpText={t("hint_contact_required")}
          errorText={guestErrors.phone ? t(guestErrors.phone) : guestErrors.contact ? t(guestErrors.contact) : ""}
        />
      </label>

      <label>
        <span className="block mb-2 ml-1 text-[10px] font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">{t("field_relationship")}</span>
        <select className="w-full bg-white/70 dark:bg-black/40 border border-black/10 dark:border-white/10 rounded-xl px-4 py-3 text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 transition-all outline-none shadow-sm" value={guestRelationship}
          onChange={(event) => setGuestRelationship(event.target.value)}
          aria-invalid={Boolean(guestErrors.relationship)}
        >
          <option value="">{t("select_option_prompt")}</option>
          {relationshipOptions.map((optionValue) => (
            <option key={optionValue} value={optionValue}>
              {optionValue}
            </option>
          ))}
        </select>
        <FieldMeta errorText={guestErrors.relationship ? t(guestErrors.relationship) : ""} />
      </label>

      <label>
        <span className="block mb-2 ml-1 text-[10px] font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">{t("field_city")}</span>
        <input type="text" className="w-full bg-white/70 dark:bg-black/40 border border-black/10 dark:border-white/10 rounded-xl px-4 py-3 text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 transition-all outline-none shadow-sm" value={guestCity}
          onChange={(event) => setGuestCity(event.target.value)}
          placeholder={t("placeholder_city")}
          list="guest-city-options"
          aria-invalid={Boolean(guestErrors.city)}
        />
        <FieldMeta errorText={guestErrors.city ? t(guestErrors.city) : ""} />
      </label>

      <label>
        <span className="block mb-2 ml-1 text-[10px] font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">{t("field_country")}</span>
        <input type="text" className="w-full bg-white/70 dark:bg-black/40 border border-black/10 dark:border-white/10 rounded-xl px-4 py-3 text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 transition-all outline-none shadow-sm" value={guestCountry}
          onChange={(event) => setGuestCountry(event.target.value)}
          placeholder={t("placeholder_country")}
          list="guest-country-options"
          aria-invalid={Boolean(guestErrors.country)}
        />
        <FieldMeta errorText={guestErrors.country ? t(guestErrors.country) : ""} />
      </label>

      {/* TÍTULO CONFIGURACIÓN AVANZADA */}
      <details ref={guestAdvancedDetailsRef} className="bg-white/50 dark:bg-white/5 rounded-2xl border border-black/5 dark:border-white/10 flex flex-col gap-4 group mt-4">
        <summary className="flex items-center justify-between font-bold text-gray-900 dark:text-white cursor-pointer outline-none marker:text-gray-400 p-5">
          <span className="flex items-center gap-2">
            <Icon name="sparkle" className="w-5 h-5 text-blue-500" />
            {t("guest_advanced_title")}
          </span>
          <span className="text-xs font-bold bg-white dark:bg-gray-800 border border-black/5 dark:border-white/10 shadow-sm px-3 py-1.5 rounded-xl text-gray-700 dark:text-gray-200">
            {guestAdvancedProfilePercent}%
          </span>
        </summary>

        <div className="flex flex-col">

          {/* STICKY TOOLBAR MODERNA */}
          <div ref={guestAdvancedToolbarRef} className="sticky top-[80px] lg:top-[100px] z-30 bg-gray-50/95 dark:bg-gray-900/95 backdrop-blur-xl border-y border-black/5 dark:border-white/10 shadow-sm p-4 flex flex-col gap-4 w-full">

            {/* TABS */}
            <div className="flex flex-wrap gap-2 pb-2 border-b border-black/5 dark:border-white/10" role="tablist" aria-label={t("guest_advanced_title")}>
              {guestAdvancedEditTabs.map((tabItem) => {
                const isCompleted = Boolean(guestAdvancedSignalsBySection[tabItem.key]?.done);
                const isActive = guestAdvancedEditTab === tabItem.key;
                return (
                  <button
                    key={tabItem.key}
                    type="button"
                    role="tab"
                    aria-selected={isActive}
                    className={`flex items-center gap-2 px-4 py-2 rounded-full text-[13px] font-bold transition-all whitespace-nowrap shadow-sm border ${isActive ? "bg-blue-600 text-white border-blue-700" : "bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 border-black/5 dark:border-white/10 hover:bg-gray-50 dark:hover:bg-gray-700"}`}
                    onClick={() => scrollToGuestAdvancedSection(tabItem.key)}
                  >
                    <span>{tabItem.label}</span>
                    <span className={`flex items-center justify-center w-4 h-4 rounded-full ${isActive ? (isCompleted ? "bg-white/20 text-white" : "bg-black/20 text-white") : (isCompleted ? "bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400" : "bg-gray-100 text-gray-400 dark:bg-gray-700")}`} aria-hidden="true">
                      <Icon name={isCompleted ? "check" : "clock"} className="w-2.5 h-2.5" />
                    </span>
                  </button>
                );
              })}
            </div>

            {/* INDICADOR DE PASO Y CHECKLIST */}
            <div className="flex flex-col gap-2">
              <p className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider flex items-center">
                <span className="bg-black/10 dark:bg-white/10 px-2 py-0.5 rounded-md mr-2 text-gray-700 dark:text-gray-200">
                  {guestAdvancedCurrentStep}/{guestAdvancedEditTabs.length}
                </span>
                {guestAdvancedCurrentTabLabel}
              </p>

              <div className="flex flex-wrap gap-2">
                {guestAdvancedCurrentChecklist.map((item) => (
                  <span
                    key={item.key}
                    className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider border shadow-sm ${item.done ? "bg-green-50 text-green-700 border-green-200 dark:bg-green-900/20 dark:text-green-300 dark:border-green-800/30" : "bg-white text-gray-600 border-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:border-gray-700"}`}
                  >
                    <Icon name={item.done ? "check" : "clock"} className="w-3 h-3" />
                    {item.label}
                  </span>
                ))}
              </div>
            </div>

            {/* BOTONERA COMPACTA (CSS GRID) */}
            <div className="grid grid-cols-2 sm:flex sm:flex-wrap gap-2 pt-2 border-t border-black/5 dark:border-white/10">
              <button
                className="col-span-1 bg-white hover:bg-gray-50 dark:bg-gray-800 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-200 border border-black/10 dark:border-white/10 font-bold py-2.5 px-3 rounded-xl transition-all text-xs disabled:opacity-50 shadow-sm flex items-center justify-center gap-1.5"
                type="button"
                onClick={handleGoToPreviousGuestAdvancedSection}
                disabled={!guestAdvancedPrevTab}
              >
                <Icon name="arrow_left" className="w-3.5 h-3.5" />
                {t("pagination_prev")}
              </button>

              <button
                className="col-span-1 bg-white hover:bg-gray-50 dark:bg-gray-800 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-200 border border-black/10 dark:border-white/10 font-bold py-2.5 px-3 rounded-xl transition-all text-xs disabled:opacity-50 shadow-sm flex items-center justify-center gap-1.5"
                type="button"
                onClick={handleSaveGuestDraft}
                disabled={isSavingGuest}
              >
                <Icon name="check" className="w-3.5 h-3.5" />
                {isSavingGuest ? t("guest_saving_draft") : t("guest_save_draft")}
              </button>

              <button
                className="col-span-2 sm:col-span-1 bg-purple-100 hover:bg-purple-200 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300 dark:hover:bg-purple-900/50 border border-purple-200 dark:border-purple-800/30 font-bold py-2.5 px-3 rounded-xl transition-all text-xs disabled:opacity-50 shadow-sm flex items-center justify-center gap-1.5"
                type="button"
                onClick={handleSaveAndGoNextPendingGuestAdvancedSection}
                disabled={!guestAdvancedNextPendingTab || isSavingGuest}
              >
                <Icon name="sparkle" className="w-3.5 h-3.5" />
                {t("guest_wizard_save_next_pending")}
              </button>

              <button
                className="col-span-2 sm:col-span-1 bg-blue-600 hover:bg-blue-700 text-white font-bold py-2.5 px-4 rounded-xl transition-all text-xs disabled:opacity-50 shadow-sm flex items-center justify-center gap-1.5"
                type="button"
                onClick={handleGoToNextGuestAdvancedSection}
                disabled={!guestAdvancedNextTab || isSavingGuest}
              >
                {t("guest_wizard_validate_next")}
                <Icon name="arrow_right" className="w-3.5 h-3.5" />
              </button>

              {guestAdvancedFirstPendingTab && guestAdvancedFirstPendingTab !== guestAdvancedEditTab ? (
                <button
                  className="col-span-2 bg-black/5 hover:bg-black/10 dark:bg-white/5 dark:hover:bg-white/10 text-gray-700 dark:text-gray-300 font-bold py-2.5 px-3 rounded-xl transition-all text-xs disabled:opacity-50 flex items-center justify-center gap-1.5"
                  type="button"
                  onClick={handleGoToFirstPendingGuestAdvancedSection}
                >
                  <Icon name="sparkle" className="w-3.5 h-3.5" />
                  {t("guest_advanced_jump_pending")}
                </button>
              ) : null}
            </div>

            {/* INFO DE GUARDADO */}
            <p className="flex items-center justify-center sm:justify-start gap-1.5 text-[10px] text-gray-400 font-medium uppercase tracking-wider mt-1">
              <Icon name="clock" className="w-3 h-3" />
              <span>{t("guest_last_saved_label")}:</span>
              <span>{isSavingGuest ? t("guest_saving_draft") : guestLastSavedLabel}</span>
            </p>
          </div>

          {/* CONTENIDO DE LOS TABS */}
          <div className="flex flex-col gap-6 p-5">
            {guestAdvancedEditTab === "identity" ? (
              <section className="scroll-mt-[320px] sm:scroll-mt-[200px]" ref={(node) => { guestAdvancedSectionRefs.current.identity = node; }}>
                <p className="text-sm font-bold flex items-center gap-2 text-gray-900 dark:text-white mb-4 pb-2 border-b border-black/5 dark:border-white/10">
                  <Icon name="user" className="w-4 h-4 text-blue-500" />
                  {t("guest_advanced_section_identity")}
                </p>
                <div className="flex flex-col gap-4">
                  <label>
                    <span className="block mb-2 ml-1 text-[10px] font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">{t("field_company")}</span>
                    <input type="text" className="w-full bg-white/70 dark:bg-black/40 border border-black/10 dark:border-white/10 rounded-xl px-4 py-3 text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 transition-all outline-none shadow-sm" value={guestAdvanced.company}
                      onChange={(event) => setGuestAdvancedField("company", event.target.value)}
                      placeholder={t("placeholder_company")}
                      aria-invalid={Boolean(guestErrors.company)}
                    />
                    <FieldMeta errorText={guestErrors.company ? t(guestErrors.company) : ""} />
                  </label>
                  <label>
                    <span className="block mb-2 ml-1 text-[10px] font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">{t("field_address")}</span>
                    <input type="text" className="w-full bg-white/70 dark:bg-black/40 border border-black/10 dark:border-white/10 rounded-xl px-4 py-3 text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 transition-all outline-none shadow-sm" value={guestAdvanced.address}
                      onChange={(event) => {
                        const nextValue = event.target.value;
                        setGuestAdvancedField("address", nextValue);
                        setGuestErrors((prev) => ({ ...prev, address: undefined }));
                        setGuestMessage("");
                        if (
                          selectedGuestAddressPlace &&
                          normalizeLookupValue(nextValue) !== normalizeLookupValue(selectedGuestAddressPlace.formattedAddress)
                        ) {
                          setSelectedGuestAddressPlace(null);
                        }
                      }}
                      placeholder={t("placeholder_address")}
                      aria-invalid={Boolean(guestErrors.address)}
                      autoComplete="off"
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
                      errorText={guestErrors.address ? t(guestErrors.address) : ""}
                    />
                    {mapsStatus === "ready" && guestAdvanced.address.trim().length >= 4 ? (
                      <ul className="mt-2 flex flex-col gap-1 bg-white dark:bg-gray-800 border border-black/10 dark:border-white/10 rounded-xl overflow-hidden shadow-lg" role="listbox" aria-label={t("address_suggestions")}>
                        {isGuestAddressLoading ? <li className="w-full text-left px-4 py-3 text-xs text-gray-500 italic">{t("address_searching")}</li> : null}
                        {!isGuestAddressLoading && guestAddressPredictions.length === 0 ? (
                          <li className="w-full text-left px-4 py-3 text-xs text-gray-500 italic">{t("address_no_matches")}</li>
                        ) : null}
                        {guestAddressPredictions.map((prediction) => (
                          <li key={prediction.place_id}>
                            <button
                              type="button"
                              className="w-full text-left px-4 py-3 text-sm hover:bg-black/5 dark:hover:bg-white/5 text-gray-700 dark:text-gray-300 transition-colors flex items-center gap-3"
                              onClick={() => handleSelectGuestAddressPrediction(prediction)}
                            >
                              <Icon name="location" className="w-4 h-4 text-gray-400" />
                              {prediction.description}
                            </button>
                          </li>
                        ))}
                      </ul>
                    ) : null}
                    {selectedGuestAddressPlace?.placeId ? (
                      <p className="text-xs font-bold text-green-600 dark:text-green-400 mt-2">{t("address_validated")}</p>
                    ) : null}
                  </label>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <label>
                      <span className="block mb-2 ml-1 text-[10px] font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">{t("field_postal_code")}</span>
                      <input type="text" className="w-full bg-white/70 dark:bg-black/40 border border-black/10 dark:border-white/10 rounded-xl px-4 py-3 text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 transition-all outline-none shadow-sm" value={guestAdvanced.postalCode}
                        onChange={(event) => setGuestAdvancedField("postalCode", event.target.value)}
                        placeholder={t("placeholder_postal_code")}
                        aria-invalid={Boolean(guestErrors.postalCode)}
                      />
                      <FieldMeta errorText={guestErrors.postalCode ? t(guestErrors.postalCode) : ""} />
                    </label>
                    <label>
                      <span className="block mb-2 ml-1 text-[10px] font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">{t("field_state_region")}</span>
                      <input type="text" className="w-full bg-white/70 dark:bg-black/40 border border-black/10 dark:border-white/10 rounded-xl px-4 py-3 text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 transition-all outline-none shadow-sm" value={guestAdvanced.stateRegion}
                        onChange={(event) => setGuestAdvancedField("stateRegion", event.target.value)}
                        placeholder={t("placeholder_state_region")}
                        aria-invalid={Boolean(guestErrors.stateRegion)}
                      />
                      <FieldMeta errorText={guestErrors.stateRegion ? t(guestErrors.stateRegion) : ""} />
                    </label>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <label>
                      <span className="block mb-2 ml-1 text-[10px] font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">{t("field_birthday")}</span>
                      <input type="date" className="w-full bg-white/70 dark:bg-black/40 border border-black/10 dark:border-white/10 rounded-xl px-4 py-3 text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 transition-all outline-none shadow-sm" value={guestAdvanced.birthday}
                        onChange={(event) => setGuestAdvancedField("birthday", event.target.value)}
                      />
                    </label>
                    <label>
                      <span className="block mb-2 ml-1 text-[10px] font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">{t("field_last_meet")}</span>
                      <input type="date" className="w-full bg-white/70 dark:bg-black/40 border border-black/10 dark:border-white/10 rounded-xl px-4 py-3 text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 transition-all outline-none shadow-sm" value={guestAdvanced.lastMeetAt}
                        onChange={(event) => setGuestAdvancedField("lastMeetAt", event.target.value)}
                      />
                    </label>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <label>
                      <span className="block mb-2 ml-1 text-[10px] font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">X / Twitter</span>
                      <input type="text" className="w-full bg-white/70 dark:bg-black/40 border border-black/10 dark:border-white/10 rounded-xl px-4 py-3 text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 transition-all outline-none shadow-sm" value={guestAdvanced.twitter}
                        onChange={(event) => setGuestAdvancedField("twitter", event.target.value)}
                        placeholder="@usuario"
                        aria-invalid={Boolean(guestErrors.twitter)}
                      />
                      <FieldMeta errorText={guestErrors.twitter ? t(guestErrors.twitter) : ""} />
                    </label>
                    <label>
                      <span className="block mb-2 ml-1 text-[10px] font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">Instagram</span>
                      <input type="text" className="w-full bg-white/70 dark:bg-black/40 border border-black/10 dark:border-white/10 rounded-xl px-4 py-3 text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 transition-all outline-none shadow-sm" value={guestAdvanced.instagram}
                        onChange={(event) => setGuestAdvancedField("instagram", event.target.value)}
                        placeholder="@usuario"
                        aria-invalid={Boolean(guestErrors.instagram)}
                      />
                      <FieldMeta errorText={guestErrors.instagram ? t(guestErrors.instagram) : ""} />
                    </label>
                    <label>
                      <span className="block mb-2 ml-1 text-[10px] font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">LinkedIn</span>
                      <input type="text" className="w-full bg-white/70 dark:bg-black/40 border border-black/10 dark:border-white/10 rounded-xl px-4 py-3 text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 transition-all outline-none shadow-sm" value={guestAdvanced.linkedIn}
                        onChange={(event) => setGuestAdvancedField("linkedIn", event.target.value)}
                        placeholder="https://linkedin.com/in/..."
                        aria-invalid={Boolean(guestErrors.linkedIn)}
                      />
                      <FieldMeta errorText={guestErrors.linkedIn ? t(guestErrors.linkedIn) : ""} />
                    </label>
                  </div>
                </div>
              </section>
            ) : null}

            {guestAdvancedEditTab === "food" ? (
              <section className="scroll-mt-[320px] sm:scroll-mt-[200px]" ref={(node) => { guestAdvancedSectionRefs.current.food = node; }}>
                <p className="text-sm font-bold flex items-center gap-2 text-gray-900 dark:text-white mb-4 pb-2 border-b border-black/5 dark:border-white/10">
                  <Icon name="sparkle" className="w-4 h-4 text-orange-500" />
                  {t("guest_advanced_section_food")}
                </p>
                <div className="flex flex-col gap-4">
                  <MultiSelectField
                    id="guest-experience-types"
                    label={t("field_experience_type")}
                    value={guestAdvanced.experienceTypes}
                    options={eventTypeOptions}
                    onChange={(nextValue) => handleAdvancedMultiSelectChange("experienceTypes", nextValue)}
                    helpText={t("multi_select_hint")}
                    t={t}
                  />
                  <MultiSelectField
                    id="guest-preferred-relationships"
                    label={t("field_relationship")}
                    value={guestAdvanced.preferredGuestRelationships}
                    options={relationshipOptions}
                    onChange={(nextValue) => handleAdvancedMultiSelectChange("preferredGuestRelationships", nextValue)}
                    helpText={t("multi_select_hint")}
                    t={t}
                  />
                  <label>
                    <span className="block mb-2 ml-1 text-[10px] font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">{t("field_diet_type")}</span>
                    <select className="w-full bg-white/70 dark:bg-black/40 border border-black/10 dark:border-white/10 rounded-xl px-4 py-3 text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 transition-all outline-none shadow-sm" value={guestAdvanced.dietType}
                      onChange={(event) => setGuestAdvancedField("dietType", event.target.value)}
                    >
                      <option value="">{t("select_option_prompt")}</option>
                      {dietTypeOptions.map((optionValue) => (
                        <option key={optionValue} value={optionValue}>
                          {optionValue}
                        </option>
                      ))}
                    </select>
                  </label>
                  <MultiSelectField
                    id="guest-tasting-preferences"
                    label={t("field_tasting_preferences")}
                    value={guestAdvanced.tastingPreferences}
                    options={tastingPreferenceOptions}
                    onChange={(nextValue) => handleAdvancedMultiSelectChange("tastingPreferences", nextValue)}
                    helpText={t("multi_select_hint")}
                    t={t}
                  />
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <label>
                      <span className="block mb-2 ml-1 text-[10px] font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">{t("field_food_likes")}</span>
                      <input type="text" className="w-full bg-white/70 dark:bg-black/40 border border-black/10 dark:border-white/10 rounded-xl px-4 py-3 text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 transition-all outline-none shadow-sm" value={guestAdvanced.foodLikes}
                        onChange={(event) => setGuestAdvancedField("foodLikes", event.target.value)}
                        placeholder={t("placeholder_list_comma")}
                      />
                    </label>
                    <label>
                      <span className="block mb-2 ml-1 text-[10px] font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">{t("field_food_dislikes")}</span>
                      <input type="text" className="w-full bg-white/70 dark:bg-black/40 border border-black/10 dark:border-white/10 rounded-xl px-4 py-3 text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 transition-all outline-none shadow-sm" value={guestAdvanced.foodDislikes}
                        onChange={(event) => setGuestAdvancedField("foodDislikes", event.target.value)}
                        placeholder={t("placeholder_list_comma")}
                      />
                    </label>
                  </div>
                  <MultiSelectField
                    id="guest-drink-likes"
                    label={t("field_drink_likes")}
                    value={guestAdvanced.drinkLikes}
                    options={drinkOptions}
                    onChange={(nextValue) => handleAdvancedMultiSelectChange("drinkLikes", nextValue)}
                    helpText={t("multi_select_hint")}
                    t={t}
                  />
                  <MultiSelectField
                    id="guest-drink-dislikes"
                    label={t("field_drink_dislikes")}
                    value={guestAdvanced.drinkDislikes}
                    options={drinkOptions}
                    onChange={(nextValue) => handleAdvancedMultiSelectChange("drinkDislikes", nextValue)}
                    helpText={t("multi_select_hint")}
                    t={t}
                  />
                </div>
              </section>
            ) : null}

            {guestAdvancedEditTab === "lifestyle" ? (
              <section className="scroll-mt-[320px] sm:scroll-mt-[200px]" ref={(node) => { guestAdvancedSectionRefs.current.lifestyle = node; }}>
                <p className="text-sm font-bold flex items-center gap-2 text-gray-900 dark:text-white mb-4 pb-2 border-b border-black/5 dark:border-white/10">
                  <Icon name="star" className="w-4 h-4 text-yellow-500" />
                  {t("guest_advanced_section_lifestyle")}
                </p>
                <div className="flex flex-col gap-4">
                  <MultiSelectField
                    id="guest-music-genres"
                    label={t("field_music_genres")}
                    value={guestAdvanced.musicGenres}
                    options={musicGenreOptions}
                    onChange={(nextValue) => handleAdvancedMultiSelectChange("musicGenres", nextValue)}
                    helpText={t("multi_select_hint")}
                    t={t}
                  />
                  <label>
                    <span className="block mb-2 ml-1 text-[10px] font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">{t("field_favorite_color")}</span>
                    <select className="w-full bg-white/70 dark:bg-black/40 border border-black/10 dark:border-white/10 rounded-xl px-4 py-3 text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 transition-all outline-none shadow-sm" value={guestAdvanced.favoriteColor}
                      onChange={(event) => setGuestAdvancedField("favoriteColor", event.target.value)}
                    >
                      <option value="">{t("select_option_prompt")}</option>
                      {colorOptions.map((optionValue) => (
                        <option key={optionValue} value={optionValue}>
                          {optionValue}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label>
                    <span className="block mb-2 ml-1 text-[10px] font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">{t("field_books")}</span>
                    <input type="text" className="w-full bg-white/70 dark:bg-black/40 border border-black/10 dark:border-white/10 rounded-xl px-4 py-3 text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 transition-all outline-none shadow-sm" value={guestAdvanced.books}
                      onChange={(event) => setGuestAdvancedField("books", event.target.value)}
                      placeholder={t("placeholder_list_comma")}
                    />
                  </label>
                  <label>
                    <span className="block mb-2 ml-1 text-[10px] font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">{t("field_movies")}</span>
                    <input type="text" className="w-full bg-white/70 dark:bg-black/40 border border-black/10 dark:border-white/10 rounded-xl px-4 py-3 text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 transition-all outline-none shadow-sm" value={guestAdvanced.movies}
                      onChange={(event) => setGuestAdvancedField("movies", event.target.value)}
                      placeholder={t("placeholder_list_comma")}
                    />
                  </label>
                  <label>
                    <span className="block mb-2 ml-1 text-[10px] font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">{t("field_series")}</span>
                    <input type="text" className="w-full bg-white/70 dark:bg-black/40 border border-black/10 dark:border-white/10 rounded-xl px-4 py-3 text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 transition-all outline-none shadow-sm" value={guestAdvanced.series}
                      onChange={(event) => setGuestAdvancedField("series", event.target.value)}
                      placeholder={t("placeholder_list_comma")}
                    />
                  </label>
                  <MultiSelectField
                    id="guest-sports"
                    label={t("field_sport")}
                    value={guestAdvanced.sports}
                    options={sportOptions}
                    onChange={(nextValue) => handleAdvancedMultiSelectChange("sports", nextValue)}
                    helpText={t("multi_select_hint")}
                    t={t}
                  />
                  <label>
                    <span className="block mb-2 ml-1 text-[10px] font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">{t("field_team_fan")}</span>
                    <input type="text" className="w-full bg-white/70 dark:bg-black/40 border border-black/10 dark:border-white/10 rounded-xl px-4 py-3 text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 transition-all outline-none shadow-sm" value={guestAdvanced.teamFan}
                      onChange={(event) => setGuestAdvancedField("teamFan", event.target.value)}
                      placeholder={t("placeholder_team")}
                    />
                  </label>
                  <MultiSelectField
                    id="guest-day-moments"
                    label={t("field_day_moment")}
                    value={guestAdvanced.preferredDayMoments}
                    options={dayMomentOptions}
                    onChange={(nextValue) => handleAdvancedMultiSelectChange("preferredDayMoments", nextValue)}
                    helpText={t("multi_select_hint")}
                    t={t}
                  />
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <label>
                      <span className="block mb-2 ml-1 text-[10px] font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">{t("field_periodicity")}</span>
                      <select className="w-full bg-white/70 dark:bg-black/40 border border-black/10 dark:border-white/10 rounded-xl px-4 py-3 text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 transition-all outline-none shadow-sm" value={guestAdvanced.periodicity}
                        onChange={(event) => setGuestAdvancedField("periodicity", event.target.value)}
                      >
                        <option value="">{t("select_option_prompt")}</option>
                        {periodicityOptions.map((optionValue) => (
                          <option key={optionValue} value={optionValue}>
                            {optionValue}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label>
                      <span className="block mb-2 ml-1 text-[10px] font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">{t("field_punctuality")}</span>
                      <select className="w-full bg-white/70 dark:bg-black/40 border border-black/10 dark:border-white/10 rounded-xl px-4 py-3 text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 transition-all outline-none shadow-sm" value={guestAdvanced.punctuality}
                        onChange={(event) => setGuestAdvancedField("punctuality", event.target.value)}
                      >
                        <option value="">{t("select_option_prompt")}</option>
                        {punctualityOptions.map((optionValue) => (
                          <option key={optionValue} value={optionValue}>
                            {optionValue}
                          </option>
                        ))}
                      </select>
                    </label>
                  </div>
                  <MultiSelectField
                    id="guest-cuisine-types"
                    label={t("field_cuisine_type")}
                    value={guestAdvanced.cuisineTypes}
                    options={cuisineTypeOptions}
                    onChange={(nextValue) => handleAdvancedMultiSelectChange("cuisineTypes", nextValue)}
                    helpText={t("multi_select_hint")}
                    t={t}
                  />
                  <MultiSelectField
                    id="guest-pets"
                    label={t("field_pets")}
                    value={guestAdvanced.pets}
                    options={petOptions}
                    onChange={(nextValue) => handleAdvancedMultiSelectChange("pets", nextValue)}
                    helpText={t("multi_select_hint")}
                    t={t}
                  />
                </div>
              </section>
            ) : null}

            {guestAdvancedEditTab === "conversation" ? (
              <section className="scroll-mt-[320px] sm:scroll-mt-[200px]" ref={(node) => { guestAdvancedSectionRefs.current.conversation = node; }}>
                <p className="text-sm font-bold flex items-center gap-2 text-gray-900 dark:text-white mb-4 pb-2 border-b border-black/5 dark:border-white/10">
                  <Icon name="message" className="w-4 h-4 text-green-500" />
                  {t("guest_advanced_section_conversation")}
                </p>
                <div className="flex flex-col gap-4">
                  <label>
                    <span className="block mb-2 ml-1 text-[10px] font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">{t("field_last_talk_topic")}</span>
                    <input type="text" className="w-full bg-white/70 dark:bg-black/40 border border-black/10 dark:border-white/10 rounded-xl px-4 py-3 text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 transition-all outline-none shadow-sm" value={guestAdvanced.lastTalkTopic}
                      onChange={(event) => setGuestAdvancedField("lastTalkTopic", event.target.value)}
                      placeholder={t("placeholder_talk_topic")}
                    />
                  </label>
                  <label>
                    <span className="block mb-2 ml-1 text-[10px] font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">{t("field_taboo_topics")}</span>
                    <input type="text" className="w-full bg-white/70 dark:bg-black/40 border border-black/10 dark:border-white/10 rounded-xl px-4 py-3 text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 transition-all outline-none shadow-sm" value={guestAdvanced.tabooTopics}
                      onChange={(event) => setGuestAdvancedField("tabooTopics", event.target.value)}
                      placeholder={t("placeholder_list_comma")}
                    />
                  </label>
                </div>
              </section>
            ) : null}

            {guestAdvancedEditTab === "health" ? (
              <section className="scroll-mt-[320px] sm:scroll-mt-[200px]" ref={(node) => { guestAdvancedSectionRefs.current.health = node; }}>
                <p className="text-sm font-bold flex items-center gap-2 text-gray-900 dark:text-white mb-4 pb-2 border-b border-black/5 dark:border-white/10">
                  <Icon name="shield" className="w-4 h-4 text-red-500" />
                  {t("guest_advanced_section_health")}
                </p>
                <div className="flex flex-col gap-4">
                  <MultiSelectField
                    id="guest-allergies"
                    label={t("field_allergies")}
                    value={guestAdvanced.allergies}
                    options={allergyOptions}
                    onChange={(nextValue) => handleAdvancedMultiSelectChange("allergies", nextValue)}
                    helpText={t("multi_select_hint")}
                    t={t}
                  />
                  <MultiSelectField
                    id="guest-intolerances"
                    label={t("field_intolerances")}
                    value={guestAdvanced.intolerances}
                    options={intoleranceOptions}
                    onChange={(nextValue) => handleAdvancedMultiSelectChange("intolerances", nextValue)}
                    helpText={t("multi_select_hint")}
                    t={t}
                  />
                  <MultiSelectField
                    id="guest-pet-allergies"
                    label={t("field_pet_allergies")}
                    value={guestAdvanced.petAllergies}
                    options={petAllergyOptions}
                    onChange={(nextValue) => handleAdvancedMultiSelectChange("petAllergies", nextValue)}
                    helpText={t("multi_select_hint")}
                    t={t}
                  />
                  <MultiSelectField
                    id="guest-medical-conditions"
                    label={t("field_medical_conditions")}
                    value={guestAdvanced.medicalConditions}
                    options={medicalConditionOptions}
                    onChange={(nextValue) => handleAdvancedMultiSelectChange("medicalConditions", nextValue)}
                    helpText={t("multi_select_hint")}
                    t={t}
                  />
                  <MultiSelectField
                    id="guest-dietary-medical-restrictions"
                    label={t("field_dietary_medical_restrictions")}
                    value={guestAdvanced.dietaryMedicalRestrictions}
                    options={dietaryMedicalRestrictionOptions}
                    onChange={(nextValue) => handleAdvancedMultiSelectChange("dietaryMedicalRestrictions", nextValue)}
                    helpText={t("multi_select_hint")}
                    t={t}
                  />
                  <label className="flex flex-row items-center gap-3 p-4 bg-white/40 dark:bg-black/20 border border-black/5 dark:border-white/10 rounded-xl cursor-pointer hover:bg-white/60 dark:hover:bg-white/5 transition-colors mt-2">
                    <input
                      type="checkbox"
                      className="w-5 h-5 text-blue-600 bg-white border-gray-300 rounded focus:ring-blue-500 dark:focus:ring-blue-600 dark:ring-offset-gray-800 focus:ring-2 dark:bg-gray-700 dark:border-gray-600"
                      checked={Boolean(guestAdvanced.sensitiveConsent)}
                      onChange={(event) => setGuestAdvancedField("sensitiveConsent", event.target.checked)}
                    />
                    <span className="text-sm font-medium text-gray-900 dark:text-white flex-1">{t("field_sensitive_consent")}</span>
                  </label>
                  <FieldMeta
                    helpText={t("guest_sensitive_consent_hint")}
                    errorText={guestErrors.sensitiveConsent ? t(guestErrors.sensitiveConsent) : ""}
                  />
                </div>
              </section>
            ) : null}
          </div>
        </div>
      </details>

      <datalist id="guest-city-options">
        {cityOptions.map((optionValue) => (
          <option key={optionValue} value={optionValue} />
        ))}
      </datalist>
      <datalist id="guest-country-options">
        {countryOptions.map((optionValue) => (
          <option key={optionValue} value={optionValue} />
        ))}
      </datalist>

      <div className="flex flex-col sm:flex-row flex-wrap items-center gap-3 mt-4 pt-6 border-t border-black/10 dark:border-white/10">
        <button className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-6 rounded-xl shadow-sm transition-all w-full sm:w-auto flex justify-center items-center gap-2 disabled:opacity-50" type="submit" disabled={isSavingGuest}>
          {isSavingGuest ? (isEditingGuest ? t("updating_guest") : t("saving_guest")) : isEditingGuest ? t("update_guest") : t("save_guest")}
        </button>
        {isEditingGuest ? (
          <button className="bg-black/5 hover:bg-black/10 dark:bg-white/5 dark:hover:bg-white/10 text-gray-700 dark:text-gray-300 font-bold py-3 px-6 rounded-xl transition-all w-full sm:w-auto flex justify-center items-center gap-2" type="button" onClick={handleCancelEditGuest}>
            {t("cancel_edit")}
          </button>
        ) : null}
      </div>
      <InlineMessage text={guestMessage} />
    </form>
  );
}