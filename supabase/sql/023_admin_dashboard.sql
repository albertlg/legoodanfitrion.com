-- Admin Dashboard ("Modo Dios") for LeGoodAnfitrión
-- Security: Only founders can call these RPCs (email whitelist)
-- All functions use SECURITY DEFINER to bypass RLS for cross-user aggregation

-- ============================================================
-- 1. Admin check helper
-- ============================================================
create or replace function public.is_lga_admin()
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_email text;
begin
  select email into v_email
  from auth.users
  where id = auth.uid();

  return v_email in (
    'albert@albertlg.com',
    'albertlg@gmail.com',
    'laurags@gmail.com'
  );
end;
$$;

-- ============================================================
-- 2. Main KPIs + tables in a single RPC call
-- ============================================================
create or replace function public.get_admin_dashboard_stats()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  result jsonb;
begin
  -- Gate: only admins
  if not public.is_lga_admin() then
    raise exception 'Forbidden: admin access required';
  end if;

  select jsonb_build_object(

    -- KPI 1: Total registered users
    'total_users', (
      select count(*) from auth.users
    ),

    -- KPI 1b: Users registered in last 30 days
    'users_last_30d', (
      select count(*) from auth.users
      where created_at >= now() - interval '30 days'
    ),

    -- KPI 2: Total events
    'total_events', (
      select count(*) from public.events
    ),

    -- KPI 2b: Events created in last 30 days
    'events_last_30d', (
      select count(*) from public.events
      where created_at >= now() - interval '30 days'
    ),

    -- KPI 3: Total RSVPs processed (responded invitations)
    'total_rsvps', (
      select count(*) from public.invitations
      where status in ('yes', 'no', 'maybe')
    ),

    -- KPI 3b: RSVPs in last 30 days
    'rsvps_last_30d', (
      select count(*) from public.invitations
      where status in ('yes', 'no', 'maybe')
        and responded_at >= now() - interval '30 days'
    ),

    -- KPI 4: PLG conversions (guests who are also registered users)
    'plg_conversions', (
      select count(distinct g.user_id)
      from public.guests g
      where g.user_id is not null
    ),

    -- KPI 4b: Total unique guest emails (denominator for conversion rate)
    'total_unique_guests', (
      select count(distinct lower(trim(email)))
      from public.guests
      where email is not null and email <> ''
    ),

    -- Top 5 most active hosts
    'top_hosts', (
      select coalesce(jsonb_agg(row_to_json(t)::jsonb), '[]'::jsonb)
      from (
        select
          coalesce(p.full_name, split_part(u.email, '@', 1)) as name,
          u.email,
          count(e.id) as event_count,
          count(distinct i.id) filter (where i.status = 'yes') as confirmed_guests
        from public.events e
        join auth.users u on e.host_user_id = u.id
        left join public.profiles p on e.host_user_id = p.id
        left join public.invitations i on i.event_id = e.id
        group by p.full_name, u.email
        order by event_count desc
        limit 5
      ) t
    ),

    -- Last 10 events created
    'recent_events', (
      select coalesce(jsonb_agg(row_to_json(t)::jsonb), '[]'::jsonb)
      from (
        select
          e.title,
          e.status,
          e.start_at,
          e.created_at,
          coalesce(p.full_name, split_part(u.email, '@', 1)) as host_name,
          (select count(*) from public.invitations i where i.event_id = e.id) as total_invited,
          (select count(*) from public.invitations i where i.event_id = e.id and i.status = 'yes') as confirmed,
          (select count(*) from public.invitations i where i.event_id = e.id and i.status = 'no') as declined,
          (select count(*) from public.invitations i where i.event_id = e.id and i.status = 'maybe') as maybe
        from public.events e
        join auth.users u on e.host_user_id = u.id
        left join public.profiles p on e.host_user_id = p.id
        order by e.created_at desc
        limit 10
      ) t
    ),

    -- Daily signups (last 30 days) for sparkline
    'daily_signups', (
      select coalesce(jsonb_agg(row_to_json(t)::jsonb), '[]'::jsonb)
      from (
        select
          date_trunc('day', created_at)::date as day,
          count(*) as count
        from auth.users
        where created_at >= now() - interval '30 days'
        group by day
        order by day
      ) t
    ),

    -- Waitlist leads total
    'total_waitlist', (
      select count(*) from public.waitlist_leads
    ),

    -- Waitlist converted
    'waitlist_converted', (
      select count(*) from public.waitlist_leads
      where converted_user_id is not null
    )

  ) into result;

  return result;
end;
$$;

-- Grant execute to authenticated users (admin check is internal)
grant execute on function public.is_lga_admin() to authenticated;
grant execute on function public.get_admin_dashboard_stats() to authenticated;
