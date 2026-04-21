import React from "react";
import { Icon } from "../../../components/icons";

export function EventIcebreakerModuleCard({
  t,
  isIcebreakerLoading,
  handleGenerateEventIcebreaker,
  hasIcebreakerData,
  handleOpenEventIcebreakerPanel
}) {
  return (
    <article className="order-3 bg-indigo-50/50 dark:bg-indigo-900/10 rounded-xl border border-indigo-100 dark:border-indigo-800/50 shadow-sm overflow-hidden relative p-5 flex flex-col gap-3">
      <div className="pointer-events-none absolute top-0 left-0 right-0 h-0.5 rounded-t-xl bg-gradient-to-r from-indigo-600 via-purple-500 to-pink-500 dark:from-indigo-400 dark:via-purple-400 dark:to-pink-400 z-10" />
      <div className="flex items-start gap-3">
        <div className="flex items-center gap-2">
          <span className="inline-flex w-8 h-8 items-center justify-center rounded-xl bg-indigo-100 dark:bg-indigo-900/40 border border-indigo-200 dark:border-indigo-700">
            <Icon name="sparkle" className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
          </span>
          <p className="text-sm font-black tracking-wide bg-clip-text text-transparent bg-gradient-to-r from-indigo-600 to-purple-600 dark:from-indigo-400 dark:to-purple-400">
            {t("event_icebreaker_title")}
          </p>
        </div>
      </div>
      <p className="text-xs text-gray-700 dark:text-gray-300 leading-relaxed">{t("event_icebreaker_hint")}</p>
      <div className="grid grid-cols-1 gap-2">
        <button
          className="bg-indigo-600 text-white hover:bg-indigo-700 font-black py-2.5 px-4 rounded-xl transition-all text-xs shadow-sm w-full inline-flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed"
          type="button"
          onClick={() => handleGenerateEventIcebreaker?.()}
          disabled={isIcebreakerLoading}
        >
          <Icon name={isIcebreakerLoading ? "clock" : "sparkle"} className={`w-4 h-4 ${isIcebreakerLoading ? "animate-pulse" : ""}`} />
          <span>{isIcebreakerLoading ? t("event_icebreaker_loading_label") : t("event_icebreaker_action_generate")}</span>
        </button>
        {hasIcebreakerData ? (
          <button
            className="bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 border border-gray-200 dark:border-gray-700 text-gray-800 dark:text-gray-200 font-black py-2.5 px-4 rounded-xl transition-all text-xs shadow-sm w-full inline-flex items-center justify-center gap-2"
            type="button"
            onClick={() => handleOpenEventIcebreakerPanel?.()}
          >
            <Icon name="eye" className="w-4 h-4" />
            <span>{t("event_icebreaker_action_open")}</span>
          </button>
        ) : null}
      </div>
    </article>
  );
}
