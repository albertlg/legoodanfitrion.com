-- LeGoodAnfitrion MVP schema
-- Run this entire file in Supabase SQL Editor (as postgres role).

create extension if not exists pgcrypto;

do $$
begin
  if not exists (select 1 from pg_type where typname = 'event_status') then
    create type public.event_status as enum ('draft', 'published', 'completed', 'cancelled');
  end if;
  if not exists (select 1 from pg_type where typname = 'rsvp_status') then
    create type public.rsvp_status as enum ('pending', 'yes', 'no', 'maybe');
  end if;
  if not exists (select 1 from pg_type where typname = 'payment_status') then
    create type public.payment_status as enum ('pending', 'paid', 'cancelled');
  end if;
end
$$;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  phone text,
  preferred_language text not null default 'es',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.events (
  id uuid primary key default gen_random_uuid(),
  host_user_id uuid not null references public.profiles(id) on delete cascade,
  title text not null check (char_length(title) <= 120),
  description text check (char_length(description) <= 2000),
  event_type text,
  status public.event_status not null default 'draft',
  start_at timestamptz,
  end_at timestamptz,
  timezone text not null default 'Europe/Madrid',
  location_name text,
  location_address text,
  max_guests integer check (max_guests is null or max_guests > 0),
  budget_total numeric(10,2) check (budget_total is null or budget_total >= 0),
  currency char(3) not null default 'EUR',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint events_time_check check (end_at is null or start_at is null or end_at > start_at),
  constraint events_id_host_unique unique (id, host_user_id)
);

create table if not exists public.guests (
  id uuid primary key default gen_random_uuid(),
  host_user_id uuid not null references public.profiles(id) on delete cascade,
  first_name text not null,
  last_name text,
  phone text,
  email text,
  city text,
  country text,
  relationship text,
  birthday date,
  notes text,
  source text not null default 'manual',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint guests_contact_check check (email is not null or phone is not null),
  constraint guests_id_host_unique unique (id, host_user_id)
);

create table if not exists public.guest_preferences (
  guest_id uuid primary key references public.guests(id) on delete cascade,
  diet_type text,
  tasting_preferences text[],
  food_likes text[],
  food_dislikes text[],
  drink_likes text[],
  drink_dislikes text[],
  music_genres text[],
  favorite_color text,
  books text[],
  movies text[],
  series text[],
  sports text[],
  team_fan text,
  punctuality text,
  last_talk_topic text,
  taboo_topics text[],
  updated_at timestamptz not null default now()
);

create table if not exists public.guest_sensitive_preferences (
  guest_id uuid primary key references public.guests(id) on delete cascade,
  allergies text[] not null default '{}',
  intolerances text[] not null default '{}',
  pet_allergies text[] not null default '{}',
  consent_granted boolean not null default false,
  consent_version text,
  consent_granted_at timestamptz,
  updated_at timestamptz not null default now(),
  constraint sensitive_consent_required check (
    consent_granted
    or (
      coalesce(array_length(allergies, 1), 0) = 0
      and coalesce(array_length(intolerances, 1), 0) = 0
      and coalesce(array_length(pet_allergies, 1), 0) = 0
    )
  ),
  constraint sensitive_consent_metadata check (
    (not consent_granted and consent_version is null and consent_granted_at is null)
    or (consent_granted and consent_version is not null and consent_granted_at is not null)
  )
);

create table if not exists public.invitations (
  id uuid primary key default gen_random_uuid(),
  host_user_id uuid not null references public.profiles(id) on delete cascade,
  event_id uuid not null,
  guest_id uuid not null,
  invite_channel text not null default 'link',
  invitee_email text,
  invitee_phone text,
  guest_display_name text,
  public_token text not null unique default encode(gen_random_bytes(24), 'hex'),
  expires_at timestamptz default (now() + interval '30 days'),
  status public.rsvp_status not null default 'pending',
  response_note text,
  responded_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint invitations_event_fk
    foreign key (event_id, host_user_id)
    references public.events(id, host_user_id)
    on delete cascade,
  constraint invitations_guest_fk
    foreign key (guest_id, host_user_id)
    references public.guests(id, host_user_id)
    on delete cascade,
  constraint invitations_unique_event_guest unique (event_id, guest_id)
);

create table if not exists public.expenses (
  id uuid primary key default gen_random_uuid(),
  host_user_id uuid not null references public.profiles(id) on delete cascade,
  event_id uuid not null,
  description text not null,
  amount numeric(10,2) not null check (amount > 0),
  currency char(3) not null default 'EUR',
  paid_by_host boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint expenses_event_fk
    foreign key (event_id, host_user_id)
    references public.events(id, host_user_id)
    on delete cascade,
  constraint expenses_id_host_unique unique (id, host_user_id)
);

