import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Icon } from "../icons";

// Comportamiento responsive:
//   < lg (móvil/tablet): modo "focus"
//     · done    → fila compacta (icono ✓ + label tachado/muted, ~24px)
//     · active  → tarjeta destacada completa (el único paso grande visible)
//     · future  → hidden (la barra de progreso ya da el contexto)
//   ≥ lg (escritorio): todos los pasos expandidos (comportamiento original)

export function HostChecklistCard({
    t,
    checklist
}) {
    const navigate = useNavigate();
    const safeChecklist = checklist && typeof checklist === "object" ? checklist : {};
    const items = useMemo(
        () => (Array.isArray(safeChecklist.items) ? safeChecklist.items : []),
        [safeChecklist.items]
    );
    const progressPercent = Number(safeChecklist.percent || 0);
    const completed = Number(safeChecklist.completed || 0);
    const total = Number(safeChecklist.total || 0);
    const eventTitle = String(safeChecklist.eventTitle || "").trim();
    const eventId = String(safeChecklist.eventId || "").trim();
    const openEventPath = String(safeChecklist.openEventPath || "").trim();
    const [recentlyCompletedKeys, setRecentlyCompletedKeys] = useState([]);
    const hasHydratedRef = useRef(false);
    const previousDoneMapRef = useRef({});
    const completionTimeoutsRef = useRef(new Map());

    // Primer paso pendiente (índice −1 = todo completado)
    const activeIndex = items.findIndex((item) => !item.done);
    const allDone = activeIndex === -1 && items.length > 0;

    const handleItemNavigation = (item) => {
        const targetPath = String(item?.targetPath || "").trim();
        if (!targetPath) return;
        navigate(targetPath);
    };

    useEffect(() => {
        const currentDoneMap = {};
        for (const item of items) {
            currentDoneMap[item.key] = Boolean(item.done);
        }

        if (!hasHydratedRef.current) {
            hasHydratedRef.current = true;
            previousDoneMapRef.current = currentDoneMap;
            return undefined;
        }

        const newlyCompletedKeys = items
            .filter((item) => Boolean(item.done) && !previousDoneMapRef.current[item.key])
            .map((item) => item.key);

        if (newlyCompletedKeys.length > 0) {
            setRecentlyCompletedKeys((prev) => [...new Set([...prev, ...newlyCompletedKeys])]);
            for (const key of newlyCompletedKeys) {
                const existingTimeout = completionTimeoutsRef.current.get(key);
                if (existingTimeout) window.clearTimeout(existingTimeout);
                const timeoutId = window.setTimeout(() => {
                    setRecentlyCompletedKeys((prev) => prev.filter((value) => value !== key));
                    completionTimeoutsRef.current.delete(key);
                }, 760);
                completionTimeoutsRef.current.set(key, timeoutId);
            }
        }

        previousDoneMapRef.current = currentDoneMap;
        return undefined;
    }, [items]);

    useEffect(() => {
        const timeoutsMap = completionTimeoutsRef.current;
        return () => {
            for (const timeoutId of timeoutsMap.values()) window.clearTimeout(timeoutId);
            timeoutsMap.clear();
        };
    }, []);

    return (
        <article className="bg-white/40 dark:bg-gray-900/40 backdrop-blur-xl rounded-2xl lg:rounded-[2.5rem] border border-black/5 dark:border-white/10 shadow-sm p-4 lg:p-8 flex flex-col gap-3 lg:gap-5">

            {/* ── CABECERA ── */}
            <div className="flex items-start justify-between gap-3 border-b border-black/5 dark:border-white/10 pb-3 lg:pb-4">
                <div>
                    <h2 className="text-sm lg:text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
                        <Icon name="check" className="w-4 h-4 lg:w-5 lg:h-5 text-emerald-500" />
                        {t("host_checklist_title")}
                    </h2>
                    {/* Sólo en escritorio */}
                    <p className="hidden lg:block text-xs text-gray-500 dark:text-gray-400 mt-1">
                        {t("host_checklist_hint")}
                    </p>
                    {eventTitle ? (
                        <p className="hidden lg:block text-xs font-semibold text-gray-700 dark:text-gray-300 mt-2">
                            {t("host_checklist_event_label")}: {eventTitle}
                        </p>
                    ) : null}
                </div>
                {eventId ? (
                    <button
                        type="button"
                        className="px-3 py-1.5 lg:px-4 lg:py-2 rounded-xl bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-900/20 dark:hover:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300 text-xs font-bold transition-colors whitespace-nowrap"
                        onClick={() => openEventPath && navigate(openEventPath)}
                    >
                        {t("host_checklist_open_event")}
                    </button>
                ) : null}
            </div>

            {/* ── BARRA DE PROGRESO ── */}
            <div className="flex flex-col gap-1.5 lg:gap-2">
                <div className="flex items-center justify-between text-[10px] lg:text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                    <span>{t("host_checklist_progress_label")}</span>
                    <span>{completed}/{total}</span>
                </div>
                <div className="w-full bg-black/10 dark:bg-white/10 rounded-full h-1.5 lg:h-2 overflow-hidden">
                    <span
                        className="block h-full bg-gradient-to-r from-emerald-500 to-blue-500 transition-all duration-500"
                        style={{ width: `${Math.max(0, Math.min(100, progressPercent))}%` }}
                    />
                </div>
            </div>

            {/* ── ESTADO "TODO COMPLETADO" — sólo móvil ── */}
            {allDone && (
                <div className="lg:hidden flex items-center gap-2 py-0.5">
                    <span className="w-5 h-5 rounded-full bg-emerald-100 dark:bg-emerald-800/30 flex items-center justify-center shrink-0">
                        <Icon name="check" className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
                    </span>
                    <span className="text-xs font-bold text-emerald-700 dark:text-emerald-400">
                        {t("host_checklist_all_done")}
                    </span>
                </div>
            )}

            {/* ── LISTA DE PASOS ── */}
            <ul className="flex flex-col gap-2">
                {items.map((item, index) => {
                    const isRecentlyCompleted = recentlyCompletedKeys.includes(item.key);
                    const isCurrentActive = !allDone && index === activeIndex;
                    const isFuture = !item.done && !allDone && index > activeIndex;

                    return (
                        <li
                            key={item.key}
                            className={isFuture ? "hidden lg:block" : ""}
                        >
                            {item.done ? (
                                <>
                                    {/* MÓVIL: fila compacta sin interacción */}
                                    <div className="lg:hidden flex items-center gap-2 px-1 py-0.5">
                                        <span
                                            className={`w-4 h-4 rounded-full flex items-center justify-center shrink-0 bg-emerald-100 dark:bg-emerald-800/30 text-emerald-600 dark:text-emerald-400 ${isRecentlyCompleted ? "host-check-icon-pop" : ""}`}
                                        >
                                            <Icon name="check" className="w-2.5 h-2.5" />
                                        </span>
                                        <span className="text-[11px] font-medium text-gray-400 dark:text-gray-500 truncate">
                                            {item.label}
                                        </span>
                                    </div>

                                    {/* ESCRITORIO: fila completa (igual que antes) */}
                                    <button
                                        type="button"
                                        onClick={() => handleItemNavigation(item)}
                                        disabled={!item.targetPath}
                                        className={`hidden lg:flex w-full items-center justify-between gap-3 rounded-xl p-3 border transition-colors text-left bg-emerald-50/70 border-emerald-200/70 dark:bg-emerald-900/20 dark:border-emerald-700/30 ${item.targetPath ? "hover:bg-white/70 dark:hover:bg-white/10 focus:outline-none focus:ring-2 focus:ring-blue-500/40" : "opacity-70 cursor-not-allowed"} ${isRecentlyCompleted ? "host-check-item-pop" : ""}`}
                                        title={item.targetPath ? t("host_checklist_item_open_action") : t("host_checklist_item_unavailable_action")}
                                        aria-label={`${item.label}${item.targetPath ? ` · ${t("host_checklist_item_open_action")}` : ""}`}
                                    >
                                        <span className="flex items-center gap-2 min-w-0">
                                            <span className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 bg-emerald-100 text-emerald-700 dark:bg-emerald-800/40 dark:text-emerald-300 ${isRecentlyCompleted ? "host-check-icon-pop" : ""}`}>
                                                <Icon name="check" className="w-3 h-3" />
                                            </span>
                                            <span className="text-xs font-semibold truncate text-gray-900 dark:text-white" title={item.label}>
                                                {item.label}
                                            </span>
                                        </span>
                                        <span className="inline-flex items-center gap-1.5 shrink-0">
                                            {item.auto ? (
                                                <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider border bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-900/30 dark:text-blue-300 dark:border-blue-700/40 ${isRecentlyCompleted ? "host-check-badge-pop" : ""}`}>
                                                    <Icon name="sparkle" className="w-3 h-3" />
                                                    {t("host_checklist_auto_badge")}
                                                </span>
                                            ) : null}
                                            {item.targetPath ? <Icon name="arrow_right" className="w-3.5 h-3.5 text-gray-400" /> : null}
                                        </span>
                                    </button>
                                </>
                            ) : (
                                /* PASO PENDIENTE (active o future — future está hidden vía li.className) */
                                <button
                                    type="button"
                                    onClick={() => handleItemNavigation(item)}
                                    disabled={!item.targetPath}
                                    className={`w-full flex items-center justify-between gap-3 rounded-xl border transition-colors text-left
                                        ${isCurrentActive
                                            ? "p-3.5 lg:p-3 bg-emerald-50 border-emerald-300/60 dark:bg-emerald-900/25 dark:border-emerald-600/40 shadow-sm ring-1 ring-emerald-400/20"
                                            : "p-3 bg-white/30 border-black/5 dark:bg-white/5 dark:border-white/10"
                                        }
                                        ${item.targetPath ? "hover:bg-white/70 dark:hover:bg-white/10 focus:outline-none focus:ring-2 focus:ring-blue-500/40" : "opacity-70 cursor-not-allowed"}
                                    `}
                                    title={item.targetPath ? t("host_checklist_item_open_action") : t("host_checklist_item_unavailable_action")}
                                    aria-label={`${item.label}${item.targetPath ? ` · ${t("host_checklist_item_open_action")}` : ""}`}
                                >
                                    <span className="flex items-center gap-2 min-w-0">
                                        <span
                                            className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 ${
                                                isCurrentActive
                                                    ? "bg-emerald-500 text-white"
                                                    : "bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400"
                                            }`}
                                        >
                                            <Icon name={isCurrentActive ? "arrow_right" : "clock"} className="w-3 h-3" />
                                        </span>
                                        <span
                                            className={`truncate font-semibold ${
                                                isCurrentActive
                                                    ? "text-sm lg:text-xs font-bold text-emerald-900 dark:text-emerald-100"
                                                    : "text-xs text-gray-600 dark:text-gray-300"
                                            }`}
                                            title={item.label}
                                        >
                                            {item.label}
                                        </span>
                                    </span>
                                    <span className="inline-flex items-center gap-1.5 shrink-0">
                                        {item.auto ? (
                                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider border bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-900/30 dark:text-blue-300 dark:border-blue-700/40">
                                                <Icon name="sparkle" className="w-3 h-3" />
                                                {t("host_checklist_auto_badge")}
                                            </span>
                                        ) : null}
                                        {item.targetPath ? <Icon name="arrow_right" className="w-3.5 h-3.5 text-gray-400" /> : null}
                                    </span>
                                </button>
                            )}
                        </li>
                    );
                })}
            </ul>
        </article>
    );
}
