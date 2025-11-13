
-- Drop existing complex policy
DROP POLICY IF EXISTS "Whitelisted users can upload property images" ON storage.objects;

-- Create simpler, more reliable policy
CREATE POLICY "Whitelisted users can upload property images"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'property-images' 
  AND is_current_user_whitelisted()
);

-- Ensure the update policy is also simplified
DROP POLICY IF EXISTS "Whitelisted users can update property images" ON storage.objects;

CREATE POLICY "Whitelisted users can update property images"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'property-images' 
  AND auth.uid() = owner
  AND is_current_user_whitelisted()
)
WITH CHECK (
  bucket_id = 'property-images'
  AND is_current_user_whitelisted()
);

-- Ensure the delete policy is also simplified
DROP POLICY IF EXISTS "Whitelisted users can delete property images" ON storage.objects;

CREATE POLICY "Whitelisted users can delete property images"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'property-images' 
  AND auth.uid() = owner
  AND is_current_user_whitelisted()
);
