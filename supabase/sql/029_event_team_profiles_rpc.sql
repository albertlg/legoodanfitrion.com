-- =====================================================
-- 029_event_team_profiles_rpc.sql
-- Co-Hosting: lectura segura de nombre/avatar del equipo
-- =====================================================

create or replace function public.get_event_team_profiles(
  p_event_id uuid
)
returns table (
  user_id uuid,
  full_name text,
  avatar_url text
)
language plpgsql
security definer
set search_path = public, auth
as $$
begin
  if auth.uid() is null then
    raise exception 'not_authenticated';
  end if;

  if p_event_id is null then
    raise exception 'event_id_required';
  end if;

  if not public.is_event_editor(p_event_id, auth.uid()) then
    raise exception 'not_event_editor';
  end if;

  return query
  with team_ids as (
    select e.host_user_id as id
    from public.events e
    where e.id = p_event_id
    union
    select ec.host_id as id
    from public.event_cohosts ec
    where ec.event_id = p_event_id
  )
  select
    u.id as user_id,
    coalesce(
      nullif(trim(p.full_name), ''),
      nullif(trim(coalesce(u.raw_user_meta_data ->> 'full_name', '')), ''),
      split_part(coalesce(u.email, 'user'), '@', 1)
    ) as full_name,
    coalesce(
      nullif(trim(coalesce(u.raw_user_meta_data ->> 'avatar_url', '')), ''),
      nullif(trim(coalesce(u.raw_user_meta_data ->> 'picture', '')), '')
    ) as avatar_url
  from team_ids ti
  join auth.users u on u.id = ti.id
  left join public.profiles p on p.id = u.id;
end;
$$;

revoke all on function public.get_event_team_profiles(uuid) from public;
grant execute on function public.get_event_team_profiles(uuid) to authenticated;
