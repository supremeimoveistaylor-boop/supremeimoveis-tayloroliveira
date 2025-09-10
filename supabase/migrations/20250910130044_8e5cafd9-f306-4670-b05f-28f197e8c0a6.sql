-- Drop existing view and recreate with security_invoker
-- Fixes linter error: Security Definer View
DROP VIEW IF EXISTS public.public_properties;

-- Recreate the view with invoker's rights for enhanced security
CREATE VIEW public.public_properties
WITH (security_invoker = on)
AS
SELECT 
  id,
  title,
  description,
  price,
  location,
  property_type,
  purpose,
  bedrooms,
  bathrooms,
  parking_spaces,
  area,
  featured,
  created_at,
  updated_at,
  amenities,
  images,
  status,
  whatsapp_link,
  youtube_link
FROM public.properties
WHERE status = 'active';

-- Grant appropriate permissions
GRANT SELECT ON public.public_properties TO anon, authenticated;