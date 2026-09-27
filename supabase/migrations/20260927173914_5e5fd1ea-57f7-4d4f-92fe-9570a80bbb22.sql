CREATE TABLE public.schema_validation_checks (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  checked_at timestamptz NOT NULL DEFAULT now(),
  total_pages integer NOT NULL DEFAULT 0,
  valid_pages integer NOT NULL DEFAULT 0,
  issues jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, DELETE ON public.schema_validation_checks TO authenticated;
GRANT ALL ON public.schema_validation_checks TO service_role;
ALTER TABLE public.schema_validation_checks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins view schema checks" ON public.schema_validation_checks FOR SELECT TO authenticated USING (public.is_admin(auth.uid()));
CREATE POLICY "Admins insert schema checks" ON public.schema_validation_checks FOR INSERT TO authenticated WITH CHECK (public.is_admin(auth.uid()));
CREATE POLICY "Admins delete schema checks" ON public.schema_validation_checks FOR DELETE TO authenticated USING (public.is_admin(auth.uid()));
CREATE INDEX idx_schema_checks_checked_at ON public.schema_validation_checks (checked_at DESC);