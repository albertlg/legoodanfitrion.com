-- 065_accommodation_transport_modules.sql
-- Gap 7: Módulos de Alojamiento y Transporte
--
-- Cambios:
--   1. ADD COLUMN en invitations: rsvp_needs_accommodation, rsvp_accommodation_note,
--      rsvp_transport_mode, rsvp_arrival_at
--   2. Nueva versión de submit_rsvp_by_token (12 params, backward-compatible)
--   3. Nueva versión de get_invitation_public — restaura active_modules, modules_version,
--      invitee_email, invite_channel, token_scope (perdidos en 064) y añade los 4 campos nuevos
-- -----------------------------------------------------------------------

-- -----------------------------------------------------------------------
-- 1. NUEVAS COLUMNAS EN invitations
-- -----------------------------------------------------------------------

ALTER TABLE public.invitations
  ADD COLUMN IF NOT EXISTS rsvp_needs_accommodation BOOLEAN DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS rsvp_accommodation_note  TEXT,
  ADD COLUMN IF NOT EXISTS rsvp_transport_mode      TEXT,
  ADD COLUMN IF NOT EXISTS rsvp_arrival_at          TIMESTAMPTZ;

COMMENT ON COLUMN public.invitations.rsvp_needs_accommodation IS
  'El invitado indica si necesita alojamiento para el evento.';
COMMENT ON COLUMN public.invitations.rsvp_accommodation_note IS
  'Nota libre del invitado sobre su necesidad de alojamiento.';
COMMENT ON COLUMN public.invitations.rsvp_transport_mode IS
  'Cómo planea llegar el invitado: own_car, shared_car, public_transport, flight, other.';
COMMENT ON COLUMN public.invitations.rsvp_arrival_at IS
  'Fecha/hora estimada de llegada indicada por el invitado.';

-- -----------------------------------------------------------------------
-- 2. NUEVA VERSIÓN DE submit_rsvp_by_token (12 params)
--    Elimina la versión de 8 params (064) y crea la de 12.
-- -----------------------------------------------------------------------

DROP FUNCTION IF EXISTS public.submit_rsvp_by_token(
  text, public.rsvp_status, text, text, boolean, text[], text[], text
);

