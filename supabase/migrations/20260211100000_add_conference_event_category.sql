-- Add 'Conference' to event_category enum so notifications show "Conference" not "Other"
-- (API and mobile send "Conference"; we were storing it as 'Other' and push said "Ebuka's Other")

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_enum e
    JOIN pg_type t ON e.enumtypid = t.oid
    WHERE t.typname = 'event_category' AND e.enumlabel = 'Conference'
  ) THEN
    ALTER TYPE event_category ADD VALUE 'Conference';
  END IF;
END $$;
