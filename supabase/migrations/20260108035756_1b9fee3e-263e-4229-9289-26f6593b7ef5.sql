-- Create daily_working_setup table to store user's daily work preferences
CREATE TABLE public.daily_working_setup (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  mr_id UUID NOT NULL,
  work_date DATE NOT NULL DEFAULT CURRENT_DATE,
  work_type TEXT NOT NULL CHECK (work_type IN ('leave', 'holiday', 'on_field')),
  working_with TEXT CHECK (working_with IN ('individual', 'manager')),
  selected_areas JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(mr_id, work_date)
);

-- Enable Row Level Security
ALTER TABLE public.daily_working_setup ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "MRs can view their own daily setup"
ON public.daily_working_setup
FOR SELECT
USING (auth.uid() = mr_id);

CREATE POLICY "MRs can create their own daily setup"
ON public.daily_working_setup
FOR INSERT
WITH CHECK (auth.uid() = mr_id);

CREATE POLICY "MRs can update their own daily setup"
ON public.daily_working_setup
FOR UPDATE
USING (auth.uid() = mr_id);

CREATE POLICY "Admins can view all daily setups"
ON public.daily_working_setup
FOR SELECT
USING (is_admin());

CREATE POLICY "Admins can manage all daily setups"
ON public.daily_working_setup
FOR ALL
USING (is_admin());

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_daily_working_setup_updated_at
BEFORE UPDATE ON public.daily_working_setup
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();