
-- Leave requests
CREATE TABLE public.leave_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  mr_id uuid NOT NULL,
  leave_date date NOT NULL,
  reason text NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  reviewed_by uuid,
  reviewer_role user_role,
  reviewed_at timestamptz,
  remarks text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (mr_id, leave_date)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.leave_requests TO authenticated;
GRANT ALL ON public.leave_requests TO service_role;

ALTER TABLE public.leave_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "MRs manage their own leave requests"
ON public.leave_requests FOR SELECT TO authenticated
USING (auth.uid() = mr_id OR public.is_asm_of(mr_id) OR public.is_admin());

CREATE POLICY "MRs create their own leave requests"
ON public.leave_requests FOR INSERT TO authenticated
WITH CHECK (auth.uid() = mr_id);

CREATE POLICY "MRs update their own pending leave requests"
ON public.leave_requests FOR UPDATE TO authenticated
USING (auth.uid() = mr_id AND status = 'pending')
WITH CHECK (auth.uid() = mr_id);

CREATE POLICY "Reviewers update team leave requests"
ON public.leave_requests FOR UPDATE TO authenticated
USING (public.is_asm_of(mr_id) OR public.is_admin())
WITH CHECK (public.is_asm_of(mr_id) OR public.is_admin());

CREATE POLICY "MRs delete their own pending leave requests"
ON public.leave_requests FOR DELETE TO authenticated
USING ((auth.uid() = mr_id AND status = 'pending') OR public.is_admin());

CREATE TRIGGER update_leave_requests_updated_at
BEFORE UPDATE ON public.leave_requests
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- How many leaves an ASM has already approved for this MR in a given month
CREATE OR REPLACE FUNCTION public.asm_leave_approvals_count(_mr_id uuid, _month date)
RETURNS integer
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT count(*)::int
  FROM public.leave_requests
  WHERE mr_id = _mr_id
    AND status = 'approved'
    AND reviewer_role = 'asm'
    AND date_trunc('month', leave_date) = date_trunc('month', _month);
$$;

-- Enforce the 3-per-month ASM approval limit
CREATE OR REPLACE FUNCTION public.enforce_leave_approval_limit()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.status = 'approved' AND COALESCE(OLD.status, '') <> 'approved'
     AND NEW.reviewer_role = 'asm' THEN
    IF public.asm_leave_approvals_count(NEW.mr_id, NEW.leave_date) >= 3 THEN
      RAISE EXCEPTION 'Manager approval limit reached (3 leaves this month). Admin approval required.';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_enforce_leave_approval_limit
BEFORE UPDATE ON public.leave_requests
FOR EACH ROW EXECUTE FUNCTION public.enforce_leave_approval_limit();

-- Tour plan: number of approved edit requests
CREATE OR REPLACE FUNCTION public.tour_plan_edit_count(_tour_plan_id uuid)
RETURNS integer
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT count(*)::int
  FROM public.tour_plan_edit_requests
  WHERE tour_plan_id = _tour_plan_id
    AND status = 'approved';
$$;

-- ASM access to team tour plans and edit requests
CREATE POLICY "ASM can update team tour plans"
ON public.tour_plans FOR UPDATE TO authenticated
USING (public.is_asm_of(user_id))
WITH CHECK (public.is_asm_of(user_id));

CREATE POLICY "ASM can view team edit requests"
ON public.tour_plan_edit_requests FOR SELECT TO authenticated
USING (public.is_asm_of(user_id));

CREATE POLICY "ASM can update team edit requests"
ON public.tour_plan_edit_requests FOR UPDATE TO authenticated
USING (public.is_asm_of(user_id))
WITH CHECK (public.is_asm_of(user_id));

-- Only admins may approve a plan that has already been edited 3+ times
CREATE OR REPLACE FUNCTION public.enforce_tour_plan_approver()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.status = 'approved' AND COALESCE(OLD.status::text, '') <> 'approved'
     AND NOT public.is_admin() THEN
    IF public.tour_plan_edit_count(NEW.id) >= 3 THEN
      RAISE EXCEPTION 'This plan has been edited 3 times. Only an admin can approve it.';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_enforce_tour_plan_approver
BEFORE UPDATE ON public.tour_plans
FOR EACH ROW EXECUTE FUNCTION public.enforce_tour_plan_approver();
