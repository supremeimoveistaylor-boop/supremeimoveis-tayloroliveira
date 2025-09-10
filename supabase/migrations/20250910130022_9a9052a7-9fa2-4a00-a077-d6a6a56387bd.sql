-- Secure public view for properties using invoker's rights
-- Fixes linter error: Security Definer View (set security_invoker)
CREATE OR REPLACE VIEW public.public_properties
WITH (security_invoker = on)
AS
SELECT 
  id,
  title,
  description,
  price,
  location,
  bedrooms,
  bathrooms,
  parking_spaces,
  area,
  featured,
  created_at,
  amenities,
  images,
  property_type,
  purpose,
  status,
  whatsapp_link,
  youtube_link
FROM public.properties
WHERE status = 'active';

-- Ensure appropriate permissions for view access
GRANT SELECT ON public.public_properties TO anon, authenticated;