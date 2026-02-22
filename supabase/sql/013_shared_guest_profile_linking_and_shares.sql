-- Shared guest profile helper RPCs for linking + share management.
-- Run after 012_shared_guest_profiles.sql

create or replace function public.link_my_guest_to_matched_global_profile(p_guest_id uuid)
returns table (
  linked boolean,
  reason text,
  guest_id uuid,
  global_profile_id uuid,
  owner_user_id uuid,
  matched_by text
)
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_guest public.guests%rowtype;
  v_owner_user_id uuid;
  v_matched_by text;
  v_global_profile_id uuid;
  v_guest_email text;
  v_guest_phone_digits text;
begin
  select g.*
    into v_guest
  from public.guests g
  where g.id = p_guest_id
    and g.host_user_id = auth.uid();

  if not found then
    return query select false, 'guest_not_owned', p_guest_id, null::uuid, null::uuid, null::text;
    return;
  end if;

  v_guest_email := lower(trim(coalesce(v_guest.email, '')));
  v_guest_phone_digits := regexp_replace(coalesce(v_guest.phone, ''), '\D', '', 'g');

  if v_guest_email = '' and char_length(v_guest_phone_digits) < 7 then
    return query select false, 'guest_without_contact', v_guest.id, null::uuid, null::uuid, null::text;
    return;
  end if;

  if v_guest_email <> '' then
    select u.id
      into v_owner_user_id
    from auth.users u
    where lower(trim(coalesce(u.email, ''))) = v_guest_email
    limit 1;

    if found then
      v_matched_by := 'email';
    end if;
  end if;

  if v_owner_user_id is null and char_length(v_guest_phone_digits) >= 7 then
    select p.id
      into v_owner_user_id
    from public.profiles p
    where regexp_replace(coalesce(p.phone, ''), '\D', '', 'g') = v_guest_phone_digits
    limit 1;

    if found then
      v_matched_by := 'phone';
    end if;
  end if;

  if v_owner_user_id is null then
    return query select false, 'no_registered_owner', v_guest.id, null::uuid, null::uuid, null::text;
    return;
  end if;

  insert into public.global_guest_profiles (
    owner_user_id,
    display_name,
    first_name,
    last_name,
    email,
    phone,
    city,
    country,
    address,
    postal_code,
    state_region,
    company,
    birthday,
    preferred_language,
    visibility
  )
  select
    p.id,
    coalesce(nullif(trim(p.full_name), ''), split_part(coalesce(u.email, ''), '@', 1)),
    coalesce(nullif(split_part(trim(coalesce(p.full_name, '')), ' ', 1), ''), split_part(coalesce(u.email, ''), '@', 1)),
    null,
    nullif(trim(coalesce(u.email, '')), ''),
    nullif(trim(coalesce(p.phone, '')), ''),
    null,
    null,
    null,
    null,
    null,
    null,
    null,
    coalesce(nullif(trim(p.preferred_language), ''), 'es'),
    'private'
  from public.profiles p
  left join auth.users u on u.id = p.id
  where p.id = v_owner_user_id
  on conflict on constraint global_guest_profiles_owner_unique do update
  set updated_at = now()
  returning id into v_global_profile_id;

  if v_global_profile_id is null then
    select gp.id
      into v_global_profile_id
    from public.global_guest_profiles gp
    where gp.owner_user_id = v_owner_user_id
    limit 1;
  end if;

  if v_global_profile_id is null then
    return query select false, 'global_profile_not_available', v_guest.id, null::uuid, v_owner_user_id, v_matched_by;
    return;
  end if;

  insert into public.host_guest_profile_links (
    guest_id,
    global_profile_id,
    link_status,
    linked_by_user_id
  )
  values (
    v_guest.id,
    v_global_profile_id,
    'linked',
    auth.uid()
  )
  on conflict on constraint host_guest_profile_links_pkey do update
  set
    global_profile_id = excluded.global_profile_id,
    link_status = 'linked',
    linked_by_user_id = auth.uid(),
    updated_at = now();

  return query
    select true, 'linked', v_guest.id, v_global_profile_id, v_owner_user_id, v_matched_by;
end;
$$;

create or replace function public.link_all_my_guests_to_global_profiles()
returns table (
  checked_count integer,
  linked_count integer,
  skipped_count integer
)
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_guest record;
  v_result record;
  v_checked integer := 0;
  v_linked integer := 0;
  v_skipped integer := 0;
begin
  for v_guest in
    select g.id
    from public.guests g
    where g.host_user_id = auth.uid()
  loop
    v_checked := v_checked + 1;
    select * into v_result from public.link_my_guest_to_matched_global_profile(v_guest.id);
    if coalesce(v_result.linked, false) then
      v_linked := v_linked + 1;
    else
      v_skipped := v_skipped + 1;
    end if;
  end loop;

  return query
    select v_checked, v_linked, v_skipped;
end;
$$;

