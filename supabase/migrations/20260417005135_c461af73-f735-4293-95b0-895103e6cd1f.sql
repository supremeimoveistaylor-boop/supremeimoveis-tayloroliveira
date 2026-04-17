-- Cadastrar corretor Supreme principal e definir como padrão para receber TODOS os leads
DO $$
DECLARE
  v_broker_id uuid;
BEGIN
  -- Inserir corretor Supreme se ainda não existir (pelo whatsapp)
  SELECT id INTO v_broker_id FROM public.brokers WHERE whatsapp = '5562999918353' LIMIT 1;

  IF v_broker_id IS NULL THEN
    INSERT INTO public.brokers (name, whatsapp, phone, email, active)
    VALUES ('Supreme Empreendimentos', '5562999918353', '5562999918353', 'supremeimoveis.taylor@gmail.com', true)
    RETURNING id INTO v_broker_id;
  END IF;

  -- Definir como corretor padrão na company_settings
  UPDATE public.company_settings
  SET default_broker_id = v_broker_id,
      distribution_rule = 'fixed',
      updated_at = now();

  -- Se não houver linha em company_settings, criar
  IF NOT FOUND THEN
    INSERT INTO public.company_settings (default_broker_id, distribution_rule)
    VALUES (v_broker_id, 'fixed');
  END IF;
END $$;