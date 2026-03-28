# Auditoría DevSecOps — 2026-03-28

## Resumen ejecutivo

Se realizó una auditoría integral del repositorio en cuatro frentes: prevención de fugas, migraciones SQL, estructura/configuración y documentación.

Resultado:

- `1` hallazgo crítico corregido
- `2` hallazgos altos/medios corregidos
- `3` recomendaciones de hardening pendientes (sin bloquear operación)

---

## Hallazgos y estado

### LGA-SEC-001 — Exposición de datos personales en migración SQL
- Severidad: **Crítica**
- Ubicación: `/Users/albertlg/Documents/New project/supabase/sql/023_admin_dashboard.sql:1-28`
- Evidencia: whitelist de emails personales dentro de la función `is_lga_admin()`.
- Impacto: fuga de datos personales en repositorio público + control de acceso acoplado a emails.
- Corrección aplicada:
  - Se eliminó la whitelist por email.
  - Se reemplazó por tabla de control `public.app_admins(user_id uuid)`.
  - `is_lga_admin()` ahora valida por `auth.uid()` contra `app_admins`.
- Archivos:
  - `/Users/albertlg/Documents/New project/supabase/sql/023_admin_dashboard.sql`
  - `/Users/albertlg/Documents/New project/supabase/sql/037_admin_dashboard_no_personal_emails.sql`

### LGA-SEC-002 — Cobertura incompleta de ignores en frontend
- Severidad: **Alta**
- Ubicación: `/Users/albertlg/Documents/New project/frontend/.gitignore:1-2` (antes del fix)
- Evidencia: faltaban ignores críticos (`node_modules`, `dist`, `.env`, logs, `.DS_Store`).
- Impacto: riesgo de commit accidental de secretos, artefactos y basura operativa.
- Corrección aplicada:
  - Se endureció `frontend/.gitignore` con patrones de dependencias, builds, env y logs.
- Archivo:
  - `/Users/albertlg/Documents/New project/frontend/.gitignore`

### LGA-SEC-003 — Logs de backend exponiendo huella de API key
- Severidad: **Media**
- Ubicación: `/Users/albertlg/Documents/New project/backend/src/routes/ai-planner-route.js:463-593`
- Evidencia: logs mostraban prefijo de `GEMINI_API_KEY`.
- Impacto: reduce confidencialidad operacional (filtración parcial en logs).
- Corrección aplicada:
  - Se sustituyó por log booleano `configurada: SÍ/NO`.
- Archivo:
  - `/Users/albertlg/Documents/New project/backend/src/routes/ai-planner-route.js`

---

## Validaciones realizadas

- Revisión de ficheros `gitignore` (raíz, frontend, studio).
- Búsqueda de secretos hardcodeados en `frontend`, `backend`, `supabase`.
- Revisión de migraciones SQL por emails/datos sensibles.
- Revisión de `docker-compose.yml` y env files.
- Revisión de documentación principal (`README.md`, `docs/`).

---

## Recomendaciones pendientes (no bloqueantes)

### LGA-SEC-004 — Guard de admin en frontend basado en `VITE_ADMIN_EMAILS`
- Severidad: **Media**
- Ubicación: `/Users/albertlg/Documents/New project/frontend/src/App.jsx:540-597`
- Riesgo: el guard de frontend no es control de seguridad real.
- Recomendación:
  - Mantener el control real en Supabase RPC (ya existe).
  - Migrar el guard visual de frontend a verificación basada en RPC (`is_lga_admin`) y no en lista local de emails.

### LGA-SEC-005 — `package.json` duplicado en raíz vs frontend
- Severidad: **Baja**
- Ubicación: `/Users/albertlg/Documents/New project/package.json:1-41`
- Riesgo: confusión operativa (scripts/dependencias divergentes).
- Recomendación:
  - Definir si raíz es workspace real o eliminar dependencias/scripts duplicados.

### LGA-SEC-006 — Documentación interna mezclada en raíz
- Severidad: **Baja**
- Ubicación: `/Users/albertlg/Documents/New project/docs/internal/CLAUDE.md` (movido desde raíz)
- Riesgo: ruido para colaboradores externos.
- Recomendación:
  - Mover docs internas a `/docs/internal/` o aclarar su propósito.

---

## Cambios de documentación aplicados

- README reescrito a formato profesional:
  - visión del proyecto
  - stack técnico
  - estructura del repo
  - setup local docker/no-docker
  - variables de entorno
  - scripts de calidad
  - notas de seguridad
- Archivo:
  - `/Users/albertlg/Documents/New project/README.md`
