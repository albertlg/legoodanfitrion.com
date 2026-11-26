// Límite de peticiones de IA por usuario (va después de requireAuthenticatedUser).
//
// Protege la cuota del proveedor (Gemini gratis tiene un tope diario por
// proyecto): sin esto, una sola cuenta podría agotarla para todos.
// Se guarda en memoria, así que cada instancia de la función lleva su propia
// cuenta; con el tráfico actual suele haber una sola. Si el uso crece, mover
// los contadores a Supabase.
//
// Generar un plan completo hace 5 peticiones (plan + 4 traducciones), por eso
// el límite por minuto no es más bajo.

// Cuenta demo pública (frontend/src/lib/constants.js): la comparten todos los
// visitantes, así que tiene un límite diario conjunto más bajo.
const DEMO_USER_ID = "de300000-0000-4000-a000-000000000001";

function positiveInt(value, fallback) {
  const parsed = Number.parseInt(String(value ?? ""), 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

const LIMITS = {
  perMinute: positiveInt(process.env.AI_USER_LIMIT_PER_MINUTE, 12),
  perDay: positiveInt(process.env.AI_USER_LIMIT_PER_DAY, 60),
  demoPerDay: positiveInt(process.env.AI_DEMO_LIMIT_PER_DAY, 20)
};

const MAX_TRACKED_USERS = 5000;
const usageByUser = new Map();

function currentDay(now) {
  return new Date(now).toISOString().slice(0, 10);
}

export function aiRateLimit(req, res, next) {
  const userId = req.authUser?.id;
  if (!userId) {
    return res.status(401).json({ error: "Invalid session.", code: "ai_auth_required" });
  }

  const now = Date.now();
  const day = currentDay(now);
  let usage = usageByUser.get(userId);
  if (!usage || usage.day !== day) {
    if (!usage && usageByUser.size >= MAX_TRACKED_USERS) {
      usageByUser.clear();
    }
    usage = { day, dayCount: 0, minuteStart: now, minuteCount: 0 };
    usageByUser.set(userId, usage);
  }
  if (now - usage.minuteStart >= 60_000) {
    usage.minuteStart = now;
    usage.minuteCount = 0;
  }

  const dayLimit = userId === DEMO_USER_ID ? LIMITS.demoPerDay : LIMITS.perDay;
  if (usage.dayCount >= dayLimit || usage.minuteCount >= LIMITS.perMinute) {
    const retryAfterSeconds =
      usage.dayCount >= dayLimit ? 3600 : Math.max(1, Math.ceil((usage.minuteStart + 60_000 - now) / 1000));
    res.set("Retry-After", String(retryAfterSeconds));
    return res.status(429).json({ error: "Too many AI requests.", code: "ai_rate_limited" });
  }

  usage.dayCount += 1;
  usage.minuteCount += 1;
  return next();
}
