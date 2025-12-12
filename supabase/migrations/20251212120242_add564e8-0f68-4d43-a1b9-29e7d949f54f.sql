-- Create secondary_sales table
CREATE TABLE public.secondary_sales (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  distributor_id UUID NOT NULL,
  sales_month DATE NOT NULL,
  description TEXT,
  image_url TEXT,
  created_by UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.secondary_sales ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Admins can manage all secondary sales"
ON public.secondary_sales
FOR ALL
USING (is_admin());

CREATE POLICY "MRs can view their own secondary sales"
ON public.secondary_sales
FOR SELECT
USING (auth.uid() = created_by);

CREATE POLICY "MRs can create their own secondary sales"
ON public.secondary_sales
FOR INSERT
WITH CHECK (auth.uid() = created_by);

CREATE POLICY "MRs can update their own secondary sales"
ON public.secondary_sales
FOR UPDATE
USING (auth.uid() = created_by);

-- Add trigger for updated_at
CREATE TRIGGER update_secondary_sales_updated_at
BEFORE UPDATE ON public.secondary_sales
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();