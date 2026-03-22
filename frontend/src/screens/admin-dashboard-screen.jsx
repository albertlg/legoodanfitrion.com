import { useCallback, useEffect, useState } from "react";
import { supabase } from "../lib/supabaseClient";

// ─── Mini SVG Sparkline ──────────────────────────────────────────────
function Sparkline({ data = [], width = 120, height = 32, color = "#3b82f6" }) {
  if (!data.length) return null;
  const max = Math.max(...data, 1);
  const step = width / Math.max(data.length - 1, 1);
  const points = data.map((v, i) => `${i * step},${height - (v / max) * height * 0.85}`).join(" ");
  return (
    <svg width={width} height={height} className="inline-block ml-2 opacity-80">
      <polyline fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" points={points} />
    </svg>
  );
}

// ─── KPI Card ────────────────────────────────────────────────────────
function KpiCard({ label, value, subtitle, sparkData, sparkColor, icon }) {
  return (
    <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-white/5 backdrop-blur-2xl p-5 flex flex-col gap-2 shadow-lg">
      <div className="flex items-center justify-between">
        <span className="text-xs font-bold uppercase tracking-widest text-gray-400">{label}</span>
        <span className="text-lg opacity-50">{icon}</span>
      </div>
      <div className="flex items-end gap-2">
        <span className="text-3xl font-black text-white tabular-nums">{value ?? "—"}</span>
        {sparkData && <Sparkline data={sparkData} color={sparkColor} />}
      </div>
      {subtitle && <span className="text-xs text-gray-500">{subtitle}</span>}
    </div>
  );
}

// ─── Table wrapper ───────────────────────────────────────────────────
function GlassTable({ title, headers, rows, emptyMsg = "Sin datos" }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur-2xl overflow-hidden shadow-lg">
      <div className="px-5 py-4 border-b border-white/5">
        <h3 className="text-sm font-bold uppercase tracking-widest text-gray-400">{title}</h3>
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
            {rows.length === 0 ? (
              <tr><td colSpan={headers.length} className="px-5 py-8 text-center text-gray-600">{emptyMsg}</td></tr>
            ) : (
              rows.map((row, i) => (
                <tr key={i} className="hover:bg-white/5 transition-colors">
                  {row.map((cell, j) => (
                    <td key={j} className="px-5 py-3 text-gray-300 whitespace-nowrap">{cell}</td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
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

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

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

  const dailySignups = (stats?.daily_signups || []).map((d) => d.count);

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
              <p className="text-xs text-gray-500">Modo Dios &middot; {session?.user?.email}</p>
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
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="rounded-2xl border border-white/10 bg-white/5 p-5 h-28 animate-pulse" />
            ))}
          </div>
        )}

        {/* Dashboard content */}
        {stats && (
          <>
            {/* KPI Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <KpiCard
                label="Usuarios"
                value={stats.total_users}
                subtitle={`+${stats.users_last_30d} en 30 días`}
                sparkData={dailySignups}
                sparkColor="#3b82f6"
                icon="👥"
              />
              <KpiCard
                label="Eventos"
                value={stats.total_events}
                subtitle={`+${stats.events_last_30d} en 30 días`}
                sparkColor="#8b5cf6"
                icon="🎉"
              />
              <KpiCard
                label="RSVPs"
                value={stats.total_rsvps}
                subtitle={`+${stats.rsvps_last_30d} en 30 días`}
                sparkColor="#10b981"
                icon="✅"
              />
              <KpiCard
                label="PLG Conversión"
                value={`${plgRate}%`}
                subtitle={`${stats.plg_conversions} de ${stats.total_unique_guests} invitados`}
                sparkColor="#f59e0b"
                icon="🚀"
              />
            </div>

            {/* Waitlist mini KPI */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <KpiCard
                label="Waitlist"
                value={stats.total_waitlist}
                subtitle={`${stats.waitlist_converted} convertidos`}
                icon="📋"
              />
              <KpiCard
                label="Ratio Waitlist → User"
                value={stats.total_waitlist ? `${((stats.waitlist_converted / stats.total_waitlist) * 100).toFixed(1)}%` : "0%"}
                subtitle="Leads que se registraron"
                icon="📈"
              />
            </div>

            {/* Tables */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Top Hosts */}
              <GlassTable
                title="Top 5 Anfitriones"
                headers={["Nombre", "Email", "Eventos", "Confirmados"]}
                rows={(stats.top_hosts || []).map((h) => [
                  h.name || "—",
                  h.email,
                  h.event_count,
                  h.confirmed_guests,
                ])}
              />

              {/* Daily signups table */}
              <GlassTable
                title="Registros diarios (30d)"
                headers={["Día", "Registros"]}
                rows={(stats.daily_signups || []).map((d) => [
                  fmtDate(d.day),
                  d.count,
                ])}
              />
            </div>

            {/* Recent events - full width */}
            <GlassTable
              title="Últimos 10 Eventos"
              headers={["Evento", "Anfitrión", "Estado", "Fecha", "Creado", "Inv.", "✅", "❌", "🤔"]}
              rows={(stats.recent_events || []).map((e) => [
                <span className="font-medium text-white max-w-[200px] truncate block">{e.title}</span>,
                e.host_name || "—",
                <StatusBadge status={e.status} />,
                fmtDateTime(e.start_at),
                fmtDate(e.created_at),
                e.total_invited,
                <span className="text-green-400">{e.confirmed}</span>,
                <span className="text-red-400">{e.declined}</span>,
                <span className="text-yellow-400">{e.maybe}</span>,
              ])}
            />
          </>
        )}

        {/* Footer */}
        <footer className="text-center text-xs text-gray-700 py-4">
          LGA HQ &middot; Datos en tiempo real &middot; Solo founders
        </footer>
      </div>
    </div>
  );
}
