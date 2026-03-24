-- =====================================================
-- 027_cohosting_rpc_search_user.sql
-- Co-Hosting: búsqueda segura de usuario por email
-- =====================================================

create or replace function public.get_user_id_by_email(p_email text)
returns uuid
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_email text;
  v_user_id uuid;
begin
  -- Solo usuarios autenticados pueden ejecutar esta búsqueda.
  if auth.uid() is null then
    raise exception 'not_authenticated';
  end if;

  v_email := nullif(lower(trim(coalesce(p_email, ''))), '');
  if v_email is null then
    return null;
  end if;

  select u.id
  into v_user_id
  from auth.users u
  where lower(trim(coalesce(u.email, ''))) = v_email
  limit 1;

  return v_user_id;
end;
$$;

revoke all on function public.get_user_id_by_email(text) from public;
grant execute on function public.get_user_id_by_email(text) to authenticated;
