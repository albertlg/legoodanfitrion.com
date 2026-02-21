alter table public.invitations
  add column if not exists rsvp_plus_one boolean not null default false,
  add column if not exists rsvp_dietary_needs text[] not null default '{}';

drop function if exists public.get_invitation_public(text);
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
  join public.events e on e.id = i.event_id and e.host_user_id = i.host_user_id
  join public.guests g on g.id = i.guest_id and g.host_user_id = i.host_user_id
  left join public.profiles p on p.id = i.host_user_id
  where i.public_token = p_token
    and (i.expires_at is null or i.expires_at > now())
  limit 1;
end;
$$;

drop function if exists public.submit_rsvp_by_token(text, public.rsvp_status, text, text);
drop function if exists public.submit_rsvp_by_token(text, public.rsvp_status, text, text, boolean, text[]);
create or replace function public.submit_rsvp_by_token(
  p_token text,
  p_status public.rsvp_status,
  p_response_note text default null,
  p_guest_display_name text default null,
  p_rsvp_plus_one boolean default null,
  p_rsvp_dietary_needs text[] default null
)
returns table (
  invitation_id uuid,
  event_id uuid,
  status public.rsvp_status,
  responded_at timestamptz,
  response_note text,
  rsvp_plus_one boolean,
  rsvp_dietary_needs text[]
)
language plpgsql
security definer
set search_path = public
as $$
begin
  if p_status = 'pending' then
    raise exception 'RSVP status cannot be pending';
  end if;

  update public.invitations i
  set
    status = p_status,
    response_note = nullif(trim(coalesce(p_response_note, '')), ''),
    guest_display_name = nullif(trim(coalesce(p_guest_display_name, '')), ''),
    rsvp_plus_one = coalesce(p_rsvp_plus_one, i.rsvp_plus_one, false),
    rsvp_dietary_needs = coalesce(p_rsvp_dietary_needs, i.rsvp_dietary_needs, '{}'::text[]),
    responded_at = now(),
    updated_at = now()
  where i.public_token = p_token
    and (i.expires_at is null or i.expires_at > now())
  returning i.id, i.event_id, i.status, i.responded_at, i.response_note, i.rsvp_plus_one, i.rsvp_dietary_needs
  into invitation_id, event_id, status, responded_at, response_note, rsvp_plus_one, rsvp_dietary_needs;

  if not found then
    raise exception 'Invalid or expired invitation token';
  end if;

  return next;
end;
$$;

revoke all on function public.get_invitation_public(text) from public;
revoke all on function public.submit_rsvp_by_token(text, public.rsvp_status, text, text, boolean, text[]) from public;
grant execute on function public.get_invitation_public(text) to anon, authenticated;
grant execute on function public.submit_rsvp_by_token(text, public.rsvp_status, text, text, boolean, text[]) to anon, authenticated;
