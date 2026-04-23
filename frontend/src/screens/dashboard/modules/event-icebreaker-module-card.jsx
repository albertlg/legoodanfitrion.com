import React from "react";
import { Icon } from "../../../components/icons";

export function EventIcebreakerModuleCard({
  t,
  isIcebreakerLoading,
  handleGenerateEventIcebreaker,
  hasIcebreakerData,
  handleOpenEventIcebreakerPanel
}) {
  const primaryButtonClass =
    "inline-flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-semibold px-4 py-2.5 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-sm disabled:opacity-70 disabled:cursor-not-allowed";
  const secondaryButtonClass =
    "inline-flex items-center justify-center gap-2 bg-white border border-gray-200 text-gray-700 hover:bg-gray-50 rounded-xl font-semibold px-4 py-2.5 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-sm dark:bg-gray-800 dark:border-gray-700 dark:text-gray-200 dark:hover:bg-gray-700";

  return (
    <article className="order-3 bg-indigo-50/50 dark:bg-indigo-900/10 backdrop-blur-md rounded-xl border border-indigo-100 dark:border-indigo-800/50 ring-1 ring-black/5 dark:ring-white/10 shadow-sm overflow-hidden relative p-5 flex flex-col gap-3 transition-all duration-300 hover:-translate-y-1 hover:shadow-md">
      <div className="pointer-events-none absolute top-0 left-0 right-0 h-0.5 rounded-t-xl bg-gradient-to-r from-indigo-600 via-purple-500 to-pink-500 dark:from-indigo-400 dark:via-purple-400 dark:to-pink-400 z-10" />
      <div className="flex items-start gap-3">
        <div className="flex items-center gap-2">
          <span className="inline-flex w-8 h-8 items-center justify-center rounded-xl bg-indigo-100 dark:bg-indigo-900/40 border border-indigo-200 dark:border-indigo-700">
            <Icon name="sparkle" className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
          </span>
          <p className="text-lg font-bold text-gray-900 dark:text-white">
            {t("event_icebreaker_title")}
          </p>
        </div>
      </div>
      <p className="text-xs text-gray-700 dark:text-gray-300 leading-relaxed">{t("event_icebreaker_hint")}</p>
      <div className="grid grid-cols-1 gap-2">
        <button
          className={`${primaryButtonClass} text-xs w-full`}
          type="button"
          onClick={() => handleGenerateEventIcebreaker?.()}
          disabled={isIcebreakerLoading}
        >
          <Icon name={isIcebreakerLoading ? "clock" : "sparkle"} className={`w-4 h-4 ${isIcebreakerLoading ? "animate-pulse" : ""}`} />
          <span>{isIcebreakerLoading ? t("event_icebreaker_loading_label") : t("event_icebreaker_action_generate")}</span>
        </button>
        {hasIcebreakerData ? (
          <button
            className={`${secondaryButtonClass} text-xs w-full`}
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
