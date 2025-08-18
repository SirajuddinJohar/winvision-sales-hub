-- Phase 1: Create Security Definer Functions to prevent RLS recursion
CREATE OR REPLACE FUNCTION public.get_current_user_role()
RETURNS user_role AS $$
  SELECT role FROM public.users WHERE id = auth.uid();
$$ LANGUAGE SQL SECURITY DEFINER STABLE;

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.users 
    WHERE id = auth.uid() AND role = 'admin'
  );
$$ LANGUAGE SQL SECURITY DEFINER STABLE;

-- Phase 2: Add Territory/Assignment System
ALTER TABLE public.doctors ADD COLUMN assigned_mr_id uuid REFERENCES public.users(id);
ALTER TABLE public.doctors ADD COLUMN territory text;

CREATE TABLE public.mr_pharmacy_assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  mr_id uuid REFERENCES public.users(id) ON DELETE CASCADE,
  pharmacy_id uuid REFERENCES public.pharmacies(id) ON DELETE CASCADE,
  created_at timestamp with time zone DEFAULT now(),
  UNIQUE(mr_id, pharmacy_id)
);

ALTER TABLE public.mr_pharmacy_assignments ENABLE ROW LEVEL SECURITY;

-- Phase 3: Fix Critical RLS Policies

-- Drop existing overly permissive policies
DROP POLICY IF EXISTS "Authenticated users can view doctors" ON public.doctors;
DROP POLICY IF EXISTS "Authenticated users can insert doctors" ON public.doctors;
DROP POLICY IF EXISTS "Authenticated users can update doctors" ON public.doctors;
DROP POLICY IF EXISTS "Authenticated users can view orders" ON public.orders;
DROP POLICY IF EXISTS "Authenticated users can manage targets" ON public.targets;
DROP POLICY IF EXISTS "Authenticated users can view targets" ON public.targets;
DROP POLICY IF EXISTS "Authenticated users can manage pharmacies" ON public.pharmacies;
DROP POLICY IF EXISTS "Authenticated users can view pharmacies" ON public.pharmacies;

-- DOCTORS: Restrict access to assigned MRs and admins
CREATE POLICY "Admins can view all doctors" ON public.doctors
  FOR SELECT USING (public.is_admin());

CREATE POLICY "MRs can view their assigned doctors" ON public.doctors
  FOR SELECT USING (assigned_mr_id = auth.uid());

CREATE POLICY "Admins can manage doctors" ON public.doctors
  FOR ALL USING (public.is_admin());

CREATE POLICY "MRs can update their assigned doctors" ON public.doctors
  FOR UPDATE USING (assigned_mr_id = auth.uid());

-- ORDERS: Restrict to order creator and admins only
DROP POLICY IF EXISTS "Authenticated users can view orders" ON public.orders;

CREATE POLICY "Order creators can view their orders" ON public.orders
  FOR SELECT USING (mr_id = auth.uid());

CREATE POLICY "Admins can view all orders" ON public.orders
  FOR SELECT USING (public.is_admin());

CREATE POLICY "Admins can delete orders" ON public.orders
  FOR DELETE USING (public.is_admin());

-- TARGETS: Restrict to assigned MR and admins
CREATE POLICY "Target owners can view their targets" ON public.targets
  FOR SELECT USING (mr_id = auth.uid());

CREATE POLICY "Admins can view all targets" ON public.targets
  FOR SELECT USING (public.is_admin());

CREATE POLICY "Admins can manage targets" ON public.targets
  FOR ALL USING (public.is_admin());

CREATE POLICY "MRs can update their own targets" ON public.targets
  FOR UPDATE USING (mr_id = auth.uid());

CREATE POLICY "MRs can create their own targets" ON public.targets
  FOR INSERT WITH CHECK (mr_id = auth.uid());

-- PHARMACIES: Restrict based on assignments
CREATE POLICY "Admins can view all pharmacies" ON public.pharmacies
  FOR SELECT USING (public.is_admin());

CREATE POLICY "MRs can view assigned pharmacies" ON public.pharmacies
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.mr_pharmacy_assignments 
      WHERE mr_id = auth.uid() AND pharmacy_id = public.pharmacies.id
    )
  );

CREATE POLICY "Admins can manage pharmacies" ON public.pharmacies
  FOR ALL USING (public.is_admin());

-- MR PHARMACY ASSIGNMENTS: Secure access
CREATE POLICY "Admins can manage assignments" ON public.mr_pharmacy_assignments
  FOR ALL USING (public.is_admin());

CREATE POLICY "MRs can view their assignments" ON public.mr_pharmacy_assignments
  FOR SELECT USING (mr_id = auth.uid());

-- EXPENSES: Add admin delete policy
CREATE POLICY "Admins can delete expenses" ON public.expenses
  FOR DELETE USING (public.is_admin());

-- Phase 4: Make critical foreign keys non-nullable
ALTER TABLE public.orders ALTER COLUMN mr_id SET NOT NULL;
ALTER TABLE public.orders ALTER COLUMN doctor_id SET NOT NULL;
ALTER TABLE public.orders ALTER COLUMN pharmacy_id SET NOT NULL;
ALTER TABLE public.orders ALTER COLUMN product_id SET NOT NULL;

ALTER TABLE public.targets ALTER COLUMN mr_id SET NOT NULL;
ALTER TABLE public.expenses ALTER COLUMN mr_id SET NOT NULL;

-- Phase 5: Add constraints for data integrity
ALTER TABLE public.orders ADD CONSTRAINT check_positive_quantity CHECK (quantity > 0);
ALTER TABLE public.orders ADD CONSTRAINT check_positive_unit_price CHECK (unit_price > 0);
ALTER TABLE public.targets ADD CONSTRAINT check_positive_target_value CHECK (target_value > 0);
ALTER TABLE public.expenses ADD CONSTRAINT check_positive_amount CHECK (amount > 0);

-- Update sample data to include assignments
UPDATE public.doctors SET assigned_mr_id = (SELECT id FROM public.users WHERE email = 'mr@winvision.com' LIMIT 1), territory = 'North District' WHERE name = 'Dr. Sarah Johnson';
UPDATE public.doctors SET assigned_mr_id = (SELECT id FROM public.users WHERE email = 'mr@winvision.com' LIMIT 1), territory = 'North District' WHERE name = 'Dr. Michael Chen';

-- Insert pharmacy assignments
INSERT INTO public.mr_pharmacy_assignments (mr_id, pharmacy_id)
SELECT 
  (SELECT id FROM public.users WHERE email = 'mr@winvision.com' LIMIT 1),
  id
FROM public.pharmacies;