-- Upgrade admin dashboard metrics for dual B2B/B2C visibility.
-- Adds:
-- - events_professional / events_personal
-- - guests_professional / guests_personal
-- - event_type on recent_events rows (for UI context badges and filters)

-- Data patch (legacy QA/demo rows):
-- Normalize old "Team Building" records that were created with null/default event_type.
update public.events
set event_type = 'team_building'
where title ilike '%Team Building%'
  and (
    event_type is null
    or lower(trim(event_type)) = 'default'
    or trim(event_type) = ''
  );

create or replace function public.get_admin_dashboard_stats()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  result jsonb;
begin
  if not public.is_lga_admin() then
    raise exception 'Forbidden: admin access required';
  end if;

  select jsonb_build_object(

    'total_users', (
      select count(*) from auth.users
    ),

    'users_last_30d', (
      select count(*) from auth.users
      where created_at >= now() - interval '30 days'
    ),

    'total_events', (
      select count(*) from public.events
    ),

    'events_last_30d', (
      select count(*) from public.events
      where created_at >= now() - interval '30 days'
    ),

    'events_professional', (
      select count(*)
      from public.events e
      where lower(coalesce(e.event_type, '')) in (
        'networking',
        'team_building',
        'corporate_dinner',
        'all_hands',
        'business_meeting',
        'conference'
      )
    ),

    'events_personal', (
      select count(*)
      from public.events e
      where not (
        lower(coalesce(e.event_type, '')) in (
          'networking',
          'team_building',
          'corporate_dinner',
          'all_hands',
          'business_meeting',
          'conference'
        )
      )
    ),

    'total_rsvps', (
      select count(*) from public.invitations
      where status in ('yes', 'no', 'maybe')
    ),

    'rsvps_last_30d', (
      select count(*) from public.invitations
      where status in ('yes', 'no', 'maybe')
        and responded_at >= now() - interval '30 days'
    ),

    'plg_conversions', (
      select count(distinct g.user_id)
      from public.guests g
      where g.user_id is not null
    ),

    'total_unique_guests', (
      select count(distinct lower(trim(email)))
      from public.guests
      where email is not null and email <> ''
    ),

    'guests_professional', (
      select count(distinct coalesce(i.guest_id::text, nullif(lower(trim(i.invitee_email)), '')))
      from public.invitations i
      join public.events e on e.id = i.event_id
      where lower(coalesce(e.event_type, '')) in (
        'networking',
        'team_building',
        'corporate_dinner',
        'all_hands',
        'business_meeting',
        'conference'
      )
      and coalesce(i.guest_id::text, nullif(lower(trim(i.invitee_email)), '')) is not null
    ),

    'guests_personal', (
      select count(distinct coalesce(i.guest_id::text, nullif(lower(trim(i.invitee_email)), '')))
      from public.invitations i
      join public.events e on e.id = i.event_id
      where not (
        lower(coalesce(e.event_type, '')) in (
          'networking',
          'team_building',
          'corporate_dinner',
          'all_hands',
          'business_meeting',
          'conference'
        )
      )
      and coalesce(i.guest_id::text, nullif(lower(trim(i.invitee_email)), '')) is not null
    ),

    'total_network_size', (
      select count(distinct id) from public.guests
    ),

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

    'recent_events', (
      select coalesce(jsonb_agg(row_to_json(t)::jsonb), '[]'::jsonb)
      from (
        select
          e.title,
          e.status,
          e.event_type,
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

    'active_hosts', (
      select count(distinct host_user_id) from public.events
    ),

    'avg_guests_per_event', (
      select coalesce(round(avg(cnt)::numeric, 1), 0)
      from (
        select e.id, count(i.id) as cnt
        from public.events e
        left join public.invitations i on i.event_id = e.id
        group by e.id
      ) sub
    ),

    'total_waitlist', (
      select count(*) from public.waitlist_leads
    ),

    'waitlist_converted', (
      select count(*) from public.waitlist_leads w
      where w.converted_user_id is not null
         or exists (
           select 1 from auth.users u
           where lower(trim(u.email)) = w.email_normalized
         )
    ),

    'waitlist_users', (
      select coalesce(jsonb_agg(row_to_json(t)::jsonb), '[]'::jsonb)
      from (
        select
          w.email,
          w.created_at,
          (w.converted_user_id is not null or exists (
            select 1 from auth.users u
            where lower(trim(u.email)) = w.email_normalized
          )) as converted
        from public.waitlist_leads w
        order by w.created_at desc
        limit 500
      ) t
    ),

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

    'orphan_events', (
      select count(*) from public.events e
      where not exists (
        select 1 from auth.users u where u.id = e.host_user_id
      )
    ),

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

grant execute on function public.get_admin_dashboard_stats() to authenticated;
