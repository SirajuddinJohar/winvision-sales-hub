-- Create daily_calls table to track call status
CREATE TABLE public.daily_calls (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  mr_id UUID NOT NULL,
  target_id UUID NOT NULL,
  target_type TEXT NOT NULL CHECK (target_type IN ('doctor', 'pharmacy')),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'complete')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  
  -- Ensure only one call per target per day per MR
  UNIQUE(mr_id, target_id, date)
);

-- Enable Row Level Security
ALTER TABLE public.daily_calls ENABLE ROW LEVEL SECURITY;

-- Create policies for daily_calls
CREATE POLICY "Admins can manage all daily calls" 
ON public.daily_calls 
FOR ALL 
USING (is_admin());

CREATE POLICY "MRs can manage their own daily calls" 
ON public.daily_calls 
FOR ALL 
USING (auth.uid() = mr_id);

-- Add trigger for updating timestamp
CREATE TRIGGER update_daily_calls_updated_at
BEFORE UPDATE ON public.daily_calls
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();