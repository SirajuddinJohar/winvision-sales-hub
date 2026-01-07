-- Add created_by column to areas table to track which MR created the area
ALTER TABLE public.areas 
ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES auth.users(id);

-- Create index for better query performance
CREATE INDEX IF NOT EXISTS idx_areas_created_by ON public.areas(created_by);