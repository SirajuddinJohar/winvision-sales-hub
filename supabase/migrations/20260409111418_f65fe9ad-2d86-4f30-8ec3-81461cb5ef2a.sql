
-- Create order_items table for line items
CREATE TABLE public.order_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  product_id UUID NOT NULL,
  quantity INTEGER NOT NULL DEFAULT 0,
  unit_price NUMERIC NOT NULL DEFAULT 0,
  total_amount NUMERIC GENERATED ALWAYS AS (quantity * unit_price) STORED,
  scheme TEXT DEFAULT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;

-- RLS policies for order_items
CREATE POLICY "Admins can manage all order items"
ON public.order_items FOR ALL
USING (is_admin())
WITH CHECK (is_admin());

CREATE POLICY "MRs can create order items for their orders"
ON public.order_items FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.orders 
    WHERE orders.id = order_items.order_id 
    AND orders.mr_id = auth.uid()
  )
);

CREATE POLICY "MRs can view their own order items"
ON public.order_items FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.orders 
    WHERE orders.id = order_items.order_id 
    AND orders.mr_id = auth.uid()
  )
  OR is_admin()
);

-- Migrate existing orders data into order_items
INSERT INTO public.order_items (order_id, product_id, quantity, unit_price, scheme)
SELECT id, product_id, quantity, unit_price, scheme
FROM public.orders;

-- Now clean up orders table - make product_id, quantity, unit_price, scheme optional 
-- (keeping columns for backward compat, but they're now in order_items)
ALTER TABLE public.orders ALTER COLUMN product_id DROP NOT NULL;
ALTER TABLE public.orders ALTER COLUMN quantity DROP NOT NULL;
ALTER TABLE public.orders ALTER COLUMN unit_price DROP NOT NULL;
