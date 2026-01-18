-- Criar tabela de sessões de chat
CREATE TABLE public.chat_sessions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  lead_id UUID NOT NULL REFERENCES public.leads(id) ON DELETE CASCADE,
  attendant_id UUID REFERENCES public.chat_attendants(id),
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'finished', 'transferred')),
  started_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  finished_at TIMESTAMP WITH TIME ZONE,
  summary TEXT,
  whatsapp_sent BOOLEAN DEFAULT false,
  whatsapp_sent_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Habilitar RLS
ALTER TABLE public.chat_sessions ENABLE ROW LEVEL SECURITY;

-- Políticas RLS
CREATE POLICY "Public can insert chat sessions"
ON public.chat_sessions FOR INSERT
WITH CHECK (true);

CREATE POLICY "Public can update chat sessions"
ON public.chat_sessions FOR UPDATE
USING (true);

CREATE POLICY "Admins can view all chat sessions"
ON public.chat_sessions FOR SELECT
USING (is_admin(auth.uid()));

CREATE POLICY "Public can read own session"
ON public.chat_sessions FOR SELECT
USING (true);

-- Trigger para atualizar updated_at
CREATE TRIGGER update_chat_sessions_updated_at
BEFORE UPDATE ON public.chat_sessions
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Função para atribuir atendente usando round-robin
CREATE OR REPLACE FUNCTION public.assign_attendant_round_robin()
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_attendant_id UUID;
  v_last_assigned_id UUID;
BEGIN
  -- Buscar último atendente atribuído
  SELECT attendant_id INTO v_last_assigned_id
  FROM chat_sessions
  WHERE attendant_id IS NOT NULL
  ORDER BY created_at DESC
  LIMIT 1;

  -- Buscar próximo atendente ativo após o último
  IF v_last_assigned_id IS NOT NULL THEN
    SELECT id INTO v_attendant_id
    FROM chat_attendants
    WHERE active = true AND id > v_last_assigned_id
    ORDER BY id ASC
    LIMIT 1;
  END IF;

  -- Se não encontrou, pegar o primeiro ativo
  IF v_attendant_id IS NULL THEN
    SELECT id INTO v_attendant_id
    FROM chat_attendants
    WHERE active = true
    ORDER BY id ASC
    LIMIT 1;
  END IF;

  RETURN v_attendant_id;
END;
$$;

-- Função para finalizar sessão e gerar resumo
CREATE OR REPLACE FUNCTION public.finish_chat_session(
  p_session_id UUID,
  p_summary TEXT DEFAULT NULL
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_session RECORD;
  v_lead RECORD;
  v_attendant RECORD;
  v_message_count INT;
BEGIN
  -- Buscar sessão
  SELECT * INTO v_session FROM chat_sessions WHERE id = p_session_id;
  
  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'error', 'Sessão não encontrada');
  END IF;

  -- Buscar lead
  SELECT * INTO v_lead FROM leads WHERE id = v_session.lead_id;

  -- Buscar atendente se existir
  IF v_session.attendant_id IS NOT NULL THEN
    SELECT * INTO v_attendant FROM chat_attendants WHERE id = v_session.attendant_id;
  END IF;

  -- Contar mensagens
  SELECT COUNT(*) INTO v_message_count
  FROM chat_messages
  WHERE lead_id = v_session.lead_id;

  -- Atualizar sessão
  UPDATE chat_sessions
  SET 
    status = 'finished',
    finished_at = now(),
    summary = COALESCE(p_summary, 'Atendimento finalizado'),
    updated_at = now()
  WHERE id = p_session_id;

  -- Retornar dados para gerar mensagem WhatsApp
  RETURN json_build_object(
    'success', true,
    'session_id', p_session_id,
    'lead_name', COALESCE(v_lead.name, 'Não informado'),
    'lead_phone', COALESCE(v_lead.phone, 'Não informado'),
    'lead_email', COALESCE(v_lead.email, 'Não informado'),
    'lead_intent', COALESCE(v_lead.intent, 'Não informado'),
    'message_count', v_message_count,
    'attendant_name', COALESCE(v_attendant.name, 'Não atribuído'),
    'attendant_phone', v_attendant.phone,
    'summary', COALESCE(p_summary, 'Atendimento finalizado')
  );
END;
$$;