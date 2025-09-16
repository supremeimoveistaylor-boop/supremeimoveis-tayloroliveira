-- Fix public access to properties for anonymous users

-- Remove the existing public policy and create a new one for anonymous users
DROP POLICY IF EXISTS "Public can view active properties" ON public.properties;

-- Create policy that allows both anonymous and authenticated users to view active properties
CREATE POLICY "Anyone can view active properties" 
ON public.properties 
FOR SELECT 
TO anon, authenticated
USING (status = 'active'::text);

-- Also grant explicit access to the properties_public view for anonymous users
GRANT SELECT ON public.properties_public TO anon;
GRANT SELECT ON public.properties_public TO authenticated;