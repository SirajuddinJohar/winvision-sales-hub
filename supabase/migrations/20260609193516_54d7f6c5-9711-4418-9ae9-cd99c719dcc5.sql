-- Device tokens table for push notifications
CREATE TABLE public.device_tokens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  token text NOT NULL,
  platform text NOT NULL CHECK (platform IN ('ios','android','web')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (token)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.device_tokens TO authenticated;
GRANT ALL ON public.device_tokens TO service_role;

ALTER TABLE public.device_tokens ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own device tokens"
  ON public.device_tokens FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins view all device tokens"
  ON public.device_tokens FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'));

CREATE INDEX idx_device_tokens_user ON public.device_tokens(user_id);

CREATE TRIGGER trg_device_tokens_updated
  BEFORE UPDATE ON public.device_tokens
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Trigger to invoke push edge function on new reminder
CREATE OR REPLACE FUNCTION public.notify_reminder_push()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_url text;
  v_key text;
BEGIN
  -- Read project URL + service role key from vault/settings
  SELECT decrypted_secret INTO v_url FROM vault.decrypted_secrets WHERE name = 'project_url' LIMIT 1;
  SELECT decrypted_secret INTO v_key FROM vault.decrypted_secrets WHERE name = 'service_role_key' LIMIT 1;

  IF v_url IS NULL OR v_key IS NULL THEN
    RETURN NEW;
  END IF;

  PERFORM net.http_post(
    url := v_url || '/functions/v1/send-reminder-push',
    headers := jsonb_build_object(
      'Content-Type','application/json',
      'Authorization','Bearer ' || v_key
    ),
    body := jsonb_build_object(
      'reminder_id', NEW.id,
      'user_id', NEW.user_id,
      'title', NEW.title,
      'body', COALESCE(NEW.note,''),
      'link', NEW.link,
      'remind_date', NEW.remind_date,
      'remind_time', NEW.remind_time
    )
  );
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'notify_reminder_push failed: %', SQLERRM;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_reminders_push
  AFTER INSERT ON public.reminders
  FOR EACH ROW EXECUTE FUNCTION public.notify_reminder_push();
