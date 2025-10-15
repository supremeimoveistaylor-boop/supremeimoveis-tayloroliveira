-- Adicionar administradores específicos e remover outros

-- Primeiro, vamos buscar o user_id do email supremeimoveis.taylor@gmail.com e adicionar como admin
INSERT INTO public.user_roles (user_id, role, assigned_by)
SELECT 
  id,
  'admin'::user_role,
  '48268eaa-875a-47b9-9781-5b3329339bce'::uuid
FROM auth.users
WHERE email = 'supremeimoveis.taylor@gmail.com'
ON CONFLICT (user_id, role) DO NOTHING;

-- Remover qualquer outro usuário admin que não seja um dos dois emails autorizados
DELETE FROM public.user_roles
WHERE role = 'admin'
AND user_id NOT IN (
  SELECT id FROM auth.users 
  WHERE email IN ('supremeimoveis.taylor@gmail.com', 'crv.taylor@gmail.com')
);

-- Criar uma função para validar limite de propriedades por usuário (100 imóveis)
CREATE OR REPLACE FUNCTION public.validate_property_limit()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  property_count INTEGER;
BEGIN
  -- Contar quantas propriedades o usuário já tem
  SELECT COUNT(*) INTO property_count
  FROM public.properties
  WHERE user_id = NEW.user_id;
  
  -- Verificar se já atingiu o limite de 100
  IF property_count >= 100 THEN
    RAISE EXCEPTION 'Limite de 100 imóveis atingido para este usuário';
  END IF;
  
  RETURN NEW;
END;
$$;

-- Criar trigger para validar o limite antes de inserir nova propriedade
DROP TRIGGER IF EXISTS validate_property_limit_trigger ON public.properties;
CREATE TRIGGER validate_property_limit_trigger
  BEFORE INSERT ON public.properties
  FOR EACH ROW
  EXECUTE FUNCTION public.validate_property_limit();