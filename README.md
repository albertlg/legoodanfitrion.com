# LeGoodAnfitrion MVP

Base inicial del proyecto con:

- Frontend (React + Vite) en Docker
- CI con GitHub Actions
- Deploy opcional a Vercel con GitHub Actions
- Backend MVP en Supabase (SQL + RLS + consentimiento GDPR básico)

## 1) Arranque local (frontend)

Prerequisitos:

- Docker Desktop
- Git

Ejecutar:

```bash
docker compose up --build
```

Abrir:

- [http://localhost:5173](http://localhost:5173)

Parar:

```bash
docker compose down
```

## 2) CI/CD

Workflows:

- `/Users/albertlg/Documents/New project/.github/workflows/ci.yml`
- `/Users/albertlg/Documents/New project/.github/workflows/deploy-vercel.yml`

Secrets necesarios para deploy a Vercel:

- `VERCEL_TOKEN`
- `VERCEL_ORG_ID`
- `VERCEL_PROJECT_ID`

## 3) Backend MVP (Supabase)

Guía completa (paso a paso):

- `/Users/albertlg/Documents/New project/supabase/README.md`

SQL principal del esquema:

- `/Users/albertlg/Documents/New project/supabase/sql/001_mvp_schema.sql`

Frontend ya conectado a Supabase para:

- Login por email/password
- Login/registro con Google (OAuth, si está activado en Supabase)
- Crear cuenta
- Crear evento
- Crear invitado
- Crear invitación por enlace RSVP
- Página pública de RSVP por token
- Multi-idioma (`es/ca/en/fr`)
- Tema (`claro/oscuro/sistema`)
- Validaciones reforzadas de formularios
- Perfil enriquecido de invitados (preferencias, alergias, interacciones, redes, contexto)
- Importación de contactos (CSV/VCF/pegado) con deduplicado para acelerar altas
- Métricas de conversión invitado -> anfitrión potencial (detección automática por contacto)
- Analytics de conversión con fecha y fuente (`email`/`phone`/`google`)
- Funnel y tendencia de growth (7/30/90 días + gráfico últimos 14 días)
- Fichas de solo lectura para Evento e Invitado (datos completos, mapa, RSVP e historial)
- Perfil del anfitrión editable y sincronizado con su propia ficha de invitado
- Sugerencias inteligentes para anfitrión en eventos (comida, bebida, ambiente, timing, icebreakers)
- Traducción cross-idioma en campos de catálogo de perfil avanzado (se guardan como códigos canónicos)
- Iconografía estándar y ayudas contextuales en formularios
- Mejoras de accesibilidad (mensajes por campo, labels semánticas, estados anunciables)
- Metadatos SEO base en `frontend/index.html`
- Validador/autocompletado de direcciones con Google Maps (Places) + preview de mapa

Branding:

- Ruta del logo: `/Users/albertlg/Documents/New project/frontend/public/brand/logo-legoodanfitrion.png`
- Guía de archivo: `/Users/albertlg/Documents/New project/frontend/public/brand/README.md`

I18n:

- Diccionarios: `/Users/albertlg/Documents/New project/frontend/src/i18n/es.json`
- Diccionarios: `/Users/albertlg/Documents/New project/frontend/src/i18n/ca.json`
- Diccionarios: `/Users/albertlg/Documents/New project/frontend/src/i18n/en.json`
- Diccionarios: `/Users/albertlg/Documents/New project/frontend/src/i18n/fr.json`

Arquitectura UI actual:

- Pantalla auth: `/Users/albertlg/Documents/New project/frontend/src/screens/auth-screen.jsx`
- Pantalla dashboard: `/Users/albertlg/Documents/New project/frontend/src/screens/dashboard-screen.jsx`
- Pantalla RSVP pública: `/Users/albertlg/Documents/New project/frontend/src/screens/public-rsvp-screen.jsx`
- Menu hamburguesa mobile + vistas: `overview/events/guests/invitations`

SQL adicional recomendado (preferencias de UI por usuario):

- `/Users/albertlg/Documents/New project/supabase/sql/002_profile_ui_preferences.sql`
- `/Users/albertlg/Documents/New project/supabase/sql/003_event_location_maps_fields.sql`
- `/Users/albertlg/Documents/New project/supabase/sql/004_content_language_fields.sql`
- `/Users/albertlg/Documents/New project/supabase/sql/005_guest_enrichment_fields.sql`
- `/Users/albertlg/Documents/New project/supabase/sql/006_guest_host_conversion.sql`
- `/Users/albertlg/Documents/New project/supabase/sql/007_guest_host_conversion_analytics.sql`

Variables de entorno frontend:

- `/Users/albertlg/Documents/New project/frontend/.env`
- `VITE_SUPABASE_URL=...`
- `VITE_SUPABASE_ANON_KEY=...`
- `VITE_GOOGLE_MAPS_API_KEY=...` (opcional pero recomendado para validar direcciones)

Pasos detallados de configuración:

- `/Users/albertlg/Documents/New project/supabase/README.md`

## 4) Documentación de producto/privacidad

- Estrategia MVP: `/Users/albertlg/Documents/New project/docs/mvp-strategy.md`
- Notas GDPR: `/Users/albertlg/Documents/New project/docs/gdpr-contact-policy-notes.md`
