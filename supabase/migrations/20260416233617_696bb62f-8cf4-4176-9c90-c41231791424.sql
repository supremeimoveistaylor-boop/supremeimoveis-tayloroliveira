-- Drop the overly permissive public policy
DROP POLICY IF EXISTS "Service can manage storage cleanup logs" ON public.storage_cleanup_logs;

-- Create admin-only read policy
CREATE POLICY "Admins can read storage cleanup logs"
  ON public.storage_cleanup_logs
  FOR SELECT
  TO authenticated
  USING (public.is_admin(auth.uid()) OR public.is_super_admin(auth.uid()));

-- Create service-role insert policy (for edge functions)
CREATE POLICY "Service role can insert storage cleanup logs"
  ON public.storage_cleanup_logs
  FOR INSERT
  TO service_role
  WITH CHECK (true);