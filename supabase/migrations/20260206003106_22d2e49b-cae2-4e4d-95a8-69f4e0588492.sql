-- ══════════════════════════════════════════════════════════════
-- MÓDULO DE AGENDAMENTO DE VISITAS - TABELAS ISOLADAS
-- Multi-tenant com RLS obrigatório
-- ══════════════════════════════════════════════════════════════

-- Tabela de clientes para agendamento (isolada)
CREATE TABLE public.visit_clients (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL,
  name TEXT NOT NULL,
  phone TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Tabela de visitas agendadas (isolada)
CREATE TABLE public.scheduled_visits (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL,
  client_id UUID NOT NULL REFERENCES public.visit_clients(id) ON DELETE CASCADE,
  property_id UUID REFERENCES public.properties(id) ON DELETE SET NULL,
  property_name TEXT,
  visit_date DATE NOT NULL,
  visit_time TIME NOT NULL,
  status TEXT NOT NULL DEFAULT 'agendada' CHECK (status IN ('agendada', 'realizada', 'cancelada')),
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Índices para performance
CREATE INDEX idx_visit_clients_tenant ON public.visit_clients(tenant_id);
CREATE INDEX idx_scheduled_visits_tenant ON public.scheduled_visits(tenant_id);
CREATE INDEX idx_scheduled_visits_client ON public.scheduled_visits(client_id);
CREATE INDEX idx_scheduled_visits_date ON public.scheduled_visits(visit_date);
CREATE INDEX idx_scheduled_visits_status ON public.scheduled_visits(status);

-- Enable RLS
ALTER TABLE public.visit_clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.scheduled_visits ENABLE ROW LEVEL SECURITY;

-- RLS Policies para visit_clients (multi-tenant)
CREATE POLICY "Users can view own tenant clients"
ON public.visit_clients FOR SELECT
TO authenticated
USING (tenant_id = auth.uid());

CREATE POLICY "Users can insert own tenant clients"
ON public.visit_clients FOR INSERT
TO authenticated
WITH CHECK (tenant_id = auth.uid());

CREATE POLICY "Users can update own tenant clients"
ON public.visit_clients FOR UPDATE
TO authenticated
USING (tenant_id = auth.uid());

CREATE POLICY "Users can delete own tenant clients"
ON public.visit_clients FOR DELETE
TO authenticated
USING (tenant_id = auth.uid());

-- RLS Policies para scheduled_visits (multi-tenant)
CREATE POLICY "Users can view own tenant visits"
ON public.scheduled_visits FOR SELECT
TO authenticated
USING (tenant_id = auth.uid());

CREATE POLICY "Users can insert own tenant visits"
ON public.scheduled_visits FOR INSERT
TO authenticated
WITH CHECK (tenant_id = auth.uid());

CREATE POLICY "Users can update own tenant visits"
ON public.scheduled_visits FOR UPDATE
TO authenticated
USING (tenant_id = auth.uid());

CREATE POLICY "Users can delete own tenant visits"
ON public.scheduled_visits FOR DELETE
TO authenticated
USING (tenant_id = auth.uid());

-- Trigger para updated_at
CREATE TRIGGER update_visit_clients_updated_at
BEFORE UPDATE ON public.visit_clients
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_scheduled_visits_updated_at
BEFORE UPDATE ON public.scheduled_visits
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();