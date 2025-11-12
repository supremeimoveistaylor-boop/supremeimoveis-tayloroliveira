-- Create function to check if email is whitelisted
CREATE OR REPLACE FUNCTION public.is_email_whitelisted(user_email TEXT)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT user_email IN (
    'crv.taylor@gmail.com',
    'supremeimoveis.taylor@gmail.com'
  );
$$;

-- Create function to validate user on signup
CREATE OR REPLACE FUNCTION public.validate_whitelisted_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Check if email is whitelisted
  IF NOT public.is_email_whitelisted(NEW.email) THEN
    RAISE EXCEPTION 'Email não autorizado. Apenas emails aprovados podem acessar esta plataforma.';
  END IF;
  RETURN NEW;
END;
$$;

-- Create trigger to validate on user creation
DROP TRIGGER IF EXISTS validate_user_email_trigger ON auth.users;
CREATE TRIGGER validate_user_email_trigger
  BEFORE INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.validate_whitelisted_user();

-- Update profiles RLS to check whitelist
DROP POLICY IF EXISTS "Block non-whitelisted users" ON public.profiles;
CREATE POLICY "Block non-whitelisted users"
ON public.profiles
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM auth.users
    WHERE auth.users.id = auth.uid()
    AND public.is_email_whitelisted(auth.users.email)
  )
);

-- Update properties RLS to check whitelist
DROP POLICY IF EXISTS "Block non-whitelisted property access" ON public.properties;
CREATE POLICY "Block non-whitelisted property access"
ON public.properties
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM auth.users
    WHERE auth.users.id = auth.uid()
    AND public.is_email_whitelisted(auth.users.email)
  )
);