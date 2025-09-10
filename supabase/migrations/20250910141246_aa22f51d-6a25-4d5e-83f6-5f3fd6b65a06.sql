-- Revoke direct public access to sensitive columns in base table
REVOKE SELECT ON TABLE public.properties FROM anon;

-- Create a dedicated public view without owner information
CREATE OR REPLACE VIEW public.properties_public
WITH (security_barrier) AS
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
  amenities,
  area,
  images,
  status,
  featured,
  youtube_link,
  whatsapp_link,
  created_at,
  updated_at
FROM public.properties
WHERE status = 'active';

-- Grant read access to the view for public and authenticated users
GRANT SELECT ON public.properties_public TO anon, authenticated;