
-- Add is_public column to properties table
ALTER TABLE public.properties ADD COLUMN IF NOT EXISTS is_public boolean NOT NULL DEFAULT false;

-- Create index for fast public property lookups
CREATE INDEX IF NOT EXISTS idx_properties_is_public ON public.properties (is_public) WHERE is_public = true;
