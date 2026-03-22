import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "../lib/supabaseClient";
import {
  AreaChart, Area, XAxis, YAxis, Tooltip as RechartsTooltip, ResponsiveContainer, CartesianGrid,
} from "recharts";

const PAGE_SIZE = 10;

// ─── Info Tooltip ────────────────────────────────────────────────────
function InfoTooltip({ text }) {
  const [show, setShow] = useState(false);
  return (
    <span
      className="relative inline-flex"
      onMouseEnter={() => setShow(true)}
      onMouseLeave={() => setShow(false)}
      onClick={() => setShow((s) => !s)}
    >
      <svg className="w-3.5 h-3.5 text-gray-500 hover:text-gray-300 transition-colors cursor-help" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10" />
        <path d="M12 16v-4" />
        <path d="M12 8h.01" />
      </svg>
      {show && (
        <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-1.5 rounded-lg bg-gray-800 border border-white/10 text-[11px] text-gray-200 whitespace-nowrap shadow-xl z-50 pointer-events-none">
          {text}
          <span className="absolute top-full left-1/2 -translate-x-1/2 -mt-px border-4 border-transparent border-t-gray-800" />
        </span>
      )}
    </span>
  );
}

// ─── KPI Card ────────────────────────────────────────────────────────
function KpiCard({ label, value, subtitle, icon, accent, tooltip }) {
  return (
    <div className="relative hover:z-50 rounded-2xl border border-white/10 bg-white/5 backdrop-blur-2xl p-5 flex flex-col gap-2 shadow-lg group">
      {accent && (
        <div className={`absolute inset-0 rounded-2xl overflow-hidden pointer-events-none`}>
          <div className={`absolute -top-8 -right-8 w-24 h-24 rounded-full blur-2xl opacity-20 group-hover:opacity-30 transition-opacity ${accent}`} />
        </div>
      )}
      <div className="flex items-center justify-between relative z-10">
        <span className="text-xs font-bold uppercase tracking-widest text-gray-400 flex items-center gap-1.5">
          {label}
          {tooltip && <InfoTooltip text={tooltip} />}
        </span>
        <span className="text-lg opacity-50">{icon}</span>
      </div>
      <span className="text-3xl font-black text-white tabular-nums relative z-10">{value ?? "—"}</span>
      {subtitle && <span className="text-xs text-gray-500 relative z-10">{subtitle}</span>}
    </div>
  );
}

// ─── Pagination controls ─────────────────────────────────────────────
function Pagination({ page, totalPages, onPageChange }) {
  if (totalPages <= 1) return null;
  return (
    <div className="flex items-center justify-between px-5 py-3 border-t border-white/5">
      <button
        onClick={() => onPageChange(page - 1)}
        disabled={page <= 1}
        className="px-3 py-1.5 rounded-lg text-xs font-medium bg-white/5 border border-white/10 text-gray-400 hover:bg-white/10 hover:text-white transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
      >
        Anterior
      </button>
      <span className="text-xs text-gray-500 tabular-nums">
        {"P\u00e1gina"} {page} de {totalPages}
      </span>
      <button
        onClick={() => onPageChange(page + 1)}
        disabled={page >= totalPages}
        className="px-3 py-1.5 rounded-lg text-xs font-medium bg-white/5 border border-white/10 text-gray-400 hover:bg-white/10 hover:text-white transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
      >
        Siguiente
      </button>
    </div>
  );
}

