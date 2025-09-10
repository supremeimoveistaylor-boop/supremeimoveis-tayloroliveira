-- Fix security: use SECURITY INVOKER for public views and correct RLS policies on properties

-- Ensure RLS is enabled (safe if already enabled)
ALTER TABLE public.properties ENABLE ROW LEVEL SECURITY;

-- Drop overly restrictive/duplicated policies to avoid AND-combining conditions
DROP POLICY IF EXISTS "Anon can view active properties via view" ON public.properties;
DROP POLICY IF EXISTS "Authenticated users can view active properties" ON public.properties;
DROP POLICY IF EXISTS "Authenticated users can view all active properties" ON public.properties;
DROP POLICY IF EXISTS "Users can manage their own properties" ON public.properties;

-- Create clear, PERMISSIVE policies
-- 1) Public (anon + authenticated) can view active properties
CREATE POLICY "Public can view active properties"
ON public.properties
FOR SELECT
TO anon, authenticated
USING (status = 'active');

-- 2) Owners can view their own properties
CREATE POLICY "Users can view their own properties"
ON public.properties
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- 3) Owners can insert their own properties
CREATE POLICY "Users can insert their own properties"
ON public.properties
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- 4) Owners can update their own properties
CREATE POLICY "Users can update their own properties"
ON public.properties
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id);

-- 5) Owners can delete their own properties
CREATE POLICY "Users can delete their own properties"
ON public.properties
FOR DELETE
TO authenticated
USING (auth.uid() = user_id);

-- Recreate public views with SECURITY INVOKER so that RLS of the querying user applies
CREATE OR REPLACE VIEW public.properties_public
WITH (security_invoker = true) AS
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
  featured,
  created_at,
  updated_at,
  amenities,
  images,
  status,
  youtube_link,
  whatsapp_link
FROM public.properties
WHERE status = 'active';

CREATE OR REPLACE VIEW public.public_properties
WITH (security_invoker = true) AS
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
  featured,
  created_at,
  updated_at,
  amenities,
  images,
  status,
  youtube_link,
  whatsapp_link
FROM public.properties
WHERE status = 'active';