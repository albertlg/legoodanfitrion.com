-- 019_guest_sensitive_medical_columns.sql
-- Añade campos médicos al perfil sensible de invitado y actualiza la
-- constraint de consentimiento para contemplarlos.

alter table if exists public.guest_sensitive_preferences
  add column if not exists medical_conditions text[] not null default '{}',
  add column if not exists dietary_medical_restrictions text[] not null default '{}';

alter table if exists public.guest_sensitive_preferences
  drop constraint if exists sensitive_consent_required;

alter table if exists public.guest_sensitive_preferences
  add constraint sensitive_consent_required check (
    consent_granted
    or (
      coalesce(array_length(allergies, 1), 0) = 0
      and coalesce(array_length(intolerances, 1), 0) = 0
      and coalesce(array_length(pet_allergies, 1), 0) = 0
      and coalesce(array_length(medical_conditions, 1), 0) = 0
      and coalesce(array_length(dietary_medical_restrictions, 1), 0) = 0
    )
  );

create index if not exists idx_guest_sensitive_preferences_medical_conditions
  on public.guest_sensitive_preferences using gin (medical_conditions);

create index if not exists idx_guest_sensitive_preferences_dietary_medical_restrictions
  on public.guest_sensitive_preferences using gin (dietary_medical_restrictions);
