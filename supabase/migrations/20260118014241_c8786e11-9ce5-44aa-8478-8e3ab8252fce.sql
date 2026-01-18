-- Tabela de atendentes/colaboradores do chat
CREATE TABLE public.chat_attendants (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  phone TEXT NOT NULL,
  email TEXT,
  role TEXT NOT NULL DEFAULT 'atendente' CHECK (role IN ('atendente', 'corretor', 'gestor')),
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.chat_attendants ENABLE ROW LEVEL SECURITY;

-- Policies - apenas admins podem gerenciar atendentes
CREATE POLICY "Admins can view all attendants"
  ON public.chat_attendants
  FOR SELECT
  USING (public.is_admin(auth.uid()));

CREATE POLICY "Admins can create attendants"
  ON public.chat_attendants
  FOR INSERT
  WITH CHECK (public.is_admin(auth.uid()));

CREATE POLICY "Admins can update attendants"
  ON public.chat_attendants
  FOR UPDATE
  USING (public.is_admin(auth.uid()));

CREATE POLICY "Admins can delete attendants"
  ON public.chat_attendants
  FOR DELETE
  USING (public.is_admin(auth.uid()));

-- Trigger para atualizar updated_at
CREATE TRIGGER update_chat_attendants_updated_at
  BEFORE UPDATE ON public.chat_attendants
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Índices
CREATE INDEX idx_chat_attendants_active ON public.chat_attendants(active);
CREATE INDEX idx_chat_attendants_role ON public.chat_attendants(role);