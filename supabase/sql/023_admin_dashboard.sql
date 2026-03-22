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

    -- Total network size: unique contacts in the guests CRM (the "dark matter")
    'total_network_size', (
      select count(distinct id) from public.guests
    ),

    -- All registered users (includes those with 0 events)
    'top_hosts', (
      select coalesce(jsonb_agg(row_to_json(t)::jsonb), '[]'::jsonb)
      from (
        select
          coalesce(p.full_name, split_part(u.email, '@', 1)) as name,
          u.email,
          coalesce(ec.event_count, 0) as event_count,
          coalesce(ec.confirmed_guests, 0) as confirmed_guests,
          coalesce(gc.total_contacts, 0) as total_contacts
        from auth.users u
        left join public.profiles p on p.id = u.id
        left join lateral (
          select
            count(distinct e.id) as event_count,
            count(distinct i.id) filter (where i.status = 'yes') as confirmed_guests
          from public.events e
          left join public.invitations i on i.event_id = e.id
          where e.host_user_id = u.id
        ) ec on true
        left join lateral (
          select count(*) as total_contacts
          from public.guests g
          where g.host_user_id = u.id
        ) gc on true
        order by event_count desc, u.created_at desc
        limit 500
      ) t
    ),

    -- All events (no limit, paginated on frontend)
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
        limit 1000
      ) t
    ),

    -- Recent RSVPs (all responded invitations, paginated on frontend)
    'recent_rsvps', (
      select coalesce(jsonb_agg(row_to_json(t)::jsonb), '[]'::jsonb)
      from (
        select
          coalesce(i.guest_display_name, g.first_name || ' ' || coalesce(g.last_name, ''), i.invitee_email, 'Anónimo') as guest_name,
          e.title as event_title,
          i.status,
          i.responded_at,
          i.rsvp_plus_one,
          i.response_note
        from public.invitations i
        join public.events e on i.event_id = e.id
        left join public.guests g on i.guest_id = g.id
        where i.status in ('yes', 'no', 'maybe')
        order by i.responded_at desc nulls last
        limit 1000
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

    -- Active hosts (users who created at least 1 event)
    'active_hosts', (
      select count(distinct host_user_id) from public.events
    ),

    -- Average guests per event (viral factor)
    'avg_guests_per_event', (
      select coalesce(round(avg(cnt)::numeric, 1), 0)
      from (
        select e.id, count(i.id) as cnt
        from public.events e
        left join public.invitations i on i.event_id = e.id
        group by e.id
      ) sub
    ),

    -- Waitlist leads total
    'total_waitlist', (
      select count(*) from public.waitlist_leads
    ),

    -- Waitlist converted
    'waitlist_converted', (
      select count(*) from public.waitlist_leads
      where converted_user_id is not null
    ),

    -- Waitlist users detail (email + signup date + converted flag)
    'waitlist_users', (
      select coalesce(jsonb_agg(row_to_json(t)::jsonb), '[]'::jsonb)
      from (
        select
          w.email,
          w.created_at,
          (w.converted_user_id is not null) as converted
        from public.waitlist_leads w
        order by w.created_at desc
        limit 500
      ) t
    ),

    -- Trending events: top 5 by RSVPs in last 7 days
    'trending_events', (
      select coalesce(jsonb_agg(row_to_json(t)::jsonb), '[]'::jsonb)
      from (
        select
          e.title,
          coalesce(p.full_name, split_part(u.email, '@', 1)) as host_name,
          count(i.id) as rsvps_7d
        from public.invitations i
        join public.events e on i.event_id = e.id
        join auth.users u on e.host_user_id = u.id
        left join public.profiles p on e.host_user_id = p.id
        where i.status in ('yes', 'no', 'maybe')
          and i.responded_at >= now() - interval '7 days'
        group by e.id, e.title, p.full_name, u.email
        order by rsvps_7d desc
        limit 5
      ) t
    ),

    -- System health: orphan events (no valid host in auth.users)
    'orphan_events', (
      select count(*) from public.events e
      where not exists (
        select 1 from auth.users u where u.id = e.host_user_id
      )
    ),

    -- System health: orphan RSVPs (invitation references non-existent event)
    'orphan_rsvps', (
      select count(*) from public.invitations i
      where not exists (
        select 1 from public.events e where e.id = i.event_id
      )
    )

  ) into result;

  return result;
end;
$$;

-- Grant execute to authenticated users (admin check is internal)
grant execute on function public.is_lga_admin() to authenticated;
grant execute on function public.get_admin_dashboard_stats() to authenticated;
