-- Add area_id to expenses table (if not exists)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'expenses' AND column_name = 'area_id') THEN
    ALTER TABLE public.expenses ADD COLUMN area_id UUID REFERENCES public.areas(id);
  END IF;
END $$;

-- Add travel_allowance to expenses table (if not exists)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'expenses' AND column_name = 'travel_allowance') THEN
    ALTER TABLE public.expenses ADD COLUMN travel_allowance NUMERIC DEFAULT 0;
  END IF;
END $$;

-- Add other_expenses to expenses table (if not exists)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'expenses' AND column_name = 'other_expenses') THEN
    ALTER TABLE public.expenses ADD COLUMN other_expenses NUMERIC DEFAULT 0;
  END IF;
END $$;