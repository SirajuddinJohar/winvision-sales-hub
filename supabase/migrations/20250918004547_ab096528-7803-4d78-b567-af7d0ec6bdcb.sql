-- Fix security issues by setting search_path for functions
CREATE OR REPLACE FUNCTION calculate_target_achievement(target_id_param UUID)
RETURNS NUMERIC AS $$
DECLARE
    target_record RECORD;
    achieved_amount NUMERIC := 0;
BEGIN
    -- Get target details
    SELECT target_type, target_month, doctor_id, mr_id 
    INTO target_record
    FROM targets 
    WHERE id = target_id_param;
    
    IF NOT FOUND THEN
        RETURN 0;
    END IF;
    
    -- Calculate achieved amount based on target type
    IF target_record.target_type = 'doctor' AND target_record.doctor_id IS NOT NULL THEN
        -- Sum orders for this specific doctor in the target month
        SELECT COALESCE(SUM(total_amount), 0)
        INTO achieved_amount
        FROM orders 
        WHERE doctor_id = target_record.doctor_id
        AND DATE_TRUNC('month', order_date) = DATE_TRUNC('month', target_record.target_month::date);
        
    ELSIF target_record.target_type = 'mr' THEN
        -- Sum all orders for this MR in the target month
        SELECT COALESCE(SUM(total_amount), 0)
        INTO achieved_amount
        FROM orders 
        WHERE mr_id = target_record.mr_id
        AND DATE_TRUNC('month', order_date) = DATE_TRUNC('month', target_record.target_month::date);
    END IF;
    
    -- Update the achieved_value in targets table
    UPDATE targets 
    SET achieved_value = achieved_amount, updated_at = NOW()
    WHERE id = target_id_param;
    
    RETURN achieved_amount;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Fix search path for trigger function
CREATE OR REPLACE FUNCTION update_target_achievements()
RETURNS TRIGGER AS $$
DECLARE
    target_ids UUID[];
BEGIN
    -- Handle INSERT/UPDATE
    IF TG_OP = 'INSERT' OR TG_OP = 'UPDATE' THEN
        -- Find all targets that might be affected by this order
        SELECT ARRAY_AGG(DISTINCT id) INTO target_ids
        FROM targets t
        WHERE (
            -- Doctor targets for this specific doctor in the same month
            (t.target_type = 'doctor' 
             AND t.doctor_id = NEW.doctor_id 
             AND DATE_TRUNC('month', t.target_month::date) = DATE_TRUNC('month', NEW.order_date))
            OR 
            -- MR targets for this MR in the same month
            (t.target_type = 'mr' 
             AND t.mr_id = NEW.mr_id 
             AND DATE_TRUNC('month', t.target_month::date) = DATE_TRUNC('month', NEW.order_date))
        );
        
        -- Update achievements for affected targets
        IF target_ids IS NOT NULL THEN
            PERFORM calculate_target_achievement(unnest) FROM unnest(target_ids);
        END IF;
        
        RETURN NEW;
    END IF;
    
    -- Handle DELETE
    IF TG_OP = 'DELETE' THEN
        -- Find all targets that might be affected by this order deletion
        SELECT ARRAY_AGG(DISTINCT id) INTO target_ids
        FROM targets t
        WHERE (
            -- Doctor targets for this specific doctor in the same month
            (t.target_type = 'doctor' 
             AND t.doctor_id = OLD.doctor_id 
             AND DATE_TRUNC('month', t.target_month::date) = DATE_TRUNC('month', OLD.order_date))
            OR 
            -- MR targets for this MR in the same month
            (t.target_type = 'mr' 
             AND t.mr_id = OLD.mr_id 
             AND DATE_TRUNC('month', t.target_month::date) = DATE_TRUNC('month', OLD.order_date))
        );
        
        -- Update achievements for affected targets
        IF target_ids IS NOT NULL THEN
            PERFORM calculate_target_achievements(unnest) FROM unnest(target_ids);
        END IF;
        
        RETURN OLD;
    END IF;
    
    RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;