-- =====================================================
-- CORREÇÃO COMPLETA DE SEGURANÇA - SUPREME IMÓVEIS
-- =====================================================

-- 1. BROKERS: Remover acesso público aos dados de contato
DROP POLICY IF EXISTS "Public can view active brokers" ON public.brokers;

-- 2. GENERAL_CHAT_MESSAGES: Exigir autenticação para visualizar
DROP POLICY IF EXISTS "Authenticated users can view all chat messages" ON public.general_chat_messages;

CREATE POLICY "Only authenticated users can view chat messages"
ON public.general_chat_messages
FOR SELECT
TO authenticated
USING (auth.uid() IS NOT NULL);

-- 3. CHAT_MESSAGES: Restringir acesso - apenas admins e corretores
DROP POLICY IF EXISTS "Anyone can view chat messages by lead" ON public.chat_messages;

CREATE POLICY "Admins can view all chat messages"
ON public.chat_messages
FOR SELECT
USING (has_role(auth.uid(), 'admin'::user_role));

CREATE POLICY "Brokers can view their lead messages"
ON public.chat_messages
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM leads l
    JOIN brokers b ON b.id = l.broker_id
    WHERE l.id = chat_messages.lead_id
    AND b.user_id = auth.uid()
  )
);

-- 4. STORAGE: Tornar bucket chat-attachments privado
UPDATE storage.buckets 
SET public = false 
WHERE id = 'chat-attachments';

-- Remover políticas públicas de storage
DROP POLICY IF EXISTS "Anyone can upload chat attachments" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can view chat attachments" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete own chat attachments" ON storage.objects;

-- Apenas admins podem gerenciar anexos de chat
CREATE POLICY "Admins manage chat attachments"
ON storage.objects
FOR ALL
USING (
  bucket_id = 'chat-attachments' 
  AND has_role(auth.uid(), 'admin'::user_role)
);

-- Corretores podem ver anexos dos seus leads (usando storage.objects.name explicitamente)
CREATE POLICY "Brokers view their lead attachments"
ON storage.objects
FOR SELECT
USING (
  bucket_id = 'chat-attachments'
  AND EXISTS (
    SELECT 1 FROM leads l
    JOIN brokers b ON b.id = l.broker_id
    WHERE b.user_id = auth.uid()
    AND (storage.foldername(storage.objects.name))[2]::text = l.id::text
  )
);