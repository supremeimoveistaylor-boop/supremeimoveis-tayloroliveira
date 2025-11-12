-- Add latitude and longitude columns to properties table
ALTER TABLE public.properties 
ADD COLUMN IF NOT EXISTS latitude DOUBLE PRECISION,
ADD COLUMN IF NOT EXISTS longitude DOUBLE PRECISION;

-- Add listing_status column to track if property is available, sold, or rented
ALTER TABLE public.properties
ADD COLUMN IF NOT EXISTS listing_status TEXT DEFAULT 'available' CHECK (listing_status IN ('available', 'sold', 'rented'));

-- Add index for geographic queries
CREATE INDEX IF NOT EXISTS idx_properties_coordinates ON public.properties(latitude, longitude);

-- Add comment to columns
COMMENT ON COLUMN public.properties.latitude IS 'Property latitude for map display';
COMMENT ON COLUMN public.properties.longitude IS 'Property longitude for map display';
COMMENT ON COLUMN public.properties.listing_status IS 'Current listing status: available, sold, or rented';