-- Allow anon to read only active rows (needed for view queries), while base table direct SELECT is revoked
CREATE POLICY "Anon can view active properties via view"
ON public.properties
FOR SELECT
TO anon
USING (status = 'active');