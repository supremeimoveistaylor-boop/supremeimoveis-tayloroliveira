-- Create a SECURITY DEFINER helper to check whitelist without direct access to auth.users in policies
CREATE OR REPLACE FUNCTION public.is_current_user_whitelisted()
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _email text;
BEGIN
  -- Fetch the email of the current authenticated user from auth.users
  SELECT email INTO _email FROM auth.users WHERE id = auth.uid();
  IF _email IS NULL THEN
    RETURN false;
  END IF;
  RETURN public.is_email_whitelisted(_email);
END;
$$;

-- Update restrictive property access policy to use the helper (avoids direct auth.users access in RLS)
DROP POLICY IF EXISTS "Block non-whitelisted property access" ON public.properties;
CREATE POLICY "Block non-whitelisted property access"
ON public.properties
AS RESTRICTIVE
FOR ALL
TO authenticated
USING (public.is_current_user_whitelisted());

-- Ensure the whitelisted SELECT policy also uses the helper
DROP POLICY IF EXISTS "Whitelisted users can view all properties" ON public.properties;
CREATE POLICY "Whitelisted users can view all properties"
ON public.properties
FOR SELECT
TO authenticated
USING (public.is_current_user_whitelisted());

-- Update restrictive profiles policy to use the helper
DROP POLICY IF EXISTS "Block non-whitelisted users" ON public.profiles;
CREATE POLICY "Block non-whitelisted users"
ON public.profiles
AS RESTRICTIVE
FOR ALL
TO authenticated
USING (public.is_current_user_whitelisted());