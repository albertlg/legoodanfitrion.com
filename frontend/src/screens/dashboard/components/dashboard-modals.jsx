import { Suspense, lazy } from "react";
import { createPortal } from "react-dom";
import { AILoader } from "../../../components/ai-loader";

const EventPlannerContextModal = lazy(() =>
  import("./event-planner-context-modal").then((module) => ({
    default: module.EventPlannerContextModal
  }))
);
const ImportContactsWizardModal = lazy(() =>
  import("./modals/import-contacts-wizard-modal").then((module) => ({
    default: module.ImportContactsWizardModal
  }))
);
const GuestMergeModal = lazy(() =>
  import("./modals/guest-merge-modal").then((module) => ({
    default: module.GuestMergeModal
  }))
);
const LowConfidenceMergeReviewModal = lazy(() =>
  import("./modals/low-confidence-merge-review-modal").then((module) => ({
    default: module.LowConfidenceMergeReviewModal
  }))
);
const GlobalShareConfirmModal = lazy(() =>
  import("./modals/global-share-confirm-modal").then((module) => ({
    default: module.GlobalShareConfirmModal
  }))
);
const DeleteConfirmModal = lazy(() =>
  import("./modals/delete-confirm-modal").then((module) => ({
    default: module.DeleteConfirmModal
  }))
);

