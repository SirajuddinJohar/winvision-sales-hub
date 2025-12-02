-- Add new columns to doctors table for enhanced management
ALTER TABLE public.doctors
ADD COLUMN IF NOT EXISTS birthday date,
ADD COLUMN IF NOT EXISTS anniversary date,
ADD COLUMN IF NOT EXISTS last_visit_date date,
ADD COLUMN IF NOT EXISTS relationship_score numeric DEFAULT 0,
ADD COLUMN IF NOT EXISTS tags text[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS notes text,
ADD COLUMN IF NOT EXISTS prescribing_preferences jsonb DEFAULT '{}'::jsonb;

-- Add last order tracking to pharmacies
ALTER TABLE public.pharmacies
ADD COLUMN IF NOT EXISTS last_order_date date,
ADD COLUMN IF NOT EXISTS last_order_amount numeric DEFAULT 0;

-- Create prescription tracking table
CREATE TABLE IF NOT EXISTS public.prescription_tracking (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  doctor_id uuid NOT NULL REFERENCES public.doctors(id) ON DELETE CASCADE,
  product_id uuid NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  frequency_count integer NOT NULL DEFAULT 0,
  last_prescribed_date date,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(doctor_id, product_id)
);

-- Create doctor visit notes table for detailed tracking
CREATE TABLE IF NOT EXISTS public.doctor_visit_notes (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  doctor_id uuid NOT NULL REFERENCES public.doctors(id) ON DELETE CASCADE,
  mr_id uuid NOT NULL REFERENCES public.users(id),
  visit_date date NOT NULL DEFAULT CURRENT_DATE,
  notes text,
  tags text[] DEFAULT '{}',
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS on new tables
ALTER TABLE public.prescription_tracking ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.doctor_visit_notes ENABLE ROW LEVEL SECURITY;

-- RLS Policies for prescription_tracking
CREATE POLICY "Users can view prescription tracking"
  ON public.prescription_tracking FOR SELECT
  USING (
    is_admin() OR 
    EXISTS (
      SELECT 1 FROM public.doctors 
      WHERE doctors.id = prescription_tracking.doctor_id 
      AND doctors.assigned_mr_id = auth.uid()
    )
  );

CREATE POLICY "MRs can manage prescription tracking for their doctors"
  ON public.prescription_tracking FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.doctors 
      WHERE doctors.id = prescription_tracking.doctor_id 
      AND doctors.assigned_mr_id = auth.uid()
    )
  );

CREATE POLICY "Admins can manage all prescription tracking"
  ON public.prescription_tracking FOR ALL
  USING (is_admin());

-- RLS Policies for doctor_visit_notes
CREATE POLICY "Users can view their own visit notes"
  ON public.doctor_visit_notes FOR SELECT
  USING (
    auth.uid() = mr_id OR 
    is_admin() OR
    EXISTS (
      SELECT 1 FROM public.doctors 
      WHERE doctors.id = doctor_visit_notes.doctor_id 
      AND doctors.assigned_mr_id = auth.uid()
    )
  );

CREATE POLICY "MRs can create visit notes for their doctors"
  ON public.doctor_visit_notes FOR INSERT
  WITH CHECK (
    auth.uid() = mr_id AND
    EXISTS (
      SELECT 1 FROM public.doctors 
      WHERE doctors.id = doctor_visit_notes.doctor_id 
      AND doctors.assigned_mr_id = auth.uid()
    )
  );

CREATE POLICY "MRs can update their own visit notes"
  ON public.doctor_visit_notes FOR UPDATE
  USING (auth.uid() = mr_id);

CREATE POLICY "Admins can manage all visit notes"
  ON public.doctor_visit_notes FOR ALL
  USING (is_admin());

-- Create function to calculate relationship score
CREATE OR REPLACE FUNCTION public.calculate_doctor_relationship_score(doctor_id_param uuid)
RETURNS numeric
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  visit_count integer := 0;
  days_since_last_visit integer := 999;
  order_value numeric := 0;
  score numeric := 0;
BEGIN
  -- Count visits in last 3 months from daily_working
  SELECT COUNT(*)
  INTO visit_count
  FROM daily_working
  WHERE doctor_id = doctor_id_param
  AND work_date >= CURRENT_DATE - INTERVAL '3 months';
  
  -- Get days since last visit
  SELECT COALESCE(CURRENT_DATE - MAX(work_date), 999)
  INTO days_since_last_visit
  FROM daily_working
  WHERE doctor_id = doctor_id_param;
  
  -- Get total order value in last 3 months
  SELECT COALESCE(SUM(total_amount), 0)
  INTO order_value
  FROM orders
  WHERE doctor_id = doctor_id_param
  AND order_date >= CURRENT_DATE - INTERVAL '3 months';
  
  -- Calculate score: visits(10 points each) + order_value/1000 - days_since_visit
  score := (visit_count * 10) + (order_value / 1000) - days_since_last_visit;
  
  -- Update the doctor record
  UPDATE doctors 
  SET relationship_score = score,
      last_visit_date = (SELECT MAX(work_date) FROM daily_working WHERE doctor_id = doctor_id_param),
      updated_at = NOW()
  WHERE id = doctor_id_param;
  
  RETURN score;
END;
$$;

-- Create trigger to update doctor's last_visit_date when daily_working is added
CREATE OR REPLACE FUNCTION public.update_doctor_last_visit()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Update doctor's last visit date and recalculate score
  PERFORM calculate_doctor_relationship_score(NEW.doctor_id);
  RETURN NEW;
END;
$$;

CREATE TRIGGER update_doctor_visit_trigger
AFTER INSERT OR UPDATE ON public.daily_working
FOR EACH ROW
EXECUTE FUNCTION public.update_doctor_last_visit();

-- Create trigger to update pharmacy's last_order_date when orders are added
CREATE OR REPLACE FUNCTION public.update_pharmacy_last_order()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE pharmacies
  SET last_order_date = NEW.order_date,
      last_order_amount = NEW.total_amount,
      updated_at = NOW()
  WHERE id = NEW.pharmacy_id;
  RETURN NEW;
END;
$$;

CREATE TRIGGER update_pharmacy_order_trigger
AFTER INSERT OR UPDATE ON public.orders
FOR EACH ROW
EXECUTE FUNCTION public.update_pharmacy_last_order();

-- Add updated_at triggers
CREATE TRIGGER update_prescription_tracking_updated_at
BEFORE UPDATE ON public.prescription_tracking
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_doctor_visit_notes_updated_at
BEFORE UPDATE ON public.doctor_visit_notes
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create index for better performance
CREATE INDEX IF NOT EXISTS idx_prescription_tracking_doctor ON public.prescription_tracking(doctor_id);
CREATE INDEX IF NOT EXISTS idx_doctor_visit_notes_doctor ON public.doctor_visit_notes(doctor_id);
CREATE INDEX IF NOT EXISTS idx_doctor_visit_notes_mr ON public.doctor_visit_notes(mr_id);
CREATE INDEX IF NOT EXISTS idx_doctors_last_visit ON public.doctors(last_visit_date);
CREATE INDEX IF NOT EXISTS idx_doctors_birthday ON public.doctors(birthday);
CREATE INDEX IF NOT EXISTS idx_doctors_anniversary ON public.doctors(anniversary);