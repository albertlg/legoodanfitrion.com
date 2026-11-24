// Mantiene activo el proyecto de Supabase.
// El plan gratuito pausa el proyecto tras ~7 días sin actividad y, al pausarse,
// la web entera deja de funcionar (login, panel, RSVP). Una consulta real a la
// base de datos una vez al día evita la pausa.
//
// Se ejecuta desde una Vercel Schedule (ver vercel.json → schedules.supabase-keepalive).
// Si falla, lanza un error: la ejecución queda en rojo en el historial de Schedules.

// Se re-exporta aquí para que /api lo resuelva desde backend/node_modules
// (las dependencias de la raíz no se instalan en el build de Vercel).
export { handleSchedule } from "@vercel/schedules";

function pickEnv(...names) {
    for (const name of names) {
        const value = String(process.env[name] || "").trim();
        if (value) return value;
    }
    return "";
}

export async function pingSupabase({ fetchImpl = fetch } = {}) {
    const supabaseUrl = pickEnv("SUPABASE_URL", "VITE_SUPABASE_URL").replace(/\/+$/, "");
    const apiKey = pickEnv("SUPABASE_ANON_KEY", "VITE_SUPABASE_ANON_KEY", "SUPABASE_SERVICE_ROLE_KEY");
    if (!supabaseUrl || !apiKey) {
        throw new Error("[keepalive] Faltan SUPABASE_URL / clave de Supabase en las variables de entorno");
    }

    // RPC pública y de solo lectura (migración 058). Con un token inexistente
    // devuelve [] pero ejecuta una consulta en Postgres, que es lo que cuenta
    // como actividad del proyecto.
    const startedAt = Date.now();
    const res = await fetchImpl(`${supabaseUrl}/rest/v1/rpc/get_rsvp_preview`, {
        method: "POST",
        headers: {
            apikey: apiKey,
            Authorization: `Bearer ${apiKey}`,
            "Content-Type": "application/json",
            Accept: "application/json"
        },
        body: JSON.stringify({ p_token: "keepalive-ping" })
    });
    const elapsedMs = Date.now() - startedAt;

    if (!res.ok) {
        const body = await res.text().catch(() => "");
        throw new Error(`[keepalive] Supabase respondió HTTP ${res.status} en ${elapsedMs} ms: ${body.slice(0, 200)}`);
    }
    return { ok: true, status: res.status, elapsedMs };
}
