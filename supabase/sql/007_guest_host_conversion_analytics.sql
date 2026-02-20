-- Extend guest->host conversion analytics with source and timestamp.
-- Run after 001, 002, 003, 004, 005 and 006 migrations.

create or replace function public.get_host_guest_conversions()
returns table (
  guest_id uuid,
  matched_by text,
  conversion_source text,
  converted_at timestamptz
)
language sql
security definer
set search_path = public, auth
as $$
  with host_guests as (
    select
      g.id as guest_id,
      g.created_at as guest_created_at,
      lower(trim(coalesce(g.email, ''))) as guest_email,
      regexp_replace(coalesce(g.phone, ''), '\\D', '', 'g') as guest_phone_digits
    from public.guests g
    where g.host_user_id = auth.uid()
  ),
  matches_by_email as (
    select
      hg.guest_id,
      'email'::text as matched_by,
      case
        when lower(coalesce(u.raw_app_meta_data ->> 'provider', '')) = 'google'
          or exists (
            select 1
            from jsonb_array_elements_text(coalesce(u.raw_app_meta_data -> 'providers', '[]'::jsonb)) as provider(value)
            where lower(provider.value) = 'google'
          )
          then 'google'::text
        else 'email'::text
      end as conversion_source,
      greatest(hg.guest_created_at, coalesce(u.created_at, hg.guest_created_at)) as converted_at
    from host_guests hg
    join auth.users u
      on hg.guest_email <> ''
     and lower(trim(coalesce(u.email, ''))) = hg.guest_email
  ),
  matches_by_phone as (
    select
      hg.guest_id,
      'phone'::text as matched_by,
      case
        when lower(coalesce(u.raw_app_meta_data ->> 'provider', '')) = 'google'
          or exists (
            select 1
            from jsonb_array_elements_text(coalesce(u.raw_app_meta_data -> 'providers', '[]'::jsonb)) as provider(value)
            where lower(provider.value) = 'google'
          )
          then 'google'::text
        else 'phone'::text
      end as conversion_source,
      greatest(hg.guest_created_at, coalesce(u.created_at, hg.guest_created_at)) as converted_at
    from host_guests hg
    join public.profiles p
      on char_length(hg.guest_phone_digits) >= 7
     and regexp_replace(coalesce(p.phone, ''), '\\D', '', 'g') = hg.guest_phone_digits
    join auth.users u
      on u.id = p.id
  ),
  combined as (
    select * from matches_by_email
    union all
    select * from matches_by_phone
  )
  select distinct on (guest_id)
    guest_id,
    matched_by,
    conversion_source,
    converted_at
  from combined
  order by
    guest_id,
    case
      when conversion_source = 'google' then 0
      when matched_by = 'email' then 1
      else 2
    end,
    converted_at asc;
$$;

revoke all on function public.get_host_guest_conversions() from public;
grant execute on function public.get_host_guest_conversions() to authenticated;
