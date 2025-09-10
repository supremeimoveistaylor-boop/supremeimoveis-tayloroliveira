-- Fix the remaining function that's causing the search path warning
DROP FUNCTION IF EXISTS public.validate_property_input() CASCADE;

CREATE OR REPLACE FUNCTION public.validate_property_input()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $function$
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
$function$;

-- Drop and recreate log property operations function with search_path
DROP FUNCTION IF EXISTS public.log_property_operations() CASCADE;

CREATE OR REPLACE FUNCTION public.log_property_operations()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $function$
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
$function$;