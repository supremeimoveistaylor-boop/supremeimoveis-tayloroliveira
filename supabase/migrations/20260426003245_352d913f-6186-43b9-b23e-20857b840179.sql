-- Fix: agent_status table had a public-readable policy exposing user_ids and channel statuses
-- Remove the overly-permissive "Service can read status" policy (USING true on {public})
DROP POLICY IF EXISTS "Service can read status" ON public.agent_status;

-- Allow service_role (used by edge functions) to read all agent statuses
CREATE POLICY "Service role can read all agent status"
ON public.agent_status
FOR SELECT
TO service_role
USING (true);

-- Allow authenticated admins to read all (for monitoring panels)
CREATE POLICY "Admins can view all agent status"
ON public.agent_status
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::user_role));

-- Note: existing policies "Users can manage own status" (auth.uid() = user_id)
-- and "Super admin can view all status" remain, so authenticated users still see
-- their own row and super_admins see everything. Anonymous access is now blocked.