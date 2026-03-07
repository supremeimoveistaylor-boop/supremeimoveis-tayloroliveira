
-- =============================================
-- SISTEMA DE ARQUIVAMENTO INTELIGENTE
-- =============================================

-- 1. TABELA DE LOGS DE LIMPEZA
CREATE TABLE IF NOT EXISTS public.system_cleanup_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  executed_at timestamptz NOT NULL DEFAULT now(),
  tables_processed text[] DEFAULT '{}',
  records_archived integer DEFAULT 0,
  records_deleted integer DEFAULT 0,
  status text DEFAULT 'success',
  details jsonb DEFAULT '{}'
);

ALTER TABLE public.system_cleanup_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view cleanup logs" ON public.system_cleanup_logs
  FOR SELECT USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Service can insert cleanup logs" ON public.system_cleanup_logs
  FOR INSERT WITH CHECK (true);

-- 2. TABELAS DE ARQUIVO (mesma estrutura das originais)

-- chat_messages_archive
CREATE TABLE IF NOT EXISTS public.chat_messages_archive (
  id uuid PRIMARY KEY,
  lead_id uuid NOT NULL,
  content text NOT NULL,
  role text NOT NULL,
  created_at timestamptz NOT NULL,
  archived_at timestamptz NOT NULL DEFAULT now()
);

-- chat_sessions_archive
CREATE TABLE IF NOT EXISTS public.chat_sessions_archive (
  id uuid PRIMARY KEY,
  lead_id uuid NOT NULL,
  attendant_id uuid,
  status text NOT NULL,
  started_at timestamptz NOT NULL,
  finished_at timestamptz,
  summary text,
  whatsapp_sent boolean,
  whatsapp_sent_at timestamptz,
  created_at timestamptz NOT NULL,
  updated_at timestamptz NOT NULL,
  archived_at timestamptz NOT NULL DEFAULT now()
);

-- channel_messages_archive
CREATE TABLE IF NOT EXISTS public.channel_messages_archive (
  id uuid PRIMARY KEY,
  connection_id uuid NOT NULL,
  user_id uuid NOT NULL,
  direction text NOT NULL,
  content text,
  contact_phone text,
  contact_name text,
  contact_instagram_id text,
  message_type text,
  media_url text,
  meta_message_id text,
  meta_conversation_id text,
  lead_id uuid,
  template_id uuid,
  status text,
  error_message text,
  created_at timestamptz NOT NULL,
  archived_at timestamptz NOT NULL DEFAULT now()
);

-- general_chat_messages_archive
CREATE TABLE IF NOT EXISTS public.general_chat_messages_archive (
  id uuid PRIMARY KEY,
  user_id uuid NOT NULL,
  user_name text NOT NULL,
  message text NOT NULL,
  created_at timestamptz NOT NULL,
  archived_at timestamptz NOT NULL DEFAULT now()
);

-- omnichat_messages_archive
CREATE TABLE IF NOT EXISTS public.omnichat_messages_archive (
  id uuid PRIMARY KEY,
  conversation_id uuid NOT NULL,
  sender_type text NOT NULL,
  channel text NOT NULL,
  content text,
  media_url text,
  meta_message_id text,
  status text,
  created_at timestamptz NOT NULL,
  archived_at timestamptz NOT NULL DEFAULT now()
);

-- omnichat_conversations_archive
CREATE TABLE IF NOT EXISTS public.omnichat_conversations_archive (
  id uuid PRIMARY KEY,
  user_id uuid NOT NULL,
  lead_id uuid,
  channel text NOT NULL,
  external_contact_id text NOT NULL,
  contact_name text,
  contact_phone text,
  assigned_to uuid,
  bot_active boolean,
  status text NOT NULL,
  last_message_at timestamptz,
  last_message_preview text,
  unread_count integer,
  connection_id uuid,
  created_at timestamptz NOT NULL,
  updated_at timestamptz NOT NULL,
  archived_at timestamptz NOT NULL DEFAULT now()
);

