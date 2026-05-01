
CREATE TABLE IF NOT EXISTS public.whatsapp_welcome_sent (
  phone TEXT PRIMARY KEY,
  sent_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  conversation_id UUID,
  message_id TEXT
);

ALTER TABLE public.whatsapp_welcome_sent ENABLE ROW LEVEL SECURITY;

CREATE POLICY "service role only - welcome sent"
  ON public.whatsapp_welcome_sent
  FOR ALL
  USING (false)
  WITH CHECK (false);
