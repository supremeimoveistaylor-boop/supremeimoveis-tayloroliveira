-- Update Instagram conversations with NULL or numeric-only contact_name to friendly fallback
UPDATE public.omnichat_conversations
SET contact_name = 'Instagram User #' || RIGHT(external_contact_id, 4)
WHERE channel = 'instagram'
  AND (contact_name IS NULL OR contact_name ~ '^\d+$');

-- Also update channel_messages with NULL or numeric-only contact_name
UPDATE public.channel_messages
SET contact_name = 'Instagram User #' || RIGHT(contact_instagram_id, 4)
WHERE contact_instagram_id IS NOT NULL
  AND (contact_name IS NULL OR contact_name ~ '^\d+$');
