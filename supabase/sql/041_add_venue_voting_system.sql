-- =====================================================
-- 041_add_venue_voting_system.sql
-- Selector de Lugares (event venues + guest voting)
-- =====================================================

begin;

create extension if not exists pgcrypto;

-- -----------------------------------------------------
-- 1) Helper functions (SECURITY DEFINER) for invitee access
-- -----------------------------------------------------
create or replace function public.is_event_invited_user(
  p_event_id uuid,
  p_host_user_id uuid,
  p_user_id uuid
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
begin
  if p_event_id is null or p_host_user_id is null or p_user_id is null then
    return false;
  end if;

  return exists (
    select 1
    from public.invitations i
    join public.guests g
      on g.id = i.guest_id
     and g.host_user_id = i.host_user_id
    where i.event_id = p_event_id
      and i.host_user_id = p_host_user_id
      and g.user_id = p_user_id
  );
end;
$$;

create or replace function public.is_invitation_guest_user(
  p_invitation_id uuid,
  p_user_id uuid
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
begin
  if p_invitation_id is null or p_user_id is null then
    return false;
  end if;

  return exists (
    select 1
    from public.invitations i
    join public.guests g
      on g.id = i.guest_id
     and g.host_user_id = i.host_user_id
    where i.id = p_invitation_id
      and g.user_id = p_user_id
  );
end;
$$;

revoke all on function public.is_event_invited_user(uuid, uuid, uuid) from public;
revoke all on function public.is_invitation_guest_user(uuid, uuid) from public;
grant execute on function public.is_event_invited_user(uuid, uuid, uuid) to authenticated;
grant execute on function public.is_invitation_guest_user(uuid, uuid) to authenticated;

-- -----------------------------------------------------
-- 2) event_venues: candidate venues for an event
-- -----------------------------------------------------
create table if not exists public.event_venues (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null,
  host_user_id uuid not null references public.profiles(id) on delete cascade,
  name text not null,
  address text,
  google_place_id text not null,
  google_rating numeric(3,2) check (google_rating is null or (google_rating >= 0 and google_rating <= 5)),
  google_price_level integer check (google_price_level is null or (google_price_level >= 0 and google_price_level <= 4)),
  google_photo_url text,
  is_final_selection boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint event_venues_event_fk
    foreign key (event_id, host_user_id)
    references public.events(id, host_user_id)
    on delete cascade,
  constraint event_venues_name_not_empty check (length(trim(name)) > 0),
  constraint event_venues_place_id_not_empty check (length(trim(google_place_id)) > 0),
  constraint event_venues_unique_event_place unique (event_id, google_place_id),
  constraint event_venues_id_event_host_unique unique (id, event_id, host_user_id)
);

create index if not exists idx_event_venues_event_id
  on public.event_venues(event_id);

create index if not exists idx_event_venues_host_user_id
  on public.event_venues(host_user_id);

create unique index if not exists idx_event_venues_single_final_selection
  on public.event_venues(event_id)
  where is_final_selection = true;

drop trigger if exists trg_event_venues_set_updated_at on public.event_venues;
create trigger trg_event_venues_set_updated_at
before update on public.event_venues
for each row execute function public.set_updated_at();

-- -----------------------------------------------------
-- 3) event_venue_votes: invitee votes per venue
--    One invitation can vote once per venue.
-- -----------------------------------------------------
create table if not exists public.event_venue_votes (
  id uuid primary key default gen_random_uuid(),
  event_venue_id uuid not null references public.event_venues(id) on delete cascade,
  invitation_id uuid not null references public.invitations(id) on delete cascade,
  event_id uuid not null references public.events(id) on delete cascade,
  host_user_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint event_venue_votes_unique_venue_invitation unique (event_venue_id, invitation_id)
);

create index if not exists idx_event_venue_votes_venue_id
  on public.event_venue_votes(event_venue_id);

create index if not exists idx_event_venue_votes_event_id
  on public.event_venue_votes(event_id);

create index if not exists idx_event_venue_votes_invitation_id
  on public.event_venue_votes(invitation_id);

drop trigger if exists trg_event_venue_votes_set_updated_at on public.event_venue_votes;
create trigger trg_event_venue_votes_set_updated_at
before update on public.event_venue_votes
for each row execute function public.set_updated_at();

