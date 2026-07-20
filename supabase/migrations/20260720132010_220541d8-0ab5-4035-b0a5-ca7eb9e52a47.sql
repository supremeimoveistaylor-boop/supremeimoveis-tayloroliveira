GRANT EXECUTE ON FUNCTION public.has_role(uuid, user_role) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.is_admin(uuid) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.is_super_admin(uuid) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.is_email_whitelisted(text) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.is_current_user_whitelisted() TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.get_user_role(uuid) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.get_user_role_from_roles(uuid) TO authenticated, anon;