-- 059: Normalización de communication_logs para tracking real de entrega

-- 1. Columna email_type: identifica el tipo de email sin inferirlo del subject
alter table public.communication_logs
  add column if not exists email_type text
  check (email_type in (
    'RSVP_TICKET',
    'INVITATION',
    'COHOST_INVITE',
    'BROADCAST',
    'GALLERY_NOTIFICATION',
    'SYSTEM'
  ));

-- 2. Columna message_id: copia directa del ID de Resend para lookup eficiente en webhooks
alter table public.communication_logs
  add column if not exists message_id text;

-- 3. Columna resend_status: estado real de entrega actualizado por el webhook de Resend
alter table public.communication_logs
  add column if not exists resend_status text
  check (resend_status in ('delivered', 'bounced', 'complained', 'clicked', 'opened'));

-- 4. Columna resend_event_at: timestamp del evento de Resend (no del envío)
alter table public.communication_logs
  add column if not exists resend_event_at timestamptz;

-- Índice para lookup de webhook por message_id
create index if not exists idx_communication_logs_message_id
  on public.communication_logs(message_id)
  where message_id is not null;

-- Índice para filtrar por email_type en el panel admin
create index if not exists idx_communication_logs_email_type
  on public.communication_logs(email_type)
  where email_type is not null;

-- Política de update para el servicio backend (usa service_role → bypassa RLS)
-- No necesita política adicional: el webhook usa service_role_key.
