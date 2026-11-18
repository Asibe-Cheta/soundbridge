-- Rollback for scripts/cleanup-default-london-profiles.sql. Restores every
-- row from the backup table it created, then drops the backup. Only works
-- if that backup table still exists (it is never dropped automatically).
UPDATE public.profiles AS p
SET location = b.location,
    city = b.city,
    latitude = b.latitude,
    longitude = b.longitude,
    country = b.country,
    country_code = b.country_code,
    location_source = b.location_source,
    updated_at = b.updated_at
FROM public.profiles_default_london_backup_20261118 AS b
WHERE p.id = b.id;

DROP TABLE IF EXISTS public.profiles_default_london_backup_20261118;
