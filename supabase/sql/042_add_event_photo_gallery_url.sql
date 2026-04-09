-- Add optional external photo album URL for post-event memories.
alter table public.events
  add column if not exists photo_gallery_url text;

comment on column public.events.photo_gallery_url is
  'External shared album URL (Google Photos, iCloud, etc.) shown to host and guests.';
