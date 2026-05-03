import { Icon } from "../../icons";

// 📊 Tarjeta de Growth Analytics extraída de DashboardOverview.
// Muestra el embudo de conversión y el gráfico de tendencia de 14 días.
// Uso: sección de Perfil/Analíticas — no en la Home principal.
//
// Props:
//   t                       — función de i18n
//   conversionWindowCounts  — { d7, d30, d90 }
//   hostPotentialGuestsCount
//   invitedPotentialHostsCount
//   convertedHostGuestsCount
//   convertedHostRate       — número (%)
//   conversionTrend14d      — array de { key, label, count }
//   conversionTrendMax      — número (max de la serie)

export function GrowthAnalyticsCard({
    t,
    conversionWindowCounts = { d7: 0, d30: 0, d90: 0 },
    hostPotentialGuestsCount = 0,
    invitedPotentialHostsCount = 0,
    convertedHostGuestsCount = 0,
    convertedHostRate = 0,
    conversionTrend14d = [],
    conversionTrendMax = 1,
}) {
    return (
        <article className="bg-white/40 dark:bg-gray-900/40 backdrop-blur-xl p-6 md:p-8 rounded-[2.5rem] border border-black/10 dark:border-white/10 shadow-sm flex flex-col gap-8">

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

            {/* Embudo: 4 tarjetas */}
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

            {/* Gráfico de barras — tendencia 14 días */}
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
                            const heightPercent = isZero
                                ? 5
                                : Math.max(15, Math.round((bucket.count / (conversionTrendMax || 1)) * 100));

                            return (
                                <div key={bucket.key} className="flex-1 flex flex-col items-center justify-end h-full gap-2 group relative">
                                    <div className="absolute -top-10 bg-gray-900 dark:bg-white text-white dark:text-gray-900 text-xs font-bold px-3 py-1.5 rounded-lg opacity-0 group-hover:opacity-100 transition-all duration-200 transform translate-y-2 group-hover:-translate-y-1 pointer-events-none whitespace-nowrap z-10 shadow-lg">
                                        {bucket.count} {bucket.count === 1 ? t("growth_trend_host_single") : t("growth_trend_host_plural")}
                                        <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-2 h-2 bg-gray-900 dark:bg-white rotate-45"></div>
                                    </div>

                                    <div className="w-full flex items-end justify-center h-full bg-black/5 dark:bg-white/5 rounded-xl overflow-hidden shadow-inner relative">
                                        <span
                                            className={`w-full rounded-xl transition-all duration-700 ease-out ${isZero ? "bg-transparent" : "bg-gradient-to-t from-blue-500/40 to-blue-500 shadow-[0_0_10px_rgba(59,130,246,0.3)] group-hover:to-blue-400"}`}
                                            style={{ height: `${heightPercent}%` }}
                                        />
                                    </div>

                                    <span className={`text-[9px] font-bold uppercase tracking-wider ${isZero ? "text-gray-400 dark:text-gray-600" : "text-gray-700 dark:text-gray-300"}`}>
                                        {bucket.label}
                                    </span>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>
        </article>
    );
}
