-- Create a proper pharmacies table separate from distributors
CREATE TABLE public.pharmacies (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  contact_person TEXT NOT NULL,
  dl_number_part1 TEXT NOT NULL,
  dl_number_part2 TEXT NOT NULL,
  phone TEXT NOT NULL,
  city TEXT NOT NULL,
  address TEXT NOT NULL,
  gstin TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on pharmacies table
ALTER TABLE public.pharmacies ENABLE ROW LEVEL SECURITY;

-- Create policies for pharmacies
CREATE POLICY "MRs can view all pharmacies" 
ON public.pharmacies 
FOR SELECT 
USING (true);

CREATE POLICY "Admins can manage pharmacies" 
ON public.pharmacies 
FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM users 
    WHERE users.id = auth.uid() 
    AND users.role = 'admin'
  )
);

CREATE POLICY "MRs can create pharmacies"
ON public.pharmacies
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM users 
    WHERE users.id = auth.uid() 
    AND users.role IN ('admin', 'mr')
  )
);

CREATE POLICY "MRs can update pharmacies"
ON public.pharmacies
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM users 
    WHERE users.id = auth.uid() 
    AND users.role IN ('admin', 'mr')
  )
);

-- Add trigger for updated_at
CREATE TRIGGER update_pharmacies_updated_at
BEFORE UPDATE ON public.pharmacies
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();