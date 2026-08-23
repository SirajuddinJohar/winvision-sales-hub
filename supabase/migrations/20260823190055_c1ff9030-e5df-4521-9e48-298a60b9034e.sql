CREATE POLICY "ASMs can view their team members"
ON public.users
FOR SELECT
TO authenticated
USING (public.is_asm_of(id));

CREATE POLICY "ASMs can view their team roles"
ON public.user_roles
FOR SELECT
TO authenticated
USING (public.is_asm_of(user_id));