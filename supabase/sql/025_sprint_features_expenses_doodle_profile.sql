-- =====================================================
-- Sprint 025: Expenses (JSONB) + Event Date Poll (Doodle) + Account delete RPC
-- Fuente: queries ejecutadas en Supabase SQL Editor durante el sprint.
-- =====================================================

-- -----------------------------------------------------
-- A) Gastos del evento (persistencia JSONB en events)
-- -----------------------------------------------------

alter table public.events
  add column if not exists expenses jsonb not null default '[]'::jsonb;

update public.events
  set expenses = '[]'::jsonb
  where expenses is null;

-- =====================================================
-- B) EVENT DATE POLL (Doodle-like) for LeGoodAnfitrión
-- =====================================================

create extension if not exists pgcrypto;

-- 1) Enums
do $$
begin
  if not exists (select 1 from pg_type where typname = 'event_schedule_mode') then
    create type public.event_schedule_mode as enum ('fixed', 'tbd');
  end if;

  if not exists (select 1 from pg_type where typname = 'event_poll_status') then
    create type public.event_poll_status as enum ('inactive', 'open', 'closed');
  end if;

  if not exists (select 1 from pg_type where typname = 'date_vote_choice') then
    create type public.date_vote_choice as enum ('yes', 'no', 'maybe');
  end if;
end
$$;

-- 2) Columns in events
alter table public.events
  add column if not exists schedule_mode public.event_schedule_mode not null default 'fixed',
  add column if not exists poll_status public.event_poll_status not null default 'inactive',
  add column if not exists poll_closed_at timestamptz,
  add column if not exists selected_date_option_id uuid;

-- Backfill safe defaults
update public.events
set schedule_mode = case when start_at is null then 'tbd'::public.event_schedule_mode else 'fixed'::public.event_schedule_mode end
where schedule_mode is null;

update public.events
set poll_status = case when schedule_mode = 'tbd' then 'open'::public.event_poll_status else 'inactive'::public.event_poll_status end
where poll_status is null;

-- 3) Proposed date options
create table if not exists public.event_date_options (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null,
  host_user_id uuid not null references public.profiles(id) on delete cascade,
  starts_at timestamptz not null,
  ends_at timestamptz,
  timezone text not null default 'Europe/Madrid',
  label text,
  position integer not null default 0,
  is_final boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint event_date_options_event_fk
    foreign key (event_id, host_user_id)
    references public.events(id, host_user_id)
    on delete cascade,

  constraint event_date_options_time_check
    check (ends_at is null or ends_at > starts_at),

  constraint event_date_options_unique_slot
    unique (event_id, starts_at, ends_at),

  constraint event_date_options_id_event_host_unique
    unique (id, event_id, host_user_id)
);

-- 4) Votes by invited guest
create table if not exists public.event_date_votes (
  id uuid primary key default gen_random_uuid(),
  event_date_option_id uuid not null,
  event_id uuid not null,
  host_user_id uuid not null references public.profiles(id) on delete cascade,
  guest_id uuid not null,
  vote public.date_vote_choice not null default 'yes',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint event_date_votes_option_fk
    foreign key (event_date_option_id, event_id, host_user_id)
    references public.event_date_options(id, event_id, host_user_id)
    on delete cascade,

  constraint event_date_votes_guest_fk
    foreign key (guest_id, host_user_id)
    references public.guests(id, host_user_id)
    on delete cascade,

  constraint event_date_votes_unique_option_guest
    unique (event_date_option_id, guest_id)
);

-- 5) FK from events.selected_date_option_id -> event_date_options.id
do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'events_selected_date_option_fk'
  ) then
    alter table public.events
      add constraint events_selected_date_option_fk
      foreign key (selected_date_option_id)
      references public.event_date_options(id)
      on delete set null;
  end if;
end
$$;

-- 6) Updated_at triggers (reusing existing set_updated_at())
drop trigger if exists trg_event_date_options_set_updated_at on public.event_date_options;
create trigger trg_event_date_options_set_updated_at
before update on public.event_date_options
for each row execute function public.set_updated_at();

drop trigger if exists trg_event_date_votes_set_updated_at on public.event_date_votes;
create trigger trg_event_date_votes_set_updated_at
before update on public.event_date_votes
for each row execute function public.set_updated_at();

-- 7) Validation trigger: vote must belong to an invited guest of that event
create or replace function public.validate_event_date_vote_invitation()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if not exists (
    select 1
    from public.invitations i
    where i.event_id = new.event_id
      and i.guest_id = new.guest_id
      and i.host_user_id = new.host_user_id
  ) then
    raise exception 'guest_not_invited_to_event';
  end if;

  return new;
end;
$$;

drop trigger if exists trg_validate_event_date_vote_invitation on public.event_date_votes;
create trigger trg_validate_event_date_vote_invitation
before insert or update on public.event_date_votes
for each row execute function public.validate_event_date_vote_invitation();

-- 8) Validation trigger: selected_date_option_id must belong to same event/host
create or replace function public.validate_event_selected_date_option()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if new.selected_date_option_id is not null then
    if not exists (
      select 1
      from public.event_date_options edo
      where edo.id = new.selected_date_option_id
        and edo.event_id = new.id
        and edo.host_user_id = new.host_user_id
    ) then
      raise exception 'selected_date_option_not_belong_to_event';
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists trg_validate_event_selected_date_option on public.events;
create trigger trg_validate_event_selected_date_option
before insert or update on public.events
for each row execute function public.validate_event_selected_date_option();

