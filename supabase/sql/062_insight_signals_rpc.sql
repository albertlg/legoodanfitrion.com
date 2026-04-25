-- 062_insight_signals_rpc.sql
--
-- Feedback Loop Bidireccional: señales de dudas de invitados → Planificador IA
--
-- 1. Añade resolved_at a guest_ai_insights para marcar dudas como procesadas
-- 2. RPC compute_insight_signals: agrega intents no resueltos por evento
-- 3. RPC mark_insights_processed: marca todas las dudas pendientes como procesadas
--
-- Seguridad: ambas RPCs son SECURITY DEFINER y verifican que el caller
-- sea el host_user_id del evento antes de operar.

-- -----------------------------------------------------------------------
-- 1. COLUMNA resolved_at
-- -----------------------------------------------------------------------

ALTER TABLE public.guest_ai_insights
  ADD COLUMN IF NOT EXISTS resolved_at TIMESTAMPTZ;

COMMENT ON COLUMN public.guest_ai_insights.resolved_at IS
  'Timestamp en que el anfitrión regeneró el plan usando estas señales.
   NULL = duda pendiente, mostrar en el widget.
   NOT NULL = duda procesada, ocultar del widget.';

-- Índice parcial para acelerar las queries del widget (solo filas pendientes)
CREATE INDEX IF NOT EXISTS idx_guest_ai_insights_unresolved
  ON public.guest_ai_insights (event_id, created_at DESC)
  WHERE resolved_at IS NULL;

-- -----------------------------------------------------------------------
-- 2. RPC compute_insight_signals
--    Devuelve JSONB: {"menu": 5, "dress_code": 3, "location": 2}
--    Solo intents con al menos 1 aparición, ordenados por frecuencia DESC.
-- -----------------------------------------------------------------------

DROP FUNCTION IF EXISTS public.compute_insight_signals(UUID);

CREATE FUNCTION public.compute_insight_signals(p_event_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_host_user_id UUID;
  v_result       JSONB;
BEGIN
  -- Verificar que el caller es el host del evento
  SELECT host_user_id INTO v_host_user_id
  FROM public.events
  WHERE id = p_event_id;

  IF v_host_user_id IS NULL OR v_host_user_id <> auth.uid() THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  -- Agregar intents no resueltos
  SELECT COALESCE(
    jsonb_object_agg(detected_intent, cnt),
    '{}'::JSONB
  )
  INTO v_result
  FROM (
    SELECT detected_intent, COUNT(*) AS cnt
    FROM public.guest_ai_insights
    WHERE event_id = p_event_id
      AND resolved_at IS NULL
    GROUP BY detected_intent
    ORDER BY cnt DESC
  ) t;

  RETURN v_result;
END;
$$;

REVOKE ALL ON FUNCTION public.compute_insight_signals(UUID) FROM public;
GRANT EXECUTE ON FUNCTION public.compute_insight_signals(UUID) TO authenticated;

COMMENT ON FUNCTION public.compute_insight_signals(UUID) IS
  'Agrega las dudas no resueltas de los invitados para un evento dado.
   Solo accesible por el anfitrión del evento.
   Devuelve JSONB: {intent: count} ordenado por frecuencia.';

-- -----------------------------------------------------------------------
-- 3. RPC mark_insights_processed
--    Pone resolved_at = NOW() en todas las dudas pendientes del evento.
--    Devuelve el número de filas marcadas.
-- -----------------------------------------------------------------------

DROP FUNCTION IF EXISTS public.mark_insights_processed(UUID);

CREATE FUNCTION public.mark_insights_processed(p_event_id UUID)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_host_user_id UUID;
  v_count        INTEGER;
BEGIN
  -- Verificar que el caller es el host del evento
  SELECT host_user_id INTO v_host_user_id
  FROM public.events
  WHERE id = p_event_id;

  IF v_host_user_id IS NULL OR v_host_user_id <> auth.uid() THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  -- Marcar todas las dudas pendientes como procesadas
  UPDATE public.guest_ai_insights
  SET resolved_at = timezone('utc', now())
  WHERE event_id = p_event_id
    AND resolved_at IS NULL;

  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$$;

REVOKE ALL ON FUNCTION public.mark_insights_processed(UUID) FROM public;
GRANT EXECUTE ON FUNCTION public.mark_insights_processed(UUID) TO authenticated;

COMMENT ON FUNCTION public.mark_insights_processed(UUID) IS
  'Marca como procesadas todas las dudas de invitados pendientes de un evento.
   Se llama después de que el anfitrión regenere el plan usando las señales.
   Solo accesible por el anfitrión del evento.';
