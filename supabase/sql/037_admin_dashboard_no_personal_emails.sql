-- Replace hardcoded admin email whitelist with user-id based registry.
-- This avoids committing personal emails in SQL migrations.

create table if not exists public.app_admins (
  user_id uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

create index if not exists idx_app_admins_created_at on public.app_admins(created_at desc);

alter table public.app_admins enable row level security;

drop policy if exists app_admins_self_select on public.app_admins;
create policy app_admins_self_select
on public.app_admins
for select
to authenticated
using (user_id = auth.uid());

-- No public write policies by default.
revoke all on public.app_admins from anon, authenticated;
grant select on public.app_admins to authenticated;

create or replace function public.is_lga_admin()
returns boolean
language plpgsql
security definer
set search_path = public
as $$
begin
  return exists (
    select 1
    from public.app_admins a
    where a.user_id = auth.uid()
  );
end;
$$;

grant execute on function public.is_lga_admin() to authenticated;

-- Manual seeding example (execute manually with a privileged role):
-- insert into public.app_admins (user_id) values ('<ADMIN_USER_UUID>');
