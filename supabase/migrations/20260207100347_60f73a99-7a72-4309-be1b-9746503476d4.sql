-- Create doctor_incentives table to track incentives generated from orders
CREATE TABLE public.doctor_incentives (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  doctor_id UUID NOT NULL REFERENCES public.doctors(id) ON DELETE CASCADE,
  order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  order_amount NUMERIC NOT NULL,
  incentive_percentage NUMERIC NOT NULL DEFAULT 30,
  incentive_amount NUMERIC NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  paid_at TIMESTAMP WITH TIME ZONE,
  paid_by UUID REFERENCES public.users(id),
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(order_id)
);

-- Add incentive_percentage column to doctors table for per-doctor percentage
ALTER TABLE public.doctors 
ADD COLUMN IF NOT EXISTS incentive_percentage NUMERIC DEFAULT 30;

-- Enable RLS
ALTER TABLE public.doctor_incentives ENABLE ROW LEVEL SECURITY;

-- Policies for doctor_incentives
CREATE POLICY "Admins can manage all incentives"
ON public.doctor_incentives
FOR ALL
USING (is_admin());

CREATE POLICY "MRs can view incentives for their doctors"
ON public.doctor_incentives
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM doctors 
    WHERE doctors.id = doctor_incentives.doctor_id 
    AND doctors.assigned_mr_id = auth.uid()
  )
);

-- Create trigger for updating timestamps
CREATE TRIGGER update_doctor_incentives_updated_at
BEFORE UPDATE ON public.doctor_incentives
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();