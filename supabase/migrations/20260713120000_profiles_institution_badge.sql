-- Institutional partner badge (admin-assigned only, at most one per creator).
-- See assets/INSTITUTIONAL_BADGES_WEB_TEAM.MD for the mobile-side spec this mirrors.
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS institution_badge TEXT
  CHECK (institution_badge IN ('abbey_road_institute', 'sound_academy'));
