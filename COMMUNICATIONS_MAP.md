# COMMUNICATIONS MAP — LeGoodAnfitrión
> Auditoría técnica del sistema de emails · 2026-04-25

---

## TL;DR

| Aspecto | Estado |
|---|---|
| Proveedor | **Resend** (SDK oficial) |
| Templates | HTML hardcodeado en `email-service.js` |
| Tipos de email | **5** (RSVP ticket, invitación, co-host, broadcast, galería) |
| Idiomas | **5** (es, ca, en, fr, it) |
| Logging | Tabla `communication_logs` en Supabase |
| Webhooks Resend | ❌ No configurados |
| Panel admin emails | ❌ No implementado (datos están, UI no) |

---

## 1. Mapa de triggers

### 1.1 RSVP Ticket — Confirmación de entrada

| Campo | Valor |
|---|---|
| **Ruta** | `POST /api/rsvp/ticket` |
| **Archivo** | `backend/src/routes/rsvp-routes.js:269` |
| **Función email** | `sendRsvpTicketEmail()` |
| **Autenticación** | Sin JWT — requiere `invitationToken` público válido |
| **Throttle** | `RSVP_TICKET_COOLDOWN_MINUTES` (defecto: 30 min) por `invitationId::email` |

**Datos que lleva:**
- `guestEmail`, `guestName`, `locale`
- `eventDetails` → nombre, fecha, hora, timezone, lugar, URL de detalles

**Precondiciones:**
- Status de invitación = `"yes"`
- Email válido
- Evento existe y no está cancelado

---

### 1.2 Event Invitation — Invitación al evento

| Campo | Valor |
|---|---|
| **Ruta** | `POST /api/invitations/send` |
| **Archivo** | `backend/src/routes/invitations-routes.js:265` |
| **Función email** | `sendEventInvitationEmail()` |
| **Autenticación** | JWT (`requireAuthenticatedUser`) |
| **Throttle** | Ninguno explícito (límites de Resend) |

**Datos que lleva:**
- `guestEmail` (inteligente: profesional vs personal según tipo de evento)
- `guestName`, `hostName`, `invitationUrl`, `locale`, `isProfessionalEvent`
- `eventDetails` completo

**Lógica de email inteligente:**
```js
const PROFESSIONAL_EVENT_TYPES = new Set([
  "networking", "team_building", "corporate_dinner",
  "all_hands", "business_meeting", "conference"
]);
// → evento profesional → envía a email de trabajo del invitado
// → evento personal   → envía a email personal del invitado
```

**Adjunto:** Archivo `.ics` (iCalendar) generado dinámicamente, codificado en base64.

---

### 1.3 Co-Host Invitation — Invitación a co-organizar

| Campo | Valor |
|---|---|
| **Ruta** | `POST /api/team/invite` |
| **Archivo** | `backend/src/routes/team-routes.js:294` |
| **Función email** | `sendCoHostInvitation()` |
| **Autenticación** | JWT (`requireAuthenticatedUser`) |
| **Throttle** | Doble: memoria + DB (`event_team_invite_logs`), `TEAM_INVITE_COOLDOWN_MINUTES` (defecto: 60 min) |

**Datos que lleva:**
- `targetEmail`, `hostName`, `eventName`
- Link de signup con email pre-rellenado (`SIGNUP_URL?email=...`)

**Precondiciones:**
- El email objetivo NO puede estar ya registrado en el sistema (check RPC `get_user_id_by_email`)
- Solo el host principal puede enviar

---

### 1.4 Broadcast — Mensaje masivo a confirmados

| Campo | Valor |
|---|---|
| **Ruta** | `POST /api/events/:id/broadcast` |
| **Archivo** | `backend/src/routes/events-routes.js:342` |
| **Función email** | `sendBroadcastEmail()` |
| **Autenticación** | JWT (`requireAuthenticatedUser`) |
| **Throttle** | `EVENT_BROADCAST_COOLDOWN_MINUTES` (defecto: 30 min) por `eventId::hostUserId` |

**Datos que lleva:**
- `customMessage` (mínimo 5 caracteres), `hostName`, `eventName`, `locale`
- Modo personal/profesional (automático por tipo de evento)

