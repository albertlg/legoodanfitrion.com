import React from "react";

// 🚀 Fila de toggle para módulos del evento. Extraído pixel-parity del modal
// real (EventModulesManagerModal). Lo usan: modal de "Personalizar evento"
// (app privada) y ModuleShowcaseCard (landing pública).

export function ModuleToggleRow({
    moduleKey,
    label,
    hint,
    isEnabled,
    onToggle,
    idPrefix = "event-module-toggle",
    showEmptyHint = true,
    compact = false
}) {
    const toggleId = `${idPrefix}-${moduleKey}`;
    if (compact) {
        return (
            <article className="rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 shadow-sm px-3 py-2 flex items-center justify-between gap-3">
                <label
                    htmlFor={toggleId}
                    className="flex-1 text-[13px] font-bold text-gray-900 dark:text-white cursor-pointer truncate"
                >
                    {label}
                </label>
                <input
                    id={toggleId}
                    type="checkbox"
                    checked={Boolean(isEnabled)}
                    onChange={(event) => onToggle?.(moduleKey, event.target.checked)}
                    className="h-4 w-4 rounded border-gray-300 dark:border-gray-600 text-indigo-600 focus:ring-indigo-500/40 bg-white dark:bg-gray-900 shrink-0 cursor-pointer transition-all duration-200"
                />
            </article>
        );
    }
    return (
        <article
            className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 shadow-sm overflow-hidden p-3 flex flex-col gap-2"
        >
            <div className="flex items-start justify-between gap-3">
                <label
                    htmlFor={toggleId}
                    className="flex flex-col gap-1 min-w-0 cursor-pointer transition-all duration-200"
                >
                    <span className="text-sm font-bold text-gray-900 dark:text-white">{label}</span>
                    {hint ? (
                        <span className="text-xs text-gray-500 dark:text-gray-400">{hint}</span>
                    ) : null}
                </label>
                <input
                    id={toggleId}
                    type="checkbox"
                    checked={Boolean(isEnabled)}
                    onChange={(event) => onToggle?.(moduleKey, event.target.checked)}
                    className="mt-0.5 h-5 w-5 rounded border-gray-300 dark:border-gray-600 text-indigo-600 focus:ring-indigo-500/40 bg-white dark:bg-gray-900 shrink-0 cursor-pointer transition-all duration-200"
                />
            </div>

            {showEmptyHint && !isEnabled && hint ? (
                <div className="rounded-lg border border-dashed border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-900/40 shadow-sm p-2.5">
                    <p className="text-[11px] text-gray-500 dark:text-gray-400">{hint}</p>
                </div>
            ) : null}
        </article>
    );
}
