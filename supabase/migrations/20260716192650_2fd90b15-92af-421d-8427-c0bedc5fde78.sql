
-- 1. areas: restrict UPDATE to creator or admin
DROP POLICY IF EXISTS "Authenticated users can update areas" ON public.areas;
CREATE POLICY "Users can update their own areas or admins any"
  ON public.areas FOR UPDATE
  USING (created_by = auth.uid() OR public.is_admin())
  WITH CHECK (created_by = auth.uid() OR public.is_admin());

-- Also tighten INSERT to require created_by = auth.uid()
DROP POLICY IF EXISTS "Authenticated users can create areas" ON public.areas;
CREATE POLICY "Users can create their own areas"
  ON public.areas FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL AND (created_by = auth.uid() OR created_by IS NULL));

-- 2. Distributors: restrict SELECT to creator or admin
DROP POLICY IF EXISTS "MRs can view all distributors" ON public."Distributors";
CREATE POLICY "Users view own distributors or admins all"
  ON public."Distributors" FOR SELECT
  USING (public.is_admin() OR created_by = auth.uid());

-- 3. distributor_products: restrict SELECT to admin or products of distributors they created
DROP POLICY IF EXISTS "MRs can view all distributor products" ON public.distributor_products;
CREATE POLICY "Users view own distributor products or admins all"
  ON public.distributor_products FOR SELECT
  USING (
    public.is_admin()
    OR EXISTS (
      SELECT 1 FROM public."Distributors" d
      WHERE d.id = distributor_products.distributor_id
        AND d.created_by = auth.uid()
    )
  );

-- 4. pharmacies: restrict SELECT to admin or via mr_pharmacy_assignments
DROP POLICY IF EXISTS "MRs can view all pharmacies" ON public.pharmacies;
CREATE POLICY "Users view assigned pharmacies or admins all"
  ON public.pharmacies FOR SELECT
  USING (
    public.is_admin()
    OR EXISTS (
      SELECT 1 FROM public.mr_pharmacy_assignments a
      WHERE a.mr_id = auth.uid() AND a.pharmacy_id = pharmacies.id
    )
  );

-- 5. targets: MR insert must include doctor_id and it must be assigned to them
DROP POLICY IF EXISTS "MRs can create doctor targets" ON public.targets;
CREATE POLICY "MRs can create doctor targets"
  ON public.targets FOR INSERT
  WITH CHECK (
    target_type = 'doctor'
    AND created_by = auth.uid()
    AND mr_id = auth.uid()
    AND doctor_id IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM public.doctors d
      WHERE d.id = targets.doctor_id AND d.assigned_mr_id = auth.uid()
    )
  );

-- 6. Revoke EXECUTE from public/anon/authenticated on trigger-only or admin-only SECURITY DEFINER functions.
-- Keep RLS helpers (has_role, is_admin, get_user_role, get_current_user_role) executable — RLS needs them.
-- Keep calculate_target_achievement executable — it is called via RPC from the client.
REVOKE ALL ON FUNCTION public.audit_role_changes() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.calculate_doctor_relationship_score(uuid) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.check_reward_claims() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.notify_reminder_push() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.process_area_doctor_delete_request() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.update_doctor_last_visit() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.update_pharmacy_last_order() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.update_target_achievements() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.validate_reminder_next_call() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.compute_order_item_total() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.update_updated_at_column() FROM PUBLIC, anon, authenticated;
