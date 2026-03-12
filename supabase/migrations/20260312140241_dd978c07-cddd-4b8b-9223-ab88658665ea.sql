
CREATE OR REPLACE FUNCTION public.archive_old_system_data()
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_cutoff_30 timestamptz := now() - interval '30 days';
  v_cutoff_60 timestamptz := now() - interval '60 days';
  v_cutoff_90 timestamptz := now() - interval '90 days';
  v_total_archived integer := 0;
  v_total_deleted integer := 0;
  v_tables_processed text[] := '{}';
  v_details jsonb := '{}';
  v_count integer;
  v_log_id uuid;
BEGIN
  -- ==========================================
  -- 1. CHAT MESSAGES (30 days)
  -- ==========================================
  INSERT INTO chat_messages_archive (id, lead_id, content, role, created_at)
  SELECT id, lead_id, content, role, created_at
  FROM chat_messages WHERE created_at < v_cutoff_30
  ON CONFLICT (id) DO NOTHING;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  v_total_archived := v_total_archived + v_count;

  DELETE FROM chat_messages WHERE created_at < v_cutoff_30;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  v_total_deleted := v_total_deleted + v_count;
  IF v_count > 0 THEN
    v_tables_processed := array_append(v_tables_processed, 'chat_messages');
    v_details := v_details || jsonb_build_object('chat_messages', v_count);
  END IF;

  -- ==========================================
  -- 2. CHAT SESSIONS (30 days)
  -- ==========================================
  INSERT INTO chat_sessions_archive (id, lead_id, attendant_id, status, started_at, finished_at, summary, whatsapp_sent, whatsapp_sent_at, created_at, updated_at)
  SELECT id, lead_id, attendant_id, status, started_at, finished_at, summary, whatsapp_sent, whatsapp_sent_at, created_at, updated_at
  FROM chat_sessions WHERE created_at < v_cutoff_30
  ON CONFLICT (id) DO NOTHING;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  v_total_archived := v_total_archived + v_count;

  DELETE FROM chat_sessions WHERE created_at < v_cutoff_30;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  v_total_deleted := v_total_deleted + v_count;
  IF v_count > 0 THEN
    v_tables_processed := array_append(v_tables_processed, 'chat_sessions');
    v_details := v_details || jsonb_build_object('chat_sessions', v_count);
  END IF;

  -- ==========================================
  -- 3. CHANNEL MESSAGES (30 days)
  -- ==========================================
  INSERT INTO channel_messages_archive (id, connection_id, user_id, direction, content, contact_phone, contact_name, contact_instagram_id, message_type, media_url, meta_message_id, meta_conversation_id, lead_id, template_id, status, error_message, created_at)
  SELECT id, connection_id, user_id, direction, content, contact_phone, contact_name, contact_instagram_id, message_type, media_url, meta_message_id, meta_conversation_id, lead_id, template_id, status, error_message, created_at
  FROM channel_messages WHERE created_at < v_cutoff_30
  ON CONFLICT (id) DO NOTHING;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  v_total_archived := v_total_archived + v_count;

  DELETE FROM channel_messages WHERE created_at < v_cutoff_30;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  v_total_deleted := v_total_deleted + v_count;
  IF v_count > 0 THEN
    v_tables_processed := array_append(v_tables_processed, 'channel_messages');
    v_details := v_details || jsonb_build_object('channel_messages', v_count);
  END IF;

  -- ==========================================
  -- 4. GENERAL CHAT MESSAGES (30 days)
  -- ==========================================
  INSERT INTO general_chat_messages_archive (id, user_id, user_name, message, created_at)
  SELECT id, user_id, user_name, message, created_at
  FROM general_chat_messages WHERE created_at < v_cutoff_30
  ON CONFLICT (id) DO NOTHING;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  v_total_archived := v_total_archived + v_count;

  DELETE FROM general_chat_messages WHERE created_at < v_cutoff_30;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  v_total_deleted := v_total_deleted + v_count;
  IF v_count > 0 THEN
    v_tables_processed := array_append(v_tables_processed, 'general_chat_messages');
    v_details := v_details || jsonb_build_object('general_chat_messages', v_count);
  END IF;

  -- ==========================================
  -- 5. OMNICHAT MESSAGES (60 days)
  -- ==========================================
  INSERT INTO omnichat_messages_archive (id, conversation_id, sender_type, channel, content, media_url, meta_message_id, status, created_at)
  SELECT id, conversation_id, sender_type, channel, content, media_url, meta_message_id, status, created_at
  FROM omnichat_messages WHERE created_at < v_cutoff_60
  ON CONFLICT (id) DO NOTHING;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  v_total_archived := v_total_archived + v_count;

  DELETE FROM omnichat_messages WHERE created_at < v_cutoff_60;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  v_total_deleted := v_total_deleted + v_count;
  IF v_count > 0 THEN
    v_tables_processed := array_append(v_tables_processed, 'omnichat_messages');
    v_details := v_details || jsonb_build_object('omnichat_messages', v_count);
  END IF;

  -- ==========================================
  -- 6. OMNICHAT CONVERSATIONS (60 days, closed/archived only)
  -- ==========================================
  INSERT INTO omnichat_conversations_archive (id, user_id, lead_id, channel, external_contact_id, contact_name, contact_phone, assigned_to, bot_active, status, last_message_at, last_message_preview, unread_count, connection_id, created_at, updated_at)
  SELECT id, user_id, lead_id, channel, external_contact_id, contact_name, contact_phone, assigned_to, bot_active, status, last_message_at, last_message_preview, unread_count, connection_id, created_at, updated_at
  FROM omnichat_conversations
  WHERE created_at < v_cutoff_60
    AND status IN ('closed', 'archived')
    AND NOT EXISTS (SELECT 1 FROM omnichat_messages om WHERE om.conversation_id = omnichat_conversations.id)
  ON CONFLICT (id) DO NOTHING;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  v_total_archived := v_total_archived + v_count;

  DELETE FROM omnichat_conversations
  WHERE created_at < v_cutoff_60
    AND status IN ('closed', 'archived')
    AND NOT EXISTS (SELECT 1 FROM omnichat_messages om WHERE om.conversation_id = omnichat_conversations.id);
  GET DIAGNOSTICS v_count = ROW_COUNT;
  v_total_deleted := v_total_deleted + v_count;
  IF v_count > 0 THEN
    v_tables_processed := array_append(v_tables_processed, 'omnichat_conversations');
    v_details := v_details || jsonb_build_object('omnichat_conversations', v_count);
  END IF;

  -- ==========================================
  -- 7. FOLLOWUP ALERTS (30 days)
  -- ==========================================
  INSERT INTO followup_alerts_archive (id, lead_id, alert_type, stage, channel, status, message_sent, whatsapp_message_id, metadata, created_at)
  SELECT id, lead_id, alert_type, stage, channel, status, message_sent, whatsapp_message_id, metadata, created_at
  FROM followup_alerts WHERE created_at < v_cutoff_30
  ON CONFLICT (id) DO NOTHING;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  v_total_archived := v_total_archived + v_count;

  DELETE FROM followup_alerts WHERE created_at < v_cutoff_30;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  v_total_deleted := v_total_deleted + v_count;
  IF v_count > 0 THEN
    v_tables_processed := array_append(v_tables_processed, 'followup_alerts');
    v_details := v_details || jsonb_build_object('followup_alerts', v_count);
  END IF;

  -- ==========================================
  -- 8. LEADS (90 days OR status fechado/arquivado/perdido/convertido)
  -- ==========================================
  INSERT INTO leads_archive (id, name, phone, email, status, origin, intent, page_url, property_id, broker_id, lead_score, score_breakdown, qualification, lead_temperature, lead_category, lead_segment, budget_range, message_count, conversion_count, first_conversion_at, last_conversion_at, last_interaction_at, last_agent_notification, visit_requested, visit_date, whatsapp_sent, whatsapp_sent_at, followup_stage, last_followup_at, nurturing_flow_status, created_at, updated_at)
  SELECT id, name, phone, email, status, origin, intent, page_url, property_id, broker_id, lead_score, score_breakdown, qualification, lead_temperature, lead_category, lead_segment, budget_range, message_count, conversion_count, first_conversion_at, last_conversion_at, last_interaction_at, last_agent_notification, visit_requested, visit_date, whatsapp_sent, whatsapp_sent_at, followup_stage, last_followup_at, nurturing_flow_status, created_at, updated_at
  FROM leads
  WHERE (
    (created_at < v_cutoff_90)
    OR (status IN ('arquivado', 'perdido', 'convertido', 'fechado') AND created_at < v_cutoff_30)
  )
    AND NOT EXISTS (SELECT 1 FROM chat_messages cm WHERE cm.lead_id = leads.id)
    AND NOT EXISTS (SELECT 1 FROM chat_sessions cs WHERE cs.lead_id = leads.id)
    AND NOT EXISTS (SELECT 1 FROM omnichat_conversations oc WHERE oc.lead_id = leads.id)
    AND NOT EXISTS (SELECT 1 FROM crm_cards cc WHERE cc.lead_id = leads.id)
  ON CONFLICT (id) DO NOTHING;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  v_total_archived := v_total_archived + v_count;

  DELETE FROM leads
  WHERE (
    (created_at < v_cutoff_90)
    OR (status IN ('arquivado', 'perdido', 'convertido', 'fechado') AND created_at < v_cutoff_30)
  )
    AND NOT EXISTS (SELECT 1 FROM chat_messages cm WHERE cm.lead_id = leads.id)
    AND NOT EXISTS (SELECT 1 FROM chat_sessions cs WHERE cs.lead_id = leads.id)
    AND NOT EXISTS (SELECT 1 FROM omnichat_conversations oc WHERE oc.lead_id = leads.id)
    AND NOT EXISTS (SELECT 1 FROM crm_cards cc WHERE cc.lead_id = leads.id);
  GET DIAGNOSTICS v_count = ROW_COUNT;
  v_total_deleted := v_total_deleted + v_count;
  IF v_count > 0 THEN
    v_tables_processed := array_append(v_tables_processed, 'leads');
    v_details := v_details || jsonb_build_object('leads', v_count);
  END IF;

  -- ==========================================
  -- 9. CRM EVENTS (90 days)
  -- ==========================================
  DELETE FROM crm_events WHERE created_at < v_cutoff_90;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  IF v_count > 0 THEN
    v_total_deleted := v_total_deleted + v_count;
    v_tables_processed := array_append(v_tables_processed, 'crm_events');
    v_details := v_details || jsonb_build_object('crm_events', v_count);
  END IF;

  -- ==========================================
  -- 10. EVENT TRACKING (60 days)
  -- ==========================================
  DELETE FROM event_tracking WHERE created_at < v_cutoff_60;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  IF v_count > 0 THEN
    v_total_deleted := v_total_deleted + v_count;
    v_tables_processed := array_append(v_tables_processed, 'event_tracking');
    v_details := v_details || jsonb_build_object('event_tracking', v_count);
  END IF;

  -- ==========================================
  -- LOG
  -- ==========================================
  INSERT INTO system_cleanup_logs (tables_processed, records_archived, records_deleted, status, details)
  VALUES (v_tables_processed, v_total_archived, v_total_deleted, 'success', v_details)
  RETURNING id INTO v_log_id;

  RETURN jsonb_build_object(
    'log_id', v_log_id,
    'total_archived', v_total_archived,
    'total_deleted', v_total_deleted,
    'tables_processed', v_tables_processed,
    'details', v_details
  );

EXCEPTION WHEN OTHERS THEN
  INSERT INTO system_cleanup_logs (tables_processed, records_archived, records_deleted, status, details)
  VALUES (v_tables_processed, v_total_archived, v_total_deleted, 'error', jsonb_build_object('error', SQLERRM));

  RETURN jsonb_build_object('status', 'error', 'message', SQLERRM);
END;
$function$;
