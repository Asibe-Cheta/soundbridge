-- Gateway International Church partner registration (GIC.MD) — matches the Logic Church
-- pattern exactly: partner_registrations, grant_institutional_access, and the referral-link
-- path are already fully generic (no schema changes needed there, just the new
-- 'gateway_international' identifier used from application code). The one real schema
-- change is widening profiles.institution_badge's CHECK constraint, same as when Logic
-- Church itself was added.
--
-- Baseline allow-list confirmed by reading the exact Logic Church migration that last set
-- this constraint (not a live guess): CHECK (institution_badge IN
-- ('abbey_road_institute', 'sound_academy', 'logic_church')).

ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_institution_badge_check;
ALTER TABLE profiles ADD CONSTRAINT profiles_institution_badge_check
  CHECK (institution_badge IN ('abbey_road_institute', 'sound_academy', 'logic_church', 'gateway_international'));
