-- =====================================================
-- UPDATE CLEANUP FUNCTION TO INCLUDE chat_messages
-- =====================================================

CREATE OR REPLACE FUNCTION public.cleanup_old_chat_messages()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  deleted_general integer := 0;
  deleted_chat integer := 0;
  total_deleted integer := 0;
BEGIN
  -- Delete messages older than 48 hours from general_chat_messages
  DELETE FROM public.general_chat_messages
  WHERE created_at < (now() - interval '48 hours');
  GET DIAGNOSTICS deleted_general = ROW_COUNT;
  
  -- Delete messages older than 48 hours from chat_messages
  DELETE FROM public.chat_messages
  WHERE created_at < (now() - interval '48 hours');
  GET DIAGNOSTICS deleted_chat = ROW_COUNT;
  
  total_deleted := deleted_general + deleted_chat;
  
  -- Log the cleanup action
  INSERT INTO public.security_logs (user_id, action, table_name, metadata)
  VALUES (
    NULL,
    'CHAT_CLEANUP',
    'chat_messages',
    jsonb_build_object(
      'deleted_general', deleted_general,
      'deleted_chat', deleted_chat,
      'total_deleted', total_deleted,
      'retention_hours', 48
    )
  );
  
  RETURN total_deleted;
END;
$function$;

-- =====================================================
-- CREATE pg_cron JOB FOR AUTOMATIC CLEANUP (every 6h)
-- =====================================================
-- Note: pg_cron extension must be enabled in Supabase dashboard

-- First, remove existing job if any
SELECT cron.unschedule('cleanup-old-chat-messages') 
WHERE EXISTS (
  SELECT 1 FROM cron.job WHERE jobname = 'cleanup-old-chat-messages'
);

-- Schedule new job to run every 6 hours
SELECT cron.schedule(
  'cleanup-old-chat-messages',
  '0 */6 * * *',  -- Every 6 hours
  $$SELECT public.cleanup_old_chat_messages()$$
);