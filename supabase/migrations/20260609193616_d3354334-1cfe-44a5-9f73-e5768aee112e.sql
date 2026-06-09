CREATE OR REPLACE FUNCTION public.notify_reminder_push()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM net.http_post(
    url := 'https://tpahcxguioazflxnhrcd.supabase.co/functions/v1/send-reminder-push',
    headers := jsonb_build_object('Content-Type','application/json'),
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