-- Add DELETE policy for tour plans (admin only)
CREATE POLICY "Admins can delete tour plans"
ON public.tour_plans
FOR DELETE
TO authenticated
USING (is_admin());

-- Add DELETE policy for tour plan days (admin only)
CREATE POLICY "Admins can delete tour plan days"
ON public.tour_plan_days
FOR DELETE
TO authenticated
USING (is_admin());