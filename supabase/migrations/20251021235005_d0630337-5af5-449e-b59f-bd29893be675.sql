-- Create enum for tour plan status
CREATE TYPE tour_plan_status AS ENUM ('draft', 'locked', 'approved');

-- Create enum for edit request status
CREATE TYPE edit_request_status AS ENUM ('pending', 'approved', 'rejected');

-- Create tour plans table
CREATE TABLE public.tour_plans (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  month INTEGER NOT NULL CHECK (month >= 1 AND month <= 12),
  year INTEGER NOT NULL CHECK (year >= 2000),
  status tour_plan_status NOT NULL DEFAULT 'draft',
  locked_at TIMESTAMP WITH TIME ZONE,
  approved_by UUID REFERENCES auth.users(id),
  approved_at TIMESTAMP WITH TIME ZONE,
  approval_message TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, month, year)
);

-- Create tour plan days table
CREATE TABLE public.tour_plan_days (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tour_plan_id UUID NOT NULL REFERENCES public.tour_plans(id) ON DELETE CASCADE,
  date INTEGER NOT NULL CHECK (date >= 1 AND date <= 31),
  areas JSONB DEFAULT '[]'::jsonb,
  remarks TEXT,
  is_holiday BOOLEAN DEFAULT false,
  is_weekly_off BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  UNIQUE(tour_plan_id, date)
);

-- Create tour plan edit requests table
CREATE TABLE public.tour_plan_edit_requests (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tour_plan_id UUID NOT NULL REFERENCES public.tour_plans(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  request_reason TEXT,
  status edit_request_status NOT NULL DEFAULT 'pending',
  requested_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  admin_id UUID REFERENCES auth.users(id),
  admin_remarks TEXT,
  admin_response_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.tour_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tour_plan_days ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tour_plan_edit_requests ENABLE ROW LEVEL SECURITY;

-- RLS Policies for tour_plans
CREATE POLICY "Users can view their own tour plans"
  ON public.tour_plans FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all tour plans"
  ON public.tour_plans FOR SELECT
  USING (is_admin());

CREATE POLICY "Users can create their own tour plans"
  ON public.tour_plans FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their draft tour plans"
  ON public.tour_plans FOR UPDATE
  USING (auth.uid() = user_id AND status = 'draft');

CREATE POLICY "Admins can update all tour plans"
  ON public.tour_plans FOR UPDATE
  USING (is_admin());

-- RLS Policies for tour_plan_days
CREATE POLICY "Users can view their own tour plan days"
  ON public.tour_plan_days FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.tour_plans
    WHERE tour_plans.id = tour_plan_days.tour_plan_id
    AND tour_plans.user_id = auth.uid()
  ));

CREATE POLICY "Admins can view all tour plan days"
  ON public.tour_plan_days FOR SELECT
  USING (is_admin());

CREATE POLICY "Users can manage their draft tour plan days"
  ON public.tour_plan_days FOR ALL
  USING (EXISTS (
    SELECT 1 FROM public.tour_plans
    WHERE tour_plans.id = tour_plan_days.tour_plan_id
    AND tour_plans.user_id = auth.uid()
    AND tour_plans.status = 'draft'
  ));

CREATE POLICY "Admins can manage all tour plan days"
  ON public.tour_plan_days FOR ALL
  USING (is_admin());

-- RLS Policies for tour_plan_edit_requests
CREATE POLICY "Users can view their own edit requests"
  ON public.tour_plan_edit_requests FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all edit requests"
  ON public.tour_plan_edit_requests FOR SELECT
  USING (is_admin());

CREATE POLICY "Users can create edit requests"
  ON public.tour_plan_edit_requests FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can update edit requests"
  ON public.tour_plan_edit_requests FOR UPDATE
  USING (is_admin());

-- Create trigger for updated_at
CREATE TRIGGER update_tour_plans_updated_at
  BEFORE UPDATE ON public.tour_plans
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_tour_plan_days_updated_at
  BEFORE UPDATE ON public.tour_plan_days
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();