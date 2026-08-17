-- =============================================================================
-- Logic Church: verify a registration + grant actually landed
-- Run in Supabase SQL Editor. Replace the email below with the one you
-- tested with, then run all three SELECTs.
-- =============================================================================

-- 1) The partner_registrations row — status should be 'provisioned' with
--    provisioned_user_id set, once the grant has actually run.
SELECT id, email, partner_id, status, provisioned_user_id, provisioned_at, created_at
FROM public.partner_registrations
WHERE lower(email) = lower('REPLACE_WITH_YOUR_TEST_EMAIL');

-- 2) The institutional_access row — should show institution='logic_church',
--    is_active=true, expires_at about a year out.
SELECT ia.*
FROM public.institutional_access ia
JOIN auth.users u ON u.id = ia.user_id
WHERE lower(u.email) = lower('REPLACE_WITH_YOUR_TEST_EMAIL')
  AND ia.institution = 'logic_church';

-- 3) What the app actually reads to decide Premium/Expired — this is the
--    one that should show subscription_tier='premium',
--    subscription_status='active', subscription_period_end about a year out.
SELECT u.email, p.subscription_tier, p.subscription_status, p.subscription_period_end,
       p.institution_badge, p.early_adopter
FROM public.profiles p
JOIN auth.users u ON u.id = p.id
WHERE lower(u.email) = lower('REPLACE_WITH_YOUR_TEST_EMAIL');

-- If (3) shows subscription_status != 'active' or a past subscription_period_end
-- despite (2) showing an active institutional_access row, that's the drift the
-- new self-healing fix corrects on next login (logging out and back in, or
-- reloading a session, triggers it automatically).
