-- Fix infinite recursion in users table RLS policies
-- The issue is that "Admins can view all users" policy references the users table itself

-- Drop the problematic policy that causes infinite recursion
DROP POLICY IF EXISTS "Admins can view all users" ON public.users;

-- Create a new admin policy that uses the is_admin() function instead
-- This avoids the recursive reference to the users table
CREATE POLICY "Admins can view all users" 
ON public.users 
FOR SELECT 
USING (is_admin());

-- Also ensure the is_admin function is working correctly
-- Verify it exists and recreate if needed
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = 'public'
AS $function$
  SELECT EXISTS (
    SELECT 1 FROM public.users 
    WHERE id = auth.uid() AND role = 'admin'
  );
$function$;