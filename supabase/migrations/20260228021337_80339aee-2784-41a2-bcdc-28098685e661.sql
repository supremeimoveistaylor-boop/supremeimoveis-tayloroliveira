-- Fix Instagram ID mismatch: Meta sends IG ID 17841401852459484 but DB has 17841461211446071
-- This is a data binding fix, not a logic change
UPDATE public.meta_channel_connections 
SET instagram_id = '17841401852459484',
    updated_at = now()
WHERE id = '9261bf81-bb1e-4721-9bb0-cfecca29bb22' 
AND channel_type = 'instagram'
AND instagram_id = '17841461211446071';