function DashboardModals(props) {
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
    importWizardContinueLabel,
    isEventPlannerContextOpen,
    setIsEventPlannerContextOpen,
    setEventPlannerContextFocusField,
    eventPlannerContextDraft,
    setEventPlannerContextDraft,
    eventPlannerContextFocusField,
    showTechnicalPrompt,
    setShowTechnicalPrompt,
    eventPlannerContextDraftPromptBundle,
    handleGenerateFullEventPlanFromContext,
    selectedEventPlannerGenerationState,
    guestMergeSource,
    handleCloseMergeGuest,
    guestMergeSearch,
    setGuestMergeSearch,
    guestMergeTargetId,
    setGuestMergeTargetId,
    guestMergeCandidates,
    isMergingGuest,
    handleConfirmMergeGuest,
    pendingImportMergeApprovalItem,
    handleCloseLowConfidenceMergeReview,
    pendingImportMergeWillFillCount,
    importMergeReviewShowOnlyWillFill,
    setImportMergeReviewShowOnlyWillFill,
    pendingImportMergeVisibleCount,
    pendingImportMergeTotalCount,
    pendingImportMergeVisibleRows,
    pendingImportMergeSelectedFieldKeysSet,
    handleTogglePendingImportMergeFieldKey,
    formatMergeReviewValue,
    handleConfirmLowConfidenceMergeReview,
    pendingImportMergeSelectableCount,
    pendingImportMergeSelectedFieldKeys,
    pendingGlobalShareSave,
    setPendingGlobalShareSave,
    pendingGlobalSharePreset,
    pendingGlobalShareScopes,
    savingGlobalShareHostId,
    handleConfirmSaveGlobalShare,
    deleteTarget,
    setDeleteTarget,
    isDeleteConfirmLoading,
    handleConfirmDelete
  } = props;

  return createPortal(
    <>
      <AILoader t={t} isVisible={Boolean(selectedEventPlannerGenerationState?.isGenerating)} />

      {isImportWizardOpen ? (
        <Suspense fallback={null}>
          <ImportContactsWizardModal
            t={t}
            isImportWizardOpen={isImportWizardOpen}
            handleCloseImportWizard={handleCloseImportWizard}
            importWizardStep={importWizardStep}
            importWizardStepLabel={importWizardStepLabel}
            importWizardStepTitle={importWizardStepTitle}
            importWizardStepHint={importWizardStepHint}
            IMPORT_WIZARD_STEP_TOTAL={IMPORT_WIZARD_STEP_TOTAL}
            importWizardSourceOptions={importWizardSourceOptions}
            importWizardSource={importWizardSource}
            setImportWizardSource={setImportWizardSource}
            isMobileImportExperience={isMobileImportExperience}
            setImportContactsMessage={setImportContactsMessage}
            importWizardUploadedFileName={importWizardUploadedFileName}
            importContactsAnalysis={importContactsAnalysis}
            handleImportWizardDrop={handleImportWizardDrop}
            contactImportFileInputRef={contactImportFileInputRef}
            handleImportContactsFile={handleImportContactsFile}
            importContactsDraft={importContactsDraft}
            setImportContactsDraft={setImportContactsDraft}
            handlePreviewContactsFromDraft={handlePreviewContactsFromDraft}
            handleClearImportContacts={handleClearImportContacts}
            handleImportGoogleContacts={handleImportGoogleContacts}
            isImportingGoogleContacts={isImportingGoogleContacts}
            canUseGoogleContacts={canUseGoogleContacts}
            canUseDeviceContacts={canUseDeviceContacts}
            isIOSDevice={isIOSDevice}
            contactPickerUnsupportedReason={contactPickerUnsupportedReason}
            handlePickDeviceContacts={handlePickDeviceContacts}
            importWizardQrDataUrl={importWizardQrDataUrl}
            handleShareImportWizardLink={handleShareImportWizardLink}
            importWizardShareEmail={importWizardShareEmail}
            setImportWizardShareEmail={setImportWizardShareEmail}
            handleImportWizardEmailLink={handleImportWizardEmailLink}
            importContactsSearch={importContactsSearch}
            setImportContactsSearch={setImportContactsSearch}
            importContactsPageSize={importContactsPageSize}
            setImportContactsPageSize={setImportContactsPageSize}
            IMPORT_PREVIEW_PAGE_SIZE_DEFAULT={IMPORT_PREVIEW_PAGE_SIZE_DEFAULT}
            IMPORT_PREVIEW_PAGE_SIZE_OPTIONS={IMPORT_PREVIEW_PAGE_SIZE_OPTIONS}
            importDuplicateMode={importDuplicateMode}
            handleImportDuplicateModeChange={handleImportDuplicateModeChange}
            importContactsDuplicateCount={importContactsDuplicateCount}
            interpolateText={interpolateText}
            handleSelectSuggestedImportContacts={handleSelectSuggestedImportContacts}
            handleSelectCurrentImportPageReady={handleSelectCurrentImportPageReady}
            handleSelectAllReadyImportContacts={handleSelectAllReadyImportContacts}
            handleClearReadyImportContactsSelection={handleClearReadyImportContactsSelection}
            importContactsSelectedReady={importContactsSelectedReady}
            pagedImportContacts={pagedImportContacts}
            selectedImportContactIds={selectedImportContactIds}
            toggleImportContactSelection={toggleImportContactSelection}
            handleOpenLowConfidenceMergeReview={handleOpenLowConfidenceMergeReview}
            importContactsFiltered={importContactsFiltered}
            importContactsPage={importContactsPage}
            importContactsTotalPages={importContactsTotalPages}
            setImportContactsPage={setImportContactsPage}
            importWizardResult={importWizardResult}
            importWizardShareMessage={importWizardShareMessage}
            importContactsMessage={importContactsMessage}
            handleImportWizardBack={handleImportWizardBack}
            isImportingContacts={isImportingContacts}
            importWizardCanContinue={importWizardCanContinue}
            handleImportWizardContinue={handleImportWizardContinue}
            importWizardContinueLabel={importWizardContinueLabel}
          />
        </Suspense>
      ) : null}

      {isEventPlannerContextOpen ? (
        <Suspense fallback={null}>
          <EventPlannerContextModal
            isOpen={isEventPlannerContextOpen}
            onClose={() => {
              setIsEventPlannerContextOpen(false);
              setEventPlannerContextFocusField("");
            }}
            t={t}
            draft={eventPlannerContextDraft}
            setDraft={setEventPlannerContextDraft}
            focusField={eventPlannerContextFocusField}
            showTechnicalPrompt={showTechnicalPrompt}
            onToggleTechnicalPrompt={() => setShowTechnicalPrompt((prev) => !prev)}
            technicalPrompt={eventPlannerContextDraftPromptBundle.prompt}
            onGenerate={handleGenerateFullEventPlanFromContext}
            isGenerating={Boolean(selectedEventPlannerGenerationState?.isGenerating)}
          />
        </Suspense>
      ) : null}

      {guestMergeSource ? (
        <Suspense fallback={null}>
          <GuestMergeModal
            t={t}
            guestMergeSource={guestMergeSource}
            handleCloseMergeGuest={handleCloseMergeGuest}
            guestMergeSearch={guestMergeSearch}
            setGuestMergeSearch={setGuestMergeSearch}
            guestMergeTargetId={guestMergeTargetId}
            setGuestMergeTargetId={setGuestMergeTargetId}
            guestMergeCandidates={guestMergeCandidates}
            isMergingGuest={isMergingGuest}
            handleConfirmMergeGuest={handleConfirmMergeGuest}
          />
        </Suspense>
      ) : null}

      {pendingImportMergeApprovalItem ? (
        <Suspense fallback={null}>
          <LowConfidenceMergeReviewModal
            t={t}
            pendingImportMergeApprovalItem={pendingImportMergeApprovalItem}
            handleCloseLowConfidenceMergeReview={handleCloseLowConfidenceMergeReview}
            interpolateText={interpolateText}
            pendingImportMergeWillFillCount={pendingImportMergeWillFillCount}
            importMergeReviewShowOnlyWillFill={importMergeReviewShowOnlyWillFill}
            setImportMergeReviewShowOnlyWillFill={setImportMergeReviewShowOnlyWillFill}
            pendingImportMergeVisibleCount={pendingImportMergeVisibleCount}
            pendingImportMergeTotalCount={pendingImportMergeTotalCount}
            pendingImportMergeVisibleRows={pendingImportMergeVisibleRows}
            pendingImportMergeSelectedFieldKeysSet={pendingImportMergeSelectedFieldKeysSet}
            handleTogglePendingImportMergeFieldKey={handleTogglePendingImportMergeFieldKey}
            formatMergeReviewValue={formatMergeReviewValue}
            handleConfirmLowConfidenceMergeReview={handleConfirmLowConfidenceMergeReview}
            pendingImportMergeSelectableCount={pendingImportMergeSelectableCount}
            pendingImportMergeSelectedFieldKeys={pendingImportMergeSelectedFieldKeys}
          />
        </Suspense>
      ) : null}

      {pendingGlobalShareSave ? (
        <Suspense fallback={null}>
          <GlobalShareConfirmModal
            t={t}
            pendingGlobalShareSave={pendingGlobalShareSave}
            setPendingGlobalShareSave={setPendingGlobalShareSave}
            pendingGlobalSharePreset={pendingGlobalSharePreset}
            pendingGlobalShareScopes={pendingGlobalShareScopes}
            savingGlobalShareHostId={savingGlobalShareHostId}
            handleConfirmSaveGlobalShare={handleConfirmSaveGlobalShare}
          />
        </Suspense>
      ) : null}

      {deleteTarget ? (
        <Suspense fallback={null}>
          <DeleteConfirmModal
            t={t}
            deleteTarget={deleteTarget}
            setDeleteTarget={setDeleteTarget}
            isDeleteConfirmLoading={isDeleteConfirmLoading}
            handleConfirmDelete={handleConfirmDelete}
          />
        </Suspense>
      ) : null}
    </>,
    document.body
  );
}

export { DashboardModals };
