import React from "react";
import { Icon } from "../../../components/icons";
import { InlineMessage } from "../../../components/inline-message";

function toSafeKey(value) {
  return String(value || "").trim();
}

export function EventModulesManagerModal({
  t,
  isOpen,
  onClose,
  moduleToggleConfig,
  localToggles,
  handleToggle,
  handleSaveEventModules,
  isSavingEventModules,
  eventModulesFeedback,
  eventModulesFeedbackType
}) {
  if (!isOpen) {
    return null;
  }

  const toggleRows = Array.isArray(moduleToggleConfig) ? moduleToggleConfig : [];

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center overflow-y-auto bg-black/55 backdrop-blur-sm p-4 sm:p-6">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="event-modules-modal-title"
        className="w-full max-w-2xl bg-white/95 dark:bg-gray-900/95 border border-black/10 dark:border-white/10 rounded-3xl shadow-sm p-5 sm:p-6 flex flex-col gap-4 max-h-[88vh] overflow-y-auto"
      >
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="inline-flex w-9 h-9 items-center justify-center rounded-xl bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-700/30">
              <Icon name="settings" className="w-4.5 h-4.5" />
            </span>
            <div className="flex flex-col">
              <h3 id="event-modules-modal-title" className="text-lg font-black text-gray-900 dark:text-white">
                {t("event_modules_section_title")}
              </h3>
              <p className="text-xs text-gray-500 dark:text-gray-400">{t("event_modules_section_hint")}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label={t("close_modal")}
            title={t("close_modal")}
            className="p-2 rounded-xl bg-black/5 hover:bg-black/10 dark:bg-white/10 dark:hover:bg-white/20 text-gray-600 dark:text-gray-300 transition-all duration-200 cursor-pointer"
          >
            <Icon name="close" className="w-5 h-5" />
          </button>
        </div>

        <div className="flex flex-col gap-3">
          {toggleRows.map((moduleToggle) => {
            const moduleKey = toSafeKey(moduleToggle.key);
            const toggleId = `event-module-toggle-modal-${moduleKey}`;
            const isEnabled = Boolean(localToggles?.[moduleKey]);

            return (
              <article
                key={moduleKey}
                className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 shadow-sm overflow-hidden p-3 flex flex-col gap-2"
              >
                <div className="flex items-start justify-between gap-3">
                  <label
                    htmlFor={toggleId}
                    className="flex flex-col gap-1 min-w-0 cursor-pointer transition-all duration-200"
                  >
                    <span className="text-sm font-bold text-gray-900 dark:text-white">{t(moduleToggle.labelKey)}</span>
                    <span className="text-xs text-gray-500 dark:text-gray-400">{t(moduleToggle.hintKey)}</span>
                  </label>
                  <input
                    id={toggleId}
                    type="checkbox"
                    checked={isEnabled}
                    onChange={(event) => {
                      handleToggle(moduleKey, event.target.checked);
                    }}
                    className="mt-0.5 h-5 w-5 rounded border-gray-300 dark:border-gray-600 text-indigo-600 focus:ring-indigo-500/40 bg-white dark:bg-gray-900 shrink-0 cursor-pointer transition-all duration-200"
                  />
                </div>

                {!isEnabled ? (
                  <div className="rounded-lg border border-dashed border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-900/40 shadow-sm p-2.5">
                    <p className="text-[11px] text-gray-500 dark:text-gray-400">{t(moduleToggle.hintKey)}</p>
                  </div>
                ) : null}
              </article>
            );
          })}
        </div>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-2 border-t border-black/5 dark:border-white/10">
          <div className="min-h-[20px]">
            {eventModulesFeedback ? <InlineMessage type={eventModulesFeedbackType} text={eventModulesFeedback} /> : null}
          </div>
          <div className="flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-black/10 dark:border-white/10 bg-white hover:bg-gray-50 dark:bg-gray-800 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-200 px-4 py-2.5 text-xs font-black transition-all duration-200 cursor-pointer"
            >
              {t("close_modal")}
            </button>
            <button
              type="button"
              onClick={handleSaveEventModules}
              disabled={isSavingEventModules}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2.5 text-xs font-black transition-all duration-200 cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
            >
              <Icon
                name={isSavingEventModules ? "loader" : "save"}
                className={`w-4 h-4 ${isSavingEventModules ? "animate-spin" : ""}`}
              />
              <span>{isSavingEventModules ? t("event_modules_saving") : t("event_modules_save_action")}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