-- leads_archive
CREATE TABLE IF NOT EXISTS public.leads_archive (
  id uuid PRIMARY KEY,
  name text,
  phone text,
  email text,
  status text NOT NULL,
  origin text,
  intent text,
  page_url text,
  property_id uuid,
  broker_id uuid,
  lead_score integer,
  score_breakdown jsonb,
  qualification text,
  lead_temperature text,
  lead_category text,
  lead_segment text,
  budget_range text,
  message_count integer,
  conversion_count integer,
  first_conversion_at timestamptz,
  last_conversion_at timestamptz,
  last_interaction_at timestamptz,
  last_agent_notification timestamptz,
  visit_requested boolean,
  visit_date timestamptz,
  whatsapp_sent boolean,
  whatsapp_sent_at timestamptz,
  followup_stage integer,
  last_followup_at timestamptz,
  nurturing_flow_status text,
  created_at timestamptz NOT NULL,
  updated_at timestamptz NOT NULL,
  archived_at timestamptz NOT NULL DEFAULT now()
);

-- followup_alerts_archive
CREATE TABLE IF NOT EXISTS public.followup_alerts_archive (
  id uuid PRIMARY KEY,
  lead_id uuid,
  alert_type text NOT NULL,
  stage integer NOT NULL,
  channel text,
  status text,
  message_sent text,
  whatsapp_message_id text,
  metadata jsonb,
  created_at timestamptz NOT NULL,
  archived_at timestamptz NOT NULL DEFAULT now()
);

-- RLS para tabelas de arquivo (somente leitura para admins)
ALTER TABLE public.chat_messages_archive ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_sessions_archive ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.channel_messages_archive ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.general_chat_messages_archive ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.omnichat_messages_archive ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.omnichat_conversations_archive ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.leads_archive ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.followup_alerts_archive ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view archive" ON public.chat_messages_archive FOR SELECT USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Service can manage archive" ON public.chat_messages_archive FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Admins can view archive" ON public.chat_sessions_archive FOR SELECT USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Service can manage archive" ON public.chat_sessions_archive FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Admins can view archive" ON public.channel_messages_archive FOR SELECT USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Service can manage archive" ON public.channel_messages_archive FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Admins can view archive" ON public.general_chat_messages_archive FOR SELECT USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Service can manage archive" ON public.general_chat_messages_archive FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Admins can view archive" ON public.omnichat_messages_archive FOR SELECT USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Service can manage archive" ON public.omnichat_messages_archive FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Admins can view archive" ON public.omnichat_conversations_archive FOR SELECT USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Service can manage archive" ON public.omnichat_conversations_archive FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Admins can view archive" ON public.leads_archive FOR SELECT USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Service can manage archive" ON public.leads_archive FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Admins can view archive" ON public.followup_alerts_archive FOR SELECT USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Service can manage archive" ON public.followup_alerts_archive FOR ALL USING (true) WITH CHECK (true);

-- 3. ÍNDICES NAS TABELAS DE ARQUIVO
CREATE INDEX idx_chat_messages_archive_created ON public.chat_messages_archive(created_at);
CREATE INDEX idx_chat_messages_archive_lead ON public.chat_messages_archive(lead_id);
CREATE INDEX idx_chat_sessions_archive_created ON public.chat_sessions_archive(created_at);
CREATE INDEX idx_omnichat_messages_archive_conv ON public.omnichat_messages_archive(conversation_id);
CREATE INDEX idx_omnichat_conversations_archive_user ON public.omnichat_conversations_archive(user_id);
CREATE INDEX idx_leads_archive_created ON public.leads_archive(created_at);
CREATE INDEX idx_leads_archive_status ON public.leads_archive(status);
CREATE INDEX idx_followup_alerts_archive_lead ON public.followup_alerts_archive(lead_id);

-- 4. FUNÇÃO DE ARQUIVAMENTO INTELIGENTE
CREATE OR REPLACE FUNCTION public.archive_old_system_data()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_cutoff timestamptz := now() - interval '30 days';
  v_total_archived integer := 0;
  v_total_deleted integer := 0;
  v_tables_processed text[] := '{}';
  v_details jsonb := '{}';
  v_count integer;
  v_log_id uuid;
