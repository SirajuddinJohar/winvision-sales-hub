
CREATE TABLE public.area_doctor_delete_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  area_id uuid NOT NULL,
  doctor_id uuid,
  requested_by uuid NOT NULL,
  reason text,
  status text NOT NULL DEFAULT 'pending',
  reviewed_by uuid,
  reviewed_at timestamptz,
  admin_notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.area_doctor_delete_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "MRs can create delete requests"
  ON public.area_doctor_delete_requests
  FOR INSERT
  WITH CHECK (auth.uid() = requested_by);

CREATE POLICY "MRs can view their own delete requests"
  ON public.area_doctor_delete_requests
  FOR SELECT
  USING (auth.uid() = requested_by OR is_admin());

CREATE POLICY "Admins can update delete requests"
  ON public.area_doctor_delete_requests
  FOR UPDATE
  USING (is_admin());

CREATE POLICY "Admins can delete delete requests"
  ON public.area_doctor_delete_requests
  FOR DELETE
  USING (is_admin());

CREATE TRIGGER trg_area_doctor_delete_requests_updated_at
  BEFORE UPDATE ON public.area_doctor_delete_requests
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- When approved, perform the deletion on area_doctor_visits
CREATE OR REPLACE FUNCTION public.process_area_doctor_delete_request()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.status = 'approved' AND (OLD.status IS DISTINCT FROM 'approved') THEN
    IF NEW.doctor_id IS NULL THEN
      DELETE FROM public.area_doctor_visits
        WHERE area_id = NEW.area_id AND created_by = NEW.requested_by;
    ELSE
      DELETE FROM public.area_doctor_visits
        WHERE area_id = NEW.area_id
          AND doctor_id = NEW.doctor_id
          AND created_by = NEW.requested_by;
    END IF;
    NEW.reviewed_at := now();
    NEW.reviewed_by := auth.uid();
  ELSIF NEW.status = 'rejected' AND (OLD.status IS DISTINCT FROM 'rejected') THEN
    NEW.reviewed_at := now();
    NEW.reviewed_by := auth.uid();
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_process_area_doctor_delete_request
  BEFORE UPDATE ON public.area_doctor_delete_requests
  FOR EACH ROW EXECUTE FUNCTION public.process_area_doctor_delete_request();
