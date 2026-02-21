-- Add lead_category column for automatic classification
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS lead_category text DEFAULT NULL;

-- Add budget_range for value-based classification
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS budget_range text DEFAULT NULL;

-- Create index for category queries
CREATE INDEX IF NOT EXISTS idx_leads_lead_category ON public.leads(lead_category);
CREATE INDEX IF NOT EXISTS idx_leads_budget_range ON public.leads(budget_range);

-- Add lead_category to leads_imobiliarios too
ALTER TABLE public.leads_imobiliarios ADD COLUMN IF NOT EXISTS lead_category text DEFAULT NULL;
ALTER TABLE public.leads_imobiliarios ADD COLUMN IF NOT EXISTS budget_range text DEFAULT NULL;