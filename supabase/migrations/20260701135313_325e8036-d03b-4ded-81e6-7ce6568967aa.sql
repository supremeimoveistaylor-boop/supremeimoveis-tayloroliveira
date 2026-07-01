
-- 1) Restrict inserts on general_chat_messages to admins only
DROP POLICY IF EXISTS "Users can insert their own messages" ON public.general_chat_messages;
DROP POLICY IF EXISTS "Authenticated users can insert messages" ON public.general_chat_messages;
DROP POLICY IF EXISTS "general_chat_messages_insert" ON public.general_chat_messages;

CREATE POLICY "Only admins can post to internal chat"
ON public.general_chat_messages
FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() = user_id
  AND (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin'))
);

-- 2) Fix storage policy WITH CHECK to also enforce ownership
DROP POLICY IF EXISTS "Whitelisted users can update property images" ON storage.objects;

CREATE POLICY "Whitelisted users can update property images"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'property-images'
  AND auth.uid() = owner
  AND public.is_current_user_whitelisted()
)
WITH CHECK (
  bucket_id = 'property-images'
  AND auth.uid() = owner
  AND public.is_current_user_whitelisted()
);
