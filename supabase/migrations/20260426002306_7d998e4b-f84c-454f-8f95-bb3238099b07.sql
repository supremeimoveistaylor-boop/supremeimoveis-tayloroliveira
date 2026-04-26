-- Habilitar Realtime para a tabela leads
ALTER TABLE public.leads REPLICA IDENTITY FULL;

-- Adicionar à publicação supabase_realtime (idempotente)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'leads'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.leads;
  END IF;
END $$;