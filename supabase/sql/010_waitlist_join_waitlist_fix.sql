-- Hotfix for environments that already applied 009 with ambiguous RETURNING reference

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
