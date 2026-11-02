CREATE TABLE public.doctor_advance_incentives (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  doctor_id UUID NOT NULL REFERENCES public.doctors(id) ON DELETE CASCADE,
  amount NUMERIC NOT NULL CHECK (amount > 0),
  given_date DATE NOT NULL DEFAULT CURRENT_DATE,
  notes TEXT,
  status TEXT NOT NULL DEFAULT 'active',
  settled_at TIMESTAMP WITH TIME ZONE,
  created_by UUID REFERENCES public.users(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.doctor_advance_incentives TO authenticated;
GRANT ALL ON public.doctor_advance_incentives TO service_role;

ALTER TABLE public.doctor_advance_incentives ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage advance incentives"
ON public.doctor_advance_incentives
FOR ALL
TO authenticated
USING (is_admin())
WITH CHECK (is_admin());

CREATE POLICY "MRs view advances for their doctors"
ON public.doctor_advance_incentives
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.doctors d
    WHERE d.id = doctor_advance_incentives.doctor_id
    AND d.assigned_mr_id = auth.uid()
  )
);

CREATE POLICY "ASMs view advances for their team doctors"
ON public.doctor_advance_incentives
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.doctors d
    WHERE d.id = doctor_advance_incentives.doctor_id
    AND public.is_asm_of(d.assigned_mr_id)
  )
);

CREATE TRIGGER update_doctor_advance_incentives_updated_at
BEFORE UPDATE ON public.doctor_advance_incentives
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Auto-settle an advance once recovered incentives cover it
CREATE OR REPLACE FUNCTION public.settle_doctor_advance_incentives()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE public.doctor_advance_incentives a
  SET status = 'settled', settled_at = now(), updated_at = now()
  WHERE a.doctor_id = COALESCE(NEW.doctor_id, OLD.doctor_id)
    AND a.status = 'active'
    AND a.amount <= (
      SELECT COALESCE(SUM(i.incentive_amount), 0)
      FROM public.doctor_incentives i
      WHERE i.doctor_id = a.doctor_id
        AND i.status IN ('approved', 'paid')
        AND i.created_at >= a.created_at
    );
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER trg_settle_doctor_advances
AFTER INSERT OR UPDATE OF status, doctor_id ON public.doctor_incentives
FOR EACH ROW
EXECUTE FUNCTION public.settle_doctor_advance_incentives();