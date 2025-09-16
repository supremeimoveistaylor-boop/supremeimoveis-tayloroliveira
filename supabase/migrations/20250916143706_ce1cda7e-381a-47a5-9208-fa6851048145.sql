-- CRITICAL SECURITY FIXES (CORRECTED)

-- 1. Fix security_logs RLS policy - ensure only authenticated users can access their own logs
DROP POLICY IF EXISTS "Users can only view their own security logs" ON public.security_logs;

CREATE POLICY "Authenticated users can view their own security logs" 
ON public.security_logs 
FOR SELECT 
TO authenticated
USING (auth.uid() = user_id);

-- 2. Enhanced input validation for properties - update existing function
CREATE OR REPLACE FUNCTION public.validate_property_input()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
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
    
    -- Enhanced text sanitization to prevent XSS
    NEW.title = regexp_replace(NEW.title, '[<>"\''&]', '', 'g');
    NEW.description = regexp_replace(COALESCE(NEW.description, ''), '[<>"\''&]', '', 'g');
    NEW.location = regexp_replace(NEW.location, '[<>"\''&]', '', 'g');
    
    -- Validate and sanitize URLs
    IF NEW.youtube_link IS NOT NULL THEN
        -- Basic YouTube URL validation
        IF NEW.youtube_link !~ '^https?://(www\.)?(youtube\.com|youtu\.be)/' THEN
            RAISE EXCEPTION 'Invalid YouTube URL format';
        END IF;
        NEW.youtube_link = regexp_replace(NEW.youtube_link, '[<>"\''&]', '', 'g');
    END IF;
    
    IF NEW.whatsapp_link IS NOT NULL THEN
        -- Basic WhatsApp URL validation
        IF NEW.whatsapp_link !~ '^https?://(wa\.me|api\.whatsapp\.com)/' THEN
            RAISE EXCEPTION 'Invalid WhatsApp URL format';
        END IF;
        NEW.whatsapp_link = regexp_replace(NEW.whatsapp_link, '[<>"\''&]', '', 'g');
    END IF;
    
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
    
    -- Limit title and description length
    IF length(NEW.title) > 200 THEN
        RAISE EXCEPTION 'Title too long (max 200 characters)';
    END IF;
    
    IF NEW.description IS NOT NULL AND length(NEW.description) > 5000 THEN
        RAISE EXCEPTION 'Description too long (max 5000 characters)';
    END IF;
    
    RETURN NEW;
END;
$function$;

-- 3. Add trigger for property validation if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_trigger 
        WHERE tgname = 'validate_property_input_trigger'
    ) THEN
        CREATE TRIGGER validate_property_input_trigger
        BEFORE INSERT OR UPDATE ON public.properties
        FOR EACH ROW EXECUTE FUNCTION public.validate_property_input();
    END IF;
END $$;

-- 4. Add security logging function for failed authentication attempts
CREATE OR REPLACE FUNCTION public.log_security_event(
    event_type text,
    event_details jsonb DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
    INSERT INTO public.security_logs (
        user_id,
        action,
        table_name,
        metadata,
        created_at
    ) VALUES (
        auth.uid(),
        event_type,
        'security_events',
        event_details,
        now()
    );
END;
$function$;