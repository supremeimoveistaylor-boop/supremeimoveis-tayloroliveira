-- Atualizar o role do usuário supremeimoveis.taylor@gmail.com para super_admin
-- O user_id 48268eaa-875a-47b9-9781-5b3329339bce corresponde a este email
UPDATE public.user_roles 
SET role = 'super_admin', 
    assigned_at = now()
WHERE user_id = '48268eaa-875a-47b9-9781-5b3329339bce';