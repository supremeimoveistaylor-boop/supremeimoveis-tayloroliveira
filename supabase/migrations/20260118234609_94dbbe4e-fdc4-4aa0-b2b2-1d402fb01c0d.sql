-- Corrigir view para usar security invoker
DROP VIEW IF EXISTS public.chat_conversion_metrics;

CREATE VIEW public.chat_conversion_metrics 
WITH (security_invoker = true)
AS
SELECT 
  DATE_TRUNC('day', cc.created_at) as date,
  cc.conversion_type,
  COUNT(*) as total_conversions,
  COUNT(DISTINCT cc.lead_id) as unique_leads
FROM public.chat_conversions cc
GROUP BY DATE_TRUNC('day', cc.created_at), cc.conversion_type
ORDER BY date DESC, total_conversions DESC;