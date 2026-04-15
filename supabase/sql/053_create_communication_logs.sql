create table if not exists public.communication_logs (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  recipient text not null,
  subject text not null,
  mode text not null check (mode in ('personal', 'professional', 'auth')),
  status text not null check (status in ('sent', 'failed')),
  error_details text,
  metadata jsonb not null default '{}'::jsonb
);

create index if not exists idx_communication_logs_created_at_desc
  on public.communication_logs(created_at desc);

create index if not exists idx_communication_logs_mode
  on public.communication_logs(mode);

create index if not exists idx_communication_logs_recipient
  on public.communication_logs(lower(recipient));

alter table public.communication_logs enable row level security;

drop policy if exists "Admins can read communication logs" on public.communication_logs;
create policy "Admins can read communication logs"
  on public.communication_logs
  for select
  to authenticated
  using (public.is_lga_admin());
