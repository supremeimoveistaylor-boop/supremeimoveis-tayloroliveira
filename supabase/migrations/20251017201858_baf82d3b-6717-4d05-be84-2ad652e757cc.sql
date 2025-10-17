-- CRITICAL FIX: Remove role column from profiles table to prevent privilege escalation
-- The application correctly uses the user_roles table for authorization
-- Having a role column on profiles that users can update creates a privilege escalation vulnerability
ALTER TABLE public.profiles DROP COLUMN IF EXISTS role;

-- Drop redundant view (properties_public is identical to public_properties)
-- Keep public_properties as it's used in the codebase
DROP VIEW IF EXISTS public.properties_public;