import React, { useMemo, useState } from "react";
import { Icon } from "../icons";
import { AvatarCircle } from "../avatar-circle";
import { demoEventsByMode } from "../../data/demo-events";

const MODE_ORDER = ["b2c", "b2b"];

function formatDate(iso, language) {
    try {
        const d = new Date(iso);
        if (Number.isNaN(d.getTime())) return "";
        return new Intl.DateTimeFormat(language || "es", {
            day: "numeric",
            month: "short",
            hour: "2-digit",
            minute: "2-digit"
        }).format(d);
    } catch {
        return "";
    }
}

function formatCurrency(amount, currency, language) {
    try {
        return new Intl.NumberFormat(language || "es", {
            style: "currency",
            currency,
            maximumFractionDigits: 0
        }).format(amount);
    } catch {
        return `${amount} ${currency}`;
    }
}

const STATUS_CONFIG = {
    confirmed: { key: "landing_demo_status_confirmed", iconName: "check", className: "bg-green-50 dark:bg-green-900/25 text-green-700 dark:text-green-300 border-green-200 dark:border-green-800/40" },
    pending: { key: "landing_demo_status_pending", iconName: "clock", className: "bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800/40" },
    declined: { key: "landing_demo_status_declined", iconName: "close", className: "bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 border-gray-200 dark:border-gray-700" }
};

