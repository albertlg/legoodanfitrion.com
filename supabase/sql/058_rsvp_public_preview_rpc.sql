-- 058_rsvp_public_preview_rpc.sql
--
-- GEO/SEO: expone campos mínimos a nivel de evento (sin PII del invitado)
-- para que el Edge Middleware pueda inyectar Open Graph, Twitter Cards y
-- JSON-LD Event cuando un bot/unfurler visita /rsvp/:token.
--
-- Diferencias respecto a public.get_invitation_public(text):
--   - NO devuelve guest_name ni response_note ni rsvp_status ni dietary_needs.
--   - Solo datos públicos del evento y del host.
--   - Sigue respetando expires_at para no leakear eventos caducados.

drop function if exists public.get_rsvp_preview(text);

create or replace function public.get_rsvp_preview(p_token text)
returns table (
  event_title text,
  event_start_at timestamptz,
  event_location_name text,
  event_location_address text,
  host_name text
)
language plpgsql
security definer
set search_path = public
as $$
begin
  return query
  select
    e.title,
    e.start_at,
    e.location_name,
    e.location_address,
    coalesce(p.full_name, 'Le Good Anfitrión')
  from public.invitations i
  join public.events e
    on e.id = i.event_id
   and e.host_user_id = i.host_user_id
  left join public.profiles p
    on p.id = i.host_user_id
  where i.public_token = p_token
    and (i.expires_at is null or i.expires_at > now())
  limit 1;
end;
$$;

revoke all on function public.get_rsvp_preview(text) from public;
grant execute on function public.get_rsvp_preview(text) to anon, authenticated;

comment on function public.get_rsvp_preview(text) is
  'Preview mínima y público-safe de un RSVP para inyección de Open Graph/Twitter Cards/JSON-LD Event desde middleware de borde. No expone identidad del invitado ni estado de respuesta.';
