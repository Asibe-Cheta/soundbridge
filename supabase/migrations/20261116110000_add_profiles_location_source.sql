-- Adds profiles.location_source, a provenance flag for the location fields
-- (location, city, latitude, longitude, country), so a stub signup default
-- can never again be mistaken for a value the user actually chose.
--
-- Values: 'default'  = stamped by handle_new_user() or an app-level fallback
--                       at signup, never a real typed or geocoded value.
--         'user'      = real typed text that either hasn't been geocoded or
--                       failed to geocode (resolveLocationUpdate keeps the
--                       typed text either way).
--         'geocoded'  = real typed text that successfully resolved to a
--                       place (city/latitude/longitude/country all set).
--
-- Deliberately nullable with no table-level DEFAULT: existing rows created
-- before this column existed get NULL (unknown provenance) until the
-- backfill script (scripts/backfill-profiles-location-source.sql) classifies
-- what it safely can. New rows must set it explicitly going forward, either
-- by handle_new_user() (20261116120000) or by resolveLocationUpdate()
-- (apps/web/src/lib/geocoding.ts) on every write path.
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS location_source TEXT
  CHECK (location_source IN ('default', 'user', 'geocoded'));

COMMENT ON COLUMN public.profiles.location_source IS
  'Provenance of location/city/latitude/longitude/country: default (signup stub, never chosen), user (real typed text), geocoded (real typed text resolved to coordinates). NULL means unknown, from before this column existed.';
