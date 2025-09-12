-- Drop existing policies to recreate them with better security
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert their own profile" ON public.profiles;

-- Recreate policies with stronger security constraints
-- Only authenticated users can view their own profile data
CREATE POLICY "Authenticated users can view their own profile"
ON public.profiles
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- Only authenticated users can update their own profile
CREATE POLICY "Authenticated users can update their own profile"
ON public.profiles
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Only authenticated users can insert their own profile
CREATE POLICY "Authenticated users can insert their own profile"
ON public.profiles
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- Prevent any DELETE operations for additional security
CREATE POLICY "Prevent profile deletion"
ON public.profiles
FOR DELETE
TO authenticated
USING (false);

-- Add security function to validate profile data
CREATE OR REPLACE FUNCTION public.validate_profile_data()
RETURNS TRIGGER AS $$
BEGIN
    -- Sanitize phone number (remove any potential malicious content)
    IF NEW.phone IS NOT NULL THEN
        NEW.phone = regexp_replace(NEW.phone, '[^0-9\+\-\(\) ]', '', 'g');
    END IF;
    
    -- Sanitize full name
    IF NEW.full_name IS NOT NULL THEN
        NEW.full_name = regexp_replace(NEW.full_name, '[<>]', '', 'g');
    END IF;
    
    -- Ensure user_id cannot be changed after creation
    IF TG_OP = 'UPDATE' AND OLD.user_id != NEW.user_id THEN
        RAISE EXCEPTION 'Cannot change user_id';
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Add trigger for profile validation
DROP TRIGGER IF EXISTS validate_profile_data_trigger ON public.profiles;
CREATE TRIGGER validate_profile_data_trigger
    BEFORE INSERT OR UPDATE ON public.profiles
    FOR EACH ROW
    EXECUTE FUNCTION public.validate_profile_data();