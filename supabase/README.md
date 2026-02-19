# Supabase backend MVP (paso a paso)

Esta carpeta contiene el backend base del MVP para LeGoodAnfitrion.

## Qué hace este backend

- Crea tablas para:
  - usuarios (`profiles`)
  - eventos (`events`)
  - invitados (`guests`)
  - preferencias (`guest_preferences`)
  - datos sensibles con consentimiento (`guest_sensitive_preferences`)
  - invitaciones + RSVP (`invitations`)
  - gastos y reparto (`expenses`, `expense_shares`)
  - consentimientos (`consents`)
- Activa seguridad RLS (cada host solo ve sus datos).
- Añade función pública de RSVP por enlace:
  - `get_invitation_public(token)`
  - `submit_rsvp_by_token(token, status, note, guest_name)`

## Paso 0 (una sola vez)

1. Crea cuenta en [Supabase](https://supabase.com/).
2. Crea un proyecto nuevo.
3. Guarda en un bloc:
   - `Project URL`
   - `anon public key`
   - `service_role key` (solo backend seguro; nunca en frontend).

## Paso 1 (ejecutar esquema SQL)

1. En Supabase, abre tu proyecto.
2. Ve a `SQL Editor`.
3. Crea una query nueva.
4. Copia y pega el contenido completo de:
   - `/Users/albertlg/Documents/New project/supabase/sql/001_mvp_schema.sql`
5. Pulsa `Run`.

Si sale error, copia el mensaje exacto y me lo pegas para corregirlo.

## Paso 1.1 (preferencias de idioma/tema por usuario)

Ejecuta tambien este SQL:

- `/Users/albertlg/Documents/New project/supabase/sql/002_profile_ui_preferences.sql`

Esto anade el campo `preferred_theme` al perfil para guardar la preferencia visual (`light/dark/system`) por usuario.

## Paso 2 (verificación rápida)

En `SQL Editor`, ejecuta:

```sql
select table_name
from information_schema.tables
where table_schema = 'public'
order by table_name;
```

Debes ver al menos:
- `profiles`
- `events`
- `guests`
- `guest_preferences`
- `guest_sensitive_preferences`
- `invitations`
- `expenses`
- `expense_shares`
- `consents`

## Paso 3 (activar Auth por email)

1. Ve a `Authentication` -> `Providers`.
2. Activa Email provider (si no está activo).
3. En `Authentication` -> `URL Configuration`, configura:
   - `Site URL` (tu URL de frontend cuando la tengas en producción)
   - en local: `http://localhost:5173`

## Paso 4 (crear primer usuario de prueba)

1. En `Authentication` -> `Users` -> `Add user`.
2. Crea un usuario con email/contraseña.
3. El trigger crea automáticamente su fila en `profiles`.

Para comprobarlo:

```sql
select id, full_name, preferred_language, created_at
from public.profiles
order by created_at desc
limit 5;
```

## Paso 5 (conectar frontend con Supabase)

Este paso ya está implementado en el código:

- login con email/password
- crear cuenta desde la app
- crear evento (`events`)
- crear invitado (`guests`)
- lista de últimos eventos e invitados

### 5.1 Obtener valores de entorno en Supabase

1. En tu proyecto de Supabase, ve a `Project Settings` -> `API`.
2. Copia estos dos valores:
   - `Project URL`
   - `anon public` key

### 5.2 Crear archivo `.env` del frontend

En terminal:

```bash
cd "/Users/albertlg/Documents/New project/frontend"
cp .env.example .env
```

Abre `/Users/albertlg/Documents/New project/frontend/.env` y rellena:

```env
VITE_SUPABASE_URL=TU_PROJECT_URL
VITE_SUPABASE_ANON_KEY=TU_ANON_PUBLIC_KEY
```

### 5.3 Reiniciar Docker (importante)

Para que el contenedor lea el nuevo `.env` y dependencias:

```bash
cd "/Users/albertlg/Documents/New project"
docker compose down -v
docker compose up --build
```

### 5.4 Probar la app

1. Abre `http://localhost:5173`.
2. Si no tienes cuenta:
   - usa botón `Crear cuenta` en la app, o
   - créala en Supabase (`Authentication` -> `Users` -> `Add user`).
3. Inicia sesión.
4. Crea un evento.
5. Crea un invitado (recuerda: email o teléfono es obligatorio).
6. Crea una invitación desde el panel:
   - selecciona evento + invitado
   - pulsa `Generar enlace RSVP`
   - abre el enlace (`/?token=...`) en otra pestaña o en incógnito
   - responde `Sí/No/Tal vez`
7. Vuelve al panel y revisa `Últimas invitaciones` para ver estado actualizado.

Si algo falla, copia el error exacto y te lo corrijo.

## Nota GDPR importante

Los campos de alergias/intolerancias son sensibles. Este esquema ya bloquea guardar datos sensibles sin consentimiento (`guest_sensitive_preferences`), pero además debes:

- recoger consentimiento explícito en UI
- registrar versión de consentimiento (`consent_version`)
- permitir revocación y borrado
