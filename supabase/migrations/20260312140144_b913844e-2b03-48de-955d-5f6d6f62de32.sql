
-- =============================================
-- PERFORMANCE INDEXES FOR KEY TABLES
-- =============================================

-- LEADS table indexes
CREATE INDEX IF NOT EXISTS idx_leads_phone ON public.leads (phone) WHERE phone IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_leads_status ON public.leads (status);
CREATE INDEX IF NOT EXISTS idx_leads_created_at ON public.leads (created_at);
CREATE INDEX IF NOT EXISTS idx_leads_origin ON public.leads (origin) WHERE origin IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_leads_lead_score ON public.leads (lead_score DESC) WHERE lead_score > 0;
CREATE INDEX IF NOT EXISTS idx_leads_last_interaction ON public.leads (last_interaction_at DESC) WHERE last_interaction_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_leads_broker_id ON public.leads (broker_id) WHERE broker_id IS NOT NULL;

-- OMNICHAT CONVERSATIONS indexes
CREATE INDEX IF NOT EXISTS idx_omnichat_conv_external_contact ON public.omnichat_conversations (external_contact_id);
CREATE INDEX IF NOT EXISTS idx_omnichat_conv_status ON public.omnichat_conversations (status);
CREATE INDEX IF NOT EXISTS idx_omnichat_conv_last_message ON public.omnichat_conversations (last_message_at DESC);
CREATE INDEX IF NOT EXISTS idx_omnichat_conv_channel ON public.omnichat_conversations (channel);
CREATE INDEX IF NOT EXISTS idx_omnichat_conv_user_status ON public.omnichat_conversations (user_id, status);

-- OMNICHAT MESSAGES indexes
CREATE INDEX IF NOT EXISTS idx_omnichat_msg_conversation ON public.omnichat_messages (conversation_id, created_at DESC);

-- CRM CARDS indexes
CREATE INDEX IF NOT EXISTS idx_crm_cards_coluna ON public.crm_cards (coluna);
CREATE INDEX IF NOT EXISTS idx_crm_cards_lead_id ON public.crm_cards (lead_id) WHERE lead_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_crm_cards_classificacao ON public.crm_cards (classificacao);

-- CHAT MESSAGES indexes
CREATE INDEX IF NOT EXISTS idx_chat_messages_lead_created ON public.chat_messages (lead_id, created_at DESC);

-- CHANNEL MESSAGES indexes
CREATE INDEX IF NOT EXISTS idx_channel_messages_contact_phone ON public.channel_messages (contact_phone) WHERE contact_phone IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_channel_messages_contact_ig ON public.channel_messages (contact_instagram_id) WHERE contact_instagram_id IS NOT NULL;

-- CRM EVENTS indexes
CREATE INDEX IF NOT EXISTS idx_crm_events_card_id ON public.crm_events (card_id) WHERE card_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_crm_events_created ON public.crm_events (created_at DESC);
