-- Add photo_url column to doctors table
ALTER TABLE public.doctors
ADD COLUMN IF NOT EXISTS photo_url text;

-- Add photo_url column to pharmacies table
ALTER TABLE public.pharmacies
ADD COLUMN IF NOT EXISTS photo_url text;

-- Add location column to daily_working table for GPS tracking
ALTER TABLE public.daily_working
ADD COLUMN IF NOT EXISTS location jsonb;

-- Add comment to explain location structure
COMMENT ON COLUMN public.daily_working.location IS 'GPS location data with latitude, longitude, accuracy, and timestamp';
