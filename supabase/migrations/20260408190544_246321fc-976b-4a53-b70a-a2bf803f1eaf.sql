
-- Add new columns to purchases for bill-level data
ALTER TABLE public.purchases 
  ADD COLUMN IF NOT EXISTS gst_amount numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS transport_amount numeric NOT NULL DEFAULT 0;

-- Create purchase_items table for multiple products per bill
CREATE TABLE public.purchase_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  purchase_id uuid NOT NULL REFERENCES public.purchases(id) ON DELETE CASCADE,
  product_id uuid NOT NULL REFERENCES public.products(id),
  quantity integer NOT NULL DEFAULT 0,
  unit_cost numeric NOT NULL DEFAULT 0,
  total_cost numeric GENERATED ALWAYS AS (quantity * unit_cost) STORED,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.purchase_items ENABLE ROW LEVEL SECURITY;

-- Admin-only access
CREATE POLICY "Admins can manage all purchase items"
  ON public.purchase_items
  FOR ALL
  USING (is_admin())
  WITH CHECK (is_admin());

-- Index for fast lookups
CREATE INDEX idx_purchase_items_purchase_id ON public.purchase_items(purchase_id);
