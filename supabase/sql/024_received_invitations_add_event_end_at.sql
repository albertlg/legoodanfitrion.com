drop function if exists public.get_my_received_invitations();

create or replace function public.get_my_received_invitations()
returns table (
  invitation_id uuid,
  invitation_status public.rsvp_status,
  invitation_created_at timestamptz,
  invitation_responded_at timestamptz,
  invitation_response_note text,
  invitation_public_token text,
  event_id uuid,
  event_title text,
  event_start_at timestamptz,
  event_end_at timestamptz,
  event_status public.event_status,
  event_location_name text,
  event_location_address text,
  host_user_id uuid,
  host_full_name text,
  guest_id uuid,
  guest_first_name text,
  guest_last_name text,
  guest_email text
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
begin
  if v_user_id is null then
    raise exception 'not_authenticated';
  end if;

  return query
  select
    i.id as invitation_id,
    i.status as invitation_status,
    i.created_at as invitation_created_at,
    i.responded_at as invitation_responded_at,
    i.response_note as invitation_response_note,
    i.public_token as invitation_public_token,
    e.id as event_id,
    e.title as event_title,
    e.start_at as event_start_at,
    e.end_at as event_end_at,
    e.status as event_status,
    e.location_name as event_location_name,
    e.location_address as event_location_address,
    e.host_user_id,
    coalesce(p.full_name, split_part(coalesce(u.email, ''), '@', 1), 'Host') as host_full_name,
    g.id as guest_id,
    g.first_name as guest_first_name,
    coalesce(g.last_name, '') as guest_last_name,
    g.email as guest_email
  from public.invitations i
  join public.events e
    on e.id = i.event_id
   and e.host_user_id = i.host_user_id
  join public.guests g
    on g.id = i.guest_id
   and g.host_user_id = i.host_user_id
  left join public.profiles p
    on p.id = e.host_user_id
  left join auth.users u
    on u.id = e.host_user_id
  where g.user_id = v_user_id
  order by coalesce(i.responded_at, i.created_at) desc, i.created_at desc;
end;
$$;

revoke all on function public.get_my_received_invitations() from public;
grant execute on function public.get_my_received_invitations() to authenticated;
