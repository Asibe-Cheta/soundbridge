-- Step 1 of 2: add enum value (must run in its own transaction before demand_led_events.sql)
-- Postgres error 55P04 if combined with functions/policies that use 'event_poll'.

ALTER TYPE public.message_type ADD VALUE IF NOT EXISTS 'event_poll';
