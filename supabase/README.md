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

## Paso 5 (siguiente integración con frontend)

Cuando quieras, el siguiente paso es conectar el frontend con Supabase:

- instalar SDK: `@supabase/supabase-js`
- definir `.env` con URL y anon key
- crear pantallas mínimas:
  - login
  - crear evento
  - crear invitado
  - invitar + obtener token de RSVP

Yo te guío paso a paso en ese punto.

## Nota GDPR importante

Los campos de alergias/intolerancias son sensibles. Este esquema ya bloquea guardar datos sensibles sin consentimiento (`guest_sensitive_preferences`), pero además debes:

- recoger consentimiento explícito en UI
- registrar versión de consentimiento (`consent_version`)
- permitir revocación y borrado