// ─── Paginated Table ─────────────────────────────────────────────────
function PaginatedTable({ title, headers, allRows, emptyMsg = "Sin datos", renderRow }) {
  const [page, setPage] = useState(1);
  const totalPages = Math.max(1, Math.ceil(allRows.length / PAGE_SIZE));
  const visibleRows = allRows.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  useEffect(() => { setPage(1); }, [allRows.length]);

  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur-2xl overflow-hidden shadow-lg">
      <div className="px-5 py-4 border-b border-white/5 flex items-center justify-between">
        <h3 className="text-sm font-bold uppercase tracking-widest text-gray-400">{title}</h3>
        <span className="text-[10px] text-gray-600 tabular-nums">{allRows.length} registros</span>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-xs text-gray-500 uppercase tracking-wider">
              {headers.map((h, i) => (
                <th key={i} className="px-5 py-3 font-medium">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {visibleRows.length === 0 ? (
              <tr><td colSpan={headers.length} className="px-5 py-8 text-center text-gray-600">{emptyMsg}</td></tr>
            ) : (
              visibleRows.map((row, i) => (
                <tr key={i} className="hover:bg-white/5 transition-colors">
                  {renderRow(row).map((cell, j) => (
                    <td key={j} className="px-5 py-3 text-gray-300 whitespace-nowrap">{cell}</td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
      <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />
    </div>
  );
}

// ─── Status badge ────────────────────────────────────────────────────
function StatusBadge({ status }) {
  const map = {
    published: "bg-green-500/20 text-green-400 border-green-500/30",
    draft: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
    completed: "bg-blue-500/20 text-blue-400 border-blue-500/30",
    cancelled: "bg-red-500/20 text-red-400 border-red-500/30",
  };
  return (
    <span className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold uppercase border ${map[status] || "bg-gray-500/20 text-gray-400 border-gray-500/30"}`}>
      {status}
    </span>
  );
}

// ─── RSVP badge ──────────────────────────────────────────────────────
function RsvpBadge({ status }) {
  const map = {
    yes: { cls: "bg-green-500/20 text-green-400 border-green-500/30", label: "S\u00ed" },
    no: { cls: "bg-red-500/20 text-red-400 border-red-500/30", label: "No" },
    maybe: { cls: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30", label: "Tal vez" },
  };
  const m = map[status] || { cls: "bg-gray-500/20 text-gray-400 border-gray-500/30", label: status };
  return (
    <span className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold uppercase border ${m.cls}`}>
      {m.label}
    </span>
  );
}

// ─── Custom Recharts Tooltip ─────────────────────────────────────────
function ChartTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-xl bg-gray-900/95 border border-white/10 backdrop-blur-xl px-3 py-2 shadow-xl">
      <p className="text-[10px] text-gray-400 font-medium mb-0.5">{label}</p>
      <p className="text-sm font-bold text-white">{payload[0].value} registros</p>
    </div>
  );
}

// ─── Signups Chart ───────────────────────────────────────────────────
function SignupsChart({ data = [] }) {
  const chartData = data.map((d) => ({
    day: new Date(d.day).toLocaleDateString("es-ES", { day: "2-digit", month: "short" }),
    count: d.count,
  }));

  if (!chartData.length) {
    return (
      <div className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur-2xl p-5 shadow-lg flex items-center justify-center h-64">
        <span className="text-gray-600 text-sm">Sin datos de registros en los últimos 30 días</span>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur-2xl p-5 shadow-lg">
      <h3 className="text-sm font-bold uppercase tracking-widest text-gray-400 mb-4">
        Registros diarios (30d)
      </h3>
      <ResponsiveContainer width="100%" height={220}>
        <AreaChart data={chartData} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
          <defs>
            <linearGradient id="signupGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#8b5cf6" stopOpacity={0.4} />
              <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
          <XAxis
            dataKey="day"
            tick={{ fill: "#6b7280", fontSize: 10 }}
            axisLine={{ stroke: "rgba(255,255,255,0.06)" }}
            tickLine={false}
            interval="preserveStartEnd"
          />
          <YAxis
            tick={{ fill: "#6b7280", fontSize: 10 }}
            axisLine={false}
            tickLine={false}
            allowDecimals={false}
          />
          <RechartsTooltip content={<ChartTooltip />} />
          <Area
            type="monotone"
            dataKey="count"
            stroke="#8b5cf6"
            strokeWidth={2}
            fill="url(#signupGradient)"
            dot={false}
            activeDot={{ r: 4, fill: "#8b5cf6", stroke: "#1f2937", strokeWidth: 2 }}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

// ─── Health Badge ────────────────────────────────────────────────────
function HealthBadge({ label, count, okText, warnText, isInfo = false }) {
  const isOk = isInfo || count === 0;
  return (
    <div className={`rounded-xl border p-3 flex items-center gap-3 ${
      isOk
        ? "border-white/5 bg-white/[0.02]"
        : "border-amber-500/20 bg-amber-500/5"
    }`}>
      <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${
        isInfo ? "bg-blue-500/15 text-blue-400" :
        isOk ? "bg-emerald-500/15 text-emerald-400" :
        "bg-amber-500/15 text-amber-400"
      }`}>
        {isInfo ? (
          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10" /><path d="M12 16v-4" /><path d="M12 8h.01" />
          </svg>
        ) : isOk ? (
          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="20 6 9 17 4 12" />
          </svg>
        ) : (
          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
            <line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" />
          </svg>
        )}
      </div>
      <div className="min-w-0">
        <p className="text-xs font-bold text-gray-300">{label}</p>
        <p className={`text-[11px] ${isOk ? "text-gray-500" : "text-amber-400"}`}>
          {isInfo ? okText : (count === 0 ? okText : `${count} ${warnText}`)}
        </p>
      </div>
    </div>
  );
}

// ─── Waitlist Paginated Table ────────────────────────────────────────
function WaitlistTable({ users, fmtDate }) {
  const [page, setPage] = useState(1);
  const totalPages = Math.max(1, Math.ceil(users.length / PAGE_SIZE));
  const visible = users.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  useEffect(() => { setPage(1); }, [users.length]);

  return (
    <>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-xs text-gray-500 uppercase tracking-wider">
              <th className="px-5 py-3 font-medium">Email</th>
              <th className="px-5 py-3 font-medium">Fecha registro</th>
              <th className="px-5 py-3 font-medium">Estado</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {visible.length === 0 ? (
              <tr><td colSpan={3} className="px-5 py-8 text-center text-gray-600">Sin leads en la waitlist</td></tr>
            ) : (
              visible.map((w, i) => (
                <tr key={i} className="hover:bg-white/5 transition-colors">
                  <td className="px-5 py-3 text-gray-300 font-mono text-xs">{w.email}</td>
                  <td className="px-5 py-3 text-gray-400 whitespace-nowrap">{fmtDate(w.created_at)}</td>
                  <td className="px-5 py-3">
                    {w.converted ? (
                      <span className="inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold uppercase border bg-emerald-500/20 text-emerald-400 border-emerald-500/30">
                        Convertido
                      </span>
                    ) : (
                      <span className="inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold uppercase border bg-gray-500/20 text-gray-400 border-gray-500/30">
                        Pendiente
                      </span>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
      <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />
    </>
  );
}

// ─── Main Screen ─────────────────────────────────────────────────────
export function AdminDashboardScreen({ session, t, onNavigate }) {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const fetchStats = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const { data, error: rpcError } = await supabase.rpc("get_admin_dashboard_stats");
      if (rpcError) throw rpcError;
      setStats(data);
    } catch (err) {
      console.error("Admin dashboard RPC error:", err);
      setError(err.message || "Error al cargar estadísticas");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchStats(); }, [fetchStats]);

  const fmtDate = (d) => {
    if (!d) return "—";
    return new Date(d).toLocaleDateString("es-ES", { day: "2-digit", month: "short", year: "numeric" });
  };
  const fmtDateTime = (d) => {
    if (!d) return "—";
    return new Date(d).toLocaleString("es-ES", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });
  };

  const plgRate = stats?.total_unique_guests
    ? ((stats.plg_conversions / stats.total_unique_guests) * 100).toFixed(1)
    : "0.0";

  const activationRate = stats?.total_users
    ? (((stats.active_hosts || 0) / stats.total_users) * 100).toFixed(1)
    : "0.0";

  const topHosts = useMemo(() => stats?.top_hosts || [], [stats]);
  const recentEvents = useMemo(() => stats?.recent_events || [], [stats]);
  const recentRsvps = useMemo(() => stats?.recent_rsvps || [], [stats]);
  const waitlistUsers = useMemo(() => stats?.waitlist_users || [], [stats]);
  const trendingEvents = useMemo(() => stats?.trending_events || [], [stats]);

  const [copyFeedback, setCopyFeedback] = useState("");

  const handleCopyEmails = useCallback(() => {
    const emails = waitlistUsers.map((w) => w.email).join(", ");
    navigator.clipboard.writeText(emails).then(() => {
      setCopyFeedback("Copiados!");
      setTimeout(() => setCopyFeedback(""), 2000);
    }).catch(() => {
      setCopyFeedback("Error al copiar");
      setTimeout(() => setCopyFeedback(""), 2000);
    });
  }, [waitlistUsers]);

  const handleExportCsv = useCallback(() => {
    const header = "Email,Fecha registro,Convertido\n";
    const rows = waitlistUsers.map((w) =>
      `${w.email},${new Date(w.created_at).toISOString().split("T")[0]},${w.converted ? "Sí" : "No"}`
    ).join("\n");
    const blob = new Blob([header + rows], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `waitlist_lga_${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }, [waitlistUsers]);

  return (
    <div className="min-h-screen bg-gray-950 text-white">

      {/* Background gradients */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute -top-40 -left-40 w-[600px] h-[600px] rounded-full bg-gradient-to-tr from-blue-600/15 to-purple-600/10 blur-3xl" />
        <div className="absolute bottom-0 right-0 w-[500px] h-[500px] rounded-full bg-gradient-to-tr from-pink-600/10 to-orange-500/5 blur-3xl" />
      </div>

      <div className="relative z-10 max-w-6xl mx-auto px-4 sm:px-6 py-8 flex flex-col gap-8">

        {/* Header */}
        <header className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-lg font-black shadow-lg">
              LG
            </div>
            <div>
              <h1 className="text-xl font-black tracking-tight">LGA HQ</h1>
              <p className="text-xs text-gray-500">{"Modo Dios \u00b7 "}{session?.user?.email}</p>
            </div>
          </div>
          <div className="flex gap-2">
            <button
              onClick={fetchStats}
              disabled={loading}
              className="px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-sm font-medium text-gray-300 hover:bg-white/10 transition-colors disabled:opacity-50"
            >
              {loading ? "Cargando..." : "Actualizar"}
            </button>
            <button
              onClick={() => onNavigate("/app")}
              className="px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-sm font-medium text-gray-300 hover:bg-white/10 transition-colors"
            >
              Volver al Dashboard
            </button>
          </div>
        </header>

        {/* Error */}
        {error && (
          <div className="rounded-xl bg-red-500/10 border border-red-500/20 px-4 py-3 text-sm text-red-400">
            {error}
          </div>
        )}

        {/* Loading skeleton */}
        {loading && !stats && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
              <div key={i} className="rounded-2xl border border-white/10 bg-white/5 p-5 h-28 animate-pulse" />
            ))}
          </div>
        )}

        {/* Dashboard content */}
        {stats && (
          <>
            {/* Row 1: Core KPIs */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <KpiCard
                label="Usuarios"
                value={stats.total_users}
                subtitle={`+${stats.users_last_30d} en 30 días`}
                icon="👥"
                accent="bg-blue-500"
                tooltip="Total de usuarios registrados en la plataforma."
              />
              <KpiCard
                label="Eventos"
                value={stats.total_events}
                subtitle={`+${stats.events_last_30d} en 30 días`}
                icon="🎉"
                accent="bg-purple-500"
                tooltip="Total de eventos creados (incluye borradores y publicados)."
              />
              <KpiCard
                label="RSVPs"
                value={stats.total_rsvps}
                subtitle={`+${stats.rsvps_last_30d} en 30 días`}
                icon="✅"
                accent="bg-emerald-500"
                tooltip="Total de respuestas a invitaciones procesadas (Sí, No, Tal vez)."
              />
              <KpiCard
                label="PLG Conversión"
                value={`${plgRate}%`}
                subtitle={`${stats.plg_conversions} de ${stats.total_unique_guests} invitados`}
                icon="🚀"
                accent="bg-amber-500"
                tooltip="Porcentaje de invitados que, tras confirmar asistencia, se crearon su propia cuenta."
              />
            </div>

            {/* Row 2: Activation + Viral + Waitlist */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <KpiCard
                label="Tasa Activación"
                value={`${activationRate}%`}
                subtitle={`${stats.active_hosts || 0} hosts activos de ${stats.total_users}`}
                icon="⚡"
                accent="bg-cyan-500"
                tooltip="Porcentaje de usuarios registrados que han creado al menos un evento."
              />
              <KpiCard
                label="Factor Viral"
                value={stats.avg_guests_per_event ?? "0"}
                subtitle="Media invitados / evento"
                icon="🌐"
                accent="bg-pink-500"
                tooltip="Media histórica de invitados por cada evento creado."
              />
              <KpiCard
                label="Waitlist"
                value={stats.total_waitlist}
                subtitle={`${stats.waitlist_converted} convertidos`}
                icon="📋"
                accent="bg-indigo-500"
                tooltip="Personas apuntadas a la lista de espera."
              />
              <KpiCard
                label="Red de Contactos"
                value={stats.total_network_size ?? 0}
                subtitle={`${stats.total_unique_guests ?? 0} guests con cuenta`}
                icon="🕸️"
                accent="bg-orange-500"
                tooltip="Total de correos/contactos únicos almacenados en la plataforma, representando el alcance potencial máximo (TAM) de LeGoodAnfitrión."
              />
            </div>

            {/* Recharts: Daily signups */}
            <SignupsChart data={stats.daily_signups || []} />

            {/* Paginated: Top Hosts */}
            <PaginatedTable
              title="Anfitriones"
              headers={["Nombre", "Email", "Contactos", "Eventos", "Confirmados"]}
              allRows={topHosts}
              renderRow={(h) => [
                h.name || "—",
                h.email,
                <span className="text-orange-400 font-bold tabular-nums">{h.total_contacts ?? 0}</span>,
                h.event_count,
                h.confirmed_guests,
              ]}
            />

            {/* Paginated: All Events */}
            <PaginatedTable
              title="Eventos"
              headers={["Evento", "Anfitrión", "Estado", "Fecha", "Creado", "Inv.", "✅", "❌", "🤔"]}
              allRows={recentEvents}
              renderRow={(e) => [
                <span className="font-medium text-white max-w-[200px] truncate block">{e.title}</span>,
                e.host_name || "—",
                <StatusBadge status={e.status} />,
                fmtDateTime(e.start_at),
                fmtDate(e.created_at),
                e.total_invited,
                <span className="text-green-400">{e.confirmed}</span>,
                <span className="text-red-400">{e.declined}</span>,
                <span className="text-yellow-400">{e.maybe}</span>,
              ]}
            />

            {/* Paginated: Recent RSVPs */}
            <PaginatedTable
              title="Últimos RSVPs"
              headers={["Invitado", "Evento", "Estado", "+1", "Nota", "Fecha respuesta"]}
              allRows={recentRsvps}
              renderRow={(r) => [
                r.guest_name || "—",
                <span className="max-w-[180px] truncate block">{r.event_title}</span>,
                <RsvpBadge status={r.status} />,
                r.rsvp_plus_one ? <span className="text-blue-400 text-xs font-bold">+1</span> : <span className="text-gray-600">—</span>,
                r.response_note
                  ? <span className="max-w-[150px] truncate block text-gray-400 text-xs italic" title={r.response_note}>{r.response_note}</span>
                  : <span className="text-gray-600">—</span>,
                fmtDateTime(r.responded_at),
              ]}
            />

            {/* ── Misión 2: Trending Events + Misión 1: Waitlist ── */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

              {/* Top 5 Trending Events (7d) */}
              <div className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur-2xl overflow-hidden shadow-lg">
                <div className="px-5 py-4 border-b border-white/5 flex items-center gap-2">
                  <span className="text-sm">🔥</span>
                  <h3 className="text-sm font-bold uppercase tracking-widest text-gray-400">
                    Top 5 Trending (7d)
                  </h3>
                </div>
                {trendingEvents.length === 0 ? (
                  <div className="px-5 py-8 text-center text-gray-600 text-sm">
                    Sin RSVPs en los últimos 7 días
                  </div>
                ) : (
                  <div className="divide-y divide-white/5">
                    {trendingEvents.map((ev, i) => (
                      <div key={i} className="px-5 py-3 flex items-center gap-3 hover:bg-white/5 transition-colors">
                        <span className={`flex-shrink-0 w-7 h-7 rounded-lg flex items-center justify-center text-xs font-black ${
                          i === 0 ? "bg-amber-500/20 text-amber-400 border border-amber-500/30" :
                          i === 1 ? "bg-gray-400/20 text-gray-300 border border-gray-400/30" :
                          i === 2 ? "bg-orange-600/20 text-orange-400 border border-orange-600/30" :
                          "bg-white/5 text-gray-500 border border-white/10"
                        }`}>
                          {i + 1}
                        </span>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-white truncate">{ev.title}</p>
                          <p className="text-[11px] text-gray-500">{ev.host_name}</p>
                        </div>
                        <div className="flex items-center gap-1.5 flex-shrink-0">
                          <span className="text-lg font-black text-emerald-400 tabular-nums">{ev.rsvps_7d}</span>
                          <span className="text-[10px] text-gray-500 uppercase">RSVPs</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Misión 3: System Health */}
              <div className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur-2xl overflow-hidden shadow-lg">
                <div className="px-5 py-4 border-b border-white/5 flex items-center gap-2">
                  <span className="text-sm">🛡️</span>
                  <h3 className="text-sm font-bold uppercase tracking-widest text-gray-400">
                    Salud del Sistema
                  </h3>
                </div>
                <div className="p-5 grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <HealthBadge
                    label="Eventos sin anfitrión"
                    count={stats.orphan_events ?? 0}
                    okText="Todo limpio"
                    warnText="datos huérfanos"
                  />
                  <HealthBadge
                    label="RSVPs sin evento"
                    count={stats.orphan_rsvps ?? 0}
                    okText="Todo limpio"
                    warnText="datos huérfanos"
                  />
                  <HealthBadge
                    label="Usuarios activos"
                    count={stats.active_hosts ?? 0}
                    isInfo
                    okText={`${stats.active_hosts ?? 0} de ${stats.total_users ?? 0} han creado eventos`}
                  />
                  <HealthBadge
                    label="Tasa de respuesta"
                    count={stats.total_rsvps ?? 0}
                    isInfo
                    okText={`${stats.total_rsvps ?? 0} respuestas de ${(stats.recent_events || []).reduce((s, e) => s + (e.total_invited || 0), 0)} invitaciones`}
                  />
                </div>
              </div>
            </div>

            {/* Misión 1: Waitlist Table with Export */}
            <div className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur-2xl overflow-hidden shadow-lg">
              <div className="px-5 py-4 border-b border-white/5 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-bold uppercase tracking-widest text-gray-400">
                    Lista de Espera (Waitlist)
                  </h3>
                  <span className="text-[10px] text-gray-600 tabular-nums">{waitlistUsers.length} registros</span>
                </div>
                <div className="flex items-center gap-2">
                  {copyFeedback && (
                    <span className="text-[11px] text-emerald-400 font-medium animate-pulse">{copyFeedback}</span>
                  )}
                  <button
                    onClick={handleCopyEmails}
                    disabled={!waitlistUsers.length}
                    className="px-3 py-1.5 rounded-lg text-xs font-medium bg-white/5 border border-white/10 text-gray-400 hover:bg-white/10 hover:text-white transition-colors disabled:opacity-30 disabled:cursor-not-allowed flex items-center gap-1.5"
                  >
                    <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                      <path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" />
                    </svg>
                    Copiar emails
                  </button>
                  <button
                    onClick={handleExportCsv}
                    disabled={!waitlistUsers.length}
                    className="px-3 py-1.5 rounded-lg text-xs font-medium bg-purple-500/20 border border-purple-500/30 text-purple-300 hover:bg-purple-500/30 hover:text-purple-200 transition-colors disabled:opacity-30 disabled:cursor-not-allowed flex items-center gap-1.5"
                  >
                    <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" />
                      <polyline points="7 10 12 15 17 10" />
                      <line x1="12" y1="15" x2="12" y2="3" />
                    </svg>
                    Exportar CSV
                  </button>
                </div>
              </div>
              <WaitlistTable users={waitlistUsers} fmtDate={fmtDate} />
            </div>
          </>
        )}

        {/* Footer */}
        <footer className="text-center text-xs text-gray-700 py-4">
          LGA HQ · Datos en tiempo real · Solo founders
        </footer>
      </div>
    </div>
  );
}
