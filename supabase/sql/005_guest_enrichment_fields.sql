-- Add enriched guest profile fields and extended preference dimensions.
-- Run after 001, 002, 003, 004 migrations.

alter table public.guests
add column if not exists address text;

alter table public.guests
add column if not exists postal_code text;

alter table public.guests
add column if not exists state_region text;

alter table public.guests
add column if not exists company text;

alter table public.guests
add column if not exists twitter text;

alter table public.guests
add column if not exists instagram text;

alter table public.guests
add column if not exists linkedin text;

alter table public.guests
add column if not exists last_meet_at date;

alter table public.guest_preferences
add column if not exists experience_types text[] not null default '{}';

alter table public.guest_preferences
add column if not exists preferred_guest_relationships text[] not null default '{}';

alter table public.guest_preferences
add column if not exists preferred_day_moments text[] not null default '{}';

alter table public.guest_preferences
add column if not exists periodicity text;

alter table public.guest_preferences
add column if not exists cuisine_types text[] not null default '{}';

alter table public.guest_preferences
add column if not exists pets text[] not null default '{}';

create index if not exists idx_guests_host_company on public.guests(host_user_id, company);
create index if not exists idx_guests_host_last_meet_at on public.guests(host_user_id, last_meet_at);
