-- =====================================================
-- 049_expand_finance_module.sql
-- Expande el módulo financiero (B2C + B2B)
-- =====================================================

begin;

create extension if not exists pgcrypto;

alter table public.events
  add column if not exists finance_mode text not null default 'split_tickets',
  add column if not exists finance_fixed_price numeric(10,2),
  add column if not exists finance_payment_info text,
  add column if not exists finance_total_budget numeric(12,2);

alter table public.events
  drop constraint if exists events_finance_mode_check;

alter table public.events
  add constraint events_finance_mode_check
  check (finance_mode in ('fixed_price', 'split_tickets', 'corporate_budget'));

alter table public.events
  drop constraint if exists events_finance_fixed_price_non_negative;

alter table public.events
  add constraint events_finance_fixed_price_non_negative
  check (finance_fixed_price is null or finance_fixed_price >= 0);

alter table public.events
  drop constraint if exists events_finance_total_budget_non_negative;

alter table public.events
  add constraint events_finance_total_budget_non_negative
  check (finance_total_budget is null or finance_total_budget >= 0);

create table if not exists public.event_fixed_price_payments (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null,
  host_user_id uuid not null,
  invitation_id uuid not null references public.invitations(id) on delete cascade,
  paid_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint event_fixed_price_payments_event_fk
    foreign key (event_id, host_user_id)
    references public.events(id, host_user_id)
    on delete cascade,
  constraint event_fixed_price_payments_unique_invitation_per_event
    unique (event_id, invitation_id)
);

create index if not exists idx_event_fixed_price_payments_event_id
  on public.event_fixed_price_payments(event_id);

create index if not exists idx_event_fixed_price_payments_invitation_id
  on public.event_fixed_price_payments(invitation_id);

drop trigger if exists trg_event_fixed_price_payments_set_updated_at on public.event_fixed_price_payments;
create trigger trg_event_fixed_price_payments_set_updated_at
before update on public.event_fixed_price_payments
for each row execute function public.set_updated_at();

create or replace function public.validate_event_fixed_price_payment_scope()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  v_event_host uuid;
  v_invitation_event uuid;
  v_invitation_host uuid;
begin
  select e.host_user_id
  into v_event_host
  from public.events e
  where e.id = new.event_id
  limit 1;

  if v_event_host is null then
    raise exception 'event_not_found';
  end if;

  if new.host_user_id is null then
    new.host_user_id := v_event_host;
  elsif new.host_user_id <> v_event_host then
    raise exception 'host_user_mismatch_for_event';
  end if;

  select i.event_id, i.host_user_id
  into v_invitation_event, v_invitation_host
  from public.invitations i
  where i.id = new.invitation_id
  limit 1;

  if v_invitation_event is null then
    raise exception 'invitation_not_found';
  end if;

  if v_invitation_event <> new.event_id or v_invitation_host <> new.host_user_id then
    raise exception 'invitation_not_valid_for_event';
  end if;

  return new;
end;
$$;

drop trigger if exists trg_validate_event_fixed_price_payment_scope on public.event_fixed_price_payments;
create trigger trg_validate_event_fixed_price_payment_scope
before insert or update on public.event_fixed_price_payments
for each row execute function public.validate_event_fixed_price_payment_scope();

alter table public.event_fixed_price_payments enable row level security;

drop policy if exists event_fixed_price_payments_select_editors on public.event_fixed_price_payments;
create policy event_fixed_price_payments_select_editors
on public.event_fixed_price_payments
for select
to authenticated
using (public.is_event_editor(event_id, auth.uid()));

drop policy if exists event_fixed_price_payments_insert_editors on public.event_fixed_price_payments;
create policy event_fixed_price_payments_insert_editors
on public.event_fixed_price_payments
for insert
to authenticated
with check (public.is_event_editor(event_id, auth.uid()));

drop policy if exists event_fixed_price_payments_update_editors on public.event_fixed_price_payments;
create policy event_fixed_price_payments_update_editors
on public.event_fixed_price_payments
for update
to authenticated
using (public.is_event_editor(event_id, auth.uid()))
with check (public.is_event_editor(event_id, auth.uid()));

drop policy if exists event_fixed_price_payments_delete_editors on public.event_fixed_price_payments;
create policy event_fixed_price_payments_delete_editors
on public.event_fixed_price_payments
for delete
to authenticated
using (public.is_event_editor(event_id, auth.uid()));

commit;
