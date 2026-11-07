-- Three new institutional partner join pages: Access Creative London,
-- University of Bedfordshire (Radio Lab), and Premier Gospel UK — same
-- pattern as Sound Academy / Abbey Road / Gateway International
-- (grant_institutional_access, institutional_access, profiles.institution_badge).
-- No new tables needed; the only real schema change, same as every previous
-- institution added this way, is widening profiles.institution_badge's CHECK
-- constraint (last set by 20261001100000_gateway_international_partner.sql).

ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_institution_badge_check;
ALTER TABLE profiles ADD CONSTRAINT profiles_institution_badge_check
  CHECK (institution_badge IN (
    'abbey_road_institute',
    'sound_academy',
    'logic_church',
    'gateway_international',
    'access_creative_london',
    'university_of_bedfordshire',
    'premier_gospel_uk'
  ));
