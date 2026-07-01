
-- =========================================================
-- 1) general_chat_messages: restrict SELECT to admins only
-- =========================================================
DROP POLICY IF EXISTS "Only authenticated users can view chat messages" ON public.general_chat_messages;
CREATE POLICY "Admins can view chat messages"
  ON public.general_chat_messages
  FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin'));

-- =========================================================
-- 2) Drop redundant service_role ALL/INSERT policies with `true`
--    (service_role has BYPASSRLS, so these policies are no-ops)
-- =========================================================
DROP POLICY IF EXISTS "Service role can insert broker notifications" ON public.broker_lead_notifications;
DROP POLICY IF EXISTS "Service role can manage archive" ON public.channel_messages_archive;
DROP POLICY IF EXISTS "Service role can insert chat conversions" ON public.chat_conversions;
DROP POLICY IF EXISTS "Service role can insert metrics" ON public.chat_flow_metrics;
DROP POLICY IF EXISTS "Service role can manage archive" ON public.chat_messages_archive;
DROP POLICY IF EXISTS "Service role can manage chat sessions" ON public.chat_sessions;
DROP POLICY IF EXISTS "Service role can manage archive" ON public.chat_sessions_archive;
DROP POLICY IF EXISTS "Service role can manage crm_cards" ON public.crm_cards;
DROP POLICY IF EXISTS "Service can insert crm_events" ON public.crm_events;
DROP POLICY IF EXISTS "Service can insert followup_alerts" ON public.followup_alerts;
DROP POLICY IF EXISTS "Service role can manage archive" ON public.followup_alerts_archive;
DROP POLICY IF EXISTS "Service role can manage archive" ON public.general_chat_messages_archive;
DROP POLICY IF EXISTS "Service role can manage archive" ON public.leads_archive;
DROP POLICY IF EXISTS "Service role can manage conversations" ON public.omnichat_conversations;
DROP POLICY IF EXISTS "Service role can manage archive" ON public.omnichat_conversations_archive;
DROP POLICY IF EXISTS "Service role can manage messages" ON public.omnichat_messages;
DROP POLICY IF EXISTS "Service role can manage archive" ON public.omnichat_messages_archive;
DROP POLICY IF EXISTS "Service can insert property_campaigns" ON public.property_campaigns;
DROP POLICY IF EXISTS "Service role can insert storage cleanup logs" ON public.storage_cleanup_logs;
DROP POLICY IF EXISTS "Service can insert cleanup logs" ON public.system_cleanup_logs;

-- =========================================================
-- 3) Replace public INSERT `WITH CHECK (true)` with explicit role check
-- =========================================================
DROP POLICY IF EXISTS "Anyone can insert captacoes" ON public.captacao_imoveis;
CREATE POLICY "Anyone can insert captacoes"
  ON public.captacao_imoveis FOR INSERT
  TO anon, authenticated
  WITH CHECK (auth.role() IN ('anon', 'authenticated'));

DROP POLICY IF EXISTS "Anyone can insert chat messages" ON public.chat_messages;
CREATE POLICY "Anyone can insert chat messages"
  ON public.chat_messages FOR INSERT
  TO anon, authenticated
  WITH CHECK (auth.role() IN ('anon', 'authenticated'));

DROP POLICY IF EXISTS "Public can insert chat sessions" ON public.chat_sessions;
CREATE POLICY "Public can insert chat sessions"
  ON public.chat_sessions FOR INSERT
  TO anon, authenticated
  WITH CHECK (auth.role() IN ('anon', 'authenticated'));

DROP POLICY IF EXISTS "Anyone can insert events" ON public.event_tracking;
CREATE POLICY "Anyone can insert events"
  ON public.event_tracking FOR INSERT
  TO anon, authenticated
  WITH CHECK (auth.role() IN ('anon', 'authenticated'));

DROP POLICY IF EXISTS "Public can insert leads" ON public.leads;
CREATE POLICY "Public can insert leads"
  ON public.leads FOR INSERT
  TO anon, authenticated
  WITH CHECK (auth.role() IN ('anon', 'authenticated'));

DROP POLICY IF EXISTS "Public can insert leads_imobiliarios" ON public.leads_imobiliarios;
CREATE POLICY "Public can insert leads_imobiliarios"
  ON public.leads_imobiliarios FOR INSERT
  TO anon, authenticated
  WITH CHECK (auth.role() IN ('anon', 'authenticated'));

-- =========================================================
-- 4) Revoke EXECUTE from authenticated on sensitive SECURITY DEFINER functions
--    These are only invoked from edge functions (service_role) going forward.
-- =========================================================
REVOKE EXECUTE ON FUNCTION public.assign_lead_to_broker(uuid, uuid) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.calculate_lead_score(uuid) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.cascade_delete_lead(uuid) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.finish_chat_session(uuid, text) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.register_chat_conversion(uuid, text, text, jsonb) FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION public.assign_lead_to_broker(uuid, uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.calculate_lead_score(uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.cascade_delete_lead(uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.finish_chat_session(uuid, text) TO service_role;
GRANT EXECUTE ON FUNCTION public.register_chat_conversion(uuid, text, text, jsonb) TO service_role;
