-- 064_rsvp_interests_and_groups.sql
--
-- Gap 6: Intereses y Grupos de Amistad en el RSVP
--
-- Permite que cada invitado declare sus intereses (música, cocina, viajes…)
-- y su "tribu" (grupo del que viene: amigos del pádel, compañeros de trabajo…).
-- Estos datos alimentan el Planificador IA y el Icebreaker para generar
-- dinámicas basadas en afinidades reales entre los asistentes.
--
-- Cambios:
--   1. ADD COLUMN rsvp_interests TEXT[]  en invitations
--   2. ADD COLUMN rsvp_group_tag  TEXT   en invitations
--   3. Reemplaza submit_rsvp_by_token con firma extendida (backward-compatible:
--      los dos nuevos params son DEFAULT NULL, los clientes legacy no se rompen)
-- -----------------------------------------------------------------------

-- -----------------------------------------------------------------------
-- 1. NUEVAS COLUMNAS
-- -----------------------------------------------------------------------

ALTER TABLE public.invitations
  ADD COLUMN IF NOT EXISTS rsvp_interests TEXT[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS rsvp_group_tag  TEXT;

COMMENT ON COLUMN public.invitations.rsvp_interests IS
  'Intereses del invitado declarados en el RSVP. Array abierto de tags normalizados
   en minúsculas (ej: ["música","cocina","viajes"]). Vacío si no se declaran.
   Alimenta el planificador IA y el icebreaker para dinámicas de afinidad.';

COMMENT ON COLUMN public.invitations.rsvp_group_tag IS
  'Etiqueta de grupo del invitado, en texto libre (ej: "Amigos del pádel",
   "Compañeros de trabajo", "Familia de Ana"). Opcional. Permite al anfitrión
   ver de dónde conoce a cada persona y a la IA mezclar grupos distintos.';

-- Índice parcial para queries de afinidad por evento
-- (buscar invitados de un evento que comparten un interés concreto)
CREATE INDEX IF NOT EXISTS idx_invitations_interests_gin
  ON public.invitations USING GIN (rsvp_interests)
  WHERE array_length(rsvp_interests, 1) > 0;

-- -----------------------------------------------------------------------
-- 2. NUEVA VERSIÓN DE submit_rsvp_by_token
--    Firma extendida: añade p_rsvp_interests y p_rsvp_group_tag.
--    Los valores NULL se ignoran (COALESCE) → clientes legacy compatibles.
-- -----------------------------------------------------------------------

-- Elimina la versión anterior (firma exacta usada en migración 040)
DROP FUNCTION IF EXISTS public.submit_rsvp_by_token(
  text, public.rsvp_status, text, text, boolean, text[]
);

