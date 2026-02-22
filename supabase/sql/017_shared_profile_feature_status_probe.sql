-- Shared profile diagnostics RPC (no side effects).
-- Exposes runtime status for key tables and functions used by the frontend.

create or replace function public.get_shared_profile_feature_status()
returns table (
  checks_version text,
  has_table_global_guest_profiles boolean,
  has_table_host_guest_profile_links boolean,
  has_table_global_guest_profile_shares boolean,
  has_fn_get_or_create_global_profile boolean,
  has_fn_link_guest boolean,
  has_fn_link_all_guests boolean,
  has_fn_share_targets boolean,
  has_fn_set_share boolean,
  share_targets_probe_ok boolean,
  global_profile_id uuid,
  share_target_count integer,
  self_target_count integer
)
language plpgsql
security definer
set search_path = public, auth, pg_catalog
as $$
declare
  v_has_table_global_guest_profiles boolean := to_regclass('public.global_guest_profiles') is not null;
  v_has_table_host_guest_profile_links boolean := to_regclass('public.host_guest_profile_links') is not null;
  v_has_table_global_guest_profile_shares boolean := to_regclass('public.global_guest_profile_shares') is not null;
  v_has_fn_get_or_create_global_profile boolean := to_regprocedure('public.get_or_create_my_global_guest_profile()') is not null;
  v_has_fn_link_guest boolean := to_regprocedure('public.link_my_guest_to_matched_global_profile(uuid)') is not null;
  v_has_fn_link_all_guests boolean := to_regprocedure('public.link_all_my_guests_to_global_profiles()') is not null;
  v_has_fn_share_targets boolean := to_regprocedure('public.get_my_global_profile_share_targets()') is not null;
  v_has_fn_set_share boolean := to_regprocedure('public.set_my_global_profile_share(uuid,text,boolean,boolean,boolean,boolean,boolean,timestamptz)') is not null;
  v_share_targets_probe_ok boolean := false;
  v_global_profile_id uuid := null;
  v_share_target_count integer := 0;
  v_self_target_count integer := 0;
begin
  if v_has_table_global_guest_profiles then
    execute
      'select gp.id
       from public.global_guest_profiles gp
       where gp.owner_user_id = auth.uid()
       limit 1'
    into v_global_profile_id;
  end if;

  if v_has_fn_share_targets then
    begin
      execute 'select count(*)::integer from public.get_my_global_profile_share_targets()'
      into v_share_target_count;

      execute
        'select count(*)::integer
         from public.get_my_global_profile_share_targets()
         where host_user_id = auth.uid()'
      into v_self_target_count;

      v_share_targets_probe_ok := true;
    exception
      when others then
        v_share_targets_probe_ok := false;
        v_share_target_count := 0;
        v_self_target_count := 0;
    end;
  end if;

  return query
    select
      '1.0.0'::text,
      v_has_table_global_guest_profiles,
      v_has_table_host_guest_profile_links,
      v_has_table_global_guest_profile_shares,
      v_has_fn_get_or_create_global_profile,
      v_has_fn_link_guest,
      v_has_fn_link_all_guests,
      v_has_fn_share_targets,
      v_has_fn_set_share,
      v_share_targets_probe_ok,
      v_global_profile_id,
      v_share_target_count,
      v_self_target_count;
end;
$$;

revoke all on function public.get_shared_profile_feature_status() from public;
grant execute on function public.get_shared_profile_feature_status() to authenticated;
