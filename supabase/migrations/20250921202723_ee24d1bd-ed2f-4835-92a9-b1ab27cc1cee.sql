-- Enable RLS on Distributors table and create policies for MR access
ALTER TABLE public."Distributors" ENABLE ROW LEVEL SECURITY;

-- Allow MRs to view all distributors (they need to select distributors for orders)
CREATE POLICY "MRs can view all distributors" 
ON public."Distributors" 
FOR SELECT 
USING (true);

-- Allow admins to manage distributors
CREATE POLICY "Admins can manage distributors" 
ON public."Distributors" 
FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM users 
    WHERE users.id = auth.uid() 
    AND users.role = 'admin'
  )
);