create table if not exists public.expense_shares (
  id uuid primary key default gen_random_uuid(),
  host_user_id uuid not null references public.profiles(id) on delete cascade,
  expense_id uuid not null,
  guest_id uuid not null,
  share_amount numeric(10,2) not null check (share_amount >= 0),
  status public.payment_status not null default 'pending',
  payment_link text,
  paid_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint expense_shares_expense_fk
    foreign key (expense_id, host_user_id)
    references public.expenses(id, host_user_id)
    on delete cascade,
  constraint expense_shares_guest_fk
    foreign key (guest_id, host_user_id)
    references public.guests(id, host_user_id)
    on delete cascade,
  constraint expense_shares_unique_expense_guest unique (expense_id, guest_id)
);

create table if not exists public.consents (
  id uuid primary key default gen_random_uuid(),
  host_user_id uuid not null references public.profiles(id) on delete cascade,
  guest_id uuid not null,
  consent_type text not null check (
    consent_type in ('contact_import', 'guest_sensitive_data', 'marketing', 'photo_album')
  ),
  consent_version text not null,
  granted boolean not null,
  granted_at timestamptz not null default now(),
  revoked_at timestamptz,
  evidence text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint consents_guest_fk
    foreign key (guest_id, host_user_id)
    references public.guests(id, host_user_id)
    on delete cascade
);

create index if not exists idx_events_host_user_id on public.events(host_user_id);
create index if not exists idx_events_start_at on public.events(start_at);
create index if not exists idx_guests_host_user_id on public.guests(host_user_id);
create index if not exists idx_guests_email_lower on public.guests(lower(email));
create index if not exists idx_invitations_event_id on public.invitations(event_id);
create index if not exists idx_invitations_guest_id on public.invitations(guest_id);
create index if not exists idx_invitations_public_token on public.invitations(public_token);
create index if not exists idx_expenses_event_id on public.expenses(event_id);
create index if not exists idx_expense_shares_expense_id on public.expense_shares(expense_id);
create index if not exists idx_consents_guest_id on public.consents(guest_id);

drop trigger if exists trg_profiles_set_updated_at on public.profiles;
create trigger trg_profiles_set_updated_at
before update on public.profiles
for each row execute function public.set_updated_at();

drop trigger if exists trg_events_set_updated_at on public.events;
create trigger trg_events_set_updated_at
before update on public.events
for each row execute function public.set_updated_at();

drop trigger if exists trg_guests_set_updated_at on public.guests;
create trigger trg_guests_set_updated_at
before update on public.guests
for each row execute function public.set_updated_at();

drop trigger if exists trg_guest_preferences_set_updated_at on public.guest_preferences;
create trigger trg_guest_preferences_set_updated_at
before update on public.guest_preferences
for each row execute function public.set_updated_at();

drop trigger if exists trg_guest_sensitive_preferences_set_updated_at on public.guest_sensitive_preferences;
create trigger trg_guest_sensitive_preferences_set_updated_at
before update on public.guest_sensitive_preferences
for each row execute function public.set_updated_at();

drop trigger if exists trg_invitations_set_updated_at on public.invitations;
create trigger trg_invitations_set_updated_at
before update on public.invitations
for each row execute function public.set_updated_at();

drop trigger if exists trg_expenses_set_updated_at on public.expenses;
create trigger trg_expenses_set_updated_at
before update on public.expenses
for each row execute function public.set_updated_at();

drop trigger if exists trg_expense_shares_set_updated_at on public.expense_shares;
create trigger trg_expense_shares_set_updated_at
before update on public.expense_shares
for each row execute function public.set_updated_at();

drop trigger if exists trg_consents_set_updated_at on public.consents;
create trigger trg_consents_set_updated_at
before update on public.consents
for each row execute function public.set_updated_at();

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, full_name)
  values (new.id, coalesce(new.raw_user_meta_data ->> 'full_name', split_part(new.email, '@', 1)))
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

create or replace function public.get_invitation_public(p_token text)
returns table (
  invitation_id uuid,
  event_id uuid,
  event_title text,
  event_start_at timestamptz,
  guest_name text,
  rsvp_status public.rsvp_status,
  expires_at timestamptz
)
language plpgsql
security definer
set search_path = public
as $$
begin
  return query
  select
    i.id,
    i.event_id,
    e.title,
    e.start_at,
    coalesce(i.guest_display_name, trim(g.first_name || ' ' || coalesce(g.last_name, ''))),
    i.status,
    i.expires_at
  from public.invitations i
  join public.events e on e.id = i.event_id and e.host_user_id = i.host_user_id
  join public.guests g on g.id = i.guest_id and g.host_user_id = i.host_user_id
  where i.public_token = p_token
    and (i.expires_at is null or i.expires_at > now())
  limit 1;
