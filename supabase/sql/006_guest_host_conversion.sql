-- Detect host guest contacts that already belong to registered users.
-- Run after 001, 002, 003, 004, 005 migrations.

create or replace function public.get_host_guest_conversions()
returns table (
  guest_id uuid,
  matched_by text
)
language sql
security definer
set search_path = public, auth
as $$
  with host_guests as (
    select
      g.id as guest_id,
      lower(trim(coalesce(g.email, ''))) as guest_email,
      regexp_replace(coalesce(g.phone, ''), '\D', '', 'g') as guest_phone_digits
    from public.guests g
    where g.host_user_id = auth.uid()
  ),
  matches_by_email as (
    select
      hg.guest_id,
      'email'::text as matched_by
    from host_guests hg
    join auth.users u
      on hg.guest_email <> ''
     and lower(trim(coalesce(u.email, ''))) = hg.guest_email
  ),
  matches_by_phone as (
    select
      hg.guest_id,
      'phone'::text as matched_by
    from host_guests hg
    join public.profiles p
      on char_length(hg.guest_phone_digits) >= 7
     and regexp_replace(coalesce(p.phone, ''), '\D', '', 'g') = hg.guest_phone_digits
  ),
  combined as (
    select * from matches_by_email
    union all
    select * from matches_by_phone
  )
  select distinct on (guest_id)
    guest_id,
    matched_by
  from combined
  order by guest_id, case matched_by when 'email' then 0 else 1 end;
$$;

revoke all on function public.get_host_guest_conversions() from public;
grant execute on function public.get_host_guest_conversions() to authenticated;
