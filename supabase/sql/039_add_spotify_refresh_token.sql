-- ================================================
-- Add Spotify refresh token storage per event
-- ================================================

alter table public.event_spotify_playlists
  add column if not exists spotify_refresh_token text;
