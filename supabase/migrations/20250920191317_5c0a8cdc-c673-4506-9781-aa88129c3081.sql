-- Add type field to products table for sample/regular classification
ALTER TABLE public.products 
ADD COLUMN product_type TEXT NOT NULL DEFAULT 'regular' 
CHECK (product_type IN ('regular', 'sample'));

-- Create daily_working table to store daily working records
CREATE TABLE public.daily_working (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  doctor_id UUID NOT NULL,
  mr_id UUID NOT NULL,
  distributor_id UUID,
  work_date DATE NOT NULL DEFAULT CURRENT_DATE,
  sample_details JSONB DEFAULT '[]'::jsonb,
  order_details JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.daily_working ENABLE ROW LEVEL SECURITY;

-- Create policies for daily_working
CREATE POLICY "MRs can view their own daily working records" 
ON public.daily_working 
FOR SELECT 
USING (auth.uid() = mr_id);

CREATE POLICY "MRs can create their own daily working records" 
ON public.daily_working 
FOR INSERT 
WITH CHECK (auth.uid() = mr_id);

CREATE POLICY "MRs can update their own daily working records" 
ON public.daily_working 
FOR UPDATE 
USING (auth.uid() = mr_id);

CREATE POLICY "Admins can view all daily working records" 
ON public.daily_working 
FOR SELECT 
USING (is_admin());

CREATE POLICY "Admins can manage all daily working records" 
ON public.daily_working 
FOR ALL 
USING (is_admin());

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_daily_working_updated_at
BEFORE UPDATE ON public.daily_working
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Add some sample products for testing
INSERT INTO public.products (name, category, price, stock, description, product_type) VALUES
  ('Sample Pack A', 'Samples', 0, 100, 'Free sample for doctors', 'sample'),
  ('Sample Pack B', 'Samples', 0, 150, 'Free sample for doctors', 'sample'),
  ('Sample Pack C', 'Samples', 0, 75, 'Free sample for doctors', 'sample')
ON CONFLICT DO NOTHING;