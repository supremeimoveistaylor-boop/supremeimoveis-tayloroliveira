-- Allow whitelisted users to view all properties
DROP POLICY IF EXISTS "Whitelisted users can view all properties" ON public.properties;
CREATE POLICY "Whitelisted users can view all properties"
ON public.properties
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM auth.users
    WHERE auth.users.id = auth.uid()
    AND public.is_email_whitelisted(auth.users.email)
  )
);
