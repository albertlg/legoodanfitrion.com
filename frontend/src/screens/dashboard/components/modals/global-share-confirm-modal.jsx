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
    <div className="fixed inset-0 bg-black/55 grid place-items-center z-[25] p-4" onClick={() => setPendingGlobalShareSave(null)}>
      <section
        className="w-full max-w-[520px] bg-blue-50/40 dark:bg-gray-900/70 backdrop-blur-2xl border border-white/70 dark:border-white/10 shadow-[0_4px_16px_-4px_rgba(59,130,246,0.05)] rounded-2xl p-6 grid gap-3"
        role="dialog"
        aria-modal="true"
        aria-labelledby="confirm-share-title"
        onClick={(event) => event.stopPropagation()}
      >
        <h3 id="confirm-share-title" className="text-base font-bold text-gray-900 dark:text-white">
          {t("global_profile_share_confirm_title")}
        </h3>
        <p className="text-sm text-gray-600 dark:text-gray-400">{t("global_profile_share_confirm_hint")}</p>
        <p className="text-xs text-gray-500 dark:text-gray-400">
          {t("global_profile_share_confirm_target")}: {pendingGlobalShareSave.hostName}
        </p>
        <p className="text-xs text-gray-500 dark:text-gray-400">
          {t("global_profile_share_confirm_level")}:{" "}
          {pendingGlobalSharePreset === "basic"
            ? t("global_profile_share_preset_basic")
            : pendingGlobalSharePreset === "custom"
              ? t("global_profile_share_preset_custom")
              : t("global_profile_share_preset_private")}
        </p>
        <p className="text-xs text-gray-500 dark:text-gray-400">{t("global_profile_share_confirm_scopes")}</p>
        <div className="flex flex-wrap gap-1.5">
          {pendingGlobalShareScopes.length > 0 ? (
            pendingGlobalShareScopes.map((scopeLabel) => (
              <span key={`pending-share-${scopeLabel}`} className="px-2 py-0.5 rounded-lg text-[9px] font-bold uppercase tracking-wider border shadow-sm bg-green-50 text-green-700 border-green-200 dark:bg-green-900/20 dark:text-green-300 dark:border-green-800/50">
                {scopeLabel}
              </span>
            ))
          ) : (
            <span className="px-2 py-0.5 rounded-lg text-[9px] font-bold uppercase tracking-wider border shadow-sm bg-gray-50 text-gray-600 border-gray-200 dark:bg-gray-800 dark:text-gray-400 dark:border-gray-700">{t("global_profile_share_confirm_scopes_none")}</span>
          )}
        </div>
        <div className="flex items-center justify-end gap-3 pt-2 border-t border-black/5 dark:border-white/10">
          <button
            className="px-4 py-2 text-sm font-bold text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 border border-black/10 dark:border-white/10 rounded-xl shadow-sm hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors disabled:opacity-50"
            type="button"
            onClick={() => setPendingGlobalShareSave(null)}
            disabled={savingGlobalShareHostId === pendingGlobalShareSave.hostUserId}
          >
            {t("cancel_action")}
          </button>
          <button
            className="px-5 py-2 text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-md shadow-blue-500/20 transition-all disabled:opacity-50"
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
