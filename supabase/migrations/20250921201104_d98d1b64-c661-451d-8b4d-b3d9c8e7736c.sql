-- Add INSERT policy for MRs to create doctors
CREATE POLICY "MRs can create doctors" 
ON public.doctors 
FOR INSERT 
WITH CHECK (
  auth.uid() = assigned_mr_id AND 
  auth.uid() = created_by AND
  (SELECT role FROM public.users WHERE id = auth.uid()) = 'mr'
);