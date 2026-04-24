import React from "react";
import { Icon } from "../../icons";

// 🚀 Tarjeta KPI pura extraída del dashboard real (DashboardOverview).
// Sin Supabase, sin hooks globales, sin i18n forzado: recibe todo por props.
// La usan: dashboard privado (DashboardOverview) y landing (InteractiveDemo).

const ACCENTS = {
    blue: {
        blob: "bg-blue-500/5 group-hover:bg-blue-500/10",
        icon: "bg-blue-500/10 text-blue-600 dark:bg-blue-400/10 dark:text-blue-400",
        ring: "focus:ring-blue-500/50"
    },
    purple: {
        blob: "bg-purple-500/5 group-hover:bg-purple-500/10",
        icon: "bg-purple-500/10 text-purple-600 dark:bg-purple-400/10 dark:text-purple-400",
        ring: "focus:ring-purple-500/50"
    },
    orange: {
        blob: "bg-orange-500/5 group-hover:bg-orange-500/10",
        icon: "bg-orange-500/10 text-orange-600 dark:bg-orange-400/10 dark:text-orange-400",
        ring: "focus:ring-orange-500/50"
    },
    green: {
        blob: "bg-green-500/5 group-hover:bg-green-500/10",
        icon: "bg-green-500/10 text-green-600 dark:bg-green-400/10 dark:text-green-400",
        ring: "focus:ring-green-500/50"
    },
    amber: {
        blob: "bg-amber-500/5 group-hover:bg-amber-500/10",
        icon: "bg-amber-500/10 text-amber-600 dark:bg-amber-400/10 dark:text-amber-400",
        ring: "focus:ring-amber-500/50"
    }
};

export function KpiTile({ label, value, hint, iconName, accent = "blue", valueClassName, onClick }) {
    const palette = ACCENTS[accent] || ACCENTS.blue;
    const interactive = typeof onClick === "function";

    const interactiveClasses = interactive
        ? ` hover:bg-white/60 dark:hover:bg-gray-800/60 hover:shadow-xl hover:-translate-y-1 transition-all duration-300 cursor-pointer outline-none focus:ring-2 ${palette.ring}`
        : "";

    const handleKeyDown = interactive
        ? (event) => {
            if (event.key === "Enter" || event.key === " ") {
                event.preventDefault();
                onClick(event);
            }
        }
        : undefined;

    return (
        <article
            className={`bg-white/40 dark:bg-gray-900/40 backdrop-blur-xl rounded-[2rem] border border-black/5 dark:border-white/10 shadow-sm p-6 flex flex-col gap-4 relative overflow-hidden group${interactiveClasses}`}
            tabIndex={interactive ? 0 : undefined}
            role={interactive ? "button" : undefined}
            onClick={interactive ? onClick : undefined}
            onKeyDown={handleKeyDown}
        >
            <div className={`absolute -right-6 -top-6 w-24 h-24 ${palette.blob} rounded-full blur-2xl transition-colors`}></div>
            <div className="flex justify-between items-start relative z-10">
                <p className="text-[11px] font-bold uppercase tracking-widest text-gray-500 dark:text-gray-400 mt-2">
                    {label}
                </p>
                <div className={`p-3 ${palette.icon} rounded-2xl ${interactive ? "group-hover:scale-110 transition-transform" : ""}`}>
                    <Icon name={iconName} className="w-5 h-5" />
                </div>
            </div>
            <div className="relative z-10">
                <p className={`text-4xl font-black tracking-tight ${valueClassName || "text-gray-900 dark:text-white"}`}>{value}</p>
                {hint ? (
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-2 truncate font-medium">{hint}</p>
                ) : null}
            </div>
        </article>
    );
}
