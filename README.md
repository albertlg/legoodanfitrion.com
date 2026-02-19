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

## 4) Documentación de producto/privacidad

- Estrategia MVP: `/Users/albertlg/Documents/New project/docs/mvp-strategy.md`
- Notas GDPR: `/Users/albertlg/Documents/New project/docs/gdpr-contact-policy-notes.md`
