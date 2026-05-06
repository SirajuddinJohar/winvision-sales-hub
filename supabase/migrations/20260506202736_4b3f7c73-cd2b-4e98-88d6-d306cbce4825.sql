
CREATE TABLE public.product_stock_history (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  product_id UUID NOT NULL,
  product_name TEXT NOT NULL,
  product_type TEXT NOT NULL,
  change_type TEXT NOT NULL,
  quantity_change INTEGER NOT NULL,
  previous_stock INTEGER NOT NULL,
  new_stock INTEGER NOT NULL,
  reason TEXT,
  changed_by UUID,
  changed_by_name TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.product_stock_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view all stock history"
ON public.product_stock_history FOR SELECT
USING (is_admin());

CREATE POLICY "Authenticated users can insert stock history"
ON public.product_stock_history FOR INSERT
WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Users can view stock history they created"
ON public.product_stock_history FOR SELECT
USING (auth.uid() = changed_by);

CREATE INDEX idx_product_stock_history_product ON public.product_stock_history(product_id, created_at DESC);
CREATE INDEX idx_product_stock_history_type ON public.product_stock_history(product_type, created_at DESC);
