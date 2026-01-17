-- =====================================================
-- TABELA LEADS_IMOBILIARIOS - CAPTURA DE LEADS DO FORMULÁRIO
-- =====================================================

CREATE TABLE IF NOT EXISTS public.leads_imobiliarios (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  nome TEXT NOT NULL,
  telefone TEXT NOT NULL,
  email TEXT,
  tipo_imovel TEXT,
  finalidade TEXT, -- comprar | alugar | investir
  descricao TEXT,
  origem TEXT DEFAULT 'site',
  pagina_origem TEXT,
  status TEXT DEFAULT 'novo',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Habilitar RLS
ALTER TABLE public.leads_imobiliarios ENABLE ROW LEVEL SECURITY;

-- Políticas RLS

-- Público pode inserir leads (formulário aberto)
CREATE POLICY "Public can insert leads_imobiliarios"
ON public.leads_imobiliarios
FOR INSERT
TO public
WITH CHECK (true);

-- Admins podem ver todos os leads
CREATE POLICY "Admins can view all leads_imobiliarios"
ON public.leads_imobiliarios
FOR SELECT
USING (has_role(auth.uid(), 'admin'::user_role));

-- Admins podem atualizar leads
CREATE POLICY "Admins can update leads_imobiliarios"
ON public.leads_imobiliarios
FOR UPDATE
USING (has_role(auth.uid(), 'admin'::user_role));

-- Admins podem deletar leads
CREATE POLICY "Admins can delete leads_imobiliarios"
ON public.leads_imobiliarios
FOR DELETE
USING (has_role(auth.uid(), 'admin'::user_role));

-- Trigger para atualizar updated_at
CREATE OR REPLACE FUNCTION public.update_leads_imobiliarios_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_leads_imobiliarios_timestamp
  BEFORE UPDATE ON public.leads_imobiliarios
  FOR EACH ROW
  EXECUTE FUNCTION public.update_leads_imobiliarios_updated_at();

-- Índices para performance
CREATE INDEX idx_leads_imobiliarios_status ON public.leads_imobiliarios(status);
CREATE INDEX idx_leads_imobiliarios_created_at ON public.leads_imobiliarios(created_at DESC);
CREATE INDEX idx_leads_imobiliarios_tipo_imovel ON public.leads_imobiliarios(tipo_imovel);
CREATE INDEX idx_leads_imobiliarios_finalidade ON public.leads_imobiliarios(finalidade);