-- Atualizar função de limpeza para incluir chat_sessions
CREATE OR REPLACE FUNCTION public.cleanup_old_chat_messages()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  deleted_general integer := 0;
  deleted_chat integer := 0;
  deleted_sessions integer := 0;
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
  
  -- Delete chat sessions older than 48 hours
  DELETE FROM public.chat_sessions
  WHERE created_at < (now() - interval '48 hours');
  GET DIAGNOSTICS deleted_sessions = ROW_COUNT;
  
  total_deleted := deleted_general + deleted_chat + deleted_sessions;
  
  -- Log the cleanup action
  INSERT INTO public.security_logs (user_id, action, table_name, metadata)
  VALUES (
    NULL,
    'CHAT_CLEANUP',
    'chat_messages',
    jsonb_build_object(
      'deleted_general', deleted_general,
      'deleted_chat', deleted_chat,
      'deleted_sessions', deleted_sessions,
      'total_deleted', total_deleted,
      'retention_hours', 48
    )
  );
  
  RETURN total_deleted;
END;
$$;