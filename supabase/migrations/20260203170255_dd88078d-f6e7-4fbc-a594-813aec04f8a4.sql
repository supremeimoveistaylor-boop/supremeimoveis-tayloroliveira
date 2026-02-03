-- Add delivery_date column to properties table
ALTER TABLE public.properties 
ADD COLUMN IF NOT EXISTS delivery_date DATE;

-- Add comment for documentation
COMMENT ON COLUMN public.properties.delivery_date IS 'Data prevista de entrega do imóvel (para lançamentos/construção)';