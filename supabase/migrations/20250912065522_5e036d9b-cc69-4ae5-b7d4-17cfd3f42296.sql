-- Add foreign key constraints for expenses table
ALTER TABLE public.expenses 
ADD CONSTRAINT expenses_mr_id_fkey 
FOREIGN KEY (mr_id) REFERENCES public.users(id) ON DELETE CASCADE;

ALTER TABLE public.expenses 
ADD CONSTRAINT expenses_area_id_fkey 
FOREIGN KEY (area_id) REFERENCES public.areas(id) ON DELETE SET NULL;

ALTER TABLE public.expenses 
ADD CONSTRAINT expenses_approved_by_fkey 
FOREIGN KEY (approved_by) REFERENCES public.users(id) ON DELETE SET NULL;