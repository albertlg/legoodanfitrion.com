-- Track source language for user-entered content.
-- Run after 001, 002, 003 migrations.

alter table public.events
add column if not exists content_language text not null default 'es';

alter table public.guests
add column if not exists content_language text not null default 'es';

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'events_content_language_check'
      and conrelid = 'public.events'::regclass
  ) then
    alter table public.events
    add constraint events_content_language_check
    check (content_language in ('es', 'ca', 'en', 'fr'));
  end if;

  if not exists (
    select 1 from pg_constraint
    where conname = 'guests_content_language_check'
      and conrelid = 'public.guests'::regclass
  ) then
    alter table public.guests
    add constraint guests_content_language_check
    check (content_language in ('es', 'ca', 'en', 'fr'));
  end if;
end
$$;

