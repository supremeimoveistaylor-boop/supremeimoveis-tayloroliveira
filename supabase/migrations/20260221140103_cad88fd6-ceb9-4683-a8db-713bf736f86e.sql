
-- Table for SEO global config and page configs
CREATE TABLE public.seo_configs (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  config_type text NOT NULL, -- 'global' or 'page'
  config_key text NOT NULL, -- unique key like 'global' or page id
  config_data jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(config_type, config_key)
);

-- Enable RLS
ALTER TABLE public.seo_configs ENABLE ROW LEVEL SECURITY;

-- Only super_admin can manage SEO configs
CREATE POLICY "Super admins can manage seo_configs"
ON public.seo_configs
FOR ALL
USING (is_super_admin(auth.uid()));

-- Trigger for updated_at
CREATE TRIGGER update_seo_configs_updated_at
BEFORE UPDATE ON public.seo_configs
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();
