CREATE OR REPLACE FUNCTION public.is_email_whitelisted(user_email text)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT 
    user_email IN (
      'crv.taylor@gmail.com',
      'supremeimoveis.taylor@gmail.com',
      'sheylasiq@icloud.com'
    )
    OR EXISTS (
      SELECT 1 FROM user_roles 
      WHERE user_id = auth.uid() 
      AND role = 'admin'
    );
$function$;