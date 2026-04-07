-- Disable automatic RSVP token expiration.
-- Invitations are available unless:
-- 1) The event is cancelled, or
-- 2) The event already finished (end_at, or start_at when end_at is null, is in the past).

-- 1) Stop auto-expiring new invitations
alter table if exists public.invitations
  alter column expires_at drop default;

-- 2) Remove historical arbitrary expirations
update public.invitations
set expires_at = null
where expires_at is not null;

-- 3) Public invitation payload (read)
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
    and (
      coalesce(e.end_at, e.start_at) is null
      or coalesce(e.end_at, e.start_at) >= now()
    )
  limit 1;
end;
$$;

-- 4) RSVP submit by public token (write)
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
  from public.events e
  where i.public_token = p_token
    and e.id = i.event_id
    and e.host_user_id = i.host_user_id
    and e.status <> 'cancelled'
    and (
      coalesce(e.end_at, e.start_at) is null
      or coalesce(e.end_at, e.start_at) >= now()
    )
  returning i.id, i.event_id, i.status, i.responded_at, i.response_note, i.rsvp_plus_one, i.rsvp_dietary_needs
  into invitation_id, event_id, status, responded_at, response_note, rsvp_plus_one, rsvp_dietary_needs;

  if not found then
    raise exception 'invitation_not_available';
  end if;

  return next;
end;
$$;

-- 5) Date poll vote by token (write)
create or replace function public.submit_event_date_vote_by_token(
  p_token text,
  p_event_date_option_id uuid,
  p_vote public.date_vote_choice
)
returns table (
  ret_event_id uuid,
  ret_event_date_option_id uuid,
  ret_guest_id uuid,
  ret_vote public.date_vote_choice,
  ret_updated_at timestamptz
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_invitation public.invitations%rowtype;
  v_option public.event_date_options%rowtype;
begin
  select i.* into v_invitation
  from public.invitations i
  join public.events e
    on e.id = i.event_id
   and e.host_user_id = i.host_user_id
  where i.public_token = p_token
    and e.status <> 'cancelled'
    and (
      coalesce(e.end_at, e.start_at) is null
      or coalesce(e.end_at, e.start_at) >= now()
    )
  limit 1;

  if v_invitation.id is null then
    raise exception 'invitation_not_available';
  end if;

  select *
  into v_option
  from public.event_date_options edo
  where edo.id = p_event_date_option_id
    and edo.event_id = v_invitation.event_id
    and edo.host_user_id = v_invitation.host_user_id
  limit 1;

  if v_option.id is null then
    raise exception 'date_option_not_found_for_event';
  end if;

  if exists (
    select 1
    from public.events e
    where e.id = v_invitation.event_id
      and e.host_user_id = v_invitation.host_user_id
      and e.poll_status = 'closed'
  ) then
    raise exception 'poll_already_closed';
  end if;

  insert into public.event_date_votes (event_date_option_id, event_id, host_user_id, guest_id, vote)
  values (v_option.id, v_invitation.event_id, v_invitation.host_user_id, v_invitation.guest_id, p_vote)
  on conflict (event_date_option_id, guest_id)
  do update set
    vote = excluded.vote,
    updated_at = now()
  returning event_id, event_date_option_id, guest_id, vote, updated_at
  into ret_event_id, ret_event_date_option_id, ret_guest_id, ret_vote, ret_updated_at;

  return next;
end;
$$;

-- 6) Date poll read by token (read)
create or replace function public.get_event_date_votes_by_token(p_token text)
returns table (
  event_date_option_id uuid,
  vote public.date_vote_choice
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
    and (
      coalesce(e.end_at, e.start_at) is null
      or coalesce(e.end_at, e.start_at) >= now()
    )
  limit 1;

  if v_invitation.id is null then
    raise exception 'invitation_not_available';
  end if;

  return query
  select edv.event_date_option_id, edv.vote
  from public.event_date_votes edv
  where edv.guest_id = v_invitation.guest_id
    and edv.event_id = v_invitation.event_id;
end;
$$;

revoke all on function public.get_invitation_public(text) from public;
revoke all on function public.submit_rsvp_by_token(text, public.rsvp_status, text, text, boolean, text[]) from public;
revoke all on function public.submit_event_date_vote_by_token(text, uuid, public.date_vote_choice) from public;
revoke all on function public.get_event_date_votes_by_token(text) from public;

grant execute on function public.get_invitation_public(text) to anon, authenticated;
grant execute on function public.submit_rsvp_by_token(text, public.rsvp_status, text, text, boolean, text[]) to anon, authenticated;
grant execute on function public.submit_event_date_vote_by_token(text, uuid, public.date_vote_choice) to anon, authenticated;
grant execute on function public.get_event_date_votes_by_token(text) to anon, authenticated;
