-- Add lead scoring columns to leads table
ALTER TABLE public.leads 
ADD COLUMN IF NOT EXISTS lead_score integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS score_breakdown jsonb DEFAULT '{}',
ADD COLUMN IF NOT EXISTS qualification text DEFAULT 'frio',
ADD COLUMN IF NOT EXISTS message_count integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS last_interaction_at timestamp with time zone DEFAULT now();

-- Add comment for documentation
COMMENT ON COLUMN public.leads.lead_score IS 'Total score from 0-100 based on interactions';
COMMENT ON COLUMN public.leads.score_breakdown IS 'JSON with individual scoring factors';
COMMENT ON COLUMN public.leads.qualification IS 'Lead temperature: frio, morno, quente, muito_quente';
COMMENT ON COLUMN public.leads.message_count IS 'Total messages exchanged';
COMMENT ON COLUMN public.leads.last_interaction_at IS 'Last message timestamp';

-- Create function to calculate lead score
CREATE OR REPLACE FUNCTION public.calculate_lead_score(p_lead_id uuid)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_lead RECORD;
  v_message_count integer;
  v_score integer := 0;
  v_breakdown jsonb := '{}';
  v_qualification text := 'frio';
BEGIN
  -- Get lead data
  SELECT * INTO v_lead FROM leads WHERE id = p_lead_id;
  IF NOT FOUND THEN
    RETURN 0;
  END IF;
  
  -- Get message count
  SELECT COUNT(*) INTO v_message_count FROM chat_messages WHERE lead_id = p_lead_id;
  
  -- SCORING RULES:
  
  -- 1. Contact info provided (+20 max)
  IF v_lead.name IS NOT NULL AND v_lead.name != '' THEN
    v_score := v_score + 10;
    v_breakdown := v_breakdown || '{"nome_fornecido": 10}'::jsonb;
  END IF;
  
  IF v_lead.phone IS NOT NULL AND v_lead.phone != '' THEN
    v_score := v_score + 10;
    v_breakdown := v_breakdown || '{"telefone_fornecido": 10}'::jsonb;
  END IF;
  
  -- 2. Intent clarity (+15 max)
  IF v_lead.intent IS NOT NULL THEN
    v_score := v_score + 15;
    v_breakdown := v_breakdown || '{"intencao_clara": 15}'::jsonb;
  END IF;
  
  -- 3. Visit requested (+25)
  IF v_lead.visit_requested = true THEN
    v_score := v_score + 25;
    v_breakdown := v_breakdown || '{"visita_solicitada": 25}'::jsonb;
  END IF;
  
  -- 4. Engagement level - message count (+20 max)
  IF v_message_count >= 10 THEN
    v_score := v_score + 20;
    v_breakdown := v_breakdown || '{"alto_engajamento": 20}'::jsonb;
  ELSIF v_message_count >= 5 THEN
    v_score := v_score + 15;
    v_breakdown := v_breakdown || '{"medio_engajamento": 15}'::jsonb;
  ELSIF v_message_count >= 2 THEN
    v_score := v_score + 5;
    v_breakdown := v_breakdown || '{"baixo_engajamento": 5}'::jsonb;
  END IF;
  
  -- 5. Origin bonus (+10 max)
  IF v_lead.origin IS NOT NULL THEN
    IF v_lead.origin ILIKE '%meta%' OR v_lead.origin ILIKE '%ads%' OR v_lead.origin ILIKE '%instagram%' OR v_lead.origin ILIKE '%facebook%' THEN
      v_score := v_score + 10;
      v_breakdown := v_breakdown || '{"origem_paga": 10}'::jsonb;
    ELSIF v_lead.origin != 'Direto' THEN
      v_score := v_score + 5;
      v_breakdown := v_breakdown || '{"origem_referencia": 5}'::jsonb;
    END IF;
  END IF;
  
  -- 6. Property interest (+10)
  IF v_lead.property_id IS NOT NULL THEN
    v_score := v_score + 10;
    v_breakdown := v_breakdown || '{"imovel_especifico": 10}'::jsonb;
  END IF;
  
  -- Determine qualification based on score
  IF v_score >= 70 THEN
    v_qualification := 'muito_quente';
  ELSIF v_score >= 50 THEN
    v_qualification := 'quente';
  ELSIF v_score >= 25 THEN
    v_qualification := 'morno';
  ELSE
    v_qualification := 'frio';
  END IF;
  
  -- Update lead with score
  UPDATE leads SET 
    lead_score = v_score,
    score_breakdown = v_breakdown,
    qualification = v_qualification,
    message_count = v_message_count,
    last_interaction_at = now()
  WHERE id = p_lead_id;
  
  RETURN v_score;
END;
$$;

-- Create trigger to auto-calculate score on message insert
CREATE OR REPLACE FUNCTION public.trigger_recalculate_lead_score()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM calculate_lead_score(NEW.lead_id);
  RETURN NEW;
END;
$$;

-- Drop trigger if exists and recreate
DROP TRIGGER IF EXISTS recalculate_lead_score_trigger ON chat_messages;

CREATE TRIGGER recalculate_lead_score_trigger
AFTER INSERT ON chat_messages
FOR EACH ROW
EXECUTE FUNCTION trigger_recalculate_lead_score();

-- Also recalculate when lead is updated
CREATE OR REPLACE FUNCTION public.trigger_recalculate_lead_score_on_update()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Only recalculate if relevant fields changed
  IF OLD.name IS DISTINCT FROM NEW.name OR
     OLD.phone IS DISTINCT FROM NEW.phone OR
     OLD.intent IS DISTINCT FROM NEW.intent OR
     OLD.visit_requested IS DISTINCT FROM NEW.visit_requested THEN
    PERFORM calculate_lead_score(NEW.id);
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS recalculate_lead_score_on_update_trigger ON leads;

CREATE TRIGGER recalculate_lead_score_on_update_trigger
AFTER UPDATE ON leads
FOR EACH ROW
EXECUTE FUNCTION trigger_recalculate_lead_score_on_update();