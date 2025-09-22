-- Update Distributors table to support pharmacy requirements
-- Add missing fields for pharmacy functionality
ALTER TABLE public."Distributors" 
ADD COLUMN IF NOT EXISTS dl_number_part1 TEXT,
ADD COLUMN IF NOT EXISTS dl_number_part2 TEXT,
ADD COLUMN IF NOT EXISTS city TEXT,
ADD COLUMN IF NOT EXISTS gstin TEXT,
ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES auth.users(id);

-- Update existing records to have proper structure
UPDATE public."Distributors" 
SET 
  dl_number_part1 = COALESCE(dl_number_part1, ''),
  dl_number_part2 = COALESCE(dl_number_part2, ''),
  city = COALESCE(city, ''),
  created_by = COALESCE(created_by, (SELECT id FROM auth.users LIMIT 1))
WHERE dl_number_part1 IS NULL OR dl_number_part2 IS NULL OR city IS NULL;