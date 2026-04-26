import React from "react";
import { Icon } from "../../../components/icons";

const CTA_CONFIG = {
  megaphone:     { icon: "bell",     colorClass: "bg-blue-600 hover:bg-blue-700",    tabTarget: "communication" },
  accommodation: { icon: "home",     colorClass: "bg-teal-600 hover:bg-teal-700",    tabTarget: null },
  transport:     { icon: "activity", colorClass: "bg-indigo-600 hover:bg-indigo-700", tabTarget: "timings" },
  finance:       { icon: "trend",    colorClass: "bg-green-600 hover:bg-green-700",  tabTarget: null },
  spotify:       { icon: "sparkle",  colorClass: "bg-purple-600 hover:bg-purple-700", tabTarget: null }
};

const CTA_I18N = {
  megaphone:     { label: "plan_cta_publish_megaphone",    hint: "plan_cta_publish_megaphone_hint" },
  accommodation: { label: "plan_cta_book_hotel",           hint: "plan_cta_book_hotel_hint" },
  transport:     { label: "plan_cta_coordinate_transport", hint: "plan_cta_coordinate_transport_hint" },
  finance:       { label: "plan_cta_review_budget",        hint: "plan_cta_review_budget_hint" },
  spotify:       { label: "plan_cta_manage_playlist",      hint: "plan_cta_manage_playlist_hint" }
};

export function PlanActionableCards({ t, interpolateText, ctas = [], handleEventPlannerTabChange }) {
  if (ctas.length === 0) return null;

  const sorted = [...ctas].sort((a, b) => (a.priority ?? 99) - (b.priority ?? 99));

  return (
    <div className="flex flex-col gap-3">
      <p className="text-[10px] font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">
        {t("plan_overview_actions_title")}
      </p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {sorted.map((cta) => {
          const config = CTA_CONFIG[cta.type];
          const i18n = CTA_I18N[cta.type];
          if (!config || !i18n) return null;

          const hintText = interpolateText(t(i18n.hint), {
            count: cta.meta?.needsCount ?? Object.values(cta.meta?.modes ?? {}).reduce((s, v) => s + v, 0)
          });

          return (
            <article
              key={cta.type}
              className="bg-white/60 dark:bg-white/5 rounded-xl border border-black/5 dark:border-white/10 p-4 shadow-sm flex items-center justify-between gap-3"
            >
              <div className="flex items-start gap-3 min-w-0">
                <div className={`w-8 h-8 rounded-lg ${config.colorClass} flex items-center justify-center shrink-0`}>
                  <Icon name={config.icon} className="w-4 h-4 text-white" />
                </div>
                <div className="flex flex-col gap-0.5 min-w-0">
                  <p className="text-sm font-bold text-gray-900 dark:text-white truncate">{t(i18n.label)}</p>
                  <p className="text-[11px] text-gray-500 dark:text-gray-400 leading-snug">{hintText}</p>
                </div>
              </div>
              {config.tabTarget ? (
                <button
                  type="button"
                  className={`shrink-0 ${config.colorClass} text-white font-bold py-1.5 px-3 rounded-lg text-[10px] transition-colors shadow-sm`}
                  onClick={() => handleEventPlannerTabChange(config.tabTarget)}
                >
                  {t("plan_cta_action_button")}
                </button>
              ) : null}
            </article>
          );
        })}
      </div>
    </div>
  );
}
