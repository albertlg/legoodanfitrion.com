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
  handleImportContacts,
  isImportingContacts,
  importContactsMessage,
  guestFirstName,
  setGuestFirstName,
  guestErrors,
  guestLastName,
  setGuestLastName,
  guestPhotoUrl,
  handleGuestPhotoFileChange,
  handleRemoveGuestPhoto,
  guestEmail,
  setGuestEmail,
  guestWorkEmail,
  setGuestWorkEmail,
  guestPhone,
  setGuestPhone,
  guestHoneypotField,
  setGuestHoneypotField,
  guestCompanyName,
  setGuestCompanyName,
  guestRelationship,
  setGuestRelationship,
  relationshipOptions,
  guestCity,
  setGuestCity,
  guestCountry,
  setGuestCountry,
  guestAdvancedProfilePercent,
  scrollToGuestAdvancedSection,
  guestAdvancedDetailsRef,
  guestAdvancedToolbarRef,
  guestAdvancedEditTabs,
  guestAdvancedSignalsBySection,
  guestAdvancedEditTab,
  guestAdvancedCurrentStep,
  guestAdvancedCurrentTabLabel,
  guestAdvancedCurrentChecklist,
  isSavingGuest,
  guestLastSavedLabel,
  handleGoToPreviousGuestAdvancedSection,
  guestAdvancedPrevTab,
  handleSaveGuestDraft,
  handleSaveAndGoNextPendingGuestAdvancedSection,
  guestAdvancedNextPendingTab,
  handleGoToNextGuestAdvancedSection,
  guestAdvancedNextTab,
  guestAdvancedSectionRefs,
  guestAdvanced,
  setGuestAdvancedField,
  selectedGuestAddressPlace,
  normalizeLookupValue,
  setSelectedGuestAddressPlace,
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
  isProfessionalEvent = false,
  handleCancelEditGuest,
  guestMessage,
  MultiSelectField
}) {

  const getAvatarFallback = () => {
    const nameString = `${guestFirstName || ""} ${guestLastName || ""}`.trim();
    if (!nameString) return <Icon name="user" className="w-full h-full p-2 opacity-50" />;

    const parts = nameString.split(/\s+/);
    const initials = parts.map(part => part.substring(0, 1)).join("").substring(0, 2).toUpperCase();
    return initials || "IN";
  }

  const isMultiSelectFieldAvailable = typeof MultiSelectField === "function";
  if (!isMultiSelectFieldAvailable) {
    return null;
  }

  return (
    // 🚀 FIX PADDINGCEPTION 1: Eliminamos bordes, radios y paddings en móvil. 
    // En PC (sm:) vuelve a ser una tarjeta redonda centrada.
    <form className="bg-white/40 dark:bg-gray-900/40 backdrop-blur-xl sm:border border-black/10 dark:border-white/10 sm:rounded-[2.5rem] sm:shadow-sm pb-8 sm:p-6 md:p-8 flex flex-col gap-6 w-full min-w-0 max-w-screen-xl px-4 sm:w-full sm:px-6 sm:mx-auto sm:my-6" onSubmit={handleSaveGuest} noValidate>
      <div className="absolute -left-[9999px] top-auto w-px h-px overflow-hidden" aria-hidden="true">
        <label htmlFor="guest-website-field">Website</label>
        <input
          id="guest-website-field"
          name="website"
          type="text"
          value={guestHoneypotField}
          onChange={(event) => setGuestHoneypotField(event.target.value)}
          tabIndex={-1}
          autoComplete="off"
        />
      </div>

      {/* 👑 CABECERA DINÁMICA */}
      {isEditingGuest ? (
        <header className="flex flex-col md:flex-row items-center md:items-start gap-6 bg-gradient-to-br from-white to-blue-50/30 dark:from-gray-800 dark:to-gray-800/80 p-6 rounded-3xl border border-black/5 dark:border-white/5 shadow-sm relative mb-2">
          <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/10 rounded-full blur-3xl -mr-10 -mt-10 pointer-events-none"></div>

          {/* Avatar Container */}
          <div className="relative z-50 shrink-0">
            <AvatarCircle
              className="w-20 h-20 md:w-24 md:h-24 rounded-full ring-4 ring-white dark:ring-gray-700 shadow-lg"
              label={`${guestFirstName || ""} ${guestLastName || ""}`.trim() || t("field_guest")}
              fallback={getAvatarFallback()}
              imageUrl={guestPhotoUrl}
              size={96}
            />

            {/* 🚀 GATILLO: El botón ya no envuelve al menú, son hermanos */}
            <button
              type="button"
              className="peer absolute bottom-0 right-0 md:-right-1 bg-blue-600 hover:bg-blue-700 text-white p-2 md:p-2.5 rounded-full shadow-lg transition-transform hover:scale-110 outline-none focus:ring-2 focus:ring-blue-500/50"
              aria-label={t("guest_photo_edit_options")}
            >
              <Icon name="edit" className="w-4 h-4 md:w-5 md:h-5" />
            </button>

            {/* 🚀 EL DROPDOWN: Anclado y centrado respecto al Avatar (left-1/2 -translate-x-1/2) */}
            <div className="absolute top-full left-1/2 -translate-x-1/2 pt-3 w-48 sm:w-52 z-[99] opacity-0 invisible peer-focus:opacity-100 peer-focus:visible hover:opacity-100 hover:visible transition-all duration-200">
              <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl border border-black/10 dark:border-white/10 overflow-hidden flex flex-col py-1.5">

                <button
                  type="button"
                  onMouseDown={(e) => { e.preventDefault(); document.getElementById('main-guest-photo-upload').click(); }}
                  className="flex items-center gap-3.5 px-4 py-3 text-sm font-bold text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors w-full text-left outline-none"
                >
                  <Icon name="camera" className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                  {t("guest_photo_upload_button") || "Pujar nova foto..."}
                </button>

                {guestPhotoUrl && (
                  <div className="border-t border-black/5 dark:border-white/5 my-1"></div>
                )}

                {guestPhotoUrl && (
                  <button
                    type="button"
                    onMouseDown={(e) => { e.preventDefault(); handleRemoveGuestPhoto(); }}
                    className="flex items-center gap-3.5 px-4 py-3 text-sm font-bold text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/10 transition-colors w-full text-left outline-none"
                  >
                    <Icon name="trash" className="w-4 h-4" />
                    {t("guest_photo_remove") || "Eliminar foto actual"}
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Text Container */}
          <div className="flex-1 text-center md:text-left relative z-10">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300 rounded-full text-[10px] font-bold uppercase tracking-widest mb-3 shadow-sm border border-blue-200 dark:border-blue-800/30">
              <Icon name="edit" className="w-3 h-3" />
              {t("guest_wiz_header_mode_edit")}
            </div>
            <h1 className="text-2xl md:text-3xl font-black text-gray-900 dark:text-white mb-1 truncate tracking-tight">
              {`${guestFirstName || ""} ${guestLastName || ""}`.trim() || t("placeholder_guest_no_name")}
            </h1>
            <p className="text-sm text-gray-500 dark:text-gray-400 truncate">
              {guestEmail || guestPhone || t("placeholder_guest_no_contact")}
            </p>
          </div>
        </header>
      ) : (
        <div className="mb-2">
          {/* Bloque Importación igual */}
          <p className="text-sm text-gray-500 dark:text-gray-400 ml-1 mb-6">
            {t(isProfessionalEvent ? "guest_host_potential_hint_pro" : "guest_host_potential_hint_personal")}
          </p>

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

          <details ref={contactImportDetailsRef} className="bg-white/50 dark:bg-white/5 rounded-2xl border border-black/5 dark:border-white/10 p-5 flex flex-col gap-4 group mt-4">
            <summary className="font-bold text-gray-900 dark:text-white cursor-pointer outline-none marker:text-gray-400 p-2 -ml-2 rounded-lg hover:bg-black/5 dark:hover:bg-white/5">{t("contact_import_title")}</summary>

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
              <label htmlFor="contact_import_file_label">
                <span className="block mb-2 ml-1 text-[10px] font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">{t("contact_import_file_label")}</span>
                <input
                  ref={contactImportFileInputRef}
                  id="contact_import_file_label"
                  name="contact_import_file"
                  type="file"
                  className="w-full text-sm text-gray-500 dark:text-gray-400 file:mr-4 file:py-2.5 file:px-4 file:rounded-xl file:border-0 file:text-sm file:font-bold file:bg-black/5 file:text-gray-700 hover:file:bg-black/10 dark:file:bg-white/10 dark:file:text-white dark:hover:file:bg-white/20 transition-all cursor-pointer"
                  accept=".csv,.vcf,.vcard,text/csv,text/vcard"
                  onChange={handleImportContactsFile}
                />
                <FieldMeta helpText={t("contact_import_file_help")} />
              </label>
              <label htmlFor="importContactsDraft">
                <span className="block mb-2 ml-1 text-[10px] font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">{t("contact_import_paste_label")}</span>
                <textarea className="w-full bg-white/70 dark:bg-black/40 border border-black/10 dark:border-white/10 rounded-xl px-4 py-3 text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 transition-all outline-none shadow-sm" rows={4}
                  id="importContactsDraft"
                  name="importContactsDraft"
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

              {importContactsAnalysis.length > 0 && (
                <div className="grid gap-2">
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    {t("contact_import_preview_total")} {importContactsAnalysis.length}. {t("contact_import_preview_ready")}{" "}
                    {importContactsReady.length}. {t("contact_import_selected_ready")} {importContactsSelectedReady.length}.
                  </p>
                </div>
              )}

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
        </div>
      )
      }

      {/* 📝 CAMPOS BÁSICOS DEL INVITADO — Grupos compactos estilo iOS/Android */}
      <div className="flex flex-col gap-3 pt-4 border-t border-black/5 dark:border-white/10">

        {/* Foto (solo en modo crear) */}
        {!isEditingGuest && (
          <div className="bg-white dark:bg-gray-800 rounded-2xl border border-black/5 dark:border-white/10 overflow-hidden shadow-sm flex items-center gap-4 px-4 py-3">
            <AvatarCircle
              className="ring-2 ring-black/10 dark:ring-white/10 shrink-0"
              label={`${guestFirstName || ""} ${guestLastName || ""}`.trim() || t("field_guest")}
              fallback={getAvatarFallback()}
              imageUrl={guestPhotoUrl}
              size={44}
            />
            <div className="flex flex-wrap items-center gap-2 flex-1 min-w-0">
              <button
                type="button"
                onClick={() => document.getElementById('main-guest-photo-upload').click()}
                className="bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-200 font-bold py-1.5 px-3 rounded-xl text-xs border border-black/5 dark:border-white/10 transition-all"
              >
                <Icon name="camera" className="w-3 h-3 inline mr-1" />
                {t("guest_photo_upload")}
              </button>
              {guestPhotoUrl && (
                <button className="text-red-500 hover:text-red-700 font-semibold py-1.5 px-2 rounded-xl transition-all text-xs" type="button" onClick={handleRemoveGuestPhoto}>
                  {t("guest_photo_remove")}
                </button>
              )}
            </div>
          </div>
        )}

        {/* Grupo 1: Identidad */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-black/5 dark:border-white/10 overflow-hidden shadow-sm">
          <label className="flex flex-col gap-0.5 px-4 py-3 border-b border-black/5 dark:border-white/5" htmlFor="guestFirstName">
            <span className="text-[10px] font-bold uppercase tracking-widest text-gray-400 dark:text-gray-500">{t("field_first_name")} *</span>
            <input
              type="text"
              className={`w-full bg-transparent text-sm text-gray-900 dark:text-white outline-none placeholder:text-gray-400 dark:placeholder:text-gray-600 transition-colors ${guestErrors.firstName ? "placeholder:text-red-300" : ""}`}
              value={guestFirstName}
              id="guestFirstName"
              name="guestFirstName"
              onChange={(event) => setGuestFirstName(event.target.value)}
              placeholder={t("placeholder_first_name")}
            />
            {guestErrors.firstName && <span className="text-xs font-medium text-red-500 mt-0.5">{t(guestErrors.firstName)}</span>}
          </label>
          <label className="flex flex-col gap-0.5 px-4 py-3" htmlFor="guestLastName">
            <span className="text-[10px] font-bold uppercase tracking-widest text-gray-400 dark:text-gray-500">{t("field_last_name")}</span>
            <input
              type="text"
              className="w-full bg-transparent text-sm text-gray-900 dark:text-white outline-none placeholder:text-gray-400 dark:placeholder:text-gray-600"
              value={guestLastName}
              id="guestLastName"
              name="guestLastName"
              onChange={(event) => setGuestLastName(event.target.value)}
              placeholder={t("placeholder_last_name")}
            />
          </label>
        </div>

        {/* Grupo 2: Contacto */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-black/5 dark:border-white/10 overflow-hidden shadow-sm">
          <label className="flex flex-col gap-0.5 px-4 py-3 border-b border-black/5 dark:border-white/5" htmlFor="guestEmail">
            <span className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest text-gray-400 dark:text-gray-500">
              <Icon name="mail" className="w-3 h-3" /> {t("email")}
            </span>
            <input
              type="email"
              className={`w-full bg-transparent text-sm text-gray-900 dark:text-white outline-none placeholder:text-gray-400 dark:placeholder:text-gray-600 ${guestErrors.email ? "text-red-500" : ""}`}
              value={guestEmail}
              id="guestEmail"
              name="guestEmail"
              onChange={(event) => setGuestEmail(event.target.value)}
              placeholder={t("placeholder_email")}
            />
          </label>
          <label className="flex flex-col gap-0.5 px-4 py-3 border-b border-black/5 dark:border-white/5" htmlFor="guestPhone">
            <span className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest text-gray-400 dark:text-gray-500">
              <Icon name="phone" className="w-3 h-3" /> {t("field_phone")}
            </span>
            <input
              type="tel"
              className={`w-full bg-transparent text-sm text-gray-900 dark:text-white outline-none placeholder:text-gray-400 dark:placeholder:text-gray-600 ${guestErrors.phone ? "text-red-500" : ""}`}
              value={guestPhone}
              id="guestPhone"
              name="guestPhone"
              onChange={(event) => setGuestPhone(event.target.value)}
              placeholder={t("placeholder_phone")}
            />
            {(guestErrors.phone || guestErrors.contact) && (
              <span className="text-xs font-medium text-red-500 mt-0.5">{guestErrors.phone ? t(guestErrors.phone) : t(guestErrors.contact)}</span>
            )}
          </label>
          <label className="flex flex-col gap-0.5 px-4 py-3" htmlFor="guestWorkEmail">
            <span className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest text-gray-400 dark:text-gray-500">
              <Icon name="mail" className="w-3 h-3" /> {t("field_work_email")}
            </span>
            <input
              type="email"
              className={`w-full bg-transparent text-sm text-gray-900 dark:text-white outline-none placeholder:text-gray-400 dark:placeholder:text-gray-600 ${guestErrors.workEmail ? "text-red-500" : ""}`}
              value={guestWorkEmail}
              id="guestWorkEmail"
              name="guestWorkEmail"
              onChange={(event) => setGuestWorkEmail(event.target.value)}
              placeholder={t("placeholder_work_email")}
            />
            {guestErrors.workEmail && <span className="text-xs font-medium text-red-500 mt-0.5">{t(guestErrors.workEmail)}</span>}
          </label>
        </div>

        {/* Grupo 3: Contexto */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-black/5 dark:border-white/10 overflow-hidden shadow-sm">
          <label className="flex flex-col gap-0.5 px-4 py-3 border-b border-black/5 dark:border-white/5" htmlFor="guestCompanyName">
            <span className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest text-gray-400 dark:text-gray-500">
              <Icon name="id_card" className="w-3 h-3" /> {t("field_company_name")}
            </span>
            <input
              type="text"
              className={`w-full bg-transparent text-sm text-gray-900 dark:text-white outline-none placeholder:text-gray-400 dark:placeholder:text-gray-600 ${guestErrors.companyName ? "text-red-500" : ""}`}
              value={guestCompanyName}
              id="guestCompanyName"
              name="guestCompanyName"
              onChange={(event) => setGuestCompanyName(event.target.value)}
              placeholder={t("placeholder_company_name")}
            />
            {guestErrors.companyName && <span className="text-xs font-medium text-red-500 mt-0.5">{t(guestErrors.companyName)}</span>}
          </label>
          <label className="flex flex-col gap-0.5 px-4 py-3 border-b border-black/5 dark:border-white/5" htmlFor="guestRelationship">
            <span className="text-[10px] font-bold uppercase tracking-widest text-gray-400 dark:text-gray-500">{t("field_relationship")}</span>
            <select
              className="w-full bg-transparent text-sm text-gray-900 dark:text-white outline-none appearance-none"
              value={guestRelationship}
              id="guestRelationship"
              name="guestRelationship"
              onChange={(event) => setGuestRelationship(event.target.value)}
            >
              <option value="">{t("select_option_prompt")}</option>
              {relationshipOptions.map((optionValue) => (
                <option key={optionValue} value={optionValue}>{optionValue}</option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-0.5 px-4 py-3 border-b border-black/5 dark:border-white/5" htmlFor="guestCity">
            <span className="text-[10px] font-bold uppercase tracking-widest text-gray-400 dark:text-gray-500">{t("field_city")}</span>
            <input
              type="text"
              className="w-full bg-transparent text-sm text-gray-900 dark:text-white outline-none placeholder:text-gray-400 dark:placeholder:text-gray-600"
              value={guestCity}
              id="guestCity"
              name="guestCity"
              onChange={(event) => setGuestCity(event.target.value)}
              placeholder={t("placeholder_city")}
              list="guest-city-options"
            />
          </label>
          <label className="flex flex-col gap-0.5 px-4 py-3" htmlFor="guestCountry">
            <span className="text-[10px] font-bold uppercase tracking-widest text-gray-400 dark:text-gray-500">{t("field_country")}</span>
            <input
              type="text"
              className="w-full bg-transparent text-sm text-gray-900 dark:text-white outline-none placeholder:text-gray-400 dark:placeholder:text-gray-600"
              value={guestCountry}
              id="guestCountry"
              name="guestCountry"
              onChange={(event) => setGuestCountry(event.target.value)}
              placeholder={t("placeholder_country")}
              list="guest-country-options"
            />
          </label>
        </div>
      </div>

      {/* 🚀 TÍTULO CONFIGURACIÓN AVANZADA (Efecto Breakout en móvil) */}
      <details ref={guestAdvancedDetailsRef} className="bg-white/50 dark:bg-white/5 sm:rounded-3xl border-y sm:border border-black/5 dark:border-white/10 shadow-sm flex flex-col gap-4 group mt-6 mx-0 max-w-full">
        <summary className="flex items-center justify-between font-bold text-gray-900 dark:text-white cursor-pointer outline-none marker:text-gray-400 p-4 sm:p-6 transition-colors hover:bg-black/5 dark:hover:bg-white/5 sm:rounded-3xl">
          <span className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-xl">
              <Icon name="sparkle" className="w-5 h-5" />
            </div>
            {t("guest_advanced_title")}
          </span>
          <span className={`text-xs font-black px-3 py-1.5 rounded-xl ${guestAdvancedProfilePercent === 100 ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' : 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300'}`}>
            {guestAdvancedProfilePercent}%
          </span>
        </summary>

        {/* 🚀 FIX PADDINGCEPTION 2: -mx-4 en móvil y quitamos paddings */}
        <div className="flex flex-col border-t border-black/5 dark:border-white/10 pt-0 max-w-full">
          {/* STICKY TOOLBAR MODERNA: fijo justo por debajo de la cabecera global (móvil 64px, desktop 72px) */}
          <div
            ref={guestAdvancedToolbarRef}
            className="sticky top-[calc(4rem-1px)] md:top-[calc(72px-1px)] z-40 bg-gray-50/95 dark:bg-gray-900/95 supports-[backdrop-filter]:backdrop-blur-md border-b border-black/5 dark:border-white/10 shadow-sm py-2.5 px-4 sm:px-4 sm:py-3 flex flex-col gap-2.5 w-full"
          >
            {/* 🚀 TABS perfil avanzado — scroll horizontal + fade */}
            <div className="relative">
              <div className="flex flex-row gap-2 overflow-x-auto scrollbar-hide pb-1 pr-8" role="tablist" aria-label={t("guest_advanced_title")}>
                {guestAdvancedEditTabs.map((tabItem) => {
                  const isCompleted = Boolean(guestAdvancedSignalsBySection[tabItem.key]?.done);
                  const isActive = guestAdvancedEditTab === tabItem.key;
                  const tabIcon = tabItem.key === "identity" ? "id_card" : tabItem.key === "food" ? "utensils" : tabItem.key === "lifestyle" ? "star" : tabItem.key === "conversation" ? "message" : "heart";

                  return (
                    <button
                      key={tabItem.key} type="button" role="tab" aria-selected={isActive}
                      className={`shrink-0 flex items-center gap-2 px-3 py-1.5 rounded-full text-[11px] font-bold leading-none transition-all whitespace-nowrap shadow-sm border outline-none ${isActive ? "bg-blue-600 text-white border-blue-700" : "bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 border-black/5 dark:border-white/10 hover:bg-gray-50 dark:hover:bg-gray-700"}`}
                      onClick={() => scrollToGuestAdvancedSection(tabItem.key)}
                    >
                      <Icon name={tabIcon} className={`w-3.5 h-3.5 shrink-0 ${isActive ? "opacity-100" : "opacity-50"}`} />
                      <span>{tabItem.label}</span>
                      <span className={`flex items-center justify-center w-3.5 h-3.5 rounded-full shrink-0 ${isActive ? (isCompleted ? "bg-white/20 text-white" : "bg-black/20 text-white") : (isCompleted ? "bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400" : "bg-gray-100 text-gray-400 dark:bg-gray-700")}`} aria-hidden="true">
                        <Icon name={isCompleted ? "check" : "clock"} className="w-2.5 h-2.5" />
                      </span>
                    </button>
                  );
                })}
              </div>
              {/* Fade-out gradient — scroll affordance */}
              <div className="pointer-events-none absolute inset-y-0 right-0 w-12 z-10 bg-gradient-to-l from-gray-50 dark:from-gray-900 to-transparent" aria-hidden="true" />
            </div>

            <div className="flex flex-col gap-1.5">
              <div className="flex items-center justify-between">
                <p className="text-[10px] md:text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider flex items-center">
                  <span className="bg-black/10 dark:bg-white/10 px-1.5 py-0.5 md:px-2 md:py-0.5 rounded-md mr-1.5 md:mr-2 text-gray-700 dark:text-gray-200">
                    {guestAdvancedCurrentStep}/{guestAdvancedEditTabs.length}
                  </span>
                  {guestAdvancedCurrentTabLabel}
                </p>
                <span className="text-[9px] md:text-[10px] text-gray-400 font-medium uppercase tracking-wider hidden sm:block">
                  <Icon name="clock" className="w-3 h-3 inline mr-1 -mt-0.5" />
                  {isSavingGuest ? t("guest_saving_draft") : guestLastSavedLabel}
                </span>
              </div>

              <div className="flex flex-wrap gap-2 pb-1 min-w-0">
                {guestAdvancedCurrentChecklist.map((item) => (
                  <span key={item.key} className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[9px] md:text-[10px] font-bold uppercase tracking-wider border shadow-sm whitespace-normal break-words max-w-full ${item.done ? "bg-green-50 text-green-700 border-green-200 dark:bg-green-900/20 dark:text-green-300 dark:border-green-800/30" : "bg-white text-gray-600 border-gray-200 dark:bg-gray-800 dark:text-gray-400 dark:border-gray-700"}`}>
                    <Icon name={item.done ? "check" : "clock"} className="w-3 h-3" />
                    {item.label}
                  </span>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2 pt-1.5 border-t border-black/5 dark:border-white/10 min-w-0 sm:flex sm:flex-wrap xl:flex-nowrap">
              <button className="w-full sm:flex-1 xl:flex-none xl:w-auto min-w-[112px] bg-white hover:bg-gray-50 dark:bg-gray-800 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-200 border border-black/10 dark:border-white/10 font-bold py-2 px-3 md:py-2.5 md:px-4 rounded-xl transition-all text-[11px] md:text-xs disabled:opacity-50 shadow-sm flex items-center justify-center gap-1.5 outline-none" type="button" onClick={handleGoToPreviousGuestAdvancedSection} disabled={!guestAdvancedPrevTab}>
                <Icon name="arrow_left" className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">{t("pagination_prev")}</span>
              </button>
              <button className="w-full sm:flex-1 xl:flex-none xl:w-auto min-w-[112px] bg-white hover:bg-gray-50 dark:bg-gray-800 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-200 border border-black/10 dark:border-white/10 font-bold py-2 px-3 md:py-2.5 md:px-4 rounded-xl transition-all text-[11px] md:text-xs disabled:opacity-50 shadow-sm flex items-center justify-center gap-1.5 outline-none" type="button" onClick={handleSaveGuestDraft} disabled={isSavingGuest}>
                <Icon name="check" className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">{isSavingGuest ? t("guest_saving_draft") : t("guest_save_draft")}</span>
                <span className="sm:hidden">Desar</span>
              </button>
              <button className="w-full sm:flex-1 xl:flex-none xl:w-auto min-w-[112px] bg-purple-50 hover:bg-purple-100 text-purple-700 dark:bg-purple-900/20 dark:text-purple-400 dark:hover:bg-purple-900/40 border border-purple-200 dark:border-purple-800/30 font-bold py-2 px-3 md:py-2.5 md:px-4 rounded-xl transition-all text-[11px] md:text-xs disabled:opacity-50 shadow-sm flex items-center justify-center gap-1.5 outline-none" type="button" onClick={handleSaveAndGoNextPendingGuestAdvancedSection} disabled={!guestAdvancedNextPendingTab || isSavingGuest}>
                <Icon name="sparkle" className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">{t("guest_wizard_save_next_pending")}</span>
                <span className="sm:hidden">Pendent</span>
              </button>
              <button className="col-span-2 w-full sm:flex-1 xl:flex-none xl:w-auto bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 md:py-2.5 md:px-5 rounded-xl transition-all text-[11px] md:text-xs disabled:opacity-50 shadow-sm flex items-center justify-center gap-1.5 outline-none" type="button" onClick={handleGoToNextGuestAdvancedSection} disabled={!guestAdvancedNextTab || isSavingGuest}>
                <span>{t("guest_wizard_validate_next")}</span>
                <Icon name="arrow_right" className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          <div className="flex flex-col gap-6 py-5 px-4 sm:px-6">
            {guestAdvancedEditTab === "identity" && (
              <section className="scroll-mt-[320px] sm:scroll-mt-[200px]" ref={(node) => { guestAdvancedSectionRefs.current.identity = node; }}>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5 sm:gap-6">
                  <label className="flex flex-col gap-1.5 md:col-span-2" htmlFor="advGuestAddress">
                    <span className="text-[10px] font-bold uppercase tracking-widest text-gray-500 dark:text-gray-400 ml-1">{t("field_address")}</span>
                    <input type="text" className="w-full bg-white/70 dark:bg-black/40 border-2 border-transparent focus:bg-white dark:focus:bg-gray-800 focus:border-blue-500 rounded-xl px-4 py-3 text-sm text-gray-900 dark:text-white transition-all outline-none shadow-sm" value={guestAdvanced.address} id="advGuestAddress" name="guest_address" onChange={(event) => { const nextValue = event.target.value; setGuestAdvancedField("address", nextValue); if (selectedGuestAddressPlace && normalizeLookupValue(nextValue) !== normalizeLookupValue(selectedGuestAddressPlace.formattedAddress)) { setSelectedGuestAddressPlace(null); } }} placeholder={t("placeholder_address")} autoComplete="off" />
                  </label>
                  <label className="flex flex-col gap-1.5" htmlFor="advGuestPostalCode">
                    <span className="text-[10px] font-bold uppercase tracking-widest text-gray-500 dark:text-gray-400 ml-1">{t("field_postal_code")}</span>
                    <input type="text" className="w-full bg-white/70 dark:bg-black/40 border-2 border-transparent focus:bg-white dark:focus:bg-gray-800 focus:border-blue-500 rounded-xl px-4 py-3 text-sm text-gray-900 dark:text-white transition-all outline-none shadow-sm" value={guestAdvanced.postalCode} id="advGuestPostalCode" name="guest_postalCode" onChange={(event) => setGuestAdvancedField("postalCode", event.target.value)} placeholder={t("placeholder_postal_code")} />
                  </label>
                  <label className="flex flex-col gap-1.5" htmlFor="advGuestStateRegion">
                    <span className="text-[10px] font-bold uppercase tracking-widest text-gray-500 dark:text-gray-400 ml-1">{t("field_state_region")}</span>
                    <input type="text" className="w-full bg-white/70 dark:bg-black/40 border-2 border-transparent focus:bg-white dark:focus:bg-gray-800 focus:border-blue-500 rounded-xl px-4 py-3 text-sm text-gray-900 dark:text-white transition-all outline-none shadow-sm" value={guestAdvanced.stateRegion} id="advGuestStateRegion" name="guest_stateRegion" onChange={(event) => setGuestAdvancedField("stateRegion", event.target.value)} placeholder={t("placeholder_state_region")} />
                  </label>
                  <label className="flex flex-col gap-1.5" htmlFor="advGuestBirthday">
                    <span className="text-[10px] font-bold uppercase tracking-widest text-gray-500 dark:text-gray-400 ml-1">{t("field_birthday")}</span>
                    <input type="date" className="w-full bg-white/70 dark:bg-black/40 border-2 border-transparent focus:bg-white dark:focus:bg-gray-800 focus:border-blue-500 rounded-xl px-4 py-3 text-sm text-gray-900 dark:text-white transition-all outline-none shadow-sm" value={guestAdvanced.birthday} id="advGuestBirthday" name="guest_birthday" onChange={(event) => setGuestAdvancedField("birthday", event.target.value)} />
                  </label>
                  <label className="flex flex-col gap-1.5" htmlFor="advGuestLastMeetAt">
                    <span className="text-[10px] font-bold uppercase tracking-widest text-gray-500 dark:text-gray-400 ml-1">{t("field_last_meet")}</span>
                    <input type="date" className="w-full bg-white/70 dark:bg-black/40 border-2 border-transparent focus:bg-white dark:focus:bg-gray-800 focus:border-blue-500 rounded-xl px-4 py-3 text-sm text-gray-900 dark:text-white transition-all outline-none shadow-sm" value={guestAdvanced.lastMeetAt} id="advGuestLastMeetAt" name="guest_lastMeetAt" onChange={(event) => setGuestAdvancedField("lastMeetAt", event.target.value)} />
                  </label>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-5 sm:gap-6 md:col-span-2 pt-4 border-t border-black/5 dark:border-white/10">
                    <label className="flex flex-col gap-1.5" htmlFor="advGuestTwitter">
                      <span className="text-[10px] font-bold uppercase tracking-widest text-gray-500 dark:text-gray-400 ml-1">X / Twitter</span>
                      <input type="text" className="w-full bg-white/70 dark:bg-black/40 border-2 border-transparent focus:bg-white dark:focus:bg-gray-800 focus:border-blue-500 rounded-xl px-4 py-3 text-sm text-gray-900 dark:text-white transition-all outline-none shadow-sm" value={guestAdvanced.twitter} id="advGuestTwitter" name="guest_twitter" onChange={(event) => setGuestAdvancedField("twitter", event.target.value)} placeholder={t("placeholder_social_x")} />
                    </label>
                    <label className="flex flex-col gap-1.5" htmlFor="advGuestInstagram">
                      <span className="text-[10px] font-bold uppercase tracking-widest text-gray-500 dark:text-gray-400 ml-1">Instagram</span>
                      <input type="text" className="w-full bg-white/70 dark:bg-black/40 border-2 border-transparent focus:bg-white dark:focus:bg-gray-800 focus:border-blue-500 rounded-xl px-4 py-3 text-sm text-gray-900 dark:text-white transition-all outline-none shadow-sm" value={guestAdvanced.instagram} id="advGuestInstagram" name="guest_instagram" onChange={(event) => setGuestAdvancedField("instagram", event.target.value)} placeholder={t("placeholder_social_instagram")} />
                    </label>
                    <label className="flex flex-col gap-1.5" htmlFor="advGuestLinkedIn">
                      <span className="text-[10px] font-bold uppercase tracking-widest text-gray-500 dark:text-gray-400 ml-1">LinkedIn</span>
                      <input type="text" className="w-full bg-white/70 dark:bg-black/40 border-2 border-transparent focus:bg-white dark:focus:bg-gray-800 focus:border-blue-500 rounded-xl px-4 py-3 text-sm text-gray-900 dark:text-white transition-all outline-none shadow-sm" value={guestAdvanced.linkedIn} id="advGuestLinkedIn" name="guest_linkedIn" onChange={(event) => setGuestAdvancedField("linkedIn", event.target.value)} placeholder={t("placeholder_social_linkedin")} />
                    </label>
                  </div>
                </div>
              </section>
            )}

            {guestAdvancedEditTab === "food" && (
              <section className="scroll-mt-[320px] sm:scroll-mt-[200px]" ref={(node) => { guestAdvancedSectionRefs.current.food = node; }}>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5 sm:gap-6">
                  <label className="flex flex-col gap-1.5" htmlFor="advGuestDietType">
                    <span className="text-[10px] font-bold uppercase tracking-widest text-gray-500 dark:text-gray-400 ml-1">{t("field_diet_type")}</span>
                    <select className="w-full bg-white/70 dark:bg-black/40 border-2 border-transparent focus:bg-white dark:focus:bg-gray-800 focus:border-blue-500 rounded-xl px-4 py-3 text-sm text-gray-900 dark:text-white transition-all outline-none shadow-sm appearance-none" value={guestAdvanced.dietType} id="advGuestDietType" name="guest_dietType" onChange={(event) => setGuestAdvancedField("dietType", event.target.value)}>
                      <option value="">{t("select_option_prompt")}</option>
                      {dietTypeOptions.map((optionValue) => (<option key={optionValue} value={optionValue}>{optionValue}</option>))}
                    </select>
                  </label>

                  <div className="md:col-span-2"><MultiSelectField id="guest-cuisine-types" name="guest_cuisineTypes" label={t("field_cuisine_type")} value={guestAdvanced.cuisineTypes} options={cuisineTypeOptions} onChange={(nextValue) => handleAdvancedMultiSelectChange("cuisineTypes", nextValue)} helpText={t("multi_select_hint")} t={t} /></div>
                  <div className="md:col-span-2"><MultiSelectField id="guest-tasting-preferences" name="guest_tastingPreferences" label={t("field_tasting_preferences")} value={guestAdvanced.tastingPreferences} options={tastingPreferenceOptions} onChange={(nextValue) => handleAdvancedMultiSelectChange("tastingPreferences", nextValue)} helpText={t("multi_select_hint")} t={t} /></div>

                  <label className="flex flex-col gap-1.5" htmlFor="advGuestFoodLikes">
                    <span className="text-[10px] font-bold uppercase tracking-widest text-gray-500 dark:text-gray-400 ml-1">{t("field_food_likes")}</span>
                    <input type="text" className="w-full bg-white/70 dark:bg-black/40 border-2 border-transparent focus:bg-white dark:focus:bg-gray-800 focus:border-blue-500 rounded-xl px-4 py-3 text-sm text-gray-900 dark:text-white transition-all outline-none shadow-sm" value={guestAdvanced.foodLikes} id="advGuestFoodLikes" name="guest_foodLikes" onChange={(event) => setGuestAdvancedField("foodLikes", event.target.value)} placeholder={t("placeholder_food_likes")} />
                  </label>
                  <label className="flex flex-col gap-1.5" htmlFor="advGuestFoodDislikes">
                    <span className="text-[10px] font-bold uppercase tracking-widest text-gray-500 dark:text-gray-400 ml-1">{t("field_food_dislikes")}</span>
                    <input type="text" className="w-full bg-white/70 dark:bg-black/40 border-2 border-transparent focus:bg-white dark:focus:bg-gray-800 focus:border-blue-500 rounded-xl px-4 py-3 text-sm text-gray-900 dark:text-white transition-all outline-none shadow-sm" value={guestAdvanced.foodDislikes} id="advGuestFoodDislikes" name="guest_foodDislikes" onChange={(event) => setGuestAdvancedField("foodDislikes", event.target.value)} placeholder={t("placeholder_food_dislikes")} />
                  </label>

                  <div className="md:col-span-2"><MultiSelectField id="guest-drink-likes" name="guest_drinkLikes" label={t("field_drink_likes")} value={guestAdvanced.drinkLikes} options={drinkOptions} onChange={(nextValue) => handleAdvancedMultiSelectChange("drinkLikes", nextValue)} helpText={t("multi_select_hint")} t={t} /></div>
                  <div className="md:col-span-2"><MultiSelectField id="guest-drink-dislikes" name="guest_drinkDislikes" label={t("field_drink_dislikes")} value={guestAdvanced.drinkDislikes} options={drinkOptions} onChange={(nextValue) => handleAdvancedMultiSelectChange("drinkDislikes", nextValue)} helpText={t("multi_select_hint")} t={t} /></div>
                </div>
              </section>
            )}

            {guestAdvancedEditTab === "lifestyle" && (
              <section className="scroll-mt-[320px] sm:scroll-mt-[200px]" ref={(node) => { guestAdvancedSectionRefs.current.lifestyle = node; }}>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5 sm:gap-6">
                  <div className="md:col-span-2"><MultiSelectField id="guest-experience-types" name="guest_experienceTypes" label={t("field_experience_type")} value={guestAdvanced.experienceTypes} options={eventTypeOptions} onChange={(nextValue) => handleAdvancedMultiSelectChange("experienceTypes", nextValue)} helpText={t("multi_select_hint")} t={t} /></div>
                  <div className="md:col-span-2"><MultiSelectField id="guest-music-genres" name="guest_musicGenres" label={t("field_music_genres")} value={guestAdvanced.musicGenres} options={musicGenreOptions} onChange={(nextValue) => handleAdvancedMultiSelectChange("musicGenres", nextValue)} helpText={t("multi_select_hint")} t={t} /></div>

                  <label className="flex flex-col gap-1.5" htmlFor="advGuestFavColor">
                    <span className="text-[10px] font-bold uppercase tracking-widest text-gray-500 dark:text-gray-400 ml-1">{t("field_favorite_color")}</span>
                    <select className="w-full bg-white/70 dark:bg-black/40 border-2 border-transparent focus:bg-white dark:focus:bg-gray-800 focus:border-blue-500 rounded-xl px-4 py-3 text-sm text-gray-900 dark:text-white transition-all outline-none shadow-sm appearance-none" value={guestAdvanced.favoriteColor} id="advGuestFavColor" name="guest_favoriteColor" onChange={(event) => setGuestAdvancedField("favoriteColor", event.target.value)}>
                      <option value="">{t("select_option_prompt")}</option>
                      {colorOptions.map((optionValue) => (<option key={optionValue} value={optionValue}>{optionValue}</option>))}
                    </select>
                  </label>
                  <label className="flex flex-col gap-1.5" htmlFor="advGuestBooks">
                    <span className="text-[10px] font-bold uppercase tracking-widest text-gray-500 dark:text-gray-400 ml-1">{t("field_books")}</span>
                    <input type="text" className="w-full bg-white/70 dark:bg-black/40 border-2 border-transparent focus:bg-white dark:focus:bg-gray-800 focus:border-blue-500 rounded-xl px-4 py-3 text-sm text-gray-900 dark:text-white transition-all outline-none shadow-sm" value={guestAdvanced.books} id="advGuestBooks" name="guest_books" onChange={(event) => setGuestAdvancedField("books", event.target.value)} placeholder={t("placeholder_books")} />
                  </label>
                  <label className="flex flex-col gap-1.5" htmlFor="advGuestMovies">
                    <span className="text-[10px] font-bold uppercase tracking-widest text-gray-500 dark:text-gray-400 ml-1">{t("field_movies")}</span>
                    <input type="text" className="w-full bg-white/70 dark:bg-black/40 border-2 border-transparent focus:bg-white dark:focus:bg-gray-800 focus:border-blue-500 rounded-xl px-4 py-3 text-sm text-gray-900 dark:text-white transition-all outline-none shadow-sm" value={guestAdvanced.movies} id="advGuestMovies" name="guest_movies" onChange={(event) => setGuestAdvancedField("movies", event.target.value)} placeholder={t("placeholder_movies")} />
                  </label>
                  <label className="flex flex-col gap-1.5" htmlFor="advGuestSeries">
                    <span className="text-[10px] font-bold uppercase tracking-widest text-gray-500 dark:text-gray-400 ml-1">{t("field_series")}</span>
                    <input type="text" className="w-full bg-white/70 dark:bg-black/40 border-2 border-transparent focus:bg-white dark:focus:bg-gray-800 focus:border-blue-500 rounded-xl px-4 py-3 text-sm text-gray-900 dark:text-white transition-all outline-none shadow-sm" value={guestAdvanced.series} id="advGuestSeries" name="guest_series" onChange={(event) => setGuestAdvancedField("series", event.target.value)} placeholder={t("placeholder_series")} />
                  </label>

                  <div className="md:col-span-2"><MultiSelectField id="guest-sports" name="guest_sports" label={t("field_sport")} value={guestAdvanced.sports} options={sportOptions} onChange={(nextValue) => handleAdvancedMultiSelectChange("sports", nextValue)} helpText={t("multi_select_hint")} t={t} /></div>
                  <label className="flex flex-col gap-1.5 md:col-span-2" htmlFor="advGuestTeamFan">
                    <span className="text-[10px] font-bold uppercase tracking-widest text-gray-500 dark:text-gray-400 ml-1">{t("field_team_fan")}</span>
                    <input type="text" className="w-full bg-white/70 dark:bg-black/40 border-2 border-transparent focus:bg-white dark:focus:bg-gray-800 focus:border-blue-500 rounded-xl px-4 py-3 text-sm text-gray-900 dark:text-white transition-all outline-none shadow-sm" value={guestAdvanced.teamFan} id="advGuestTeamFan" name="guest_teamFan" onChange={(event) => setGuestAdvancedField("teamFan", event.target.value)} placeholder={t("placeholder_team")} />
                  </label>

                  <div className="md:col-span-2 pt-4 border-t border-black/5 dark:border-white/10"><MultiSelectField id="guest-pets" name="guest_pets" label={t("field_pets")} value={guestAdvanced.pets} options={petOptions} onChange={(nextValue) => handleAdvancedMultiSelectChange("pets", nextValue)} helpText={t("multi_select_hint")} t={t} /></div>
                </div>
              </section>
            )}

            {guestAdvancedEditTab === "conversation" && (
              <section className="scroll-mt-[320px] sm:scroll-mt-[200px]" ref={(node) => { guestAdvancedSectionRefs.current.conversation = node; }}>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5 sm:gap-6">
                  <div className="md:col-span-2"><MultiSelectField id="guest-preferred-relationships" name="guest_preferredRelationships" label={t("field_relationship")} value={guestAdvanced.preferredGuestRelationships} options={relationshipOptions} onChange={(nextValue) => handleAdvancedMultiSelectChange("preferredGuestRelationships", nextValue)} helpText={t("multi_select_hint")} t={t} /></div>

                  <label className="flex flex-col gap-1.5 md:col-span-2" htmlFor="advGuestLastTalkTopic">
                    <span className="text-[10px] font-bold uppercase tracking-widest text-gray-500 dark:text-gray-400 ml-1">{t("field_last_talk_topic")}</span>
                    <input type="text" className="w-full bg-white/70 dark:bg-black/40 border-2 border-transparent focus:bg-white dark:focus:bg-gray-800 focus:border-blue-500 rounded-xl px-4 py-3 text-sm text-gray-900 dark:text-white transition-all outline-none shadow-sm" value={guestAdvanced.lastTalkTopic} id="advGuestLastTalkTopic" name="guest_lastTalkTopic" onChange={(event) => setGuestAdvancedField("lastTalkTopic", event.target.value)} placeholder={t("placeholder_talk_topic")} />
                  </label>
                  <label className="flex flex-col gap-1.5 md:col-span-2" htmlFor="advGuestTabooTopics">
                    <span className="text-[10px] font-bold uppercase tracking-widest text-gray-500 dark:text-gray-400 ml-1">{t("field_taboo_topics")}</span>
                    <input type="text" className="w-full bg-white/70 dark:bg-black/40 border-2 border-transparent focus:bg-white dark:focus:bg-gray-800 focus:border-blue-500 rounded-xl px-4 py-3 text-sm text-gray-900 dark:text-white transition-all outline-none shadow-sm" value={guestAdvanced.tabooTopics} id="advGuestTabooTopics" name="guest_tabooTopics" onChange={(event) => setGuestAdvancedField("tabooTopics", event.target.value)} placeholder={t("placeholder_food_likes")} />
                  </label>

                  <div className="md:col-span-2 pt-4 border-t border-black/5 dark:border-white/10"><MultiSelectField id="guest-day-moments" name="guest_preferredDayMoments" label={t("field_day_moment")} value={guestAdvanced.preferredDayMoments} options={dayMomentOptions} onChange={(nextValue) => handleAdvancedMultiSelectChange("preferredDayMoments", nextValue)} helpText={t("multi_select_hint")} t={t} /></div>
                  <label className="flex flex-col gap-1.5" htmlFor="advGuestPeriodicity">
                    <span className="text-[10px] font-bold uppercase tracking-widest text-gray-500 dark:text-gray-400 ml-1">{t("field_periodicity")}</span>
                    <select className="w-full bg-white/70 dark:bg-black/40 border-2 border-transparent focus:bg-white dark:focus:bg-gray-800 focus:border-blue-500 rounded-xl px-4 py-3 text-sm text-gray-900 dark:text-white transition-all outline-none shadow-sm appearance-none" value={guestAdvanced.periodicity} id="advGuestPeriodicity" name="guest_periodicity" onChange={(event) => setGuestAdvancedField("periodicity", event.target.value)}>
                      <option value="">{t("select_option_prompt")}</option>
                      {periodicityOptions.map((optionValue) => (<option key={optionValue} value={optionValue}>{optionValue}</option>))}
                    </select>
                  </label>
                  <label className="flex flex-col gap-1.5" htmlFor="advGuestPunctuality">
                    <span className="text-[10px] font-bold uppercase tracking-widest text-gray-500 dark:text-gray-400 ml-1">{t("field_punctuality")}</span>
                    <select className="w-full bg-white/70 dark:bg-black/40 border-2 border-transparent focus:bg-white dark:focus:bg-gray-800 focus:border-blue-500 rounded-xl px-4 py-3 text-sm text-gray-900 dark:text-white transition-all outline-none shadow-sm appearance-none" value={guestAdvanced.punctuality} id="advGuestPunctuality" name="guest_punctuality" onChange={(event) => setGuestAdvancedField("punctuality", event.target.value)}>
                      <option value="">{t("select_option_prompt")}</option>
                      {punctualityOptions.map((optionValue) => (<option key={optionValue} value={optionValue}>{optionValue}</option>))}
                    </select>
                  </label>
                </div>
              </section>
            )}

            {guestAdvancedEditTab === "health" && (
              <section className="scroll-mt-[320px] sm:scroll-mt-[200px]" ref={(node) => { guestAdvancedSectionRefs.current.health = node; }}>
                <div className="grid grid-cols-1 gap-6">
                  <MultiSelectField id="guest-allergies" name="guest_allergies" label={t("field_allergies")} value={guestAdvanced.allergies} options={allergyOptions} onChange={(nextValue) => handleAdvancedMultiSelectChange("allergies", nextValue)} helpText={t("multi_select_hint")} t={t} />
                  <MultiSelectField id="guest-intolerances" name="guest_intolerances" label={t("field_intolerances")} value={guestAdvanced.intolerances} options={intoleranceOptions} onChange={(nextValue) => handleAdvancedMultiSelectChange("intolerances", nextValue)} helpText={t("multi_select_hint")} t={t} />
                  <MultiSelectField id="guest-pet-allergies" name="guest_petAllergies" label={t("field_pet_allergies")} value={guestAdvanced.petAllergies} options={petAllergyOptions} onChange={(nextValue) => handleAdvancedMultiSelectChange("petAllergies", nextValue)} helpText={t("multi_select_hint")} t={t} />
                  <MultiSelectField id="guest-medical-conditions" name="guest_medicalConditions" label={t("field_medical_conditions")} value={guestAdvanced.medicalConditions} options={medicalConditionOptions} onChange={(nextValue) => handleAdvancedMultiSelectChange("medicalConditions", nextValue)} helpText={t("multi_select_hint")} t={t} />
                  <MultiSelectField id="guest-dietary-medical-restrictions" name="guest_dietaryMedicalRestrictions" label={t("field_dietary_medical_restrictions")} value={guestAdvanced.dietaryMedicalRestrictions} options={dietaryMedicalRestrictionOptions} onChange={(nextValue) => handleAdvancedMultiSelectChange("dietaryMedicalRestrictions", nextValue)} helpText={t("multi_select_hint")} t={t} />

                  <label className="flex items-start gap-4 p-4 sm:p-5 bg-red-50/50 dark:bg-red-900/10 border border-red-100 dark:border-red-900/30 rounded-2xl cursor-pointer hover:bg-red-100/50 dark:hover:bg-red-900/20 transition-colors mt-2" htmlFor="advGuestSensitiveConsent">
                    <input type="checkbox" className="mt-1 w-5 h-5 text-red-600 bg-white border-red-300 rounded focus:ring-red-500 focus:ring-2 dark:bg-gray-800 dark:border-red-800 shrink-0" checked={Boolean(guestAdvanced.sensitiveConsent)} id="advGuestSensitiveConsent" name="guest_sensitiveConsent" onChange={(event) => setGuestAdvancedField("sensitiveConsent", event.target.checked)} />
                    <div className="flex flex-col gap-1">
                      <span className="text-sm font-bold text-red-900 dark:text-red-200">{t("field_sensitive_consent")}</span>
                      <span className="text-xs text-red-700/80 dark:text-red-300/80 leading-relaxed">{t("guest_sensitive_consent_hint")}</span>
                    </div>
                  </label>
                </div>
              </section>
            )}
          </div>
        </div>
      </details>

      <datalist id="guest-city-options">{cityOptions.map((o) => (<option key={o} value={o} />))}</datalist>
      <datalist id="guest-country-options">{countryOptions.map((o) => (<option key={o} value={o} />))}</datalist>

      <input id="main-guest-photo-upload" type="file" accept="image/*" className="hidden" onChange={handleGuestPhotoFileChange} />

      {/* 🚀 FOOTER PEGAJOSO — sticky en móvil, estático en sm+ */}
      <div className="sticky bottom-0 z-30 sm:static sm:z-auto sm:mt-8 -mx-4 sm:mx-0 px-4 sm:px-0 py-3 sm:py-0 sm:pt-6 bg-white/90 dark:bg-gray-900/90 sm:bg-transparent sm:dark:bg-transparent backdrop-blur-xl sm:backdrop-blur-none border-t border-black/10 dark:border-white/10 sm:border-black/5 sm:dark:border-white/10 shadow-[0_-4px_20px_rgba(0,0,0,0.07)] sm:shadow-none">
        <InlineMessage text={guestMessage} />
        <div className={`flex items-center gap-2 ${guestMessage ? "mt-2" : ""}`}>
          {isEditingGuest && (
            <button
              className="shrink-0 text-sm font-semibold text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 py-2.5 px-3 rounded-xl transition-colors outline-none"
              type="button"
              onClick={handleCancelEditGuest}
            >
              {t("cancel_edit")}
            </button>
          )}
          <button
            className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-6 rounded-2xl shadow-lg shadow-blue-500/25 transition-all active:scale-[0.98] disabled:opacity-50 text-sm"
            type="submit"
            disabled={isSavingGuest}
          >
            {isSavingGuest ? (isEditingGuest ? t("updating_guest") : t("saving_guest")) : isEditingGuest ? t("update_guest") : t("save_guest")}
          </button>
        </div>
      </div>
    </form >
  );
}
