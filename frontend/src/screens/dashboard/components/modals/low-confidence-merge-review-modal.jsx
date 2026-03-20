export function LowConfidenceMergeReviewModal({
  t,
  pendingImportMergeApprovalItem,
  handleCloseLowConfidenceMergeReview,
  interpolateText,
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
  pendingImportMergeSelectedFieldKeys
}) {
  if (!pendingImportMergeApprovalItem) {
    return null;
  }

  return (
    <div className="fixed inset-0 bg-black/55 grid place-items-center z-[25] p-4" onClick={handleCloseLowConfidenceMergeReview}>
      <section
        className="w-full max-w-[620px] max-h-[90vh] overflow-auto bg-blue-50/40 dark:bg-gray-900/70 backdrop-blur-2xl border border-white/70 dark:border-white/10 shadow-[0_4px_16px_-4px_rgba(59,130,246,0.05)] rounded-2xl p-6 grid gap-3"
        role="dialog"
        aria-modal="true"
        aria-labelledby="import-merge-review-title"
        onClick={(event) => event.stopPropagation()}
      >
        <h3 id="import-merge-review-title" className="text-base font-bold text-gray-900 dark:text-white">
          {t("contact_import_merge_review_title")}
        </h3>
        <p className="text-sm text-gray-600 dark:text-gray-400">{t("contact_import_merge_review_hint")}</p>
        <div className="flex flex-wrap gap-2">
          <span className="px-2 py-0.5 rounded-lg text-[9px] font-bold uppercase tracking-wider border shadow-sm bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-900/20 dark:text-amber-300 dark:border-amber-800/50">
            {t("contact_import_match_reason_label")}: {pendingImportMergeApprovalItem.duplicateReasonLabel || "—"}
          </span>
          <span className="px-2 py-0.5 rounded-lg text-[9px] font-bold uppercase tracking-wider border shadow-sm bg-yellow-50 text-yellow-700 border-yellow-200 dark:bg-yellow-900/20 dark:text-yellow-300 dark:border-yellow-800/50">
            {t("contact_import_merge_confidence_label")}:{" "}
            {t(`contact_import_merge_confidence_${pendingImportMergeApprovalItem.duplicateMergeConfidence || "low"}`)}
          </span>
        </div>
        <p className="text-sm text-gray-600 dark:text-gray-400">
          {interpolateText(t("contact_import_merge_review_summary"), { count: pendingImportMergeWillFillCount })}
        </p>
        <div className="flex flex-col gap-2">
          <span className="text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">{t("contact_import_merge_review_filter_label")}</span>
          <div className="inline-flex items-center p-1 rounded-xl border border-black/10 dark:border-white/10 bg-white/50 dark:bg-black/30 backdrop-blur-md gap-1" role="group" aria-label={t("contact_import_merge_review_filter_label")}>
            <button
              className={`px-4 py-2 text-sm font-bold rounded-lg transition-colors ${importMergeReviewShowOnlyWillFill ? "bg-blue-600 text-white" : "text-gray-700 dark:text-gray-300 hover:bg-black/5 dark:hover:bg-white/10"}`}
              type="button"
              onClick={() => setImportMergeReviewShowOnlyWillFill(true)}
            >
              {t("contact_import_merge_review_filter_fill_only")}
            </button>
            <button
              className={`px-4 py-2 text-sm font-bold rounded-lg transition-colors ${!importMergeReviewShowOnlyWillFill ? "bg-blue-600 text-white" : "text-gray-700 dark:text-gray-300 hover:bg-black/5 dark:hover:bg-white/10"}`}
              type="button"
              onClick={() => setImportMergeReviewShowOnlyWillFill(false)}
            >
              {t("contact_import_merge_review_filter_all")}
            </button>
          </div>
          <span className="text-xs text-gray-500 dark:text-gray-400">
            {interpolateText(t("contact_import_merge_review_visible"), {
              visible: pendingImportMergeVisibleCount,
              total: pendingImportMergeTotalCount
            })}
          </span>
        </div>
        <div className="overflow-x-auto -mx-2 px-2">
          <table className="w-full text-left border-collapse text-sm">
            <thead>
              <tr className="border-b border-black/10 dark:border-white/10">
                <th className="py-2 px-2 text-[10px] font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">{t("contact_import_merge_review_apply")}</th>
                <th className="py-2 px-2 text-[10px] font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">{t("contact_import_merge_review_field")}</th>
                <th className="py-2 px-2 text-[10px] font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">{t("contact_import_merge_review_source")}</th>
                <th className="py-2 px-2 text-[10px] font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">{t("contact_import_merge_review_target")}</th>
                <th className="py-2 px-2 text-[10px] font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">{t("contact_import_merge_review_result")}</th>
              </tr>
            </thead>
            <tbody>
              {pendingImportMergeVisibleRows.map((rowItem) => (
                <tr
                  key={`merge-review-${rowItem.label}`}
                  className={`border-b border-black/5 dark:border-white/5 ${rowItem.willFill ? "bg-blue-50/30 dark:bg-blue-900/10" : ""}`}
                >
                  <td className="py-2 px-2">
                    <input
                      type="checkbox"
                      className="rounded border-gray-300 dark:border-gray-600 text-blue-600 focus:ring-blue-500"
                      checked={pendingImportMergeSelectedFieldKeysSet.has(rowItem.fieldKey)}
                      disabled={!rowItem.willFill}
                      onChange={() => handleTogglePendingImportMergeFieldKey(rowItem.fieldKey)}
                    />
                  </td>
                  <th className="py-2 px-2 text-xs font-medium text-gray-900 dark:text-white">{rowItem.label}</th>
                  <td className="py-2 px-2 text-xs text-gray-600 dark:text-gray-400">{formatMergeReviewValue(rowItem.source)}</td>
                  <td className="py-2 px-2 text-xs text-gray-600 dark:text-gray-400">{formatMergeReviewValue(rowItem.target)}</td>
                  <td className="py-2 px-2">
                    <span className={`px-2 py-0.5 rounded-lg text-[9px] font-bold uppercase tracking-wider border shadow-sm ${
                      rowItem.mergeResultKey === "fill" ? "bg-green-50 text-green-700 border-green-200 dark:bg-green-900/20 dark:text-green-300 dark:border-green-800/50"
                      : rowItem.mergeResultKey === "overwrite" ? "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-900/20 dark:text-amber-300 dark:border-amber-800/50"
                      : "bg-gray-50 text-gray-600 border-gray-200 dark:bg-gray-800 dark:text-gray-400 dark:border-gray-700"
                    }`}>
                      {t(`contact_import_merge_review_result_${rowItem.mergeResultKey}`)}
                    </span>
                  </td>
                </tr>
              ))}
              {pendingImportMergeVisibleRows.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-sm text-gray-500 dark:text-gray-400">
                    {t("contact_import_merge_review_no_rows")}
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
        <div className="flex items-center justify-end gap-3 pt-2 border-t border-black/5 dark:border-white/10">
          <button
            className="px-4 py-2 text-sm font-bold text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 border border-black/10 dark:border-white/10 rounded-xl shadow-sm hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
            type="button"
            onClick={handleCloseLowConfidenceMergeReview}
          >
            {t("cancel_action")}
          </button>
          <button
            className="px-5 py-2 text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-md shadow-blue-500/20 transition-all disabled:opacity-50"
            type="button"
            onClick={handleConfirmLowConfidenceMergeReview}
            disabled={pendingImportMergeSelectableCount > 0 && pendingImportMergeSelectedFieldKeys.length === 0}
          >
            {t("contact_import_merge_approve_contact")}
          </button>
        </div>
      </section>
    </div>
  );
}
