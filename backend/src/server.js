import dotenv from "dotenv";
import express from "express";
import cors from "cors";
import { aiPlannerRoute } from "./routes/ai-planner-route.js";
import { adminAnalyticsRoute } from "./routes/admin-analytics-route.js";
import { spotifyRoute } from "./routes/spotify-routes.js";
import { venueRoute } from "./routes/venue-routes.js";

dotenv.config();

const app = express();
const port = Number(process.env.PORT || 3000);
const envAllowedOrigins = String(
  process.env.CORS_ORIGIN || "http://localhost:5173,http://127.0.0.1:5173"
)
  .split(",")
  .map((item) => item.trim())
  .filter(Boolean);
const defaultProductionOrigins = [
  "https://legoodanfitrion.com",
  "https://www.legoodanfitrion.com"
];
const allowedOrigins = Array.from(new Set([...envAllowedOrigins, ...defaultProductionOrigins]));

const corsOptions = {
  origin(origin, callback) {
    // Permite peticiones sin Origin (curl, health checks, scripts locales).
    if (!origin) {
      callback(null, true);
      return;
    }
    if (allowedOrigins.includes(origin)) {
      callback(null, true);
      return;
    }
    callback(new Error(`CORS blocked for origin: ${origin}`));
  },
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
  credentials: false,
  optionsSuccessStatus: 204
};

app.use(cors(corsOptions));
app.options(/.*/, cors(corsOptions));
app.use((req, _res, next) => {
  console.log(`[${new Date().toISOString()}] Petición recibida: ${req.method} ${req.url}`);
  next();
});
app.use(express.json({ limit: "1mb" }));

app.get("/api/health", (_req, res) => {
  res.json({ ok: true, service: "legoodanfitrion-backend" });
});

app.use("/api/ai", aiPlannerRoute);
app.use("/api/admin/analytics", adminAnalyticsRoute);
app.use("/api/spotify", spotifyRoute);
app.use("/api/venues", venueRoute);

// --- ESTE ES EL TRUCO PARA QUE FUNCIONE EN AMBOS ---

if (process.env.NODE_ENV !== 'production' || !process.env.VERCEL) {
  app.listen(port, () => {
    console.log(`[backend] Motor encendido en http://localhost:${port}`);
  });
}

// Exportación necesaria para Vercel
export default app;
