-- Update storage policies to check whitelist for uploads

-- Drop existing upload policy
DROP POLICY IF EXISTS "Users can upload to property-images" ON storage.objects;

-- Create new policy that checks whitelist
CREATE POLICY "Whitelisted users can upload property images"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'property-images'
  AND EXISTS (
    SELECT 1 FROM auth.users
    WHERE auth.users.id = auth.uid()
    AND public.is_email_whitelisted(auth.users.email)
  )
);

-- Update the update policy as well
DROP POLICY IF EXISTS "Users can update their own property images" ON storage.objects;

CREATE POLICY "Whitelisted users can update property images"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'property-images'
  AND auth.uid() = owner
  AND EXISTS (
    SELECT 1 FROM auth.users
    WHERE auth.users.id = auth.uid()
    AND public.is_email_whitelisted(auth.users.email)
  )
)
WITH CHECK (
  bucket_id = 'property-images'
  AND EXISTS (
    SELECT 1 FROM auth.users
    WHERE auth.users.id = auth.uid()
    AND public.is_email_whitelisted(auth.users.email)
  )
);

-- Update the delete policy as well
DROP POLICY IF EXISTS "Users can delete their own property images" ON storage.objects;

CREATE POLICY "Whitelisted users can delete property images"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'property-images'
  AND auth.uid() = owner
  AND EXISTS (
    SELECT 1 FROM auth.users
    WHERE auth.users.id = auth.uid()
    AND public.is_email_whitelisted(auth.users.email)
  )
);