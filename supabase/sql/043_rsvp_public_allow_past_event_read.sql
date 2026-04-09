-- Keep RSVP links readable after the event ends.
-- We still block RSVP writes for finished events, but public read stays available
-- so guests can access post-event content (e.g. shared photo gallery).

create or replace function public.get_invitation_public(p_token text)
returns table (
  invitation_id uuid,
  event_id uuid,
  event_title text,
  event_start_at timestamptz,
  guest_name text,
  rsvp_status public.rsvp_status,
  expires_at timestamptz,
  event_location_name text,
  event_location_address text,
  host_name text,
  response_note text,
  rsvp_plus_one boolean,
  rsvp_dietary_needs text[]
)
language plpgsql
security definer
set search_path = public
as $$
begin
  return query
  select
    i.id,
    i.event_id,
    e.title,
    e.start_at,
    coalesce(i.guest_display_name, trim(g.first_name || ' ' || coalesce(g.last_name, ''))),
    i.status,
    i.expires_at,
    e.location_name,
    e.location_address,
    coalesce(p.full_name, 'LeGoodAnfitrión'),
    i.response_note,
    i.rsvp_plus_one,
    coalesce(i.rsvp_dietary_needs, '{}'::text[])
  from public.invitations i
  join public.events e
    on e.id = i.event_id
   and e.host_user_id = i.host_user_id
  join public.guests g
    on g.id = i.guest_id
   and g.host_user_id = i.host_user_id
  left join public.profiles p
    on p.id = i.host_user_id
  where i.public_token = p_token
    and e.status <> 'cancelled'
  limit 1;
end;
$$;

revoke all on function public.get_invitation_public(text) from public;
grant execute on function public.get_invitation_public(text) to anon, authenticated;
