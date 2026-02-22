-- Shared guest profile model (owner-managed + host-scoped sharing).
-- Run after 001..011 migrations.

create table if not exists public.global_guest_profiles (
  id uuid primary key default gen_random_uuid(),
  owner_user_id uuid not null references public.profiles(id) on delete cascade,
  display_name text,
  first_name text,
  last_name text,
  email text,
  phone text,
  city text,
  country text,
  address text,
  postal_code text,
  state_region text,
  company text,
  birthday date,
  preferred_language text not null default 'es',
  visibility text not null default 'private' check (visibility in ('private', 'hosts_only')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint global_guest_profiles_owner_unique unique (owner_user_id)
);

create table if not exists public.global_guest_profile_preferences (
  global_profile_id uuid primary key references public.global_guest_profiles(id) on delete cascade,
  experience_types text[] not null default '{}',
  preferred_guest_relationships text[] not null default '{}',
  preferred_day_moments text[] not null default '{}',
  periodicity text,
  diet_type text,
  tasting_preferences text[] not null default '{}',
  cuisine_types text[] not null default '{}',
  food_likes text[] not null default '{}',
  food_dislikes text[] not null default '{}',
  drink_likes text[] not null default '{}',
  drink_dislikes text[] not null default '{}',
  music_genres text[] not null default '{}',
  favorite_color text,
  pets text[] not null default '{}',
  books text[] not null default '{}',
  movies text[] not null default '{}',
  series text[] not null default '{}',
  sports text[] not null default '{}',
  team_fan text,
  punctuality text,
  last_talk_topic text,
  taboo_topics text[] not null default '{}',
  updated_at timestamptz not null default now()
);

create table if not exists public.global_guest_profile_sensitive (
  global_profile_id uuid primary key references public.global_guest_profiles(id) on delete cascade,
  allergies text[] not null default '{}',
  intolerances text[] not null default '{}',
  pet_allergies text[] not null default '{}',
  consent_granted boolean not null default false,
  consent_version text,
  consent_granted_at timestamptz,
  updated_at timestamptz not null default now(),
  constraint global_sensitive_consent_required check (
    consent_granted
    or (
      coalesce(array_length(allergies, 1), 0) = 0
      and coalesce(array_length(intolerances, 1), 0) = 0
      and coalesce(array_length(pet_allergies, 1), 0) = 0
    )
  ),
  constraint global_sensitive_consent_metadata check (
    (not consent_granted and consent_version is null and consent_granted_at is null)
    or (consent_granted and consent_version is not null and consent_granted_at is not null)
  )
);

create table if not exists public.global_guest_profile_shares (
  id uuid primary key default gen_random_uuid(),
  global_profile_id uuid not null references public.global_guest_profiles(id) on delete cascade,
  grantee_user_id uuid not null references public.profiles(id) on delete cascade,
  grant_source text not null default 'manual',
  status text not null default 'active' check (status in ('active', 'revoked', 'expired')),
  allow_identity boolean not null default true,
  allow_food boolean not null default false,
  allow_lifestyle boolean not null default false,
  allow_conversation boolean not null default false,
  allow_health boolean not null default false,
  granted_at timestamptz not null default now(),
  revoked_at timestamptz,
  expires_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint global_guest_profile_shares_unique unique (global_profile_id, grantee_user_id),
  constraint global_guest_profile_shares_revoked_check check (
    (status = 'revoked' and revoked_at is not null)
    or status <> 'revoked'
  )
);

create table if not exists public.host_guest_profile_links (
  guest_id uuid primary key references public.guests(id) on delete cascade,
  global_profile_id uuid not null references public.global_guest_profiles(id) on delete cascade,
  link_status text not null default 'linked' check (link_status in ('linked', 'pending_claim', 'unlinked')),
  linked_by_user_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.host_guest_private_notes (
  guest_id uuid primary key references public.guests(id) on delete cascade,
  host_user_id uuid not null references public.profiles(id) on delete cascade,
  notes text,
  seating_notes text,
  decor_notes text,
  playlist_notes text,
  gift_notes text,
  updated_at timestamptz not null default now()
);

create table if not exists public.global_guest_profile_consent_events (
  id uuid primary key default gen_random_uuid(),
  global_profile_id uuid not null references public.global_guest_profiles(id) on delete cascade,
  actor_user_id uuid not null references public.profiles(id) on delete cascade,
  event_type text not null check (
    event_type in (
      'share_granted',
      'share_revoked',
      'health_consent_granted',
      'health_consent_revoked',
      'data_validated'
    )
  ),
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists idx_global_guest_profiles_owner on public.global_guest_profiles(owner_user_id);
create index if not exists idx_global_guest_profiles_email_lower on public.global_guest_profiles(lower(email));
create index if not exists idx_global_guest_profiles_phone on public.global_guest_profiles(phone);
create index if not exists idx_global_guest_profile_shares_grantee on public.global_guest_profile_shares(grantee_user_id);
create index if not exists idx_global_guest_profile_shares_status on public.global_guest_profile_shares(status);
create index if not exists idx_host_guest_profile_links_global on public.host_guest_profile_links(global_profile_id);
create index if not exists idx_host_guest_private_notes_host on public.host_guest_private_notes(host_user_id);
create index if not exists idx_global_guest_profile_consent_events_profile on public.global_guest_profile_consent_events(global_profile_id);

create or replace function public.has_profile_share_access(p_global_profile_id uuid, p_scope text default 'identity')
returns boolean
language sql
security definer
set search_path = public, auth
as $$
  select
    exists (
      select 1
      from public.global_guest_profiles gp
      where gp.id = p_global_profile_id
        and gp.owner_user_id = auth.uid()
    )
    or exists (
      select 1
      from public.global_guest_profile_shares s
      where s.global_profile_id = p_global_profile_id
        and s.grantee_user_id = auth.uid()
        and s.status = 'active'
        and (s.expires_at is null or s.expires_at > now())
        and case lower(coalesce(p_scope, 'identity'))
          when 'identity' then s.allow_identity
          when 'food' then s.allow_food
          when 'lifestyle' then s.allow_lifestyle
          when 'conversation' then s.allow_conversation
          when 'health' then s.allow_health
          else false
        end
    );
$$;

create or replace function public.get_or_create_my_global_guest_profile()
returns uuid
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_profile_id uuid;
begin
  insert into public.global_guest_profiles (
    owner_user_id,
    display_name,
    first_name,
    email,
    phone,
    city,
    country,
    preferred_language
  )
  select
    p.id,
    coalesce(nullif(trim(p.full_name), ''), split_part(coalesce(u.email, ''), '@', 1)),
    coalesce(nullif(split_part(trim(coalesce(p.full_name, '')), ' ', 1), ''), split_part(coalesce(u.email, ''), '@', 1)),
    nullif(trim(coalesce(u.email, '')), ''),
    nullif(trim(coalesce(p.phone, '')), ''),
    null,
    null,
    coalesce(nullif(trim(p.preferred_language), ''), 'es')
  from public.profiles p
  join auth.users u on u.id = p.id
  where p.id = auth.uid()
  on conflict (owner_user_id) do update
  set
    display_name = coalesce(public.global_guest_profiles.display_name, excluded.display_name),
    first_name = coalesce(public.global_guest_profiles.first_name, excluded.first_name),
    email = coalesce(public.global_guest_profiles.email, excluded.email),
    phone = coalesce(public.global_guest_profiles.phone, excluded.phone),
    preferred_language = coalesce(public.global_guest_profiles.preferred_language, excluded.preferred_language),
    updated_at = now()
  returning id into v_profile_id;

  return v_profile_id;
end;
$$;

create or replace function public.ensure_host_guest_private_note_owner()
returns trigger
language plpgsql
as $$
declare
  v_guest_host_user_id uuid;
begin
  select g.host_user_id into v_guest_host_user_id
  from public.guests g
  where g.id = new.guest_id;

  if v_guest_host_user_id is null then
    raise exception 'Guest not found';
  end if;

  if new.host_user_id is null then
    new.host_user_id = v_guest_host_user_id;
  end if;

  if new.host_user_id <> v_guest_host_user_id then
    raise exception 'host_user_id must match guest owner';
  end if;

  return new;
end;
$$;

drop trigger if exists trg_global_guest_profiles_set_updated_at on public.global_guest_profiles;
create trigger trg_global_guest_profiles_set_updated_at
before update on public.global_guest_profiles
for each row execute function public.set_updated_at();

drop trigger if exists trg_global_guest_profile_preferences_set_updated_at on public.global_guest_profile_preferences;
create trigger trg_global_guest_profile_preferences_set_updated_at
before update on public.global_guest_profile_preferences
for each row execute function public.set_updated_at();

drop trigger if exists trg_global_guest_profile_sensitive_set_updated_at on public.global_guest_profile_sensitive;
create trigger trg_global_guest_profile_sensitive_set_updated_at
before update on public.global_guest_profile_sensitive
for each row execute function public.set_updated_at();

drop trigger if exists trg_global_guest_profile_shares_set_updated_at on public.global_guest_profile_shares;
create trigger trg_global_guest_profile_shares_set_updated_at
before update on public.global_guest_profile_shares
for each row execute function public.set_updated_at();

drop trigger if exists trg_host_guest_profile_links_set_updated_at on public.host_guest_profile_links;
create trigger trg_host_guest_profile_links_set_updated_at
before update on public.host_guest_profile_links
for each row execute function public.set_updated_at();

drop trigger if exists trg_host_guest_private_notes_set_updated_at on public.host_guest_private_notes;
create trigger trg_host_guest_private_notes_set_updated_at
before update on public.host_guest_private_notes
for each row execute function public.set_updated_at();

drop trigger if exists trg_host_guest_private_notes_owner on public.host_guest_private_notes;
create trigger trg_host_guest_private_notes_owner
before insert or update on public.host_guest_private_notes
for each row execute function public.ensure_host_guest_private_note_owner();

alter table public.global_guest_profiles enable row level security;
alter table public.global_guest_profile_preferences enable row level security;
alter table public.global_guest_profile_sensitive enable row level security;
alter table public.global_guest_profile_shares enable row level security;
alter table public.host_guest_profile_links enable row level security;
alter table public.host_guest_private_notes enable row level security;
alter table public.global_guest_profile_consent_events enable row level security;

drop policy if exists global_guest_profiles_select on public.global_guest_profiles;
create policy global_guest_profiles_select
on public.global_guest_profiles for select
to authenticated
using (public.has_profile_share_access(id, 'identity'));

drop policy if exists global_guest_profiles_insert on public.global_guest_profiles;
create policy global_guest_profiles_insert
on public.global_guest_profiles for insert
to authenticated
with check (owner_user_id = auth.uid());

drop policy if exists global_guest_profiles_update on public.global_guest_profiles;
create policy global_guest_profiles_update
on public.global_guest_profiles for update
to authenticated
using (owner_user_id = auth.uid())
with check (owner_user_id = auth.uid());

drop policy if exists global_guest_profiles_delete on public.global_guest_profiles;
create policy global_guest_profiles_delete
on public.global_guest_profiles for delete
to authenticated
using (owner_user_id = auth.uid());

drop policy if exists global_guest_profile_preferences_select on public.global_guest_profile_preferences;
create policy global_guest_profile_preferences_select
on public.global_guest_profile_preferences for select
to authenticated
using (
  public.has_profile_share_access(global_profile_id, 'food')
  or public.has_profile_share_access(global_profile_id, 'lifestyle')
  or public.has_profile_share_access(global_profile_id, 'conversation')
);

drop policy if exists global_guest_profile_preferences_insert on public.global_guest_profile_preferences;
create policy global_guest_profile_preferences_insert
on public.global_guest_profile_preferences for insert
to authenticated
with check (
  exists (
    select 1
    from public.global_guest_profiles gp
    where gp.id = global_profile_id
      and gp.owner_user_id = auth.uid()
  )
);

drop policy if exists global_guest_profile_preferences_update on public.global_guest_profile_preferences;
create policy global_guest_profile_preferences_update
on public.global_guest_profile_preferences for update
to authenticated
using (
  exists (
    select 1
    from public.global_guest_profiles gp
    where gp.id = global_profile_id
      and gp.owner_user_id = auth.uid()
  )
)
with check (
  exists (
    select 1
    from public.global_guest_profiles gp
    where gp.id = global_profile_id
      and gp.owner_user_id = auth.uid()
  )
);

drop policy if exists global_guest_profile_preferences_delete on public.global_guest_profile_preferences;
create policy global_guest_profile_preferences_delete
on public.global_guest_profile_preferences for delete
to authenticated
using (
  exists (
    select 1
    from public.global_guest_profiles gp
    where gp.id = global_profile_id
      and gp.owner_user_id = auth.uid()
  )
);

drop policy if exists global_guest_profile_sensitive_select on public.global_guest_profile_sensitive;
create policy global_guest_profile_sensitive_select
on public.global_guest_profile_sensitive for select
to authenticated
using (public.has_profile_share_access(global_profile_id, 'health'));

drop policy if exists global_guest_profile_sensitive_insert on public.global_guest_profile_sensitive;
create policy global_guest_profile_sensitive_insert
on public.global_guest_profile_sensitive for insert
to authenticated
with check (
  exists (
    select 1
    from public.global_guest_profiles gp
    where gp.id = global_profile_id
      and gp.owner_user_id = auth.uid()
  )
);

drop policy if exists global_guest_profile_sensitive_update on public.global_guest_profile_sensitive;
create policy global_guest_profile_sensitive_update
on public.global_guest_profile_sensitive for update
to authenticated
using (
  exists (
    select 1
    from public.global_guest_profiles gp
    where gp.id = global_profile_id
      and gp.owner_user_id = auth.uid()
  )
)
with check (
  exists (
    select 1
    from public.global_guest_profiles gp
    where gp.id = global_profile_id
      and gp.owner_user_id = auth.uid()
  )
);

drop policy if exists global_guest_profile_sensitive_delete on public.global_guest_profile_sensitive;
create policy global_guest_profile_sensitive_delete
on public.global_guest_profile_sensitive for delete
to authenticated
using (
  exists (
    select 1
    from public.global_guest_profiles gp
    where gp.id = global_profile_id
      and gp.owner_user_id = auth.uid()
  )
);

drop policy if exists global_guest_profile_shares_select on public.global_guest_profile_shares;
create policy global_guest_profile_shares_select
on public.global_guest_profile_shares for select
to authenticated
using (
  grantee_user_id = auth.uid()
  or exists (
    select 1
    from public.global_guest_profiles gp
    where gp.id = global_profile_id
      and gp.owner_user_id = auth.uid()
  )
);

drop policy if exists global_guest_profile_shares_insert on public.global_guest_profile_shares;
create policy global_guest_profile_shares_insert
on public.global_guest_profile_shares for insert
to authenticated
with check (
  exists (
    select 1
    from public.global_guest_profiles gp
    where gp.id = global_profile_id
      and gp.owner_user_id = auth.uid()
  )
);

drop policy if exists global_guest_profile_shares_update on public.global_guest_profile_shares;
create policy global_guest_profile_shares_update
on public.global_guest_profile_shares for update
to authenticated
using (
  exists (
    select 1
    from public.global_guest_profiles gp
    where gp.id = global_profile_id
      and gp.owner_user_id = auth.uid()
  )
)
with check (
  exists (
    select 1
    from public.global_guest_profiles gp
    where gp.id = global_profile_id
      and gp.owner_user_id = auth.uid()
  )
);

drop policy if exists global_guest_profile_shares_delete on public.global_guest_profile_shares;
create policy global_guest_profile_shares_delete
on public.global_guest_profile_shares for delete
to authenticated
using (
  exists (
    select 1
    from public.global_guest_profiles gp
    where gp.id = global_profile_id
      and gp.owner_user_id = auth.uid()
  )
);

drop policy if exists host_guest_profile_links_all on public.host_guest_profile_links;
create policy host_guest_profile_links_all
on public.host_guest_profile_links for all
to authenticated
using (
  exists (
    select 1
    from public.guests g
    where g.id = guest_id
      and g.host_user_id = auth.uid()
  )
)
with check (
  linked_by_user_id = auth.uid()
  and exists (
    select 1
    from public.guests g
    where g.id = guest_id
      and g.host_user_id = auth.uid()
  )
);

drop policy if exists host_guest_private_notes_all on public.host_guest_private_notes;
create policy host_guest_private_notes_all
on public.host_guest_private_notes for all
to authenticated
using (
  host_user_id = auth.uid()
  and exists (
    select 1
    from public.guests g
    where g.id = guest_id
      and g.host_user_id = auth.uid()
  )
)
with check (
  host_user_id = auth.uid()
  and exists (
    select 1
    from public.guests g
    where g.id = guest_id
      and g.host_user_id = auth.uid()
  )
);

drop policy if exists global_guest_profile_consent_events_select on public.global_guest_profile_consent_events;
create policy global_guest_profile_consent_events_select
on public.global_guest_profile_consent_events for select
to authenticated
using (
  actor_user_id = auth.uid()
  or exists (
    select 1
    from public.global_guest_profiles gp
    where gp.id = global_profile_id
      and gp.owner_user_id = auth.uid()
  )
);

drop policy if exists global_guest_profile_consent_events_insert on public.global_guest_profile_consent_events;
create policy global_guest_profile_consent_events_insert
on public.global_guest_profile_consent_events for insert
to authenticated
with check (
  actor_user_id = auth.uid()
  and exists (
    select 1
    from public.global_guest_profiles gp
    where gp.id = global_profile_id
      and (
        gp.owner_user_id = auth.uid()
        or public.has_profile_share_access(global_profile_id, 'identity')
      )
  )
);

revoke all on function public.has_profile_share_access(uuid, text) from public;
grant execute on function public.has_profile_share_access(uuid, text) to authenticated;

revoke all on function public.get_or_create_my_global_guest_profile() from public;
grant execute on function public.get_or_create_my_global_guest_profile() to authenticated;
