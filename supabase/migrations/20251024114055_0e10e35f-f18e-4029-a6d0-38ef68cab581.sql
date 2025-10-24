-- Add edit_until column to tour_plans table for time-based edit windows
ALTER TABLE tour_plans 
ADD COLUMN edit_until timestamp with time zone DEFAULT NULL;

-- Add comment for documentation
COMMENT ON COLUMN tour_plans.edit_until IS 'Timestamp until which the tour plan can be edited. NULL means no time restriction (initial draft state). Used for 24-hour edit windows on 1st of month and after admin approval.';