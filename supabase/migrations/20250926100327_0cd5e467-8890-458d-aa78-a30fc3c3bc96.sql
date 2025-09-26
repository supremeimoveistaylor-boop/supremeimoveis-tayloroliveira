-- Add explicit policy to deny anonymous access to profiles table
-- This ensures that anonymous users cannot access any profile data

CREATE POLICY "Deny anonymous access to profiles" 
ON public.profiles 
FOR ALL 
TO anon
USING (false);