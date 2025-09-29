-- Fix security vulnerabilities by ensuring proper RLS policies
-- (Corrected version without trying to enable RLS on views)

-- 1. Drop any incorrect policies that might be allowing public access to profiles
DO $$ 
DECLARE
    r RECORD;
BEGIN
    -- Check for any policies on profiles that allow public access
    FOR r IN SELECT policyname FROM pg_policies WHERE tablename = 'profiles' AND (roles @> '{anon}' OR roles @> '{public}') AND policyname != 'Deny anonymous access to profiles'
    LOOP
        EXECUTE 'DROP POLICY IF EXISTS "' || r.policyname || '" ON public.profiles';
        RAISE NOTICE 'Dropped potentially unsafe policy: %', r.policyname;
    END LOOP;
END $$;

-- 2. Ensure profiles table has strict RLS policies
-- Drop existing policies and recreate them securely
DROP POLICY IF EXISTS "Authenticated users can view their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Authenticated users can update their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Authenticated users can insert their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Prevent profile deletion" ON public.profiles;
DROP POLICY IF EXISTS "Deny anonymous access to profiles" ON public.profiles;

-- Recreate secure policies for profiles
CREATE POLICY "Users can view own profile only"
ON public.profiles
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can update own profile only"
ON public.profiles
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can insert own profile only"
ON public.profiles
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- Prevent any profile deletion for data integrity
CREATE POLICY "Prevent all profile deletion"
ON public.profiles
FOR DELETE
TO authenticated
USING (false);

-- Explicitly deny anonymous access to profiles
CREATE POLICY "Block anonymous access to profiles"
ON public.profiles
FOR ALL
TO anon
USING (false);

-- 3. Fix security_logs table - only allow users to see their own logs
DROP POLICY IF EXISTS "Authenticated users can view their own security logs" ON public.security_logs;

CREATE POLICY "Users can view own security logs only"
ON public.security_logs
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- Block all anonymous access to security logs
CREATE POLICY "Block anonymous access to security logs"
ON public.security_logs
FOR ALL
TO anon
USING (false);

-- 4. Add admin access to profiles for the Admin panel
CREATE POLICY "Admins can view all profiles"
ON public.profiles
FOR SELECT
TO authenticated
USING (get_user_role(auth.uid()) = 'admin'::user_role);

CREATE POLICY "Admins can update user roles"
ON public.profiles
FOR UPDATE
TO authenticated
USING (get_user_role(auth.uid()) = 'admin'::user_role)
WITH CHECK (get_user_role(auth.uid()) = 'admin'::user_role);