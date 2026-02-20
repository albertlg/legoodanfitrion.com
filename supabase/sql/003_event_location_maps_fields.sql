-- Add Google Maps-compatible location fields to events.
-- Run in Supabase SQL Editor after 001 and 002 migrations.

alter table public.events
add column if not exists location_place_id text;

alter table public.events
add column if not exists location_lat double precision;

alter table public.events
add column if not exists location_lng double precision;

create index if not exists idx_events_location_place_id on public.events(location_place_id);