function StatusBadge({ status, t }) {
    const config = STATUS_CONFIG[status] || STATUS_CONFIG.pending;
    return (
        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border whitespace-nowrap ${config.className}`}>
            <Icon name={config.iconName} className="w-3 h-3" />
            {t(config.key)}
        </span>
    );
}

const STAT_ACCENTS = {
    neutral: "bg-black/5 dark:bg-white/5 border-black/5 dark:border-white/10 text-gray-900 dark:text-white",
    confirmed: "bg-green-50 dark:bg-green-900/15 border-green-100 dark:border-green-800/30 text-green-700 dark:text-green-300",
    pending: "bg-amber-50 dark:bg-amber-900/15 border-amber-100 dark:border-amber-800/30 text-amber-700 dark:text-amber-400",
    allergy: "bg-orange-50 dark:bg-orange-900/15 border-orange-100 dark:border-orange-800/30 text-orange-700 dark:text-orange-400"
};

function StatCard({ labelKey, value, accent, t }) {
    return (
        <div className={`rounded-2xl p-3 sm:p-4 flex flex-col min-w-0 border ${STAT_ACCENTS[accent] || STAT_ACCENTS.neutral}`}>
            <span className="text-[9px] sm:text-[10px] font-bold uppercase tracking-widest opacity-80 mb-1 truncate">
                {t(labelKey)}
            </span>
            <span className="text-2xl sm:text-3xl font-black leading-none">{value}</span>
        </div>
    );
}

export default function InteractiveDemo({ t, language }) {
    const [mode, setMode] = useState("b2c");
    const event = demoEventsByMode[mode];

    const formattedDate = useMemo(() => formatDate(event.startAt, language), [event.startAt, language]);
    const formattedBudget = useMemo(() => {
        if (!event.budget) return null;
        return {
            spent: formatCurrency(event.budget.spent, event.budget.currency, language),
            total: formatCurrency(event.budget.total, event.budget.currency, language),
            progress: Math.min(100, Math.round((event.budget.spent / event.budget.total) * 100))
        };
    }, [event.budget, language]);

    return (
        <div className="w-full flex flex-col items-center">
            <div
                role="tablist"
                aria-label={t("landing_two_worlds_eyebrow")}
                className="inline-flex items-center gap-1 p-1 mb-6 rounded-full bg-black/5 dark:bg-white/5 border border-black/5 dark:border-white/10 backdrop-blur-sm"
            >
                {MODE_ORDER.map((m) => {
                    const labelKey = m === "b2c" ? "landing_two_worlds_b2c_title" : "landing_two_worlds_b2b_title";
                    const active = mode === m;
                    return (
                        <button
                            key={m}
                            type="button"
                            role="tab"
                            aria-selected={active}
                            onClick={() => setMode(m)}
                            className={`px-5 py-2 rounded-full text-sm font-bold transition-all duration-200 cursor-pointer ${
                                active
                                    ? "bg-white dark:bg-gray-800 text-gray-900 dark:text-white shadow-sm"
                                    : "text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white"
                            }`}
                        >
                            {t(labelKey)}
                        </button>
                    );
                })}
            </div>

            <div
                key={event.id}
                className="w-full max-w-3xl bg-white/85 dark:bg-[#12161d]/85 backdrop-blur-2xl border border-black/10 dark:border-white/10 rounded-3xl shadow-2xl shadow-black/10 dark:shadow-black/40 overflow-hidden animate-in fade-in zoom-in-95 duration-300"
            >
                <div className="px-5 md:px-6 py-3.5 border-b border-black/5 dark:border-white/5 flex items-center gap-3 bg-gray-50/60 dark:bg-black/20">
                    <div className="flex gap-1.5">
                        <span className="w-2.5 h-2.5 rounded-full bg-red-400/70" />
                        <span className="w-2.5 h-2.5 rounded-full bg-yellow-400/70" />
                        <span className="w-2.5 h-2.5 rounded-full bg-green-400/70" />
                    </div>
                    <span className="text-[11px] font-bold uppercase tracking-widest text-gray-500 dark:text-gray-400">
                        LeGoodAnfitrión · Panel
                    </span>
                </div>

                <div className="p-5 md:p-8 flex flex-col gap-6">
                    <header className="flex flex-col gap-3">
                        <div className="flex flex-wrap items-start justify-between gap-3">
                            <div className="flex-1 min-w-0">
                                <h3 className="text-xl md:text-2xl font-black text-gray-900 dark:text-white leading-tight text-balance">
                                    {event.title}
                                </h3>
                                <p className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs md:text-sm font-medium text-gray-500 dark:text-gray-400">
                                    <span className="inline-flex items-center gap-1.5">
                                        <Icon name="calendar" className="w-3.5 h-3.5 shrink-0" />
                                        {formattedDate}
                                    </span>
                                    <span className="inline-flex items-center gap-1.5">
                                        <Icon name="location" className="w-3.5 h-3.5 shrink-0" />
                                        {event.location.name} · {event.location.city}
                                    </span>
                                </p>
                            </div>
                            <span className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border whitespace-nowrap ${event.accentChip.className}`}>
                                {t(event.accentChip.labelKey)}
                            </span>
                        </div>
                        {event.dietaryFlags && event.dietaryFlags.length > 0 && (
                            <div className="flex flex-wrap gap-1.5">
                                {event.dietaryFlags.map((flag) => (
                                    <span key={flag} className="px-2 py-0.5 rounded-md bg-orange-50 dark:bg-orange-900/20 text-orange-700 dark:text-orange-300 border border-orange-200 dark:border-orange-800/30 text-[10px] font-bold uppercase tracking-wider">
                                        {flag}
                                    </span>
                                ))}
                            </div>
                        )}
                    </header>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3">
                        <StatCard labelKey="landing_demo_label_invited" value={event.stats.invited} accent="neutral" t={t} />
                        <StatCard labelKey="landing_demo_label_confirmed" value={event.stats.confirmed} accent="confirmed" t={t} />
                        <StatCard labelKey="landing_demo_label_pending" value={event.stats.pending} accent="pending" t={t} />
                        <StatCard labelKey="landing_demo_label_allergies" value={event.stats.allergies} accent="allergy" t={t} />
                    </div>

                    <section>
                        <p className="text-[10px] font-bold uppercase tracking-widest text-gray-500 dark:text-gray-400 mb-3">
                            {t("landing_demo_guest_list_title")}
                        </p>
                        <ul className="flex flex-col divide-y divide-black/5 dark:divide-white/5 rounded-2xl border border-black/5 dark:border-white/10 bg-gray-50/60 dark:bg-black/20">
                            {event.guests.map((guest) => (
                                <li key={guest.id} className="flex items-center gap-3 px-4 py-3">
                                    <AvatarCircle label={guest.name} size={32} />
                                    <div className="flex flex-col flex-1 min-w-0">
                                        <span className="text-sm font-bold text-gray-900 dark:text-white truncate">
                                            {guest.name}
                                            {guest.plusOne && (
                                                <span className="ml-1.5 text-[10px] font-bold uppercase tracking-wider text-gray-400 dark:text-gray-500">
                                                    +1
                                                </span>
                                            )}
                                        </span>
                                        <span className="text-[11px] font-medium text-gray-500 dark:text-gray-400 truncate">
                                            {guest.department || guest.allergy || "\u00A0"}
                                        </span>
                                    </div>
                                    <StatusBadge status={guest.status} t={t} />
                                </li>
                            ))}
                        </ul>
                    </section>

                    {formattedBudget && (
                        <section className="rounded-2xl p-4 border border-black/5 dark:border-white/10 bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/10 dark:to-indigo-900/10">
                            <div className="flex items-center justify-between mb-2">
                                <span className="text-[10px] font-bold uppercase tracking-widest text-blue-700 dark:text-blue-300">
                                    {t("landing_demo_budget_title")}
                                </span>
                                <span className="text-sm font-bold text-gray-900 dark:text-white">
                                    {formattedBudget.spent}
                                    <span className="text-gray-400 dark:text-gray-500 font-medium"> / {formattedBudget.total}</span>
                                </span>
                            </div>
                            <div className="w-full h-2 rounded-full bg-blue-100 dark:bg-blue-900/30 overflow-hidden">
                                <div
                                    className="h-full bg-gradient-to-r from-blue-500 to-indigo-600 transition-all duration-500"
                                    style={{ width: `${formattedBudget.progress}%` }}
                                />
                            </div>
                        </section>
                    )}

                    <footer className="pt-2 border-t border-black/5 dark:border-white/5">
                        <p className="text-xs font-medium text-gray-500 dark:text-gray-400 italic">
                            {event.vibe}
                        </p>
                    </footer>
                </div>
            </div>
        </div>
    );
}
