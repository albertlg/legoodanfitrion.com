-- Contact form submissions from public landing pages.

create table if not exists public.contact_messages (
  id uuid primary key default gen_random_uuid(),
  name text not null check (length(trim(name)) >= 2),
  email text not null,
  email_normalized text generated always as (lower(trim(email))) stored,
  message text not null check (length(trim(message)) >= 3),
  locale text,
  source_path text,
  referrer text,
  user_agent text,
  signup_host text,
  created_at timestamptz not null default now(),
  constraint contact_message_email_has_at check (position('@' in email) > 1)
);

revoke all on public.contact_messages from public;
grant insert on public.contact_messages to anon, authenticated;

create index if not exists idx_contact_messages_created_at
  on public.contact_messages(created_at desc);
create index if not exists idx_contact_messages_email_normalized
  on public.contact_messages(email_normalized);

alter table public.contact_messages enable row level security;

drop policy if exists contact_messages_insert_public on public.contact_messages;
create policy contact_messages_insert_public
on public.contact_messages for insert
to anon, authenticated
with check (true);

create or replace function public.submit_contact_message(
  p_name text,
  p_email text,
  p_message text,
  p_locale text default null,
  p_source_path text default null,
  p_referrer text default null,
  p_user_agent text default null,
  p_signup_host text default null
)
returns table (
  status text,
  message_id uuid
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_name text;
  v_email text;
  v_message text;
  v_message_id uuid;
begin
  v_name := trim(coalesce(p_name, ''));
  v_email := trim(coalesce(p_email, ''));
  v_message := trim(coalesce(p_message, ''));

  if v_name = '' then
    raise exception 'Invalid name';
  end if;
  if v_email = '' or position('@' in v_email) <= 1 then
    raise exception 'Invalid email';
  end if;
  if v_message = '' then
    raise exception 'Invalid message';
  end if;

  insert into public.contact_messages as cm (
    name,
    email,
    message,
    locale,
    source_path,
    referrer,
    user_agent,
    signup_host
  )
  values (
    v_name,
    v_email,
    v_message,
    nullif(trim(coalesce(p_locale, '')), ''),
    nullif(trim(coalesce(p_source_path, '')), ''),
    nullif(trim(coalesce(p_referrer, '')), ''),
    nullif(trim(coalesce(p_user_agent, '')), ''),
    nullif(trim(coalesce(p_signup_host, '')), '')
  )
  returning cm.id into v_message_id;

  return query select 'sent'::text, v_message_id;
end;
$$;

revoke all on function public.submit_contact_message(text, text, text, text, text, text, text, text) from public;
grant execute on function public.submit_contact_message(text, text, text, text, text, text, text, text) to anon, authenticated;
