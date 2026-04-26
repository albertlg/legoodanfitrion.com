import React from "react";

const TYPE_CONFIG = {
  transport: { emoji: "✈️", dotClass: "bg-blue-500", ringClass: "ring-blue-100 dark:ring-blue-900/60" },
  food:      { emoji: "🍽️", dotClass: "bg-amber-500", ringClass: "ring-amber-100 dark:ring-amber-900/60" },
  start:     { emoji: "🟢", dotClass: "bg-green-500",  ringClass: "ring-green-100 dark:ring-green-900/60" },
  risk:      { emoji: "⚠️", dotClass: "bg-red-500",   ringClass: "ring-red-100 dark:ring-red-900/60" },
  general:   { emoji: "",   dotClass: "bg-gray-400",   ringClass: "ring-gray-100 dark:ring-gray-800/60" }
};

function classifyItem(title = "") {
  if (/transporte|traslado|llegada|partida|vuelo|bus|tren|coche|transfer|arrival|departure|transport|flight|train/i.test(title)) return "transport";
  if (/cena|comida|almuerzo|desayuno|aperitivo|brunch|cocktail|postre|dinner|lunch|breakfast|appetizer|dessert|meal/i.test(title)) return "food";
  if (/inicio|bienvenida|apertura|start|welcome|opening|begin/i.test(title)) return "start";
  if (/riesgo|aviso|alerta|cuidado|risk|warning|alert|caution/i.test(title)) return "risk";
  return "general";
}

export function PlanTimelineHighlights({ t, timeline = [], handleEventPlannerTabChange }) {
  const highlights = timeline.slice(0, 5);
  if (highlights.length === 0) return null;

  return (
    <div className="bg-white/40 dark:bg-white/5 rounded-2xl border border-black/5 dark:border-white/10 p-5 shadow-sm flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <p className="text-[10px] font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">
          {t("plan_overview_timeline_title")}
        </p>
        <button
          type="button"
          className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400 hover:underline"
          onClick={() => handleEventPlannerTabChange("timings")}
        >
          {t("plan_overview_see_timeline")}
        </button>
      </div>
      <div className="relative pl-3">
        <div className="absolute top-2 bottom-2 left-[11px] w-px bg-black/10 dark:bg-white/10" />
        <ul className="flex flex-col gap-3 relative z-10">
          {highlights.map((item) => {
            const type = classifyItem(item.title || "");
            const cfg = TYPE_CONFIG[type];
            return (
              <li key={item.id} className="flex gap-3 items-start">
                <span className={`w-2 h-2 rounded-full ${cfg.dotClass} mt-1.5 ring-4 ${cfg.ringClass} shrink-0`} />
                <div className="flex flex-col gap-0.5 min-w-0">
                  <span className="text-xs font-bold text-gray-900 dark:text-white truncate">
                    {cfg.emoji ? `${cfg.emoji} ` : ""}{item.title}
                  </span>
                  {item.detail ? (
                    <span className="text-[11px] text-gray-500 dark:text-gray-400 leading-snug line-clamp-2">
                      {item.detail}
                    </span>
                  ) : null}
                </div>
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}
