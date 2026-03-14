export function GlobalShareConfirmModal({
  t,
  pendingGlobalShareSave,
  setPendingGlobalShareSave,
  pendingGlobalSharePreset,
  pendingGlobalShareScopes,
  savingGlobalShareHostId,
  handleConfirmSaveGlobalShare
}) {
  if (!pendingGlobalShareSave) {
    return null;
  }

  return (
    <div className="confirm-overlay" onClick={() => setPendingGlobalShareSave(null)}>
      <section
        className="confirm-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="confirm-share-title"
        onClick={(event) => event.stopPropagation()}
      >
        <h3 id="confirm-share-title" className="item-title">
          {t("global_profile_share_confirm_title")}
        </h3>
        <p className="item-meta">{t("global_profile_share_confirm_hint")}</p>
        <p className="hint">
          {t("global_profile_share_confirm_target")}: {pendingGlobalShareSave.hostName}
        </p>
        <p className="hint">
          {t("global_profile_share_confirm_level")}:{" "}
          {pendingGlobalSharePreset === "basic"
            ? t("global_profile_share_preset_basic")
            : pendingGlobalSharePreset === "custom"
              ? t("global_profile_share_preset_custom")
              : t("global_profile_share_preset_private")}
        </p>
        <p className="hint">{t("global_profile_share_confirm_scopes")}</p>
        <div className="profile-summary-signals">
          {pendingGlobalShareScopes.length > 0 ? (
            pendingGlobalShareScopes.map((scopeLabel) => (
              <span key={`pending-share-${scopeLabel}`} className="status-pill status-yes">
                {scopeLabel}
              </span>
            ))
          ) : (
            <span className="status-pill status-draft">{t("global_profile_share_confirm_scopes_none")}</span>
          )}
        </div>
        <div className="button-row">
          <button
            className="btn btn-ghost"
            type="button"
            onClick={() => setPendingGlobalShareSave(null)}
            disabled={savingGlobalShareHostId === pendingGlobalShareSave.hostUserId}
          >
            {t("cancel_action")}
          </button>
          <button
            className="btn"
            type="button"
            onClick={handleConfirmSaveGlobalShare}
            disabled={savingGlobalShareHostId === pendingGlobalShareSave.hostUserId}
          >
            {savingGlobalShareHostId === pendingGlobalShareSave.hostUserId
              ? t("global_profile_share_confirm_saving")
              : t("global_profile_share_confirm_apply")}
          </button>
        </div>
      </section>
    </div>
  );
}
