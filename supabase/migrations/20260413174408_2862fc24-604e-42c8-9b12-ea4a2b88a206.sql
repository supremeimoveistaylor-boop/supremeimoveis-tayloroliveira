ALTER TABLE public.agent_status 
ADD COLUMN IF NOT EXISTS channel_status jsonb NOT NULL DEFAULT '{"whatsapp": true, "instagram": true, "webchat": true}'::jsonb;