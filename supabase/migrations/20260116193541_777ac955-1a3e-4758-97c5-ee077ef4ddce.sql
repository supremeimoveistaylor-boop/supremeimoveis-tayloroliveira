-- Tabela de corretores
CREATE TABLE public.brokers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  whatsapp TEXT NOT NULL,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Tabela de leads
CREATE TABLE public.leads (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  property_id UUID REFERENCES public.properties(id) ON DELETE SET NULL,
  broker_id UUID REFERENCES public.brokers(id) ON DELETE SET NULL,
  name TEXT,
  phone TEXT,
  email TEXT,
  status TEXT NOT NULL DEFAULT 'novo',
  intent TEXT, -- comprar, alugar
  origin TEXT, -- Meta Ads, Google, Direto, etc
  visit_requested BOOLEAN DEFAULT false,
  visit_date TIMESTAMP WITH TIME ZONE,
  whatsapp_sent BOOLEAN DEFAULT false,
  whatsapp_sent_at TIMESTAMP WITH TIME ZONE,
  page_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Tabela de mensagens do chat
CREATE TABLE public.chat_messages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  lead_id UUID NOT NULL REFERENCES public.leads(id) ON DELETE CASCADE,
  role TEXT NOT NULL, -- 'user' ou 'assistant'
  content TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Tabela de configurações da imobiliária
CREATE TABLE public.company_settings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  distribution_rule TEXT NOT NULL DEFAULT 'round_robin', -- 'round_robin' ou 'fixed'
  default_broker_id UUID REFERENCES public.brokers(id) ON DELETE SET NULL,
  last_assigned_broker_id UUID REFERENCES public.brokers(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Corretor exclusivo por imóvel
ALTER TABLE public.properties 
ADD COLUMN IF NOT EXISTS exclusive_broker_id UUID REFERENCES public.brokers(id) ON DELETE SET NULL;

-- Enable RLS
ALTER TABLE public.brokers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.company_settings ENABLE ROW LEVEL SECURITY;

-- RLS Policies para brokers
CREATE POLICY "Admins can view all brokers" ON public.brokers 
FOR SELECT USING (has_role(auth.uid(), 'admin'::user_role));

CREATE POLICY "Admins can insert brokers" ON public.brokers 
FOR INSERT WITH CHECK (has_role(auth.uid(), 'admin'::user_role));

CREATE POLICY "Admins can update brokers" ON public.brokers 
FOR UPDATE USING (has_role(auth.uid(), 'admin'::user_role));

CREATE POLICY "Admins can delete brokers" ON public.brokers 
FOR DELETE USING (has_role(auth.uid(), 'admin'::user_role));

CREATE POLICY "Public can view active brokers" ON public.brokers
FOR SELECT USING (active = true);

-- RLS Policies para leads
CREATE POLICY "Admins can view all leads" ON public.leads 
FOR SELECT USING (has_role(auth.uid(), 'admin'::user_role));

CREATE POLICY "Brokers can view their leads" ON public.leads
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.brokers 
    WHERE brokers.id = leads.broker_id 
    AND brokers.user_id = auth.uid()
  )
);

CREATE POLICY "Public can insert leads" ON public.leads
FOR INSERT WITH CHECK (true);

CREATE POLICY "Admins can update leads" ON public.leads
FOR UPDATE USING (has_role(auth.uid(), 'admin'::user_role));

CREATE POLICY "Brokers can update their leads" ON public.leads
FOR UPDATE USING (
  EXISTS (
    SELECT 1 FROM public.brokers 
    WHERE brokers.id = leads.broker_id 
    AND brokers.user_id = auth.uid()
  )
);

-- RLS Policies para chat_messages
CREATE POLICY "Anyone can insert chat messages" ON public.chat_messages
FOR INSERT WITH CHECK (true);

CREATE POLICY "Anyone can view chat messages by lead" ON public.chat_messages
FOR SELECT USING (true);

CREATE POLICY "Admins can manage chat messages" ON public.chat_messages
FOR ALL USING (has_role(auth.uid(), 'admin'::user_role));

-- RLS Policies para company_settings
CREATE POLICY "Admins can manage company settings" ON public.company_settings
FOR ALL USING (has_role(auth.uid(), 'admin'::user_role));

CREATE POLICY "Public can view company settings" ON public.company_settings
FOR SELECT USING (true);

-- Inserir configuração padrão
INSERT INTO public.company_settings (distribution_rule) VALUES ('round_robin');

-- Function para atualizar updated_at
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers para updated_at
CREATE TRIGGER update_brokers_updated_at
BEFORE UPDATE ON public.brokers
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_leads_updated_at
BEFORE UPDATE ON public.leads
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_company_settings_updated_at
BEFORE UPDATE ON public.company_settings
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Function para distribuição automática de leads
CREATE OR REPLACE FUNCTION public.assign_lead_to_broker(p_lead_id UUID, p_property_id UUID)
RETURNS UUID AS $$
DECLARE
  v_broker_id UUID;
  v_settings RECORD;
  v_exclusive_broker_id UUID;
BEGIN
  -- Verificar se o imóvel tem corretor exclusivo
  IF p_property_id IS NOT NULL THEN
    SELECT exclusive_broker_id INTO v_exclusive_broker_id
    FROM public.properties
    WHERE id = p_property_id;
    
    IF v_exclusive_broker_id IS NOT NULL THEN
      -- Verificar se o corretor está ativo
      IF EXISTS (SELECT 1 FROM public.brokers WHERE id = v_exclusive_broker_id AND active = true) THEN
        v_broker_id := v_exclusive_broker_id;
      END IF;
    END IF;
  END IF;

  -- Se não tem corretor exclusivo, usar regra de distribuição
  IF v_broker_id IS NULL THEN
    SELECT * INTO v_settings FROM public.company_settings LIMIT 1;
    
    IF v_settings.distribution_rule = 'fixed' AND v_settings.default_broker_id IS NOT NULL THEN
      v_broker_id := v_settings.default_broker_id;
    ELSE
      -- Round robin: pegar próximo corretor ativo
      SELECT id INTO v_broker_id
      FROM public.brokers
      WHERE active = true
        AND (v_settings.last_assigned_broker_id IS NULL OR id > v_settings.last_assigned_broker_id)
      ORDER BY id
      LIMIT 1;
      
      -- Se não encontrou, volta ao primeiro
      IF v_broker_id IS NULL THEN
        SELECT id INTO v_broker_id
        FROM public.brokers
        WHERE active = true
        ORDER BY id
        LIMIT 1;
      END IF;
      
      -- Atualizar último corretor atribuído
      IF v_broker_id IS NOT NULL THEN
        UPDATE public.company_settings SET last_assigned_broker_id = v_broker_id;
      END IF;
    END IF;
  END IF;

  -- Atualizar lead com corretor
  IF v_broker_id IS NOT NULL THEN
    UPDATE public.leads SET broker_id = v_broker_id WHERE id = p_lead_id;
  END IF;

  RETURN v_broker_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;