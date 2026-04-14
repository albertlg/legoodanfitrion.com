-- 048_add_b2b_guest_fields.sql
-- Mini-CRM B2B: correo profesional + empresa/departamento por invitado.

alter table public.guests
  add column if not exists work_email text,
  add column if not exists company_name text;

create index if not exists idx_guests_host_work_email
  on public.guests (host_user_id, work_email);

create index if not exists idx_guests_host_company_name
  on public.guests (host_user_id, company_name);
