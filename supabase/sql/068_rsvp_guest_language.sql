-- 068_rsvp_guest_language.sql
--
-- Registra el idioma del invitado en dos puntos clave:
--   1. invitations.response_note_language  → idioma activo al enviar el RSVP
--   2. guest_ai_insights.detected_language → idioma activo en cada interacción del chat
--
-- También actualiza las RPCs correspondientes para aceptar el nuevo parámetro.
-- Ambos campos son opcionales (DEFAULT NULL) → sin breaking changes en clientes legacy.

-- -----------------------------------------------------------------------
-- 1. Nuevas columnas
-- -----------------------------------------------------------------------

ALTER TABLE public.invitations
  ADD COLUMN IF NOT EXISTS response_note_language TEXT DEFAULT NULL;

COMMENT ON COLUMN public.invitations.response_note_language IS
  'Idioma activo en la UI del invitado cuando envió el formulario RSVP (ISO 639-1: es, ca, en, fr, it).';

ALTER TABLE public.guest_ai_insights
  ADD COLUMN IF NOT EXISTS detected_language TEXT DEFAULT NULL;

COMMENT ON COLUMN public.guest_ai_insights.detected_language IS
  'Idioma activo en la UI del invitado cuando hizo la pregunta al chat asistente (ISO 639-1: es, ca, en, fr, it).';

-- -----------------------------------------------------------------------
-- 2. Nueva versión de log_guest_ai_insight (4 parámetros, backward-compatible)
-- -----------------------------------------------------------------------

DROP FUNCTION IF EXISTS public.log_guest_ai_insight(text, text, text);

CREATE OR REPLACE FUNCTION public.log_guest_ai_insight(
  p_token             text,
  p_question          text,
  p_intent            text    DEFAULT 'unknown',
  p_detected_language text    DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_event_id uuid;
BEGIN
  SELECT i.event_id
    INTO v_event_id
  FROM public.invitations i
  JOIN public.events e
    ON e.id = i.event_id
   AND e.host_user_id = i.host_user_id
  WHERE i.public_token = p_token
    AND e.status <> 'cancelled'
  LIMIT 1;

  IF v_event_id IS NULL THEN
    RETURN;
  END IF;

  INSERT INTO public.guest_ai_insights (
    event_id, invitation_token, question, detected_intent, detected_language
  )
  VALUES (
    v_event_id,
    p_token,
    LEFT(TRIM(p_question), 500),
    COALESCE(NULLIF(TRIM(p_intent), ''), 'unknown'),
    NULLIF(TRIM(LOWER(COALESCE(p_detected_language, ''))), '')
  );
END;
$$;

REVOKE ALL ON FUNCTION public.log_guest_ai_insight(text, text, text, text) FROM public;
GRANT EXECUTE ON FUNCTION public.log_guest_ai_insight(text, text, text, text) TO anon, authenticated;

COMMENT ON FUNCTION public.log_guest_ai_insight(text, text, text, text) IS
  'Registra la pregunta de un invitado al asistente IA incluyendo el idioma activo en la UI.';

-- -----------------------------------------------------------------------
-- 3. Nueva versión de submit_rsvp_by_token (13 parámetros, backward-compatible)
--    Añade p_response_note_language a la versión de 12 params (065).
-- -----------------------------------------------------------------------

DROP FUNCTION IF EXISTS public.submit_rsvp_by_token(
  text, public.rsvp_status, text, text, boolean, text[], text[], text, boolean, text, text, timestamptz
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
  p_rsvp_arrival_at          timestamptz DEFAULT NULL,
  p_response_note_language   text        DEFAULT NULL
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
  rsvp_arrival_at            timestamptz,
  response_note_language     text
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
    response_note_language   = NULLIF(TRIM(LOWER(COALESCE(p_response_note_language, ''))), ''),
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
    i.rsvp_transport_mode, i.rsvp_arrival_at,
    i.response_note_language
  INTO
    invitation_id, event_id, status, responded_at,
    response_note, rsvp_plus_one, rsvp_dietary_needs,
    rsvp_interests, rsvp_group_tag,
    rsvp_needs_accommodation, rsvp_accommodation_note,
    rsvp_transport_mode, rsvp_arrival_at,
    response_note_language;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'invitation_not_available';
  END IF;

  RETURN NEXT;
END;
$$;

REVOKE ALL ON FUNCTION public.submit_rsvp_by_token(
  text, public.rsvp_status, text, text, boolean, text[], text[], text, boolean, text, text, timestamptz, text
) FROM public;

GRANT EXECUTE ON FUNCTION public.submit_rsvp_by_token(
  text, public.rsvp_status, text, text, boolean, text[], text[], text, boolean, text, text, timestamptz, text
) TO anon, authenticated;

COMMENT ON FUNCTION public.submit_rsvp_by_token(
  text, public.rsvp_status, text, text, boolean, text[], text[], text, boolean, text, text, timestamptz, text
) IS
  'Envía el RSVP de un invitado mediante su token público.
   Backward-compatible: todos los parámetros excepto p_token y p_status tienen DEFAULT NULL.
   Incluye p_response_note_language para registrar el idioma activo del invitado.';
