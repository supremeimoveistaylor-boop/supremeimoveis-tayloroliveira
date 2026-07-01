
-- 1. Archive tables: replace public-role "Service can manage archive" with service_role-only policy
DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'chat_messages_archive','chat_sessions_archive','channel_messages_archive',
    'omnichat_messages_archive','omnichat_conversations_archive','followup_alerts_archive',
    'leads_archive','general_chat_messages_archive'
  ] LOOP
    EXECUTE format('DROP POLICY IF EXISTS "Service can manage archive" ON public.%I', t);
    EXECUTE format($p$CREATE POLICY "Service role can manage archive" ON public.%I AS PERMISSIVE FOR ALL TO service_role USING (true) WITH CHECK (true)$p$, t);
  END LOOP;
END $$;

-- 2. chat_conversions: restrict SELECT to admins
DROP POLICY IF EXISTS "Authenticated users can read chat conversions" ON public.chat_conversions;
CREATE POLICY "Admins can read chat conversions" ON public.chat_conversions
  FOR SELECT TO authenticated USING (has_role(auth.uid(), 'admin'::user_role));

-- 3. chat_sessions: drop public read/update USING(true) policies
DROP POLICY IF EXISTS "Public can read own session" ON public.chat_sessions;
DROP POLICY IF EXISTS "Public can update chat sessions" ON public.chat_sessions;
CREATE POLICY "Service role can manage chat sessions" ON public.chat_sessions
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- 4. crm_cards: replace public-role update with service_role scoped
DROP POLICY IF EXISTS "Service can update crm_cards" ON public.crm_cards;
DROP POLICY IF EXISTS "Service can insert crm_cards" ON public.crm_cards;
CREATE POLICY "Service role can manage crm_cards" ON public.crm_cards
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- 5. omnichat_conversations & omnichat_messages: scope service policies to service_role
DROP POLICY IF EXISTS "Service can manage conversations" ON public.omnichat_conversations;
CREATE POLICY "Service role can manage conversations" ON public.omnichat_conversations
  FOR ALL TO service_role USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Service can manage messages" ON public.omnichat_messages;
CREATE POLICY "Service role can manage messages" ON public.omnichat_messages
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- 6. properties: add is_public filter to public view policy
DROP POLICY IF EXISTS "Anyone can view active properties" ON public.properties;
CREATE POLICY "Anyone can view active public properties" ON public.properties
  FOR SELECT TO anon, authenticated
  USING (status = 'active' AND is_public = true);

-- 7. broker_lead_notifications: ensure explicit deny for public/anon INSERT by adding restrictive policy
-- (Table already has no public INSERT policy; make it explicit by ensuring RLS is enabled)
ALTER TABLE public.broker_lead_notifications ENABLE ROW LEVEL SECURITY;

-- 8. Realtime broadcast messages: enable RLS with default deny (postgres_changes on published tables continues to enforce underlying table RLS)
ALTER TABLE realtime.messages ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Authenticated users can receive broadcasts" ON realtime.messages;
CREATE POLICY "Authenticated users can receive broadcasts" ON realtime.messages
  FOR SELECT TO authenticated USING (false);

-- 9. SECURITY DEFINER function exposure: revoke EXECUTE from anon/authenticated on all public functions,
-- then grant back only the ones needed as RPCs from the admin panel.
REVOKE EXECUTE ON ALL FUNCTIONS IN SCHEMA public FROM anon, authenticated, PUBLIC;
-- Re-grant RPCs used from authenticated admin UI
GRANT EXECUTE ON FUNCTION public.finish_chat_session(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.cascade_delete_lead(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.assign_lead_to_broker(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.register_chat_conversion(uuid, text, text, jsonb) TO authenticated;
GRANT EXECUTE ON FUNCTION public.calculate_lead_score(uuid) TO authenticated;
