import { useCallback, useEffect, useMemo, useState } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
  CartesianGrid
} from "recharts";
import { supabase } from "../../../lib/supabaseClient";

const configuredApiUrl = String(
  import.meta.env.VITE_API_URL || import.meta.env.VITE_API_BASE_URL || ""
).trim();
const fallbackApiUrl = "/api";
const API_BASE_URL = String(configuredApiUrl || fallbackApiUrl).replace(/\/+$/, "");

function buildAdminAnalyticsEndpoint(baseUrl, resource) {
  const normalizedBase = String(baseUrl || "").trim().replace(/\/+$/, "");
  if (!normalizedBase) {
    return "";
  }
  if (/(^|\/)api$/i.test(normalizedBase)) {
    return `${normalizedBase}/admin/analytics/${resource}`;
  }
  return `${normalizedBase}/api/admin/analytics/${resource}`;
}

function toNumber(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function formatNumber(value) {
  return new Intl.NumberFormat("es-ES").format(toNumber(value));
}

function formatPercent(value) {
  const numeric = toNumber(value);
  return `${(numeric * 100).toFixed(2)}%`;
}

function formatDateTime(value) {
  if (!value) {
    return "—";
  }
  const parsed = new Date(value);
  if (!Number.isFinite(parsed.getTime())) {
    return "—";
  }
  return parsed.toLocaleString("es-ES", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit"
  });
}

function formatSeoPageLabel(rawPage, siteUrl) {
  const safeRaw = String(rawPage || "").trim();
  if (!safeRaw) {
    return "(not set)";
  }

  try {
    const pageUrl = new URL(safeRaw);
    const site = siteUrl ? new URL(siteUrl) : null;
    if (site && pageUrl.origin === site.origin) {
      return `${pageUrl.pathname || "/"}${pageUrl.search || ""}${pageUrl.hash || ""}`;
    }
    return `${pageUrl.pathname || "/"}${pageUrl.search || ""}${pageUrl.hash || ""}` || safeRaw;
  } catch {
    if (siteUrl && safeRaw.startsWith(siteUrl)) {
      return safeRaw.slice(siteUrl.length) || "/";
    }
    return safeRaw;
  }
}

function formatIsoDate(value) {
  return value.toISOString().slice(0, 10);
}

function getPresetRange(preset) {
  const today = new Date();
  const end = formatIsoDate(today);
  const startDate = new Date(today);

  if (preset === "last_7d") {
    startDate.setDate(startDate.getDate() - 6);
    return { startDate: formatIsoDate(startDate), endDate: end };
  }
  if (preset === "this_month") {
    const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
    return { startDate: formatIsoDate(monthStart), endDate: end };
  }

  startDate.setDate(startDate.getDate() - 29);
  return { startDate: formatIsoDate(startDate), endDate: end };
}

