-- =====================================================
-- 045_event_team_invite_logs.sql
-- Registro de invitaciones por email para co-hosts
-- Incluye guardarraíl anti-spam por (evento + email)
-- =====================================================

create extension if not exists pgcrypto;

create table if not exists public.event_team_invite_logs (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events(id) on delete cascade,
  inviter_user_id uuid not null references public.profiles(id) on delete cascade,
  invited_email text not null,
  sent_count integer not null default 0 check (sent_count >= 0),
  last_sent_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint event_team_invite_logs_unique_event_email unique (event_id, invited_email)
);

create index if not exists idx_event_team_invite_logs_event_id
  on public.event_team_invite_logs(event_id);

create index if not exists idx_event_team_invite_logs_invited_email
  on public.event_team_invite_logs(invited_email);

drop trigger if exists trg_event_team_invite_logs_set_updated_at on public.event_team_invite_logs;
create trigger trg_event_team_invite_logs_set_updated_at
before update on public.event_team_invite_logs
for each row execute function public.set_updated_at();

alter table public.event_team_invite_logs enable row level security;

drop policy if exists event_team_invite_logs_owner_select on public.event_team_invite_logs;
create policy event_team_invite_logs_owner_select
on public.event_team_invite_logs
for select
to authenticated
using (
  exists (
    select 1
    from public.events e
    where e.id = event_team_invite_logs.event_id
      and e.host_user_id = auth.uid()
  )
);

drop policy if exists event_team_invite_logs_owner_insert on public.event_team_invite_logs;
create policy event_team_invite_logs_owner_insert
on public.event_team_invite_logs
for insert
to authenticated
with check (
  inviter_user_id = auth.uid()
  and exists (
    select 1
    from public.events e
    where e.id = event_team_invite_logs.event_id
      and e.host_user_id = auth.uid()
  )
);

drop policy if exists event_team_invite_logs_owner_update on public.event_team_invite_logs;
create policy event_team_invite_logs_owner_update
on public.event_team_invite_logs
for update
to authenticated
using (
  exists (
    select 1
    from public.events e
    where e.id = event_team_invite_logs.event_id
      and e.host_user_id = auth.uid()
  )
)
with check (
  inviter_user_id = auth.uid()
  and exists (
    select 1
    from public.events e
    where e.id = event_team_invite_logs.event_id
      and e.host_user_id = auth.uid()
  )
);

