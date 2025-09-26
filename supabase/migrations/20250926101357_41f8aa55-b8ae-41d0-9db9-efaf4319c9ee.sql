-- Create user roles system
CREATE TYPE public.user_role AS ENUM ('admin', 'user');

-- Add role column to profiles table
ALTER TABLE public.profiles 
ADD COLUMN role public.user_role DEFAULT 'user';

-- Create security definer function to check user role
CREATE OR REPLACE FUNCTION public.get_user_role(user_id_param UUID)
RETURNS public.user_role AS $$
BEGIN
  RETURN (
    SELECT role 
    FROM public.profiles 
    WHERE user_id = user_id_param
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE SET search_path = public;

-- Create policy for admins to manage all properties
CREATE POLICY "Admins can view all properties" 
ON public.properties 
FOR SELECT 
USING (public.get_user_role(auth.uid()) = 'admin');

CREATE POLICY "Admins can update all properties" 
ON public.properties 
FOR UPDATE 
USING (public.get_user_role(auth.uid()) = 'admin');

CREATE POLICY "Admins can delete all properties" 
ON public.properties 
FOR DELETE 
USING (public.get_user_role(auth.uid()) = 'admin');

-- Set the first user as admin (you can change this later)
UPDATE public.profiles 
SET role = 'admin' 
WHERE user_id = (
  SELECT user_id 
  FROM public.profiles 
  ORDER BY created_at ASC 
  LIMIT 1
);