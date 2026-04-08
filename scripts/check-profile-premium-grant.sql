-- Run in Supabase SQL Editor. Replace the UUID with the user to verify (e.g. mobile QA account).
-- Expected for waitlist 3mo grant: subscription_tier = premium, subscription_status = active,
-- subscription_period_end / subscription_renewal_date in the future (see waitlist-premium-2026-step-2-preview-then-update.sql).

SELECT
  id,
  username,
  early_adopter,
  subscription_tier,
  subscription_status,
  subscription_period_end,
  subscription_renewal_date,
  subscription_start_date,
  updated_at
FROM public.profiles
WHERE id = 'bd8a455d-a54d-45c5-968d-e4cf5e8d928e';

-- Optional: compare to user_subscriptions (badges/Persona now also read profiles first after commit 8e73c3d7).
SELECT tier, status, updated_at
FROM public.user_subscriptions
WHERE user_id = 'bd8a455d-a54d-45c5-968d-e4cf5e8d928e'
ORDER BY updated_at DESC
LIMIT 3;
