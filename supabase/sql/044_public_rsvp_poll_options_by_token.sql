-- Public RSVP poll access by invitation token (anon-safe)
-- 1) Extend get_invitation_public with event scheduling fields needed by frontend.
-- 2) Add get_event_date_options_by_token so anonymous guests can read poll options
--    without direct SELECT on event_date_options (RLS-protected table).

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

create or replace function public.get_event_date_options_by_token(p_token text)
returns table (
  id uuid,
  event_id uuid,
  starts_at timestamptz,
  ends_at timestamptz,
  timezone text,
  label text,
  "position" integer,
  is_final boolean,
  votes_total bigint,
  votes_yes bigint,
  votes_maybe bigint,
  votes_no bigint
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_invitation public.invitations%rowtype;
begin
  select i.* into v_invitation
  from public.invitations i
  join public.events e
    on e.id = i.event_id
   and e.host_user_id = i.host_user_id
  where i.public_token = p_token
    and e.status <> 'cancelled'
  limit 1;

  if v_invitation.id is null then
    raise exception 'invitation_not_available';
  end if;

  return query
  with vote_summary as (
    select
      edv.event_date_option_id,
      count(*)::bigint as votes_total,
      count(*) filter (where edv.vote = 'yes')::bigint as votes_yes,
      count(*) filter (where edv.vote = 'maybe')::bigint as votes_maybe,
      count(*) filter (where edv.vote = 'no')::bigint as votes_no
    from public.event_date_votes edv
    where edv.event_id = v_invitation.event_id
      and edv.host_user_id = v_invitation.host_user_id
    group by edv.event_date_option_id
  )
  select
    edo.id,
    edo.event_id,
    edo.starts_at,
    edo.ends_at,
    edo.timezone,
    edo.label,
    edo."position",
    edo.is_final,
    coalesce(vs.votes_total, 0::bigint),
    coalesce(vs.votes_yes, 0::bigint),
    coalesce(vs.votes_maybe, 0::bigint),
    coalesce(vs.votes_no, 0::bigint)
  from public.event_date_options edo
  left join vote_summary vs
    on vs.event_date_option_id = edo.id
  where edo.event_id = v_invitation.event_id
    and edo.host_user_id = v_invitation.host_user_id
  order by
    edo."position" asc nulls last,
    edo.starts_at asc,
    edo.created_at asc;
end;
$$;

revoke all on function public.get_invitation_public(text) from public;
revoke all on function public.get_event_date_options_by_token(text) from public;

grant execute on function public.get_invitation_public(text) to anon, authenticated;
grant execute on function public.get_event_date_options_by_token(text) to anon, authenticated;
