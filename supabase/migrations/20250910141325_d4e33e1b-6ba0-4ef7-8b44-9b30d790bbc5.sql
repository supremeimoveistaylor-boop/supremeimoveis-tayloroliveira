-- Fix the view creation by removing security_barrier option
DROP VIEW IF EXISTS public.properties_public;

-- Create a proper public view without user_id exposure
CREATE VIEW public.properties_public AS
SELECT
  id,
  title,
  description,
  price,
  location,
  property_type,
  purpose,
  bedrooms,
  bathrooms,
  parking_spaces,
  amenities,
  area,
  images,
  status,
  featured,
  youtube_link,
  whatsapp_link,
  created_at,
  updated_at
FROM public.properties
WHERE status = 'active';

-- Ensure RLS is enabled on the properties table
ALTER TABLE public.properties ENABLE ROW LEVEL SECURITY;

-- Update the RLS policy to use the dedicated view for public access
DROP POLICY IF EXISTS "Public can view active properties without owner info" ON public.properties;

-- Create a more restrictive policy for the main properties table
CREATE POLICY "Authenticated users can view all active properties" 
ON public.properties 
FOR SELECT 
TO authenticated
USING (status = 'active');

-- Grant access to the public view
GRANT SELECT ON public.properties_public TO anon, authenticated;