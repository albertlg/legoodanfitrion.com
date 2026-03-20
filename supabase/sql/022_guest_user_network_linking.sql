-- Network effect: link guests with registered LGA users by email
-- 1) Adds guests.user_id FK -> profiles
-- 2) Auto-links on guest insert/update email
-- 3) Backfills pending guest links when a new auth user signs up
-- 4) Exposes RPC for "Invitaciones Recibidas"

alter table public.guests
  add column if not exists user_id uuid references public.profiles(id) on delete set null;

create index if not exists idx_guests_user_id on public.guests(user_id);

create or replace function public.link_guest_user_by_email()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_email_normalized text;
  v_user_id uuid;
begin
  if tg_op = 'UPDATE'
    and coalesce(new.email, '') = coalesce(old.email, '')
    and new.user_id is not distinct from old.user_id then
    return new;
  end if;

  v_email_normalized := nullif(lower(trim(coalesce(new.email, ''))), '');

  if v_email_normalized is null then
    if tg_op = 'UPDATE' and coalesce(new.email, '') is distinct from coalesce(old.email, '') then
      new.user_id := null;
    end if;
    return new;
  end if;

  if new.user_id is null or (tg_op = 'UPDATE' and coalesce(new.email, '') is distinct from coalesce(old.email, '')) then
    select p.id
      into v_user_id
    from auth.users u
    join public.profiles p on p.id = u.id
    where lower(trim(coalesce(u.email, ''))) = v_email_normalized
    limit 1;

    new.user_id := v_user_id;
  end if;

  return new;
end;
$$;

drop trigger if exists trg_guests_link_user_by_email on public.guests;
create trigger trg_guests_link_user_by_email
before insert or update of email, user_id on public.guests
for each row
execute function public.link_guest_user_by_email();

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_provider text;
  v_email_normalized text;
begin
  insert into public.profiles (id, full_name)
  values (new.id, coalesce(new.raw_user_meta_data ->> 'full_name', split_part(coalesce(new.email, 'user'), '@', 1)))
  on conflict (id) do nothing;

  v_email_normalized := nullif(lower(trim(coalesce(new.email, ''))), '');
  v_provider := lower(coalesce(new.raw_app_meta_data ->> 'provider', 'email'));

  if v_email_normalized is not null then
    begin
      update public.guests g
      set
        user_id = new.id,
        updated_at = now()
      where g.user_id is null
        and nullif(lower(trim(coalesce(g.email, ''))), '') = v_email_normalized;
    exception
      when undefined_table then
        null;
    end;
  end if;

  begin
    update public.waitlist_leads wl
    set
      converted_user_id = new.id,
      converted_at = coalesce(wl.converted_at, now()),
      conversion_source = case
        when v_provider = 'google' then 'google'
        when v_provider = 'phone' then 'phone'
        else 'email'
      end,
      updated_at = now()
    where wl.email_normalized = v_email_normalized
      and (wl.converted_user_id is null or wl.converted_user_id = new.id);
  exception
    when undefined_table then
      null;
  end;

  return new;
end;
$$;

drop function if exists public.get_my_received_invitations();
create or replace function public.get_my_received_invitations()
returns table (
  invitation_id uuid,
  invitation_status public.rsvp_status,
  invitation_created_at timestamptz,
  invitation_responded_at timestamptz,
  invitation_response_note text,
  invitation_public_token text,
  event_id uuid,
  event_title text,
  event_start_at timestamptz,
  event_status public.event_status,
  event_location_name text,
  event_location_address text,
  host_user_id uuid,
  host_full_name text,
  guest_id uuid,
  guest_first_name text,
  guest_last_name text,
  guest_email text
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
begin
  if v_user_id is null then
    raise exception 'not_authenticated';
  end if;

  return query
  select
    i.id as invitation_id,
    i.status as invitation_status,
    i.created_at as invitation_created_at,
    i.responded_at as invitation_responded_at,
    i.response_note as invitation_response_note,
    i.public_token as invitation_public_token,
    e.id as event_id,
    e.title as event_title,
    e.start_at as event_start_at,
    e.status as event_status,
    e.location_name as event_location_name,
    e.location_address as event_location_address,
    e.host_user_id,
    coalesce(p.full_name, split_part(coalesce(u.email, ''), '@', 1), 'Host') as host_full_name,
    g.id as guest_id,
    g.first_name as guest_first_name,
    coalesce(g.last_name, '') as guest_last_name,
    g.email as guest_email
  from public.invitations i
  join public.events e
    on e.id = i.event_id
   and e.host_user_id = i.host_user_id
  join public.guests g
    on g.id = i.guest_id
   and g.host_user_id = i.host_user_id
  left join public.profiles p
    on p.id = e.host_user_id
  left join auth.users u
    on u.id = e.host_user_id
  where g.user_id = v_user_id
  order by coalesce(i.responded_at, i.created_at) desc, i.created_at desc;
end;
$$;

revoke all on function public.get_my_received_invitations() from public;
grant execute on function public.get_my_received_invitations() to authenticated;
