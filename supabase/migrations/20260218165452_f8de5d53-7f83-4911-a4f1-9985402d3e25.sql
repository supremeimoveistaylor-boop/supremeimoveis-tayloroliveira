
-- =============================================
-- CRM CARDS TABLE (replaces localStorage Kanban)
-- =============================================
CREATE TABLE public.crm_cards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id UUID REFERENCES public.leads(id) ON DELETE SET NULL,
  titulo TEXT NOT NULL,
  cliente TEXT NOT NULL,
  telefone TEXT,
  email TEXT,
  coluna TEXT NOT NULL DEFAULT 'leads',
  origem_lead TEXT,
  responsavel TEXT,
  valor_estimado NUMERIC DEFAULT 0,
  lead_score INTEGER DEFAULT 0,
  classificacao TEXT DEFAULT 'frio',
  probabilidade_fechamento INTEGER DEFAULT 0,
  prioridade TEXT DEFAULT 'normal',
  notas TEXT,
  proximo_agendamento TIMESTAMPTZ,
  ultimo_followup_at TIMESTAMPTZ,
  proxima_acao TEXT,
  historico JSONB DEFAULT '[]',
  ai_summary TEXT,
  ai_last_analysis_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_interaction_at TIMESTAMPTZ DEFAULT now()
);

-- =============================================
-- CRM EVENTS TABLE (event sourcing for AI)
-- =============================================
CREATE TABLE public.crm_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  card_id UUID REFERENCES public.crm_cards(id) ON DELETE CASCADE,
  lead_id UUID REFERENCES public.leads(id) ON DELETE SET NULL,
  event_type TEXT NOT NULL,
  old_value TEXT,
  new_value TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- =============================================
-- ROW LEVEL SECURITY
-- =============================================
ALTER TABLE public.crm_cards ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.crm_events ENABLE ROW LEVEL SECURITY;

-- Only admin users can access CRM data
CREATE POLICY "Admins can manage crm_cards"
  ON public.crm_cards FOR ALL
  USING (has_role(auth.uid(), 'admin'::user_role));

CREATE POLICY "Admins can manage crm_events"
  ON public.crm_events FOR ALL
  USING (has_role(auth.uid(), 'admin'::user_role));

-- Service role (edge functions) can insert/update cards
CREATE POLICY "Service can insert crm_cards"
  ON public.crm_cards FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Service can update crm_cards"
  ON public.crm_cards FOR UPDATE
  USING (true);

CREATE POLICY "Service can insert crm_events"
  ON public.crm_events FOR INSERT
  WITH CHECK (true);

-- =============================================
-- INDEXES
-- =============================================
CREATE INDEX idx_crm_cards_coluna ON public.crm_cards(coluna);
CREATE INDEX idx_crm_cards_lead_id ON public.crm_cards(lead_id);
CREATE INDEX idx_crm_cards_classificacao ON public.crm_cards(classificacao);
CREATE INDEX idx_crm_cards_prioridade ON public.crm_cards(prioridade);
CREATE INDEX idx_crm_cards_last_interaction ON public.crm_cards(last_interaction_at);
CREATE INDEX idx_crm_events_card_id ON public.crm_events(card_id);
CREATE INDEX idx_crm_events_event_type ON public.crm_events(event_type);
CREATE INDEX idx_crm_events_created_at ON public.crm_events(created_at);

-- =============================================
-- AUTO-UPDATE TRIGGER
-- =============================================
CREATE TRIGGER update_crm_cards_updated_at
  BEFORE UPDATE ON public.crm_cards
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- =============================================
-- EVENT LOGGING FUNCTION
-- =============================================
CREATE OR REPLACE FUNCTION public.log_crm_event()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF TG_OP = 'UPDATE' AND OLD.coluna IS DISTINCT FROM NEW.coluna THEN
    INSERT INTO public.crm_events (card_id, lead_id, event_type, old_value, new_value, metadata)
    VALUES (
      NEW.id,
      NEW.lead_id,
      'LEAD_STAGE_CHANGED',
      OLD.coluna,
      NEW.coluna,
      jsonb_build_object('cliente', NEW.cliente, 'titulo', NEW.titulo)
    );
  END IF;

  IF TG_OP = 'UPDATE' AND OLD.classificacao IS DISTINCT FROM NEW.classificacao THEN
    INSERT INTO public.crm_events (card_id, lead_id, event_type, old_value, new_value, metadata)
    VALUES (
      NEW.id,
      NEW.lead_id,
      CASE WHEN NEW.classificacao = 'quente' THEN 'HOT_LEAD_TRIGGERED' ELSE 'LEAD_SCORE_UPDATED' END,
      OLD.classificacao,
      NEW.classificacao,
      jsonb_build_object('score', NEW.lead_score, 'probabilidade', NEW.probabilidade_fechamento)
    );
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER crm_cards_event_logger
  AFTER UPDATE ON public.crm_cards
  FOR EACH ROW
  EXECUTE FUNCTION public.log_crm_event();
