-- Correct bad branding defaults introduced previously.
-- Spec: WEB_TEAM_BRANDING_PROFILES_COLUMNS_REQUIRED.md (2026-04-09)

ALTER TABLE public.profiles
  ALTER COLUMN primary_color SET DEFAULT NULL,
  ALTER COLUMN secondary_color SET DEFAULT NULL,
  ALTER COLUMN accent_color SET DEFAULT NULL,
  ALTER COLUMN show_powered_by SET DEFAULT FALSE;

UPDATE public.profiles
SET
  primary_color = NULL,
  secondary_color = NULL,
  accent_color = NULL,
  show_powered_by = FALSE,
  updated_at = NOW()
WHERE
  primary_color = '#EF4444'
  AND secondary_color = '#1F2937'
  AND accent_color = '#F59E0B'
  AND show_powered_by = TRUE;
