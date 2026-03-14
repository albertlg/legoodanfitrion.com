import { createPortal } from "react-dom";
import { Icon } from "../../../../components/icons";
import { InlineMessage } from "../../../../components/inline-message";

export function ImportContactsWizardModal(props) {
  const {
    t,
    isImportWizardOpen,
    handleCloseImportWizard,
    importWizardStep,
    importWizardStepLabel,
    importWizardStepTitle,
    importWizardStepHint,
    IMPORT_WIZARD_STEP_TOTAL,
    importWizardSourceOptions,
    importWizardSource,
    setImportWizardSource,
    isMobileImportExperience,
    setImportContactsMessage,
    importWizardUploadedFileName,
    importContactsAnalysis,
    handleImportWizardDrop,
    contactImportFileInputRef,
    handleImportContactsFile,
    importContactsDraft,
    setImportContactsDraft,
    handlePreviewContactsFromDraft,
    handleClearImportContacts,
    handleImportGoogleContacts,
    isImportingGoogleContacts,
    canUseGoogleContacts,
    canUseDeviceContacts,
    isIOSDevice,
    contactPickerUnsupportedReason,
    handlePickDeviceContacts,
    importWizardQrDataUrl,
    handleShareImportWizardLink,
    importWizardShareEmail,
    setImportWizardShareEmail,
    handleImportWizardEmailLink,
    importContactsSearch,
    setImportContactsSearch,
    importContactsPageSize,
    setImportContactsPageSize,
    IMPORT_PREVIEW_PAGE_SIZE_DEFAULT,
    IMPORT_PREVIEW_PAGE_SIZE_OPTIONS,
    importDuplicateMode,
    handleImportDuplicateModeChange,
    importContactsDuplicateCount,
    interpolateText,
    handleSelectSuggestedImportContacts,
    handleSelectCurrentImportPageReady,
    handleSelectAllReadyImportContacts,
    handleClearReadyImportContactsSelection,
    importContactsSelectedReady,
    pagedImportContacts,
    selectedImportContactIds,
    toggleImportContactSelection,
    handleOpenLowConfidenceMergeReview,
    importContactsFiltered,
    importContactsPage,
    importContactsTotalPages,
    setImportContactsPage,
    importWizardResult,
    importWizardShareMessage,
    importContactsMessage,
    handleImportWizardBack,
    isImportingContacts,
    importWizardCanContinue,
    handleImportWizardContinue,
    importWizardContinueLabel
  } = props;

  return (
    isImportWizardOpen ? createPortal(
        <div className="fixed inset-0 z-[99999] flex items-center justify-center bg-black/60 backdrop-blur-sm sm:p-6 transition-opacity animate-in fade-in" onClick={handleCloseImportWizard}>
          <section
            className={`bg-white dark:bg-gray-900 sm:border border-black/10 dark:border-white/10 w-full h-[100dvh] sm:h-auto sm:max-h-[90vh] sm:rounded-[2.5rem] shadow-2xl flex flex-col overflow-hidden transition-all duration-300 animate-in slide-in-from-bottom-8 sm:zoom-in-95 min-w-0 ${importWizardStep === 3 ? "sm:max-w-5xl" : "sm:max-w-2xl"}`}
            role="dialog"
            aria-modal="true"
            aria-labelledby="import-wizard-title"
            onClick={(event) => event.stopPropagation()}
          >
            {/* HEADER DEL MODAL */}
            <header className="flex items-start justify-between p-4 sm:p-6 md:p-8 border-b border-black/5 dark:border-white/10 bg-gray-50/50 dark:bg-gray-800/50 shrink-0">
              <div className="flex flex-col gap-1 pr-4 mt-1 sm:mt-0">
                <p className="text-[10px] font-bold uppercase tracking-widest text-blue-600 dark:text-blue-400">{importWizardStepLabel}</p>
                <h3 id="import-wizard-title" className="text-xl md:text-2xl font-black text-gray-900 dark:text-white tracking-tight truncate">
                  {importWizardStepTitle}
                </h3>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1 hidden sm:block">{importWizardStepHint}</p>
              </div>
              <button
                className="p-2 rounded-full hover:bg-black/5 dark:hover:bg-white/10 text-gray-500 dark:text-gray-400 transition-colors shrink-0 outline-none focus:ring-2 focus:ring-blue-500/50 bg-black/5 dark:bg-white/5 sm:bg-transparent"
                type="button"
                onClick={handleCloseImportWizard}
                aria-label={t("close_modal")}
                title={t("close_modal")}
              >
                <Icon name="x" className="w-5 h-5 sm:w-6 sm:h-6" />
              </button>
            </header>

            {/* INDICADOR DE PASOS (WIZARD PROGRESS) */}
            <div className="flex items-center gap-2 px-4 sm:px-6 md:px-8 py-3 sm:py-4 bg-white dark:bg-gray-900 border-b border-black/5 dark:border-white/5 shrink-0 overflow-x-auto scrollbar-none" role="list" aria-label={importWizardStepLabel}>
              {Array.from({ length: IMPORT_WIZARD_STEP_TOTAL }).map((_, index) => {
                const stepNumber = index + 1;
                const isActive = importWizardStep === stepNumber;
                const isDone = importWizardStep > stepNumber;
                return (
                  <div key={`wizard-step-${stepNumber}`} className="flex items-center gap-2 shrink-0">
                    <span
                      role="listitem"
                      className={`flex items-center justify-center w-7 h-7 sm:w-8 sm:h-8 rounded-full text-[10px] sm:text-xs font-bold transition-all shadow-sm ${isActive ? "bg-blue-600 text-white ring-4 ring-blue-500/20" : isDone ? "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400" : "bg-gray-100 text-gray-400 dark:bg-gray-800 dark:text-gray-500 border border-gray-200 dark:border-gray-700"}`}
                    >
                      {isDone ? <Icon name="check" className="w-3 h-3 sm:w-4 sm:h-4" /> : stepNumber}
                    </span>
                    {stepNumber !== IMPORT_WIZARD_STEP_TOTAL && (
                      <div className={`w-4 sm:w-8 md:w-12 h-0.5 rounded-full ${isDone ? "bg-blue-200 dark:bg-blue-900/50" : "bg-gray-100 dark:bg-gray-800"}`}></div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* BODY DEL MODAL */}
            <div className="p-4 sm:p-6 md:p-8 overflow-y-auto flex-1 custom-scrollbar min-w-0 min-h-0">

              {/* PASO 1: SELECCIONAR FUENTE */}
              {importWizardStep === 1 ? (
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  {importWizardSourceOptions.map((sourceItem) => (
                    <button
                      key={sourceItem.key}
                      type="button"
                      className={`flex flex-row sm:flex-col items-center sm:items-start text-left gap-4 p-4 sm:p-5 rounded-2xl border-2 transition-all outline-none group ${importWizardSource === sourceItem.key ? "border-blue-500 bg-blue-50 dark:bg-blue-900/10 shadow-md" : "border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 hover:border-blue-300 dark:hover:border-blue-700 hover:shadow-sm"}`}
                      onClick={() => setImportWizardSource(sourceItem.key)}
                      aria-pressed={importWizardSource === sourceItem.key}
                    >
                      <div className={`p-3 rounded-xl shrink-0 ${importWizardSource === sourceItem.key ? "bg-blue-500 text-white" : "bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 group-hover:bg-blue-100 dark:group-hover:bg-blue-900/30 group-hover:text-blue-600 dark:group-hover:text-blue-400"} transition-colors`}>
                        <Icon name={sourceItem.icon} className="w-5 h-5 sm:w-6 sm:h-6" />
                      </div>
                      <div className="flex flex-col gap-0.5 w-full">
                        <div className="flex items-center justify-between sm:justify-start gap-2">
                          <span className="font-bold text-gray-900 dark:text-white text-sm sm:text-base">{sourceItem.title}</span>
                          {sourceItem.isRecommended ? (
                            <span className="px-2 py-0.5 bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 rounded-md text-[9px] font-bold uppercase tracking-wider shrink-0">
                              Rec.
                            </span>
                          ) : null}
                        </div>
                        <span className="text-[11px] sm:text-xs text-gray-500 dark:text-gray-400 line-clamp-2">{sourceItem.hint}</span>
                      </div>
                    </button>
                  ))}
                </div>
              ) : null}

              {/* PASO 2: TABS MÓVILES */}
              {importWizardStep === 2 && isMobileImportExperience && importWizardSourceOptions.length > 1 ? (
                <div className="flex overflow-x-auto gap-2 pb-4 mb-4 border-b border-black/5 dark:border-white/10 scrollbar-none" role="tablist" aria-label={t("import_wizard_step_1_title")}>
                  {importWizardSourceOptions.map((sourceItem) => (
                    <button
                      key={`switch-${sourceItem.key}`}
                      type="button"
                      role="tab"
                      aria-selected={importWizardSource === sourceItem.key}
                      className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap shadow-sm border outline-none ${importWizardSource === sourceItem.key ? "bg-blue-600 text-white border-blue-700" : "bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700"}`}
                      onClick={() => {
                        setImportContactsMessage("");
                        setImportWizardSource(sourceItem.key);
                      }}
                    >
                      <Icon name={sourceItem.icon} className="w-3.5 h-3.5" />
                      <span>{sourceItem.title}</span>
                    </button>
                  ))}
                </div>
              ) : null}

              {/* PASO 2: CSV / EXCEL */}
              {importWizardStep === 2 && importWizardSource === "csv" ? (
                <div className="flex flex-col gap-6">
                  {/* ESTADO 1: NO HAY ARCHIVO SUBIDO */}
                  {!importWizardUploadedFileName && !importContactsAnalysis.length ? (
                    <>
                      <label
                        className="flex flex-col items-center justify-center gap-3 p-8 sm:p-10 border-2 border-dashed border-gray-300 dark:border-gray-600 hover:border-blue-400 dark:hover:border-blue-500 bg-gray-50 dark:bg-gray-800/50 rounded-2xl transition-colors cursor-pointer text-center group outline-none focus-within:ring-2 focus-within:ring-blue-500/50"
                        onDragOver={(event) => {
                          event.preventDefault();
                          event.dataTransfer.dropEffect = "copy";
                        }}
                        onDrop={(event) => {
                          event.preventDefault();
                          handleImportWizardDrop(event);
                        }}
                      >
                        <div className="p-4 bg-white dark:bg-gray-700 shadow-sm rounded-full text-gray-400 group-hover:text-blue-500 transition-colors">
                          <Icon name="folder" className="w-8 h-8" />
                        </div>
                        <div>
                          <p className="font-bold text-gray-900 dark:text-white mb-1 text-sm sm:text-base">{t("import_wizard_csv_drop_title")}</p>
                          <p className="text-[11px] sm:text-xs text-gray-500 dark:text-gray-400">{t("import_wizard_csv_drop_hint")}</p>
                        </div>
                        <span className="mt-2 px-5 py-2.5 bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl text-sm font-bold text-gray-700 dark:text-gray-200 group-hover:bg-gray-50 dark:group-hover:bg-gray-600 shadow-sm transition-colors">
                          {t("contact_import_open_file_button")}
                        </span>
                        <input
                          ref={contactImportFileInputRef}
                          type="file"
                          accept=".csv,.vcf,.vcard,text/csv,text/vcard"
                          onChange={handleImportContactsFile}
                          className="hidden"
                        />
                      </label>

                      <div className="flex items-center gap-4">
                        <div className="h-px bg-gray-200 dark:bg-gray-700 flex-1"></div>
                        <span className="text-[10px] sm:text-xs font-bold text-gray-400 uppercase tracking-wider">O enganxa text</span>
                        <div className="h-px bg-gray-200 dark:bg-gray-700 flex-1"></div>
                      </div>

                      <label className="flex flex-col gap-2">
                        <span className="text-[10px] font-bold uppercase tracking-widest text-gray-500 dark:text-gray-400 ml-1">{t("contact_import_paste_label")}</span>
                        <textarea
                          className="w-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl px-4 py-3 text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-all outline-none shadow-sm resize-y"
                          rows={3}
                          value={importContactsDraft}
                          onChange={(event) => setImportContactsDraft(event.target.value)}
                          placeholder={t("contact_import_paste_placeholder")}
                        />
                      </label>
                      <div className="flex flex-col sm:flex-row gap-3">
                        <button className="w-full sm:w-auto px-5 py-3 sm:py-2.5 bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 font-bold rounded-xl text-sm transition-colors" type="button" onClick={handlePreviewContactsFromDraft}>
                          {t("contact_import_preview_button")}
                        </button>
                        {importContactsDraft && (
                          <button className="w-full sm:w-auto px-5 py-3 sm:py-2.5 bg-red-50 hover:bg-red-100 dark:bg-red-900/10 dark:hover:bg-red-900/20 text-red-600 dark:text-red-400 font-bold rounded-xl text-sm transition-colors" type="button" onClick={handleClearImportContacts}>
                            {t("contact_import_clear_button")}
                          </button>
                        )}
                      </div>
                    </>
                  ) : (
                    /* ESTADO 2: ARCHIVO SUBIDO CON ÉXITO (UX CLARA) */
                    <div className="flex flex-col items-center justify-center p-6 sm:p-8 bg-green-50 dark:bg-green-900/10 border border-green-200 dark:border-green-800/30 rounded-3xl gap-4 text-center animate-in fade-in zoom-in-95">
                      <div className="w-16 h-16 sm:w-20 sm:h-20 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center text-green-600 dark:text-green-400">
                        <Icon name="check" className="w-8 h-8 sm:w-10 sm:h-10" />
                      </div>
                      <div>
                        <p className="text-lg sm:text-xl font-bold text-gray-900 dark:text-white mb-2 truncate max-w-full px-4">
                          {importWizardUploadedFileName || "Contactes processats"}
                        </p>
                        <p className="text-sm text-green-700 dark:text-green-400 font-medium">
                          S'han trobat <strong>{importContactsAnalysis.length}</strong> contactes. Fes clic a <strong className="uppercase tracking-wider px-1">Següent</strong> per revisar-los a la taula.
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={handleClearImportContacts}
                        className="mt-2 px-4 py-2 text-xs font-bold text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                      >
                        Cancel·lar i pujar un altre fitxer
                      </button>
                    </div>
                  )}
                </div>
              ) : null}

              {/* PASO 2: GMAIL */}
              {importWizardStep === 2 && importWizardSource === "gmail" ? (
                <div className="flex flex-col items-center justify-center text-center gap-6 py-4 sm:py-8">
                  <div className="w-16 h-16 sm:w-20 sm:h-20 bg-blue-50 dark:bg-blue-900/10 rounded-full flex items-center justify-center text-blue-500 mb-2">
                    <Icon name="mail" className="w-8 h-8 sm:w-10 sm:h-10" />
                  </div>
                  <button
                    className="w-full sm:w-auto px-6 sm:px-8 py-4 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl font-bold shadow-lg shadow-blue-500/30 transition-all active:scale-95 disabled:opacity-50 flex items-center justify-center gap-3 text-base sm:text-lg"
                    type="button"
                    onClick={() => handleImportGoogleContacts({ fromWizard: true })}
                    disabled={isImportingGoogleContacts || !canUseGoogleContacts}
                  >
                    <Icon name="sparkle" className="w-5 h-5" />
                    {isImportingGoogleContacts ? t("contact_import_google_loading") : t("contact_import_google_button")}
                  </button>
                  <div className="max-w-md flex flex-col gap-2">
                    <p className="text-[11px] sm:text-sm text-gray-500 dark:text-gray-400">{t("import_wizard_gmail_privacy_note")}</p>
                    {!canUseGoogleContacts ? <p className="text-sm font-bold text-red-500">{t("contact_import_google_unconfigured")}</p> : null}
                  </div>
                  {importContactsAnalysis.length > 0 ? (
                    <p className="mt-2 sm:mt-4 inline-flex items-center gap-2 px-4 py-2 bg-green-50 text-green-700 dark:bg-green-900/20 dark:text-green-400 rounded-xl text-sm font-bold border border-green-200 dark:border-green-800/30 animate-in fade-in">
                      <Icon name="check" className="w-4 h-4" /> {t("contact_import_preview_total")} {importContactsAnalysis.length} (Fes clic a Següent)
                    </p>
                  ) : null}
                </div>
              ) : null}

              {/* PASO 2: MÓVIL */}
              {importWizardStep === 2 && importWizardSource === "mobile" ? (
                <div className="flex flex-col gap-6">
                  {canUseDeviceContacts ? (
                    <article className="flex flex-col items-center text-center p-6 sm:p-8 bg-blue-50/50 dark:bg-blue-900/10 border border-blue-100 dark:border-blue-900/30 rounded-3xl gap-4">
                      <div className="w-14 h-14 sm:w-16 sm:h-16 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center text-blue-600 dark:text-blue-400">
                        <Icon name="phone" className="w-7 h-7 sm:w-8 sm:h-8" />
                      </div>
                      <div>
                        <p className="text-lg sm:text-xl font-bold text-gray-900 dark:text-white mb-1">{t("import_wizard_mobile_native_title")}</p>
                        <p className="text-[11px] sm:text-sm text-gray-500 dark:text-gray-400">{t("import_wizard_mobile_native_hint")}</p>
                      </div>
                      <button
                        className="mt-2 w-full sm:w-auto px-6 sm:px-8 py-3.5 sm:py-4 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl font-bold shadow-lg shadow-blue-500/30 transition-all active:scale-95 flex items-center justify-center gap-3"
                        type="button"
                        onClick={() => handlePickDeviceContacts({ fromWizard: true })}
                      >
                        <Icon name="sparkle" className="w-5 h-5" />
                        {t("contact_import_device_button")}
                      </button>
                    </article>
                  ) : (
                    <article className="flex flex-col items-center text-center p-6 bg-orange-50/50 dark:bg-orange-900/10 border border-orange-100 dark:border-orange-900/30 rounded-3xl gap-3">
                      <Icon name="info" className="w-8 h-8 text-orange-500" />
                      <div>
                        <p className="font-bold text-gray-900 dark:text-white mb-1">
                          {isIOSDevice ? t("import_wizard_ios_recommendation_title") : t("import_wizard_mobile_fallback_title")}
                        </p>
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                          {isIOSDevice ? t("import_wizard_ios_recommendation_hint") : t("import_wizard_mobile_fallback_hint")}
                        </p>
                        <p className="text-xs font-bold text-orange-600 dark:text-orange-400 mt-2 bg-orange-100/50 dark:bg-orange-900/30 py-1 px-3 rounded-lg inline-block">{contactPickerUnsupportedReason}</p>
                      </div>
                      {isIOSDevice && canUseGoogleContacts ? (
                        <button className="mt-2 w-full sm:w-auto px-6 py-3 bg-white dark:bg-gray-800 text-gray-900 dark:text-white border border-gray-200 dark:border-gray-700 rounded-xl shadow-sm font-bold text-sm hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors flex items-center justify-center gap-2" type="button" onClick={() => setImportWizardSource("gmail")}>
                          <Icon name="mail" className="w-4 h-4" />
                          {t("import_wizard_ios_use_google_action")}
                        </button>
                      ) : null}
                    </article>
                  )}

                  {!canUseDeviceContacts ? (
                    <div className="flex flex-col sm:flex-row items-center justify-center gap-6 sm:gap-8 mt-2">
                      <div className="flex flex-col items-center gap-3">
                        <div className="w-40 h-40 sm:w-48 sm:h-48 bg-white p-2 rounded-2xl shadow-md border border-gray-100 flex items-center justify-center relative overflow-hidden">
                          {importWizardQrDataUrl ? (
                            <img src={importWizardQrDataUrl} alt={t("import_wizard_mobile_qr_alt")} className="w-full h-full object-contain" />
                          ) : (
                            <div className="flex flex-col items-center text-gray-300">
                              <Icon name="phone" className="w-10 h-10 mb-2 opacity-50" />
                              <span className="text-[10px] text-center font-bold px-4">{t("import_wizard_mobile_qr_hint")}</span>
                            </div>
                          )}
                        </div>
                        <p className="text-xs sm:text-sm text-gray-500 font-medium text-center max-w-[200px]">{t("import_wizard_mobile_qr_hint")}</p>
                      </div>

                      <div className="flex flex-col gap-3 w-full sm:w-auto">
                        <button
                          className="w-full px-6 py-3 bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 text-gray-900 dark:text-white rounded-xl font-bold text-sm transition-colors flex items-center justify-center sm:justify-start gap-2"
                          type="button"
                          onClick={handleShareImportWizardLink}
                        >
                          <Icon name="message" className="w-4 h-4" />
                          {t("import_wizard_mobile_share_action")}
                        </button>
                        <button
                          className="w-full px-6 py-3 bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 text-gray-900 dark:text-white rounded-xl font-bold text-sm transition-colors flex items-center justify-center sm:justify-start gap-2 disabled:opacity-50"
                          type="button"
                          onClick={() => handleImportGoogleContacts({ fromWizard: true })}
                          disabled={isImportingGoogleContacts || !canUseGoogleContacts}
                        >
                          <Icon name="mail" className="w-4 h-4" />
                          {isImportingGoogleContacts ? t("contact_import_google_loading") : t("contact_import_google_button")}
                        </button>

                        {!isMobileImportExperience ? (
                          <div className="mt-2 flex flex-col gap-2 p-4 bg-gray-50 dark:bg-gray-800/50 rounded-xl border border-gray-100 dark:border-gray-700">
                            <span className="text-[10px] font-bold uppercase tracking-widest text-gray-500 dark:text-gray-400">O envia l'enllaç per correu</span>
                            <input
                              type="email"
                              className="w-full bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-600 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                              value={importWizardShareEmail}
                              onChange={(event) => setImportWizardShareEmail(event.target.value)}
                              placeholder={t("placeholder_email")}
                            />
                            <button className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-bold text-xs transition-colors w-full mt-1" type="button" onClick={handleImportWizardEmailLink}>
                              {t("import_wizard_mobile_email_action")}
                            </button>
                          </div>
                        ) : null}
                      </div>
                    </div>
                  ) : null}
                </div>
              ) : null}

              {/* PASO 3: REVISIÓN DE CONTACTOS Y TABLA */}
              {importWizardStep === 3 ? (
                <div className="flex flex-col gap-4 sm:gap-6 min-w-0">
                  {/* Tools Header */}
                  <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 bg-gray-50 dark:bg-gray-800/50 p-3 sm:p-4 rounded-2xl border border-gray-100 dark:border-gray-700">
                    <label className="flex-1 flex flex-col gap-1.5">
                      <span className="text-[10px] font-bold uppercase tracking-widest text-gray-500 dark:text-gray-400 ml-1">{t("search")}</span>
                      <div className="relative">
                        <Icon name="search" className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <input
                          type="search"
                          className="w-full pl-9 pr-4 py-2 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-600 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 outline-none transition-shadow shadow-sm"
                          value={importContactsSearch}
                          onChange={(event) => setImportContactsSearch(event.target.value)}
                          placeholder={t("contact_import_filter_placeholder")}
                        />
                      </div>
                    </label>
                    <div className="flex flex-row gap-3 sm:gap-4">
                      <label className="flex flex-col gap-1.5 flex-1 sm:flex-none">
                        <span className="text-[10px] font-bold uppercase tracking-widest text-gray-500 dark:text-gray-400 ml-1">{t("pagination_items_per_page")}</span>
                        <select
                          className="w-full bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-600 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none shadow-sm cursor-pointer"
                          value={importContactsPageSize}
                          onChange={(event) => setImportContactsPageSize(Number(event.target.value) || IMPORT_PREVIEW_PAGE_SIZE_DEFAULT)}
                        >
                          {IMPORT_PREVIEW_PAGE_SIZE_OPTIONS.map((optionValue) => (
                            <option key={optionValue} value={optionValue}>{optionValue}</option>
                          ))}
                        </select>
                      </label>
                      <label className="flex flex-col gap-1.5 flex-1 sm:flex-none">
                        <span className="text-[10px] font-bold uppercase tracking-widest text-gray-500 dark:text-gray-400 ml-1">{t("contact_import_duplicate_mode_label")}</span>
                        <select
                          className="w-full bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-600 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none shadow-sm cursor-pointer"
                          value={importDuplicateMode}
                          onChange={(event) => handleImportDuplicateModeChange(event.target.value)}
                        >
                          <option value="skip">{t("contact_import_duplicate_mode_skip")}</option>
                          <option value="merge">{t("contact_import_duplicate_mode_merge")}</option>
                        </select>
                      </label>
                    </div>
                  </div>

                  {/* Status Pills */}
                  <div className="flex flex-wrap gap-2">
                    <span className="px-2.5 py-1 bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300 rounded-lg text-[10px] sm:text-[11px] font-bold uppercase tracking-wider border border-gray-200 dark:border-gray-700 shadow-sm">
                      {t("contact_import_preview_total")} <span className="ml-1 text-black dark:text-white">{importContactsAnalysis.length}</span>
                    </span>
                    <span className="px-2.5 py-1 bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 rounded-lg text-[10px] sm:text-[11px] font-bold uppercase tracking-wider border border-green-200 dark:border-green-800/30 shadow-sm">
                      Seleccionats: <span className="ml-1 text-green-900 dark:text-green-200">{importContactsSelectedReady.length}</span>
                    </span>
                  </div>

                  {importContactsDuplicateCount > 0 ? (
                    <div className="flex items-start gap-3 p-3 sm:p-4 bg-orange-50 text-orange-800 dark:bg-orange-900/10 dark:text-orange-200 border border-orange-200 dark:border-orange-800/30 rounded-xl">
                      <Icon name="info" className="w-5 h-5 shrink-0 text-orange-500 mt-0.5" />
                      <div>
                        <p className="font-bold text-sm mb-0.5">{t("import_wizard_duplicates_title")}</p>
                        <p className="text-[11px] sm:text-xs opacity-90">
                          {interpolateText(t("import_wizard_duplicates_hint"), { count: importContactsDuplicateCount })}
                        </p>
                      </div>
                    </div>
                  ) : null}

                  {/* Bulk Actions (Scroll horizontal en móvil si no caben) */}
                  <div className="flex overflow-x-auto gap-2 pt-1 pb-2 scrollbar-none">
                    <button className="whitespace-nowrap px-3 py-1.5 bg-white hover:bg-gray-50 dark:bg-gray-800 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 text-[11px] sm:text-xs font-bold rounded-lg border border-gray-200 dark:border-gray-600 shadow-sm transition-colors" type="button" onClick={handleSelectSuggestedImportContacts}>
                      {t("contact_import_select_suggested")}
                    </button>
                    <button className="whitespace-nowrap px-3 py-1.5 bg-white hover:bg-gray-50 dark:bg-gray-800 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 text-[11px] sm:text-xs font-bold rounded-lg border border-gray-200 dark:border-gray-600 shadow-sm transition-colors" type="button" onClick={handleSelectCurrentImportPageReady}>
                      {t("contact_import_select_page_ready")}
                    </button>
                    <button className="whitespace-nowrap px-3 py-1.5 bg-white hover:bg-gray-50 dark:bg-gray-800 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 text-[11px] sm:text-xs font-bold rounded-lg border border-gray-200 dark:border-gray-600 shadow-sm transition-colors" type="button" onClick={handleSelectAllReadyImportContacts}>
                      {t("contact_import_select_all_ready")}
                    </button>
                    <button className="whitespace-nowrap px-3 py-1.5 bg-red-50 hover:bg-red-100 dark:bg-red-900/10 dark:hover:bg-red-900/20 text-red-600 dark:text-red-400 text-[11px] sm:text-xs font-bold rounded-lg border border-red-100 dark:border-red-900/30 transition-colors sm:ml-auto" type="button" onClick={handleClearReadyImportContactsSelection}>
                      {t("contact_import_clear_selection")}
                    </button>
                  </div>

                  {/* 🚀 TABLA RESPONSIVE PREMIUM (Tarjetas en móvil, Columnas % en PC) */}
                  <div className="w-full mt-2">
                    <table className="w-full text-left border-collapse md:table-fixed">
                      {/* Cabecera: Oculta en móvil, visible en md */}
                      <thead className="hidden md:table-header-group bg-gray-50 dark:bg-gray-800/50 text-[10px] uppercase tracking-widest text-gray-500 font-bold border-y border-gray-200 dark:border-gray-700">
                        <tr>
                          <th className="px-4 py-3 w-[5%] text-center">
                            <Icon name="check" className="w-4 h-4 mx-auto opacity-50" />
                          </th>
                          <th className="px-4 py-3 w-[25%] truncate">{t("field_full_name")}</th>
                          <th className="px-4 py-3 w-[25%] truncate">{t("email")}</th>
                          <th className="px-4 py-3 w-[15%] truncate">{t("field_phone")}</th>
                          <th className="px-4 py-3 w-[15%] truncate">{t("field_city")}</th>
                          <th className="px-4 py-3 w-[15%] truncate">{t("status")}</th>
                        </tr>
                      </thead>

                      {/* Cuerpo: Flex Column (Tarjetas) en móvil, Table Rows en md */}
                      <tbody className="flex flex-col md:table-row-group gap-4 md:gap-0 text-sm">
                        {pagedImportContacts.map((contactItem) => {
                          const statusText = contactItem.duplicateExisting
                            ? contactItem.willMerge
                              ? t("contact_import_status_duplicate_merge")
                              : t("contact_import_status_duplicate_existing")
                            : contactItem.duplicateInPreview
                              ? t("contact_import_status_duplicate_file")
                              : contactItem.potentialLevel === "high"
                                ? t("contact_import_status_high_potential")
                                : contactItem.potentialLevel === "medium"
                                  ? t("contact_import_status_medium_potential")
                                  : t("contact_import_status_ready");

                          const statusColors = contactItem.duplicateExisting
                            ? "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400"
                            : contactItem.duplicateInPreview
                              ? "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
                              : contactItem.potentialLevel === "high"
                                ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                                : contactItem.potentialLevel === "medium"
                                  ? "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400"
                                  : "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300";

                          return (
                            <tr key={contactItem.previewId} className="flex flex-col md:table-row bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 md:border-none md:border-b md:last:border-none rounded-2xl md:rounded-none shadow-sm md:shadow-none hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors group overflow-hidden">

                              {/* CELDA 1: Checkbox (Solo PC, en móvil va con el nombre) */}
                              <td className="hidden md:table-cell px-4 py-3 text-center align-middle">
                                <input
                                  type="checkbox"
                                  className="w-4 h-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                                  checked={selectedImportContactIds.includes(contactItem.previewId)}
                                  disabled={!contactItem.canImport}
                                  onChange={() => toggleImportContactSelection(contactItem.previewId)}
                                />
                              </td>

                              {/* CELDA 2: Nombre (En móvil incluye el checkbox y fondo gris) */}
                              <td className="flex md:table-cell items-center gap-3 px-4 py-3 bg-gray-50 dark:bg-gray-800/50 md:bg-transparent border-b border-gray-200 dark:border-gray-700 md:border-none align-middle w-full md:w-auto">
                                {/* Mostrar Checkbox en móvil junto al nombre */}
                                <div className="md:hidden flex items-center shrink-0">
                                  <input
                                    type="checkbox"
                                    className="w-4 h-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                                    checked={selectedImportContactIds.includes(contactItem.previewId)}
                                    disabled={!contactItem.canImport}
                                    onChange={() => toggleImportContactSelection(contactItem.previewId)}
                                  />
                                </div>
                                <span className="font-bold text-gray-900 dark:text-white truncate block">
                                  {contactItem.firstName || t("field_guest")} {contactItem.lastName || ""}
                                </span>
                              </td>

                              {/* CELDA 3: Correo */}
                              <td className="flex md:table-cell justify-between items-center px-4 py-2.5 md:py-3 border-b border-gray-100 dark:border-gray-800 md:border-none align-middle w-full md:w-auto">
                                <span className="md:hidden text-[10px] font-bold uppercase tracking-widest text-gray-500 shrink-0 mr-4">{t("email")}</span>
                                <span className="text-gray-600 dark:text-gray-400 truncate max-w-[200px] md:max-w-full text-right md:text-left block">
                                  {contactItem.email || <span className="opacity-30">-</span>}
                                </span>
                              </td>

                              {/* CELDA 4: Teléfono */}
                              <td className="flex md:table-cell justify-between items-center px-4 py-2.5 md:py-3 border-b border-gray-100 dark:border-gray-800 md:border-none align-middle w-full md:w-auto">
                                <span className="md:hidden text-[10px] font-bold uppercase tracking-widest text-gray-500 shrink-0 mr-4">{t("field_phone")}</span>
                                <span className="text-gray-600 dark:text-gray-400 truncate max-w-[200px] md:max-w-full text-right md:text-left block">
                                  {contactItem.phone || <span className="opacity-30">-</span>}
                                </span>
                              </td>

                              {/* CELDA 5: Ciudad */}
                              <td className="flex md:table-cell justify-between items-center px-4 py-2.5 md:py-3 border-b border-gray-100 dark:border-gray-800 md:border-none align-middle w-full md:w-auto">
                                <span className="md:hidden text-[10px] font-bold uppercase tracking-widest text-gray-500 shrink-0 mr-4">{t("field_city")}</span>
                                <span className="text-gray-600 dark:text-gray-400 truncate max-w-[200px] md:max-w-full text-right md:text-left block">
                                  {[contactItem.city, contactItem.country].filter(Boolean).join(", ") || <span className="opacity-30">-</span>}
                                </span>
                              </td>

                              {/* CELDA 6: Estado */}
                              <td className="flex md:table-cell justify-between md:items-start items-center px-4 py-3 md:py-3 align-middle w-full md:w-auto">
                                <span className="md:hidden text-[10px] font-bold uppercase tracking-widest text-gray-500 shrink-0 mr-4">{t("status")}</span>
                                <div className="flex flex-col gap-1 items-end md:items-start text-right md:text-left">
                                  <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider ${statusColors} inline-block`}>
                                    {statusText}
                                  </span>
                                  {contactItem.duplicateExisting && contactItem.existingGuestName ? (
                                    <span className="text-[10px] text-gray-500 mt-0.5">
                                      {t("merge_guest_target_label")}: <strong className="text-gray-700 dark:text-gray-300">{contactItem.existingGuestName}</strong>
                                    </span>
                                  ) : null}
                                  {contactItem.requiresMergeApproval ? (
                                    <button
                                      className="text-[10px] font-bold text-orange-600 dark:text-orange-400 hover:underline mt-0.5 whitespace-nowrap"
                                      type="button"
                                      onClick={(event) => {
                                        event.preventDefault();
                                        event.stopPropagation();
                                        handleOpenLowConfidenceMergeReview(contactItem.previewId);
                                      }}
                                    >
                                      {t("contact_import_merge_review_action")} →
                                    </button>
                                  ) : null}
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>

                  {/* Paginación */}
                  {importContactsFiltered.length > 0 ? (
                    <div className="flex flex-col sm:flex-row items-center justify-between gap-3 mt-1 pb-2">
                      <p className="text-[11px] sm:text-xs font-bold text-gray-400 uppercase tracking-wider">
                        {t("pagination_page")} {Math.min(importContactsPage, importContactsTotalPages)} <span className="opacity-50">/ {importContactsTotalPages}</span>
                      </p>
                      <div className="flex gap-2 w-full sm:w-auto">
                        <button
                          className="flex-1 sm:flex-none px-4 py-2 bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 text-xs font-bold rounded-xl transition-colors disabled:opacity-50"
                          type="button"
                          onClick={() => setImportContactsPage((prev) => Math.max(1, prev - 1))}
                          disabled={importContactsPage <= 1}
                        >
                          {t("pagination_prev")}
                        </button>
                        <button
                          className="flex-1 sm:flex-none px-4 py-2 bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 text-xs font-bold rounded-xl transition-colors disabled:opacity-50"
                          type="button"
                          onClick={() => setImportContactsPage((prev) => Math.min(importContactsTotalPages, prev + 1))}
                          disabled={importContactsPage >= importContactsTotalPages}
                        >
                          {t("pagination_next")}
                        </button>
                      </div>
                    </div>
                  ) : null}
                </div>
              ) : null}

              {/* PASO 4: RESULTADO (ÉXITO) */}
              {importWizardStep === 4 ? (
                <div className="flex flex-col items-center justify-center text-center py-4 sm:py-8 gap-6 sm:gap-8">
                  <div className="relative">
                    <div className={`w-20 h-20 sm:w-24 sm:h-24 rounded-full flex items-center justify-center relative z-10 ${importWizardResult.partial ? "bg-orange-100 text-orange-500 dark:bg-orange-900/30" : "bg-green-100 text-green-500 dark:bg-green-900/30"}`}>
                      <Icon name={importWizardResult.partial ? "alert_triangle" : "check"} className="w-10 h-10 sm:w-12 sm:h-12" />
                    </div>
                    <div className={`absolute inset-0 rounded-full animate-ping opacity-20 ${importWizardResult.partial ? "bg-orange-500" : "bg-green-500"}`}></div>
                  </div>

                  <div className="w-full max-w-md bg-gray-50 dark:bg-gray-800/50 p-4 sm:p-6 rounded-3xl border border-gray-100 dark:border-gray-700">
                    <p className="text-xs sm:text-sm font-bold text-gray-500 uppercase tracking-widest mb-4 sm:mb-6">{t("import_wizard_result_progress_complete")}</p>

                    <div className="grid grid-cols-2 gap-3 sm:gap-4">
                      <article className="flex flex-col gap-1 p-3 sm:p-4 bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700">
                        <p className="text-xl sm:text-2xl font-black text-gray-900 dark:text-white">{importWizardResult.imported}</p>
                        <p className="text-[10px] sm:text-xs font-bold text-gray-500 uppercase">Nous</p>
                      </article>
                      <article className="flex flex-col gap-1 p-3 sm:p-4 bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700">
                        <p className="text-xl sm:text-2xl font-black text-gray-900 dark:text-white">{importWizardResult.updated}</p>
                        <p className="text-[10px] sm:text-xs font-bold text-gray-500 uppercase">Actualitzats</p>
                      </article>
                      <article className="flex flex-col gap-1 p-3 sm:p-4 bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700">
                        <p className={`text-xl sm:text-2xl font-black ${importWizardResult.failed > 0 ? "text-red-500" : "text-gray-900 dark:text-white"}`}>{importWizardResult.failed}</p>
                        <p className="text-[10px] sm:text-xs font-bold text-gray-500 uppercase">Errors</p>
                      </article>
                      <article className="flex flex-col gap-1 p-3 sm:p-4 bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700">
                        <p className="text-xl sm:text-2xl font-black text-gray-900 dark:text-white">{importWizardResult.skipped}</p>
                        <p className="text-[10px] sm:text-xs font-bold text-gray-500 uppercase">Omesos</p>
                      </article>
                    </div>
                  </div>

                  {importWizardResult.partial ? (
                    <div className="flex flex-col gap-1 items-center max-w-md">
                      <p className="font-bold text-orange-600 dark:text-orange-400">{t("import_wizard_result_partial_title")}</p>
                      <p className="text-xs sm:text-sm text-gray-500 text-center">
                        {interpolateText(t("import_wizard_result_partial_hint"), { count: importWizardResult.failed })}
                      </p>
                    </div>
                  ) : null}
                </div>
              ) : null}
            </div>

            {/* ERROR MESSAGES IN FOOTER */}
            {(importWizardShareMessage || importContactsMessage) && (
              <div className="px-4 sm:px-6 md:px-8 pb-2 shrink-0">
                <InlineMessage text={importWizardShareMessage || importContactsMessage} />
              </div>
            )}

            {/* FOOTER WIZARD */}
            <footer className="flex flex-col-reverse sm:flex-row items-center justify-between gap-3 sm:gap-4 p-4 sm:p-6 md:p-8 bg-gray-50/50 dark:bg-gray-800/50 border-t border-black/5 dark:border-white/10 shrink-0 mt-auto">
              <button
                className="w-full sm:w-auto px-6 py-3 sm:py-3.5 bg-white dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 font-bold rounded-2xl transition-colors border border-gray-200 dark:border-gray-700 shadow-sm disabled:opacity-50"
                type="button"
                onClick={handleImportWizardBack}
                disabled={isImportingContacts}
              >
                {importWizardStep === 1 || importWizardStep === 4 ? t("cancel_action") : t("pagination_prev")}
              </button>

              <button
                className={`w-full sm:w-auto px-8 py-3 sm:py-3.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-2xl transition-all shadow-lg shadow-blue-500/30 active:scale-95 disabled:opacity-50 disabled:active:scale-100 disabled:shadow-none flex items-center justify-center gap-2 relative overflow-hidden group ${importWizardCanContinue && importWizardStep === 2 ? 'ring-2 ring-offset-2 ring-blue-500 dark:ring-offset-gray-900' : ''}`}
                type="button"
                onClick={handleImportWizardContinue}
                disabled={!importWizardCanContinue}
              >
                {importWizardCanContinue && importWizardStep === 2 && (
                  <div className="absolute inset-0 bg-white/20 animate-pulse"></div>
                )}
                <span className="relative z-10 flex items-center gap-2">
                  {importWizardContinueLabel}
                  {importWizardStep !== 4 && <Icon name="arrow_right" className="w-4 h-4" />}
                </span>
              </button>
            </footer>
          </section>
        </div>,
        document.body
    ) : null
  );
}