CREATE FUNCTION public.submit_rsvp_by_token(
  p_token               text,
  p_status              public.rsvp_status,
  p_response_note       text    DEFAULT NULL,
  p_guest_display_name  text    DEFAULT NULL,
  p_rsvp_plus_one       boolean DEFAULT NULL,
  p_rsvp_dietary_needs  text[]  DEFAULT NULL,
  p_rsvp_interests      text[]  DEFAULT NULL,
  p_rsvp_group_tag      text    DEFAULT NULL
)
RETURNS TABLE (
  invitation_id      uuid,
  event_id           uuid,
  status             public.rsvp_status,
  responded_at       timestamptz,
  response_note      text,
  rsvp_plus_one      boolean,
  rsvp_dietary_needs text[],
  rsvp_interests     text[],
  rsvp_group_tag     text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF p_status = 'pending' THEN
    RAISE EXCEPTION 'RSVP status cannot be pending';
  END IF;

  UPDATE public.invitations i
  SET
    status             = p_status,
    response_note      = NULLIF(TRIM(COALESCE(p_response_note, '')), ''),
    guest_display_name = NULLIF(TRIM(COALESCE(p_guest_display_name, '')), ''),
    rsvp_plus_one      = COALESCE(p_rsvp_plus_one, i.rsvp_plus_one, false),
    rsvp_dietary_needs = COALESCE(p_rsvp_dietary_needs, i.rsvp_dietary_needs, '{}'::text[]),
    -- Para intereses: NULL significa "no enviado" → conserva valor existente.
    -- Array vacío '{}' significa "el usuario borró sus intereses" → guarda vacío.
    rsvp_interests     = CASE
                           WHEN p_rsvp_interests IS NOT NULL THEN p_rsvp_interests
                           ELSE i.rsvp_interests
                         END,
    -- Para grupo: NULL → conserva; string vacío → borra.
    rsvp_group_tag     = CASE
                           WHEN p_rsvp_group_tag IS NOT NULL
                           THEN NULLIF(TRIM(p_rsvp_group_tag), '')
                           ELSE i.rsvp_group_tag
                         END,
    responded_at       = NOW(),
    updated_at         = NOW()
  FROM public.events e
  WHERE i.public_token = p_token
    AND e.id           = i.event_id
    AND e.host_user_id = i.host_user_id
    AND e.status       <> 'cancelled'
    AND (
      COALESCE(e.end_at, e.start_at) IS NULL
      OR COALESCE(e.end_at, e.start_at) >= NOW()
    )
  RETURNING
    i.id, i.event_id, i.status, i.responded_at,
    i.response_note, i.rsvp_plus_one, i.rsvp_dietary_needs,
    i.rsvp_interests, i.rsvp_group_tag
  INTO
    invitation_id, event_id, status, responded_at,
    response_note, rsvp_plus_one, rsvp_dietary_needs,
    rsvp_interests, rsvp_group_tag;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'invitation_not_available';
  END IF;

  RETURN NEXT;
END;
$$;

REVOKE ALL ON FUNCTION public.submit_rsvp_by_token(
  text, public.rsvp_status, text, text, boolean, text[], text[], text
) FROM public;

GRANT EXECUTE ON FUNCTION public.submit_rsvp_by_token(
  text, public.rsvp_status, text, text, boolean, text[], text[], text
) TO anon, authenticated;

COMMENT ON FUNCTION public.submit_rsvp_by_token(
  text, public.rsvp_status, text, text, boolean, text[], text[], text
) IS
  'Envía el RSVP de un invitado mediante su token público.
   Backward-compatible: p_rsvp_interests y p_rsvp_group_tag son opcionales.
   Devuelve el estado completo de la invitación incluyendo los nuevos campos.';

-- -----------------------------------------------------------------------
-- 3. ACTUALIZAR get_invitation_public
--    Añade rsvp_interests y rsvp_group_tag al RETURNS TABLE para que la
--    pantalla pública pueda pre-poblar los nuevos campos en visitas repetidas.
-- -----------------------------------------------------------------------

-- DROP necesario porque cambiamos el tipo de retorno
DROP FUNCTION IF EXISTS public.get_invitation_public(text);

CREATE FUNCTION public.get_invitation_public(p_token text)
RETURNS TABLE (
  invitation_id         uuid,
  event_id              uuid,
  event_title           text,
  event_start_at        timestamptz,
  event_end_at          timestamptz,
  schedule_mode         public.event_schedule_mode,
  poll_status           public.event_poll_status,
  allow_plus_one        boolean,
  photo_gallery_url     text,
  guest_name            text,
  rsvp_status           public.rsvp_status,
  expires_at            timestamptz,
  event_location_name   text,
  event_location_address text,
  host_name             text,
  response_note         text,
  rsvp_plus_one         boolean,
  rsvp_dietary_needs    text[],
  rsvp_interests        text[],
  rsvp_group_tag        text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT
    i.id,
    i.event_id,
    e.title,
    e.start_at,
    e.end_at,
    e.schedule_mode,
    e.poll_status,
    e.allow_plus_one,
    e.photo_gallery_url,
    COALESCE(i.guest_display_name, TRIM(g.first_name || ' ' || COALESCE(g.last_name, ''))),
    i.status,
    i.expires_at,
    e.location_name,
    e.location_address,
    COALESCE(p.full_name, 'LeGoodAnfitrión'),
    i.response_note,
    i.rsvp_plus_one,
    COALESCE(i.rsvp_dietary_needs, '{}'::text[]),
    COALESCE(i.rsvp_interests,     '{}'::text[]),
    i.rsvp_group_tag
  FROM public.invitations i
  JOIN public.events e
    ON e.id = i.event_id
   AND e.host_user_id = i.host_user_id
  JOIN public.guests g
    ON g.id = i.guest_id
   AND g.host_user_id = i.host_user_id
  LEFT JOIN public.profiles p
    ON p.id = i.host_user_id
  WHERE i.public_token = p_token
    AND e.status <> 'cancelled'
  LIMIT 1;
END;
$$;

REVOKE ALL ON FUNCTION public.get_invitation_public(text) FROM public;
GRANT EXECUTE ON FUNCTION public.get_invitation_public(text) TO anon, authenticated;

COMMENT ON FUNCTION public.get_invitation_public(text) IS
  'Devuelve los datos públicos de una invitación por token.
   Incluye rsvp_interests y rsvp_group_tag para pre-poblar el formulario RSVP
   en visitas repetidas del invitado.';
