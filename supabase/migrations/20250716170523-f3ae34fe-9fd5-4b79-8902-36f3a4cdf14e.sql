-- Enable cron extension if not already enabled
SELECT cron.schedule(
  'workable-sync-all-users',
  '0 */6 * * *', -- Every 6 hours
  $$
  SELECT
    net.http_post(
        url:='https://doulsumepjfihqowzheq.supabase.co/functions/v1/background-workable-sync',
        headers:='{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRvdWxzdW1lcGpmaWhxb3d6aGVxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDg4Nzk3ODgsImV4cCI6MjA2NDQ1NTc4OH0.IewqiemFwcu74Y8Gla-XJUMiQp-ym8J-i0niylIVK2A"}'::jsonb,
        body:='{"scheduled": true}'::jsonb
    ) as request_id;
  $$
);