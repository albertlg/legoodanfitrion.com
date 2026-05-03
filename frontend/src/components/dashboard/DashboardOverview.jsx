import { Icon } from "../icons";
import { AvatarCircle } from "../avatar-circle";
import { HostChecklistCard } from "./HostChecklistCard";
import { KpiTile } from "./presentational/KpiTile";
import { formatEventDateDisplay, interpolateText as interpolateTemplate } from "../../lib/formatters";

function DashboardOverviewSkeleton({ t }) {
    return (
        <section
            className="max-w-6xl mx-auto w-full flex flex-col animate-pulse"
            aria-label={t("dash_home_loading_sr")}
            role="status"
        >
            {/* Cabecera del Dashboard */}
            <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-8">
                <div className="space-y-3 w-full max-w-sm">
                    {/* Título */}
                    <div className="h-10 bg-gray-200 dark:bg-gray-800 rounded-xl w-3/4"></div>
                    {/* Subtítulo */}
                    <div className="h-4 bg-gray-200 dark:bg-gray-800 rounded-lg w-1/2"></div>
                </div>
                {/* Botón de crear (oculto visualmente pero ocupa espacio) */}
                <div className="h-10 bg-gray-200 dark:bg-gray-800 rounded-xl w-32 shrink-0"></div>
            </div>

            {/* Fila de 4 Tarjetas de KPIs — 2×2 en móvil */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 md:gap-4 lg:gap-6 mb-4 md:mb-8">
                {[1, 2, 3, 4].map((i) => (
                    <article key={i} className="bg-gray-100/50 dark:bg-gray-800/20 border border-black/5 dark:border-white/5 rounded-2xl md:rounded-[2rem] p-3 md:p-6 flex flex-col gap-2 md:gap-4">
                        <div className="flex justify-between items-start">
                            <div className="h-2.5 md:h-3 bg-gray-200 dark:bg-gray-800 rounded-lg w-1/3 mt-1"></div>
                            <div className="w-7 h-7 md:w-10 md:h-10 bg-gray-200 dark:bg-gray-800 rounded-xl md:rounded-2xl shrink-0"></div>
                        </div>
                        <div className="mt-auto space-y-1.5 md:space-y-2">
                            <div className="h-6 md:h-8 bg-gray-200 dark:bg-gray-800 rounded-xl w-1/3"></div>
                            <div className="hidden md:block h-3 bg-gray-200 dark:bg-gray-800 rounded-lg w-2/3"></div>
                        </div>
                    </article>
                ))}
            </div>

            {/* Columnas inferiores (Próximos eventos y Perfil) */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 md:gap-8 mb-8">
                {/* Columna Izquierda (Ocupa 2/3) */}
                <div className="lg:col-span-2 flex flex-col gap-6 md:gap-8">
                    <article className="bg-gray-100/50 dark:bg-gray-800/20 border border-black/5 dark:border-white/5 rounded-[2.5rem] p-6 md:p-8 h-80 flex flex-col gap-6">
                        <div className="h-6 bg-gray-200 dark:bg-gray-800 rounded-lg w-1/3"></div>
                        <div className="space-y-4 mt-4">
                            <div className="h-16 bg-gray-200 dark:bg-gray-800 rounded-2xl w-full"></div>
                            <div className="h-16 bg-gray-200 dark:bg-gray-800 rounded-2xl w-full"></div>
                            <div className="h-16 bg-gray-200 dark:bg-gray-800 rounded-2xl w-full"></div>
                        </div>
                    </article>
                </div>

                {/* Columna Derecha - Perfil (Ocupa 1/3) */}
                <div className="lg:col-span-1">
                    <article className="bg-gray-100/50 dark:bg-gray-800/20 border border-black/5 dark:border-white/5 rounded-[2.5rem] p-6 md:p-8 h-80 flex flex-col gap-6">
                        <div className="flex items-center gap-4">
                            <div className="w-16 h-16 bg-gray-200 dark:bg-gray-800 rounded-full shrink-0"></div>
                            <div className="space-y-2 w-full">
                                <div className="h-5 bg-gray-200 dark:bg-gray-800 rounded-lg w-3/4"></div>
                                <div className="h-3 bg-gray-200 dark:bg-gray-800 rounded-lg w-1/2"></div>
                            </div>
                        </div>
                        <div className="h-12 bg-gray-200 dark:bg-gray-800 rounded-2xl w-full mt-4"></div>
                        <div className="space-y-3 mt-4">
                            <div className="h-4 bg-gray-200 dark:bg-gray-800 rounded-lg w-full"></div>
                            <div className="h-4 bg-gray-200 dark:bg-gray-800 rounded-lg w-full"></div>
                        </div>
                    </article>
                </div>
            </div>

            {/* Texto de fallback invisible para accesibilidad */}
            <span className="sr-only">{t("dash_home_loading")}</span>
        </section>
    );
}

export function DashboardOverview({
    t,
    language,
    isLoading,
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
    receivedInvitations = [],
    openReceivedInvitationRsvp,
    dashboardHostChecklist,
}) {
    const formatInvitationDate = (startAt, endAt) =>
        formatEventDateDisplay({
            startAt,
            endAt,
            language,
            t,
            interpolate: interpolateTemplate
        }).fullLabel;

    const getInvitationStatusBadgeClass = (status) => {
        const normalizedStatus = String(status || "").toLowerCase();
        if (normalizedStatus === "yes") {
            return "bg-green-100 text-green-700 border-green-200 dark:bg-green-500/20 dark:text-green-400 dark:border-green-500/30";
        }
        if (normalizedStatus === "no") {
            return "bg-red-100 text-red-700 border-red-200 dark:bg-red-500/20 dark:text-red-400 dark:border-red-500/30";
        }
        if (normalizedStatus === "maybe") {
            return "bg-orange-100 text-orange-700 border-orange-200 dark:bg-orange-500/20 dark:text-orange-400 dark:border-orange-500/30";
        }
        return "bg-yellow-100 text-yellow-700 border-yellow-200 dark:bg-yellow-500/20 dark:text-yellow-400 dark:border-yellow-500/30";
    };

    // 🚀 ESTADO DE CARGA (Skeleton)
    if (isLoading) {
        return <DashboardOverviewSkeleton t={t} />;
    }

    // 🚀 LÓGICA DE EMPTY STATE BULLETPROOF
    if (!events || !Array.isArray(events) || events.length === 0) {
        return (
            <section className="max-w-4xl mx-auto w-full flex flex-col items-center justify-center min-h-[60vh] animate-in fade-in zoom-in-95 duration-500 px-4">
                <div className="w-full bg-white/50 dark:bg-white/5 backdrop-blur-sm border-2 border-dashed border-gray-200 dark:border-gray-800 rounded-[3rem] p-10 md:p-16 flex flex-col items-center justify-center text-center shadow-sm">

                    <div className="w-24 h-24 bg-blue-50 dark:bg-blue-900/20 text-blue-500 dark:text-blue-400 rounded-full flex items-center justify-center mb-8 shadow-inner relative">
                        <div className="absolute inset-0 bg-blue-400/20 rounded-full animate-ping opacity-20"></div>
                        <Icon name="sparkle" className="w-10 h-10" />
                    </div>

                    <h1 className="text-3xl md:text-4xl font-black text-gray-900 dark:text-white mb-4 tracking-tight">
                        {t("dash_home_empty_title")}
                    </h1>

                    <p className="text-lg text-gray-500 dark:text-gray-400 max-w-lg mx-auto mb-10 font-medium leading-relaxed text-balance">
                        {t("dash_home_empty_subtitle")}
                    </p>

                    {/* Botón Principal de Acción */}
                    <button
                        className="bg-gray-900 dark:bg-white text-white dark:text-gray-900 px-8 py-4 rounded-2xl font-black text-lg shadow-xl hover:scale-105 hover:shadow-2xl transition-all flex items-center gap-3 outline-none focus:ring-4 focus:ring-blue-500/30"
                        tabIndex={0}
                        onClick={() => openWorkspace("events", "create")} // <-- Ajusta esto al action que abra tu modal de crear evento
                    >
                        <Icon name="plus" className="w-6 h-6" />
                        {t("dash_home_cta_create_first")}
                    </button>

                    {/* Hint de confianza inferior */}
                    <div className="mt-12 flex items-center gap-2 text-sm font-bold text-gray-400 dark:text-gray-500">
                        <Icon name="calendar" className="w-4 h-4" />
                        Se tarda menos de 2 minutos.
                    </div>
                </div>
            </section>
        );
    }

    // 🚀 LÓGICA DE POPULATED STATE
    const completedEventsCount = events.filter((e) => e.status === "completed").length;

    return (
        <section className="max-w-6xl mx-auto w-full flex flex-col view-transition">

            {/* ① MÓVIL ONLY — Checklist primero si hay evento activo */}
            {dashboardHostChecklist?.total > 0 && (
                <div className="lg:hidden mb-4">
                    <HostChecklistCard t={t} checklist={dashboardHostChecklist} />
                </div>
            )}

            {/* ② KPIs: 2×2 en móvil · 4 columnas en escritorio */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 md:gap-4 lg:gap-6 mb-4 md:mb-6">
                <KpiTile
                    label={t("kpi_events")}
                    value={events.length}
                    hint={latestEventPreview[0]?.meta || t("kpi_latest_events")}
                    iconName="calendar"
                    accent="blue"
                    onClick={() => openWorkspace("events", "latest")}
                />
                <KpiTile
                    label={t("kpi_guests")}
                    value={guests.length}
                    hint={latestGuestPreview[0]?.main || t("kpi_latest_guests")}
                    iconName="user"
                    accent="purple"
                    onClick={() => openWorkspace("guests", "latest")}
                />
                <KpiTile
                    label={t("latest_invitations_title")}
                    value={invitations.length}
                    hint={pendingInvitationPreview[0]?.main || `${t("kpi_pending_rsvp")}: ${pendingInvites}`}
                    iconName="mail"
                    accent="orange"
                    onClick={() => openWorkspace("invitations", "latest")}
                />
                <KpiTile
                    label={t("kpi_answered_rsvp")}
                    value={`${respondedInvitesRate}%`}
                    hint={answeredInvitationPreview[0]?.main || `${t("kpi_answered_rsvp")}: ${respondedInvites}`}
                    iconName="check"
                    accent="green"
                    valueClassName="text-green-600 dark:text-green-400"
                    onClick={() => openWorkspace("invitations", "latest")}
                />
            </div>

            {/* ③ MÓVIL ONLY — Banner de reputación compacto (~64 px) */}
            <div className="lg:hidden mb-4">
                <article className="flex items-center gap-3 bg-gradient-to-r from-white to-gray-50 dark:from-gray-900 dark:to-gray-800 rounded-2xl border border-black/10 dark:border-gray-700 shadow-sm px-4 py-3 relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-20 h-20 bg-yellow-500/10 rounded-full blur-2xl -mr-6 -mt-6 pointer-events-none" />
                    <AvatarCircle
                        label={hostDisplayName}
                        fallback={hostInitials}
                        imageUrl={hostAvatarUrl}
                        size={36}
                        className="shrink-0"
                    />
                    <div className="flex-1 min-w-0">
                        <p className="text-sm font-bold text-gray-900 dark:text-white truncate leading-tight">{hostDisplayName}</p>
                        <p className="text-[10px] text-gray-500 dark:text-gray-400">{t("panel_title")}</p>
                    </div>
                    <div className="flex items-center gap-1 bg-yellow-100 dark:bg-yellow-500/20 text-yellow-700 dark:text-yellow-400 px-2.5 py-1 rounded-xl text-xs font-black border border-yellow-200 dark:border-yellow-500/30 shrink-0">
                        <Icon name="star" className="w-3 h-3 fill-current" />
                        <span>{hostRatingScore}/5</span>
                    </div>
                    <div className="w-px h-8 bg-black/10 dark:bg-white/10 shrink-0" />
                    <div className="flex flex-col gap-0.5 text-[10px] shrink-0 text-right">
                        <span>
                            <span className="font-bold text-gray-900 dark:text-white">{completedEventsCount}</span>
                            <span className="text-gray-500 dark:text-gray-400"> {t("host_rating_metric_completed_short") || "ev."}</span>
                        </span>
                        <span>
                            <span className="font-bold text-green-600 dark:text-green-400">{respondedInvitesRate}%</span>
                            <span className="text-gray-500 dark:text-gray-400"> RSVP</span>
                        </span>
                    </div>
                </article>
            </div>

            {/* ④ Grid principal: contenido izquierda + columna derecha (solo escritorio) */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 md:gap-8 mb-8">

                {/* COLUMNA IZQUIERDA (Próximos eventos y Actividad - Ocupa 2/3) */}
                <div className="lg:col-span-2 flex flex-col gap-6 md:gap-8">

                    {/* PRÓXIMOS EVENTOS */}
                    <article className="bg-white/40 dark:bg-gray-900/40 backdrop-blur-xl rounded-[2.5rem] border border-black/5 dark:border-white/10 shadow-sm p-6 md:p-8 flex flex-col gap-6">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-black/5 dark:border-white/10 pb-4">
                            <div>
                                <h2 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2 mb-1">
                                    <Icon name="calendar" className="w-5 h-5 text-blue-500" />
                                    {t("overview_upcoming_title")}
                                </h2>
                                <p className="text-xs text-gray-500 dark:text-gray-400">{t("overview_upcoming_hint")}</p>
                            </div>
                            <button
                                className="px-5 py-2.5 bg-blue-50 hover:bg-blue-100 dark:bg-blue-900/20 dark:hover:bg-blue-900/40 text-blue-600 dark:text-blue-400 text-xs font-bold rounded-xl transition-colors whitespace-nowrap"
                                type="button"
                                onClick={() => openWorkspace("events", "latest")}
                            >
                                {t("overview_upcoming_open")}
                            </button>
                        </div>

                        {upcomingEventsPreview.length === 0 ? (
                            <div className="py-8 text-center bg-black/5 dark:bg-white/5 rounded-2xl border border-dashed border-black/10 dark:border-white/10">
                                <p className="text-sm text-gray-500 dark:text-gray-400">{t("overview_upcoming_empty")}</p>
                            </div>
                        ) : (
                            <ul className="flex flex-col gap-3">
                                {upcomingEventsPreview.map((eventItem) => {
                                    // LÓGICA DE COLORES SEMÁNTICOS PARA EVENTOS
                                    const statusVal = String(eventItem.status).toLowerCase();
                                    let statusColors = "bg-gray-100 text-gray-700 border-gray-200 dark:bg-white/10 dark:text-gray-300 dark:border-white/10";

                                    if (statusVal === "published" || statusVal === "completed") {
                                        statusColors = "bg-green-100 text-green-700 border-green-200 dark:bg-green-500/20 dark:text-green-400 dark:border-green-500/30";
                                    } else if (statusVal === "draft") {
                                        statusColors = "bg-yellow-100 text-yellow-700 border-yellow-200 dark:bg-yellow-500/20 dark:text-yellow-400 dark:border-yellow-500/30";
                                    } else if (statusVal === "cancelled") {
                                        statusColors = "bg-red-100 text-red-700 border-red-200 dark:bg-red-500/20 dark:text-red-400 dark:border-red-500/30";
                                    }

                                    return (
                                        <li
                                            key={`upcoming-${eventItem.id}`}
                                            className="group p-4 rounded-2xl border border-transparent hover:border-black/5 dark:hover:border-white/10 hover:bg-white/60 dark:hover:bg-gray-800/60 hover:shadow-md transition-all cursor-pointer flex flex-col sm:flex-row sm:items-center justify-between gap-4 outline-none focus:ring-2 focus:ring-blue-500/50"
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
                                            <div>
                                                <p className="font-bold text-gray-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                                                    {eventItem.title}
                                                </p>
                                                <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400 mt-1.5 font-medium">
                                                    <span className="flex items-center gap-1"><Icon name="calendar" className="w-3 h-3" /> {eventItem.date}</span>
                                                    {eventItem.time ? (
                                                        <>
                                                            <span>·</span>
                                                            <span className="flex items-center gap-1"><Icon name="clock" className="w-3 h-3" /> {eventItem.time}</span>
                                                        </>
                                                    ) : null}
                                                    <span>·</span>
                                                    <span className="flex items-center gap-1"><Icon name="users" className="w-3 h-3" /> {interpolateText(t("overview_upcoming_guests"), { count: eventItem.guests })}</span>
                                                </div>
                                            </div>
                                            <div className="shrink-0">
                                                <span className={`px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider rounded-lg border ${statusColors}`}>
                                                    {statusText(t, eventItem.status)}
                                                </span>
                                            </div>
                                        </li>
                                    );
                                })}
                            </ul>
                        )}
                    </article>

                    {/* INVITACIONES RECIBIDAS (network effect) */}
                    <article className="bg-white/40 dark:bg-gray-900/40 backdrop-blur-xl rounded-[2.5rem] border border-black/5 dark:border-white/10 shadow-sm p-6 md:p-8 flex flex-col gap-6">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-black/5 dark:border-white/10 pb-4">
                            <div>
                                <h2 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2 mb-1">
                                    <Icon name="mail" className="w-5 h-5 text-emerald-500" />
                                    {t("overview_received_invitations_title")}
                                </h2>
                                <p className="text-xs text-gray-500 dark:text-gray-400">
                                    {t("overview_received_invitations_hint")}
                                </p>
                            </div>
                            <button
                                className="px-5 py-2.5 bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-900/20 dark:hover:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300 text-xs font-bold rounded-xl transition-colors whitespace-nowrap"
                                type="button"
                                onClick={() => openWorkspace("invitations", "latest")}
                            >
                                {t("overview_received_invitations_open")}
                            </button>
                        </div>

                        {receivedInvitations.length === 0 ? (
                            <div className="py-8 text-center bg-black/5 dark:bg-white/5 rounded-2xl border border-dashed border-black/10 dark:border-white/10">
                                <p className="text-sm text-gray-500 dark:text-gray-400">
                                    {t("overview_received_invitations_empty")}
                                </p>
                            </div>
                        ) : (
                            <ul className="flex flex-col gap-3">
                                {receivedInvitations.slice(0, 6).map((invitationItem) => {
                                    const hostName = String(invitationItem.host_full_name || "").trim() || t("host_default_name");
                                    const eventTitle =
                                        String(invitationItem.event_title || "").trim() || t("field_event");
                                    const responseAtLabel = formatInvitationDate(
                                        invitationItem.event_start_at || invitationItem.invitation_created_at,
                                        invitationItem.event_end_at || null
                                    );
                                    return (
                                        <li
                                            key={`received-invitation-${invitationItem.invitation_id}`}
                                            className="group p-4 rounded-2xl border border-transparent hover:border-black/5 dark:hover:border-white/10 hover:bg-white/60 dark:hover:bg-gray-800/60 hover:shadow-md transition-all cursor-pointer flex flex-col sm:flex-row sm:items-center justify-between gap-4 outline-none focus:ring-2 focus:ring-emerald-500/40"
                                            role="button"
                                            tabIndex={0}
                                            onClick={() => openReceivedInvitationRsvp?.(invitationItem.invitation_public_token)}
                                            onKeyDown={(event) => {
                                                if (event.key === "Enter" || event.key === " ") {
                                                    event.preventDefault();
                                                    openReceivedInvitationRsvp?.(invitationItem.invitation_public_token);
                                                }
                                            }}
                                        >
                                            <div className="min-w-0">
                                                <p className="font-bold text-gray-900 dark:text-white truncate">
                                                    {eventTitle}
                                                </p>
                                                <div className="flex items-center flex-wrap gap-x-2 gap-y-1 text-xs text-gray-500 dark:text-gray-400 mt-1.5 font-medium">
                                                    <span className="flex items-center gap-1">
                                                        <Icon name="user" className="w-3 h-3" />
                                                        {hostName}
                                                    </span>
                                                    <span>·</span>
                                                    <span className="flex items-center gap-1">
                                                        <Icon name="calendar" className="w-3 h-3" />
                                                        {responseAtLabel}
                                                    </span>
                                                </div>
                                            </div>
                                            <div className="shrink-0">
                                                <span
                                                    className={`px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider rounded-lg border ${getInvitationStatusBadgeClass(
                                                        invitationItem.invitation_status
                                                    )}`}
                                                >
                                                    {statusText(t, invitationItem.invitation_status)}
                                                </span>
                                            </div>
                                        </li>
                                    );
                                })}
                            </ul>
                        )}
                    </article>

                    {/* ACTIVIDAD RECIENTE */}
                    <article className="bg-white/40 dark:bg-gray-900/40 backdrop-blur-xl rounded-[2.5rem] border border-black/5 dark:border-white/10 shadow-sm p-6 md:p-8 flex flex-col gap-6">
                        <div className="border-b border-black/5 dark:border-white/10 pb-4">
                            <h2 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2 mb-1">
                                <Icon name="bell" className="w-5 h-5 text-purple-500" />
                                {t("recent_activity_title")}
                            </h2>
                            <p className="text-xs text-gray-500 dark:text-gray-400">{t("recent_activity_hint")}</p>
                        </div>

                        {recentActivityItems.length === 0 ? (
                            <p className="text-sm text-gray-500 dark:text-gray-400 italic py-4">{t("recent_activity_empty")}</p>
                        ) : (
                            <ul className="flex flex-col gap-2">
                                {recentActivityItems.slice(0, 6).map((activityItem) => {
                                    // LÓGICA DE COLORES E ICONOS PARA ACTIVIDAD (RSVP, ETC)
                                    const statusVal = String(activityItem.status).toLowerCase();
                                    let iconColors = "bg-gray-100 text-gray-500 dark:bg-white/10 dark:text-gray-400";
                                    let iconName = activityItem.icon;

                                    if (statusVal === "yes" || statusVal === "accepted" || statusVal === "published") {
                                        iconColors = "bg-green-100 text-green-600 dark:bg-green-500/20 dark:text-green-400";
                                        if (statusVal === "yes" || statusVal === "accepted") iconName = "check";
                                    } else if (statusVal === "no" || statusVal === "rejected" || statusVal === "cancelled") {
                                        iconColors = "bg-red-100 text-red-600 dark:bg-red-500/20 dark:text-red-400";
                                        if (statusVal === "no" || statusVal === "rejected") iconName = "close";
                                    } else if (statusVal === "pending" || statusVal === "draft") {
                                        iconColors = "bg-yellow-100 text-yellow-600 dark:bg-yellow-500/20 dark:text-yellow-400";
                                    }

                                    return (
                                        <li key={activityItem.id} className="flex items-start gap-4 p-3 rounded-2xl hover:bg-black/5 dark:hover:bg-white/5 transition-colors">
                                            <div className={`p-2.5 rounded-xl shrink-0 mt-0.5 ${iconColors}`}>
                                                <Icon name={iconName} className="w-4 h-4" />
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <p className="text-sm font-bold text-gray-900 dark:text-white truncate">{activityItem.title}</p>
                                                <p className="text-xs text-gray-600 dark:text-gray-300 mt-0.5 truncate">{activityItem.meta}</p>
                                            </div>
                                            <div className="shrink-0 text-right">
                                                <p className="text-[10px] font-medium text-gray-400 dark:text-gray-500 uppercase tracking-wider">{activityItem.timeLabel}</p>
                                            </div>
                                        </li>
                                    );
                                })}
                            </ul>
                        )}
                    </article>
                </div>

                {/* COLUMNA DERECHA — solo visible en escritorio (en móvil hay banner + checklist arriba) */}
                <div className="lg:col-span-1 hidden lg:flex flex-col gap-6 md:gap-8">

                    {/* TARJETA VIP DE ANFITRIÓN */}
                    <article className="bg-gradient-to-br from-white to-gray-50 dark:from-gray-900 dark:to-gray-800 text-gray-900 dark:text-white rounded-[2.5rem] border border-black/10 dark:border-gray-700 shadow-xl p-6 md:p-8 relative overflow-hidden flex flex-col gap-6 transition-colors">
                        {/* Fondo decorativo */}
                        <div className="absolute top-0 right-0 w-32 h-32 bg-yellow-500/10 rounded-full blur-3xl -mr-10 -mt-10 pointer-events-none"></div>

                        {/* Cabecera del perfil */}
                        <div className="flex items-center gap-4 relative z-10">
                            <AvatarCircle
                                className="w-16 h-16 rounded-full ring-4 ring-gray-100 dark:ring-gray-700 shadow-lg shrink-0"
                                label={hostDisplayName}
                                fallback={hostInitials}
                                imageUrl={hostAvatarUrl}
                                size={64}
                            />
                            <div>
                                <h2 className="text-lg font-bold tracking-tight text-gray-900 dark:text-white">{hostDisplayName}</h2>
                                <p className="text-xs text-gray-500 dark:text-gray-400">{t("panel_title")}</p>
                            </div>
                        </div>

                        {/* Puntuación (Estrellas) */}
                        <div className="flex items-center justify-between bg-black/5 dark:bg-white/5 border border-black/5 dark:border-white/10 rounded-2xl p-4 relative z-10 transition-colors">
                            <span className="text-xs font-bold uppercase tracking-widest text-gray-500 dark:text-gray-300">{t("host_rating_reputation")}</span>
                            <div className="flex items-center gap-1.5 bg-yellow-100 dark:bg-yellow-500/20 text-yellow-700 dark:text-yellow-400 px-3 py-1.5 rounded-lg border border-yellow-200 dark:border-yellow-500/30">
                                <Icon name="star" className="w-4 h-4 fill-current" />
                                <span className="font-black text-sm">{hostRatingScore}/5</span>
                            </div>
                        </div>

                        {/* Métricas detalladas */}
                        <div className="flex flex-col gap-3 relative z-10">
                            <div className="flex items-center justify-between text-sm">
                                <span className="text-gray-600 dark:text-gray-400">{t("host_rating_metric_completed")}</span>
                                <div className="flex-1 border-b border-dashed border-gray-300 dark:border-gray-600 mx-3 relative top-[-4px] transition-colors"></div>
                                <strong className="font-bold text-gray-900 dark:text-white">{events.filter((eventItem) => eventItem.status === "completed").length}</strong>
                            </div>

                            <div className="flex items-center justify-between text-sm">
                                <span className="text-gray-600 dark:text-gray-400">{t("host_rating_metric_response")}</span>
                                <div className="flex-1 border-b border-dashed border-gray-300 dark:border-gray-600 mx-3 relative top-[-4px] transition-colors"></div>
                                <strong className="font-bold text-green-600 dark:text-green-400">{respondedInvitesRate}%</strong>
                            </div>

                            <div className="flex items-center justify-between text-sm">
                                <span className="text-gray-600 dark:text-gray-400">{t("host_rating_metric_growth")}</span>
                                <div className="flex-1 border-b border-dashed border-gray-300 dark:border-gray-600 mx-3 relative top-[-4px] transition-colors"></div>
                                <strong className="font-bold text-blue-600 dark:text-blue-400">{convertedHostRate}%</strong>
                            </div>

                            <div className="flex items-center justify-between text-sm mt-2 pt-4 border-t border-black/5 dark:border-gray-700 transition-colors">
                                <span className="text-xs text-gray-500 uppercase tracking-widest">{t("host_rating_since_label")}</span>
                                <strong className="text-xs font-medium text-gray-700 bg-gray-100 dark:text-gray-300 dark:bg-gray-700 px-2 py-1 rounded-md transition-colors">{hostMemberSinceLabel}</strong>
                            </div>
                        </div>
                    </article>

                    <HostChecklistCard
                        t={t}
                        checklist={dashboardHostChecklist}
                    />
                </div>
            </div>

            {/* ARTÍCULO 1: GROWTH ANALYTICS (Se mantiene idéntico) */}
            <article className="bg-white/40 dark:bg-gray-900/40 backdrop-blur-xl p-6 md:p-8 rounded-[2.5rem] border border-black/10 dark:border-white/10 shadow-sm flex flex-col gap-8 mb-6 mt-4">

                <header className="flex flex-col md:flex-row md:items-end justify-between gap-6 border-b border-black/5 dark:border-white/10 pb-6">
                    <div>
                        <h2 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-3 mb-2">
                            <div className="p-2.5 bg-blue-500/10 dark:bg-blue-400/10 text-blue-600 dark:text-blue-400 rounded-xl">
                                <Icon name="trend" className="w-5 h-5" />
                            </div>
                            {t("growth_analytics_title")}
                        </h2>
                        <p className="text-sm text-gray-500 dark:text-gray-400 max-w-2xl">
                            {t("growth_analytics_hint")}
                        </p>
                    </div>

                    <div className="flex bg-white/50 dark:bg-black/20 p-1.5 rounded-2xl border border-black/5 dark:border-white/5 w-fit shadow-sm">
                        <div className="px-4 py-1.5 text-xs font-bold text-gray-700 dark:text-gray-300 flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.6)]"></span>
                            7d <span className="text-gray-400 dark:text-gray-500">({conversionWindowCounts.d7})</span>
                        </div>
                        <div className="px-4 py-1.5 text-xs font-bold text-gray-700 dark:text-gray-300 flex items-center gap-2 border-l border-black/5 dark:border-white/10">
                            30d <span className="text-gray-400 dark:text-gray-500">({conversionWindowCounts.d30})</span>
                        </div>
                        <div className="px-4 py-1.5 text-xs font-bold text-gray-700 dark:text-gray-300 flex items-center gap-2 border-l border-black/5 dark:border-white/10">
                            90d <span className="text-gray-400 dark:text-gray-500">({conversionWindowCounts.d90})</span>
                        </div>
                    </div>
                </header>

                <div className="grid grid-cols-2 xl:grid-cols-4 gap-4 md:gap-6">
                    <article className="bg-gradient-to-br from-white to-gray-50 dark:from-gray-800 dark:to-gray-800/80 rounded-3xl border border-black/5 dark:border-white/5 shadow-sm p-6 relative overflow-hidden group">
                        <div className="absolute top-0 right-0 -mt-4 -mr-4 w-24 h-24 bg-gray-500/5 rounded-full blur-2xl group-hover:bg-gray-500/10 transition-colors"></div>
                        <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400 dark:text-gray-500 mb-1">
                            {t("growth_funnel_potential")}
                        </p>
                        <p className="text-[11px] text-gray-500 dark:text-gray-400 mb-4 h-8 leading-tight">
                            {t("growth_funnel_potential_desc")}
                        </p>
                        <p className="text-4xl font-black text-gray-900 dark:text-white tracking-tight">{hostPotentialGuestsCount}</p>
                    </article>

                    <article className="bg-gradient-to-br from-white to-gray-50 dark:from-gray-800 dark:to-gray-800/80 rounded-3xl border border-black/5 dark:border-white/5 shadow-sm p-6 relative overflow-hidden group">
                        <div className="absolute top-0 right-0 -mt-4 -mr-4 w-24 h-24 bg-purple-500/5 rounded-full blur-2xl group-hover:bg-purple-500/10 transition-colors"></div>
                        <p className="text-[10px] font-bold uppercase tracking-widest text-purple-500 dark:text-purple-400 mb-1">
                            {t("growth_funnel_invited")}
                        </p>
                        <p className="text-[11px] text-gray-500 dark:text-gray-400 mb-4 h-8 leading-tight">
                            {t("growth_funnel_invited_desc")}
                        </p>
                        <p className="text-4xl font-black text-gray-900 dark:text-white tracking-tight">{invitedPotentialHostsCount}</p>
                    </article>

                    <article className="bg-gradient-to-br from-white to-gray-50 dark:from-gray-800 dark:to-gray-800/80 rounded-3xl border border-black/5 dark:border-white/5 shadow-sm p-6 relative overflow-hidden group">
                        <div className="absolute top-0 right-0 -mt-4 -mr-4 w-24 h-24 bg-green-500/5 rounded-full blur-2xl group-hover:bg-green-500/10 transition-colors"></div>
                        <p className="text-[10px] font-bold uppercase tracking-widest text-green-500 dark:text-green-400 mb-1">
                            {t("growth_funnel_converted")}
                        </p>
                        <p className="text-[11px] text-gray-500 dark:text-gray-400 mb-4 h-8 leading-tight">
                            {t("growth_funnel_converted_desc")}
                        </p>
                        <p className="text-4xl font-black text-gray-900 dark:text-white tracking-tight">{convertedHostGuestsCount}</p>
                    </article>

                    <article className="bg-gradient-to-br from-blue-600 to-blue-800 rounded-3xl border border-blue-500 shadow-xl shadow-blue-500/20 p-6 relative overflow-hidden group text-white">
                        <div className="absolute top-0 right-0 -mt-4 -mr-4 w-32 h-32 bg-white/10 rounded-full blur-2xl group-hover:bg-white/20 transition-colors duration-500"></div>
                        <Icon name="sparkle" className="absolute bottom-4 right-4 w-12 h-12 text-white/10 -rotate-12" />
                        <p className="text-[10px] font-bold uppercase tracking-widest text-blue-200 mb-1">
                            {t("growth_funnel_rate")}
                        </p>
                        <p className="text-[11px] text-blue-100/70 mb-4 h-8 leading-tight">
                            {t("growth_funnel_rate_desc")}
                        </p>
                        <p className="text-4xl font-black tracking-tight">{convertedHostRate}%</p>
                    </article>
                </div>

                <div className="bg-white/50 dark:bg-black/20 rounded-3xl p-6 border border-black/5 dark:border-white/5 shadow-inner">
                    <h3 className="text-[10px] font-bold uppercase tracking-widest text-gray-500 dark:text-gray-400 mb-8 flex items-center gap-2">
                        <Icon name="activity" className="w-3 h-3" />
                        {t("growth_trend_14d_title")}
                    </h3>

                    <div className="growth-trend-chart-container overflow-x-auto md:overflow-x-visible pb-4 md:pb-0">
                        <div
                            className="flex items-end h-40 gap-2 md:gap-3 min-w-[360px] md:min-w-full"
                            role="img"
                            aria-label={t("growth_trend_14d_label")}
                        >
                            {conversionTrend14d.map((bucket) => {
                                const isZero = bucket.count === 0;
                                const heightPercent = isZero ? 5 : Math.max(15, Math.round((bucket.count / (conversionTrendMax || 1)) * 100));

                                return (
                                    <div key={bucket.key} className="flex-1 flex flex-col items-center justify-end h-full gap-2 group relative">

                                        <div className="absolute -top-10 bg-gray-900 dark:bg-white text-white dark:text-gray-900 text-xs font-bold px-3 py-1.5 rounded-lg opacity-0 group-hover:opacity-100 transition-all duration-200 transform translate-y-2 group-hover:-translate-y-1 pointer-events-none whitespace-nowrap z-10 shadow-lg">
                                            {bucket.count} {bucket.count === 1 ? t("growth_trend_host_single") : t("growth_trend_host_plural")}
                                            <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-2 h-2 bg-gray-900 dark:bg-white rotate-45"></div>
                                        </div>

                                        <div className="w-full flex items-end justify-center h-full bg-black/5 dark:bg-white/5 rounded-xl overflow-hidden shadow-inner relative">
                                            <span
                                                className={`w-full rounded-xl transition-all duration-700 ease-out ${isZero ? 'bg-transparent' : 'bg-gradient-to-t from-blue-500/40 to-blue-500 shadow-[0_0_10px_rgba(59,130,246,0.3)] group-hover:to-blue-400'}`}
                                                style={{ height: `${heightPercent}%` }}
                                            />
                                        </div>

                                        <span className={`text-[9px] font-bold uppercase tracking-wider ${isZero ? 'text-gray-400 dark:text-gray-600' : 'text-gray-700 dark:text-gray-300'}`}>
                                            {bucket.label}
                                        </span>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>
            </article>

            {/* ARTÍCULO 2: ACCESIBILIDAD Y CONSEJOS (Se mantiene idéntico) */}
            <article className="bg-blue-50/50 dark:bg-blue-900/10 border border-blue-100 dark:border-blue-900/30 rounded-3xl p-6 mb-6 flex gap-5 items-start">
                <div className="p-3 bg-blue-100 dark:bg-blue-900/50 rounded-2xl text-blue-600 dark:text-blue-400 shrink-0 shadow-sm">
                    <Icon name="sparkle" className="w-6 h-6" />
                </div>
                <div className="flex flex-col gap-1 text-sm text-blue-900 dark:text-blue-200 mt-1">
                    <h2 className="font-bold text-base mb-1">{t("hint_accessibility")}</h2>
                    <p className="opacity-80 leading-relaxed">{t("overview_help")}</p>
                    <p className="opacity-70 leading-relaxed text-[11px] mt-2 bg-blue-100/50 dark:bg-blue-900/30 p-2 rounded-lg inline-block w-fit">
                        <Icon name="info" className="w-3 h-3 inline mr-1 -mt-0.5" />
                        {t("content_translation_note")}
                    </p>
                </div>
            </article>
        </section>
    );
}
