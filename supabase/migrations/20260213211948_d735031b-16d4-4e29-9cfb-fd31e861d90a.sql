-- Allow MRs to create incentive records for their assigned doctors
CREATE POLICY "MRs can create incentives for their doctors"
ON public.doctor_incentives
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM doctors
    WHERE doctors.id = doctor_incentives.doctor_id
    AND doctors.assigned_mr_id = auth.uid()
  )
);