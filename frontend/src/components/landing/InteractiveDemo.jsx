import React, { useMemo, useState } from "react";
import { Icon } from "../icons";
import { KpiTile } from "../dashboard/presentational/KpiTile";
import { GuestRosterRow } from "../dashboard/presentational/GuestRosterRow";
import { demoScenarios, pickLocalized } from "../../data/demo-events";

function formatDateTime(iso, language) {
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

function formatDayLabel(iso, language) {
    try {
        const d = new Date(iso);
        if (Number.isNaN(d.getTime())) return "";
        return new Intl.DateTimeFormat(language || "es", {
            weekday: "short",
            day: "numeric",
            month: "short"
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

const GUEST_STATUS_LABEL_KEY = {
    confirmed: "landing_demo_status_confirmed",
    pending: "landing_demo_status_pending",
    declined: "landing_demo_status_declined"
};

const STATE_CONFIG = {
    landing_demo_state_confirming: { iconName: "activity", className: "bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800/40" },
    landing_demo_state_voting: { iconName: "check", className: "bg-purple-50 dark:bg-purple-900/20 text-purple-700 dark:text-purple-300 border-purple-200 dark:border-purple-800/40" },
    landing_demo_state_finalized: { iconName: "check", className: "bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300 border-green-200 dark:border-green-800/40" }
};

function StateBadge({ stateKey, t }) {
    const config = STATE_CONFIG[stateKey] || STATE_CONFIG.landing_demo_state_confirming;
    return (
        <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border whitespace-nowrap ${config.className}`}>
            <Icon name={config.iconName} className="w-3 h-3" />
            {t(stateKey)}
        </span>
    );
}

function DateHeadline({ event, language, t }) {
    if (event.kind === "voting_poll") {
        return (
            <span className="inline-flex items-center gap-1.5">
                <Icon name="clock" className="w-3.5 h-3.5 shrink-0" />
                {t("landing_demo_poll_pending_date")}
            </span>
        );
    }
    if (event.kind === "date_range" && event.startAt && event.endAt) {
        return (
            <span className="inline-flex items-center gap-1.5">
                <Icon name="calendar" className="w-3.5 h-3.5 shrink-0" />
                {formatDayLabel(event.startAt, language)} → {formatDayLabel(event.endAt, language)}
            </span>
        );
    }
    return (
        <span className="inline-flex items-center gap-1.5">
            <Icon name="calendar" className="w-3.5 h-3.5 shrink-0" />
            {formatDateTime(event.startAt, language)}
        </span>
    );
}

function DateRangeStrip({ event, language, t }) {
    const start = new Date(event.startAt);
    const end = new Date(event.endAt);
    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return null;
    const nights = Math.max(1, Math.round((end - start) / (1000 * 60 * 60 * 24)));
    return (
        <section className="rounded-2xl border border-black/5 dark:border-white/10 bg-gradient-to-br from-emerald-50 to-teal-50 dark:from-emerald-900/10 dark:to-teal-900/10 p-3 md:p-4 flex items-center gap-3 md:gap-4">
            <div className="flex flex-col items-center rounded-xl bg-white/80 dark:bg-gray-900/60 px-3 md:px-4 py-2.5 md:py-3 shadow-sm border border-black/5 dark:border-white/10 min-w-[78px]">
                <span className="text-[9px] font-bold uppercase tracking-widest text-emerald-700 dark:text-emerald-300">{t("landing_demo_range_start")}</span>
                <span className="text-sm font-black text-gray-900 dark:text-white mt-0.5 whitespace-nowrap">{formatDayLabel(event.startAt, language)}</span>
            </div>
            <div className="flex-1 flex items-center justify-center gap-1.5 text-emerald-600 dark:text-emerald-300 text-[10px] font-bold uppercase tracking-widest">
                <Icon name="arrow_right" className="w-4 h-4 hidden sm:block" />
                <span className="whitespace-nowrap">{nights}{t("landing_demo_range_nights_suffix")}</span>
            </div>
            <div className="flex flex-col items-center rounded-xl bg-white/80 dark:bg-gray-900/60 px-3 md:px-4 py-2.5 md:py-3 shadow-sm border border-black/5 dark:border-white/10 min-w-[78px]">
                <span className="text-[9px] font-bold uppercase tracking-widest text-emerald-700 dark:text-emerald-300">{t("landing_demo_range_end")}</span>
                <span className="text-sm font-black text-gray-900 dark:text-white mt-0.5 whitespace-nowrap">{formatDayLabel(event.endAt, language)}</span>
            </div>
        </section>
    );
}

function VotingPanel({ event, language, t }) {
    const total = event.pollTotalVoters || event.pollOptions.reduce((acc, o) => acc + o.votes, 0);
    return (
        <section className="rounded-2xl border border-purple-100 dark:border-purple-900/30 bg-purple-50/50 dark:bg-purple-900/10 p-4">
            <div className="flex items-center justify-between mb-3">
                <p className="text-[10px] font-bold uppercase tracking-widest text-purple-700 dark:text-purple-300">
                    {t("landing_demo_poll_options_title")}
                </p>
                <span className="text-[10px] font-bold uppercase tracking-widest text-purple-500">
                    {total} {t("landing_demo_poll_votes_suffix")}
                </span>
            </div>
            <div className="flex flex-col gap-2">
                {event.pollOptions.map((option) => {
                    const pct = total > 0 ? Math.round((option.votes / total) * 100) : 0;
                    return (
                        <div key={option.id} className={`relative rounded-xl border ${option.leading ? "border-purple-300 dark:border-purple-500/60 bg-white/70 dark:bg-purple-900/20" : "border-black/5 dark:border-white/10 bg-white/60 dark:bg-black/20"} p-3 overflow-hidden`}>
                            <div
                                className="absolute inset-y-0 left-0 bg-gradient-to-r from-purple-200/60 to-transparent dark:from-purple-500/25 transition-all duration-500"
                                style={{ width: `${pct}%` }}
                                aria-hidden="true"
                            />
                            <div className="relative flex items-center justify-between gap-3">
                                <div className="flex items-center gap-2 min-w-0">
                                    <Icon name="calendar" className="w-3.5 h-3.5 text-purple-600 dark:text-purple-300 shrink-0" />
                                    <span className="text-sm font-bold text-gray-900 dark:text-white truncate">
                                        {formatDayLabel(option.startAt, language)}
                                    </span>
                                    {option.leading && (
                                        <span className="px-1.5 py-0.5 rounded bg-purple-600 text-white text-[9px] font-black uppercase tracking-wider shrink-0">
                                            {t("landing_demo_poll_leading")}
                                        </span>
                                    )}
                                </div>
                                <span className="text-xs font-bold text-purple-700 dark:text-purple-300 whitespace-nowrap">
                                    {option.votes} · {pct}%
                                </span>
                            </div>
                        </div>
                    );
                })}
            </div>
        </section>
    );
}

function BudgetPanel({ budget, language, t }) {
    const spent = formatCurrency(budget.spent, budget.currency, language);
    const total = formatCurrency(budget.total, budget.currency, language);
    const progress = Math.min(100, Math.round((budget.spent / budget.total) * 100));
    return (
        <section className="rounded-2xl p-4 border border-black/5 dark:border-white/10 bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/10 dark:to-indigo-900/10">
            <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] font-bold uppercase tracking-widest text-blue-700 dark:text-blue-300">
                    {t("landing_demo_budget_title")}
                </span>
                <span className="text-sm font-bold text-gray-900 dark:text-white">
                    {spent}
                    <span className="text-gray-400 dark:text-gray-500 font-medium"> / {total}</span>
                </span>
            </div>
            <div className="w-full h-2 rounded-full bg-blue-100 dark:bg-blue-900/30 overflow-hidden">
                <div
                    className="h-full bg-gradient-to-r from-blue-500 to-indigo-600 transition-all duration-500"
                    style={{ width: `${progress}%` }}
                />
            </div>
        </section>
    );
}

export default function InteractiveDemo({ t, language }) {
    const [activeKind, setActiveKind] = useState(demoScenarios[0].kind);
    const event = useMemo(
        () => demoScenarios.find((s) => s.kind === activeKind) || demoScenarios[0],
        [activeKind]
    );

    const title = useMemo(() => pickLocalized(event.titleByLang, language), [event.titleByLang, language]);
    const locationName = useMemo(() => pickLocalized(event.location.nameByLang, language), [event.location.nameByLang, language]);
    const locationCity = useMemo(() => pickLocalized(event.location.cityByLang, language), [event.location.cityByLang, language]);
    const vibe = useMemo(() => pickLocalized(event.vibeByLang, language), [event.vibeByLang, language]);

    const isVoting = event.kind === "voting_poll";

    return (
        <div className="w-full flex flex-col items-center">
            <div
                role="tablist"
                aria-label={t("landing_demo_scenarios_label")}
                className="w-full max-w-3xl flex overflow-x-auto gap-1 p-1 mb-6 rounded-full bg-black/5 dark:bg-white/5 border border-black/5 dark:border-white/10 backdrop-blur-sm"
            >
                {demoScenarios.map((s) => {
                    const active = activeKind === s.kind;
                    return (
                        <button
                            key={s.kind}
                            type="button"
                            role="tab"
                            aria-selected={active}
                            onClick={() => setActiveKind(s.kind)}
                            className={`flex items-center gap-1.5 px-3 md:px-4 py-2 rounded-full text-xs md:text-sm font-bold transition-all duration-200 cursor-pointer whitespace-nowrap shrink-0 ${
                                active
                                    ? "bg-white dark:bg-gray-800 text-gray-900 dark:text-white shadow-sm"
                                    : "text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white"
                            }`}
                        >
                            <Icon name={s.scenarioIcon} className="w-3.5 h-3.5 shrink-0" />
                            {t(s.scenarioKey)}
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
                                    {title}
                                </h3>
                                <p className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs md:text-sm font-medium text-gray-500 dark:text-gray-400">
                                    <DateHeadline event={event} language={language} t={t} />
                                    <span className="inline-flex items-center gap-1.5">
                                        <Icon name="location" className="w-3.5 h-3.5 shrink-0" />
                                        {locationName} · {locationCity}
                                    </span>
                                </p>
                            </div>
                            <div className="flex flex-col items-end gap-1.5 shrink-0">
                                <span className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border whitespace-nowrap ${event.accentChip.className}`}>
                                    {t(event.accentChip.labelKey)}
                                </span>
                                <StateBadge stateKey={event.stateKey} t={t} />
                            </div>
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

                    {event.kind === "date_range" && <DateRangeStrip event={event} language={language} t={t} />}

                    {isVoting ? (
                        <VotingPanel event={event} language={language} t={t} />
                    ) : (
                        <>
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                                <KpiTile
                                    label={t("landing_demo_label_invited")}
                                    value={event.stats.invited}
                                    iconName="users"
                                    accent="blue"
                                />
                                <KpiTile
                                    label={t("landing_demo_label_confirmed")}
                                    value={event.stats.confirmed}
                                    iconName="check"
                                    accent="green"
                                    valueClassName="text-green-600 dark:text-green-400"
                                />
                                <KpiTile
                                    label={t("landing_demo_label_pending")}
                                    value={event.stats.pending}
                                    iconName="clock"
                                    accent="amber"
                                />
                                <KpiTile
                                    label={t("landing_demo_label_allergies")}
                                    value={event.stats.allergies}
                                    iconName="utensils"
                                    accent="orange"
                                />
                            </div>

                            <section>
                                <p className="text-[10px] font-bold uppercase tracking-widest text-gray-500 dark:text-gray-400 mb-3">
                                    {t("landing_demo_guest_list_title")}
                                </p>
                                <ul className="flex flex-col divide-y divide-black/5 dark:divide-white/5 rounded-2xl border border-black/5 dark:border-white/10 bg-gray-50/60 dark:bg-black/20">
                                    {event.guests.map((guest) => (
                                        <GuestRosterRow
                                            key={guest.id}
                                            name={guest.name}
                                            hint={guest.department || guest.allergy}
                                            status={guest.status}
                                            statusLabel={t(GUEST_STATUS_LABEL_KEY[guest.status] || GUEST_STATUS_LABEL_KEY.pending)}
                                            plusOne={guest.plusOne}
                                        />
                                    ))}
                                </ul>
                            </section>
                        </>
                    )}

                    {event.budget && <BudgetPanel budget={event.budget} language={language} t={t} />}

                    <footer className="pt-2 border-t border-black/5 dark:border-white/5">
                        <p className="text-xs font-medium text-gray-500 dark:text-gray-400 italic">
                            {vibe}
                        </p>
                    </footer>
                </div>
            </div>
        </div>
    );
}
