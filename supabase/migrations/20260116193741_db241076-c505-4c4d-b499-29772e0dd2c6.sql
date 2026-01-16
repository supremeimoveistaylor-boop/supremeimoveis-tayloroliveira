-- Corrigir search_path nas funções
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

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
      IF EXISTS (SELECT 1 FROM public.brokers WHERE id = v_exclusive_broker_id AND active = true) THEN
        v_broker_id := v_exclusive_broker_id;
      END IF;
    END IF;
  END IF;

  IF v_broker_id IS NULL THEN
    SELECT * INTO v_settings FROM public.company_settings LIMIT 1;
    
    IF v_settings.distribution_rule = 'fixed' AND v_settings.default_broker_id IS NOT NULL THEN
      v_broker_id := v_settings.default_broker_id;
    ELSE
      SELECT id INTO v_broker_id
      FROM public.brokers
      WHERE active = true
        AND (v_settings.last_assigned_broker_id IS NULL OR id > v_settings.last_assigned_broker_id)
      ORDER BY id
      LIMIT 1;
      
      IF v_broker_id IS NULL THEN
        SELECT id INTO v_broker_id
        FROM public.brokers
        WHERE active = true
        ORDER BY id
        LIMIT 1;
      END IF;
      
      IF v_broker_id IS NOT NULL THEN
        UPDATE public.company_settings SET last_assigned_broker_id = v_broker_id;
      END IF;
    END IF;
  END IF;

  IF v_broker_id IS NOT NULL THEN
    UPDATE public.leads SET broker_id = v_broker_id WHERE id = p_lead_id;
  END IF;

  RETURN v_broker_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;