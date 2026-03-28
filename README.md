# LeGoodAnfitrión

Plataforma web para planificar eventos, gestionar personas invitadas, RSVP y recomendaciones asistidas por IA.

## Estado del proyecto

- Fase: MVP avanzado en iteración continua
- Frontend principal: React + Vite + Tailwind CSS
- Backend IA: Node.js + Express + Google Gemini
- Datos y auth: Supabase (PostgreSQL + RLS + RPC)
- Idiomas: `es`, `ca`, `en`, `fr`, `it`

## Estructura del repositorio

```text
frontend/        App principal (UI, i18n, rutas, flujos de producto)
backend/         API auxiliar (planner IA, rompehielos, utilidades server-side)
supabase/sql/    Migraciones SQL versionadas (schema, RLS, RPCs)
docs/            Documentación funcional y de estrategia
design/          Recursos y assets de diseño
docker-compose.yml
```

## Requisitos

- Node.js 20+
- npm 10+
- Docker (opcional, recomendado para entorno local unificado)
- Proyecto Supabase activo

## Arranque local (Docker)

1. Configura variables:
   - `backend/.env` (basado en `backend/.env.example`)
   - `frontend/.env` (basado en `frontend/.env.example`)
2. Levanta servicios:

```bash
docker compose up --build
```

Servicios por defecto:
- Frontend: `http://localhost:5173`
- Backend: `http://localhost:3000`

## Arranque local (sin Docker)

```bash
# Terminal 1
cd backend
npm install
npm run dev

# Terminal 2
cd frontend
npm install
npm run dev
```

## Variables de entorno

### `frontend/.env`

Variables mínimas:

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`
- `VITE_GOOGLE_MAPS_API_KEY`
- `VITE_API_URL` (ej. `http://localhost:3000` en local)

Referencia completa en `frontend/.env.example`.

### `backend/.env`

- `GEMINI_API_KEY`
- `CORS_ORIGIN` (lista separada por comas)

Referencia completa en `backend/.env.example`.

## Base de datos y migraciones (Supabase)

Las migraciones SQL están en `supabase/sql/` y siguen numeración incremental.

Recomendado:

1. Ejecutar migraciones en orden.
2. Validar políticas RLS y RPCs después de cada bloque funcional.
3. Mantener cualquier cambio de schema en SQL versionado (Schema as Code).

## Scripts útiles

### Frontend

```bash
cd frontend
npm run dev
npm run build
npm run lint
npm run i18n:check
```

### Backend

```bash
cd backend
npm run dev
npm run start
```

## Seguridad (resumen)

- No se deben versionar secretos (`.env`, claves API, tokens privados).
- El frontend solo debe usar claves públicas (`VITE_*`) y nunca service role keys.
- El control de acceso de datos se resuelve en Supabase con RLS/RPC.
- La autorización administrativa ya no debe depender de emails hardcodeados; se usa tabla de admins por `user_id`.

## Documentación adicional

- `docs/mvp-strategy.md`
- `docs/gdpr-contact-policy-notes.md`
- `docs/shared-guest-profile-strategy.md`

---

LeGoodAnfitrión es un producto en evolución; el enfoque actual prioriza fiabilidad operativa, UX mobile-first y seguridad por defecto.
