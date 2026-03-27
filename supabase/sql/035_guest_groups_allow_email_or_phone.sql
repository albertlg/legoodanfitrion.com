-- =====================================================
-- 035_guest_groups_allow_email_or_phone.sql
-- Guest groups: permitir miembros por email o teléfono
-- =====================================================

begin;

-- 1) Evolución de esquema
alter table public.guest_group_members
  add column if not exists guest_id uuid,
  add column if not exists guest_phone text;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'guest_group_members_guest_id_fkey'
  ) then
    alter table public.guest_group_members
      add constraint guest_group_members_guest_id_fkey
      foreign key (guest_id)
      references public.guests(id)
      on delete set null;
  end if;
end
$$;

alter table public.guest_group_members
  alter column guest_email drop not null;

alter table public.guest_group_members
  drop constraint if exists guest_group_members_email_not_empty;

alter table public.guest_group_members
  drop constraint if exists guest_group_members_unique_group_email;

alter table public.guest_group_members
  drop constraint if exists guest_group_members_contact_check;

alter table public.guest_group_members
  add constraint guest_group_members_contact_check check (
    nullif(trim(coalesce(guest_email, '')), '') is not null
    or nullif(trim(coalesce(guest_phone, '')), '') is not null
  );

-- 2) Backfill y normalización de datos existentes
update public.guest_group_members
set guest_email = nullif(lower(trim(coalesce(guest_email, ''))), ''),
    guest_phone = nullif(trim(coalesce(guest_phone, '')), ''),
    guest_name = nullif(trim(coalesce(guest_name, '')), '');

-- Vincular guest_id por email (cuando exista coincidencia con invitados del mismo host)
update public.guest_group_members ggm
set
  guest_id = g.id,
  guest_name = coalesce(ggm.guest_name, nullif(trim(concat_ws(' ', g.first_name, g.last_name)), '')),
  guest_phone = coalesce(ggm.guest_phone, nullif(trim(g.phone), ''))
from public.guest_groups gg,
     public.guests g
where gg.id = ggm.group_id
  and g.host_user_id = gg.host_id
  and lower(trim(coalesce(g.email, ''))) = lower(trim(coalesce(ggm.guest_email, '')))
  and ggm.guest_id is null
  and g.email is not null
  and trim(g.email) <> '';

-- Vincular guest_id por teléfono si no se vinculó por email
update public.guest_group_members ggm
set
  guest_id = g.id,
  guest_name = coalesce(ggm.guest_name, nullif(trim(concat_ws(' ', g.first_name, g.last_name)), '')),
  guest_email = coalesce(ggm.guest_email, nullif(lower(trim(g.email)), ''))
from public.guest_groups gg,
     public.guests g
where gg.id = ggm.group_id
  and g.host_user_id = gg.host_id
  and regexp_replace(coalesce(g.phone, ''), '\D', '', 'g') = regexp_replace(coalesce(ggm.guest_phone, ''), '\D', '', 'g')
  and ggm.guest_id is null
  and g.phone is not null
  and regexp_replace(g.phone, '\D', '', 'g') <> '';

-- Eliminar duplicados legacy antes de aplicar índices únicos
with ranked as (
  select
    id,
    row_number() over (
      partition by group_id, coalesce(guest_id::text, lower(coalesce(guest_email, '')), regexp_replace(coalesce(guest_phone, ''), '\D', '', 'g'))
      order by created_at asc, id asc
    ) as rn
  from public.guest_group_members
)
delete from public.guest_group_members ggm
using ranked r
where ggm.id = r.id
  and r.rn > 1;

-- 3) Índices únicos flexibles (email/phone/guest_id)
create unique index if not exists idx_guest_group_members_unique_group_email_ci
  on public.guest_group_members(group_id, lower(guest_email))
  where guest_email is not null and trim(guest_email) <> '';

create unique index if not exists idx_guest_group_members_unique_group_phone_digits
  on public.guest_group_members(group_id, regexp_replace(guest_phone, '\D', '', 'g'))
  where guest_phone is not null and regexp_replace(guest_phone, '\D', '', 'g') <> '';

create unique index if not exists idx_guest_group_members_unique_group_guest
  on public.guest_group_members(group_id, guest_id)
  where guest_id is not null;

-- 4) Trigger: normalizar + enriquecer desde guests + validar ownership del host
create or replace function public.normalize_guest_group_member_contact()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  v_group_host_id uuid;
  v_guest public.guests%rowtype;
begin
  if new.guest_id is not null then
    select gg.host_id
    into v_group_host_id
    from public.guest_groups gg
    where gg.id = new.group_id;

    select g.*
    into v_guest
    from public.guests g
    where g.id = new.guest_id
      and (v_group_host_id is null or g.host_user_id = v_group_host_id)
    limit 1;

    if v_guest.id is null then
      raise exception 'guest_not_found_for_group_owner';
    end if;

    new.guest_email := coalesce(new.guest_email, v_guest.email);
    new.guest_phone := coalesce(new.guest_phone, v_guest.phone);
    if new.guest_name is null or trim(new.guest_name) = '' then
      new.guest_name := nullif(trim(concat_ws(' ', v_guest.first_name, v_guest.last_name)), '');
    end if;
  end if;

  new.guest_email := nullif(lower(trim(coalesce(new.guest_email, ''))), '');
  new.guest_phone := nullif(trim(coalesce(new.guest_phone, '')), '');
  new.guest_name := nullif(trim(coalesce(new.guest_name, '')), '');

  if new.guest_email is null and new.guest_phone is null then
    raise exception 'guest_group_member_requires_email_or_phone';
  end if;

  return new;
end;
$$;

drop trigger if exists trg_guest_group_members_normalize_email on public.guest_group_members;
create trigger trg_guest_group_members_normalize_email
before insert or update on public.guest_group_members
for each row execute function public.normalize_guest_group_member_contact();

commit;
