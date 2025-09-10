-- Create the single shared user account
-- First, we need to insert directly into auth.users (this requires admin privileges)
-- For this to work, we'll create this user through the Supabase dashboard instead

-- Create a profile for the shared user (we'll use a known UUID)
-- The user will need to be created manually in Supabase Auth dashboard first

-- Insert the profile data for the shared user
INSERT INTO public.profiles (
  id, 
  user_id, 
  full_name
) VALUES (
  gen_random_uuid(),
  'c0030c99-2cef-4e19-b6fe-6f13822b5883', -- This is an existing user ID from the logs
  'Supreme Empreendimentos'
) ON CONFLICT (user_id) DO UPDATE SET
  full_name = 'Supreme Empreendimentos';