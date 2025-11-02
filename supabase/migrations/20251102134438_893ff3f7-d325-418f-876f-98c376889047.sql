-- Create distributor_products table to track products available from each distributor
CREATE TABLE IF NOT EXISTS public.distributor_products (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  distributor_id UUID NOT NULL REFERENCES public."Distributors"(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  quantity INTEGER NOT NULL DEFAULT 0,
  ptr NUMERIC NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(distributor_id, product_id)
);

-- Enable RLS
ALTER TABLE public.distributor_products ENABLE ROW LEVEL SECURITY;

-- RLS Policies for distributor_products
CREATE POLICY "Admins can manage distributor products"
  ON public.distributor_products
  FOR ALL
  USING (is_admin());

CREATE POLICY "MRs can view all distributor products"
  ON public.distributor_products
  FOR SELECT
  USING (true);

-- Create trigger for updated_at
CREATE TRIGGER update_distributor_products_updated_at
  BEFORE UPDATE ON public.distributor_products
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();