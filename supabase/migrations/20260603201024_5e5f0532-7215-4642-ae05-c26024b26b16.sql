
-- Enums
DO $$ BEGIN
  CREATE TYPE reminder_source AS ENUM ('birthday','anniversary','next_call','tour_plan','payment','order_followup','custom');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE reminder_status AS ENUM ('pending','done','dismissed','snoozed');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE reminder_entity_type AS ENUM ('doctor','pharmacy','order','none');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Table
CREATE TABLE IF NOT EXISTS public.reminders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  created_by uuid NOT NULL DEFAULT auth.uid(),
  source reminder_source NOT NULL DEFAULT 'custom',
  is_auto boolean NOT NULL DEFAULT false,
  title text NOT NULL,
  note text,
  remind_date date NOT NULL,
  remind_time time NOT NULL DEFAULT '09:00',
  entity_type reminder_entity_type NOT NULL DEFAULT 'none',
  entity_id uuid,
  link text,
  status reminder_status NOT NULL DEFAULT 'pending',
  snoozed_until date,
  completed_at timestamptz,
  completed_by uuid,
  device_notification_id bigint,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_reminders_user_status_date ON public.reminders(user_id, status, remind_date);
CREATE INDEX IF NOT EXISTS idx_reminders_dedupe ON public.reminders(source, entity_id, remind_date, user_id);

-- Grants
GRANT SELECT, INSERT, UPDATE, DELETE ON public.reminders TO authenticated;
GRANT ALL ON public.reminders TO service_role;

-- RLS
ALTER TABLE public.reminders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users see own reminders or admin all"
  ON public.reminders FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.is_admin());

CREATE POLICY "Users insert own or admin any"
  ON public.reminders FOR INSERT TO authenticated
  WITH CHECK (created_by = auth.uid() AND (user_id = auth.uid() OR public.is_admin()));

CREATE POLICY "Users update own reminders or admin"
  ON public.reminders FOR UPDATE TO authenticated
  USING (user_id = auth.uid() OR public.is_admin());

CREATE POLICY "Users delete own reminders or admin"
  ON public.reminders FOR DELETE TO authenticated
  USING (user_id = auth.uid() OR public.is_admin());

-- 30-day cap validation trigger for manual next_call
CREATE OR REPLACE FUNCTION public.validate_reminder_next_call()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF NEW.source = 'next_call' AND NEW.is_auto = false THEN
    IF NEW.remind_date > (CURRENT_DATE + INTERVAL '30 days')::date THEN
      RAISE EXCEPTION 'Next call reminder cannot be more than 30 days from today';
    END IF;
    IF NEW.remind_date < CURRENT_DATE THEN
      RAISE EXCEPTION 'Next call reminder cannot be in the past';
    END IF;
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_validate_reminder_next_call ON public.reminders;
CREATE TRIGGER trg_validate_reminder_next_call
  BEFORE INSERT OR UPDATE ON public.reminders
  FOR EACH ROW EXECUTE FUNCTION public.validate_reminder_next_call();

-- updated_at
DROP TRIGGER IF EXISTS trg_reminders_updated_at ON public.reminders;
CREATE TRIGGER trg_reminders_updated_at
  BEFORE UPDATE ON public.reminders
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
