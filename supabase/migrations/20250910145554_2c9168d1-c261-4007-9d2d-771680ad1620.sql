-- Retry: fix SECURITY DEFINER view issue by recreating views with exact column order and set SECURITY INVOKER
-- Also correct RLS policies for properties in the same migration

ALTER TABLE public.properties ENABLE ROW LEVEL SECURITY;

-- Drop previous restrictive/duplicated policies (safe if not present)
DROP POLICY IF EXISTS "Anon can view active properties via view" ON public.properties;
DROP POLICY IF EXISTS "Authenticated users can view active properties" ON public.properties;
DROP POLICY IF EXISTS "Authenticated users can view all active properties" ON public.properties;
DROP POLICY IF EXISTS "Users can manage their own properties" ON public.properties;

-- Create permissive, explicit policies
CREATE POLICY "Public can view active properties"
ON public.properties
FOR SELECT
TO anon, authenticated
USING (status = 'active');

CREATE POLICY "Users can view their own properties"
ON public.properties
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own properties"
ON public.properties
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own properties"
ON public.properties
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own properties"
ON public.properties
FOR DELETE
TO authenticated
USING (auth.uid() = user_id);

-- Recreate views with SECURITY INVOKER and matching column order
CREATE OR REPLACE VIEW public.properties_public (
  updated_at,
  bedrooms,
  bathrooms,
  parking_spaces,
  area,
  featured,
  created_at,
  id,
  price,
  title,
  description,
  location,
  property_type,
  purpose,
  amenities,
  images,
  status,
  youtube_link,
  whatsapp_link
)
WITH (security_invoker = true) AS
SELECT
  p.updated_at,
  p.bedrooms,
  p.bathrooms,
  p.parking_spaces,
  p.area,
  p.featured,
  p.created_at,
  p.id,
  p.price,
  p.title,
  p.description,
  p.location,
  p.property_type,
  p.purpose,
  p.amenities,
  p.images,
  p.status,
  p.youtube_link,
  p.whatsapp_link
FROM public.properties p
WHERE p.status = 'active';

CREATE OR REPLACE VIEW public.public_properties (
  area,
  parking_spaces,
  price,
  youtube_link,
  amenities,
  created_at,
  id,
  description,
  featured,
  images,
  status,
  title,
  location,
  property_type,
  purpose,
  bathrooms,
  bedrooms,
  whatsapp_link,
  updated_at
)
WITH (security_invoker = true) AS
SELECT
  p.area,
  p.parking_spaces,
  p.price,
  p.youtube_link,
  p.amenities,
  p.created_at,
  p.id,
  p.description,
  p.featured,
  p.images,
  p.status,
  p.title,
  p.location,
  p.property_type,
  p.purpose,
  p.bathrooms,
  p.bedrooms,
  p.whatsapp_link,
  p.updated_at
FROM public.properties p
WHERE p.status = 'active';