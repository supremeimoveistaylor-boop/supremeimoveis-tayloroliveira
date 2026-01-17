-- Fix company_settings public access vulnerability
-- This data should only be accessible to admins since edge functions use service role

DROP POLICY IF EXISTS "Public can view company settings" ON public.company_settings;

-- Only admins should view company settings
CREATE POLICY "Only admins can view company settings"
ON public.company_settings
FOR SELECT
USING (has_role(auth.uid(), 'admin'::user_role));