-- Add phone and location columns to doctors table
ALTER TABLE public.doctors 
ADD COLUMN IF NOT EXISTS phone text,
ADD COLUMN IF NOT EXISTS location jsonb;