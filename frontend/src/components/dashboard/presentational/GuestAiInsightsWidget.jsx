import { useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "../../../lib/supabaseClient";
import { Icon } from "../../icons";

const RECURRING_THRESHOLD = 3;

const INTENT_ICON = {
  date: "clock",
  location: "location",
  menu: "utensils",
  dress_code: "sparkle",
  timeline: "list",
  ambience: "music",
  host_notes: "info",
  unknown: "question"
};

// Maps a detected intent to the most relevant planner tab
const INTENT_TO_PLAN_TAB = {
  date: "timings",
  location: "timings",
  menu: "menu",
  dress_code: "ambience",
  timeline: "timings",
  ambience: "ambience",
  host_notes: "communication",
  unknown: "menu"
};

function intentColor(intent, dark = false) {
  const map = {
    date: dark ? "bg-blue-900/30 text-blue-300 border-blue-700/40" : "bg-blue-50 text-blue-700 border-blue-200",
    location: dark ? "bg-emerald-900/30 text-emerald-300 border-emerald-700/40" : "bg-emerald-50 text-emerald-700 border-emerald-200",
    menu: dark ? "bg-orange-900/30 text-orange-300 border-orange-700/40" : "bg-orange-50 text-orange-700 border-orange-200",
    dress_code: dark ? "bg-purple-900/30 text-purple-300 border-purple-700/40" : "bg-purple-50 text-purple-700 border-purple-200",
    timeline: dark ? "bg-indigo-900/30 text-indigo-300 border-indigo-700/40" : "bg-indigo-50 text-indigo-700 border-indigo-200",
    ambience: dark ? "bg-pink-900/30 text-pink-300 border-pink-700/40" : "bg-pink-50 text-pink-700 border-pink-200",
    host_notes: dark ? "bg-gray-800 text-gray-300 border-gray-700" : "bg-gray-100 text-gray-600 border-gray-200",
    unknown: dark ? "bg-gray-800 text-gray-400 border-gray-700" : "bg-gray-100 text-gray-500 border-gray-200"
  };
  return map[intent] || map.unknown;
}

export function GuestAiInsightsWidget({ eventId, t, onGoToPlan, onUpdatePlanWithSignals, isPlanUpdating = false, refreshTrigger = 0 }) {
  const [insights, setInsights] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isExpanded, setIsExpanded] = useState(false);
  const [wasJustUpdated, setWasJustUpdated] = useState(false);
  const prevIsUpdatingRef = useRef(false);

  useEffect(() => {
    if (prevIsUpdatingRef.current && !isPlanUpdating) {
      setWasJustUpdated(true);
    }
    prevIsUpdatingRef.current = isPlanUpdating;
  }, [isPlanUpdating]);

  useEffect(() => {
    if (!supabase || !eventId) {
      setIsLoading(false);
      return;
    }
    let cancelled = false;
    const fetch = async () => {
      setIsLoading(true);
      const { data, error } = await supabase
        .from("guest_ai_insights")
        .select("id, question, detected_intent, created_at")
        .eq("event_id", eventId)
        .is("resolved_at", null)
        .order("created_at", { ascending: false })
        .limit(60);
      if (!cancelled) {
        if (!error && Array.isArray(data)) {
          setInsights(data);
        }
        setIsLoading(false);
      }
    };
    fetch();
    return () => {
      cancelled = true;
    };
  }, [eventId, refreshTrigger]);

  const intentCounts = useMemo(() => {
    const counts = {};
    insights.forEach((item) => {
      const intent = item.detected_intent || "unknown";
      counts[intent] = (counts[intent] || 0) + 1;
    });
    return counts;
  }, [insights]);

  const recurringIntents = useMemo(
    () =>
      Object.entries(intentCounts)
        .filter(([, count]) => count >= RECURRING_THRESHOLD)
        .sort(([, a], [, b]) => b - a)
        .map(([intent, count]) => ({ intent, count })),
    [intentCounts]
  );

  const groupedInsights = useMemo(() => {
    const map = new Map();
    insights.forEach((item) => {
      const key = item.question.trim().toLowerCase();
      if (map.has(key)) {
        map.get(key).count += 1;
      } else {
        map.set(key, { ...item, count: 1 });
      }
    });
    return Array.from(map.values()).sort((a, b) => b.count - a.count);
  }, [insights]);

  const visibleInsights = isExpanded ? groupedInsights.slice(0, 20) : groupedInsights.slice(0, 5);

  if (isLoading) {
    return (
      <article className="bg-white/80 dark:bg-gray-900/80 backdrop-blur-md rounded-xl border border-gray-200/80 dark:border-gray-700/80 ring-1 ring-black/5 dark:ring-white/10 shadow-sm p-5 flex flex-col gap-3 animate-pulse">
        <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-2/3" />
        <div className="h-3 bg-gray-100 dark:bg-gray-800 rounded w-full" />
        <div className="h-3 bg-gray-100 dark:bg-gray-800 rounded w-4/5" />
      </article>
    );
  }

  if (insights.length === 0) {
    return (
      <article className="bg-white/80 dark:bg-gray-900/80 backdrop-blur-md rounded-xl border border-gray-200/80 dark:border-gray-700/80 ring-1 ring-black/5 dark:ring-white/10 shadow-sm p-5 flex flex-col gap-3">
        <header className="flex items-center gap-2">
          <span className="flex items-center justify-center w-8 h-8 rounded-xl bg-violet-100 dark:bg-violet-900/30 text-violet-600 dark:text-violet-400 shrink-0">
            <Icon name="sparkle" className="w-4 h-4" />
          </span>
          <p className="text-sm font-black text-gray-900 dark:text-white leading-tight">
            {t("insights_widget_title")}
          </p>
        </header>
        <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed">
          {t("insights_widget_empty")}
        </p>
      </article>
    );
  }

  return (
    <article className="bg-white/80 dark:bg-gray-900/80 backdrop-blur-md rounded-xl border border-gray-200/80 dark:border-gray-700/80 ring-1 ring-black/5 dark:ring-white/10 shadow-sm overflow-hidden transition-all duration-300 hover:-translate-y-0.5 hover:shadow-md">
      <header className="flex items-start justify-between gap-2 px-5 pt-5 pb-4 border-b border-black/5 dark:border-white/10">
        <div className="flex items-center gap-2.5 min-w-0">
          <span className="flex items-center justify-center w-8 h-8 rounded-xl bg-violet-100 dark:bg-violet-900/30 text-violet-600 dark:text-violet-400 shrink-0">
            <Icon name="sparkle" className="w-4 h-4" />
          </span>
          <div className="min-w-0">
            <p className="text-sm font-black text-gray-900 dark:text-white leading-tight">
              {t("insights_widget_title")}
            </p>
            <p className="text-[11px] text-gray-500 dark:text-gray-400 leading-tight">
              {insights.length} {t("insights_widget_count_label")}
            </p>
          </div>
        </div>
        <span className="shrink-0 text-[10px] font-bold uppercase tracking-wider text-violet-600 dark:text-violet-400 bg-violet-50 dark:bg-violet-900/20 border border-violet-200 dark:border-violet-700/40 rounded-full px-2 py-0.5">
          {t("insights_widget_badge_live")}
        </span>
      </header>

      {/* Dudas recurrentes */}
      {recurringIntents.length > 0 ? (
        <div className="px-5 py-3 border-b border-black/5 dark:border-white/10 flex flex-col gap-2.5">
          <div className="flex flex-col items-start gap-2">
            {wasJustUpdated && onGoToPlan ? (
              <div className="w-full flex items-center justify-between gap-2 px-3 py-2 rounded-lg bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-700/40">
                <span className="text-[11px] font-bold text-emerald-700 dark:text-emerald-400 flex items-center gap-1">
                  <Icon name="check" className="w-3 h-3" />
                  {t("insights_widget_plan_updated")}
                </span>
                <button
                  type="button"
                  className="shrink-0 text-[11px] font-bold text-emerald-700 dark:text-emerald-400 hover:text-emerald-900 dark:hover:text-emerald-300 underline transition-colors"
                  onClick={() => { setWasJustUpdated(false); onGoToPlan("communication"); }}
                >
                  {t("insights_widget_view_messages")} →
                </button>
              </div>
            ) : onUpdatePlanWithSignals ? (
              <button
                type="button"
                disabled={isPlanUpdating}
                className="shrink-0 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-bold bg-violet-600 hover:bg-violet-700 disabled:bg-violet-400 dark:bg-violet-700 dark:hover:bg-violet-600 dark:disabled:bg-violet-800 text-white transition-colors shadow-sm disabled:cursor-not-allowed"
                onClick={() => {
                  setWasJustUpdated(false);
                  const signals = recurringIntents.reduce((acc, { intent, count }) => {
                    acc[intent] = count;
                    return acc;
                  }, {});
                  onUpdatePlanWithSignals(signals);
                }}
              >
                <span>{isPlanUpdating ? t("insights_widget_updating_plan") : t("insights_widget_update_with_signals")}</span>
              </button>
            ) : null}
            <p className="text-[11px] font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">
              {t("insights_widget_recurring_title")}
            </p>
          </div>
          <div className="flex flex-col gap-3">
            {recurringIntents.map(({ intent, count }) => (
              <div key={intent} className="flex flex-col gap-1.5">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-bold shrink-0 dark:${intentColor(intent, true)} ${intentColor(intent)}`}>
                    <Icon name={INTENT_ICON[intent] || "question"} className="w-3 h-3" />
                    {t(`insights_intent_${intent}`) || intent}
                  </span>
                  <span className="text-[10px] font-bold text-orange-600 dark:text-orange-400 bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-700/30 rounded-full px-2 py-0.5 shrink-0">
                    ⚠ {t("insights_widget_recurring_badge")} ×{count}
                  </span>
                </div>
                {onGoToPlan ? (
                  <button
                    type="button"
                    className="self-start text-[11px] font-bold text-violet-600 dark:text-violet-400 hover:text-violet-800 dark:hover:text-violet-300 transition-colors"
                    onClick={() => onGoToPlan(INTENT_TO_PLAN_TAB[intent] || "menu")}
                  >
                    {t("insights_widget_update_plan")} →
                  </button>
                ) : null}
              </div>
            ))}
          </div>
        </div>
      ) : null}

      {/* Lista de preguntas recientes */}
      <div className="px-5 py-4 flex flex-col gap-2">
        <p className="text-[11px] font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-1">
          {t("insights_widget_recent_title")}
        </p>
        {visibleInsights.map((item) => (
          <div key={item.id} className="flex items-start gap-2.5 py-1.5 border-b border-black/5 dark:border-white/5 last:border-0">
            <span className={`shrink-0 mt-0.5 inline-flex items-center gap-1 rounded-full border px-1.5 py-0.5 text-[10px] font-bold dark:${intentColor(item.detected_intent, true)} ${intentColor(item.detected_intent)}`}>
              <Icon name={INTENT_ICON[item.detected_intent] || "question"} className="w-2.5 h-2.5" />
            </span>
            <p className="text-xs text-gray-700 dark:text-gray-300 leading-relaxed line-clamp-2 min-w-0 flex-1">
              {item.question}
            </p>
            {item.count > 1 ? (
              <span className="shrink-0 text-[10px] font-black text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-full px-1.5 py-0.5 tabular-nums leading-none self-center">
                ×{item.count}
              </span>
            ) : null}
          </div>
        ))}
        {groupedInsights.length > 5 ? (
          <button
            type="button"
            className="mt-1 text-[11px] font-bold text-violet-600 dark:text-violet-400 hover:text-violet-800 dark:hover:text-violet-300 transition-colors text-left"
            onClick={() => setIsExpanded((prev) => !prev)}
          >
            {isExpanded
              ? t("insights_widget_show_less")
              : `${t("insights_widget_show_more")} (${groupedInsights.length - 5})`}
          </button>
        ) : null}
      </div>
    </article>
  );
}
