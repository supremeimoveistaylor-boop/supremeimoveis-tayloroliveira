
-- =====================================================
-- PERFORMANCE INDEXES for Supreme Imóveis
-- Using CONCURRENTLY-safe approach (regular CREATE INDEX)
-- =====================================================

-- leads table indexes
CREATE INDEX IF NOT EXISTS idx_leads_status ON public.leads (status);
CREATE INDEX IF NOT EXISTS idx_leads_created_at ON public.leads (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_leads_phone ON public.leads (phone);
CREATE INDEX IF NOT EXISTS idx_leads_broker_id ON public.leads (broker_id);
CREATE INDEX IF NOT EXISTS idx_leads_last_interaction ON public.leads (last_interaction_at DESC);

-- chat_messages indexes
CREATE INDEX IF NOT EXISTS idx_chat_messages_lead_id ON public.chat_messages (lead_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_created_at ON public.chat_messages (created_at DESC);

-- omnichat_conversations indexes
CREATE INDEX IF NOT EXISTS idx_omnichat_conv_user_id ON public.omnichat_conversations (user_id);
CREATE INDEX IF NOT EXISTS idx_omnichat_conv_last_msg ON public.omnichat_conversations (last_message_at DESC);
CREATE INDEX IF NOT EXISTS idx_omnichat_conv_channel ON public.omnichat_conversations (channel);
CREATE INDEX IF NOT EXISTS idx_omnichat_conv_status ON public.omnichat_conversations (status);

-- omnichat_messages indexes
CREATE INDEX IF NOT EXISTS idx_omnichat_msg_conv_id ON public.omnichat_messages (conversation_id);
CREATE INDEX IF NOT EXISTS idx_omnichat_msg_created ON public.omnichat_messages (created_at ASC);

-- crm_cards indexes
CREATE INDEX IF NOT EXISTS idx_crm_cards_coluna ON public.crm_cards (coluna);
CREATE INDEX IF NOT EXISTS idx_crm_cards_lead_id ON public.crm_cards (lead_id);
CREATE INDEX IF NOT EXISTS idx_crm_cards_classificacao ON public.crm_cards (classificacao);
CREATE INDEX IF NOT EXISTS idx_crm_cards_created_at ON public.crm_cards (created_at);

-- properties indexes
CREATE INDEX IF NOT EXISTS idx_properties_status ON public.properties (status);
CREATE INDEX IF NOT EXISTS idx_properties_purpose ON public.properties (purpose);
CREATE INDEX IF NOT EXISTS idx_properties_featured ON public.properties (featured);
CREATE INDEX IF NOT EXISTS idx_properties_user_id ON public.properties (user_id);
CREATE INDEX IF NOT EXISTS idx_properties_created_at ON public.properties (created_at DESC);

-- chat_sessions indexes
CREATE INDEX IF NOT EXISTS idx_chat_sessions_lead_id ON public.chat_sessions (lead_id);
CREATE INDEX IF NOT EXISTS idx_chat_sessions_status ON public.chat_sessions (status);

-- crm_events indexes
CREATE INDEX IF NOT EXISTS idx_crm_events_card_id ON public.crm_events (card_id);
CREATE INDEX IF NOT EXISTS idx_crm_events_created_at ON public.crm_events (created_at DESC);

-- followup_alerts indexes
CREATE INDEX IF NOT EXISTS idx_followup_alerts_lead_id ON public.followup_alerts (lead_id);
