
-- Drop the generated column and recreate as regular column
ALTER TABLE public.order_items DROP COLUMN total_amount;
ALTER TABLE public.order_items ADD COLUMN total_amount numeric;

-- Create trigger to auto-compute total_amount
CREATE OR REPLACE FUNCTION public.compute_order_item_total()
RETURNS TRIGGER AS $$
BEGIN
  NEW.total_amount := NEW.quantity * NEW.unit_price;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER trg_compute_order_item_total
BEFORE INSERT OR UPDATE ON public.order_items
FOR EACH ROW
EXECUTE FUNCTION public.compute_order_item_total();

-- Update existing rows
UPDATE public.order_items SET total_amount = quantity * unit_price WHERE total_amount IS NULL;
