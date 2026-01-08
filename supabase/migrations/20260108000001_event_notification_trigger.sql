-- Event Notification System - Database Trigger
-- Date: January 8, 2026
-- Purpose: Automatically trigger notification webhook when event is created

-- Enable pg_net extension (if not already enabled)
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Create trigger function
-- NOTE: Replace YOUR_PROJECT_REF and YOUR_SERVICE_ROLE_KEY with actual values
-- 
-- HOW TO FIND THESE VALUES:
-- 1. YOUR_PROJECT_REF: Look at your Supabase project URL
--    Example: If URL is https://abcdefgh.supabase.co, use 'abcdefgh'
-- 2. YOUR_SERVICE_ROLE_KEY: Supabase Dashboard → Settings → API → service_role key
--    (NOT the anon/public key - use the service_role key!)
--
CREATE OR REPLACE FUNCTION trigger_event_notifications()
RETURNS TRIGGER AS $$
DECLARE
  function_url TEXT := 'https://aunxdbqukbxyyiusaeqi.supabase.co/functions/v1/send-event-notifications';
  service_role_key TEXT := 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImF1bnhkYnF1a2J4eXlpdXNhZXFpIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MjY5MDYxNSwiZXhwIjoyMDY4MjY2NjE1fQ.xx1XtyOUn-am8gh_bak79xM3J-qQ8y_LGU0n6DlOOys';
BEGIN
  -- Call Edge Function asynchronously using pg_net
  PERFORM
    net.http_post(
      url := function_url,
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || service_role_key
      ),
      body := jsonb_build_object('record', row_to_json(NEW))
    );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Attach trigger to events table
DROP TRIGGER IF EXISTS on_event_created ON events;
CREATE TRIGGER on_event_created
  AFTER INSERT ON events
  FOR EACH ROW
  EXECUTE FUNCTION trigger_event_notifications();

-- Instructions:
-- 1. Replace YOUR_PROJECT_REF with your Supabase project reference
--    (e.g., if your URL is https://abcdefgh.supabase.co, use 'abcdefgh')
-- 2. Replace YOUR_SERVICE_ROLE_KEY with your service role key
--    (Get from Supabase Dashboard → Settings → API → Project API keys → service_role)
-- 3. Run this SQL in Supabase SQL Editor
-- 4. Deploy the Edge Function: supabase functions deploy send-event-notifications
