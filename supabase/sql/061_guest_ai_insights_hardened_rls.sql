-- 061_guest_ai_insights_hardened_rls.sql
--
-- SEGURIDAD: Endurecimiento de RLS en guest_ai_insights.
--
-- PROBLEMA: La política guest_ai_insights_anon_insert del migration 060
-- permite que cualquier anon inserte directamente en la tabla con cualquier
-- event_id que conozca — sin validar el token de invitación.
--
-- SOLUCIÓN: Eliminar el acceso INSERT directo para anon/authenticated.
-- La única vía de inserción legítima es via la RPC log_guest_ai_insight,
-- que es SECURITY DEFINER y valida el token antes de insertar.
--
-- RLS final en guest_ai_insights:
--   INSERT → solo a través de RPC log_guest_ai_insight (security definer, bypassa RLS)
--   SELECT → solo el host del evento (auth.uid() = events.host_user_id)
--   DELETE → solo el host del evento (permite limpiar datos desde el dashboard)
--   UPDATE → nadie (las insights son inmutables)

-- 1. Eliminar política de INSERT directo (era demasiado permisiva)
drop policy if exists guest_ai_insights_anon_insert on public.guest_ai_insights;

-- 2. Añadir política DELETE para que el anfitrión pueda limpiar insights
drop policy if exists guest_ai_insights_host_delete on public.guest_ai_insights;
create policy guest_ai_insights_host_delete
  on public.guest_ai_insights for delete
  using (
    exists (
      select 1
      from public.events e
      where e.id = guest_ai_insights.event_id
        and e.host_user_id = auth.uid()
    )
  );

-- 3. La política SELECT existente es correcta — no se toca:
--    guest_ai_insights_host_select: events.host_user_id = auth.uid()

-- 4. Verificar que la RPC está correctamente marcada como SECURITY DEFINER
--    (ya lo era en 060, pero lo dejamos documentado aquí)
comment on function public.log_guest_ai_insight(text, text, text) is
  'Única vía de inserción en guest_ai_insights para invitados anónimos.
   Valida el token antes de insertar — el acceso INSERT directo a la tabla está bloqueado.
   SECURITY DEFINER: bypassa RLS para poder insertar desde contexto anon.';
