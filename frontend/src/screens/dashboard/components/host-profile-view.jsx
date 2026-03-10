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
    <section className="max-w-4xl mx-auto w-full bg-white/40 dark:bg-gray-900/40 backdrop-blur-xl rounded-3xl border border-black/10 dark:border-white/10 shadow-sm p-6 md:p-8 mt-6 flex flex-col gap-6">
      <article className="bg-white/50 dark:bg-white/5 rounded-2xl border border-black/5 dark:border-white/10 p-5 mb-6 flex flex-col gap-4">
        <div className="profile-summary-header">
          <div>
            <h3 className="section-title">
              <Icon name="sparkle" className="icon" />
              {t("host_profile_completeness_title")}
            </h3>
            <p className="field-help">{t("host_profile_completeness_hint")}</p>
          </div>
          <span className={`status-pill ${isProfileGuestLinked ? "status-yes" : "status-pending"}`}>
            {isProfileGuestLinked ? t("host_profile_completeness_linked") : t("host_profile_completeness_unlinked")}
          </span>
        </div>
        {isProfileGuestLinked ? (
          <>
            <div
              className={`list-progress-track ${hostGuestProfilePercent >= 70
                ? "progress-high"
                : hostGuestProfilePercent >= 35
                  ? "progress-medium"
                  : "progress-low"
                }`}
              role="progressbar"
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={hostGuestProfilePercent}
            >
              <span style={{ width: `${hostGuestProfilePercent}%` }} />
            </div>
            <p className="item-meta">
              {interpolateText(t("host_profile_completeness_progress"), {
                done: hostGuestProfileCompletedCount,
                total: hostGuestProfileTotalCount,
                percent: hostGuestProfilePercent
              })}
            </p>
            <div className="profile-summary-signals">
              {hostGuestProfileSignals.map((signalItem) => (
                <span key={signalItem.key} className={`status-pill ${signalItem.done ? "status-yes" : "status-draft"}`}>
                  {signalItem.label}
                </span>
              ))}
            </div>
          </>
        ) : (
          <p className="hint">{t("host_profile_completeness_unlinked_hint")}</p>
        )}
        <div className="button-row">
          {isProfileGuestLinked ? (
            <button
              className="btn btn-ghost btn-sm rounded-xl"
              type="button"
              onClick={() => openGuestAdvancedEditor(profileLinkedGuestId)}
            >
              {t("host_profile_open_advanced_action")}
            </button>
          ) : null}
          <button className="btn btn-ghost btn-sm rounded-xl" type="button" onClick={syncHostGuestProfileForm}>
            {t("host_profile_guest_sync")}
          </button>
        </div>
      </article>

      <article className="bg-white/50 dark:bg-white/5 rounded-2xl border border-black/5 dark:border-white/10 p-5 mb-6 flex flex-col gap-4">
        <div className="profile-summary-header">
          <div>
            <h3 className="section-title">
              <Icon name="shield" className="icon" />
              {t("global_profile_title")}
            </h3>
            <p className="field-help">{t("global_profile_hint")}</p>
          </div>
          <span className={`status-pill ${isGlobalProfileClaimed ? "status-yes" : "status-pending"}`}>
            {isGlobalProfileClaimed ? t("global_profile_status_claimed") : t("global_profile_status_not_claimed")}
          </span>
        </div>
        {!isGlobalProfileFeatureReady ? (
          <p className="hint">{t("global_profile_feature_pending")}</p>
        ) : (
          <>
            <p className="hint">{t("global_profile_privacy_intro")}</p>
            <article className="recommendation-card global-share-value-card">
              <p className="item-title">{t("global_profile_value_title")}</p>
              <p className="field-help">
                {interpolateText(t("global_profile_value_hint"), { percent: hostGuestProfilePercent })}
              </p>
              <ul className="list recommendation-list">
                <li>{t("global_profile_value_benefit_1")}</li>
                <li>{t("global_profile_value_benefit_2")}</li>
                <li>{t("global_profile_value_benefit_3")}</li>
              </ul>
              <div className="button-row">
                <button className="btn btn-ghost btn-sm rounded-xl" type="button" onClick={() => openWorkspace("events", "insights")}>
                  {t("global_profile_value_action_insights")}
                </button>
                <button
                  className="btn btn-ghost btn-sm rounded-xl"
                  type="button"
                  onClick={() =>
                    isProfileGuestLinked ? openGuestAdvancedEditor(profileLinkedGuestId) : syncHostGuestProfileForm()
                  }
                >
                  {isProfileGuestLinked
                    ? t("global_profile_value_action_profile")
                    : t("global_profile_value_action_link_profile")}
                </button>
              </div>
            </article>
            <div className="button-row">
              <button className="btn btn-ghost btn-sm rounded-xl" type="button" onClick={handleClaimGlobalProfile} disabled={isClaimingGlobalProfile}>
                {isClaimingGlobalProfile ? t("global_profile_claiming") : t("global_profile_claim_action")}
              </button>
              <button
                className="btn btn-ghost btn-sm rounded-xl"
                type="button"
                onClick={() => handleLinkProfileGuestToGlobal(profileLinkedGuestId)}
                disabled={isLinkingGlobalGuest || !isProfileGuestLinked}
              >
                {isLinkingGlobalGuest ? t("global_profile_linking") : t("global_profile_link_self_action")}
              </button>
              <button
                className="btn btn-ghost btn-sm rounded-xl"
                type="button"
                onClick={handleLinkAllGuestsToGlobalProfiles}
                disabled={isLinkingAllGlobalGuests}
              >
                {isLinkingAllGlobalGuests ? t("global_profile_linking_all") : t("global_profile_link_all_action")}
              </button>
            </div>
            {globalShareTargetsVisible.length > 0 ? (
              <div className="button-row">
                <button
                  className="btn btn-ghost btn-sm rounded-xl"
                  type="button"
                  onClick={() => handleApplyGlobalShareAction("pause")}
                  disabled={isPausingGlobalShares || isRevokingGlobalShares}
                >
                  {isPausingGlobalShares ? t("global_profile_share_bulk_pausing") : t("global_profile_share_bulk_pause")}
                </button>
                <button
                  className="btn btn-danger btn-sm rounded-xl"
                  type="button"
                  onClick={() => handleApplyGlobalShareAction("revoke_all")}
                  disabled={isRevokingGlobalShares || isPausingGlobalShares}
                >
                  {isRevokingGlobalShares
                    ? t("global_profile_share_bulk_revoking")
                    : t("global_profile_share_bulk_revoke_all")}
                </button>
              </div>
            ) : null}
            <p className="hint">
              {isGlobalProfileClaimed
                ? interpolateText(t("global_profile_id_hint"), { id: globalProfileId })
                : t("global_profile_claim_hint")}
            </p>
            <div className="profile-summary-signals">
              <span className="status-pill status-host-conversion-source-default">
                {t("global_profile_share_targets_count")} {globalShareTargetsVisible.length}
              </span>
              <span className="status-pill status-host-conversion-source-default">
                {t("global_profile_share_active_count")} {globalShareActiveCount}
              </span>
            </div>
            {globalShareSelfTargetCount > 0 ? (
              <p className="hint">{t("global_profile_share_self_hidden_hint")}</p>
            ) : null}
            {globalShareTargetsVisible.length > 0 ? (
              <div className="global-share-grid">
                {globalShareTargetsVisible.map((targetItem) => {
                  const hostId = targetItem.host_user_id;
                  const shareDraft = globalShareDraftByHostId[hostId] || {
                    status: "inactive",
                    allow_identity: false,
                    allow_food: false,
                    allow_lifestyle: false,
                    allow_conversation: false,
                    allow_health: false
                  };
                  const appliedPreset = inferGlobalSharePreset(shareDraft);
                  return (
                    <article key={hostId} className="recommendation-card global-share-card">
                      <div className="profile-linkage-row">
                        <div>
                          <p className="item-title">{targetItem.host_name || t("host_default_name")}</p>
                          <p className="item-meta">{targetItem.host_email || hostId}</p>
                        </div>
                        <span className={`status-pill ${statusClass(shareDraft.status)}`}>
                          {String(shareDraft.status || "").toLowerCase() === "active"
                            ? t("status_active")
                            : t("status_revoked")}
                        </span>
                      </div>
                      <p className="hint">
                        {t("global_profile_link_count_hint")} {targetItem.link_count || 0}
                      </p>
                      <p className="item-meta">{t("global_profile_share_level_label")}</p>
                      <div className="share-preset-row">
                        <button
                          className={`multi-chip ${appliedPreset === "basic" ? "active" : ""}`}
                          type="button"
                          onClick={() => handleApplyGlobalSharePreset(hostId, "basic")}
                        >
                          {t("global_profile_share_preset_basic")}
                        </button>
                        <button
                          className={`multi-chip ${appliedPreset === "custom" ? "active" : ""}`}
                          type="button"
                          onClick={() => handleApplyGlobalSharePreset(hostId, "custom")}
                        >
                          {t("global_profile_share_preset_custom")}
                        </button>
                        <button
                          className={`multi-chip ${appliedPreset === "private" ? "active" : ""}`}
                          type="button"
                          onClick={() => handleApplyGlobalSharePreset(hostId, "private")}
                        >
                          {t("global_profile_share_preset_private")}
                        </button>
                      </div>
                      {appliedPreset === "custom" ? (
                        <div className="global-share-permissions">
                          <label className="event-setting-toggle">
                            <input
                              type="checkbox"
                              checked={Boolean(shareDraft.allow_identity)}
                              onChange={(event) =>
                                handleChangeGlobalShareDraft(hostId, "allow_identity", event.target.checked)
                              }
                            />
                            {t("global_profile_scope_identity")}
                          </label>
                          <label className="event-setting-toggle">
                            <input
                              type="checkbox"
                              checked={Boolean(shareDraft.allow_food)}
                              onChange={(event) => handleChangeGlobalShareDraft(hostId, "allow_food", event.target.checked)}
                            />
                            {t("global_profile_scope_food")}
                          </label>
                          <label className="event-setting-toggle">
                            <input
                              type="checkbox"
                              checked={Boolean(shareDraft.allow_lifestyle)}
                              onChange={(event) =>
                                handleChangeGlobalShareDraft(hostId, "allow_lifestyle", event.target.checked)
                              }
                            />
                            {t("global_profile_scope_lifestyle")}
                          </label>
                          <label className="event-setting-toggle">
                            <input
                              type="checkbox"
                              checked={Boolean(shareDraft.allow_conversation)}
                              onChange={(event) =>
                                handleChangeGlobalShareDraft(hostId, "allow_conversation", event.target.checked)
                              }
                            />
                            {t("global_profile_scope_conversation")}
                          </label>
                          <label className="event-setting-toggle">
                            <input
                              type="checkbox"
                              checked={Boolean(shareDraft.allow_health)}
                              onChange={(event) =>
                                handleChangeGlobalShareDraft(hostId, "allow_health", event.target.checked)
                              }
                            />
                            {t("global_profile_scope_health")}
                          </label>
                        </div>
                      ) : null}
                      <div className="button-row">
                        <button
                          className="btn btn-ghost btn-sm rounded-xl"
                          type="button"
                          onClick={() =>
                            setPreviewGlobalShareHostId((prev) => (prev === hostId ? "" : hostId))
                          }
                        >
                          {previewGlobalShareHostId === hostId
                            ? t("global_profile_preview_hide")
                            : t("global_profile_preview_show")}
                        </button>
                        <button
                          className="btn btn-ghost btn-sm rounded-xl"
                          type="button"
                          onClick={() => handleRequestSaveGlobalShare(hostId)}
                          disabled={savingGlobalShareHostId === hostId}
                        >
                          {savingGlobalShareHostId === hostId
                            ? t("global_profile_share_saving")
                            : t("global_profile_share_save_action")}
                        </button>
                      </div>
                      {previewGlobalShareHostId === hostId ? (
                        <div className="global-share-preview">
                          <p className="item-meta">{t("global_profile_preview_title")}</p>
                          <ul className="integration-check-list">
                            {[
                              ["allow_identity", t("global_profile_scope_identity")],
                              ["allow_food", t("global_profile_scope_food")],
                              ["allow_lifestyle", t("global_profile_scope_lifestyle")],
                              ["allow_conversation", t("global_profile_scope_conversation")],
                              ["allow_health", t("global_profile_scope_health")]
                            ].map(([fieldKey, label]) => (
                              <li key={`${hostId}-${fieldKey}`} className="integration-check-item">
                                <span className="item-meta">{label}</span>
                                <span
                                  className={`status-pill ${Boolean(shareDraft[fieldKey]) && String(shareDraft.status || "") === "active"
                                    ? "status-yes"
                                    : "status-no"
                                    }`}
                                >
                                  <Icon
                                    name={
                                      Boolean(shareDraft[fieldKey]) && String(shareDraft.status || "") === "active"
                                        ? "check"
                                        : "x"
                                    }
                                    className="icon icon-xs"
                                  />
                                </span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      ) : null}
                    </article>
                  );
                })}
              </div>
            ) : (
              <p className="hint">{t("global_profile_share_targets_empty")}</p>
            )}
            <div className="global-share-history">
              <h4 className="item-title">{t("global_profile_history_title")}</h4>
              <p className="field-help">{t("global_profile_history_hint")}</p>
              {isLoadingGlobalShareHistory ? (
                <p className="hint">{t("global_profile_history_loading")}</p>
              ) : globalShareHistoryItems.length === 0 ? (
                <p className="hint">{t("global_profile_history_empty")}</p>
              ) : (
                <ul className="integration-check-list">
                  {globalShareHistoryItems.map((entry) => (
                    <li key={entry.id} className="integration-check-item">
                      <div>
                        <p className="item-meta">{entry.hostName}</p>
                        <p className="hint">{entry.hostEmail}</p>
                      </div>
                      <div>
                        <span className="status-pill status-host-conversion-source-default">
                          {formatGlobalShareEventType(t, entry.event_type)}
                        </span>
                        <p className="hint">
                          {formatRelativeDate(entry.created_at, language, t("no_date"))}
                        </p>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </>
        )}
        <InlineMessage text={globalProfileMessage} />
      </article>

      {isIntegrationDebugEnabled ? (
        <article className="bg-white/50 dark:bg-white/5 rounded-2xl border border-black/5 dark:border-white/10 p-5 mb-6 flex flex-col gap-4">
          <div className="profile-summary-header">
            <div>
              <h3 className="section-title">
                <Icon name="trend" className="icon" />
                {t("integration_status_title")}
              </h3>
              <p className="field-help">{t("integration_status_hint")}</p>
            </div>
            <span
              className={`status-pill ${integrationChecksTotal > 0 && integrationChecksOkCount === integrationChecksTotal ? "status-yes" : "status-pending"
                }`}
            >
              {integrationChecksOkCount}/{integrationChecksTotal || 0}
            </span>
          </div>
          <div className="button-row">
            <button
              className="btn btn-ghost btn-sm rounded-xl"
              type="button"
              onClick={() => setIsIntegrationPanelOpen((prev) => !prev)}
            >
              {isIntegrationPanelOpen ? t("integration_status_hide") : t("integration_status_show")}
            </button>
            {isIntegrationPanelOpen ? (
              <button
                className="btn btn-ghost btn-sm rounded-xl"
                type="button"
                onClick={loadIntegrationStatusData}
                disabled={isLoadingIntegrationStatus}
              >
                {isLoadingIntegrationStatus ? t("integration_status_loading") : t("integration_status_refresh")}
              </button>
            ) : null}
          </div>
          {isIntegrationPanelOpen ? (
            integrationStatus ? (
              <>
                <p className="hint">
                  {interpolateText(t("integration_status_checks_label"), {
                    ok: integrationChecksOkCount,
                    total: integrationChecksTotal
                  })}
                </p>
                <div className="profile-summary-signals">
                  <span className="status-pill status-host-conversion-source-default">
                    {interpolateText(t("integration_status_profile_id"), {
                      id: String(integrationStatus.global_profile_id || "—")
                    })}
                  </span>
                  <span className="status-pill status-host-conversion-source-default">
                    {interpolateText(t("integration_status_share_targets"), { count: integrationShareTargetCount })}
                  </span>
                  <span className={`status-pill ${integrationSelfTargetCount > 0 ? "status-no" : "status-yes"}`}>
                    {interpolateText(t("integration_status_self_targets"), { count: integrationSelfTargetCount })}
                  </span>
                </div>
                <ul className="integration-check-list">
                  {integrationChecks.map((checkItem) => (
                    <li key={checkItem.key} className="integration-check-item">
                      <span className="item-meta">{checkItem.label}</span>
                      <span className={`status-pill ${checkItem.ok ? "status-yes" : "status-no"}`}>
                        {checkItem.ok ? t("integration_status_check_ok") : t("integration_status_check_missing")}
                      </span>
                    </li>
                  ))}
                </ul>
              </>
            ) : (
              <p className="hint">{isLoadingIntegrationStatus ? t("integration_status_loading") : t("integration_status_empty")}</p>
            )
          ) : (
            <>
              <p className="hint">
                {interpolateText(t("integration_status_collapsed_hint"), {
                  ok: integrationChecksOkCount,
                  total: integrationChecksTotal
                })}
              </p>
              <div className="profile-summary-signals">
                <span className={`status-pill ${integrationSelfTargetCount > 0 ? "status-no" : "status-yes"}`}>
                  {interpolateText(t("integration_status_self_targets"), { count: integrationSelfTargetCount })}
                </span>
              </div>
            </>
          )}
          <InlineMessage text={integrationStatusMessage} />
        </article>
      ) : null}

      <div className="profile-grid">
        <form className="bg-white/50 dark:bg-white/5 rounded-2xl border border-black/5 dark:border-white/10 p-5 mb-6 flex flex-col gap-4" onSubmit={handleSaveHostProfile} noValidate>
          <h3 className="section-title">
            <Icon name="user" className="icon" />
            {t("host_profile_title")}
          </h3>
          <p className="field-help">{t("host_profile_hint")}</p>

          <label>
            <span className="block mb-1.5 text-[10px] font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">{t("field_full_name")}</span>
            <input className="w-full px-4 py-2.5 bg-white/50 dark:bg-black/20 border border-black/5 dark:border-white/10 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 rounded-xl text-sm text-gray-900 dark:text-white transition-all shadow-sm"
              type="text"
              value={hostProfileName}
              onChange={(event) => setHostProfileName(event.target.value)}
              placeholder={t("placeholder_full_name")}
            />
          </label>
          <label>
            <span className="block mb-1.5 text-[10px] font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">
              <Icon name="mail" className="icon icon-sm" />
              {t("email")}
            </span>
            <input className="w-full px-4 py-2.5 bg-white/50 dark:bg-black/20 border border-black/5 dark:border-white/10 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 rounded-xl text-sm text-gray-900 dark:text-white transition-all shadow-sm" type="email" value={session?.user?.email || ""} readOnly />
            <FieldMeta helpText={t("host_profile_email_readonly")} />
          </label>
          <label>
            <span className="block mb-1.5 text-[10px] font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">
              <Icon name="phone" className="icon icon-sm" />
              {t("field_phone")}
            </span>
            <input className="w-full px-4 py-2.5 bg-white/50 dark:bg-black/20 border border-black/5 dark:border-white/10 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 rounded-xl text-sm text-gray-900 dark:text-white transition-all shadow-sm"
              type="tel"
              value={hostProfilePhone}
              onChange={(event) => setHostProfilePhone(event.target.value)}
              placeholder={t("placeholder_phone")}
            />
          </label>
          <label>
            <span className="block mb-1.5 text-[10px] font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">{t("field_city")}</span>
            <input className="w-full px-4 py-2.5 bg-white/50 dark:bg-black/20 border border-black/5 dark:border-white/10 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 rounded-xl text-sm text-gray-900 dark:text-white transition-all shadow-sm"
              type="text"
              value={hostProfileCity}
              onChange={(event) => setHostProfileCity(event.target.value)}
              placeholder={t("placeholder_city")}
              list="host-city-options"
            />
          </label>
          <label>
            <span className="block mb-1.5 text-[10px] font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">{t("field_country")}</span>
            <input className="w-full px-4 py-2.5 bg-white/50 dark:bg-black/20 border border-black/5 dark:border-white/10 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 rounded-xl text-sm text-gray-900 dark:text-white transition-all shadow-sm"
              type="text"
              value={hostProfileCountry}
              onChange={(event) => setHostProfileCountry(event.target.value)}
              placeholder={t("placeholder_country")}
              list="host-country-options"
            />
          </label>
          <label>
            <span className="block mb-1.5 text-[10px] font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">{t("field_relationship")}</span>
            <select className="w-full px-4 py-2.5 bg-white/50 dark:bg-black/20 border border-black/5 dark:border-white/10 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 rounded-xl text-sm text-gray-900 dark:text-white transition-all shadow-sm" value={hostProfileRelationship} onChange={(event) => setHostProfileRelationship(event.target.value)}>
              <option value="">{t("select_option_prompt")}</option>
              {relationshipOptions.map((optionValue) => (
                <option key={optionValue} value={optionValue}>
                  {optionValue}
                </option>
              ))}
            </select>
          </label>

          <datalist id="host-city-options">
            {cityOptions.map((optionValue) => (
              <option key={optionValue} value={optionValue} />
            ))}
          </datalist>
          <datalist id="host-country-options">
            {countryOptions.map((optionValue) => (
              <option key={optionValue} value={optionValue} />
            ))}
          </datalist>

          <div className="button-row">
            <button className="btn rounded-xl" type="submit" disabled={isSavingHostProfile}>
              {isSavingHostProfile ? t("host_profile_saving") : t("host_profile_save")}
            </button>
          </div>
          <FieldMeta helpText={t("host_profile_sync_hint")} />
          <InlineMessage text={hostProfileMessage} />
        </form>

        <form className="bg-white/50 dark:bg-white/5 rounded-2xl border border-black/5 dark:border-white/10 p-5 mb-6 flex flex-col gap-4" onSubmit={handleSaveGuest} noValidate>
          <div className="profile-linkage-row">
            <h3 className="section-title">
              <Icon name="user" className="icon" />
              {t("host_profile_guest_title")}
            </h3>
            <span className={`status-pill ${isProfileGuestLinked ? "status-yes" : "status-pending"}`}>
              {isProfileGuestLinked ? t("host_profile_guest_linked") : t("host_profile_guest_unlinked")}
            </span>
          </div>
          <p className="field-help">{t("host_profile_guest_hint")}</p>

          <label>
            <span className="block mb-1.5 text-[10px] font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">{t("field_first_name")} *</span>
            <input className="w-full px-4 py-2.5 bg-white/50 dark:bg-black/20 border border-black/5 dark:border-white/10 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 rounded-xl text-sm text-gray-900 dark:text-white transition-all shadow-sm"
              type="text"
              value={guestFirstName}
              onChange={(event) => setGuestFirstName(event.target.value)}
              placeholder={t("placeholder_first_name")}
              aria-invalid={Boolean(guestErrors.firstName)}
            />
            <FieldMeta errorText={guestErrors.firstName ? t(guestErrors.firstName) : ""} />
          </label>
          <label>
            <span className="block mb-1.5 text-[10px] font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">{t("field_last_name")}</span>
            <input className="w-full px-4 py-2.5 bg-white/50 dark:bg-black/20 border border-black/5 dark:border-white/10 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 rounded-xl text-sm text-gray-900 dark:text-white transition-all shadow-sm"
              type="text"
              value={guestLastName}
              onChange={(event) => setGuestLastName(event.target.value)}
              placeholder={t("placeholder_last_name")}
              aria-invalid={Boolean(guestErrors.lastName)}
            />
            <FieldMeta errorText={guestErrors.lastName ? t(guestErrors.lastName) : ""} />
          </label>
          <label>
            <span className="block mb-1.5 text-[10px] font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">{t("field_guest_photo")}</span>
            <div className="guest-photo-input-row">
              <AvatarCircle
                className="list-avatar guest-photo-preview rounded-full ring-4 ring-white/50 dark:ring-black/20"
                label={`${guestFirstName || ""} ${guestLastName || ""}`.trim() || t("field_guest")}
                fallback="IN"
                imageUrl={guestPhotoUrl}
                size={44}
              />
              <input className="w-full px-4 py-2.5 bg-white/50 dark:bg-black/20 border border-black/5 dark:border-white/10 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 rounded-xl text-sm text-gray-900 dark:text-white transition-all shadow-sm"
                type="url"
                value={guestPhotoInputValue}
                onChange={(event) => handleGuestPhotoUrlChange(event.target.value)}
                placeholder={t("placeholder_guest_photo")}
              />
            </div>
            <div className="button-row guest-photo-actions">
              <label className="btn btn-ghost btn-sm guest-photo-upload-btn rounded-xl">
                {t("guest_photo_upload")}
                <input type="file" accept="image/*" onChange={handleGuestPhotoFileChange} />
              </label>
              <button className="btn btn-ghost btn-sm rounded-xl" type="button" onClick={handleRemoveGuestPhoto} disabled={!guestPhotoUrl}>
                {t("guest_photo_remove")}
              </button>
            </div>
            <FieldMeta helpText={t("guest_photo_hint")} />
          </label>
          <label>
            <span className="block mb-1.5 text-[10px] font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">
              <Icon name="mail" className="icon icon-sm" />
              {t("email")}
            </span>
            <input className="w-full px-4 py-2.5 bg-white/50 dark:bg-black/20 border border-black/5 dark:border-white/10 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 rounded-xl text-sm text-gray-900 dark:text-white transition-all shadow-sm" type="email" value={guestEmail || session?.user?.email || ""} readOnly />
            <FieldMeta helpText={t("host_profile_guest_email_hint")} />
          </label>
          <label>
            <span className="block mb-1.5 text-[10px] font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">
              <Icon name="phone" className="icon icon-sm" />
              {t("field_phone")}
            </span>
            <input className="w-full px-4 py-2.5 bg-white/50 dark:bg-black/20 border border-black/5 dark:border-white/10 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 rounded-xl text-sm text-gray-900 dark:text-white transition-all shadow-sm"
              type="tel"
              value={guestPhone}
              onChange={(event) => setGuestPhone(event.target.value)}
              placeholder={t("placeholder_phone")}
              aria-invalid={Boolean(guestErrors.phone)}
            />
            <FieldMeta errorText={guestErrors.phone ? t(guestErrors.phone) : ""} />
          </label>
          <label>
            <span className="block mb-1.5 text-[10px] font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">{t("field_relationship")}</span>
            <input className="w-full px-4 py-2.5 bg-white/50 dark:bg-black/20 border border-black/5 dark:border-white/10 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 rounded-xl text-sm text-gray-900 dark:text-white transition-all shadow-sm"
              type="text"
              value={guestRelationship}
              onChange={(event) => setGuestRelationship(event.target.value)}
              placeholder={t("placeholder_relationship")}
              list="profile-guest-relationship-options"
              aria-invalid={Boolean(guestErrors.relationship)}
            />
            <FieldMeta errorText={guestErrors.relationship ? t(guestErrors.relationship) : ""} />
          </label>
          <label>
            <span className="block mb-1.5 text-[10px] font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">{t("field_city")}</span>
            <input className="w-full px-4 py-2.5 bg-white/50 dark:bg-black/20 border border-black/5 dark:border-white/10 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 rounded-xl text-sm text-gray-900 dark:text-white transition-all shadow-sm"
              type="text"
              value={guestCity}
              onChange={(event) => setGuestCity(event.target.value)}
              placeholder={t("placeholder_city")}
              list="profile-guest-city-options"
              aria-invalid={Boolean(guestErrors.city)}
            />
            <FieldMeta errorText={guestErrors.city ? t(guestErrors.city) : ""} />
          </label>
          <label>
            <span className="block mb-1.5 text-[10px] font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">{t("field_country")}</span>
            <input className="w-full px-4 py-2.5 bg-white/50 dark:bg-black/20 border border-black/5 dark:border-white/10 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 rounded-xl text-sm text-gray-900 dark:text-white transition-all shadow-sm"
              type="text"
              value={guestCountry}
              onChange={(event) => setGuestCountry(event.target.value)}
              placeholder={t("placeholder_country")}
              list="profile-guest-country-options"
              aria-invalid={Boolean(guestErrors.country)}
            />
            <FieldMeta errorText={guestErrors.country ? t(guestErrors.country) : ""} />
          </label>
          <label>
            <span className="block mb-1.5 text-[10px] font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">
              <Icon name="location" className="icon icon-sm" />
              {t("field_address")}
            </span>
            <input className="w-full px-4 py-2.5 bg-white/50 dark:bg-black/20 border border-black/5 dark:border-white/10 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 rounded-xl text-sm text-gray-900 dark:text-white transition-all shadow-sm"
              type="text"
              value={guestAdvanced.address}
              onChange={(event) => {
                setGuestAdvancedField("address", event.target.value);
                if (
                  selectedGuestAddressPlace &&
                  normalizeLookupValue(event.target.value) !==
                  normalizeLookupValue(selectedGuestAddressPlace.formattedAddress)
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
              <ul className="prediction-list" role="listbox" aria-label={t("address_suggestions")}>
                {isGuestAddressLoading ? <li className="prediction-item hint">{t("address_searching")}</li> : null}
                {!isGuestAddressLoading && guestAddressPredictions.length === 0 ? (
                  <li className="prediction-item hint">{t("address_no_matches")}</li>
                ) : null}
                {guestAddressPredictions.map((prediction) => (
                  <li key={prediction.place_id}>
                    <button
                      type="button"
                      className="prediction-item"
                      onClick={() => handleSelectGuestAddressPrediction(prediction)}
                    >
                      <Icon name="location" className="icon icon-sm" />
                      {prediction.description}
                    </button>
                  </li>
                ))}
              </ul>
            ) : null}
            {selectedGuestAddressPlace?.placeId ? <p className="field-success">{t("address_validated")}</p> : null}
          </label>

          <datalist id="profile-guest-relationship-options">
            {relationshipOptions.map((optionValue) => (
              <option key={optionValue} value={optionValue} />
            ))}
          </datalist>
          <datalist id="profile-guest-city-options">
            {cityOptions.map((optionValue) => (
              <option key={optionValue} value={optionValue} />
            ))}
          </datalist>
          <datalist id="profile-guest-country-options">
            {countryOptions.map((optionValue) => (
              <option key={optionValue} value={optionValue} />
            ))}
          </datalist>

          <div className="button-row">
            <button className="btn rounded-xl" type="submit" disabled={isSavingGuest}>
              {isSavingGuest
                ? isEditingGuest
                  ? t("updating_guest")
                  : t("saving_guest")
                : isEditingGuest
                  ? t("update_guest")
                  : t("save_guest")}
            </button>
            <button className="btn btn-ghost rounded-xl" type="button" onClick={syncHostGuestProfileForm}>
              {t("host_profile_guest_sync")}
            </button>
            {isProfileGuestLinked ? (
              <button
                className="btn btn-ghost rounded-xl"
                type="button"
                onClick={() => openGuestAdvancedEditor(profileLinkedGuestId)}
              >
                {t("host_profile_open_advanced_action")}
              </button>
            ) : null}
            {isProfileGuestLinked ? (
              <button className="btn btn-ghost rounded-xl" type="button" onClick={() => openGuestDetail(profileLinkedGuestId)}>
                {t("view_guest_detail_action")}
              </button>
            ) : null}
          </div>
          <FieldMeta helpText={t("host_profile_guest_save_hint")} />
          <InlineMessage text={guestMessage} />
        </form>
      </div>
    </section>
  );
}
