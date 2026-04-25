-- 063_spotify_playlist_name.sql
--
-- Añade playlist_name a event_spotify_playlists para que el planificador IA
-- pueda referenciar la playlist por nombre en lugar de solo saber que existe.
--
-- El nombre se guarda al vincular la playlist desde el frontend (Spotify API).

ALTER TABLE public.event_spotify_playlists
  ADD COLUMN IF NOT EXISTS playlist_name TEXT;

COMMENT ON COLUMN public.event_spotify_playlists.playlist_name IS
  'Nombre de la playlist de Spotify tal como aparece en la API de Spotify.
   Se popula al vincular la playlist. Opcional — si NULL, el planner IA
   solo sabe que existe una playlist vinculada sin conocer su nombre.';
