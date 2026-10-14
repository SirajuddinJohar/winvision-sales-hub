DROP POLICY IF EXISTS "Authenticated staff can view distributors" ON public."Distributors";
DROP POLICY IF EXISTS "Admins can manage distributors" ON public."Distributors";

CREATE POLICY "Admins can manage distributors"
ON public."Distributors"
FOR ALL
TO authenticated
USING (public.is_admin())
WITH CHECK (public.is_admin());

CREATE POLICY "Assigned staff can view distributors"
ON public."Distributors"
FOR SELECT
TO authenticated
USING (
  public.is_admin()
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

DROP POLICY IF EXISTS "Authenticated staff can view pharmacies" ON public.pharmacies;
DROP POLICY IF EXISTS "Admins can manage pharmacies" ON public.pharmacies;

CREATE POLICY "Admins can manage pharmacies"
ON public.pharmacies
FOR ALL
TO authenticated
USING (public.is_admin())
WITH CHECK (public.is_admin());

CREATE POLICY "Assigned staff can view pharmacies"
ON public.pharmacies
FOR SELECT
TO authenticated
USING (
  public.is_admin()
  OR created_by = auth.uid()
  OR EXISTS (
    SELECT 1
    FROM public.mr_pharmacy_assignments assignment
    WHERE assignment.pharmacy_id = pharmacies.id
      AND (
        assignment.mr_id = auth.uid()
        OR (assignment.mr_id IS NOT NULL AND public.is_asm_of(assignment.mr_id))
      )
  )
  OR (
    created_by IS NOT NULL
    AND EXISTS (
      SELECT 1
      FROM public.mr_asm_assignments assignment
      WHERE assignment.mr_id = pharmacies.created_by
        AND assignment.asm_id = auth.uid()
    )
  )
);

DROP POLICY IF EXISTS "Authenticated staff can view distributor products" ON public.distributor_products;

CREATE POLICY "Assigned staff can view distributor products"
ON public.distributor_products
FOR SELECT
TO authenticated
USING (
  public.is_admin()
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