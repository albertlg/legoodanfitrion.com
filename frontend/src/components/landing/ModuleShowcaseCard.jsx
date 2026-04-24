import React, { useEffect, useState } from "react";
import { Icon } from "../icons";
import { ModuleToggleRow } from "../dashboard/presentational/ModuleToggleRow";
import { EVENT_MODULES_CATALOG } from "../../data/event-modules-catalog";

// Estado inicial: mezcla de activos e inactivos para que el usuario vea ambos
// estados desde el principio (matching screenshot real).
const INITIAL_STATE = Object.freeze({
    spotify: true,
    finance: true,
    gallery: true,
    icebreaker: true,
    date_poll: false,
    venues: true,
    meals: true,
    megaphone: false,
    spaces: false,
    shared_tasks: true
});

// Claves que se auto-alternan en bucle para mostrar versatilidad.
const AUTOPLAY_ORDER = ["date_poll", "megaphone", "spaces", "gallery", "meals", "venues", "icebreaker"];
const AUTOPLAY_INTERVAL_MS = 1700;

export function ModuleShowcaseCard({ t }) {
    const [toggles, setToggles] = useState(INITIAL_STATE);
    const [paused, setPaused] = useState(false);

    useEffect(() => {
        if (paused) return undefined;
        let index = 0;
        const timer = window.setInterval(() => {
            const key = AUTOPLAY_ORDER[index % AUTOPLAY_ORDER.length];
            index += 1;
            setToggles((prev) => ({ ...prev, [key]: !prev[key] }));
        }, AUTOPLAY_INTERVAL_MS);
        return () => window.clearInterval(timer);
    }, [paused]);

    const handleToggle = (moduleKey, enabled) => {
        setToggles((prev) => ({ ...prev, [moduleKey]: enabled }));
        setPaused(true);
    };

    return (
        <article
            className="w-full max-w-md bg-white/95 dark:bg-gray-900/95 border border-black/10 dark:border-white/10 rounded-3xl shadow-2xl shadow-black/10 dark:shadow-black/40 p-5 sm:p-6 flex flex-col gap-4 backdrop-blur-xl"
            onMouseEnter={() => setPaused(true)}
            onMouseLeave={() => setPaused(false)}
            aria-label={t("event_modules_section_title")}
        >
            <header className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                    <span className="inline-flex w-9 h-9 items-center justify-center rounded-xl bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-700/30 shrink-0">
                        <Icon name="settings" className="w-4 h-4" />
                    </span>
                    <div className="flex flex-col min-w-0">
                        <h3 className="text-sm font-black text-gray-900 dark:text-white leading-tight truncate">
                            {t("event_modules_section_title")}
                        </h3>
                        <p className="text-[11px] text-gray-500 dark:text-gray-400 leading-tight mt-0.5 line-clamp-2">
                            {t("event_modules_section_hint")}
                        </p>
                    </div>
                </div>
                <span
                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-700/30 text-[9px] font-black uppercase tracking-widest shrink-0"
                    aria-hidden="true"
                >
                    <span className={`w-1.5 h-1.5 rounded-full bg-emerald-500 ${paused ? "" : "animate-pulse"}`} />
                    Auto
                </span>
            </header>

            <div className="flex flex-col gap-1.5">
                {EVENT_MODULES_CATALOG.map((moduleMeta) => (
                    <ModuleToggleRow
                        key={moduleMeta.key}
                        moduleKey={moduleMeta.key}
                        label={t(moduleMeta.labelKey)}
                        hint={t(moduleMeta.hintKey)}
                        isEnabled={Boolean(toggles[moduleMeta.key])}
                        onToggle={handleToggle}
                        idPrefix="hero-module-toggle"
                        compact
                    />
                ))}
            </div>
        </article>
    );
}
