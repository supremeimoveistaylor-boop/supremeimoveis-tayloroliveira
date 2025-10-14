-- =====================================================
-- CRITICAL SECURITY FIX: Separate user roles from profiles table
-- This prevents privilege escalation attacks and recursive RLS issues
-- =====================================================

-- 1. Create dedicated user_roles table using existing user_role enum
CREATE TABLE IF NOT EXISTS public.user_roles (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    role user_role NOT NULL,
    assigned_at timestamp with time zone DEFAULT now() NOT NULL,
    assigned_by uuid REFERENCES auth.users(id),
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    UNIQUE (user_id, role)
);

-- 2. Enable RLS on user_roles table
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- 3. Migrate existing role data from profiles to user_roles
INSERT INTO public.user_roles (user_id, role, assigned_at)
SELECT user_id, role, created_at
FROM public.profiles
WHERE role IS NOT NULL
ON CONFLICT (user_id, role) DO NOTHING;

-- 4. Create security definer function to check roles (prevents recursive RLS)
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role user_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  );
$$;

-- 5. Create security definer function to get user role (replaces get_user_role)
CREATE OR REPLACE FUNCTION public.get_user_role_from_roles(_user_id uuid)
RETURNS user_role
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role
  FROM public.user_roles
  WHERE user_id = _user_id
  ORDER BY 
    CASE role
      WHEN 'admin' THEN 1
      WHEN 'user' THEN 2
    END
  LIMIT 1;
$$;

-- 6. Create RLS policies for user_roles table
-- Only admins can view all roles
CREATE POLICY "Admins can view all user roles"
ON public.user_roles
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Users can view their own roles
CREATE POLICY "Users can view their own roles"
ON public.user_roles
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- Only admins can assign roles
CREATE POLICY "Admins can insert user roles"
ON public.user_roles
FOR INSERT
TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Only admins can update roles
CREATE POLICY "Admins can update user roles"
ON public.user_roles
FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Only admins can delete roles
CREATE POLICY "Admins can delete user roles"
ON public.user_roles
FOR DELETE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- 7. Update existing RLS policies to use new has_role function
-- Drop old policies that use get_user_role
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Admins can update user roles" ON public.profiles;
DROP POLICY IF EXISTS "Admins can view all properties" ON public.properties;
DROP POLICY IF EXISTS "Admins can update all properties" ON public.properties;
DROP POLICY IF EXISTS "Admins can delete all properties" ON public.properties;

-- Recreate policies using new has_role function
CREATE POLICY "Admins can view all profiles"
ON public.profiles
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update all profiles"
ON public.profiles
FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can view all properties"
ON public.properties
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update all properties"
ON public.properties
FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete all properties"
ON public.properties
FOR DELETE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- 8. Add trigger to automatically assign 'user' role to new users
CREATE OR REPLACE FUNCTION public.assign_default_user_role()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'user')
  ON CONFLICT (user_id, role) DO NOTHING;
  RETURN NEW;
END;
$$;

-- Create trigger on auth.users table
DROP TRIGGER IF EXISTS on_auth_user_created_assign_role ON auth.users;
CREATE TRIGGER on_auth_user_created_assign_role
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.assign_default_user_role();

-- 9. Create audit log for role changes
CREATE OR REPLACE FUNCTION public.log_role_changes()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.security_logs (user_id, action, table_name, record_id, metadata)
    VALUES (
      auth.uid(),
      'ASSIGN_ROLE',
      'user_roles',
      NEW.id,
      jsonb_build_object('target_user', NEW.user_id, 'role', NEW.role)
    );
  ELSIF TG_OP = 'UPDATE' THEN
    INSERT INTO public.security_logs (user_id, action, table_name, record_id, metadata)
    VALUES (
      auth.uid(),
      'UPDATE_ROLE',
      'user_roles',
      NEW.id,
      jsonb_build_object('target_user', NEW.user_id, 'old_role', OLD.role, 'new_role', NEW.role)
    );
  ELSIF TG_OP = 'DELETE' THEN
    INSERT INTO public.security_logs (user_id, action, table_name, record_id, metadata)
    VALUES (
      auth.uid(),
      'REVOKE_ROLE',
      'user_roles',
      OLD.id,
      jsonb_build_object('target_user', OLD.user_id, 'role', OLD.role)
    );
  END IF;
  RETURN COALESCE(NEW, OLD);
END;
$$;

-- Create trigger for role change logging
DROP TRIGGER IF EXISTS log_user_role_changes ON public.user_roles;
CREATE TRIGGER log_user_role_changes
  AFTER INSERT OR UPDATE OR DELETE ON public.user_roles
  FOR EACH ROW
  EXECUTE FUNCTION public.log_role_changes();

-- 10. Create helper function to check if user is admin (for use in application code)
CREATE OR REPLACE FUNCTION public.is_admin(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.has_role(_user_id, 'admin');
$$;

-- 11. Add index for performance
CREATE INDEX IF NOT EXISTS idx_user_roles_user_id ON public.user_roles(user_id);
CREATE INDEX IF NOT EXISTS idx_user_roles_role ON public.user_roles(role);

-- 12. Add comment explaining the security model
COMMENT ON TABLE public.user_roles IS 'Stores user role assignments. Separated from profiles table to prevent privilege escalation. Uses security definer functions to avoid recursive RLS issues.';
COMMENT ON FUNCTION public.has_role IS 'Security definer function to check if a user has a specific role. Used in RLS policies to prevent recursive queries.';
COMMENT ON FUNCTION public.get_user_role_from_roles IS 'Returns the highest priority role for a user. Replaces get_user_role() which queried profiles table.';

-- NOTE: The role column in profiles table is kept for backward compatibility
-- but should be considered deprecated. All authorization checks should use
-- the user_roles table via has_role() or get_user_role_from_roles() functions.