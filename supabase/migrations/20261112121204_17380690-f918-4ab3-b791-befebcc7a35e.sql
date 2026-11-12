DROP POLICY IF EXISTS "Assigned staff can view distributors" ON public."Distributors";
CREATE POLICY "Assigned staff can view distributors"
ON public."Distributors"
FOR SELECT
TO authenticated
USING (
  public.is_admin()
  OR public.has_role(auth.uid(), 'mr'::public.user_role)
  OR created_by = auth.uid()
  OR (
    created_by IS NOT NULL
    AND EXISTS (
      SELECT 1
      FROM public.mr_asm_assignments assignment
      WHERE assignment.mr_id = "Distributors".created_by
        AND assignment.asm_id = auth.uid()
    )
  )
);

DROP POLICY IF EXISTS "Assigned staff can view distributor products" ON public.distributor_products;
CREATE POLICY "Assigned staff can view distributor products"
ON public.distributor_products
FOR SELECT
TO authenticated
USING (
  public.is_admin()
  OR public.has_role(auth.uid(), 'mr'::public.user_role)
  OR EXISTS (
    SELECT 1
    FROM public."Distributors" distributor
    WHERE distributor.id = distributor_products.distributor_id
      AND (
        distributor.created_by = auth.uid()
        OR (
          distributor.created_by IS NOT NULL
          AND EXISTS (
            SELECT 1
            FROM public.mr_asm_assignments assignment
            WHERE assignment.mr_id = distributor.created_by
              AND assignment.asm_id = auth.uid()
          )
        )
      )
  )
);

DROP POLICY IF EXISTS "ASM can view team daily calls" ON public.daily_calls;
CREATE POLICY "ASM can view team daily calls"
ON public.daily_calls
FOR SELECT
TO authenticated
USING (public.is_asm_of(mr_id));

DROP POLICY IF EXISTS "ASM can view team area doctor visits" ON public.area_doctor_visits;
CREATE POLICY "ASM can view team area doctor visits"
ON public.area_doctor_visits
FOR SELECT
TO authenticated
USING (public.is_asm_of(created_by));

ALTER PUBLICATION supabase_realtime ADD TABLE public.daily_calls, public.daily_working_setup;