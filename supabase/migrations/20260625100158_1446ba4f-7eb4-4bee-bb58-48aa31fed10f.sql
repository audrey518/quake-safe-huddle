SELECT cron.unschedule(jobid) FROM cron.job WHERE jobname='appointment-reminders-daily';
SELECT cron.schedule(
  'appointment-reminders-hourly',
  '0 * * * *',
  $$
  SELECT net.http_post(
    url:='https://project--02904c30-5b58-417d-9e2f-21859f5ef47b.lovable.app/api/public/hooks/appointment-reminders',
    headers:='{"Content-Type": "application/json", "apikey": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZpbXlidGlwcXhtc2xiaGN3eXpjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODIyODQxOTIsImV4cCI6MjA5Nzg2MDE5Mn0.avY5RWV4Z3doeyjmvhqRmNJCtwWo0rMs0JRz8wLTWVs"}'::jsonb,
    body:='{}'::jsonb
  );
  $$
);