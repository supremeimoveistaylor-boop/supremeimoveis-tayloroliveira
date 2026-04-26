-- 1. Função de sincronização Omnichat → Leads
CREATE OR REPLACE FUNCTION public.sync_omnichat_to_leads()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_name TEXT;
  v_phone TEXT;
  v_existing_lead_id UUID;
BEGIN
  RAISE NOTICE 'Sincronizando Omnichat → Leads (conversation_id: %)', NEW.id;

  -- Definir nome e telefone com fallbacks
  v_name := COALESCE(NULLIF(TRIM(NEW.contact_name), ''), 'Visitante');
  v_phone := COALESCE(
    NULLIF(TRIM(NEW.contact_phone), ''),
    NULLIF(TRIM(NEW.external_contact_id), '')
  );

  -- Sem telefone/identificador → não cria lead
  IF v_phone IS NULL THEN
    RAISE NOTICE 'Sem phone/external_contact_id, ignorando sincronização';
    RETURN NEW;
  END IF;

  -- Verificar se já existe lead com esse telefone
  SELECT id INTO v_existing_lead_id
  FROM public.leads
  WHERE phone = v_phone
  LIMIT 1;

  IF v_existing_lead_id IS NOT NULL THEN
    -- Lead já existe: apenas atualizar última interação
    UPDATE public.leads
    SET 
      last_interaction_at = NOW(),
      updated_at = NOW(),
      name = CASE 
        WHEN (name IS NULL OR name = '' OR name = 'Visitante') AND v_name <> 'Visitante' 
        THEN v_name 
        ELSE name 
      END
    WHERE id = v_existing_lead_id;

    RAISE NOTICE 'Lead já existente (id: %), atualizado', v_existing_lead_id;

    -- Vincula a conversa ao lead existente, se ainda não estiver
    IF NEW.lead_id IS NULL THEN
      NEW.lead_id := v_existing_lead_id;
    END IF;
  ELSE
    -- Criar novo lead
    INSERT INTO public.leads (
      name,
      phone,
      source,
      origin,
      status,
      created_at,
      updated_at,
      last_interaction_at
    ) VALUES (
      v_name,
      v_phone,
      'omnichat',
      COALESCE(NEW.channel, 'omnichat'),
      'novo',
      NOW(),
      NOW(),
      NOW()
    )
    RETURNING id INTO v_existing_lead_id;

    RAISE NOTICE 'Lead criado (id: %, phone: %)', v_existing_lead_id, v_phone;

    -- Vincula a conversa ao novo lead
    NEW.lead_id := v_existing_lead_id;
  END IF;

  RETURN NEW;
END;
$$;

-- 2. Trigger BEFORE INSERT em omnichat_conversations (permite setar NEW.lead_id)
DROP TRIGGER IF EXISTS trigger_sync_omnichat_to_leads ON public.omnichat_conversations;
CREATE TRIGGER trigger_sync_omnichat_to_leads
BEFORE INSERT ON public.omnichat_conversations
FOR EACH ROW
EXECUTE FUNCTION public.sync_omnichat_to_leads();

-- 3. Função para atualizar last_interaction_at no lead quando chega nova mensagem
CREATE OR REPLACE FUNCTION public.sync_omnichat_message_to_lead()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_lead_id UUID;
BEGIN
  -- Pega o lead vinculado à conversa
  SELECT lead_id INTO v_lead_id
  FROM public.omnichat_conversations
  WHERE id = NEW.conversation_id;

  IF v_lead_id IS NOT NULL THEN
    UPDATE public.leads
    SET 
      last_interaction_at = NOW(),
      updated_at = NOW(),
      message_count = COALESCE(message_count, 0) + 1
    WHERE id = v_lead_id;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_sync_omnichat_message_to_lead ON public.omnichat_messages;
CREATE TRIGGER trigger_sync_omnichat_message_to_lead
AFTER INSERT ON public.omnichat_messages
FOR EACH ROW
EXECUTE FUNCTION public.sync_omnichat_message_to_lead();

-- 4. BACKFILL: importar conversas Omnichat existentes para leads
DO $$
DECLARE
  conv RECORD;
  v_name TEXT;
  v_phone TEXT;
  v_existing_lead_id UUID;
  v_created INT := 0;
  v_skipped INT := 0;
  v_linked INT := 0;
BEGIN
  RAISE NOTICE '🔄 Iniciando BACKFILL Omnichat → Leads';

  FOR conv IN 
    SELECT id, contact_name, contact_phone, external_contact_id, channel, lead_id, created_at
    FROM public.omnichat_conversations
    ORDER BY created_at ASC
  LOOP
    v_name := COALESCE(NULLIF(TRIM(conv.contact_name), ''), 'Visitante');
    v_phone := COALESCE(
      NULLIF(TRIM(conv.contact_phone), ''),
      NULLIF(TRIM(conv.external_contact_id), '')
    );

    IF v_phone IS NULL THEN
      v_skipped := v_skipped + 1;
      CONTINUE;
    END IF;

    SELECT id INTO v_existing_lead_id
    FROM public.leads
    WHERE phone = v_phone
    LIMIT 1;

    IF v_existing_lead_id IS NOT NULL THEN
      v_skipped := v_skipped + 1;
      -- Vincular conversa ao lead existente se não vinculada
      IF conv.lead_id IS NULL THEN
        UPDATE public.omnichat_conversations
        SET lead_id = v_existing_lead_id
        WHERE id = conv.id;
        v_linked := v_linked + 1;
      END IF;
    ELSE
      INSERT INTO public.leads (
        name, phone, source, origin, status,
        created_at, updated_at, last_interaction_at
      ) VALUES (
        v_name, v_phone, 'omnichat',
        COALESCE(conv.channel, 'omnichat'),
        'novo',
        conv.created_at, NOW(), NOW()
      )
      RETURNING id INTO v_existing_lead_id;

      UPDATE public.omnichat_conversations
      SET lead_id = v_existing_lead_id
      WHERE id = conv.id;

      v_created := v_created + 1;
    END IF;
  END LOOP;

  RAISE NOTICE '✅ BACKFILL concluído: % criados, % já existentes, % vinculados', v_created, v_skipped, v_linked;
END $$;