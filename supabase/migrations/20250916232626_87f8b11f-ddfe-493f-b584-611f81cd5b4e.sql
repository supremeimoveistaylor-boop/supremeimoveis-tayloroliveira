-- Fix public access to properties for anonymous users
-- Remove restrictive policy and ensure public can view active properties

-- First, ensure anonymous users can access active properties
DROP POLICY IF EXISTS "Public can view active properties" ON public.properties;

CREATE POLICY "Anyone can view active properties" 
ON public.properties 
FOR SELECT 
TO anon, authenticated
USING (status = 'active'::text);

-- Ensure the properties_public view is accessible to everyone
-- This view should show only active properties without RLS restrictions
CREATE OR REPLACE VIEW public.properties_public AS 
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
  area,
  images,
  status,
  amenities,
  whatsapp_link,
  youtube_link,
  featured,
  created_at,
  updated_at
FROM public.properties 
WHERE status = 'active';

-- Grant access to the view for anonymous users
GRANT SELECT ON public.properties_public TO anon;
GRANT SELECT ON public.properties_public TO authenticated;