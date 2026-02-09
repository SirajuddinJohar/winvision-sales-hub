-- Make doctor_id nullable so orders can be placed without a doctor (pharmacy-only orders)
ALTER TABLE public.orders ALTER COLUMN doctor_id DROP NOT NULL;