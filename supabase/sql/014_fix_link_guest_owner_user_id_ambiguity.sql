-- Fix ambiguous owner_user_id reference in link_my_guest_to_matched_global_profile
-- when ON CONFLICT is resolved inside PL/pgSQL (OUT param name collides with column).

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
  on conflict (guest_id) do update
  set
    global_profile_id = excluded.global_profile_id,
    link_status = 'linked',
    linked_by_user_id = auth.uid(),
    updated_at = now();

  return query
    select true, 'linked', v_guest.id, v_global_profile_id, v_owner_user_id, v_matched_by;
end;
$$;