end;
$$;

create or replace function public.submit_rsvp_by_token(
  p_token text,
  p_status public.rsvp_status,
  p_response_note text default null,
  p_guest_display_name text default null
)
returns table (
  invitation_id uuid,
  event_id uuid,
  status public.rsvp_status,
  responded_at timestamptz
)
language plpgsql
security definer
set search_path = public
as $$
begin
  if p_status = 'pending' then
    raise exception 'RSVP status cannot be pending';
  end if;

  update public.invitations i
  set
    status = p_status,
    response_note = coalesce(nullif(trim(p_response_note), ''), i.response_note),
    guest_display_name = coalesce(nullif(trim(p_guest_display_name), ''), i.guest_display_name),
    responded_at = now(),
    updated_at = now()
  where i.public_token = p_token
    and (i.expires_at is null or i.expires_at > now())
  returning i.id, i.event_id, i.status, i.responded_at
  into invitation_id, event_id, status, responded_at;

  if not found then
    raise exception 'Invalid or expired invitation token';
  end if;

  return next;
end;
$$;

revoke all on function public.get_invitation_public(text) from public;
revoke all on function public.submit_rsvp_by_token(text, public.rsvp_status, text, text) from public;
grant execute on function public.get_invitation_public(text) to anon, authenticated;
grant execute on function public.submit_rsvp_by_token(text, public.rsvp_status, text, text) to anon, authenticated;

alter table public.profiles enable row level security;
alter table public.events enable row level security;
alter table public.guests enable row level security;
alter table public.guest_preferences enable row level security;
alter table public.guest_sensitive_preferences enable row level security;
alter table public.invitations enable row level security;
alter table public.expenses enable row level security;
alter table public.expense_shares enable row level security;
alter table public.consents enable row level security;

drop policy if exists profiles_select_own on public.profiles;
create policy profiles_select_own
on public.profiles for select
to authenticated
using (id = auth.uid());

drop policy if exists profiles_insert_own on public.profiles;
create policy profiles_insert_own
on public.profiles for insert
to authenticated
with check (id = auth.uid());

drop policy if exists profiles_update_own on public.profiles;
create policy profiles_update_own
on public.profiles for update
to authenticated
using (id = auth.uid())
with check (id = auth.uid());

drop policy if exists profiles_delete_own on public.profiles;
create policy profiles_delete_own
on public.profiles for delete
to authenticated
using (id = auth.uid());

drop policy if exists events_host_all on public.events;
create policy events_host_all
on public.events for all
to authenticated
using (host_user_id = auth.uid())
with check (host_user_id = auth.uid());

drop policy if exists guests_host_all on public.guests;
create policy guests_host_all
on public.guests for all
to authenticated
using (host_user_id = auth.uid())
with check (host_user_id = auth.uid());

drop policy if exists guest_preferences_host_all on public.guest_preferences;
create policy guest_preferences_host_all
on public.guest_preferences for all
to authenticated
using (
  exists (
    select 1 from public.guests g
    where g.id = guest_preferences.guest_id
      and g.host_user_id = auth.uid()
  )
)
with check (
  exists (
    select 1 from public.guests g
    where g.id = guest_preferences.guest_id
      and g.host_user_id = auth.uid()
  )
);

drop policy if exists guest_sensitive_preferences_host_all on public.guest_sensitive_preferences;
create policy guest_sensitive_preferences_host_all
on public.guest_sensitive_preferences for all
to authenticated
using (
  exists (
    select 1 from public.guests g
    where g.id = guest_sensitive_preferences.guest_id
      and g.host_user_id = auth.uid()
  )
)
with check (
  exists (
    select 1 from public.guests g
    where g.id = guest_sensitive_preferences.guest_id
      and g.host_user_id = auth.uid()
  )
);

drop policy if exists invitations_host_all on public.invitations;
create policy invitations_host_all
on public.invitations for all
to authenticated
using (host_user_id = auth.uid())
with check (host_user_id = auth.uid());

drop policy if exists expenses_host_all on public.expenses;
create policy expenses_host_all
on public.expenses for all
to authenticated
using (host_user_id = auth.uid())
with check (host_user_id = auth.uid());

drop policy if exists expense_shares_host_all on public.expense_shares;
create policy expense_shares_host_all
on public.expense_shares for all
to authenticated
using (host_user_id = auth.uid())
with check (host_user_id = auth.uid());

drop policy if exists consents_host_all on public.consents;
create policy consents_host_all
on public.consents for all
to authenticated
using (host_user_id = auth.uid())
with check (host_user_id = auth.uid());
