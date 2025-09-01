-- Fix the function search path security issue
CREATE OR REPLACE FUNCTION calculate_target_achievement(target_id_param UUID)
RETURNS NUMERIC
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(SUM(o.total_amount), 0)
  FROM orders o
  JOIN targets t ON t.id = target_id_param
  WHERE o.mr_id = t.mr_id
    AND (t.doctor_id IS NULL OR o.doctor_id = t.doctor_id)
    AND DATE_TRUNC('month', o.order_date) = DATE_TRUNC('month', t.target_month)
$$;