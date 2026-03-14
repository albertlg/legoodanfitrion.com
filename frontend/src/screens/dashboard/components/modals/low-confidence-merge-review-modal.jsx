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
    <div className="confirm-overlay" onClick={handleCloseLowConfidenceMergeReview}>
      <section
        className="confirm-dialog import-merge-review-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="import-merge-review-title"
        onClick={(event) => event.stopPropagation()}
      >
        <h3 id="import-merge-review-title" className="item-title">
          {t("contact_import_merge_review_title")}
        </h3>
        <p className="item-meta">{t("contact_import_merge_review_hint")}</p>
        <div className="import-merge-review-head">
          <span className="status-pill status-event-draft">
            {t("contact_import_match_reason_label")}: {pendingImportMergeApprovalItem.duplicateReasonLabel || "—"}
          </span>
          <span className="status-pill status-maybe">
            {t("contact_import_merge_confidence_label")}:{" "}
            {t(`contact_import_merge_confidence_${pendingImportMergeApprovalItem.duplicateMergeConfidence || "low"}`)}
          </span>
        </div>
        <p className="item-meta">
          {interpolateText(t("contact_import_merge_review_summary"), { count: pendingImportMergeWillFillCount })}
        </p>
        <div className="import-merge-review-filters">
          <span className="label-title">{t("contact_import_merge_review_filter_label")}</span>
          <div className="list-filter-tabs list-filter-tabs-segmented" role="group" aria-label={t("contact_import_merge_review_filter_label")}>
            <button
              className={`list-filter-tab ${importMergeReviewShowOnlyWillFill ? "active" : ""}`}
              type="button"
              onClick={() => setImportMergeReviewShowOnlyWillFill(true)}
            >
              {t("contact_import_merge_review_filter_fill_only")}
            </button>
            <button
              className={`list-filter-tab ${!importMergeReviewShowOnlyWillFill ? "active" : ""}`}
              type="button"
              onClick={() => setImportMergeReviewShowOnlyWillFill(false)}
            >
              {t("contact_import_merge_review_filter_all")}
            </button>
          </div>
          <span className="item-meta import-merge-review-visible">
            {interpolateText(t("contact_import_merge_review_visible"), {
              visible: pendingImportMergeVisibleCount,
              total: pendingImportMergeTotalCount
            })}
          </span>
        </div>
        <div className="import-merge-review-table-wrap">
          <table className="import-merge-review-table">
            <thead>
              <tr>
                <th>{t("contact_import_merge_review_apply")}</th>
                <th>{t("contact_import_merge_review_field")}</th>
                <th>{t("contact_import_merge_review_source")}</th>
                <th>{t("contact_import_merge_review_target")}</th>
                <th>{t("contact_import_merge_review_result")}</th>
              </tr>
            </thead>
            <tbody>
              {pendingImportMergeVisibleRows.map((rowItem) => (
                <tr
                  key={`merge-review-${rowItem.label}`}
                  className={rowItem.willFill ? "import-merge-review-row is-will-fill" : "import-merge-review-row"}
                >
                  <td className="import-merge-review-check">
                    <input
                      type="checkbox"
                      checked={pendingImportMergeSelectedFieldKeysSet.has(rowItem.fieldKey)}
                      disabled={!rowItem.willFill}
                      onChange={() => handleTogglePendingImportMergeFieldKey(rowItem.fieldKey)}
                    />
                  </td>
                  <th>{rowItem.label}</th>
                  <td>{formatMergeReviewValue(rowItem.source)}</td>
                  <td>{formatMergeReviewValue(rowItem.target)}</td>
                  <td>
                    <span className={`status-pill import-merge-review-result is-${rowItem.mergeResultKey}`}>
                      {t(`contact_import_merge_review_result_${rowItem.mergeResultKey}`)}
                    </span>
                  </td>
                </tr>
              ))}
              {pendingImportMergeVisibleRows.length === 0 ? (
                <tr>
                  <td colSpan={5} className="item-meta">
                    {t("contact_import_merge_review_no_rows")}
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
        <div className="button-row">
          <button className="btn btn-ghost" type="button" onClick={handleCloseLowConfidenceMergeReview}>
            {t("cancel_action")}
          </button>
          <button
            className="btn"
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
