DROP POLICY IF EXISTS "Authenticated users can create notifications" ON public.notifications;
CREATE POLICY "Users and admins can create scoped notifications"
ON public.notifications
FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() = user_id
  OR is_admin()
  OR has_role(user_id, 'admin'::user_role)
);

DROP POLICY IF EXISTS "Authenticated can view campaigns" ON public.reward_campaigns;
CREATE POLICY "Staff can view active campaigns and admins all campaigns"
ON public.reward_campaigns
FOR SELECT
TO authenticated
USING (
  is_admin()
  OR is_active = true
);