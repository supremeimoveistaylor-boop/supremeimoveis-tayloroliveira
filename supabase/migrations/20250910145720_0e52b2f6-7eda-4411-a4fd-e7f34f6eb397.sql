-- Drop and recreate views entirely to avoid column order issues

-- Drop security definer views entirely first
DROP VIEW IF EXISTS public.properties_public;
DROP VIEW IF EXISTS public.public_properties;

-- Fix RLS policies for properties table
ALTER TABLE public.properties ENABLE ROW LEVEL SECURITY;

-- Drop existing policies cleanly
DROP POLICY IF EXISTS "Anon can view active properties via view" ON public.properties;
DROP POLICY IF EXISTS "Authenticated users can view active properties" ON public.properties;
DROP POLICY IF EXISTS "Authenticated users can view all active properties" ON public.properties;
DROP POLICY IF EXISTS "Users can manage their own properties" ON public.properties;

-- Create clear new permissive RLS policies
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

-- Create security invoker views with new names to avoid conflicts
CREATE VIEW public.properties_public
WITH (security_invoker = true) AS
SELECT
  p.id,
  p.title,
  p.description,
  p.price,
  p.location,
  p.property_type,
  p.purpose,
  p.bedrooms,
  p.bathrooms,
  p.parking_spaces,
  p.area,
  p.featured,
  p.created_at,
  p.updated_at,
  p.amenities,
  p.images,
  p.status,
  p.youtube_link,
  p.whatsapp_link
FROM public.properties p
WHERE p.status = 'active';

CREATE VIEW public.public_properties
WITH (security_invoker = true) AS
SELECT
  p.id,
  p.title,
  p.description,
  p.price,
  p.location,
  p.property_type,
  p.purpose,
  p.bedrooms,
  p.bathrooms,
  p.parking_spaces,
  p.area,
  p.featured,
  p.created_at,
  p.updated_at,
  p.amenities,
  p.images,
  p.status,
  p.youtube_link,
  p.whatsapp_link
FROM public.properties p
WHERE p.status = 'active';