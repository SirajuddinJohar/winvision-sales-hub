
CREATE TABLE public.mr_asm_assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  mr_id uuid NOT NULL UNIQUE,
  asm_id uuid NOT NULL,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.mr_asm_assignments TO authenticated;
GRANT ALL ON public.mr_asm_assignments TO service_role;

ALTER TABLE public.mr_asm_assignments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage mr asm assignments"
ON public.mr_asm_assignments FOR ALL TO authenticated
USING (public.is_admin()) WITH CHECK (public.is_admin());

CREATE POLICY "Staff can view mr asm assignments"
ON public.mr_asm_assignments FOR SELECT TO authenticated
USING (asm_id = auth.uid() OR mr_id = auth.uid() OR public.is_admin());

CREATE TRIGGER trg_mr_asm_assignments_updated_at
BEFORE UPDATE ON public.mr_asm_assignments
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE OR REPLACE FUNCTION public.is_asm_of(_mr_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.mr_asm_assignments
    WHERE mr_id = _mr_id AND asm_id = auth.uid()
  );
$$;

REVOKE EXECUTE ON FUNCTION public.is_asm_of(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_asm_of(uuid) TO authenticated, service_role;

CREATE POLICY "ASM can view team daily working"
ON public.daily_working FOR SELECT TO authenticated
USING (public.is_asm_of(mr_id));

CREATE POLICY "ASM can view team daily working setup"
ON public.daily_working_setup FOR SELECT TO authenticated
USING (public.is_asm_of(mr_id));

CREATE POLICY "ASM can view team orders"
ON public.orders FOR SELECT TO authenticated
USING (public.is_asm_of(mr_id));

CREATE POLICY "ASM can view team order items"
ON public.order_items FOR SELECT TO authenticated
USING (EXISTS (
  SELECT 1 FROM public.orders o
  WHERE o.id = order_items.order_id AND public.is_asm_of(o.mr_id)
));

CREATE POLICY "ASM can view team expenses"
ON public.expenses FOR SELECT TO authenticated
USING (public.is_asm_of(mr_id));

CREATE POLICY "ASM can view team targets"
ON public.targets FOR SELECT TO authenticated
USING (public.is_asm_of(mr_id));

CREATE POLICY "ASM can view team doctors"
ON public.doctors FOR SELECT TO authenticated
USING (public.is_asm_of(assigned_mr_id) OR public.is_asm_of(created_by));

CREATE POLICY "ASM can view team visit notes"
ON public.doctor_visit_notes FOR SELECT TO authenticated
USING (public.is_asm_of(mr_id));

CREATE POLICY "ASM can view team tour plans"
ON public.tour_plans FOR SELECT TO authenticated
USING (public.is_asm_of(user_id));
