CREATE TABLE public.joint_work_sessions (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  asm_id uuid NOT NULL,
  code text NOT NULL UNIQUE,
  work_date date NOT NULL DEFAULT (now() AT TIME ZONE 'Asia/Kolkata')::date,
  expires_at timestamp with time zone NOT NULL DEFAULT (now() + interval '12 hours'),
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.joint_work_sessions TO authenticated;
GRANT ALL ON public.joint_work_sessions TO service_role;

ALTER TABLE public.joint_work_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Managers manage their own sessions"
ON public.joint_work_sessions FOR ALL TO authenticated
USING (asm_id = auth.uid() OR public.is_admin())
WITH CHECK (asm_id = auth.uid() OR public.is_admin());

CREATE POLICY "Staff can read active sessions to validate scans"
ON public.joint_work_sessions FOR SELECT TO authenticated
USING (expires_at > now());

CREATE TABLE public.joint_work_confirmations (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id uuid NOT NULL REFERENCES public.joint_work_sessions(id) ON DELETE CASCADE,
  mr_id uuid NOT NULL,
  asm_id uuid NOT NULL,
  work_date date NOT NULL,
  scanned_at timestamp with time zone NOT NULL DEFAULT now(),
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE (mr_id, work_date)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.joint_work_confirmations TO authenticated;
GRANT ALL ON public.joint_work_confirmations TO service_role;

ALTER TABLE public.joint_work_confirmations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "MRs create their own confirmations"
ON public.joint_work_confirmations FOR INSERT TO authenticated
WITH CHECK (mr_id = auth.uid());

CREATE POLICY "MR, manager and admin can view confirmations"
ON public.joint_work_confirmations FOR SELECT TO authenticated
USING (mr_id = auth.uid() OR asm_id = auth.uid() OR public.is_admin());

CREATE POLICY "MR or admin can delete confirmations"
ON public.joint_work_confirmations FOR DELETE TO authenticated
USING (mr_id = auth.uid() OR public.is_admin());

CREATE TRIGGER update_joint_work_sessions_updated_at
BEFORE UPDATE ON public.joint_work_sessions
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_joint_work_confirmations_updated_at
BEFORE UPDATE ON public.joint_work_confirmations
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();