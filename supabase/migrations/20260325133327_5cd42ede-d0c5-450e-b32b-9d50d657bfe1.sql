-- 1. Add DELETE policy on leads for admins
CREATE POLICY "Admins can delete leads"
ON public.leads
FOR DELETE
TO public
USING (has_role(auth.uid(), 'admin'::user_role));

-- 2. Add DELETE policy on omnichat_conversations for admins
CREATE POLICY "Admins can delete conversations"
ON public.omnichat_conversations
FOR DELETE
TO public
USING (has_role(auth.uid(), 'admin'::user_role));

-- 3. Add DELETE policy on omnichat_messages for admins
CREATE POLICY "Admins can delete messages"
ON public.omnichat_messages
FOR DELETE
TO public
USING (has_role(auth.uid(), 'admin'::user_role));

-- 4. Add DELETE policy on chat_messages for admins
CREATE POLICY "Admins can delete chat messages"
ON public.chat_messages
FOR DELETE
TO public
USING (has_role(auth.uid(), 'admin'::user_role));

-- 5. Add DELETE policy on chat_sessions for admins
CREATE POLICY "Admins can delete chat sessions"
ON public.chat_sessions
FOR DELETE
TO public
USING (has_role(auth.uid(), 'admin'::user_role));

-- 6. Add DELETE policy on followup_alerts for admins
CREATE POLICY "Admins can delete followup_alerts"
ON public.followup_alerts
FOR DELETE
TO public
USING (has_role(auth.uid(), 'admin'::user_role));

-- 7. Add DELETE policy on chat_conversions for admins
CREATE POLICY "Admins can delete chat_conversions"
ON public.chat_conversions
FOR DELETE
TO public
USING (has_role(auth.uid(), 'admin'::user_role));

-- 8. Create cascade delete function for leads
CREATE OR REPLACE FUNCTION public.cascade_delete_lead(p_lead_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_deleted jsonb := '{}';
  v_count integer;
  v_lead record;
BEGIN
  SELECT id, name, phone, email INTO v_lead FROM leads WHERE id = p_lead_id;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('status', 'error', 'message', 'Lead not found');
  END IF;

  DELETE FROM followup_alerts WHERE lead_id = p_lead_id;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  v_deleted := v_deleted || jsonb_build_object('followup_alerts', v_count);

  DELETE FROM chat_conversions WHERE lead_id = p_lead_id;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  v_deleted := v_deleted || jsonb_build_object('chat_conversions', v_count);

  DELETE FROM chat_flow_metrics WHERE lead_id = p_lead_id;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  v_deleted := v_deleted || jsonb_build_object('chat_flow_metrics', v_count);

  DELETE FROM chat_messages WHERE lead_id = p_lead_id;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  v_deleted := v_deleted || jsonb_build_object('chat_messages', v_count);

  DELETE FROM chat_sessions WHERE lead_id = p_lead_id;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  v_deleted := v_deleted || jsonb_build_object('chat_sessions', v_count);

  DELETE FROM omnichat_messages WHERE conversation_id IN (
    SELECT id FROM omnichat_conversations WHERE lead_id = p_lead_id
  );
  GET DIAGNOSTICS v_count = ROW_COUNT;
  v_deleted := v_deleted || jsonb_build_object('omnichat_messages', v_count);

  DELETE FROM omnichat_conversations WHERE lead_id = p_lead_id;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  v_deleted := v_deleted || jsonb_build_object('omnichat_conversations', v_count);

  DELETE FROM channel_messages WHERE lead_id = p_lead_id;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  v_deleted := v_deleted || jsonb_build_object('channel_messages', v_count);

  DELETE FROM crm_events WHERE lead_id = p_lead_id;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  v_deleted := v_deleted || jsonb_build_object('crm_events', v_count);

  DELETE FROM crm_cards WHERE lead_id = p_lead_id;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  v_deleted := v_deleted || jsonb_build_object('crm_cards', v_count);

  DELETE FROM captacao_imoveis WHERE lead_id = p_lead_id;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  v_deleted := v_deleted || jsonb_build_object('captacao_imoveis', v_count);

  DELETE FROM leads WHERE id = p_lead_id;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  v_deleted := v_deleted || jsonb_build_object('leads', v_count);

  INSERT INTO security_logs (user_id, action, table_name, record_id, metadata)
  VALUES (
    auth.uid(),
    'CASCADE_DELETE_LEAD',
    'leads',
    p_lead_id::text,
    jsonb_build_object(
      'lead_name', v_lead.name,
      'lead_phone', v_lead.phone,
      'deleted_records', v_deleted
    )
  );

  RETURN jsonb_build_object('status', 'success', 'deleted', v_deleted);
END;
$$;

-- 9. Add DELETE policy on chat_flow_metrics for admins
CREATE POLICY "Admins can delete chat_flow_metrics"
ON public.chat_flow_metrics
FOR DELETE
TO public
USING (has_role(auth.uid(), 'admin'::user_role));

-- 10. Add DELETE policy on channel_messages for admins
CREATE POLICY "Admins can delete channel_messages"
ON public.channel_messages
FOR DELETE
TO public
USING (has_role(auth.uid(), 'admin'::user_role));