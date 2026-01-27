-- Adicionar role super_admin ao usuário supremeimoveis.taylor@gmail.com
INSERT INTO public.user_roles (user_id, role, assigned_at)
VALUES (
  '81cb9da6-abb9-4c71-b318-726ee4cd5a72',
  'super_admin',
  now()
)
ON CONFLICT (user_id, role) DO NOTHING;