create or replace function public.get_my_global_profile_share_targets()
returns table (
  host_user_id uuid,
  host_name text,
  host_email text,
  link_count integer,
  share_status text,
  allow_identity boolean,
  allow_food boolean,
  allow_lifestyle boolean,
  allow_conversation boolean,
  allow_health boolean,
  expires_at timestamptz
)
language sql
security definer
set search_path = public, auth
as $$
  with my_profile as (
    select gp.id
    from public.global_guest_profiles gp
    where gp.owner_user_id = auth.uid()
    limit 1
  ),
  linked_hosts as (
    select
      l.linked_by_user_id as host_user_id,
      count(*)::integer as link_count
    from public.host_guest_profile_links l
    join my_profile mp on mp.id = l.global_profile_id
    group by l.linked_by_user_id
  ),
  shares as (
    select
      s.grantee_user_id,
      s.status,
      s.allow_identity,
      s.allow_food,
      s.allow_lifestyle,
      s.allow_conversation,
      s.allow_health,
      s.expires_at
    from public.global_guest_profile_shares s
    join my_profile mp on mp.id = s.global_profile_id
  ),
  targets as (
    select lh.host_user_id
    from linked_hosts lh
    where lh.host_user_id is not null
      and lh.host_user_id <> auth.uid()
    union
    select s.grantee_user_id
    from shares s
    where s.grantee_user_id is not null
      and s.grantee_user_id <> auth.uid()
  )
  select
    target.host_user_id,
    coalesce(nullif(trim(p.full_name), ''), split_part(coalesce(u.email, ''), '@', 1), 'Host') as host_name,
    nullif(trim(coalesce(u.email, '')), '') as host_email,
    coalesce(lh.link_count, 0)::integer as link_count,
    coalesce(s.status, 'inactive') as share_status,
    coalesce(s.allow_identity, false) as allow_identity,
    coalesce(s.allow_food, false) as allow_food,
    coalesce(s.allow_lifestyle, false) as allow_lifestyle,
    coalesce(s.allow_conversation, false) as allow_conversation,
    coalesce(s.allow_health, false) as allow_health,
    s.expires_at
  from targets target
  left join linked_hosts lh on lh.host_user_id = target.host_user_id
  left join shares s on s.grantee_user_id = target.host_user_id
  left join public.profiles p on p.id = target.host_user_id
  left join auth.users u on u.id = target.host_user_id
  order by coalesce(lh.link_count, 0) desc, host_name asc;
$$;

create or replace function public.set_my_global_profile_share(
  p_grantee_user_id uuid,
  p_status text default 'active',
  p_allow_identity boolean default true,
  p_allow_food boolean default false,
  p_allow_lifestyle boolean default false,
  p_allow_conversation boolean default false,
  p_allow_health boolean default false,
  p_expires_at timestamptz default null
)
returns uuid
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_profile_id uuid;
  v_status text;
  v_health_consent boolean;
  v_share_id uuid;
begin
  if p_grantee_user_id is null then
    raise exception 'grantee_user_id is required';
  end if;

  if p_grantee_user_id = auth.uid() then
    raise exception 'cannot share profile with the same owner account';
  end if;

  select gp.id
    into v_profile_id
  from public.global_guest_profiles gp
  where gp.owner_user_id = auth.uid()
  limit 1;

  if v_profile_id is null then
    raise exception 'global_profile_not_found_for_owner';
  end if;

  v_status := lower(trim(coalesce(p_status, 'active')));
  if v_status not in ('active', 'revoked', 'expired') then
    raise exception 'invalid_status';
  end if;

  if p_allow_health then
    select coalesce(gs.consent_granted, false)
      into v_health_consent
    from public.global_guest_profile_sensitive gs
    where gs.global_profile_id = v_profile_id;
    if not coalesce(v_health_consent, false) then
      raise exception 'health_consent_required_before_sharing';
    end if;
  end if;

  insert into public.global_guest_profile_shares (
    global_profile_id,
    grantee_user_id,
    grant_source,
    status,
    allow_identity,
    allow_food,
    allow_lifestyle,
    allow_conversation,
    allow_health,
    granted_at,
    revoked_at,
    expires_at
  )
  values (
    v_profile_id,
    p_grantee_user_id,
    'owner_settings',
    v_status,
    coalesce(p_allow_identity, false),
    coalesce(p_allow_food, false),
    coalesce(p_allow_lifestyle, false),
    coalesce(p_allow_conversation, false),
    coalesce(p_allow_health, false),
    now(),
    case when v_status = 'revoked' then now() else null end,
    p_expires_at
  )
  on conflict (global_profile_id, grantee_user_id) do update
  set
    status = excluded.status,
    allow_identity = excluded.allow_identity,
    allow_food = excluded.allow_food,
    allow_lifestyle = excluded.allow_lifestyle,
    allow_conversation = excluded.allow_conversation,
    allow_health = excluded.allow_health,
    expires_at = excluded.expires_at,
    revoked_at = case when excluded.status = 'revoked' then now() else null end,
    updated_at = now()
  returning id into v_share_id;

  insert into public.global_guest_profile_consent_events (
    global_profile_id,
    actor_user_id,
    event_type,
    payload
  )
  values (
    v_profile_id,
    auth.uid(),
    case when v_status = 'revoked' then 'share_revoked' else 'share_granted' end,
    jsonb_build_object(
      'grantee_user_id', p_grantee_user_id,
      'status', v_status,
      'allow_identity', coalesce(p_allow_identity, false),
      'allow_food', coalesce(p_allow_food, false),
      'allow_lifestyle', coalesce(p_allow_lifestyle, false),
      'allow_conversation', coalesce(p_allow_conversation, false),
      'allow_health', coalesce(p_allow_health, false),
      'expires_at', p_expires_at
    )
  );

  return v_share_id;
end;
$$;

revoke all on function public.link_my_guest_to_matched_global_profile(uuid) from public;
grant execute on function public.link_my_guest_to_matched_global_profile(uuid) to authenticated;

revoke all on function public.link_all_my_guests_to_global_profiles() from public;
grant execute on function public.link_all_my_guests_to_global_profiles() to authenticated;

revoke all on function public.get_my_global_profile_share_targets() from public;
grant execute on function public.get_my_global_profile_share_targets() to authenticated;

revoke all on function public.set_my_global_profile_share(uuid, text, boolean, boolean, boolean, boolean, boolean, timestamptz) from public;
grant execute on function public.set_my_global_profile_share(uuid, text, boolean, boolean, boolean, boolean, boolean, timestamptz) to authenticated;
