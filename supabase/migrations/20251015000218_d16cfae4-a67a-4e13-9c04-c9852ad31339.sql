-- Complete fix for property images storage and database functionality
-- This will ensure all uploads work correctly

-- First, ensure the property-images bucket exists and is public
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'property-images', 
  'property-images', 
  true, 
  52428800, -- 50MB limit
  ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif']
) ON CONFLICT (id) DO UPDATE SET
  public = true,
  file_size_limit = 52428800,
  allowed_mime_types = ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif'];

-- Drop all existing storage policies first to start fresh
DROP POLICY IF EXISTS "public can view property images" ON storage.objects;
DROP POLICY IF EXISTS "auth users can upload property images in own property folder" ON storage.objects;
DROP POLICY IF EXISTS "auth users can update own property images" ON storage.objects;
DROP POLICY IF EXISTS "auth users can delete own property images" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can view property images" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload property images" ON storage.objects;
DROP POLICY IF EXISTS "Users can update their own property images" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their own property images" ON storage.objects;

-- Create comprehensive storage policies
-- 1. Allow everyone to view/download property images (public read)
CREATE POLICY "Anyone can view property images"
ON storage.objects
FOR SELECT
USING (bucket_id = 'property-images');

-- 2. Allow authenticated users to upload images
CREATE POLICY "Authenticated users can upload property images"
ON storage.objects
FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'property-images');

-- 3. Allow authenticated users to update their own images
CREATE POLICY "Users can update their own property images"
ON storage.objects
FOR UPDATE TO authenticated
USING (bucket_id = 'property-images' AND auth.uid() = owner)
WITH CHECK (bucket_id = 'property-images');

-- 4. Allow authenticated users to delete their own images
CREATE POLICY "Users can delete their own property images"
ON storage.objects
FOR DELETE TO authenticated
USING (bucket_id = 'property-images' AND auth.uid() = owner);

-- Ensure properties table has proper structure for images
-- Add images column if it doesn't exist or modify it
DO $$
BEGIN
    -- Check if images column exists and is the right type
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'properties' 
        AND column_name = 'images' 
        AND table_schema = 'public'
    ) THEN
        ALTER TABLE public.properties ADD COLUMN images text[] DEFAULT '{}';
    END IF;
END $$;

-- Ensure the images column allows NULL and has proper default
ALTER TABLE public.properties 
ALTER COLUMN images SET DEFAULT '{}',
ALTER COLUMN images DROP NOT NULL;

-- Create index on images for better performance
CREATE INDEX IF NOT EXISTS idx_properties_images 
ON public.properties USING GIN(images);

-- Ensure proper RLS policies exist on properties table
-- Allow users to insert their own properties
DROP POLICY IF EXISTS "Users can insert their own properties" ON public.properties;
CREATE POLICY "Users can insert their own properties"
ON public.properties
FOR INSERT TO authenticated
WITH CHECK (auth.uid() = user_id);

-- Allow users to update their own properties
DROP POLICY IF EXISTS "Users can update their own properties" ON public.properties;
CREATE POLICY "Users can update their own properties"
ON public.properties
FOR UPDATE TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Allow users to view their own properties
DROP POLICY IF EXISTS "Users can view their own properties" ON public.properties;
CREATE POLICY "Users can view their own properties"
ON public.properties
FOR SELECT TO authenticated
USING (auth.uid() = user_id);

-- Allow anyone to view active properties (for public listing)
DROP POLICY IF EXISTS "Anyone can view active properties" ON public.properties;
CREATE POLICY "Anyone can view active properties"
ON public.properties
FOR SELECT
USING (status = 'active');

-- Admin policies
DROP POLICY IF EXISTS "Admins can view all properties" ON public.properties;
CREATE POLICY "Admins can view all properties"
ON public.properties
FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = auth.uid() AND role = 'admin'
  )
);

DROP POLICY IF EXISTS "Admins can update all properties" ON public.properties;
CREATE POLICY "Admins can update all properties"
ON public.properties
FOR UPDATE TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = auth.uid() AND role = 'admin'
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = auth.uid() AND role = 'admin'
  )
);

DROP POLICY IF EXISTS "Admins can delete all properties" ON public.properties;
CREATE POLICY "Admins can delete all properties"
ON public.properties
FOR DELETE TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = auth.uid() AND role = 'admin'
  )
);

-- Ensure user_id column is NOT NULL for security
ALTER TABLE public.properties 
ALTER COLUMN user_id SET NOT NULL;