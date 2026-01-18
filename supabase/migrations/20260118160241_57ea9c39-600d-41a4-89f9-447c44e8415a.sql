-- Create table for chat flow metrics
CREATE TABLE public.chat_flow_metrics (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  flow_type TEXT NOT NULL CHECK (flow_type IN ('specific', 'listing', 'general')),
  lead_id UUID REFERENCES public.leads(id) ON DELETE SET NULL,
  property_id UUID REFERENCES public.properties(id) ON DELETE SET NULL,
  page_context TEXT,
  page_url TEXT,
  origin TEXT,
  properties_shown INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Add index for faster queries
CREATE INDEX idx_chat_flow_metrics_flow_type ON public.chat_flow_metrics(flow_type);
CREATE INDEX idx_chat_flow_metrics_created_at ON public.chat_flow_metrics(created_at);

-- Enable RLS
ALTER TABLE public.chat_flow_metrics ENABLE ROW LEVEL SECURITY;

-- Allow edge function (service role) to insert metrics
CREATE POLICY "Service role can insert metrics" 
ON public.chat_flow_metrics 
FOR INSERT 
WITH CHECK (true);

-- Allow admins to view metrics
CREATE POLICY "Admins can view metrics" 
ON public.chat_flow_metrics 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = auth.uid() 
    AND role = 'admin'
  )
);

-- Add comment for documentation
COMMENT ON TABLE public.chat_flow_metrics IS 'Tracks which chat decision flow is being used (specific, listing, or general)';