CREATE FUNCTION public.submit_rsvp_by_token(
  p_token                    text,
  p_status                   public.rsvp_status,
  p_response_note            text        DEFAULT NULL,
  p_guest_display_name       text        DEFAULT NULL,
  p_rsvp_plus_one            boolean     DEFAULT NULL,
  p_rsvp_dietary_needs       text[]      DEFAULT NULL,
  p_rsvp_interests           text[]      DEFAULT NULL,
  p_rsvp_group_tag           text        DEFAULT NULL,
  p_rsvp_needs_accommodation boolean     DEFAULT NULL,
  p_rsvp_accommodation_note  text        DEFAULT NULL,
  p_rsvp_transport_mode      text        DEFAULT NULL,
  p_rsvp_arrival_at          timestamptz DEFAULT NULL
)
RETURNS TABLE (
  invitation_id              uuid,
  event_id                   uuid,
  status                     public.rsvp_status,
  responded_at               timestamptz,
  response_note              text,
  rsvp_plus_one              boolean,
  rsvp_dietary_needs         text[],
  rsvp_interests             text[],
  rsvp_group_tag             text,
  rsvp_needs_accommodation   boolean,
  rsvp_accommodation_note    text,
  rsvp_transport_mode        text,
  rsvp_arrival_at            timestamptz
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
    rsvp_interests     = CASE
                           WHEN p_rsvp_interests IS NOT NULL THEN p_rsvp_interests
                           ELSE i.rsvp_interests
                         END,
    rsvp_group_tag     = CASE
                           WHEN p_rsvp_group_tag IS NOT NULL
                           THEN NULLIF(TRIM(p_rsvp_group_tag), '')
                           ELSE i.rsvp_group_tag
                         END,
    rsvp_needs_accommodation = CASE
                                 WHEN p_rsvp_needs_accommodation IS NOT NULL THEN p_rsvp_needs_accommodation
                                 ELSE i.rsvp_needs_accommodation
                               END,
    rsvp_accommodation_note  = CASE
                                 WHEN p_rsvp_accommodation_note IS NOT NULL
                                 THEN NULLIF(TRIM(p_rsvp_accommodation_note), '')
                                 ELSE i.rsvp_accommodation_note
                               END,
    rsvp_transport_mode      = CASE
                                 WHEN p_rsvp_transport_mode IS NOT NULL
                                 THEN NULLIF(TRIM(p_rsvp_transport_mode), '')
                                 ELSE i.rsvp_transport_mode
                               END,
    rsvp_arrival_at          = CASE
                                 WHEN p_rsvp_arrival_at IS NOT NULL THEN p_rsvp_arrival_at
                                 ELSE i.rsvp_arrival_at
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
    i.rsvp_interests, i.rsvp_group_tag,
    i.rsvp_needs_accommodation, i.rsvp_accommodation_note,
    i.rsvp_transport_mode, i.rsvp_arrival_at
  INTO
    invitation_id, event_id, status, responded_at,
    response_note, rsvp_plus_one, rsvp_dietary_needs,
    rsvp_interests, rsvp_group_tag,
    rsvp_needs_accommodation, rsvp_accommodation_note,
    rsvp_transport_mode, rsvp_arrival_at;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'invitation_not_available';
  END IF;

  RETURN NEXT;
END;
$$;

REVOKE ALL ON FUNCTION public.submit_rsvp_by_token(
  text, public.rsvp_status, text, text, boolean, text[], text[], text,
  boolean, text, text, timestamptz
) FROM public;

GRANT EXECUTE ON FUNCTION public.submit_rsvp_by_token(
  text, public.rsvp_status, text, text, boolean, text[], text[], text,
  boolean, text, text, timestamptz
) TO anon, authenticated;

COMMENT ON FUNCTION public.submit_rsvp_by_token(
  text, public.rsvp_status, text, text, boolean, text[], text[], text,
  boolean, text, text, timestamptz
) IS 'Envía o actualiza el RSVP de un invitado. Versión 065: añade alojamiento y transporte.';

-- -----------------------------------------------------------------------
-- 3. ACTUALIZAR get_invitation_public
--    Restaura active_modules, modules_version, invitee_email, invite_channel,
--    token_scope (perdidos en 064) y añade los 4 campos de alojamiento/transporte.
-- -----------------------------------------------------------------------

DROP FUNCTION IF EXISTS public.get_invitation_public(text);

CREATE FUNCTION public.get_invitation_public(p_token text)
RETURNS TABLE (
  invitation_id           uuid,
  event_id                uuid,
  event_title             text,
  event_start_at          timestamptz,
  event_end_at            timestamptz,
  schedule_mode           public.event_schedule_mode,
  poll_status             public.event_poll_status,
  allow_plus_one          boolean,
  photo_gallery_url       text,
  guest_name              text,
  rsvp_status             public.rsvp_status,
  expires_at              timestamptz,
  event_location_name     text,
  event_location_address  text,
  host_name               text,
  response_note           text,
  rsvp_plus_one           boolean,
  rsvp_dietary_needs      text[],
  rsvp_interests          text[],
  rsvp_group_tag          text,
  rsvp_needs_accommodation  boolean,
  rsvp_accommodation_note   text,
  rsvp_transport_mode       text,
  rsvp_arrival_at           timestamptz,
  invitee_email           text,
  invite_channel          text,
  token_scope             text,
  active_modules          jsonb,
  modules_version         integer
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
    i.rsvp_group_tag,
    i.rsvp_needs_accommodation,
    i.rsvp_accommodation_note,
    i.rsvp_transport_mode,
    i.rsvp_arrival_at,
    i.invitee_email,
    i.invite_channel,
    CASE
      WHEN LOWER(COALESCE(i.invite_channel, '')) IN ('email','sms','phone','whatsapp','individual','direct')
      THEN 'invitation_individual'
      ELSE 'event_public'
    END,
    COALESCE(e.active_modules, '{}'::jsonb),
    COALESCE(e.modules_version, 1)
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
  'Retorna los datos públicos de una invitación por token. Versión 065: restaura active_modules, invitee_email, token_scope (perdidos en 064) y añade alojamiento/transporte.';
