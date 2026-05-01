
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND tablename = 'channel_messages'
  ) THEN
    EXECUTE 'ALTER PUBLICATION supabase_realtime ADD TABLE public.channel_messages';
  END IF;
END $$;

ALTER TABLE public.leads REPLICA IDENTITY FULL;
ALTER TABLE public.omnichat_messages REPLICA IDENTITY FULL;
ALTER TABLE public.omnichat_conversations REPLICA IDENTITY FULL;
ALTER TABLE public.channel_messages REPLICA IDENTITY FULL;