**Envío:** `Promise.allSettled()` paralelo a todos los invitados con `status = "yes"`.

**Respuesta:** `{ sentCount, failedCount, totalRecipients, cooldownMinutes }`

---

### 1.5 Gallery Notification — Fotos disponibles

| Campo | Valor |
|---|---|
| **Ruta** | `PUT /api/events/:id` (condicional) |
| **Archivo** | `backend/src/routes/events-routes.js:720` |
| **Función email** | `sendGalleryNotificationEmail()` |
| **Autenticación** | JWT (`requireAuthenticatedUser`) |
| **Throttle** | Ninguno explícito |

**Se dispara SOLO si:**
- `photo_gallery_url` cambia en el payload
- Y el payload incluye `notifyGallery: true`
- Y la URL es HTTP(S) válida

**Envío:** `Promise.allSettled()` paralelo a todos los invitados con `status = "yes"`.

---

## 2. Proveedor y autenticación

### Proveedor: Resend

```
email-service.js:2  → import { Resend } from "resend"
email-service.js:493 → getResendClient() — singleton, crea instancia una vez
```

**Variables de entorno:**

| Variable | Descripción | Defecto |
|---|---|---|
| `RESEND_API_KEY` | API key de Resend | **REQUERIDA** |
| `RESEND_FROM_EMAIL` | Dirección remitente | `LeGoodAnfitrión <onboarding@resend.dev>` |

**Fallback / Modo mock:**
Si `RESEND_API_KEY` no está definida, el servicio entra en modo MOCK: loguea en consola pero no envía emails reales. Permite desarrollo local sin Resend.

---

### Templates: HTML hardcodeado

Todos los emails se construyen con funciones que retornan strings HTML:

| Función | Línea | Email |
|---|---|---|
| `buildCoHostInviteHtml()` | 530 | Co-host invitation |
| `buildRsvpTicketHtml()` | 638 | RSVP ticket |
| `buildEventInvitationHtml()` | 748 | Invitación a evento |
| `buildBroadcastEmailHtml()` | 1166 | Broadcast |
| `buildGalleryNotificationHtml()` | 1199 | Galería |

**Seguridad:**
- `escapeHtml()` (línea 470) — escapa caracteres especiales en todo output HTML
- `escapeIcsText()` (línea 697) — escapa texto en archivos `.ics`
- `toSafeString()` (línea 347) — sanitiza todos los valores de entrada

**Multiidioma:** Constantes por idioma (es/ca/en/fr/it) al inicio del archivo, líneas 17–342.

---

## 3. Logging: tabla `communication_logs`

### Esquema (Supabase)

```sql
-- Migración: supabase/sql/053_create_communication_logs.sql
create table public.communication_logs (
  id              uuid        primary key default gen_random_uuid(),
  created_at      timestamptz not null default now(),
  recipient       text        not null,
  subject         text        not null,
  mode            text        not null check (mode in ('personal', 'professional', 'auth')),
  status          text        not null check (status in ('sent', 'failed')),
  error_details   text,
  metadata        jsonb       not null default '{}'::jsonb
);
```

**Índices:**
- `idx_communication_logs_created_at_desc` — búsquedas recientes
- `idx_communication_logs_mode` — filtro por modo
- `idx_communication_logs_recipient` — búsqueda por email (lowercase)

**RLS:** Activa. Solo admins (`is_lga_admin()`) pueden leer.

---

### Inserción de logs: `insertCommunicationLog()`

**Línea:** `email-service.js:413`

Cada envío (exitoso o fallido) genera un registro:

```js
{
  recipient:     "guest@example.com",
  subject:       "Tu entrada para Cena de gala",
  mode:          "personal" | "professional" | "auth",
  status:        "sent" | "failed",
  error_details: null | "{ message: '...', code: '...' }",
  metadata: {
    eventId:          "uuid",
    invitationId:     "uuid",        // si aplica
    eventName:        "Cena de gala",
    messageId:        "resend_msg_id", // si enviado con éxito
    mock:             false,
    hasIcsAttachment: true            // solo invitaciones
  }
}
```

