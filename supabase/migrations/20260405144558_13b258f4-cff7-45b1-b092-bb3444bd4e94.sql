
-- Function to auto-cleanup stale CRM cards (no activity for 7 days)
CREATE OR REPLACE FUNCTION public.auto_cleanup_stale_crm_cards()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_card RECORD;
  v_deleted INT := 0;
  v_errors INT := 0;
  v_cutoff TIMESTAMP WITH TIME ZONE := now() - INTERVAL '7 days';
BEGIN
  FOR v_card IN
    SELECT id, lead_id, titulo, coluna, last_interaction_at, updated_at
    FROM crm_cards
    WHERE COALESCE(last_interaction_at, updated_at, created_at) < v_cutoff
  LOOP
    BEGIN
      -- If card has linked lead, cascade delete
      IF v_card.lead_id IS NOT NULL THEN
        PERFORM cascade_delete_lead(v_card.lead_id);
      END IF;

      -- Delete the card (may already be gone from cascade)
      DELETE FROM crm_cards WHERE id = v_card.id;

      -- Log the cleanup
      INSERT INTO security_logs (action, table_name, record_id, metadata)
      VALUES (
        'auto_cleanup_stale_card',
        'crm_cards',
        v_card.id::text,
        jsonb_build_object(
          'titulo', v_card.titulo,
          'coluna', v_card.coluna,
          'last_activity', COALESCE(v_card.last_interaction_at, v_card.updated_at)::text,
          'cutoff', v_cutoff::text
        )
      );

      v_deleted := v_deleted + 1;
    EXCEPTION WHEN OTHERS THEN
      v_errors := v_errors + 1;
    END;
  END LOOP;

  RETURN jsonb_build_object('deleted', v_deleted, 'errors', v_errors, 'cutoff', v_cutoff);
END;
$$;

-- Schedule daily at 04:00 UTC
SELECT cron.schedule(
  'cleanup-stale-crm-cards',
  '0 4 * * *',
  $$SELECT public.auto_cleanup_stale_crm_cards()$$
);
