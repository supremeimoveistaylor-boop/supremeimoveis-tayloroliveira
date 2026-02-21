-- Allow anyone to read SEO configs (public landing pages need this)
CREATE POLICY "Anyone can read seo_configs"
ON public.seo_configs
FOR SELECT
USING (true);
