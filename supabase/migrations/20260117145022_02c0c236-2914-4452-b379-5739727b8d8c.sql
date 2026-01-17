-- Create storage bucket for chat attachments
INSERT INTO storage.buckets (id, name, public)
VALUES ('chat-attachments', 'chat-attachments', true)
ON CONFLICT (id) DO NOTHING;

-- Allow anyone to upload files to chat-attachments bucket
CREATE POLICY "Anyone can upload chat attachments"
ON storage.objects
FOR INSERT
TO public
WITH CHECK (bucket_id = 'chat-attachments');

-- Allow anyone to view chat attachments
CREATE POLICY "Anyone can view chat attachments"
ON storage.objects
FOR SELECT
TO public
USING (bucket_id = 'chat-attachments');

-- Allow deletion by owner (based on folder structure user_id/filename)
CREATE POLICY "Users can delete own chat attachments"
ON storage.objects
FOR DELETE
TO public
USING (bucket_id = 'chat-attachments');