-- Validate relational integrity (venue <-> invitation same event/host)
create or replace function public.validate_event_venue_vote_scope()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  v_venue public.event_venues%rowtype;
  v_invitation public.invitations%rowtype;
begin
  select *
  into v_venue
  from public.event_venues ev
  where ev.id = new.event_venue_id
  limit 1;

  if v_venue.id is null then
    raise exception 'event_venue_not_found';
  end if;

  select *
  into v_invitation
  from public.invitations i
  where i.id = new.invitation_id
  limit 1;

  if v_invitation.id is null then
    raise exception 'invitation_not_found';
  end if;

  if v_venue.event_id <> v_invitation.event_id
     or v_venue.host_user_id <> v_invitation.host_user_id then
    raise exception 'invitation_not_valid_for_event_venue';
  end if;

  new.event_id := v_venue.event_id;
  new.host_user_id := v_venue.host_user_id;
  return new;
end;
$$;

drop trigger if exists trg_validate_event_venue_vote_scope on public.event_venue_votes;
create trigger trg_validate_event_venue_vote_scope
before insert or update on public.event_venue_votes
for each row execute function public.validate_event_venue_vote_scope();

-- -----------------------------------------------------
-- 4) RLS
-- -----------------------------------------------------
alter table public.event_venues enable row level security;
alter table public.event_venue_votes enable row level security;

-- event_venues:
-- - hosts/co-hosts can CRUD
-- - invited authenticated users can SELECT
drop policy if exists event_venues_select_editors_or_invited on public.event_venues;
create policy event_venues_select_editors_or_invited
on public.event_venues
for select
to authenticated
using (
  public.is_event_editor(event_id, auth.uid())
  or public.is_event_invited_user(event_id, host_user_id, auth.uid())
);

drop policy if exists event_venues_insert_editors on public.event_venues;
create policy event_venues_insert_editors
on public.event_venues
for insert
to authenticated
with check (
  public.is_event_editor(event_id, auth.uid())
  and exists (
    select 1
    from public.events e
    where e.id = event_venues.event_id
      and e.host_user_id = event_venues.host_user_id
  )
);

drop policy if exists event_venues_update_editors on public.event_venues;
create policy event_venues_update_editors
on public.event_venues
for update
to authenticated
using (public.is_event_editor(event_id, auth.uid()))
with check (public.is_event_editor(event_id, auth.uid()));

drop policy if exists event_venues_delete_editors on public.event_venues;
create policy event_venues_delete_editors
on public.event_venues
for delete
to authenticated
using (public.is_event_editor(event_id, auth.uid()));

-- event_venue_votes:
-- - editors can manage all votes for their events
-- - invited users can vote using their own invitation
drop policy if exists event_venue_votes_select_editors_or_invited on public.event_venue_votes;
create policy event_venue_votes_select_editors_or_invited
on public.event_venue_votes
for select
to authenticated
using (
  public.is_event_editor(event_id, auth.uid())
  or public.is_event_invited_user(event_id, host_user_id, auth.uid())
);

drop policy if exists event_venue_votes_insert_editor_or_owner on public.event_venue_votes;
create policy event_venue_votes_insert_editor_or_owner
on public.event_venue_votes
for insert
to authenticated
with check (
  public.is_event_editor(event_id, auth.uid())
  or public.is_invitation_guest_user(invitation_id, auth.uid())
);

drop policy if exists event_venue_votes_update_editor_or_owner on public.event_venue_votes;
create policy event_venue_votes_update_editor_or_owner
on public.event_venue_votes
for update
to authenticated
using (
  public.is_event_editor(event_id, auth.uid())
  or public.is_invitation_guest_user(invitation_id, auth.uid())
)
with check (
  public.is_event_editor(event_id, auth.uid())
  or public.is_invitation_guest_user(invitation_id, auth.uid())
);

drop policy if exists event_venue_votes_delete_editor_or_owner on public.event_venue_votes;
create policy event_venue_votes_delete_editor_or_owner
on public.event_venue_votes
for delete
to authenticated
using (
  public.is_event_editor(event_id, auth.uid())
  or public.is_invitation_guest_user(invitation_id, auth.uid())
);

commit;