function AnalyticsKpiCard({ label, value, helper }) {
  return (
    <article className="bg-indigo-50/50 dark:bg-indigo-900/10 border border-indigo-100 dark:border-indigo-800/50 rounded-2xl px-4 py-4 shadow-sm">
      <p className="text-[11px] font-bold uppercase tracking-wider text-indigo-700 dark:text-indigo-300">
        {label}
      </p>
      <p className="mt-1 text-2xl font-black text-gray-900 dark:text-white tabular-nums">
        {formatNumber(value)}
      </p>
      {helper ? <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">{helper}</p> : null}
    </article>
  );
}

function ChartTooltip({ active, payload, label }) {
  if (!active || !payload?.length) {
    return null;
  }
  return (
    <div className="rounded-xl bg-gray-900/95 border border-white/10 px-3 py-2 shadow-xl">
      <p className="text-[10px] text-gray-400">{label}</p>
      <p className="text-xs text-blue-200">Sesiones: {formatNumber(payload[0]?.value)}</p>
      <p className="text-xs text-indigo-200">Usuarios: {formatNumber(payload[1]?.value)}</p>
      <p className="text-xs text-purple-200">Vistas: {formatNumber(payload[2]?.value)}</p>
    </div>
  );
}

export function AdminAnalyticsWidget() {
  const initialRange = useMemo(() => getPresetRange("last_30d"), []);
  const [datePreset, setDatePreset] = useState("last_30d");
  const [startDate, setStartDate] = useState(initialRange.startDate);
  const [endDate, setEndDate] = useState(initialRange.endDate);

  const [loading, setLoading] = useState(true);
  const [gaError, setGaError] = useState("");
  const [seoError, setSeoError] = useState("");
  const [gaData, setGaData] = useState(null);
  const [seoData, setSeoData] = useState(null);
  const [seoTab, setSeoTab] = useState("queries");

  const applyPreset = useCallback((preset) => {
    const range = getPresetRange(preset);
    setDatePreset(preset);
    setStartDate(range.startDate);
    setEndDate(range.endDate);
  }, []);

  const handleStartDateChange = useCallback((event) => {
    setDatePreset("custom");
    setStartDate(String(event.target.value || "").trim());
  }, []);

  const handleEndDateChange = useCallback((event) => {
    setDatePreset("custom");
    setEndDate(String(event.target.value || "").trim());
  }, []);

  const fetchWithAdminToken = useCallback(async (endpoint, accessToken) => {
    const response = await fetch(endpoint, {
      method: "GET",
      headers: {
        Accept: "application/json",
        Authorization: `Bearer ${accessToken}`
      }
    });
    let payload = null;
    try {
      payload = await response.json();
    } catch {
      payload = null;
    }
    if (!response.ok) {
      throw new Error(String(payload?.error || `Error HTTP ${response.status}`));
    }
    return payload?.data || null;
  }, []);

  const fetchAnalytics = useCallback(async () => {
    const gaEndpointBase = buildAdminAnalyticsEndpoint(API_BASE_URL, "overview");
    const seoEndpointBase = buildAdminAnalyticsEndpoint(API_BASE_URL, "seo");
    if (!gaEndpointBase || !seoEndpointBase) {
      setGaError("No se ha configurado la URL del backend para analíticas.");
      setSeoError("No se ha configurado la URL del backend para SEO.");
      setLoading(false);
      return;
    }

    const query = new URLSearchParams();
    if (startDate) {
      query.set("startDate", startDate);
    }
    if (endDate) {
      query.set("endDate", endDate);
    }
    const gaEndpoint = `${gaEndpointBase}?${query.toString()}`;
    const seoEndpoint = `${seoEndpointBase}?${query.toString()}`;

    setLoading(true);
    setGaError("");
    setSeoError("");

    try {
      const { data: sessionPayload, error: sessionError } = await supabase.auth.getSession();
      if (sessionError || !sessionPayload?.session?.access_token) {
        throw new Error("No se pudo obtener la sesión de administrador.");
      }

      const token = sessionPayload.session.access_token;
      const [gaResult, seoResult] = await Promise.allSettled([
        fetchWithAdminToken(gaEndpoint, token),
        fetchWithAdminToken(seoEndpoint, token)
      ]);

      if (gaResult.status === "fulfilled") {
        setGaData(gaResult.value);
      } else {
        setGaData(null);
        setGaError(String(gaResult.reason?.message || "Error al cargar GA4."));
      }

      if (seoResult.status === "fulfilled") {
        setSeoData(seoResult.value);
      } else {
        setSeoData(null);
        setSeoError(String(seoResult.reason?.message || "Error al cargar Search Console."));
      }
    } catch (fetchError) {
      const message = String(fetchError?.message || "Error inesperado cargando analíticas.");
      setGaError(message);
      setSeoError(message);
      setGaData(null);
      setSeoData(null);
    } finally {
      setLoading(false);
    }
  }, [endDate, fetchWithAdminToken, startDate]);

  useEffect(() => {
    fetchAnalytics();
  }, [fetchAnalytics]);

  const channels = useMemo(() => {
    const rawChannels = Array.isArray(gaData?.channels) ? gaData.channels : [];
    return rawChannels
      .map((channelItem) => ({
        channel: String(channelItem?.channel || "Unassigned").trim() || "Unassigned",
        activeUsers: toNumber(channelItem?.activeUsers),
        sessions: toNumber(channelItem?.sessions),
        screenPageViews: toNumber(channelItem?.screenPageViews)
      }))
      .sort((a, b) => b.sessions - a.sessions);
  }, [gaData]);

  const totals = useMemo(() => {
    const sumFromChannels = channels.reduce(
      (acc, channelItem) => {
        acc.activeUsers += channelItem.activeUsers;
        acc.sessions += channelItem.sessions;
        acc.screenPageViews += channelItem.screenPageViews;
        return acc;
      },
      { activeUsers: 0, sessions: 0, screenPageViews: 0 }
    );

    if (channels.length > 0) {
      return sumFromChannels;
    }

    return {
      activeUsers: toNumber(gaData?.totals?.activeUsers),
      sessions: toNumber(gaData?.totals?.sessions),
      screenPageViews: toNumber(gaData?.totals?.screenPageViews)
    };
  }, [channels, gaData]);

  const seoQueries = useMemo(() => {
    const rawQueries = Array.isArray(seoData?.queries) ? seoData.queries : [];
    return rawQueries.map((queryRow) => ({
      query: String(queryRow?.query || "(not set)").trim() || "(not set)",
      clicks: toNumber(queryRow?.clicks),
      impressions: toNumber(queryRow?.impressions),
      ctr: toNumber(queryRow?.ctr),
      position: toNumber(queryRow?.position)
    }));
  }, [seoData]);

  const seoPages = useMemo(() => {
    const rawPages = Array.isArray(seoData?.pages) ? seoData.pages : [];
    return rawPages.map((pageRow) => ({
      page: String(pageRow?.page || "(not set)").trim() || "(not set)",
      clicks: toNumber(pageRow?.clicks),
      impressions: toNumber(pageRow?.impressions),
      ctr: toNumber(pageRow?.ctr),
      position: toNumber(pageRow?.position)
    }));
  }, [seoData]);

  const seoRows = seoTab === "pages" ? seoPages : seoQueries;

  return (
    <section className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur-2xl overflow-hidden shadow-lg">
      <header className="px-5 py-4 border-b border-white/5 flex flex-col xl:flex-row xl:items-end xl:justify-between gap-3">
        <div>
          <h3 className="text-sm font-bold uppercase tracking-widest text-gray-400">
            Tráfico + SEO (GA4 & Search Console)
          </h3>
          <p className="text-xs text-gray-600">
            {startDate && endDate ? `${startDate} → ${endDate}` : "Último periodo disponible"}
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-[170px_150px_150px_auto] gap-2 w-full xl:w-auto">
          <select
            value={datePreset}
            onChange={(event) => applyPreset(event.target.value)}
            className="bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-xs text-gray-200"
          >
            <option value="last_7d">Últimos 7 días</option>
            <option value="last_30d">Últimos 30 días</option>
            <option value="this_month">Este mes</option>
            <option value="custom">Personalizado</option>
          </select>

          <input
            type="date"
            value={startDate}
            onChange={handleStartDateChange}
            className="bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-xs text-gray-200"
          />

          <input
            type="date"
            value={endDate}
            onChange={handleEndDateChange}
            className="bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-xs text-gray-200"
          />

          <button
            type="button"
            onClick={fetchAnalytics}
            disabled={loading}
            className="px-3 py-2 rounded-lg text-xs font-medium bg-white/5 border border-white/10 text-gray-300 hover:bg-white/10 transition-colors disabled:opacity-50"
          >
            {loading ? "Cargando..." : "Actualizar"}
          </button>
        </div>
      </header>

      <div className="p-5 space-y-5">
        {gaError ? (
          <div className="rounded-xl bg-red-500/10 border border-red-500/20 px-4 py-3 text-sm text-red-300">
            {gaError}
          </div>
        ) : null}
        {seoError ? (
          <div className="rounded-xl bg-amber-500/10 border border-amber-500/20 px-4 py-3 text-sm text-amber-300">
            {seoError}
          </div>
        ) : null}

        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {[1, 2, 3].map((item) => (
              <div
                key={item}
                className="h-24 rounded-2xl border border-indigo-200/30 dark:border-indigo-800/50 bg-indigo-50/30 dark:bg-indigo-900/10 animate-pulse"
              />
            ))}
          </div>
        ) : null}

        {!loading ? (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <AnalyticsKpiCard label="Usuarios activos" value={totals.activeUsers} />
              <AnalyticsKpiCard label="Sesiones" value={totals.sessions} />
              <AnalyticsKpiCard label="Vistas de página" value={totals.screenPageViews} />
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-5 gap-5">
              <div className="xl:col-span-3 rounded-2xl border border-white/10 bg-white/[0.02] p-4">
                <p className="text-xs font-bold uppercase tracking-wider text-gray-500 mb-3">
                  Sesiones por canal de adquisición
                </p>
                <div className="h-[280px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={channels}
                      margin={{ top: 10, right: 10, left: -10, bottom: 35 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                      <XAxis
                        dataKey="channel"
                        angle={-20}
                        textAnchor="end"
                        height={60}
                        interval={0}
                        tick={{ fill: "#94a3b8", fontSize: 11 }}
                        axisLine={{ stroke: "rgba(255,255,255,0.08)" }}
                        tickLine={false}
                      />
                      <YAxis
                        tick={{ fill: "#94a3b8", fontSize: 11 }}
                        axisLine={false}
                        tickLine={false}
                        allowDecimals={false}
                      />
                      <RechartsTooltip content={<ChartTooltip />} />
                      <Bar dataKey="sessions" fill="#60a5fa" radius={[8, 8, 0, 0]} />
                      <Bar dataKey="activeUsers" fill="#818cf8" radius={[8, 8, 0, 0]} />
                      <Bar dataKey="screenPageViews" fill="#c084fc" radius={[8, 8, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div className="xl:col-span-2 rounded-2xl border border-white/10 bg-white/[0.02] overflow-hidden">
                <div className="px-4 py-3 border-b border-white/10">
                  <p className="text-xs font-bold uppercase tracking-wider text-gray-500">
                    Desglose por canal
                  </p>
                </div>
                <div className="max-h-[320px] overflow-y-auto">
                  <table className="w-full text-sm">
                    <thead className="sticky top-0 bg-gray-900/95">
                      <tr className="text-left text-[11px] uppercase tracking-wider text-gray-500">
                        <th className="px-4 py-2 font-semibold">Canal</th>
                        <th className="px-4 py-2 font-semibold text-right">Sesiones</th>
                        <th className="px-4 py-2 font-semibold text-right">Usuarios</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                      {channels.length === 0 ? (
                        <tr>
                          <td colSpan={3} className="px-4 py-6 text-center text-gray-500">
                            Sin datos de canales para este periodo.
                          </td>
                        </tr>
                      ) : (
                        channels.map((channelItem) => (
                          <tr key={channelItem.channel} className="hover:bg-white/5 transition-colors">
                            <td className="px-4 py-2 text-gray-200">{channelItem.channel}</td>
                            <td className="px-4 py-2 text-right tabular-nums text-blue-300">
                              {formatNumber(channelItem.sessions)}
                            </td>
                            <td className="px-4 py-2 text-right tabular-nums text-indigo-300">
                              {formatNumber(channelItem.activeUsers)}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-white/10 bg-white/[0.02] overflow-hidden">
              <div className="px-4 py-3 border-b border-white/10 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <p className="text-xs font-bold uppercase tracking-wider text-gray-500">
                  Rendimiento SEO
                </p>
                <div className="inline-flex items-center gap-1 rounded-xl border border-white/10 bg-black/20 p-1 self-start">
                  <button
                    type="button"
                    onClick={() => setSeoTab("queries")}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                      seoTab === "queries"
                        ? "bg-blue-600 text-white"
                        : "text-gray-300 hover:bg-white/10"
                    }`}
                  >
                    Top Queries
                  </button>
                  <button
                    type="button"
                    onClick={() => setSeoTab("pages")}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                      seoTab === "pages"
                        ? "bg-blue-600 text-white"
                        : "text-gray-300 hover:bg-white/10"
                    }`}
                  >
                    Top Páginas
                  </button>
                </div>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-[11px] uppercase tracking-wider text-gray-500">
                      <th className="px-4 py-2 font-semibold">
                        {seoTab === "pages" ? "URL" : "Palabra clave"}
                      </th>
                      <th className="px-4 py-2 font-semibold text-right">Clics</th>
                      <th className="px-4 py-2 font-semibold text-right">Impresiones</th>
                      <th className="px-4 py-2 font-semibold text-right">CTR</th>
                      <th className="px-4 py-2 font-semibold text-right">Posición</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {seoRows.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="px-4 py-6 text-center text-gray-500">
                          Sin datos SEO para este periodo.
                        </td>
                      </tr>
                    ) : (
                      seoRows.map((row, index) => (
                        <tr
                          key={`${seoTab}-${seoTab === "pages" ? row.page : row.query}-${index}`}
                          className="hover:bg-white/5 transition-colors"
                        >
                          <td className="px-4 py-2 text-gray-200 max-w-[540px] truncate" title={seoTab === "pages" ? row.page : row.query}>
                            {seoTab === "pages"
                              ? formatSeoPageLabel(row.page, seoData?.siteUrl)
                              : row.query}
                          </td>
                          <td className="px-4 py-2 text-right tabular-nums text-emerald-300">
                            {formatNumber(row.clicks)}
                          </td>
                          <td className="px-4 py-2 text-right tabular-nums text-blue-300">
                            {formatNumber(row.impressions)}
                          </td>
                          <td className="px-4 py-2 text-right tabular-nums text-purple-300">
                            {formatPercent(row.ctr)}
                          </td>
                          <td className="px-4 py-2 text-right tabular-nums text-gray-300">
                            {row.position.toFixed(2)}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            <p className="text-[11px] text-gray-600">
              Última actualización GA4: {formatDateTime(gaData?.generatedAt)} ·
              {" "}SEO: {formatDateTime(seoData?.generatedAt)}
            </p>
          </>
        ) : null}
      </div>
    </section>
  );
}
