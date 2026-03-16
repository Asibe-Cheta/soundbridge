-- Run this in production (Supabase SQL Editor or: supabase db push) if you see:
--   PGRST204: Could not find the 'stripe_client_secret' column of 'opportunity_projects'
-- Same as migration 20260301000000_opportunity_projects_stripe_client_secret.sql

ALTER TABLE opportunity_projects
  ADD COLUMN IF NOT EXISTS stripe_client_secret TEXT;

COMMENT ON COLUMN opportunity_projects.stripe_client_secret IS 'Stripe PaymentIntent client_secret; exposed only to poster when status=payment_pending';

-- After running: if using Supabase, reload schema cache (Dashboard → Settings → API → Reload schema cache).
