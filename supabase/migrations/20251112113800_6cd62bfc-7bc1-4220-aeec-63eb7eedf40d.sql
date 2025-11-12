-- Add property_code column to properties table
ALTER TABLE public.properties 
ADD COLUMN property_code TEXT UNIQUE;

-- Create function to generate unique property code
CREATE OR REPLACE FUNCTION public.generate_property_code()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_code TEXT;
  code_exists BOOLEAN;
BEGIN
  LOOP
    -- Generate code in format IM-XXXXXX (IM = Imóvel)
    new_code := 'IM-' || LPAD(FLOOR(RANDOM() * 999999)::TEXT, 6, '0');
    
    -- Check if code already exists
    SELECT EXISTS(SELECT 1 FROM properties WHERE property_code = new_code) INTO code_exists;
    
    -- Exit loop if code is unique
    EXIT WHEN NOT code_exists;
  END LOOP;
  
  RETURN new_code;
END;
$$;

-- Create trigger to auto-generate property code on insert
CREATE OR REPLACE FUNCTION public.set_property_code()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.property_code IS NULL THEN
    NEW.property_code := public.generate_property_code();
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trigger_set_property_code
BEFORE INSERT ON public.properties
FOR EACH ROW
EXECUTE FUNCTION public.set_property_code();

-- Update existing properties with unique codes
DO $$
DECLARE
  prop RECORD;
BEGIN
  FOR prop IN SELECT id FROM properties WHERE property_code IS NULL
  LOOP
    UPDATE properties 
    SET property_code = public.generate_property_code()
    WHERE id = prop.id;
  END LOOP;
END;
$$;

-- Make property_code NOT NULL after setting values
ALTER TABLE public.properties 
ALTER COLUMN property_code SET NOT NULL;