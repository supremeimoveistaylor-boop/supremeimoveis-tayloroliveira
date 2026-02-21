
-- Add follow-up tracking fields to leads table
ALTER TABLE public.leads
ADD COLUMN IF NOT EXISTS last_followup_at timestamp with time zone DEFAULT NULL,
ADD COLUMN IF NOT EXISTS followup_stage integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS lead_temperature text DEFAULT 'frio',
ADD COLUMN IF NOT EXISTS last_agent_notification timestamp with time zone DEFAULT NULL,
ADD COLUMN IF NOT EXISTS nurturing_flow_status text DEFAULT 'inactive',
ADD COLUMN IF NOT EXISTS lead_segment text DEFAULT NULL;

-- Create follow-up alerts table for admin panel visibility
CREATE TABLE IF NOT EXISTS public.followup_alerts (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  lead_id uuid REFERENCES public.leads(id),
  alert_type text NOT NULL, -- 'lead_followup', 'broker_reminder', 'nurturing'
  stage integer NOT NULL DEFAULT 0,
  message_sent text,
  channel text DEFAULT 'whatsapp', -- 'whatsapp', 'internal'
  status text DEFAULT 'sent', -- 'sent', 'delivered', 'failed'
  whatsapp_message_id text,
  metadata jsonb DEFAULT '{}',
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.followup_alerts ENABLE ROW LEVEL SECURITY;

-- Admins can view all alerts
CREATE POLICY "Admins can view followup_alerts"
ON public.followup_alerts
FOR SELECT
USING (has_role(auth.uid(), 'admin'::user_role));

-- Service can insert alerts
CREATE POLICY "Service can insert followup_alerts"
ON public.followup_alerts
FOR INSERT
WITH CHECK (true);

-- Index for efficient querying
CREATE INDEX IF NOT EXISTS idx_leads_followup_stage ON public.leads(followup_stage);
CREATE INDEX IF NOT EXISTS idx_leads_last_followup ON public.leads(last_followup_at);
CREATE INDEX IF NOT EXISTS idx_leads_temperature ON public.leads(lead_temperature);
CREATE INDEX IF NOT EXISTS idx_followup_alerts_lead ON public.followup_alerts(lead_id);
CREATE INDEX IF NOT EXISTS idx_followup_alerts_type ON public.followup_alerts(alert_type, created_at);
