-- Tabela para registrar cada notificação de lead enviada ao corretor
CREATE TABLE IF NOT EXISTS public.broker_lead_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id UUID REFERENCES public.leads(id) ON DELETE SET NULL,
  broker_phone TEXT NOT NULL,
  lead_name TEXT NOT NULL,
  lead_phone TEXT NOT NULL,
  lead_interest TEXT,
  origin TEXT,
  whatsapp_message_id TEXT,
  status TEXT NOT NULL DEFAULT 'sent',
  error_message TEXT,
  sent_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_broker_lead_notifications_sent_at ON public.broker_lead_notifications(sent_at DESC);
CREATE INDEX IF NOT EXISTS idx_broker_lead_notifications_lead_id ON public.broker_lead_notifications(lead_id);

ALTER TABLE public.broker_lead_notifications ENABLE ROW LEVEL SECURITY;

-- Apenas admins podem visualizar
CREATE POLICY "Admins can view broker notifications"
  ON public.broker_lead_notifications
  FOR SELECT
  TO authenticated
  USING (public.is_admin(auth.uid()) OR public.is_super_admin(auth.uid()));

-- Apenas admins podem deletar
CREATE POLICY "Admins can delete broker notifications"
  ON public.broker_lead_notifications
  FOR DELETE
  TO authenticated
  USING (public.is_admin(auth.uid()));

-- Apenas service_role pode inserir (edge functions)
CREATE POLICY "Service role can insert broker notifications"
  ON public.broker_lead_notifications
  FOR INSERT
  TO service_role
  WITH CHECK (true);