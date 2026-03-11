import React from "react";
import { Icon } from "../../../components/icons";
import { AvatarCircle } from "../../../components/avatar-circle";
import { FieldMeta } from "../../../components/field-meta";
import { InlineMessage } from "../../../components/inline-message";

export function HostProfileView({
  interpolateText,
  formatRelativeDate,
  normalizeLookupValue,
  t,
  language,
  session,
  isProfileGuestLinked,
  hostGuestProfilePercent,
  hostGuestProfileCompletedCount,
  hostGuestProfileTotalCount,
  hostGuestProfileSignals,
  profileLinkedGuestId,
  openGuestAdvancedEditor,
  syncHostGuestProfileForm,
  isGlobalProfileClaimed,
  isGlobalProfileFeatureReady,
  handleClaimGlobalProfile,
  isClaimingGlobalProfile,
  handleLinkProfileGuestToGlobal,
  isLinkingGlobalGuest,
  handleLinkAllGuestsToGlobalProfiles,
  isLinkingAllGlobalGuests,
  globalShareTargetsVisible,
  handleApplyGlobalShareAction,
  isPausingGlobalShares,
  isRevokingGlobalShares,
  globalProfileId,
  globalShareActiveCount,
  globalShareSelfTargetCount,
  globalShareDraftByHostId,
  inferGlobalSharePreset,
  statusClass,
  handleApplyGlobalSharePreset,
  handleChangeGlobalShareDraft,
  previewGlobalShareHostId,
  setPreviewGlobalShareHostId,
  handleRequestSaveGlobalShare,
  savingGlobalShareHostId,
  globalShareHistoryItems,
  isLoadingGlobalShareHistory,
  formatGlobalShareEventType,
  globalProfileMessage,
  isIntegrationDebugEnabled,
  integrationChecksTotal,
  integrationChecksOkCount,
  isIntegrationPanelOpen,
  setIsIntegrationPanelOpen,
  loadIntegrationStatusData,
  isLoadingIntegrationStatus,
  integrationStatus,
  integrationShareTargetCount,
  integrationSelfTargetCount,
  integrationChecks,
  integrationStatusMessage,
  handleSaveHostProfile,
  hostProfileName,
  setHostProfileName,
  hostProfilePhone,
  setHostProfilePhone,
  hostProfileCity,
  setHostProfileCity,
  hostProfileCountry,
  setHostProfileCountry,
  hostProfileRelationship,
  setHostProfileRelationship,
  relationshipOptions,
  cityOptions,
  countryOptions,
  isSavingHostProfile,
  hostProfileMessage,
  handleSaveGuest,
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
  guestPhone,
  setGuestPhone,
  guestRelationship,
  setGuestRelationship,
  guestCity,
  setGuestCity,
  guestCountry,
  setGuestCountry,
  guestAdvanced,
  setGuestAdvancedField,
  selectedGuestAddressPlace,
  setSelectedGuestAddressPlace,
  mapsStatus,
  mapsError,
  isGuestAddressLoading,
  guestAddressPredictions,
  handleSelectGuestAddressPrediction,
  isSavingGuest,
  isEditingGuest,
  guestMessage,
  openGuestDetail,
  openWorkspace
}) {
  return (
    <section className="max-w-6xl mx-auto w-full flex flex-col gap-8 p-4 md:p-0 mt-6 pb-20">

      {/* HEADER PRINCIPAL: Identidad */}
      <header className="flex flex-col md:flex-row items-center gap-6 bg-white/40 dark:bg-gray-900/40 backdrop-blur-xl p-8 rounded-[2.5rem] border border-black/10 dark:border-white/10 shadow-sm">
        <div className="relative">
          <AvatarCircle
            className="w-24 h-24 md:w-32 md:h-32 rounded-full ring-4 ring-white/50 dark:ring-black/20 shadow-2xl"
            label={hostProfileName || t("field_guest")}
            imageUrl={guestPhotoUrl}
            size={128}
          />
          <button
            onClick={() => document.getElementById('guest-photo-upload').click()}
            className="absolute bottom-1 right-1 bg-blue-600 hover:bg-blue-700 text-white p-2 rounded-full shadow-lg transition-transform hover:scale-110"
            title={t("guest_photo_upload")}
          >
            <Icon name="edit" className="w-4 h-4" />
          </button>
        </div>

        <div className="flex-1 text-center md:text-left">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-1">
            {hostProfileName || t("host_default_name")}
          </h1>
          <p className="text-gray-500 dark:text-gray-400 font-medium flex items-center justify-center md:justify-start gap-2">
            <Icon name="mail" className="w-4 h-4" />
            {session?.user?.email}
          </p>

          <div className="mt-4 flex flex-wrap justify-center md:justify-start gap-2">
            <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider border ${isGlobalProfileClaimed ? 'bg-green-100 text-green-700 border-green-200 dark:bg-green-500/20 dark:text-green-300' : 'bg-gray-100 text-gray-500 border-gray-200 dark:bg-white/5 dark:text-gray-400 dark:border-white/10'}`}>
              {isGlobalProfileClaimed ? t("global_profile_status_claimed") : t("global_profile_status_not_claimed")}
            </span>
            {isProfileGuestLinked && (
              <span className="px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-blue-100 text-blue-700 border border-blue-200 dark:bg-blue-500/20 dark:text-blue-300">
                {hostGuestProfilePercent}% {t("host_profile_completeness_title")}
              </span>
            )}
          </div>
        </div>
      </header>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">

        {/* COLUMNA IZQUIERDA: Resumen y Estado */}
        <aside className="xl:col-span-1 flex flex-col gap-6">

          {/* CARD: Completitud */}
          <article className="bg-white/40 dark:bg-gray-900/40 backdrop-blur-xl p-6 rounded-3xl border border-black/10 dark:border-white/10 shadow-sm">
            <div className="flex justify-between items-start mb-4">
              <h3 className="text-sm font-bold text-gray-900 dark:text-white uppercase tracking-widest flex items-center gap-2">
                <Icon name="sparkle" className="w-4 h-4 text-blue-500" />
                {t("host_profile_completeness_title")}
              </h3>
            </div>

            {isProfileGuestLinked ? (
              <>
                <div className="relative pt-1 mb-4">
                  <div className="overflow-hidden h-2 mb-2 text-xs flex rounded bg-black/10 dark:bg-white/10">
                    <div
                      style={{ width: `${hostGuestProfilePercent}%` }}
                      className={`shadow-none flex flex-col text-center whitespace-nowrap text-white justify-center transition-all duration-500 ${hostGuestProfilePercent >= 70 ? 'bg-green-500' : hostGuestProfilePercent >= 35 ? 'bg-yellow-500' : 'bg-red-500'
                        }`}
                    />
                  </div>
                  <p className="text-xs font-bold text-gray-500 dark:text-gray-400">
                    {interpolateText(t("host_profile_completeness_progress"), {
                      done: hostGuestProfileCompletedCount,
                      total: hostGuestProfileTotalCount,
                      percent: hostGuestProfilePercent
                    })}
                  </p>
                </div>

                <div className="flex flex-wrap gap-2 mb-6">
                  {hostGuestProfileSignals.map((signalItem) => (
                    <span key={signalItem.key} className={`text-[10px] font-bold px-2 py-1 rounded-md border ${signalItem.done ? 'bg-green-50 dark:bg-green-500/10 text-green-600 border-green-100 dark:border-green-500/20' : 'bg-gray-50 dark:bg-white/5 text-gray-400 border-gray-100 dark:border-white/10'}`}>
                      {signalItem.label.replace('field_', '').replace(/_/g, ' ')}
                    </span>
                  ))}
                </div>

                <div className="flex flex-col gap-2">
                  <button
                    className="w-full py-2.5 rounded-xl bg-gray-900 dark:bg-white text-white dark:text-gray-900 font-bold text-xs hover:opacity-90 transition-opacity"
                    type="button"
                    onClick={() => openGuestAdvancedEditor(profileLinkedGuestId)}
                  >
                    {t("host_profile_open_advanced_action")}
                  </button>
                  <button
                    className="w-full py-2.5 rounded-xl border border-black/10 dark:border-white/10 text-gray-700 dark:text-gray-300 font-bold text-xs hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
                    type="button"
                    onClick={syncHostGuestProfileForm}
                  >
                    {t("host_profile_guest_sync")}
                  </button>
                </div>
              </>
            ) : (
              <div className="text-center py-4">
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">{t("host_profile_completeness_unlinked_hint")}</p>
                <button
                  className="px-4 py-2 bg-blue-600 text-white rounded-xl text-xs font-bold hover:bg-blue-700 transition-colors"
                  type="button"
                  onClick={syncHostGuestProfileForm}
                >
                  {t("host_profile_guest_sync")}
                </button>
              </div>
            )}
          </article>

          {/* MENÚ DE INTEGRACIÓN (DEBUG) */}
          {isIntegrationDebugEnabled && (
            <article className="bg-white/40 dark:bg-gray-900/40 backdrop-blur-xl p-6 rounded-3xl border border-dashed border-black/10 dark:border-white/10 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-bold text-gray-900 dark:text-white uppercase tracking-widest flex items-center gap-2">
                  <Icon name="trend" className="w-4 h-4 text-purple-500" />
                  {t("integration_status_title")}
                </h3>
                <span className={`px-2 py-1 rounded-md text-[10px] font-bold ${integrationChecksOkCount === integrationChecksTotal ? "bg-green-100 text-green-700" : "bg-yellow-100 text-yellow-700"}`}>
                  {integrationChecksOkCount}/{integrationChecksTotal || 0}
                </span>
              </div>
              <div className="flex gap-2 mb-4">
                <button
                  onClick={() => setIsIntegrationPanelOpen(!isIntegrationPanelOpen)}
                  className="flex-1 py-2 rounded-xl border border-black/10 dark:border-white/10 text-xs font-bold text-gray-700 dark:text-gray-300 hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
                >
                  {isIntegrationPanelOpen ? t("integration_status_hide") : t("integration_status_show")}
                </button>
                {isIntegrationPanelOpen && (
                  <button
                    onClick={loadIntegrationStatusData}
                    disabled={isLoadingIntegrationStatus}
                    className="flex-1 py-2 rounded-xl bg-gray-100 dark:bg-gray-800 text-xs font-bold text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors disabled:opacity-50"
                  >
                    {isLoadingIntegrationStatus ? t("integration_status_loading") : t("integration_status_refresh")}
                  </button>
                )}
              </div>

              {isIntegrationPanelOpen && integrationStatus && (
                <div className="text-[10px] font-mono text-gray-600 dark:text-gray-400 space-y-1 bg-black/5 dark:bg-white/5 p-3 rounded-xl overflow-x-auto">
                  {integrationChecks.map((check) => (
                    <div key={check.key} className="flex justify-between gap-2 border-b border-black/5 dark:border-white/5 last:border-0 py-1">
                      <span className="truncate">{check.label}</span>
                      <span className={check.ok ? "text-green-500 font-bold" : "text-red-500 font-bold"}>{check.ok ? "OK" : "MISSING"}</span>
                    </div>
                  ))}
                </div>
              )}
              <div className="mt-2"><InlineMessage text={integrationStatusMessage} /></div>
            </article>
          )}
        </aside>

        {/* COLUMNA DERECHA: Formularios de Perfil (Restaurados Completos) */}
        <main className="xl:col-span-2 flex flex-col gap-8">

          {/* FORMULARIO 1: Perfil de Anfitrión */}
          <form className="bg-white/40 dark:bg-gray-900/40 backdrop-blur-xl p-6 md:p-8 rounded-[2.5rem] border border-black/10 dark:border-white/10 shadow-sm flex flex-col gap-6" onSubmit={handleSaveHostProfile}>
            <div className="flex flex-col border-b border-black/5 dark:border-white/10 pb-4">
              <h3 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2 mb-1">
                <Icon name="user" className="w-5 h-5 text-blue-500" />
                {t("host_profile_title")}
              </h3>
              <p className="text-xs text-gray-500 dark:text-gray-400">{t("host_profile_hint")}</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <label className="flex flex-col gap-2">
                <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest ml-1">{t("field_full_name")}</span>
                <input
                  className="bg-black/5 dark:bg-white/5 border-transparent focus:bg-white dark:focus:bg-gray-800 border-2 focus:border-blue-500 rounded-2xl px-4 py-3 text-sm transition-all outline-none text-gray-900 dark:text-white"
                  type="text"
                  value={hostProfileName}
                  onChange={(event) => setHostProfileName(event.target.value)}
                />
              </label>

              <label className="flex flex-col gap-2">
                <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest ml-1 flex items-center gap-1">
                  <Icon name="mail" className="w-3 h-3" /> {t("email")}
                </span>
                <input
                  className="bg-black/5 dark:bg-white/5 border-transparent opacity-70 rounded-2xl px-4 py-3 text-sm outline-none text-gray-900 dark:text-white cursor-not-allowed"
                  type="email"
                  value={session?.user?.email || ""}
                  readOnly
                />
                <span className="text-[10px] text-gray-500 ml-1">{t("host_profile_email_readonly")}</span>
              </label>

              <label className="flex flex-col gap-2">
                <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest ml-1 flex items-center gap-1">
                  <Icon name="phone" className="w-3 h-3" /> {t("field_phone")}
                </span>
                <input
                  className="bg-black/5 dark:bg-white/5 border-transparent focus:bg-white dark:focus:bg-gray-800 border-2 focus:border-blue-500 rounded-2xl px-4 py-3 text-sm transition-all outline-none text-gray-900 dark:text-white"
                  type="tel"
                  value={hostProfilePhone}
                  onChange={(event) => setHostProfilePhone(event.target.value)}
                />
              </label>

              <label className="flex flex-col gap-2">
                <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest ml-1">{t("field_city")}</span>
                <input
                  className="bg-black/5 dark:bg-white/5 border-transparent focus:bg-white dark:focus:bg-gray-800 border-2 focus:border-blue-500 rounded-2xl px-4 py-3 text-sm transition-all outline-none text-gray-900 dark:text-white"
                  type="text"
                  value={hostProfileCity}
                  onChange={(event) => setHostProfileCity(event.target.value)}
                  list="host-city-options"
                />
              </label>

              <label className="flex flex-col gap-2">
                <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest ml-1">{t("field_country")}</span>
                <input
                  className="bg-black/5 dark:bg-white/5 border-transparent focus:bg-white dark:focus:bg-gray-800 border-2 focus:border-blue-500 rounded-2xl px-4 py-3 text-sm transition-all outline-none text-gray-900 dark:text-white"
                  type="text"
                  value={hostProfileCountry}
                  onChange={(event) => setHostProfileCountry(event.target.value)}
                  list="host-country-options"
                />
              </label>

              <label className="flex flex-col gap-2">
                <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest ml-1">{t("field_relationship")}</span>
                <select
                  className="bg-black/5 dark:bg-white/5 border-transparent focus:bg-white dark:focus:bg-gray-800 border-2 focus:border-blue-500 rounded-2xl px-4 py-3 text-sm transition-all outline-none appearance-none text-gray-900 dark:text-white"
                  value={hostProfileRelationship}
                  onChange={(event) => setHostProfileRelationship(event.target.value)}
                >
                  <option value="">{t("select_option_prompt")}</option>
                  {relationshipOptions.map((option) => (
                    <option key={option} value={option}>{option}</option>
                  ))}
                </select>
              </label>
            </div>

            <div className="pt-2 flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="flex-1">
                <InlineMessage text={hostProfileMessage} />
                <p className="text-[10px] text-gray-500 mt-1">{t("host_profile_sync_hint")}</p>
              </div>
              <button
                className="w-full sm:w-auto px-8 py-3 bg-gray-900 dark:bg-white text-white dark:text-gray-900 font-bold rounded-2xl shadow-lg transition-all hover:opacity-90 disabled:opacity-50"
                type="submit"
                disabled={isSavingHostProfile}
              >
                {isSavingHostProfile ? t("host_profile_saving") : t("host_profile_save")}
              </button>
            </div>
          </form>

          {/* FORMULARIO 2: Datos de Invitado Vinculado (Restaurado 100%) */}
          <form className="bg-white/40 dark:bg-gray-900/40 backdrop-blur-xl p-6 md:p-8 rounded-[2.5rem] border border-black/10 dark:border-white/10 shadow-sm flex flex-col gap-6" onSubmit={handleSaveGuest}>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-black/5 dark:border-white/10 pb-4 gap-4">
              <div>
                <h3 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2 mb-1">
                  <Icon name="users" className="w-5 h-5 text-purple-500" />
                  {t("host_profile_guest_title")}
                </h3>
                <p className="text-xs text-gray-500 dark:text-gray-400">{t("host_profile_guest_hint")}</p>
              </div>
              <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider border shrink-0 ${isProfileGuestLinked ? 'bg-green-100 text-green-700 border-green-200 dark:bg-green-500/20 dark:text-green-300' : 'bg-gray-100 text-gray-500 border-gray-200'}`}>
                {isProfileGuestLinked ? t("host_profile_guest_linked") : t("host_profile_guest_unlinked")}
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <label className="flex flex-col gap-2">
                <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest ml-1">{t("field_first_name")} *</span>
                <input
                  className={`bg-black/5 dark:bg-white/5 border-2 focus:bg-white dark:focus:bg-gray-800 rounded-2xl px-4 py-3 text-sm transition-all outline-none text-gray-900 dark:text-white ${guestErrors.firstName ? 'border-red-500 focus:border-red-500' : 'border-transparent focus:border-blue-500'}`}
                  type="text"
                  value={guestFirstName}
                  onChange={(event) => setGuestFirstName(event.target.value)}
                />
                {guestErrors.firstName && <span className="text-xs text-red-500 ml-1">{t(guestErrors.firstName)}</span>}
              </label>

              <label className="flex flex-col gap-2">
                <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest ml-1">{t("field_last_name")}</span>
                <input
                  className={`bg-black/5 dark:bg-white/5 border-2 focus:bg-white dark:focus:bg-gray-800 rounded-2xl px-4 py-3 text-sm transition-all outline-none text-gray-900 dark:text-white ${guestErrors.lastName ? 'border-red-500 focus:border-red-500' : 'border-transparent focus:border-blue-500'}`}
                  type="text"
                  value={guestLastName}
                  onChange={(event) => setGuestLastName(event.target.value)}
                />
              </label>

              {/* URL de Foto Restaurada y Estilizada */}
              <label className="flex flex-col gap-2 md:col-span-2">
                <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest ml-1">{t("field_guest_photo")}</span>
                <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center">
                  <AvatarCircle
                    className="w-12 h-12 rounded-full ring-2 ring-black/10 dark:ring-white/10 shrink-0"
                    label={`${guestFirstName || ""} ${guestLastName || ""}`.trim() || t("field_guest")}
                    fallback="IN"
                    imageUrl={guestPhotoUrl}
                    size={48}
                  />
                  <input
                    className="flex-1 w-full bg-black/5 dark:bg-white/5 border-transparent focus:bg-white dark:focus:bg-gray-800 border-2 focus:border-blue-500 rounded-2xl px-4 py-3 text-sm transition-all outline-none text-gray-900 dark:text-white"
                    type="url"
                    value={guestPhotoInputValue}
                    onChange={(event) => handleGuestPhotoUrlChange(event.target.value)}
                    placeholder={t("placeholder_guest_photo")}
                  />
                  {guestPhotoUrl && (
                    <button className="text-red-500 hover:text-red-700 text-xs font-bold px-3 py-2 shrink-0" type="button" onClick={handleRemoveGuestPhoto}>
                      {t("guest_photo_remove")}
                    </button>
                  )}
                </div>
              </label>

              <label className="flex flex-col gap-2">
                <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest ml-1 flex items-center gap-1">
                  <Icon name="mail" className="w-3 h-3" /> {t("email")}
                </span>
                <input
                  className="bg-black/5 dark:bg-white/5 border-transparent opacity-70 rounded-2xl px-4 py-3 text-sm outline-none text-gray-900 dark:text-white cursor-not-allowed"
                  type="email"
                  value={guestEmail || session?.user?.email || ""}
                  readOnly
                />
              </label>

              <label className="flex flex-col gap-2">
                <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest ml-1 flex items-center gap-1">
                  <Icon name="phone" className="w-3 h-3" /> {t("field_phone")}
                </span>
                <input
                  className={`bg-black/5 dark:bg-white/5 border-2 focus:bg-white dark:focus:bg-gray-800 rounded-2xl px-4 py-3 text-sm transition-all outline-none text-gray-900 dark:text-white ${guestErrors.phone ? 'border-red-500 focus:border-red-500' : 'border-transparent focus:border-blue-500'}`}
                  type="tel"
                  value={guestPhone}
                  onChange={(event) => setGuestPhone(event.target.value)}
                />
              </label>

              <label className="flex flex-col gap-2">
                <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest ml-1">{t("field_relationship")}</span>
                <input
                  className={`bg-black/5 dark:bg-white/5 border-2 focus:bg-white dark:focus:bg-gray-800 rounded-2xl px-4 py-3 text-sm transition-all outline-none text-gray-900 dark:text-white ${guestErrors.relationship ? 'border-red-500 focus:border-red-500' : 'border-transparent focus:border-blue-500'}`}
                  type="text"
                  value={guestRelationship}
                  onChange={(event) => setGuestRelationship(event.target.value)}
                  list="profile-guest-relationship-options"
                />
              </label>

              <label className="flex flex-col gap-2">
                <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest ml-1">{t("field_city")}</span>
                <input
                  className={`bg-black/5 dark:bg-white/5 border-2 focus:bg-white dark:focus:bg-gray-800 rounded-2xl px-4 py-3 text-sm transition-all outline-none text-gray-900 dark:text-white ${guestErrors.city ? 'border-red-500 focus:border-red-500' : 'border-transparent focus:border-blue-500'}`}
                  type="text"
                  value={guestCity}
                  onChange={(event) => setGuestCity(event.target.value)}
                  list="profile-guest-city-options"
                />
              </label>

              <label className="flex flex-col gap-2">
                <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest ml-1">{t("field_country")}</span>
                <input
                  className={`bg-black/5 dark:bg-white/5 border-2 focus:bg-white dark:focus:bg-gray-800 rounded-2xl px-4 py-3 text-sm transition-all outline-none text-gray-900 dark:text-white ${guestErrors.country ? 'border-red-500 focus:border-red-500' : 'border-transparent focus:border-blue-500'}`}
                  type="text"
                  value={guestCountry}
                  onChange={(event) => setGuestCountry(event.target.value)}
                  list="profile-guest-country-options"
                />
              </label>

              {/* Dirección + Google Maps Autocomplete Restaurado */}
              <label className="flex flex-col gap-2 md:col-span-2 relative">
                <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest ml-1 flex items-center gap-1">
                  <Icon name="location" className="w-3 h-3" /> {t("field_address")}
                </span>
                <input
                  className="bg-black/5 dark:bg-white/5 border-transparent focus:bg-white dark:focus:bg-gray-800 border-2 focus:border-blue-500 rounded-2xl px-4 py-3 text-sm transition-all outline-none text-gray-900 dark:text-white"
                  type="text"
                  value={guestAdvanced.address || ""}
                  onChange={(event) => {
                    setGuestAdvancedField("address", event.target.value);
                    if (
                      selectedGuestAddressPlace &&
                      normalizeLookupValue(event.target.value) !== normalizeLookupValue(selectedGuestAddressPlace.formattedAddress)
                    ) {
                      setSelectedGuestAddressPlace(null);
                    }
                  }}
                  autoComplete="off"
                />
                <span className="text-[10px] text-gray-500 ml-1">
                  {mapsStatus === "ready" ? t("address_google_hint") : mapsStatus === "error" ? t("address_google_error") : ""}
                </span>

                {mapsStatus === "ready" && guestAdvanced.address?.trim().length >= 4 && (
                  <ul className="absolute z-10 top-full left-0 w-full mt-1 bg-white dark:bg-gray-800 border border-black/10 dark:border-white/10 rounded-xl shadow-xl overflow-hidden max-h-48 overflow-y-auto">
                    {isGuestAddressLoading ? (
                      <li className="px-4 py-3 text-sm text-gray-500">{t("address_searching")}</li>
                    ) : guestAddressPredictions.length === 0 ? (
                      <li className="px-4 py-3 text-sm text-gray-500">{t("address_no_matches")}</li>
                    ) : (
                      guestAddressPredictions.map((prediction) => (
                        <li key={prediction.place_id}>
                          <button
                            type="button"
                            className="w-full text-left px-4 py-3 text-sm text-gray-700 dark:text-gray-300 hover:bg-black/5 dark:hover:bg-white/5 flex items-start gap-2"
                            onClick={() => handleSelectGuestAddressPrediction(prediction)}
                          >
                            <Icon name="location" className="w-4 h-4 mt-0.5 shrink-0 text-blue-500" />
                            {prediction.description}
                          </button>
                        </li>
                      ))
                    )}
                  </ul>
                )}
                {selectedGuestAddressPlace?.placeId && <p className="text-xs text-green-500 ml-1 font-bold">{t("address_validated")}</p>}
              </label>
            </div>

            <div className="pt-4 flex flex-col sm:flex-row items-center justify-between gap-4 border-t border-black/5 dark:border-white/10">
              <div className="flex-1 w-full text-center sm:text-left">
                <InlineMessage text={guestMessage} />
                <p className="text-[10px] text-gray-500 mt-1">{t("host_profile_guest_save_hint")}</p>
              </div>
              <div className="flex flex-wrap items-center justify-center sm:justify-end gap-3 w-full sm:w-auto">
                {isProfileGuestLinked && (
                  <button
                    className="px-6 py-2.5 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 text-sm font-bold rounded-xl hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
                    type="button"
                    onClick={() => openGuestDetail(profileLinkedGuestId)}
                  >
                    {t("view_guest_detail_action")}
                  </button>
                )}
                <button
                  className="px-8 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold rounded-xl shadow-lg shadow-blue-500/30 transition-all active:scale-95 disabled:opacity-50"
                  type="submit"
                  disabled={isSavingGuest}
                >
                  {isSavingGuest ? (isEditingGuest ? t("updating_guest") : t("saving_guest")) : (isEditingGuest ? t("update_guest") : t("save_guest"))}
                </button>
              </div>
            </div>
          </form>

          {/* PERFIL GLOBAL: RESTAURADO 100% */}
          <article className="bg-gray-900 text-white rounded-[2.5rem] border border-white/10 shadow-2xl p-6 md:p-8 flex flex-col gap-6 relative overflow-hidden">
            <div className="absolute top-0 right-0 p-8 opacity-5 pointer-events-none">
              <Icon name="shield" className="w-48 h-48" />
            </div>

            <div className="relative z-10 border-b border-white/10 pb-4">
              <h3 className="text-xl font-bold flex items-center gap-2 mb-2">
                <Icon name="shield" className="w-6 h-6 text-green-400" />
                {t("global_profile_title")}
              </h3>
              <p className="text-sm text-gray-400 max-w-2xl">{t("global_profile_hint")}</p>
            </div>

            {!isGlobalProfileFeatureReady ? (
              <p className="text-sm italic text-gray-500">{t("global_profile_feature_pending")}</p>
            ) : (
              <div className="flex flex-col gap-8 relative z-10">

                {/* Botonera Principal */}
                <div className="flex flex-wrap gap-3">
                  <button
                    className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:bg-green-600 disabled:opacity-100 text-white text-sm font-bold rounded-xl transition-colors flex items-center gap-2 shadow-lg"
                    type="button"
                    onClick={handleClaimGlobalProfile}
                    disabled={isClaimingGlobalProfile || isGlobalProfileClaimed}
                  >
                    <Icon name={isGlobalProfileClaimed ? "check" : "star"} className="w-4 h-4" />
                    {isGlobalProfileClaimed ? t("global_profile_status_claimed") : t("global_profile_claim_action")}
                  </button>
                  <button
                    className="px-6 py-2.5 bg-white/10 hover:bg-white/20 text-white text-sm font-bold rounded-xl transition-colors disabled:opacity-50"
                    type="button"
                    onClick={() => handleLinkProfileGuestToGlobal(profileLinkedGuestId)}
                    disabled={isLinkingGlobalGuest || !isProfileGuestLinked}
                  >
                    {isLinkingGlobalGuest ? t("global_profile_linking") : t("global_profile_link_self_action")}
                  </button>
                  <button
                    className="px-6 py-2.5 bg-white/10 hover:bg-white/20 text-white text-sm font-bold rounded-xl transition-colors disabled:opacity-50"
                    type="button"
                    onClick={handleLinkAllGuestsToGlobalProfiles}
                    disabled={isLinkingAllGlobalGuests}
                  >
                    {isLinkingAllGlobalGuests ? t("global_profile_linking_all") : t("global_profile_link_all_action")}
                  </button>
                </div>

                <div className="flex items-center gap-4 text-xs font-bold uppercase tracking-wider text-gray-400">
                  <span>{t("global_profile_share_targets_count")} <span className="text-white bg-white/10 px-2 py-0.5 rounded-full">{globalShareTargetsVisible.length}</span></span>
                  <span>{t("global_profile_share_active_count")} <span className="text-white bg-white/10 px-2 py-0.5 rounded-full">{globalShareActiveCount}</span></span>
                </div>

                {/* Acciones en lote */}
                {globalShareTargetsVisible.length > 0 && (
                  <div className="flex flex-wrap gap-3 p-4 bg-white/5 rounded-2xl border border-white/5">
                    <button
                      className="px-4 py-2 bg-yellow-500/20 text-yellow-500 hover:bg-yellow-500/30 text-xs font-bold rounded-lg transition-colors"
                      type="button"
                      onClick={() => handleApplyGlobalShareAction("pause")}
                      disabled={isPausingGlobalShares || isRevokingGlobalShares}
                    >
                      {isPausingGlobalShares ? t("global_profile_share_bulk_pausing") : t("global_profile_share_bulk_pause")}
                    </button>
                    <button
                      className="px-4 py-2 bg-red-500/20 text-red-500 hover:bg-red-500/30 text-xs font-bold rounded-lg transition-colors"
                      type="button"
                      onClick={() => handleApplyGlobalShareAction("revoke_all")}
                      disabled={isRevokingGlobalShares || isPausingGlobalShares}
                    >
                      {isRevokingGlobalShares ? t("global_profile_share_bulk_revoking") : t("global_profile_share_bulk_revoke_all")}
                    </button>
                  </div>
                )}

                {/* Lista de Targets (Amfitriones que ven el perfil) */}
                {globalShareTargetsVisible.length > 0 && (
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                    {globalShareTargetsVisible.map((targetItem) => {
                      const hostId = targetItem.host_user_id;
                      const shareDraft = globalShareDraftByHostId[hostId] || { status: "inactive" };
                      const appliedPreset = inferGlobalSharePreset(shareDraft);

                      return (
                        <article key={hostId} className="bg-black/40 border border-white/10 rounded-2xl p-5 flex flex-col gap-4">
                          <div className="flex justify-between items-start">
                            <div>
                              <p className="font-bold text-white">{targetItem.host_name || t("host_default_name")}</p>
                              <p className="text-xs text-gray-400">{targetItem.host_email || hostId}</p>
                            </div>
                            <span className={`px-2 py-1 text-[10px] font-bold uppercase rounded-md ${String(shareDraft.status) === "active" ? "bg-green-500/20 text-green-400" : "bg-red-500/20 text-red-400"}`}>
                              {String(shareDraft.status) === "active" ? t("status_active") : t("status_revoked")}
                            </span>
                          </div>

                          <div className="flex flex-wrap gap-2">
                            {["basic", "custom", "private"].map(preset => (
                              <button
                                key={preset}
                                className={`px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider rounded-lg border transition-colors ${appliedPreset === preset ? "bg-blue-600 border-blue-500 text-white" : "bg-white/5 border-white/10 text-gray-400 hover:bg-white/10"}`}
                                onClick={() => handleApplyGlobalSharePreset(hostId, preset)}
                              >
                                {t(`global_profile_share_preset_${preset}`)}
                              </button>
                            ))}
                          </div>

                          {appliedPreset === "custom" && (
                            <div className="grid grid-cols-2 gap-2 mt-2">
                              {["allow_identity", "allow_food", "allow_lifestyle", "allow_conversation", "allow_health"].map(key => (
                                <label key={key} className="flex items-center gap-2 text-xs text-gray-300 cursor-pointer">
                                  <input
                                    type="checkbox"
                                    className="rounded border-white/20 bg-black/50 text-blue-500 focus:ring-blue-500 focus:ring-offset-gray-900"
                                    checked={Boolean(shareDraft[key])}
                                    onChange={(e) => handleChangeGlobalShareDraft(hostId, key, e.target.checked)}
                                  />
                                  {t(`global_profile_scope_${key.split('_')[1]}`)}
                                </label>
                              ))}
                            </div>
                          )}

                          <div className="flex gap-2 mt-2 pt-4 border-t border-white/10">
                            <button
                              className="flex-1 py-2 bg-white/5 hover:bg-white/10 rounded-xl text-xs font-bold transition-colors"
                              onClick={() => setPreviewGlobalShareHostId((prev) => (prev === hostId ? "" : hostId))}
                            >
                              {previewGlobalShareHostId === hostId ? t("global_profile_preview_hide") : t("global_profile_preview_show")}
                            </button>
                            <button
                              className="flex-1 py-2 bg-blue-600 hover:bg-blue-700 rounded-xl text-xs font-bold transition-colors disabled:opacity-50"
                              onClick={() => handleRequestSaveGlobalShare(hostId)}
                              disabled={savingGlobalShareHostId === hostId}
                            >
                              {savingGlobalShareHostId === hostId ? t("global_profile_share_saving") : t("global_profile_share_save_action")}
                            </button>
                          </div>
                        </article>
                      );
                    })}
                  </div>
                )}

                {/* Historial */}
                <div className="mt-4 pt-6 border-t border-white/10">
                  <h4 className="text-sm font-bold uppercase tracking-widest text-gray-400 mb-4">{t("global_profile_history_title")}</h4>
                  {isLoadingGlobalShareHistory ? (
                    <p className="text-xs text-gray-500">{t("global_profile_history_loading")}</p>
                  ) : globalShareHistoryItems.length === 0 ? (
                    <p className="text-xs text-gray-500">{t("global_profile_history_empty")}</p>
                  ) : (
                    <ul className="space-y-3">
                      {globalShareHistoryItems.map((entry) => (
                        <li key={entry.id} className="flex justify-between items-center p-3 bg-white/5 rounded-xl border border-white/5">
                          <div>
                            <p className="text-sm font-bold text-gray-200">{entry.hostName}</p>
                            <p className="text-[10px] text-gray-500">{entry.hostEmail}</p>
                          </div>
                          <div className="text-right">
                            <span className="text-[10px] font-bold uppercase tracking-wider text-blue-400 bg-blue-400/10 px-2 py-1 rounded-md">
                              {formatGlobalShareEventType(t, entry.event_type)}
                            </span>
                            <p className="text-[10px] text-gray-500 mt-1">{formatRelativeDate(entry.created_at, language, t("no_date"))}</p>
                          </div>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>
            )}
            <div className="relative z-10 mt-4"><InlineMessage text={globalProfileMessage} /></div>
          </article>
        </main>
      </div>

      {/* Listas de datos para autocompletar ocultas */}
      <datalist id="profile-guest-relationship-options">{relationshipOptions.map(o => <option key={o} value={o} />)}</datalist>
      <datalist id="profile-guest-city-options">{cityOptions.map(o => <option key={o} value={o} />)}</datalist>
      <datalist id="profile-guest-country-options">{countryOptions.map(o => <option key={o} value={o} />)}</datalist>
      <input id="guest-photo-upload" type="file" className="hidden" accept="image/*" onChange={handleGuestPhotoFileChange} />
    </section>
  );
}