---

### Gap: estado posterior al envío

Los logs son **write-once**: se registra `sent` en el momento del envío, pero si Resend luego registra un bounce o un spam complaint, **no se actualiza** el registro. La causa:

- No hay webhook de Resend configurado
- No hay endpoint `/webhooks/resend` en el backend
- No hay `RESEND_WEBHOOK_SECRET` en el `.env`

---

## 4. Panel "Modo Dios" — Estado actual y gaps

### Lo que ya existe (listo para leer)

La tabla `communication_logs` tiene suficientes datos para construir métricas básicas:

```sql
-- Emails enviados por día
SELECT date_trunc('day', created_at) as dia,
       count(*) filter (where status='sent')   as enviados,
       count(*) filter (where status='failed') as fallidos
FROM communication_logs
GROUP BY 1 ORDER BY 1 DESC;

-- Top tipos de email (inferido del subject o mode)
SELECT mode, count(*) FROM communication_logs GROUP BY 1;

-- Tasa de error
SELECT round(
  count(*) filter (where status='failed') * 100.0 / nullif(count(*),0), 2
) as tasa_error_pct FROM communication_logs;
```

### Lo que falta

| Feature | Esfuerzo | Descripción |
|---|---|---|
| Widget admin de métricas | Bajo | Leer `communication_logs` desde panel admin |
| Webhooks Resend | Medio | Endpoint + tabla para delivery/bounce/open events |
| Campo `email_type` | Bajo | Añadir columna explícita al log (ahora solo se infiere del subject) |
| Retry logic | Medio | Reintentos con backoff para errores transitorios de Resend |
| Status updates | Alto | Actualizar `status` a `delivered`/`bounced` vía webhooks |

---

## 5. Todas las variables de entorno de email

| Variable | Archivo de uso | Defecto |
|---|---|---|
| `RESEND_API_KEY` | email-service.js:498 | — (REQUERIDA) |
| `RESEND_FROM_EMAIL` | email-service.js:850,953,1095,1285,1395 | `LeGoodAnfitrión <onboarding@resend.dev>` |
| `SIGNUP_URL` | email-service.js:523 | `https://legoodanfitrion.com/signup` |
| `FRONTEND_URL` | rsvp-routes.js:119, events-routes.js:1243 | `http://localhost:5173` |
| `RSVP_TICKET_COOLDOWN_MINUTES` | rsvp-routes.js:22 | `30` |
| `TEAM_INVITE_COOLDOWN_MINUTES` | team-routes.js:23 | `60` |
| `EVENT_BROADCAST_COOLDOWN_MINUTES` | events-routes.js:104 | `30` |
| `SUPABASE_URL` | email-service.js:360 | — (REQUERIDA) |
| `SUPABASE_SERVICE_ROLE_KEY` | email-service.js:361 | — (REQUERIDA) |
| `CORS_ORIGIN` | rsvp-routes.js:31 | `http://localhost:5173,...,https://legoodanfitrion.com` |

---

## 6. Diagrama de flujo resumido

```
HOST                          BACKEND                     RESEND              SUPABASE
 │                               │                           │                    │
 ├─ POST /invitations/send ──────►│                           │                    │
 │                               ├─ sendEventInvitationEmail │                    │
 │                               ├── resend.emails.send() ──►│                    │
 │                               │◄─── { id: "msg_xxx" } ────│                    │
 │                               ├── insertCommunicationLog() ──────────────────►│
 │◄─ { success, messageId } ─────│                           │                    │
 │                               │                           │                    │

GUEST                          BACKEND                     RESEND              SUPABASE
 │                               │                           │                    │
 ├─ POST /rsvp/ticket ───────────►│                           │                    │
 │  (invitationToken)            ├─ validateToken()  ────────────────────────────►│
 │                               │◄──────────────────────────────────────────────│
 │                               ├─ sendRsvpTicketEmail()    │                    │
 │                               ├── resend.emails.send() ──►│                    │
 │                               ├── insertCommunicationLog() ──────────────────►│
 │◄─ { success, sentTo } ────────│                           │                    │
```

