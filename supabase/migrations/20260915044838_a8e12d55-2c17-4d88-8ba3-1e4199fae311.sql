CREATE TABLE public.approval_audit_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  request_type text NOT NULL,
  request_id uuid NOT NULL,
  action text NOT NULL,
  reviewer_id uuid,
  reviewer_role user_role,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.approval_audit_history TO authenticated;
GRANT ALL ON public.approval_audit_history TO service_role;

ALTER TABLE public.approval_audit_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view relevant approval history"
ON public.approval_audit_history FOR SELECT TO authenticated
USING (
  public.is_admin()
  OR (
    request_type = 'leave'
    AND (
      EXISTS (
        SELECT 1 FROM public.leave_requests lr
        WHERE lr.id = request_id
          AND (lr.mr_id = auth.uid() OR public.is_asm_of(lr.mr_id))
      )
    )
  )
  OR (
    request_type = 'tour_plan'
    AND (
      EXISTS (
        SELECT 1 FROM public.tour_plan_edit_requests tr
        WHERE tr.id = request_id
          AND (tr.user_id = auth.uid() OR public.is_asm_of(tr.user_id))
      )
    )
  )
);

CREATE OR REPLACE FUNCTION public.record_approval_audit()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  request_type_value text;
  request_id_value uuid;
  next_action text;
  next_reviewer_id uuid;
  next_reviewer_role user_role;
  next_notes text;
BEGIN
  request_type_value := TG_ARGV[0];
  request_id_value := NEW.id;

  IF TG_OP = 'INSERT' THEN
    next_action := 'submitted';
    next_reviewer_id := NULL;
    next_reviewer_role := NULL;
    next_notes := CASE
      WHEN request_type_value = 'leave' THEN NEW.reason
      ELSE NEW.request_reason
    END;
  ELSIF request_type_value = 'leave'
        AND (NEW.status IS DISTINCT FROM OLD.status
          OR NEW.reviewed_by IS DISTINCT FROM OLD.reviewed_by
          OR NEW.remarks IS DISTINCT FROM OLD.remarks) THEN
    next_action := NEW.status;
    next_reviewer_id := NEW.reviewed_by;
    next_reviewer_role := NEW.reviewer_role;
    next_notes := NEW.remarks;
  ELSIF request_type_value = 'tour_plan'
        AND (NEW.status IS DISTINCT FROM OLD.status
          OR NEW.admin_id IS DISTINCT FROM OLD.admin_id
          OR NEW.admin_remarks IS DISTINCT FROM OLD.admin_remarks) THEN
    next_action := NEW.status;
    next_reviewer_id := NEW.admin_id;
    next_reviewer_role := CASE WHEN NEW.admin_id IS NULL THEN NULL ELSE 'admin'::user_role END;
    next_notes := NEW.admin_remarks;
  ELSE
    RETURN NEW;
  END IF;

  INSERT INTO public.approval_audit_history (
    request_type, request_id, action, reviewer_id, reviewer_role, notes
  ) VALUES (
    request_type_value, request_id_value, next_action, next_reviewer_id, next_reviewer_role, next_notes
  );

  RETURN NEW;
END;
$$;

CREATE TRIGGER record_leave_approval_audit
AFTER INSERT OR UPDATE ON public.leave_requests
FOR EACH ROW EXECUTE FUNCTION public.record_approval_audit('leave');

CREATE TRIGGER record_tour_plan_approval_audit
AFTER INSERT OR UPDATE ON public.tour_plan_edit_requests
FOR EACH ROW EXECUTE FUNCTION public.record_approval_audit('tour_plan');