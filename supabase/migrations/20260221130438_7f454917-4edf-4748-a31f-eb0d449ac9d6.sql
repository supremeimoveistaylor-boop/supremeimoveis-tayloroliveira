
-- Table to track property campaigns sent (avoid duplicates)
CREATE TABLE public.property_campaigns (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  property_id UUID REFERENCES public.properties(id) ON DELETE CASCADE,
  lead_id UUID REFERENCES public.leads(id) ON DELETE CASCADE,
  campaign_type TEXT NOT NULL, -- 'novo_imovel' or 'queda_preco'
  message_sent TEXT,
  channel TEXT DEFAULT 'whatsapp',
  status TEXT DEFAULT 'sent',
  whatsapp_message_id TEXT,
  old_price NUMERIC,
  new_price NUMERIC,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.property_campaigns ENABLE ROW LEVEL SECURITY;

-- Admins can view
CREATE POLICY "Admins can view property_campaigns"
  ON public.property_campaigns FOR SELECT
  USING (has_role(auth.uid(), 'admin'::user_role));

-- Service can insert
CREATE POLICY "Service can insert property_campaigns"
  ON public.property_campaigns FOR INSERT
  WITH CHECK (true);

-- Index for dedup checks
CREATE INDEX idx_property_campaigns_dedup ON public.property_campaigns (property_id, lead_id, campaign_type);
CREATE INDEX idx_property_campaigns_created ON public.property_campaigns (created_at DESC);

-- Add price tracking column to properties for detecting drops
ALTER TABLE public.properties ADD COLUMN IF NOT EXISTS previous_price NUMERIC;

-- Trigger to track price changes
CREATE OR REPLACE FUNCTION public.track_property_price_change()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.price IS DISTINCT FROM NEW.price AND NEW.price < OLD.price THEN
    NEW.previous_price = OLD.price;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER track_price_change
  BEFORE UPDATE ON public.properties
  FOR EACH ROW
  EXECUTE FUNCTION public.track_property_price_change();
