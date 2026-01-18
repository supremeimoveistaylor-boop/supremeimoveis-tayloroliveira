-- Tabela para tracking de conversões do chat
CREATE TABLE public.chat_conversions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  lead_id UUID REFERENCES public.leads(id) ON DELETE CASCADE,
  session_id UUID REFERENCES public.chat_sessions(id) ON DELETE SET NULL,
  conversion_type TEXT NOT NULL, -- 'agendamento_solicitado', 'agendamento_confirmado', 'telefone_coletado', 'nome_coletado', 'visita_solicitada', 'interesse_qualificado'
  conversion_source TEXT, -- 'chat_ai', 'user_input', 'system'
  message_content TEXT, -- Mensagem que gerou a conversão
  metadata JSONB DEFAULT '{}', -- Dados adicionais (horário sugerido, tipo de visita, etc.)
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Índices para performance
CREATE INDEX idx_chat_conversions_lead_id ON public.chat_conversions(lead_id);
CREATE INDEX idx_chat_conversions_type ON public.chat_conversions(conversion_type);
CREATE INDEX idx_chat_conversions_created_at ON public.chat_conversions(created_at DESC);

-- Enable RLS
ALTER TABLE public.chat_conversions ENABLE ROW LEVEL SECURITY;

-- Policy para leitura por usuários autenticados
CREATE POLICY "Authenticated users can read chat conversions"
ON public.chat_conversions
FOR SELECT
USING (auth.role() = 'authenticated');

-- Policy para inserção (edge functions)
CREATE POLICY "Service role can insert chat conversions"
ON public.chat_conversions
FOR INSERT
WITH CHECK (true);

-- Adicionar coluna de status de qualificação ao lead
ALTER TABLE public.leads 
ADD COLUMN IF NOT EXISTS conversion_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS first_conversion_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS last_conversion_at TIMESTAMP WITH TIME ZONE;

-- View para métricas de conversão
CREATE OR REPLACE VIEW public.chat_conversion_metrics AS
SELECT 
  DATE_TRUNC('day', cc.created_at) as date,
  cc.conversion_type,
  COUNT(*) as total_conversions,
  COUNT(DISTINCT cc.lead_id) as unique_leads
FROM public.chat_conversions cc
GROUP BY DATE_TRUNC('day', cc.created_at), cc.conversion_type
ORDER BY date DESC, total_conversions DESC;

-- Função para registrar conversão
CREATE OR REPLACE FUNCTION public.register_chat_conversion(
  p_lead_id UUID,
  p_conversion_type TEXT,
  p_message_content TEXT DEFAULT NULL,
  p_metadata JSONB DEFAULT '{}'
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_conversion_id UUID;
BEGIN
  -- Inserir conversão
  INSERT INTO public.chat_conversions (lead_id, conversion_type, message_content, metadata, conversion_source)
  VALUES (p_lead_id, p_conversion_type, p_message_content, p_metadata, 'chat_ai')
  RETURNING id INTO v_conversion_id;
  
  -- Atualizar contadores no lead
  UPDATE public.leads
  SET 
    conversion_count = COALESCE(conversion_count, 0) + 1,
    first_conversion_at = COALESCE(first_conversion_at, now()),
    last_conversion_at = now(),
    updated_at = now()
  WHERE id = p_lead_id;
  
  RETURN v_conversion_id;
END;
$$;