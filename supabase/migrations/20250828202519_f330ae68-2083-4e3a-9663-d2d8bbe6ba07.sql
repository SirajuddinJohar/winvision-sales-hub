-- Create areas table
CREATE TABLE public.areas (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  area_name TEXT NOT NULL,
  from_location TEXT NOT NULL,
  to_location TEXT NOT NULL,
  distance NUMERIC NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.areas ENABLE ROW LEVEL SECURITY;

-- Create policies for areas access
CREATE POLICY "Users can view all areas" 
ON public.areas 
FOR SELECT 
USING (true);

CREATE POLICY "Authenticated users can create areas" 
ON public.areas 
FOR INSERT 
WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can update areas" 
ON public.areas 
FOR UPDATE 
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Admins can delete areas" 
ON public.areas 
FOR DELETE 
USING (is_admin());

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_areas_updated_at
BEFORE UPDATE ON public.areas
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Add area_id to expenses table
ALTER TABLE public.expenses ADD COLUMN area_id UUID REFERENCES public.areas(id);
ALTER TABLE public.expenses ADD COLUMN travel_allowance NUMERIC DEFAULT 0;
ALTER TABLE public.expenses ADD COLUMN other_expenses NUMERIC DEFAULT 0;