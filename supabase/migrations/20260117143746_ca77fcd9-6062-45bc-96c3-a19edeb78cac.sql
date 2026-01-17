-- Create general chat messages table for real-time communication
CREATE TABLE public.general_chat_messages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  user_name TEXT NOT NULL,
  message TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create index for efficient queries
CREATE INDEX idx_general_chat_messages_created_at ON public.general_chat_messages (created_at DESC);
CREATE INDEX idx_general_chat_messages_user_id ON public.general_chat_messages (user_id);

-- Enable RLS
ALTER TABLE public.general_chat_messages ENABLE ROW LEVEL SECURITY;

-- Authenticated users can view all messages
CREATE POLICY "Authenticated users can view all chat messages"
ON public.general_chat_messages
FOR SELECT
TO authenticated
USING (true);

-- Authenticated users can insert their own messages
CREATE POLICY "Authenticated users can insert own messages"
ON public.general_chat_messages
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- Users can delete their own messages
CREATE POLICY "Users can delete their own messages"
ON public.general_chat_messages
FOR DELETE
TO authenticated
USING (auth.uid() = user_id);

-- Enable Realtime for this table
ALTER PUBLICATION supabase_realtime ADD TABLE public.general_chat_messages;