-- Create area_doctor_visits table to store area-doctor assignments
CREATE TABLE public.area_doctor_visits (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  area_id UUID NOT NULL REFERENCES public.areas(id) ON DELETE CASCADE,
  doctor_id UUID NOT NULL REFERENCES public.doctors(id) ON DELETE CASCADE,
  created_by UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(area_id, doctor_id, created_by)
);

-- Enable RLS
ALTER TABLE public.area_doctor_visits ENABLE ROW LEVEL SECURITY;

-- Admins can manage all records
CREATE POLICY "Admins can manage all area doctor visits"
ON public.area_doctor_visits
FOR ALL
USING (is_admin());

-- MRs can create their own assignments
CREATE POLICY "MRs can create their own area doctor visits"
ON public.area_doctor_visits
FOR INSERT
WITH CHECK (auth.uid() = created_by);

-- MRs can view their own assignments
CREATE POLICY "MRs can view their own area doctor visits"
ON public.area_doctor_visits
FOR SELECT
USING (auth.uid() = created_by OR is_admin());

-- MRs can delete their own assignments
CREATE POLICY "MRs can delete their own area doctor visits"
ON public.area_doctor_visits
FOR DELETE
USING (auth.uid() = created_by);

-- Trigger for updated_at
CREATE TRIGGER update_area_doctor_visits_updated_at
BEFORE UPDATE ON public.area_doctor_visits
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();