-- 9) Indexes
create index if not exists idx_event_date_options_event on public.event_date_options(event_id);
create index if not exists idx_event_date_options_event_position on public.event_date_options(event_id, position);
create index if not exists idx_event_date_votes_event on public.event_date_votes(event_id);
create index if not exists idx_event_date_votes_option on public.event_date_votes(event_date_option_id);
create index if not exists idx_event_date_votes_guest on public.event_date_votes(guest_id);

-- 10) RLS
alter table public.event_date_options enable row level security;
alter table public.event_date_votes enable row level security;

drop policy if exists event_date_options_host_all on public.event_date_options;
create policy event_date_options_host_all
on public.event_date_options
for all
to authenticated
using (host_user_id = auth.uid())
with check (host_user_id = auth.uid());

drop policy if exists event_date_votes_host_all on public.event_date_votes;
create policy event_date_votes_host_all
on public.event_date_votes
for all
to authenticated
using (host_user_id = auth.uid())
with check (host_user_id = auth.uid());

-- 11) Public vote RPC by invitation token (for anon/auth)
drop function if exists public.submit_event_date_vote_by_token(text, uuid, public.date_vote_choice);

create function public.submit_event_date_vote_by_token(
  p_token text,
  p_event_date_option_id uuid,
  p_vote public.date_vote_choice
)
returns table (
  ret_event_id uuid,
  ret_event_date_option_id uuid,
  ret_guest_id uuid,
  ret_vote public.date_vote_choice,
  ret_updated_at timestamptz
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_invitation public.invitations%rowtype;
  v_option public.event_date_options%rowtype;
begin
  select * into v_invitation
  from public.invitations i
  where i.public_token = p_token
    and (i.expires_at is null or i.expires_at > now())
  limit 1;

  if v_invitation.id is null then
    raise exception 'invalid_or_expired_invitation_token';
  end if;

  select * into v_option
  from public.event_date_options edo
  where edo.id = p_event_date_option_id
    and edo.event_id = v_invitation.event_id
    and edo.host_user_id = v_invitation.host_user_id
  limit 1;

  if v_option.id is null then
    raise exception 'date_option_not_found_for_event';
  end if;

  if exists (
    select 1
    from public.events e
    where e.id = v_invitation.event_id
      and e.host_user_id = v_invitation.host_user_id
      and e.poll_status = 'closed'
  ) then
    raise exception 'poll_already_closed';
  end if;

  insert into public.event_date_votes (event_date_option_id, event_id, host_user_id, guest_id, vote)
  values (v_option.id, v_invitation.event_id, v_invitation.host_user_id, v_invitation.guest_id, p_vote)
  on conflict (event_date_option_id, guest_id)
  do update set
    vote = excluded.vote,
    updated_at = now()
  returning event_id, event_date_option_id, guest_id, vote, updated_at
  into ret_event_id, ret_event_date_option_id, ret_guest_id, ret_vote, ret_updated_at;

  return next;
end;
$$;

revoke all on function public.submit_event_date_vote_by_token(text, uuid, public.date_vote_choice) from public;
grant execute on function public.submit_event_date_vote_by_token(text, uuid, public.date_vote_choice) to anon, authenticated;

-- 12) Public read RPC: my votes by invitation token
create or replace function public.get_event_date_votes_by_token(p_token text)
returns table (
  event_date_option_id uuid,
  vote public.date_vote_choice
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_invitation public.invitations%rowtype;
begin
  select * into v_invitation
  from public.invitations i
  where i.public_token = p_token
    and (i.expires_at is null or i.expires_at > now())
  limit 1;

  if v_invitation.id is null then
    raise exception 'invalid_or_expired_invitation_token';
  end if;

  return query
  select edv.event_date_option_id, edv.vote
  from public.event_date_votes edv
  where edv.guest_id = v_invitation.guest_id
    and edv.event_id = v_invitation.event_id;
end;
$$;

revoke all on function public.get_event_date_votes_by_token(text) from public;
grant execute on function public.get_event_date_votes_by_token(text) to anon, authenticated;

-- 13) Host RPC: close poll and set final date (strict aliases)
drop function if exists public.close_event_date_poll(uuid, uuid);

create or replace function public.close_event_date_poll(
  p_event_id uuid,
  p_selected_option_id uuid
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_starts_at timestamptz;
begin
  select edo.starts_at
  into v_starts_at
  from public.event_date_options as edo
  where edo.id = p_selected_option_id
    and edo.event_id = p_event_id;

  if v_starts_at is null then
    raise exception 'date_option_not_found';
  end if;

  update public.events as e
  set poll_status = 'closed',
      schedule_mode = 'fixed',
      start_at = v_starts_at
  where e.id = p_event_id;
end;
$$;

revoke all on function public.close_event_date_poll(uuid, uuid) from public;
grant execute on function public.close_event_date_poll(uuid, uuid) to authenticated;

-- =====================================================
-- C) Account delete RPC
-- =====================================================

create or replace function public.delete_user_account()
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  delete from auth.users where id = auth.uid();
end;
$$;

revoke all on function public.delete_user_account() from public;
grant execute on function public.delete_user_account() to authenticated;
