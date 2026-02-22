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

## Paso 1.2 (campos de localizacion Google Maps para eventos)

Ejecuta tambien este SQL:

- `/Users/albertlg/Documents/New project/supabase/sql/003_event_location_maps_fields.sql`

Esto anade `location_place_id`, `location_lat` y `location_lng` para validar direcciones y mostrar mapas.

## Paso 1.3 (idioma de contenido para traducciones futuras)

Ejecuta tambien este SQL:

- `/Users/albertlg/Documents/New project/supabase/sql/004_content_language_fields.sql`

Esto anade `content_language` en `events` y `guests` para guardar el idioma original de los textos y poder habilitar traducciones automaticas en la siguiente iteracion.

## Paso 1.4 (perfil enriquecido de invitados + sugerencias de anfitrion)

Ejecuta tambien este SQL:

- `/Users/albertlg/Documents/New project/supabase/sql/005_guest_enrichment_fields.sql`

Esto anade campos para enriquecer perfiles de invitados:

- contacto y contexto (`address`, `postal_code`, `state_region`, `company`, `twitter`, `instagram`, `linkedin`, `last_meet_at`)
- preferencias ampliadas (`experience_types`, `preferred_guest_relationships`, `preferred_day_moments`, `periodicity`, `cuisine_types`, `pets`)

Con estos campos, el frontend puede sugerir:

- que menu y bebidas priorizar
- que ingredientes/bebidas evitar (alergias, intolerancias, dislikes)
- como ambientar (colores, musica)
- ideas de conversacion y temas a evitar

## Paso 1.5 (conversion invitado -> anfitrion)

Ejecuta tambien este SQL:

- `/Users/albertlg/Documents/New project/supabase/sql/006_guest_host_conversion.sql`

Esto crea la funcion `get_host_guest_conversions()` para detectar automaticamente si un invitado ya es un usuario registrado (por email o telefono) y mostrar metricas de conversion en el panel.

## Paso 1.6 (analytics de conversion: fecha + fuente)

Ejecuta tambien este SQL:

- `/Users/albertlg/Documents/New project/supabase/sql/007_guest_host_conversion_analytics.sql`

Esto amplia `get_host_guest_conversions()` para devolver:

- `conversion_source` (`email`, `phone` o `google`)
- `converted_at` (fecha estimada de conversion para analitica de growth)

## Paso 1.7 (perfil global compartido de invitado + permisos por categoria)

Ejecuta tambien este SQL:

- `/Users/albertlg/Documents/New project/supabase/sql/012_shared_guest_profiles.sql`

Este paso anade un modelo hibrido:

- `global_guest_profiles`: perfil global del invitado, gestionado por su propietario.
- `global_guest_profile_preferences`: gustos/afinidades compartibles.
- `global_guest_profile_sensitive`: salud/restricciones con consentimiento explicito.
- `global_guest_profile_shares`: permisos granulares por anfitrion y categoria.
- `host_guest_profile_links`: enlace entre el invitado local del host y el perfil global.
- `host_guest_private_notes`: notas privadas del host (no compartidas).
- `global_guest_profile_consent_events`: auditoria de consentimientos y cambios.

Funciones incluidas:

- `has_profile_share_access(profile_id, scope)` para resolver permisos por categoria.
- `get_or_create_my_global_guest_profile()` para crear/recuperar el perfil global del usuario autenticado.

## Paso 1.8 (validacion rapida del modelo compartido)

En `SQL Editor`, ejecuta:

```sql
select table_name
from information_schema.tables
where table_schema = 'public'
  and table_name like 'global_guest_profile%'
order by table_name;
```

Y tambien:

```sql
select public.get_or_create_my_global_guest_profile();
```

Si devuelve un UUID, el perfil global base esta operativo.

## Paso 1.9 (auto-vinculado y permisos compartidos)

Ejecuta tambien este SQL:

- `/Users/albertlg/Documents/New project/supabase/sql/013_shared_guest_profile_linking_and_shares.sql`

Anade RPCs para que frontend pueda operar el modelo compartido:

- `link_my_guest_to_matched_global_profile(guest_id)`:
  enlaza un invitado local con perfil global si detecta usuario registrado por email/telefono.
- `link_all_my_guests_to_global_profiles()`:
  intenta enlazar en lote todos los invitados del anfitrion.
- `get_my_global_profile_share_targets()`:
  devuelve anfitriones detectados para configurar permisos.
- `set_my_global_profile_share(...)`:
  guarda permisos por anfitrion y categoria (identidad, comida, estilo, conversacion, salud).

Validacion minima:

```sql
select * from public.link_all_my_guests_to_global_profiles();
```

Si no hay invitados vinculables devolvera `linked_count = 0`, que tambien es correcto.

## Paso 1.10 (hotfix ambiguedad owner_user_id)

Si al vincular invitados aparece:
`column reference "owner_user_id" is ambiguous`

ejecuta este SQL correctivo:

- `/Users/albertlg/Documents/New project/supabase/sql/014_fix_link_guest_owner_user_id_ambiguity.sql`

Este parche reemplaza la funcion `link_my_guest_to_matched_global_profile` usando
`on conflict on constraint global_guest_profiles_owner_unique`.

## Paso 1.11 (hotfix ambiguedad guest_id)

Si al vincular invitados aparece:
`column reference "guest_id" is ambiguous`

ejecuta este SQL correctivo:

- `/Users/albertlg/Documents/New project/supabase/sql/015_fix_link_guest_guest_id_ambiguity.sql`

Este parche actualiza `link_my_guest_to_matched_global_profile` para usar:
`on conflict on constraint host_guest_profile_links_pkey`.

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

### Paso 3.1 (activar SSO con Google)

1. Ve a `Authentication` -> `Providers` -> `Google`.
2. Activa Google provider.
3. Configura `Client ID` y `Client Secret` desde Google Cloud Console (OAuth 2.0 Client).
4. En Google Cloud, añade en `Authorized redirect URIs` la URL que te muestra Supabase para Google OAuth.
5. Guarda cambios y prueba en login con el botón `Continuar con Google`.

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
VITE_GOOGLE_MAPS_API_KEY=TU_GOOGLE_MAPS_API_KEY

### 5.2.1 Como obtener `VITE_GOOGLE_MAPS_API_KEY`

1. En Google Cloud Console, crea (o usa) un proyecto.
2. Activa APIs:
   - `Maps JavaScript API`
   - `Places API`
3. Crea una API key.
4. Restringe la key por:
   - `HTTP referrers` (tu dominio y `http://localhost:5173/*`)
   - APIs permitidas (`Maps JavaScript API`, `Places API`)
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
