-- Add UI preference fields for host profile personalization.
-- Run in Supabase SQL Editor after 001_mvp_schema.sql

alter table public.profiles
add column if not exists preferred_theme text not null default 'system';

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'profiles_preferred_theme_check'
      and conrelid = 'public.profiles'::regclass
  ) then
    alter table public.profiles
    add constraint profiles_preferred_theme_check
    check (preferred_theme in ('light', 'dark', 'system'));
  end if;
end
$$;