---

## 7. Webhooks de Resend (tracking real de entrega)

### Endpoint

```
POST /api/webhooks/resend
```

**Archivo:** `backend/src/routes/webhooks-routes.js`
**Montado en:** `server.js` — ANTES de `express.json()` para recibir body crudo

### Por qué antes de express.json()

La verificación de firma Svix requiere el body como bytes crudos. Si `express.json()` procesa el body primero, se pierde el buffer original y la firma no puede verificarse.

### Verificación de firma

Implementación manual de Svix HMAC-SHA256 (sin dependencia externa):
1. Concatenar: `${svix-id}.${svix-timestamp}.${rawBody}`
2. HMAC-SHA256 con el secreto decodificado en base64 (`whsec_` → strip prefix → decode)
3. Comparar con cada firma en `svix-signature` (puede haber múltiples: `v1,sig1 v1,sig2`)
4. Rechazar eventos con timestamp > 5 minutos (anti-replay)

**Variable de entorno:** `RESEND_WEBHOOK_SECRET` (formato: `whsec_<base64>`)
Si no está configurada → verificación omitida (modo desarrollo)

### Eventos procesados

| Evento Resend | `resend_status` en DB |
|---|---|
| `email.delivered` | `delivered` |
| `email.bounced` | `bounced` |
| `email.complained` | `complained` |
| `email.clicked` | `clicked` |
| `email.opened` | `opened` |

### Lookup por message_id

El webhook busca el log por la columna `message_id` (nueva en migración 059), que almacena el ID de Resend directamente. Índice `idx_communication_logs_message_id` garantiza lookup O(log n).

### Configuración en Resend Dashboard

1. Ir a **Resend Dashboard → Webhooks → Add Endpoint**
2. URL: `https://legoodanfitrion.com/api/webhooks/resend` (o el backend URL)
3. Eventos a suscribir: `email.delivered`, `email.bounced`, `email.complained`
4. Copiar el **Signing Secret** (`whsec_...`) a la variable `RESEND_WEBHOOK_SECRET`

---

## 8. Normalización email_type (migración 059)

Columna `email_type` añadida a `communication_logs` para clasificación directa sin inferir del `subject`:

| Valor | Email |
|---|---|
| `RSVP_TICKET` | Ticket de confirmación RSVP |
| `INVITATION` | Invitación al evento |
| `COHOST_INVITE` | Invitación a co-organizar |
| `BROADCAST` | Mensaje masivo a confirmados |
| `GALLERY_NOTIFICATION` | Notificación de galería de fotos |
| `SYSTEM` | Reservado para emails del sistema |

También añadidas: `message_id` (texto, indexado), `resend_status` (enum), `resend_event_at` (timestamptz).

---

## 9. Panel Admin — tab Comunicaciones

### KPI cards

| Card | Fuente | Endpoint |
|---|---|---|
| Enviados (30d) | `sent30d` | `/communications/metrics` |
| Entregados (real) | `totalDelivered` | `/communications/metrics` |
| Bounces | `totalBounced` + `bounced30d` | `/communications/metrics` |
| Tasa entrega | `deliveryRate` (%) | `/communications/metrics` |

### Filtros disponibles

- Texto libre por destinatario
- Modo: personal / profesional / auth
- Tipo: RSVP_TICKET / INVITATION / COHOST_INVITE / BROADCAST / GALLERY_NOTIFICATION

### Columnas de la tabla

`Fecha | Destinatario | Tipo | Modo | Envío | Entrega | Error`

- **Tipo** → `EmailTypeBadge` con color por tipo
- **Envío** → `CommunicationStatusBadge` (sent/failed)
- **Entrega** → `ResendStatusBadge` (delivered/bounced/complained/clicked/opened/—)

---

## 10. Variables de entorno adicionales (post-migración)

| Variable | Descripción | Requerida en prod |
|---|---|---|
| `RESEND_WEBHOOK_SECRET` | Signing secret de Resend para verificar webhooks (`whsec_...`) | Sí |

---

*Última actualización: 2026-04-25 — incluye webhooks, email_type, panel admin metrics*
