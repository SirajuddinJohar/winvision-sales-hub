-- Add target_type to distinguish between MR targets and doctor targets
ALTER TABLE targets ADD COLUMN target_type TEXT DEFAULT 'doctor' CHECK (target_type IN ('mr', 'doctor'));

-- Add created_by to track who created the target
ALTER TABLE targets ADD COLUMN created_by UUID REFERENCES auth.users(id);

-- Update existing targets to be doctor targets
UPDATE targets SET target_type = 'doctor' WHERE target_type IS NULL;

-- Make target_type not nullable
ALTER TABLE targets ALTER COLUMN target_type SET NOT NULL;

-- Drop existing RLS policies
DROP POLICY "Target owners can view their targets" ON targets;
DROP POLICY "Admins can view all targets" ON targets;
DROP POLICY "Admins can manage targets" ON targets;
DROP POLICY "MRs can update their own targets" ON targets;
DROP POLICY "MRs can create targets for themselves and assigned doctors" ON targets;

-- Create new RLS policies
-- MRs can view targets assigned to them (both MR targets and doctor targets they created)
CREATE POLICY "MRs can view their assigned targets" ON targets
  FOR SELECT USING (
    mr_id = auth.uid() OR 
    (target_type = 'doctor' AND created_by = auth.uid())
  );

-- Admins can view all targets
CREATE POLICY "Admins can view all targets" ON targets
  FOR SELECT USING (is_admin());

-- Admins can manage all targets
CREATE POLICY "Admins can manage all targets" ON targets
  FOR ALL USING (is_admin());

-- MRs can only create doctor targets for their assigned doctors
CREATE POLICY "MRs can create doctor targets" ON targets
  FOR INSERT WITH CHECK (
    target_type = 'doctor' AND
    created_by = auth.uid() AND
    mr_id = auth.uid() AND
    (doctor_id IS NULL OR EXISTS (
      SELECT 1 FROM doctors d 
      WHERE d.id = targets.doctor_id AND d.assigned_mr_id = auth.uid()
    ))
  );

-- MRs can only update doctor targets they created
CREATE POLICY "MRs can update their doctor targets" ON targets
  FOR UPDATE USING (
    target_type = 'doctor' AND 
    created_by = auth.uid() AND 
    mr_id = auth.uid()
  );

-- MRs cannot update MR targets (only admins can)
-- MRs cannot delete any targets (only admins can)