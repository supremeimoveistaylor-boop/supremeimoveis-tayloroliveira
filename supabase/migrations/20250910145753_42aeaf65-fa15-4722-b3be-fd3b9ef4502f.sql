-- Fix SECURITY DEFINER views by switching to SECURITY INVOKER without changing column order

-- RLS policy cleanup and creation (safe if already adjusted)
ALTER TABLE public.properties ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public can view active properties" ON public.properties;
DROP POLICY IF EXISTS "Users can view their own properties" ON public.properties;
DROP POLICY IF EXISTS "Users can insert their own properties" ON public.properties;
DROP POLICY IF EXISTS "Users can update their own properties" ON public.properties;
DROP POLICY IF EXISTS "Users can delete their own properties" ON public.properties;
DROP POLICY IF EXISTS "Anon can view active properties via view" ON public.properties;
DROP POLICY IF EXISTS "Authenticated users can view active properties" ON public.properties;
DROP POLICY IF EXISTS "Authenticated users can view all active properties" ON public.properties;
DROP POLICY IF EXISTS "Users can manage their own properties" ON public.properties;

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

-- Change view run context to invoker to respect RLS of querying user
ALTER VIEW public.properties_public SET (security_invoker = true);
ALTER VIEW public.public_properties SET (security_invoker = true);