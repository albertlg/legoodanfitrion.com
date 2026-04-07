-- =====================================================
-- 038_event_spotify_playlists.sql
-- Infraestructura base para playlists de Spotify por evento
-- =====================================================

begin;

create extension if not exists pgcrypto;

create table if not exists public.event_spotify_playlists (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events(id) on delete cascade,
  spotify_playlist_id text not null,
  spotify_playlist_url text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint event_spotify_playlists_event_unique unique (event_id),
  constraint event_spotify_playlists_playlist_unique unique (spotify_playlist_id)
);

create index if not exists idx_event_spotify_playlists_event_id
  on public.event_spotify_playlists(event_id);

drop trigger if exists trg_event_spotify_playlists_set_updated_at on public.event_spotify_playlists;
create trigger trg_event_spotify_playlists_set_updated_at
before update on public.event_spotify_playlists
for each row execute function public.set_updated_at();

alter table public.event_spotify_playlists enable row level security;

drop policy if exists event_spotify_playlists_select_owner_or_cohost on public.event_spotify_playlists;
create policy event_spotify_playlists_select_owner_or_cohost
on public.event_spotify_playlists
for select
to authenticated
using (
  exists (
    select 1
    from public.events e
    where e.id = event_spotify_playlists.event_id
      and e.host_user_id = auth.uid()
  )
  or exists (
    select 1
    from public.event_cohosts ec
    where ec.event_id = event_spotify_playlists.event_id
      and ec.host_id = auth.uid()
  )
);

drop policy if exists event_spotify_playlists_insert_owner on public.event_spotify_playlists;
create policy event_spotify_playlists_insert_owner
on public.event_spotify_playlists
for insert
to authenticated
with check (
  exists (
    select 1
    from public.events e
    where e.id = event_spotify_playlists.event_id
      and e.host_user_id = auth.uid()
  )
);

drop policy if exists event_spotify_playlists_update_owner on public.event_spotify_playlists;
create policy event_spotify_playlists_update_owner
on public.event_spotify_playlists
for update
to authenticated
using (
  exists (
    select 1
    from public.events e
    where e.id = event_spotify_playlists.event_id
      and e.host_user_id = auth.uid()
  )
)
with check (
  exists (
    select 1
    from public.events e
    where e.id = event_spotify_playlists.event_id
      and e.host_user_id = auth.uid()
  )
);

drop policy if exists event_spotify_playlists_delete_owner on public.event_spotify_playlists;
create policy event_spotify_playlists_delete_owner
on public.event_spotify_playlists
for delete
to authenticated
using (
  exists (
    select 1
    from public.events e
    where e.id = event_spotify_playlists.event_id
      and e.host_user_id = auth.uid()
  )
);

commit;

