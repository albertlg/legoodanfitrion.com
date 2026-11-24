// Función privada: solo la invoca el planificador de Vercel (Schedules).
// No tiene URL pública; ver vercel.json → functions / schedules.
import { handleSchedule, pingSupabase } from "../backend/src/jobs/supabase-keepalive.js";

export const POST = handleSchedule(async (metadata) => {
    const result = await pingSupabase();
    console.log(`[keepalive] ${metadata.name} run ${metadata.executionId}: HTTP ${result.status} en ${result.elapsedMs} ms`);
});
