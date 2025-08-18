-- Remove existing demo users from public.users table to avoid conflicts
DELETE FROM public.users WHERE email IN ('admin@winvision.com', 'mr@winvision.com');

-- Note: We need to create these users through the Supabase Auth system, not directly in the database
-- The users will be created via the signup flow or admin panel