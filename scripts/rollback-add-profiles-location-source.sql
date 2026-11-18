-- Rollback for supabase/migrations/20261116110000_add_profiles_location_source.sql
--
-- Drops the column entirely. This loses whatever classification the backfill
-- script (scripts/backfill-profiles-location-source.sql) had written, so only
-- run this if you are also rolling back
-- 20261116120000_handle_new_user_default_coordinates.sql and want to fully
-- undo this change set.
ALTER TABLE public.profiles
  DROP COLUMN IF EXISTS location_source;
