
CREATE INDEX IF NOT EXISTS idx_leads_phone ON public.leads(phone) WHERE phone IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_leads_status ON public.leads(status);
CREATE INDEX IF NOT EXISTS idx_leads_created_at ON public.leads(created_at);
CREATE INDEX IF NOT EXISTS idx_omnichat_conversations_external_contact ON public.omnichat_conversations(external_contact_id);
CREATE INDEX IF NOT EXISTS idx_omnichat_conversations_lead_id ON public.omnichat_conversations(lead_id) WHERE lead_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_omnichat_conversations_channel ON public.omnichat_conversations(channel, user_id);
CREATE INDEX IF NOT EXISTS idx_omnichat_messages_conversation ON public.omnichat_messages(conversation_id, created_at);
CREATE INDEX IF NOT EXISTS idx_crm_cards_lead_id ON public.crm_cards(lead_id) WHERE lead_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_channel_messages_instagram_id ON public.channel_messages(contact_instagram_id) WHERE contact_instagram_id IS NOT NULL;
