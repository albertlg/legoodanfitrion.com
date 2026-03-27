-- =====================================================
-- 036_invite_group_to_event.sql
-- Feature B2C: Inyección masiva de Grupo -> Invitaciones de Evento
-- =====================================================

begin;

-- RPC:
-- - Inserta invitaciones para un evento a partir de los miembros de un grupo.
-- - Ignora duplicados (event_id, guest_id) con ON CONFLICT DO NOTHING.
-- - Devuelve cuántas invitaciones nuevas se añadieron realmente.
--
-- Reglas:
-- - Debe estar autenticado.
-- - Debe poder editar el evento (owner o co-host editor mediante is_event_editor).
-- - El grupo debe pertenecer al actor autenticado o al owner del evento.
-- - Los invitados objetivo se resuelven sobre guests del owner del evento
--   (para mantener integridad de FK host_user_id/event_id/guest_id en invitations).
create or replace function public.invite_group_to_event(
  p_event_id uuid,
  p_group_id uuid
)
returns table (
  inserted_count integer
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor_user_id uuid := auth.uid();
  v_event_owner_user_id uuid;
  v_group_owner_user_id uuid;
  v_inserted_count integer := 0;
begin
  if v_actor_user_id is null then
    raise exception 'not_authenticated';
  end if;

  select e.host_user_id
  into v_event_owner_user_id
  from public.events e
  where e.id = p_event_id
  limit 1;

  if v_event_owner_user_id is null then
    raise exception 'event_not_found';
  end if;

  if not public.is_event_editor(p_event_id, v_actor_user_id) then
    raise exception 'not_event_editor';
  end if;

  select gg.host_id
  into v_group_owner_user_id
  from public.guest_groups gg
  where gg.id = p_group_id
  limit 1;

  if v_group_owner_user_id is null then
    raise exception 'group_not_found';
  end if;

  if v_group_owner_user_id <> v_actor_user_id and v_group_owner_user_id <> v_event_owner_user_id then
    raise exception 'group_not_accessible_for_actor';
  end if;

  with candidate_guests as (
    select distinct on (g.id)
      g.id as guest_id,
      coalesce(g.email, ggm.guest_email) as invitee_email,
      coalesce(g.phone, ggm.guest_phone) as invitee_phone,
      nullif(trim(concat_ws(' ', g.first_name, g.last_name)), '') as guest_display_name
    from public.guest_group_members ggm
    join public.guest_groups gg
      on gg.id = ggm.group_id
    join public.guests g
      on g.host_user_id = v_event_owner_user_id
     and (
       (ggm.guest_id is not null and g.id = ggm.guest_id)
       or (
         ggm.guest_email is not null
         and lower(trim(coalesce(g.email, ''))) = lower(trim(ggm.guest_email))
       )
       or (
         ggm.guest_phone is not null
         and regexp_replace(coalesce(g.phone, ''), '\D', '', 'g') = regexp_replace(coalesce(ggm.guest_phone, ''), '\D', '', 'g')
         and regexp_replace(coalesce(ggm.guest_phone, ''), '\D', '', 'g') <> ''
       )
     )
    where gg.id = p_group_id
  ),
  inserted as (
    insert into public.invitations (
      host_user_id,
      event_id,
      guest_id,
      invite_channel,
      invitee_email,
      invitee_phone,
      guest_display_name,
      status
    )
    select
      v_event_owner_user_id,
      p_event_id,
      cg.guest_id,
      'link',
      cg.invitee_email,
      cg.invitee_phone,
      cg.guest_display_name,
      'pending'::public.rsvp_status
    from candidate_guests cg
    on conflict (event_id, guest_id) do nothing
    returning 1
  )
  select count(*)::integer
  into v_inserted_count
  from inserted;

  return query select coalesce(v_inserted_count, 0);
end;
$$;

revoke all on function public.invite_group_to_event(uuid, uuid) from public;
grant execute on function public.invite_group_to_event(uuid, uuid) to authenticated;

commit;
