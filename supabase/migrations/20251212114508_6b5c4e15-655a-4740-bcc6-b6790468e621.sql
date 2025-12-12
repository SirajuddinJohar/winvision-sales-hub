-- Create table for doctor-pharmacy relationships
CREATE TABLE public.doctor_pharmacy_assignments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  doctor_id UUID NOT NULL REFERENCES public.doctors(id) ON DELETE CASCADE,
  pharmacy_id UUID NOT NULL REFERENCES public.pharmacies(id) ON DELETE CASCADE,
  created_by UUID REFERENCES public.users(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(doctor_id, pharmacy_id)
);

-- Enable RLS
ALTER TABLE public.doctor_pharmacy_assignments ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Admins can manage all assignments"
ON public.doctor_pharmacy_assignments
FOR ALL
USING (is_admin());

CREATE POLICY "MRs can manage assignments for their doctors"
ON public.doctor_pharmacy_assignments
FOR ALL
USING (EXISTS (
  SELECT 1 FROM doctors 
  WHERE doctors.id = doctor_pharmacy_assignments.doctor_id 
  AND doctors.assigned_mr_id = auth.uid()
));

CREATE POLICY "Users can view assignments"
ON public.doctor_pharmacy_assignments
FOR SELECT
USING (
  is_admin() OR 
  EXISTS (
    SELECT 1 FROM doctors 
    WHERE doctors.id = doctor_pharmacy_assignments.doctor_id 
    AND doctors.assigned_mr_id = auth.uid()
  )
);