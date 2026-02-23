
-- Omnichat Conversations table
CREATE TABLE public.omnichat_conversations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL, -- tenant owner
  lead_id UUID REFERENCES public.leads(id),
  channel TEXT NOT NULL CHECK (channel IN ('whatsapp', 'instagram')),
  external_contact_id TEXT NOT NULL, -- phone or instagram ID
  contact_name TEXT,
  contact_phone TEXT,
  assigned_to UUID, -- agent user_id
  bot_active BOOLEAN NOT NULL DEFAULT true,
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'closed', 'waiting')),
  last_message_at TIMESTAMPTZ DEFAULT now(),
  last_message_preview TEXT,
  unread_count INTEGER NOT NULL DEFAULT 0,
  connection_id UUID REFERENCES public.meta_channel_connections(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Unique constraint per tenant+channel+contact
CREATE UNIQUE INDEX idx_omnichat_conv_unique ON public.omnichat_conversations(user_id, channel, external_contact_id);
CREATE INDEX idx_omnichat_conv_user ON public.omnichat_conversations(user_id, status);
CREATE INDEX idx_omnichat_conv_last_msg ON public.omnichat_conversations(last_message_at DESC);

ALTER TABLE public.omnichat_conversations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owner can view conversations" ON public.omnichat_conversations
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Owner can update conversations" ON public.omnichat_conversations
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Owner can insert conversations" ON public.omnichat_conversations
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Super admin can view all conversations" ON public.omnichat_conversations
  FOR SELECT USING (EXISTS (SELECT 1 FROM user_roles WHERE user_roles.user_id = auth.uid() AND role = 'super_admin'));

CREATE POLICY "Service can manage conversations" ON public.omnichat_conversations
  FOR ALL USING (true) WITH CHECK (true);

-- Omnichat Messages table
CREATE TABLE public.omnichat_messages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  conversation_id UUID NOT NULL REFERENCES public.omnichat_conversations(id) ON DELETE CASCADE,
  sender_type TEXT NOT NULL CHECK (sender_type IN ('client', 'agent', 'bot')),
  channel TEXT NOT NULL,
  content TEXT,
  media_url TEXT,
  meta_message_id TEXT,
  status TEXT DEFAULT 'sent',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_omnichat_msg_conv ON public.omnichat_messages(conversation_id, created_at);

ALTER TABLE public.omnichat_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owner can view messages via conversation" ON public.omnichat_messages
  FOR SELECT USING (EXISTS (
    SELECT 1 FROM omnichat_conversations c WHERE c.id = conversation_id AND c.user_id = auth.uid()
  ));

CREATE POLICY "Owner can insert messages" ON public.omnichat_messages
  FOR INSERT WITH CHECK (EXISTS (
    SELECT 1 FROM omnichat_conversations c WHERE c.id = conversation_id AND c.user_id = auth.uid()
  ));

CREATE POLICY "Super admin can view all messages" ON public.omnichat_messages
  FOR SELECT USING (EXISTS (SELECT 1 FROM user_roles WHERE user_roles.user_id = auth.uid() AND role = 'super_admin'));

CREATE POLICY "Service can manage messages" ON public.omnichat_messages
  FOR ALL USING (true) WITH CHECK (true);

-- Agent Status table
CREATE TABLE public.agent_status (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE,
  status TEXT NOT NULL DEFAULT 'offline' CHECK (status IN ('online', 'offline')),
  last_seen TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.agent_status ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own status" ON public.agent_status
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Super admin can view all status" ON public.agent_status
  FOR SELECT USING (EXISTS (SELECT 1 FROM user_roles WHERE user_roles.user_id = auth.uid() AND role = 'super_admin'));

CREATE POLICY "Service can read status" ON public.agent_status
  FOR SELECT USING (true);

-- Trigger to update updated_at
CREATE TRIGGER update_omnichat_conversations_updated_at
  BEFORE UPDATE ON public.omnichat_conversations
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_agent_status_updated_at
  BEFORE UPDATE ON public.agent_status
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Enable realtime for conversations and messages
ALTER PUBLICATION supabase_realtime ADD TABLE public.omnichat_conversations;
ALTER PUBLICATION supabase_realtime ADD TABLE public.omnichat_messages;
ALTER PUBLICATION supabase_realtime ADD TABLE public.agent_status;
