CREATE TABLE IF NOT EXISTS public.captacao_imoveis (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  nome text NOT NULL,
  telefone text NOT NULL,
  email text,
  tipo_imovel text NOT NULL,
  cidade text NOT NULL,
  bairro text NOT NULL,
  quartos integer,
  vagas integer,
  area numeric,
  estado_imovel text NOT NULL,
  valor_estimado_min numeric NOT NULL,
  valor_estimado_max numeric NOT NULL,
  status text DEFAULT 'novo',
  broker_id uuid REFERENCES public.brokers(id),
  lead_id uuid REFERENCES public.leads(id),
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL
);

ALTER TABLE public.captacao_imoveis ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view all captacoes"
  ON public.captacao_imoveis
  FOR SELECT
  USING (EXISTS ( SELECT 1 FROM user_roles WHERE ((user_roles.user_id = auth.uid()) AND (user_roles.role = 'admin'::user_role))));

CREATE POLICY "Anyone can insert captacoes"
  ON public.captacao_imoveis
  FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Admins can update captacoes"
  ON public.captacao_imoveis
  FOR UPDATE
  USING (EXISTS ( SELECT 1 FROM user_roles WHERE ((user_roles.user_id = auth.uid()) AND (user_roles.role = 'admin'::user_role))));

CREATE POLICY "Admins can delete captacoes"
  ON public.captacao_imoveis
  FOR DELETE
  USING (EXISTS ( SELECT 1 FROM user_roles WHERE ((user_roles.user_id = auth.uid()) AND (user_roles.role = 'admin'::user_role))));

CREATE TRIGGER update_captacao_imoveis_updated_at
  BEFORE UPDATE ON public.captacao_imoveis
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();