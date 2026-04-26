import React from "react";
import { Icon } from "../../../components/icons";

export function PlanContextHeader({
  t,
  interpolateText,
  isProfessional,
  selectedEventDetailStatusCounts,
  selectedEventDietTypesCount,
  selectedEventRestrictionsCount,
  selectedEventMealPlan,
  selectedEventHostPlaybook
}) {
  const confirmedCount = selectedEventDetailStatusCounts?.yes ?? 0;
  const pendingCount = selectedEventDetailStatusCounts?.pending ?? 0;
  const acceptanceRate = selectedEventHostPlaybook?.acceptanceRate ?? "";
  const contextSummary = String(selectedEventMealPlan?.contextSummary || "");

  const kpiItems = [
    {
      value: confirmedCount,
      label: t("event_planner_stat_confirmed"),
      hint: interpolateText(t("event_planner_stat_hint_confirmed"), { count: pendingCount }),
      colorClass: "text-green-800 dark:text-green-300",
      labelClass: "text-green-600 dark:text-green-400",
      bgClass: "bg-green-50/60 dark:bg-green-900/10 border-green-100 dark:border-green-900/30",
      icon: "check"
    },
    {
      value: selectedEventDietTypesCount,
      label: t("event_planner_stat_diets"),
      hint: interpolateText(t("event_planner_stat_hint_diets"), { count: selectedEventDietTypesCount }),
      colorClass: "text-blue-800 dark:text-blue-300",
      labelClass: "text-blue-600 dark:text-blue-400",
      bgClass: "bg-blue-50/60 dark:bg-blue-900/10 border-blue-100 dark:border-blue-900/30",
      icon: "user"
    },
    {
      value: selectedEventRestrictionsCount,
      label: t("event_planner_stat_restrictions"),
      hint: interpolateText(t("event_planner_stat_hint_restrictions"), { count: selectedEventRestrictionsCount }),
      colorClass: selectedEventRestrictionsCount > 0 ? "text-red-800 dark:text-red-300" : "text-gray-700 dark:text-gray-300",
      labelClass: selectedEventRestrictionsCount > 0 ? "text-red-600 dark:text-red-400" : "text-gray-500",
      bgClass: selectedEventRestrictionsCount > 0
        ? "bg-red-50/60 dark:bg-red-900/10 border-red-100 dark:border-red-900/30"
        : "bg-gray-50/50 dark:bg-white/5 border-black/5 dark:border-white/10",
      icon: "shield"
    }
  ];

  if (isProfessional) {
    return (
      <div className="bg-indigo-50/60 dark:bg-indigo-950/20 rounded-2xl border border-indigo-100 dark:border-indigo-900/30 p-5 shadow-sm flex flex-col gap-4">
        <p className="text-[10px] font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400">
          {t("plan_overview_b2b_title")}
        </p>
        <div className="grid grid-cols-3 gap-3">
          {kpiItems.map((kpi) => (
            <div key={kpi.label} className={`rounded-xl border p-3 text-center ${kpi.bgClass}`}>
              <div className={`flex items-center justify-center gap-1 mb-1 ${kpi.labelClass}`}>
                <Icon name={kpi.icon} className="w-3 h-3" />
                <p className="text-[9px] font-bold uppercase tracking-wider">{kpi.label}</p>
              </div>
              <p className={`text-2xl font-black leading-none mb-0.5 ${kpi.colorClass}`}>{kpi.value}</p>
              <p className={`text-[9px] font-medium ${kpi.labelClass} opacity-80`}>{kpi.hint}</p>
            </div>
          ))}
        </div>
        {acceptanceRate ? (
          <p className="text-[11px] text-indigo-600 dark:text-indigo-400 font-medium pt-3 border-t border-indigo-100 dark:border-indigo-900/30">
            {interpolateText(t("event_planner_host_acceptance_rate"), { value: acceptanceRate })}
          </p>
        ) : null}
      </div>
    );
  }

  return (
    <div className="bg-gradient-to-br from-violet-50/80 to-pink-50/80 dark:from-violet-950/20 dark:to-pink-950/20 rounded-2xl border border-violet-100 dark:border-violet-900/30 p-5 shadow-sm flex flex-col gap-4">
      <p className="text-[10px] font-bold uppercase tracking-wider text-violet-600 dark:text-violet-400">
        {t("plan_overview_b2c_title")}
      </p>
      <div className="grid grid-cols-3 gap-3">
        {kpiItems.map((kpi) => (
          <div key={kpi.label} className={`rounded-xl border p-3 text-center bg-white/70 dark:bg-white/5 ${kpi.bgClass}`}>
            <p className={`text-2xl font-black leading-none mb-0.5 ${kpi.colorClass}`}>{kpi.value}</p>
            <p className={`text-[9px] font-bold uppercase tracking-wider mt-0.5 ${kpi.labelClass}`}>{kpi.label}</p>
          </div>
        ))}
      </div>
      {contextSummary ? (
        <p className="text-sm text-violet-800 dark:text-violet-300 font-medium leading-relaxed italic pt-3 border-t border-violet-100 dark:border-violet-900/30">
          &ldquo;{contextSummary}&rdquo;
        </p>
      ) : null}
    </div>
  );
}
