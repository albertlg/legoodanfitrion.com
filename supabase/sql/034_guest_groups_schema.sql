-- =====================================================
-- 034_guest_groups_schema.sql
-- Feature B2C: Grupos de Invitados
-- =====================================================

begin;

create extension if not exists pgcrypto;

-- -----------------------------------------------------
-- 1) Grupos de invitados (propiedad por anfitrión)
-- -----------------------------------------------------
create table if not exists public.guest_groups (
  id uuid primary key default gen_random_uuid(),
  host_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  created_at timestamptz not null default now(),
  constraint guest_groups_name_not_empty check (length(trim(name)) > 0)
);

create index if not exists idx_guest_groups_host_id
  on public.guest_groups(host_id);

-- -----------------------------------------------------
-- 2) Miembros de grupo (contactos por email)
-- -----------------------------------------------------
create table if not exists public.guest_group_members (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references public.guest_groups(id) on delete cascade,
  guest_name text,
  guest_email text not null,
  created_at timestamptz not null default now(),
  constraint guest_group_members_unique_group_email unique (group_id, guest_email),
  constraint guest_group_members_email_not_empty check (length(trim(guest_email)) > 0)
);

create index if not exists idx_guest_group_members_group_id
  on public.guest_group_members(group_id);

create index if not exists idx_guest_group_members_email
  on public.guest_group_members(guest_email);

-- Normalización suave de emails para evitar duplicados por mayúsculas/espacios
create or replace function public.normalize_guest_group_member_email()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.guest_email := lower(trim(new.guest_email));
  if new.guest_name is not null then
    new.guest_name := nullif(trim(new.guest_name), '');
  end if;
  return new;
end;
$$;

drop trigger if exists trg_guest_group_members_normalize_email on public.guest_group_members;
create trigger trg_guest_group_members_normalize_email
before insert or update on public.guest_group_members
for each row execute function public.normalize_guest_group_member_email();

-- -----------------------------------------------------
-- 3) RLS
-- -----------------------------------------------------
alter table public.guest_groups enable row level security;
alter table public.guest_group_members enable row level security;

-- guest_groups: CRUD completo solo sobre grupos propios
drop policy if exists guest_groups_host_all on public.guest_groups;
create policy guest_groups_host_all
on public.guest_groups
for all
to authenticated
using (host_id = auth.uid())
with check (host_id = auth.uid());

-- guest_group_members: CRUD según propiedad del grupo
drop policy if exists guest_group_members_host_all on public.guest_group_members;
create policy guest_group_members_host_all
on public.guest_group_members
for all
to authenticated
using (
  exists (
    select 1
    from public.guest_groups gg
    where gg.id = guest_group_members.group_id
      and gg.host_id = auth.uid()
  )
)
with check (
  exists (
    select 1
    from public.guest_groups gg
    where gg.id = guest_group_members.group_id
      and gg.host_id = auth.uid()
  )
);

commit;

