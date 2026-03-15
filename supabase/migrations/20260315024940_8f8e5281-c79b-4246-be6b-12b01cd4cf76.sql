
CREATE TABLE IF NOT EXISTS public.storage_cleanup_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  file_path text NOT NULL,
  bucket text NOT NULL,
  removed_at timestamptz NOT NULL DEFAULT now(),
  reason text NOT NULL,
  file_size bigint DEFAULT 0
);

ALTER TABLE public.storage_cleanup_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view storage cleanup logs"
  ON public.storage_cleanup_logs FOR SELECT
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::user_role));

CREATE POLICY "Service can manage storage cleanup logs"
  ON public.storage_cleanup_logs FOR ALL
  USING (true)
  WITH CHECK (true);
