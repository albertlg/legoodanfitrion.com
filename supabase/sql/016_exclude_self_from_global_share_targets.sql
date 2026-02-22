-- Exclude current owner account from global share targets.
-- Prevents attempting to save share permissions to self.

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
