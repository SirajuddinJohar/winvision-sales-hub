
CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA extensions;
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;

-- Remove old job with same name if it exists
DO $$ BEGIN
  PERFORM cron.unschedule('generate-reminders-daily');
EXCEPTION WHEN OTHERS THEN NULL; END $$;

SELECT cron.schedule(
  'generate-reminders-daily',
  '30 1 * * *',
  $$
  SELECT net.http_post(
    url:='https://tpahcxguioazflxnhrcd.supabase.co/functions/v1/generate-reminders',
    headers:='{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRwYWhjeGd1aW9hemZseG5ocmNkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTU0OTQ2MTYsImV4cCI6MjA3MTA3MDYxNn0.IGWFC65FvI-sxaoVmO5lyJtdeVEpWFRqgRi1hJzXFU4"}'::jsonb,
    body:='{}'::jsonb
  );
  $$
);
