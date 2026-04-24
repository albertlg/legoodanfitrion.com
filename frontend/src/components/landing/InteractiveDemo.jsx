import React, { useMemo, useState } from "react";
import { Icon } from "../icons";
import { MagicCard } from "../../screens/dashboard/components/ui/magic-card";
import { EventKpiTile } from "../dashboard/presentational/EventKpiTile";
import { GuestRosterRow } from "../dashboard/presentational/GuestRosterRow";
import { VIEW_CONFIG } from "../../lib/constants";
import { demoScenarios, pickLocalized } from "../../data/demo-events";

function formatDateTime(iso, language) {
    try {
        const d = new Date(iso);
        if (Number.isNaN(d.getTime())) return "";
        return new Intl.DateTimeFormat(language || "es", {
            day: "numeric",
            month: "long",
            year: "numeric"
        }).format(d);
    } catch {
        return "";
    }
}

function formatTimeLabel(iso, language) {
    try {
        const d = new Date(iso);
        if (Number.isNaN(d.getTime())) return "";
        return new Intl.DateTimeFormat(language || "es", {
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

// Usa los MISMOS i18n keys que el event-detail-view real (status_yes/pending/no),
// no los custom landing_demo_status_*. Así la demo y la app hablan el mismo idioma.
const GUEST_STATUS_LABEL_KEY = {
    confirmed: "status_yes",
    pending: "status_pending",
    declined: "status_no"
};

const STATE_CONFIG = {
    landing_demo_state_confirming: { iconName: "activity", className: "bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800/40" },
    landing_demo_state_voting: { iconName: "check", className: "bg-purple-50 dark:bg-purple-900/20 text-purple-700 dark:text-purple-300 border-purple-200 dark:border-purple-800/40" },
    landing_demo_state_finalized: { iconName: "check", className: "bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300 border-green-200 dark:border-green-800/40" }
};

function StateBadge({ stateKey, t }) {
    const config = STATE_CONFIG[stateKey] || STATE_CONFIG.landing_demo_state_confirming;
    return (
        <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wide border whitespace-nowrap ${config.className}`}>
            <Icon name={config.iconName} className="w-3 h-3" />
            {t(stateKey)}
        </span>
    );
}

// Fondo "mapa" CSS-only: gradiente + grid + pins. Sin dependencias externas.
function MapBackdrop() {
    return (
        <div className="absolute inset-0 overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-slate-200 via-blue-100 to-emerald-50 dark:from-slate-800 dark:via-slate-900 dark:to-emerald-950" />
            <div
                className="absolute inset-0 opacity-30 dark:opacity-20"
                style={{
                    backgroundImage:
                        "linear-gradient(rgba(100,116,139,0.35) 1px, transparent 1px), linear-gradient(90deg, rgba(100,116,139,0.35) 1px, transparent 1px)",
                    backgroundSize: "28px 28px"
                }}
                aria-hidden="true"
            />
            <div className="absolute top-[18%] left-[22%] w-24 h-24 rounded-full bg-emerald-300/40 dark:bg-emerald-600/20 blur-2xl" aria-hidden="true" />
            <div className="absolute bottom-[16%] right-[24%] w-32 h-32 rounded-full bg-blue-300/40 dark:bg-blue-700/25 blur-2xl" aria-hidden="true" />
            <div className="absolute left-[46%] top-[52%] w-5 h-5" aria-hidden="true">
                <Icon name="location" className="w-5 h-5 text-red-500 drop-shadow-md" />
            </div>
        </div>
    );
}

function EventHeroCover({ event, title, locationName, locationCity, language, t }) {
    const dateLabel = event.kind === "voting_poll" ? t("landing_demo_poll_pending_date") : formatDateTime(event.startAt, language);
    const timeLabel = event.kind === "voting_poll" ? null : formatTimeLabel(event.startAt, language);
    return (
        <article className="relative w-full h-[14rem] sm:h-[16rem] rounded-2xl overflow-hidden shadow-inner">
            <MapBackdrop />
            <div className="absolute inset-0 bg-gradient-to-t from-white via-white/85 to-transparent dark:from-gray-900 dark:via-gray-900/85 dark:to-transparent" aria-hidden="true" />
            <div className="relative z-10 h-full flex flex-col justify-end p-4 sm:p-5">
                <div className="flex flex-wrap gap-1.5 mb-2">
                    <StateBadge stateKey={event.stateKey} t={t} />
                    <span className={`px-2 py-0.5 rounded-lg text-[10px] font-bold uppercase tracking-wide border whitespace-nowrap ${event.accentChip.className}`}>
                        {t(event.accentChip.labelKey)}
                    </span>
                </div>
                <h3 className="[font-family:var(--font-display)] text-lg sm:text-xl md:text-2xl font-black text-gray-900 dark:text-white tracking-tight mb-2 truncate">
                    {title}
                </h3>
                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] sm:text-xs font-medium text-gray-700 dark:text-gray-300">
                    <span className="flex items-center gap-1">
                        <Icon name="calendar" className="w-3.5 h-3.5" />
                        {dateLabel}
                    </span>
                    {timeLabel ? (
                        <span className="flex items-center gap-1">
                            <Icon name="clock" className="w-3.5 h-3.5" />
                            {timeLabel}
                        </span>
                    ) : null}
                    <span className="flex items-center gap-1">
                        <Icon name="location" className="w-3.5 h-3.5" />
                        <span className="truncate max-w-[180px] sm:max-w-xs">{locationName} · {locationCity}</span>
                    </span>
                </div>
            </div>
        </article>
    );
}

function DateRangeStrip({ event, language, t }) {
    const start = new Date(event.startAt);
    const end = new Date(event.endAt);
    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return null;
    const nights = Math.max(1, Math.round((end - start) / (1000 * 60 * 60 * 24)));
    return (
        <section className="rounded-2xl border border-black/5 dark:border-white/10 bg-gradient-to-br from-emerald-50 to-teal-50 dark:from-emerald-900/10 dark:to-teal-900/10 p-3 flex items-center gap-3">
            <div className="flex flex-col items-center rounded-xl bg-white/80 dark:bg-gray-900/60 px-3 py-2 shadow-sm border border-black/5 dark:border-white/10 min-w-[74px]">
                <span className="text-[9px] font-bold uppercase tracking-widest text-emerald-700 dark:text-emerald-300">{t("landing_demo_range_start")}</span>
                <span className="text-sm font-black text-gray-900 dark:text-white mt-0.5 whitespace-nowrap">{formatDayLabel(event.startAt, language)}</span>
            </div>
            <div className="flex-1 flex items-center justify-center gap-1.5 text-emerald-600 dark:text-emerald-300 text-[10px] font-bold uppercase tracking-widest">
                <Icon name="arrow_right" className="w-4 h-4 hidden sm:block" />
                <span className="whitespace-nowrap">{nights}{t("landing_demo_range_nights_suffix")}</span>
            </div>
            <div className="flex flex-col items-center rounded-xl bg-white/80 dark:bg-gray-900/60 px-3 py-2 shadow-sm border border-black/5 dark:border-white/10 min-w-[74px]">
                <span className="text-[9px] font-bold uppercase tracking-widest text-emerald-700 dark:text-emerald-300">{t("landing_demo_range_end")}</span>
                <span className="text-sm font-black text-gray-900 dark:text-white mt-0.5 whitespace-nowrap">{formatDayLabel(event.endAt, language)}</span>
            </div>
        </section>
    );
}

function VotingPanel({ event, language, t }) {
    const total = event.pollTotalVoters || event.pollOptions.reduce((acc, o) => acc + o.votes, 0);
    return (
        <article className="bg-white/80 dark:bg-gray-900/80 backdrop-blur-md rounded-xl border border-gray-200/80 dark:border-gray-700/80 ring-1 ring-black/5 dark:ring-white/10 shadow-sm overflow-hidden p-5 flex flex-col gap-4">
            <div className="flex items-center justify-between">
                <p className="text-sm font-bold text-gray-900 dark:text-white flex items-center gap-2">
                    <Icon name="check" className="w-4 h-4 text-purple-500" />
                    {t("landing_demo_poll_options_title")}
                </p>
                <span className="text-[10px] font-bold uppercase tracking-widest text-purple-600 dark:text-purple-300">
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
        </article>
    );
}

function PlannerIACard({ t }) {
    return (
        <MagicCard
            title={t("event_plan_cta_title")}
            subtitle={t("event_plan_cta_hint")}
            icon="sparkle"
            colorVariant="purple"
            onClick={() => { /* demo: no-op */ }}
        />
    );
}

function FinanceSelectorCard({ event, language, t }) {
    const modeLabelKey = event.kind === "corporate"
        ? "event_finance_mode_corporate_budget_label"
        : "event_finance_mode_split_tickets_label";
    const hasBudget = Boolean(event.budget);
    return (
        <article className="bg-white/80 dark:bg-gray-900/80 backdrop-blur-md rounded-xl border border-gray-200/80 dark:border-gray-700/80 ring-1 ring-black/5 dark:ring-white/10 shadow-sm overflow-hidden p-5 flex flex-col gap-3">
            <header className="flex items-center gap-2">
                <Icon name="activity" className="w-4 h-4 text-emerald-500" />
                <h4 className="text-sm font-bold text-gray-900 dark:text-white">{t("event_finance_title")}</h4>
            </header>
            <p className="text-[11px] text-gray-500 dark:text-gray-400 leading-relaxed">
                {t("event_finance_hint")}
            </p>
            <div className="flex flex-col gap-1.5">
                <span className="text-[10px] font-bold uppercase tracking-widest text-gray-500 dark:text-gray-400">
                    {t("event_finance_mode_label")}
                </span>
                <div className="flex items-center justify-between gap-2 px-3 py-2.5 rounded-xl border border-black/10 dark:border-white/10 bg-white dark:bg-gray-800 shadow-sm">
                    <span className="text-sm font-bold text-gray-900 dark:text-white truncate">
                        {t(modeLabelKey)}
                    </span>
                    <Icon name="chevron_down" className="w-4 h-4 text-gray-400 shrink-0" />
                </div>
            </div>
            {hasBudget ? (
                <div className="mt-1 rounded-xl p-3 border border-black/5 dark:border-white/10 bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/15 dark:to-indigo-900/15">
                    <div className="flex items-center justify-between mb-1.5">
                        <span className="text-[9px] font-bold uppercase tracking-widest text-blue-700 dark:text-blue-300">
                            {t("landing_demo_budget_title")}
                        </span>
                        <span className="text-xs font-bold text-gray-900 dark:text-white">
                            {formatCurrency(event.budget.spent, event.budget.currency, language)}
                            <span className="text-gray-400 dark:text-gray-500 font-medium"> / {formatCurrency(event.budget.total, event.budget.currency, language)}</span>
                        </span>
                    </div>
                    <div className="w-full h-1.5 rounded-full bg-blue-100 dark:bg-blue-900/30 overflow-hidden">
                        <div
                            className="h-full bg-gradient-to-r from-blue-500 to-indigo-600 transition-all duration-500"
                            style={{ width: `${Math.min(100, Math.round((event.budget.spent / event.budget.total) * 100))}%` }}
                        />
                    </div>
                </div>
            ) : null}
        </article>
    );
}

function GuestActionButtons() {
    return (
        <>
            <button
                type="button"
                className="inline-flex items-center justify-center w-7 h-7 rounded-lg border border-black/10 dark:border-white/10 bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                aria-label="Reenviar invitación"
                tabIndex={-1}
            >
                <Icon name="mail" className="w-3.5 h-3.5" />
            </button>
            <button
                type="button"
                className="inline-flex items-center justify-center w-7 h-7 rounded-lg bg-green-500/90 text-white hover:bg-green-600 transition-colors"
                aria-label="Mensaje directo"
                tabIndex={-1}
            >
                <Icon name="message" className="w-3.5 h-3.5" />
            </button>
            <button
                type="button"
                className="inline-flex items-center justify-center w-7 h-7 rounded-lg border border-red-200 dark:border-red-800/50 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/30 transition-colors"
                aria-label="Quitar invitado"
                tabIndex={-1}
            >
                <Icon name="trash" className="w-3.5 h-3.5" />
            </button>
        </>
    );
}

function GuestListCard({ event, t }) {
    return (
        <article id="event-invitations" className="order-2 bg-white/80 dark:bg-gray-900/80 backdrop-blur-md rounded-xl border border-gray-200/80 dark:border-gray-700/80 ring-1 ring-black/5 dark:ring-white/10 shadow-sm overflow-hidden p-5 flex flex-col gap-4">
            <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <h4 className="text-sm font-bold text-gray-900 dark:text-white flex items-center gap-2">
                    <Icon name="users" className="w-4 h-4 text-blue-500" />
                    {t("event_detail_guest_list_title")}
                </h4>
                <div className="flex items-center gap-2">
                    <button type="button" tabIndex={-1} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-bold bg-blue-600 hover:bg-blue-700 text-white shadow-sm transition-colors">
                        <Icon name="plus" className="w-3.5 h-3.5" />
                        {t("field_guest")}
                    </button>
                </div>
            </header>
            <ul className="flex flex-col divide-y divide-black/5 dark:divide-white/5 rounded-xl border border-black/5 dark:border-white/10 bg-gray-50/60 dark:bg-black/20">
                {event.guests.map((guest) => (
                    <GuestRosterRow
                        key={guest.id}
                        name={guest.name}
                        hint={guest.department || guest.allergy}
                        status={guest.status}
                        statusLabel={t(GUEST_STATUS_LABEL_KEY[guest.status] || GUEST_STATUS_LABEL_KEY.pending)}
                        plusOne={guest.plusOne}
                        actions={<GuestActionButtons />}
                    />
                ))}
            </ul>
        </article>
    );
}

// 🚀 Mock del App Shell — réplica visual del DashboardLayout real (sidebar + main).
function MockAppShell({ t, children }) {
    return (
        <article className="w-full max-w-5xl bg-gray-50 dark:bg-black border border-black/10 dark:border-white/10 rounded-3xl shadow-2xl shadow-black/10 dark:shadow-black/40 overflow-hidden">
            <div className="px-4 md:px-5 py-3 border-b border-black/5 dark:border-white/5 flex items-center gap-3 bg-slate-100/60 dark:bg-gray-900/70 backdrop-blur-xl">
                <div className="flex gap-1.5 shrink-0">
                    <span className="w-2.5 h-2.5 rounded-full bg-red-400/70" />
                    <span className="w-2.5 h-2.5 rounded-full bg-yellow-400/70" />
                    <span className="w-2.5 h-2.5 rounded-full bg-green-400/70" />
                </div>
                <div className="flex-1 flex justify-center min-w-0">
                    <div className="px-3 py-1 rounded-md bg-white/70 dark:bg-white/5 border border-black/5 dark:border-white/10 text-[10px] font-medium text-gray-500 dark:text-gray-400 truncate max-w-[260px]">
                        legoodanfitrion.com/app
                    </div>
                </div>
                <div className="w-12 shrink-0" aria-hidden="true" />
            </div>

            <div className="flex min-h-[620px] bg-gray-50 dark:bg-black">
                <aside className="hidden sm:flex flex-col w-40 md:w-48 shrink-0 border-r border-white/60 dark:border-white/10 bg-slate-100/50 dark:bg-gray-900/50 backdrop-blur-2xl">
                    <div className="px-4 py-4 border-b border-black/5 dark:border-white/5">
                        <div className="flex items-center gap-2 min-w-0">
                            <div className="w-7 h-7 rounded-xl bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center text-white text-[10px] font-black shadow-sm shrink-0">
                                LG
                            </div>
                            <div className="flex flex-col leading-tight min-w-0">
                                <span className="text-[11px] font-black text-gray-900 dark:text-white truncate">LeGoodAnfitrión</span>
                                <span className="text-[9px] font-bold uppercase tracking-widest text-gray-400 dark:text-gray-500">{t("panel_title")}</span>
                            </div>
                        </div>
                    </div>
                    <nav className="flex-1 p-2.5 flex flex-col gap-1" aria-hidden="true">
                        {VIEW_CONFIG.map((item, idx) => {
                            const active = idx === 1; // Eventos activo
                            return (
                                <div
                                    key={item.key}
                                    className={`flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-xs font-bold transition-colors ${active
                                        ? "bg-black/5 dark:bg-white/10 text-gray-900 dark:text-white shadow-sm"
                                        : "text-gray-500 dark:text-gray-400"
                                        }`}
                                >
                                    <Icon name={item.icon} className={`w-3.5 h-3.5 shrink-0 ${active ? "text-blue-500 dark:text-blue-400" : ""}`} />
                                    <span className="truncate">{t(item.labelKey)}</span>
                                </div>
                            );
                        })}
                    </nav>
                    <div className="mt-auto p-3 border-t border-black/5 dark:border-white/5 flex items-center gap-2">
                        <div className="w-6 h-6 rounded-full bg-gradient-to-br from-pink-400 to-orange-400 shrink-0 border border-black/5 dark:border-white/10" aria-hidden="true" />
                        <span className="text-[10px] font-bold text-gray-600 dark:text-gray-300 truncate">Albert L.</span>
                    </div>
                </aside>

                <div className="flex-1 flex flex-col min-w-0">
                    <header className="hidden sm:flex flex-none h-12 border-b border-white/60 dark:border-white/10 bg-slate-100/60 dark:bg-gray-900/70 backdrop-blur-xl items-center px-5">
                        <span className="text-[10px] font-bold uppercase tracking-widest text-blue-600 dark:text-blue-400">{t("nav_events")}</span>
                    </header>
                    <main className="flex-1 p-4 md:p-6 min-w-0">
                        {children}
                    </main>
                </div>
            </div>
        </article>
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
                            className={`flex items-center gap-1.5 px-3 md:px-4 py-2 rounded-full text-xs md:text-sm font-bold transition-all duration-200 cursor-pointer whitespace-nowrap shrink-0 ${active
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

            <MockAppShell t={t}>
                <div key={event.id} className="flex flex-col gap-5 animate-in fade-in zoom-in-95 duration-300">
                    {/* Outer event detail wrapper — same className pattern as event-detail-view */}
                    <section className="bg-white/50 dark:bg-gray-900/50 backdrop-blur-xl border border-black/10 dark:border-white/10 rounded-3xl shadow-sm p-4 md:p-5 flex flex-col gap-5">
                        <EventHeroCover
                            event={event}
                            title={title}
                            locationName={locationName}
                            locationCity={locationCity}
                            language={language}
                            t={t}
                        />

                        {event.dietaryFlags && event.dietaryFlags.length > 0 ? (
                            <div className="flex flex-wrap gap-1.5">
                                {event.dietaryFlags.map((flag) => (
                                    <span key={flag} className="px-2 py-0.5 rounded-md bg-orange-50 dark:bg-orange-900/20 text-orange-700 dark:text-orange-300 border border-orange-200 dark:border-orange-800/30 text-[10px] font-bold uppercase tracking-wider">
                                        {flag}
                                    </span>
                                ))}
                            </div>
                        ) : null}

                        {event.kind === "date_range" ? <DateRangeStrip event={event} language={language} t={t} /> : null}

                        {isVoting ? null : (
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
                                <EventKpiTile label={t("event_detail_total_invites")} value={event.stats.invited} />
                                <EventKpiTile label={t("status_yes")} value={event.stats.confirmed} valueClassName="text-green-600 dark:text-green-400" />
                                <EventKpiTile label={t("status_pending")} value={event.stats.pending} valueClassName="text-yellow-600 dark:text-yellow-400" />
                                <EventKpiTile label={t("status_no")} value={Math.max(0, event.stats.invited - event.stats.confirmed - event.stats.pending)} valueClassName="text-red-600 dark:text-red-400" />
                            </div>
                        )}

                        <div className="flex flex-col lg:grid lg:grid-cols-[minmax(0,2.05fr)_minmax(0,1fr)] gap-5">
                            <div className="flex flex-col gap-4 min-w-0">
                                {isVoting ? (
                                    <VotingPanel event={event} language={language} t={t} />
                                ) : (
                                    <GuestListCard event={event} t={t} />
                                )}
                            </div>
                            <div className="flex flex-col gap-4">
                                <PlannerIACard t={t} />
                                <FinanceSelectorCard event={event} language={language} t={t} />
                            </div>
                        </div>
                    </section>
                </div>
            </MockAppShell>
        </div>
    );
}
