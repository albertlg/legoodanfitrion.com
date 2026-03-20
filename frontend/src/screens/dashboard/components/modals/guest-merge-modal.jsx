import { AvatarCircle } from "../../../../components/avatar-circle";
import { Icon } from "../../../../components/icons";

export function GuestMergeModal({
  t,
  guestMergeSource,
  handleCloseMergeGuest,
  guestMergeSearch,
  setGuestMergeSearch,
  guestMergeTargetId,
  setGuestMergeTargetId,
  guestMergeCandidates,
  isMergingGuest,
  handleConfirmMergeGuest
}) {
  if (!guestMergeSource) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div className="fixed inset-0 bg-black/40 backdrop-blur-sm transition-opacity" onClick={handleCloseMergeGuest} aria-hidden="true"></div>

      <section
        className="relative z-10 w-full max-w-2xl bg-white/95 dark:bg-gray-900/95 border border-black/10 dark:border-white/10 rounded-3xl shadow-2xl p-7 flex flex-col max-h-[90vh] animate-in fade-in-0 zoom-in-95 duration-200"
        role="dialog"
        aria-modal="true"
        aria-labelledby="merge-guest-title"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-center justify-between gap-4 pb-5 mb-5 border-b border-black/5 dark:border-white/5 shrink-0">
          <div className="flex flex-col gap-1">
            <h3 id="merge-guest-title" className="text-xl font-black text-gray-900 dark:text-white tracking-tight">
              {t("merge_guest_title")}
            </h3>
            <p className="text-sm font-medium text-gray-700 dark:text-gray-200 leading-relaxed">
              {t("merge_guest_hint")}
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              {t("merge_guest_source_label")}:{" "}
              <span className="font-bold text-gray-900 dark:text-white">
                {`${guestMergeSource.first_name || ""} ${guestMergeSource.last_name || ""}`.trim() || t("field_guest")}
              </span>
            </p>
          </div>
          <button
            onClick={handleCloseMergeGuest}
            className="p-1.5 -mr-1.5 -mt-6 text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white rounded-lg hover:bg-black/5 dark:hover:bg-white/5 transition-colors outline-none focus:ring-2 focus:ring-blue-500/50"
            aria-label={t("cancel_action")}
          >
            <Icon name="close" className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto space-y-6 min-h-0 pr-1 scrollbar-thin">
          <label className="flex flex-col gap-1.5">
            <span className="text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400 pl-1">{t("search")}</span>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Icon name="search" className="w-4 h-4 text-gray-500" />
              </div>
              <input
                type="search"
                className="w-full pl-9 pr-4 py-3 rounded-xl border border-black/10 dark:border-white/10 bg-white/60 dark:bg-black/20 text-sm focus:border-blue-500 focus:ring-blue-500/50 outline-none transition-all text-gray-900 dark:text-white"
                value={guestMergeSearch}
                onChange={(event) => setGuestMergeSearch(event.target.value)}
                placeholder={t("merge_guest_search_placeholder")}
              />
            </div>
          </label>

          <label className="flex flex-col gap-1.5">
            <span className="text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400 pl-1">
              {t("merge_guest_target_label")}
            </span>
            <select
              className="w-full px-4 py-3 rounded-xl border border-black/10 dark:border-white/10 bg-white/60 dark:bg-black/20 text-sm focus:border-blue-500 focus:ring-blue-500/50 outline-none transition-all text-gray-900 dark:text-white disabled:opacity-50 appearance-none cursor-pointer"
              value={guestMergeTargetId}
              onChange={(event) => setGuestMergeTargetId(event.target.value)}
              disabled={guestMergeCandidates.length === 0}
            >
              {guestMergeCandidates.length === 0 ? (
                <option value="">{t("merge_guest_no_candidates")}</option>
              ) : null}
              {guestMergeCandidates.map((guestItem) => (
                <option key={guestItem.id} value={guestItem.id} className="text-gray-900 dark:bg-gray-800 dark:text-white">
                  {`${guestItem.first_name || ""} ${guestItem.last_name || ""}`.trim() || t("field_guest")}
                </option>
              ))}
            </select>
          </label>

          {guestMergeCandidates.length > 0 ? (
            <div className="border border-black/5 dark:border-white/10 rounded-2xl overflow-hidden bg-black/5 dark:bg-white/5" role="list">
              <ul className="divide-y divide-black/5 dark:divide-white/5">
                {guestMergeCandidates.slice(0, 8).map((guestItem) => {
                  const guestName = `${guestItem.first_name || ""} ${guestItem.last_name || ""}`.trim() || t("field_guest");
                  const isActive = guestMergeTargetId === guestItem.id;
                  return (
                    <li key={`merge-candidate-${guestItem.id}`}>
                      <button
                        className={`w-full flex items-center gap-3 p-4 text-left transition-colors cursor-pointer group outline-none focus:bg-blue-50 dark:focus:bg-blue-900/20 ${
                          isActive ? "bg-blue-50/50 dark:bg-blue-900/20" : "bg-white/70 hover:bg-white dark:bg-black/20 dark:hover:bg-white/5"
                        }`}
                        type="button"
                        onClick={() => setGuestMergeTargetId(guestItem.id)}
                        aria-pressed={isActive}
                      >
                        <AvatarCircle
                          size={36}
                          label={guestName}
                          fallback={guestName.charAt(0)}
                          className={`shrink-0 transition-transform ${
                            isActive ? "ring-2 ring-blue-500 ring-offset-1 dark:ring-offset-gray-900" : "group-hover:scale-105"
                          }`}
                        />
                        <div className="flex-1 min-w-0">
                          <span className={`block text-sm font-bold truncate ${isActive ? "text-blue-700 dark:text-blue-400" : "text-gray-900 dark:text-white"}`}>
                            {guestName}
                          </span>
                          <span className={`block text-xs truncate mt-0.5 ${isActive ? "text-blue-600/70 dark:text-blue-300/70" : "text-gray-500 dark:text-gray-400"}`}>
                            {[guestItem.email, guestItem.phone].filter(Boolean).join(" · ") || "—"}
                          </span>
                        </div>
                        <div
                          className={`shrink-0 p-1.5 rounded-full border transition-colors ${
                            isActive ? "border-blue-500 bg-blue-500 text-white" : "border-black/10 dark:border-white/10 group-hover:border-blue-500/50 text-transparent"
                          }`}
                        >
                          {isActive ? <Icon name="check" className="w-3.5 h-3.5" /> : <div className="w-3.5 h-3.5 rounded-full" />}
                        </div>
                      </button>
                    </li>
                  );
                })}
              </ul>
            </div>
          ) : null}
        </div>

        <div className="flex items-center justify-end gap-3.5 pt-5 mt-5 border-t border-black/5 dark:border-white/5 shrink-0">
          <button
            className="px-6 py-2.5 rounded-xl text-sm font-bold text-gray-700 dark:text-gray-300 bg-white/60 dark:bg-black/20 hover:bg-black/5 dark:hover:bg-white/5 border border-black/5 dark:border-white/5 hover:border-black/10 dark:hover:border-white/10 transition-all active:scale-95 disabled:opacity-50 outline-none focus:ring-2 focus:ring-blue-500/50"
            type="button"
            onClick={handleCloseMergeGuest}
            disabled={isMergingGuest}
          >
            {t("cancel_action")}
          </button>
          <button
            className="px-6 py-2.5 rounded-xl text-sm font-bold bg-blue-600 hover:bg-blue-700 text-white shadow-md shadow-blue-500/20 active:scale-95 transition-all disabled:opacity-50 disabled:active:scale-100 outline-none focus:ring-2 focus:ring-blue-500/50 flex items-center justify-center min-w-[140px]"
            type="button"
            onClick={handleConfirmMergeGuest}
            disabled={isMergingGuest || !guestMergeTargetId}
          >
            {isMergingGuest ? (
              <span className="flex items-center gap-2">
                <Icon name="loader" className="w-4 h-4 animate-spin" />
                {t("guest_merging")}
              </span>
            ) : t("merge_guest_confirm")}
          </button>
        </div>
      </section>
    </div>
  );
}
