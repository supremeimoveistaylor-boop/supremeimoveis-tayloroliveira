-- Add source tracking columns to leads table
ALTER TABLE public.leads
  ADD COLUMN IF NOT EXISTS source text,
  ADD COLUMN IF NOT EXISTS source_detail text,
  ADD COLUMN IF NOT EXISTS campaign text,
  ADD COLUMN IF NOT EXISTS medium text,
  ADD COLUMN IF NOT EXISTS origin_url text;

-- Add source tracking columns to leads_archive table
ALTER TABLE public.leads_archive
  ADD COLUMN IF NOT EXISTS source text,
  ADD COLUMN IF NOT EXISTS source_detail text,
  ADD COLUMN IF NOT EXISTS campaign text,
  ADD COLUMN IF NOT EXISTS medium text,
  ADD COLUMN IF NOT EXISTS origin_url text;

-- Add source tracking columns to crm_cards table
ALTER TABLE public.crm_cards
  ADD COLUMN IF NOT EXISTS source text,
  ADD COLUMN IF NOT EXISTS source_detail text,
  ADD COLUMN IF NOT EXISTS campaign text,
  ADD COLUMN IF NOT EXISTS medium text;

-- Create index for source analytics queries
CREATE INDEX IF NOT EXISTS idx_leads_source ON public.leads(source);
CREATE INDEX IF NOT EXISTS idx_leads_campaign ON public.leads(campaign);
CREATE INDEX IF NOT EXISTS idx_leads_medium ON public.leads(medium);