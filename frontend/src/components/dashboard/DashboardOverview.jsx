import { Icon } from "../icons";
import { AvatarCircle } from "../avatar-circle";

export function DashboardOverview({
    t,
    openWorkspace,
    events,
    latestEventPreview,
    guests,
    latestGuestPreview,
    invitations,
    pendingInvites,
    pendingInvitationPreview,
    respondedInvitesRate,
    respondedInvites,
    answeredInvitationPreview,
    upcomingEventsPreview,
    openEventDetail,
    interpolateText,
    statusClass,
    statusText,
    hostDisplayName,
    hostInitials,
    hostAvatarUrl,
    convertedHostRate,
    hostMemberSinceLabel,
    hostRatingScore,
    recentActivityItems,
    hostPotentialGuestsCount,
    invitedPotentialHostsCount,
    convertedHostGuestsCount,
    conversionWindowCounts,
    conversionTrend14d,
    conversionTrendMax,
}) {
    // Clases base para el Glassmorphism
    const glassPanelClass = "bg-white/50 dark:bg-white/5 rounded-2xl border border-black/5 dark:border-white/10 shadow-sm p-5 md:p-6 transition-all";
    const glassInteractiveClass = "is-interactive hover:bg-white/60 dark:hover:bg-gray-800/60 hover:shadow-md cursor-pointer";
    const textPrimaryClass = "text-gray-900 dark:text-white";
    const textSecondaryClass = "text-gray-500 dark:text-gray-400";

    return (
        <section className="max-w-6xl mx-auto w-full flex flex-col view-transition">
            <div className="overview-kpi-grid grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                <article
                    className={`${glassPanelClass} flex flex-col gap-2 ${glassInteractiveClass}`}
                    tabIndex={0}
                    role="button"
                    onClick={() => openWorkspace("events", "latest")}
                    onKeyDown={(event) => {
                        if (event.key === "Enter" || event.key === " ") {
                            event.preventDefault();
                            openWorkspace("events", "latest");
                        }
                    }}
                >
                    <div className="kpi-card-head">
                        <p className={`hint ${textSecondaryClass}`}>{t("kpi_events")}</p>
                        <span className="kpi-card-icon" aria-hidden="true">
                            <Icon name="calendar" className="icon" />
                        </span>
                    </div>
                    <p className={`kpi-value ${textPrimaryClass}`}>{events.length}</p>
                    <p className={`kpi-inline-meta ${textSecondaryClass}`}>{latestEventPreview[0]?.meta || t("kpi_latest_events")}</p>
                </article>
                <article
                    className={`${glassPanelClass} flex flex-col gap-2 ${glassInteractiveClass}`}
                    tabIndex={0}
                    role="button"
                    onClick={() => openWorkspace("guests", "latest")}
                    onKeyDown={(event) => {
                        if (event.key === "Enter" || event.key === " ") {
                            event.preventDefault();
                            openWorkspace("guests", "latest");
                        }
                    }}
                >
                    <div className="kpi-card-head">
                        <p className={`hint ${textSecondaryClass}`}>{t("kpi_guests")}</p>
                        <span className="kpi-card-icon" aria-hidden="true">
                            <Icon name="user" className="icon" />
                        </span>
                    </div>
                    <p className={`kpi-value ${textPrimaryClass}`}>{guests.length}</p>
                    <p className={`kpi-inline-meta ${textSecondaryClass}`}>{latestGuestPreview[0]?.main || t("kpi_latest_guests")}</p>
                </article>
                <article
                    className={`${glassPanelClass} flex flex-col gap-2 ${glassInteractiveClass}`}
                    tabIndex={0}
                    role="button"
                    onClick={() => openWorkspace("invitations", "latest")}
                    onKeyDown={(event) => {
                        if (event.key === "Enter" || event.key === " ") {
                            event.preventDefault();
                            openWorkspace("invitations", "latest");
                        }
                    }}
                >
                    <div className="kpi-card-head">
                        <p className={`hint ${textSecondaryClass}`}>{t("latest_invitations_title")}</p>
                        <span className="kpi-card-icon" aria-hidden="true">
                            <Icon name="mail" className="icon" />
                        </span>
                    </div>
                    <p className={`kpi-value ${textPrimaryClass}`}>{invitations.length}</p>
                    <p className={`kpi-inline-meta ${textSecondaryClass}`}>
                        {pendingInvitationPreview[0]?.main || `${t("kpi_pending_rsvp")}: ${pendingInvites}`}
                    </p>
                </article>
                <article
                    className={`${glassPanelClass} flex flex-col gap-2 ${glassInteractiveClass}`}
                    tabIndex={0}
                    role="button"
                    onClick={() => openWorkspace("invitations", "latest")}
                    onKeyDown={(event) => {
                        if (event.key === "Enter" || event.key === " ") {
                            event.preventDefault();
                            openWorkspace("invitations", "latest");
                        }
                    }}
                >
                    <div className="kpi-card-head">
                        <p className={`hint ${textSecondaryClass}`}>{t("kpi_answered_rsvp")}</p>
                        <span className="kpi-card-icon" aria-hidden="true">
                            <Icon name="check" className="icon" />
                        </span>
                    </div>
                    <p className={`kpi-value ${textPrimaryClass}`}>{respondedInvitesRate}%</p>
                    <p className={`kpi-inline-meta ${textSecondaryClass}`}>
                        {answeredInvitationPreview[0]?.main || `${t("kpi_answered_rsvp")}: ${respondedInvites}`}
                    </p>
                </article>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
                
                {/* COLUMNA IZQUIERDA (Ocupa 2/3 del espacio) */}
                <div className="lg:col-span-2 flex flex-col gap-6">
                    <article className={`${glassPanelClass} flex flex-col gap-2`}>
                        <div className="overview-upcoming-head">
                            <div>
                                <h2 className={`section-title ${textPrimaryClass}`}>
                                    <Icon name="calendar" className="icon" />
                                    {t("overview_upcoming_title")}
                                </h2>
                                <p className={`field-help ${textSecondaryClass}`}>{t("overview_upcoming_hint")}</p>
                            </div>
                            <button className={`btn btn-ghost btn-sm ${textPrimaryClass}`} type="button" onClick={() => openWorkspace("events", "latest")}>
                                {t("overview_upcoming_open")}
                            </button>
                        </div>
                        {upcomingEventsPreview.length === 0 ? (
                            <p className={`hint ${textSecondaryClass}`}>{t("overview_upcoming_empty")}</p>
                        ) : (
                            <ul className="overview-upcoming-list flex flex-col divide-y divide-black/5 dark:divide-white/10 mt-4">
                                {upcomingEventsPreview.map((eventItem) => (
                                    <li
                                        key={`upcoming-${eventItem.id}`}
                                        className={`overview-upcoming-item py-4 flex justify-between items-center ${glassInteractiveClass}`}
                                        tabIndex={0}
                                        role="button"
                                        onClick={() => openEventDetail(eventItem.id)}
                                        onKeyDown={(event) => {
                                            if (event.key === "Enter" || event.key === " ") {
                                                event.preventDefault();
                                                openEventDetail(eventItem.id);
                                            }
                                        }}
                                    >
                                        <div className="overview-upcoming-main">
                                            <p className={`item-title font-medium ${textPrimaryClass}`}>{eventItem.title}</p>
                                            <p className={`item-meta text-xs mt-1 ${textSecondaryClass}`}>
                                                {eventItem.date} · {interpolateText(t("overview_upcoming_guests"), { count: eventItem.guests })}
                                            </p>
                                        </div>
                                        <div className="overview-upcoming-meta">
                                            <span className={`status-pill ${statusClass(eventItem.status)}`}>{statusText(t, eventItem.status)}</span>
                                        </div>
                                    </li>
                                ))}
                            </ul>
                        )}
                    </article>

                    <article className={`${glassPanelClass} flex flex-col gap-2`}>
                        <h2 className={`section-title ${textPrimaryClass}`}>
                            <Icon name="bell" className="icon" />
                            {t("recent_activity_title")}
                        </h2>
                        <p className={`field-help ${textSecondaryClass}`}>{t("recent_activity_hint")}</p>
                        {recentActivityItems.length === 0 ? (
                            <p className={`hint ${textSecondaryClass}`}>{t("recent_activity_empty")}</p>
                        ) : (
                            <ul className="recent-activity-list mt-3 flex flex-col divide-y divide-black/5 dark:divide-white/10">
                                {recentActivityItems.slice(0, 6).map((activityItem) => (
                                    <li key={activityItem.id} className="recent-activity-item flex items-start gap-3 py-4 hover:bg-black/5 dark:hover:bg-white/5 transition-colors">
                                        <span className={`status-pill ${statusClass(activityItem.status)} flex-shrink-0 mt-0.5`}>
                                            <Icon name={activityItem.icon} className="icon icon-xs" />
                                        </span>
                                        <div>
                                            <p className={`item-title text-sm font-medium ${textPrimaryClass}`}>{activityItem.title}</p>
                                            <p className={`item-meta text-xs ${textPrimaryClass}`}>{activityItem.meta}</p>
                                            <p className={`hint text-[10px] mt-1 ${textSecondaryClass}`}>{activityItem.timeLabel}</p>
                                        </div>
                                    </li>
                                ))}
                            </ul>
                        )}
                    </article>
                </div>

                {/* COLUMNA DERECHA (Ocupa 1/3 del espacio) */}
                <div className="lg:col-span-1 flex flex-col gap-6">
                    <article className={`${glassPanelClass} flex flex-col gap-4`}>
                        <div className="host-profile-snapshot">
                            <AvatarCircle
                                className="session-avatar"
                                label={hostDisplayName}
                                fallback={hostInitials}
                                imageUrl={hostAvatarUrl}
                                size={38}
                            />
                            <div>
                                <p className={`item-title ${textPrimaryClass}`}>{hostDisplayName}</p>
                                <p className={`field-help ${textSecondaryClass}`}>{t("panel_title")}</p>
                            </div>
                        </div>
                        <div className="host-rating-metrics">
                            <p className={`item-meta ${textSecondaryClass}`}>
                                <span>{t("host_rating_metric_completed")}</span>
                                <strong className={textPrimaryClass}>{events.filter((eventItem) => eventItem.status === "completed").length}</strong>
                            </p>
                            <p className={`item-meta ${textSecondaryClass}`}>
                                <span>{t("host_rating_metric_response")}</span>
                                <strong className={textPrimaryClass}>{respondedInvitesRate}%</strong>
                            </p>
                            <p className={`item-meta ${textSecondaryClass}`}>
                                <span>{t("host_rating_metric_growth")}</span>
                                <strong className={textPrimaryClass}>{convertedHostRate}%</strong>
                            </p>
                            <p className={`item-meta ${textSecondaryClass}`}>
                                <span>{t("host_rating_since_label")}</span>
                                <strong className={textPrimaryClass}>{hostMemberSinceLabel}</strong>
                            </p>
                        </div>
                        <p className={`host-rating-score-inline font-bold ${textPrimaryClass}`}>
                            <Icon name="star" className="icon icon-sm text-yellow-500" /> {hostRatingScore}/5
                        </p>
                    </article>
                </div>
            </div>

            <article className={`${glassPanelClass} flex flex-col gap-2 mb-6`}>
                <h2 className={`section-title ${textPrimaryClass}`}>
                    <Icon name="trend" className="icon" />
                    {t("growth_analytics_title")}
                </h2>
                <p className={`field-help ${textSecondaryClass}`}>{t("growth_analytics_hint")}</p>
                <div className="growth-funnel-grid grid grid-cols-2 md:grid-cols-4 gap-4 mt-6">
                    <article className="growth-metric-card bg-white/50 dark:bg-white/5 rounded-2xl border border-black/5 dark:border-white/10 shadow-sm p-5 md:p-6 flex flex-col gap-1">
                        <p className={`hint !text-xs mb-1 ${textSecondaryClass}`}>{t("growth_funnel_potential")}</p>
                        <p className={`kpi-value text-2xl font-bold ${textPrimaryClass}`}>{hostPotentialGuestsCount}</p>
                    </article>
                    <article className="growth-metric-card bg-white/50 dark:bg-white/5 rounded-2xl border border-black/5 dark:border-white/10 shadow-sm p-5 md:p-6 flex flex-col gap-1">
                        <p className={`hint !text-xs mb-1 ${textSecondaryClass}`}>{t("growth_funnel_invited")}</p>
                        <p className={`kpi-value text-2xl font-bold ${textPrimaryClass}`}>{invitedPotentialHostsCount}</p>
                    </article>
                    <article className="growth-metric-card bg-white/50 dark:bg-white/5 rounded-2xl border border-black/5 dark:border-white/10 shadow-sm p-5 md:p-6 flex flex-col gap-1">
                        <p className={`hint !text-xs mb-1 ${textSecondaryClass}`}>{t("growth_funnel_converted")}</p>
                        <p className={`kpi-value text-2xl font-bold ${textPrimaryClass}`}>{convertedHostGuestsCount}</p>
                    </article>
                    <article className="growth-metric-card bg-white/50 dark:bg-white/5 rounded-2xl border border-black/5 dark:border-white/10 shadow-sm p-5 md:p-6 flex flex-col gap-1">
                        <p className={`hint !text-xs mb-1 ${textSecondaryClass}`}>{t("growth_funnel_rate")}</p>
                        <p className={`kpi-value text-2xl font-bold text-blue-600 dark:text-blue-400`}>{convertedHostRate}%</p>
                    </article>
                </div>

                {/* Omitido el resto para simplificar por ahora si es necesario, 
                    o lo dejamos para mantener la integridad visual: */}
                <div className="growth-window-row mt-6 flex gap-2 flex-wrap">
                    <span className="status-pill status-host-conversion-source-default bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300">
                        {t("growth_window_7d")} {conversionWindowCounts.d7}
                    </span>
                    <span className="status-pill status-host-conversion-source-default bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300">
                        {t("growth_window_30d")} {conversionWindowCounts.d30}
                    </span>
                    <span className="status-pill status-host-conversion-source-default bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300">
                        {t("growth_window_90d")} {conversionWindowCounts.d90}
                    </span>
                </div>

                <div className="growth-trend-chart mt-6 flex items-end h-32 gap-1 bg-black/5 dark:bg-white/5 p-4 rounded-xl" role="img" aria-label={t("growth_trend_14d_label")}>
                    {conversionTrend14d.map((bucket) => {
                        const heightPercent = Math.max(8, Math.round((bucket.count / conversionTrendMax) * 100));
                        return (
                            <div key={bucket.key} className="growth-trend-column flex-1 flex flex-col items-center justify-end h-full gap-1 group">
                                <span className={`growth-trend-value text-[10px] opacity-0 group-hover:opacity-100 transition-opacity ${textPrimaryClass}`}>{bucket.count}</span>
                                <span className="growth-trend-bar w-full bg-blue-500/50 dark:bg-blue-400/50 rounded-t-sm group-hover:bg-blue-500 dark:group-hover:bg-blue-400 transition-colors" style={{ height: `${heightPercent}%` }} />
                                <span className={`growth-trend-label text-[9px] ${textSecondaryClass}`}>{bucket.label}</span>
                            </div>
                        );
                    })}
                </div>
            </article>

            <article className={`${glassPanelClass} flex flex-col gap-2 mb-6`}>
                <h2 className={`section-title ${textPrimaryClass}`}>
                    <Icon name="sparkle" className="icon" />
                    {t("hint_accessibility")}
                </h2>
                <p className={`field-help ${textSecondaryClass}`}>{t("overview_help")}</p>
                <p className={`field-help ${textSecondaryClass}`}>{t("content_translation_note")}</p>
            </article>
        </section>
    );
}