BEGIN
  -- ==========================================
  -- 1. CHAT MESSAGES (respects FK: delete first)
  -- ==========================================
  INSERT INTO chat_messages_archive (id, lead_id, content, role, created_at)
  SELECT id, lead_id, content, role, created_at
  FROM chat_messages WHERE created_at < v_cutoff
  ON CONFLICT (id) DO NOTHING;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  v_total_archived := v_total_archived + v_count;

  DELETE FROM chat_messages WHERE created_at < v_cutoff;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  v_total_deleted := v_total_deleted + v_count;
  IF v_count > 0 THEN
    v_tables_processed := array_append(v_tables_processed, 'chat_messages');
    v_details := v_details || jsonb_build_object('chat_messages', v_count);
  END IF;

  -- ==========================================
  -- 2. CHAT SESSIONS
  -- ==========================================
  INSERT INTO chat_sessions_archive (id, lead_id, attendant_id, status, started_at, finished_at, summary, whatsapp_sent, whatsapp_sent_at, created_at, updated_at)
  SELECT id, lead_id, attendant_id, status, started_at, finished_at, summary, whatsapp_sent, whatsapp_sent_at, created_at, updated_at
  FROM chat_sessions WHERE created_at < v_cutoff
  ON CONFLICT (id) DO NOTHING;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  v_total_archived := v_total_archived + v_count;

  DELETE FROM chat_sessions WHERE created_at < v_cutoff;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  v_total_deleted := v_total_deleted + v_count;
  IF v_count > 0 THEN
    v_tables_processed := array_append(v_tables_processed, 'chat_sessions');
    v_details := v_details || jsonb_build_object('chat_sessions', v_count);
  END IF;

  -- ==========================================
  -- 3. CHANNEL MESSAGES
  -- ==========================================
  INSERT INTO channel_messages_archive (id, connection_id, user_id, direction, content, contact_phone, contact_name, contact_instagram_id, message_type, media_url, meta_message_id, meta_conversation_id, lead_id, template_id, status, error_message, created_at)
  SELECT id, connection_id, user_id, direction, content, contact_phone, contact_name, contact_instagram_id, message_type, media_url, meta_message_id, meta_conversation_id, lead_id, template_id, status, error_message, created_at
  FROM channel_messages WHERE created_at < v_cutoff
  ON CONFLICT (id) DO NOTHING;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  v_total_archived := v_total_archived + v_count;

  DELETE FROM channel_messages WHERE created_at < v_cutoff;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  v_total_deleted := v_total_deleted + v_count;
  IF v_count > 0 THEN
    v_tables_processed := array_append(v_tables_processed, 'channel_messages');
    v_details := v_details || jsonb_build_object('channel_messages', v_count);
  END IF;

  -- ==========================================
  -- 4. GENERAL CHAT MESSAGES
  -- ==========================================
  INSERT INTO general_chat_messages_archive (id, user_id, user_name, message, created_at)
  SELECT id, user_id, user_name, message, created_at
  FROM general_chat_messages WHERE created_at < v_cutoff
  ON CONFLICT (id) DO NOTHING;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  v_total_archived := v_total_archived + v_count;

  DELETE FROM general_chat_messages WHERE created_at < v_cutoff;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  v_total_deleted := v_total_deleted + v_count;
  IF v_count > 0 THEN
    v_tables_processed := array_append(v_tables_processed, 'general_chat_messages');
    v_details := v_details || jsonb_build_object('general_chat_messages', v_count);
  END IF;

  -- ==========================================
  -- 5. OMNICHAT MESSAGES (archive before conversations due to FK)
  -- ==========================================
  INSERT INTO omnichat_messages_archive (id, conversation_id, sender_type, channel, content, media_url, meta_message_id, status, created_at)
  SELECT id, conversation_id, sender_type, channel, content, media_url, meta_message_id, status, created_at
  FROM omnichat_messages WHERE created_at < v_cutoff
  ON CONFLICT (id) DO NOTHING;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  v_total_archived := v_total_archived + v_count;

  DELETE FROM omnichat_messages WHERE created_at < v_cutoff;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  v_total_deleted := v_total_deleted + v_count;
  IF v_count > 0 THEN
    v_tables_processed := array_append(v_tables_processed, 'omnichat_messages');
    v_details := v_details || jsonb_build_object('omnichat_messages', v_count);
  END IF;

  -- ==========================================
  -- 6. OMNICHAT CONVERSATIONS (only closed/archived ones older than 30d)
  -- ==========================================
  INSERT INTO omnichat_conversations_archive (id, user_id, lead_id, channel, external_contact_id, contact_name, contact_phone, assigned_to, bot_active, status, last_message_at, last_message_preview, unread_count, connection_id, created_at, updated_at)
  SELECT id, user_id, lead_id, channel, external_contact_id, contact_name, contact_phone, assigned_to, bot_active, status, last_message_at, last_message_preview, unread_count, connection_id, created_at, updated_at
  FROM omnichat_conversations
  WHERE created_at < v_cutoff
    AND status IN ('closed', 'archived')
    AND NOT EXISTS (SELECT 1 FROM omnichat_messages om WHERE om.conversation_id = omnichat_conversations.id)
  ON CONFLICT (id) DO NOTHING;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  v_total_archived := v_total_archived + v_count;

  DELETE FROM omnichat_conversations
  WHERE created_at < v_cutoff
    AND status IN ('closed', 'archived')
    AND NOT EXISTS (SELECT 1 FROM omnichat_messages om WHERE om.conversation_id = omnichat_conversations.id);
  GET DIAGNOSTICS v_count = ROW_COUNT;
  v_total_deleted := v_total_deleted + v_count;
  IF v_count > 0 THEN
    v_tables_processed := array_append(v_tables_processed, 'omnichat_conversations');
    v_details := v_details || jsonb_build_object('omnichat_conversations', v_count);
  END IF;

  -- ==========================================
  -- 7. FOLLOWUP ALERTS
  -- ==========================================
  INSERT INTO followup_alerts_archive (id, lead_id, alert_type, stage, channel, status, message_sent, whatsapp_message_id, metadata, created_at)
  SELECT id, lead_id, alert_type, stage, channel, status, message_sent, whatsapp_message_id, metadata, created_at
  FROM followup_alerts WHERE created_at < v_cutoff
  ON CONFLICT (id) DO NOTHING;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  v_total_archived := v_total_archived + v_count;

  DELETE FROM followup_alerts WHERE created_at < v_cutoff;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  v_total_deleted := v_total_deleted + v_count;
  IF v_count > 0 THEN
    v_tables_processed := array_append(v_tables_processed, 'followup_alerts');
    v_details := v_details || jsonb_build_object('followup_alerts', v_count);
  END IF;

  -- ==========================================
  -- 8. LEADS (only archived/closed leads older than 30d with no active references)
  -- ==========================================
  INSERT INTO leads_archive (id, name, phone, email, status, origin, intent, page_url, property_id, broker_id, lead_score, score_breakdown, qualification, lead_temperature, lead_category, lead_segment, budget_range, message_count, conversion_count, first_conversion_at, last_conversion_at, last_interaction_at, last_agent_notification, visit_requested, visit_date, whatsapp_sent, whatsapp_sent_at, followup_stage, last_followup_at, nurturing_flow_status, created_at, updated_at)
  SELECT id, name, phone, email, status, origin, intent, page_url, property_id, broker_id, lead_score, score_breakdown, qualification, lead_temperature, lead_category, lead_segment, budget_range, message_count, conversion_count, first_conversion_at, last_conversion_at, last_interaction_at, last_agent_notification, visit_requested, visit_date, whatsapp_sent, whatsapp_sent_at, followup_stage, last_followup_at, nurturing_flow_status, created_at, updated_at
  FROM leads
  WHERE created_at < v_cutoff
    AND status IN ('arquivado', 'perdido', 'convertido')
    AND NOT EXISTS (SELECT 1 FROM chat_messages cm WHERE cm.lead_id = leads.id)
    AND NOT EXISTS (SELECT 1 FROM chat_sessions cs WHERE cs.lead_id = leads.id)
    AND NOT EXISTS (SELECT 1 FROM omnichat_conversations oc WHERE oc.lead_id = leads.id)
    AND NOT EXISTS (SELECT 1 FROM crm_cards cc WHERE cc.lead_id = leads.id)
  ON CONFLICT (id) DO NOTHING;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  v_total_archived := v_total_archived + v_count;

  DELETE FROM leads
  WHERE created_at < v_cutoff
    AND status IN ('arquivado', 'perdido', 'convertido')
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
  -- LOG DA EXECUÇÃO
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
$$;

-- 5. AGENDAR CRON (03:00 todos os dias)
SELECT cron.schedule(
  'archive-old-system-data',
  '0 3 * * *',
  $$SELECT public.archive_old_system_data();$$
);
