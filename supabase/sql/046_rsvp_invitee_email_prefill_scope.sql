-- Add invitee email + token scope to public RSVP payload
-- so frontend can prefill only for individual invitation tokens.

DROP FUNCTION IF EXISTS get_invitation_public(text);

create or replace function public.get_invitation_public(p_token text)
returns table (
  invitation_id uuid,
  event_id uuid,
  event_title text,
  event_start_at timestamptz,
  event_end_at timestamptz,
  schedule_mode public.event_schedule_mode,
  poll_status public.event_poll_status,
  allow_plus_one boolean,
  photo_gallery_url text,
  guest_name text,
  rsvp_status public.rsvp_status,
  expires_at timestamptz,
  event_location_name text,
  event_location_address text,
  host_name text,
  response_note text,
  rsvp_plus_one boolean,
  rsvp_dietary_needs text[],
  invitee_email text,
  invite_channel text,
  token_scope text
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
    e.end_at,
    e.schedule_mode,
    e.poll_status,
    e.allow_plus_one,
    e.photo_gallery_url,
    coalesce(i.guest_display_name, trim(g.first_name || ' ' || coalesce(g.last_name, ''))),
    i.status,
    i.expires_at,
    e.location_name,
    e.location_address,
    coalesce(p.full_name, 'LeGoodAnfitrión'),
    i.response_note,
    i.rsvp_plus_one,
    coalesce(i.rsvp_dietary_needs, '{}'::text[]),
    i.invitee_email,
    i.invite_channel,
    case
      when lower(coalesce(i.invite_channel, '')) in ('email', 'sms', 'phone', 'whatsapp', 'individual', 'direct')
        then 'invitation_individual'
      else 'event_public'
    end
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
