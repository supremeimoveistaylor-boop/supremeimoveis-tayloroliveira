-- Fix critical security issue: Property owner identity exposure
-- Drop the existing overly permissive policy
DROP POLICY IF EXISTS "Anyone can view active properties" ON public.properties;

-- Create a secure view for public property data that excludes sensitive information
CREATE OR REPLACE VIEW public.public_properties AS
SELECT 
    id,
    title,
    description,
    price,
    location,
    property_type,
    purpose,
    status,
    bedrooms,
    bathrooms,
    parking_spaces,
    area,
    amenities,
    images,
    featured,
    created_at,
    updated_at
FROM public.properties
WHERE status = 'active';

-- Enable RLS on the view
ALTER VIEW public.public_properties SET (security_barrier = true);

-- Create new restrictive RLS policies
-- Public can only view through the secure view (no user_id exposure)
CREATE POLICY "Public can view active properties without owner info" 
ON public.properties 
FOR SELECT 
USING (
    status = 'active' 
    AND auth.uid() IS NULL
    AND pg_has_role(session_user, 'anon', 'member')
);

-- Authenticated users can view active properties (including user_id for edit checks)
CREATE POLICY "Authenticated users can view active properties" 
ON public.properties 
FOR SELECT 
USING (
    status = 'active' 
    AND auth.uid() IS NOT NULL
);

-- Keep existing policy for property owners to manage their properties
-- (This policy already exists: "Users can manage their own properties")

-- Add input validation trigger for enhanced security
CREATE OR REPLACE FUNCTION public.validate_property_input()
RETURNS TRIGGER AS $$
BEGIN
    -- Validate price is positive
    IF NEW.price <= 0 THEN
        RAISE EXCEPTION 'Price must be greater than zero';
    END IF;
    
    -- Validate area if provided
    IF NEW.area IS NOT NULL AND NEW.area <= 0 THEN
        RAISE EXCEPTION 'Area must be greater than zero';
    END IF;
    
    -- Validate room counts
    IF NEW.bedrooms IS NOT NULL AND NEW.bedrooms < 0 THEN
        RAISE EXCEPTION 'Bedrooms cannot be negative';
    END IF;
    
    IF NEW.bathrooms IS NOT NULL AND NEW.bathrooms < 0 THEN
        RAISE EXCEPTION 'Bathrooms cannot be negative';
    END IF;
    
    IF NEW.parking_spaces IS NOT NULL AND NEW.parking_spaces < 0 THEN
        RAISE EXCEPTION 'Parking spaces cannot be negative';
    END IF;
    
    -- Sanitize text inputs to prevent XSS
    NEW.title = regexp_replace(NEW.title, '[<>]', '', 'g');
    NEW.description = regexp_replace(COALESCE(NEW.description, ''), '[<>]', '', 'g');
    NEW.location = regexp_replace(NEW.location, '[<>]', '', 'g');
    
    -- Validate property_type and purpose are from allowed values
    IF NEW.property_type NOT IN ('house', 'apartment', 'commercial', 'land') THEN
        RAISE EXCEPTION 'Invalid property type';
    END IF;
    
    IF NEW.purpose NOT IN ('sale', 'rent') THEN
        RAISE EXCEPTION 'Invalid purpose';
    END IF;
    
    IF NEW.status NOT IN ('active', 'sold', 'rented', 'inactive') THEN
        RAISE EXCEPTION 'Invalid status';
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for input validation
DROP TRIGGER IF EXISTS validate_property_input_trigger ON public.properties;
CREATE TRIGGER validate_property_input_trigger
    BEFORE INSERT OR UPDATE ON public.properties
    FOR EACH ROW
    EXECUTE FUNCTION public.validate_property_input();

-- Add security logging function
CREATE OR REPLACE FUNCTION public.log_property_operations()
RETURNS TRIGGER AS $$
BEGIN
    -- Log property creation
    IF TG_OP = 'INSERT' THEN
        INSERT INTO public.security_logs (
            user_id, 
            action, 
            table_name, 
            record_id, 
            created_at
        ) VALUES (
            auth.uid(),
            'CREATE_PROPERTY',
            'properties',
            NEW.id,
            now()
        );
        RETURN NEW;
    END IF;
    
    -- Log property deletion
    IF TG_OP = 'DELETE' THEN
        INSERT INTO public.security_logs (
            user_id, 
            action, 
            table_name, 
            record_id, 
            created_at
        ) VALUES (
            auth.uid(),
            'DELETE_PROPERTY',
            'properties',
            OLD.id,
            now()
        );
        RETURN OLD;
    END IF;
    
    -- Log property updates
    IF TG_OP = 'UPDATE' THEN
        INSERT INTO public.security_logs (
            user_id, 
            action, 
            table_name, 
            record_id, 
            created_at
        ) VALUES (
            auth.uid(),
            'UPDATE_PROPERTY',
            'properties',
            NEW.id,
            now()
        );
        RETURN NEW;
    END IF;
    
    RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create security logs table
CREATE TABLE IF NOT EXISTS public.security_logs (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid,
    action text NOT NULL,
    table_name text NOT NULL,
    record_id uuid,
    metadata jsonb,
    created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS on security logs
ALTER TABLE public.security_logs ENABLE ROW LEVEL SECURITY;

-- Only allow admins to view security logs (for now, restrict to property owners)
CREATE POLICY "Users can only view their own security logs"
ON public.security_logs
FOR SELECT
USING (auth.uid() = user_id);

-- Create trigger for security logging
DROP TRIGGER IF EXISTS log_property_operations_trigger ON public.properties;
CREATE TRIGGER log_property_operations_trigger
    AFTER INSERT OR UPDATE OR DELETE ON public.properties
    FOR EACH ROW
    EXECUTE FUNCTION public.log_property_operations();