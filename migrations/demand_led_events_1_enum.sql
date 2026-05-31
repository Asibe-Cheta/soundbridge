-- Step 1 of 2 — run this first, then demand_led_events_2_schema.sql
-- (Postgres requires new enum values to be committed before use.)

ALTER TYPE public.message_type ADD VALUE IF NOT EXISTS 'event_poll';
