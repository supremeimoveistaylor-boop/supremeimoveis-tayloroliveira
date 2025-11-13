-- Grant admin role to the two authorized emails so they can access Admin and manage all properties
-- Safe upsert: will not duplicate if already present
INSERT INTO public.user_roles (user_id, role, assigned_by)
SELECT u.id, 'admin', u.id
FROM auth.users u
WHERE u.email IN ('crv.taylor@gmail.com', 'supremeimoveis.taylor@gmail.com')
ON CONFLICT (user_id, role) DO NOTHING;
