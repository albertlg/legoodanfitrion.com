import { Icon } from "../../../../components/icons";

export function DeleteConfirmModal({
  t,
  deleteTarget,
  setDeleteTarget,
  isDeleteConfirmLoading,
  handleConfirmDelete
}) {
  if (!deleteTarget) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div className="fixed inset-0 bg-black/40 backdrop-blur-sm transition-opacity" aria-hidden="true"></div>

      <section
        className="relative z-10 w-full max-w-lg bg-white/95 dark:bg-gray-900/95 border border-black/10 dark:border-white/10 rounded-3xl shadow-2xl p-7 animate-in fade-in-0 zoom-in-95 duration-200"
        role="dialog"
        aria-modal="true"
        aria-labelledby="confirm-delete-title"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-start gap-4 pb-5 mb-5 border-b border-black/5 dark:border-white/5">
          <div className="shrink-0 p-3 bg-red-100 dark:bg-red-900/30 rounded-2xl mt-1">
            <Icon name="trash" className="w-6 h-6 text-red-600 dark:text-red-400" />
          </div>
          <div className="flex flex-col gap-1.5">
            <h3 id="confirm-delete-title" className="text-xl font-black text-gray-900 dark:text-white tracking-tight">
              {deleteTarget.type === "event"
                ? t("delete_event_title")
                : deleteTarget.type === "guest"
                  ? t("delete_guest_title")
                  : t("delete_invitation_title")}
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-300 font-medium leading-relaxed">
              {deleteTarget.type === "event"
                ? t("delete_event_confirm")
                : deleteTarget.type === "guest"
                  ? t("delete_guest_confirm")
                  : t("delete_invitation_confirm")}
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 bg-black/5 dark:bg-white/5 py-2 px-3 rounded-lg border border-black/5 dark:border-white/5">
              <span className="uppercase tracking-wider font-bold mr-1">{t("selected_item")}:</span>{" "}
              <span className="font-semibold text-gray-900 dark:text-white">
                {deleteTarget.type === "event"
                  ? deleteTarget.item?.title || "-"
                  : deleteTarget.type === "guest"
                    ? `${deleteTarget.item?.first_name || ""} ${deleteTarget.item?.last_name || ""}`.trim() || "-"
                    : deleteTarget.itemLabel || "-"}
              </span>
            </p>
          </div>
        </div>

        <div className="flex items-center justify-end gap-3.5 pt-2">
          <button
            className="px-6 py-2.5 rounded-xl text-sm font-bold text-gray-700 dark:text-gray-300 bg-white/60 dark:bg-black/20 hover:bg-black/5 dark:hover:bg-white/5 border border-black/5 dark:border-white/5 hover:border-black/10 dark:hover:border-white/10 transition-all active:scale-95 disabled:opacity-50 outline-none focus:ring-2 focus:ring-gray-500/50"
            type="button"
            onClick={() => setDeleteTarget(null)}
            disabled={isDeleteConfirmLoading}
          >
            {t("cancel_action")}
          </button>
          <button
            className="px-6 py-2.5 rounded-xl text-sm font-bold bg-red-600 hover:bg-red-700 text-white shadow-md shadow-red-500/20 active:scale-95 transition-all disabled:opacity-50 disabled:active:scale-100 outline-none focus:ring-2 focus:ring-red-500/50 flex items-center justify-center min-w-[120px]"
            type="button"
            onClick={handleConfirmDelete}
            disabled={isDeleteConfirmLoading}
          >
            {isDeleteConfirmLoading ? (
              <span className="flex items-center gap-2">
                <Icon name="loader" className="w-4 h-4 animate-spin" />
                {t("deleting")}
              </span>
            ) : t("confirm_delete")}
          </button>
        </div>
      </section>
    </div>
  );
}
