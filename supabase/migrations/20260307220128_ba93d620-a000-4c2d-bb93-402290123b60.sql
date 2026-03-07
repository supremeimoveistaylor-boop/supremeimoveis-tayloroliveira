
-- Tabela de rastreamento de eventos (Pixel Tracker interno)
CREATE TABLE IF NOT EXISTS public.event_tracking (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id text,
  session_id text,
  event_type text NOT NULL,
  page_url text,
  referrer text,
  ip_address text,
  device_type text,
  browser text,
  metadata jsonb DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.event_tracking ENABLE ROW LEVEL SECURITY;

-- Qualquer um pode inserir eventos (visitantes anônimos)
CREATE POLICY "Anyone can insert events" ON public.event_tracking
  FOR INSERT WITH CHECK (true);

-- Apenas admins podem visualizar eventos
CREATE POLICY "Admins can view events" ON public.event_tracking
  FOR SELECT USING (public.has_role(auth.uid(), 'admin'));

-- Índices para consultas no dashboard
CREATE INDEX idx_event_tracking_type ON public.event_tracking(event_type);
CREATE INDEX idx_event_tracking_created ON public.event_tracking(created_at);
CREATE INDEX idx_event_tracking_session ON public.event_tracking(session_id);
CREATE INDEX idx_event_tracking_user ON public.event_tracking(user_id);
