-- Waitlist leads for public landing growth funnel
-- Run in Supabase SQL Editor after 008

create table if not exists public.waitlist_leads (
  id uuid primary key default gen_random_uuid(),
  email text not null,
  email_normalized text generated always as (lower(trim(email))) stored,
  locale text,
  source text not null default 'landing_home',
  source_path text,
  referrer text,
  user_agent text,
  signup_host text,
  joined_count integer not null default 1 check (joined_count > 0),
  first_joined_at timestamptz not null default now(),
  last_joined_at timestamptz not null default now(),
  converted_user_id uuid references auth.users(id) on delete set null,
  converted_at timestamptz,
  conversion_source text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint waitlist_email_has_at check (position('@' in email) > 1)
);

revoke all on public.waitlist_leads from public;
grant insert on public.waitlist_leads to anon, authenticated;

create unique index if not exists idx_waitlist_leads_email_normalized
  on public.waitlist_leads(email_normalized);
create index if not exists idx_waitlist_leads_last_joined_at
  on public.waitlist_leads(last_joined_at desc);
create index if not exists idx_waitlist_leads_converted_user_id
  on public.waitlist_leads(converted_user_id);

drop trigger if exists trg_waitlist_leads_set_updated_at on public.waitlist_leads;
create trigger trg_waitlist_leads_set_updated_at
before update on public.waitlist_leads
for each row execute function public.set_updated_at();

alter table public.waitlist_leads enable row level security;

drop policy if exists waitlist_leads_insert_public on public.waitlist_leads;
create policy waitlist_leads_insert_public
on public.waitlist_leads for insert
to anon, authenticated
with check (true);

create or replace function public.join_waitlist(
  p_email text,
  p_locale text default null,
  p_source text default 'landing_home',
  p_source_path text default null,
  p_referrer text default null,
  p_user_agent text default null,
  p_signup_host text default null
)
returns table (
  status text,
  lead_id uuid,
  joined_count integer
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_email text;
  v_email_normalized text;
  v_lead_id uuid;
  v_joined_count integer;
begin
  v_email := trim(coalesce(p_email, ''));
  if v_email = '' or position('@' in v_email) <= 1 then
    raise exception 'Invalid email';
  end if;
  v_email_normalized := lower(v_email);

  select wl.id, wl.joined_count
  into v_lead_id, v_joined_count
  from public.waitlist_leads wl
  where wl.email_normalized = v_email_normalized
  limit 1;

  if found then
    update public.waitlist_leads wl
    set
      locale = coalesce(nullif(trim(coalesce(p_locale, '')), ''), wl.locale),
      source = coalesce(nullif(trim(coalesce(p_source, '')), ''), wl.source),
      source_path = coalesce(nullif(trim(coalesce(p_source_path, '')), ''), wl.source_path),
      referrer = coalesce(nullif(trim(coalesce(p_referrer, '')), ''), wl.referrer),
      user_agent = coalesce(nullif(trim(coalesce(p_user_agent, '')), ''), wl.user_agent),
      signup_host = coalesce(nullif(trim(coalesce(p_signup_host, '')), ''), wl.signup_host),
      joined_count = wl.joined_count + 1,
      last_joined_at = now()
    where wl.id = v_lead_id
    returning wl.joined_count into v_joined_count;

    return query select 'already_joined'::text, v_lead_id, v_joined_count;
    return;
  end if;

  insert into public.waitlist_leads as wl (
    email,
    locale,
    source,
    source_path,
    referrer,
    user_agent,
    signup_host
  )
  values (
    v_email,
    nullif(trim(coalesce(p_locale, '')), ''),
    coalesce(nullif(trim(coalesce(p_source, '')), ''), 'landing_home'),
    nullif(trim(coalesce(p_source_path, '')), ''),
    nullif(trim(coalesce(p_referrer, '')), ''),
    nullif(trim(coalesce(p_user_agent, '')), ''),
    nullif(trim(coalesce(p_signup_host, '')), '')
  )
  returning wl.id, wl.joined_count into v_lead_id, v_joined_count;

  return query select 'joined'::text, v_lead_id, v_joined_count;
end;
$$;

revoke all on function public.join_waitlist(text, text, text, text, text, text, text) from public;
grant execute on function public.join_waitlist(text, text, text, text, text, text, text) to anon, authenticated;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_provider text;
begin
  insert into public.profiles (id, full_name)
  values (new.id, coalesce(new.raw_user_meta_data ->> 'full_name', split_part(new.email, '@', 1)))
  on conflict (id) do nothing;

  v_provider := lower(coalesce(new.raw_app_meta_data ->> 'provider', 'email'));

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
    where wl.email_normalized = lower(trim(coalesce(new.email, '')))
      and (wl.converted_user_id is null or wl.converted_user_id = new.id);
  exception
    when undefined_table then
      null;
  end;

  return new;
end;
$$;
