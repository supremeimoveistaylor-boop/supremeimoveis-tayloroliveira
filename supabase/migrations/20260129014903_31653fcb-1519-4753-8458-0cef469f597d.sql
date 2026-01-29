-- Atribuir roles admin e super_admin para supremeimoveis.taylor@gmail.com
INSERT INTO public.user_roles (user_id, role)
SELECT '5ed2d8b8-1009-440d-972b-2b212c83caf3', 'admin'
WHERE NOT EXISTS (
  SELECT 1 FROM public.user_roles 
  WHERE user_id = '5ed2d8b8-1009-440d-972b-2b212c83caf3' AND role = 'admin'
);

INSERT INTO public.user_roles (user_id, role)
SELECT '5ed2d8b8-1009-440d-972b-2b212c83caf3', 'super_admin'
WHERE NOT EXISTS (
  SELECT 1 FROM public.user_roles 
  WHERE user_id = '5ed2d8b8-1009-440d-972b-2b212c83caf3' AND role = 'super_admin'
);