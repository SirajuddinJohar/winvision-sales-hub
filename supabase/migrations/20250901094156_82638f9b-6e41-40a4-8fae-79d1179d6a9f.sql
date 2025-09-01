-- Create function to calculate achieved target values from orders
CREATE OR REPLACE FUNCTION calculate_target_achievement(target_id_param UUID)
RETURNS NUMERIC
LANGUAGE SQL
STABLE
AS $$
  SELECT COALESCE(SUM(o.total_amount), 0)
  FROM orders o
  JOIN targets t ON t.id = target_id_param
  WHERE o.mr_id = t.mr_id
    AND (t.doctor_id IS NULL OR o.doctor_id = t.doctor_id)
    AND DATE_TRUNC('month', o.order_date) = DATE_TRUNC('month', t.target_month)
$$;

-- Update RLS policies to allow MRs to create targets for their assigned doctors
DROP POLICY IF EXISTS "MRs can create their own targets" ON targets;

CREATE POLICY "MRs can create targets for themselves and assigned doctors" 
ON targets 
FOR INSERT 
WITH CHECK (
  mr_id = auth.uid() AND (
    doctor_id IS NULL OR 
    EXISTS (
      SELECT 1 FROM doctors d 
      WHERE d.id = doctor_id AND d.assigned_mr_id = auth.uid()
    )
  )
);