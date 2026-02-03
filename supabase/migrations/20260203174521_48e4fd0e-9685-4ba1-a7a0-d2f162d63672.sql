-- Create function to clean up old chat messages (48h retention)
-- This is ADDITIVE ONLY - does not modify any existing structures

CREATE OR REPLACE FUNCTION public.cleanup_old_chat_messages()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  deleted_count integer;
BEGIN
  -- Delete messages older than 48 hours from general_chat_messages
  DELETE FROM public.general_chat_messages
  WHERE created_at < (now() - interval '48 hours');
  
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  
  -- Log the cleanup action
  INSERT INTO public.security_logs (user_id, action, table_name, metadata)
  VALUES (
    NULL,
    'CHAT_CLEANUP',
    'general_chat_messages',
    jsonb_build_object('deleted_count', deleted_count, 'retention_hours', 48)
  );
  
  RETURN deleted_count;
END;
$function$;

-- Enable pg_cron extension if not already enabled
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Schedule cleanup to run every 6 hours
SELECT cron.schedule(
  'cleanup-old-chat-messages',
  '0 */6 * * *',
  'SELECT public.cleanup_old_chat_messages();'
);