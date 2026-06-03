-- Early adopter premium grant expiry: conversion tracking + push dedupe columns.
-- Prod schema drift: grant end may be on profiles under different column names, or on user_subscriptions.

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS early_adopter boolean NOT NULL DEFAULT false;

COMMENT ON COLUMN public.profiles.early_adopter IS
  'Permanent early adopter cohort (launch waitlist). Used for badge and grant expiry flows.';

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS subscription_tier varchar(20) DEFAULT 'free';

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS subscription_status varchar(20);

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS subscription_start_date timestamptz;

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS subscription_period_end timestamptz;

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS subscription_renewal_date timestamptz;

-- Backfill subscription_period_end from whichever legacy columns exist (parse-safe via EXECUTE).
DO $migrate$
DECLARE
  col text;
BEGIN
  FOREACH col IN ARRAY ARRAY[
    'subscription_renewal_date',
    'subscription_end_date',
    'subscription_ends_at'
  ]
  LOOP
    IF EXISTS (
      SELECT 1
      FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = 'profiles'
        AND column_name = col
    ) THEN
      EXECUTE format(
        $sql$
          UPDATE public.profiles p
          SET subscription_period_end = p.%I::timestamptz
          WHERE p.subscription_period_end IS NULL
            AND p.%I IS NOT NULL
        $sql$,
        col,
        col
      );
    END IF;
  END LOOP;

  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'profiles'
      AND column_name = 'subscription_start_date'
  ) THEN
    UPDATE public.profiles p
    SET subscription_period_end = p.subscription_start_date::timestamptz + interval '3 months'
    WHERE p.early_adopter = true
      AND p.subscription_period_end IS NULL
      AND p.subscription_start_date IS NOT NULL;
  END IF;

  IF EXISTS (
    SELECT 1
    FROM information_schema.tables
    WHERE table_schema = 'public'
      AND table_name = 'user_subscriptions'
  ) AND EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'user_subscriptions'
      AND column_name = 'subscription_ends_at'
  ) THEN
    UPDATE public.profiles p
    SET subscription_period_end = us.subscription_ends_at
    FROM public.user_subscriptions us
    WHERE us.user_id = p.id
      AND p.subscription_period_end IS NULL
      AND us.subscription_ends_at IS NOT NULL;
  END IF;

  -- Keep renewal_date in sync when both columns exist (mobile may read either).
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'profiles'
      AND column_name = 'subscription_renewal_date'
  ) THEN
    UPDATE public.profiles p
    SET subscription_renewal_date = p.subscription_period_end
    WHERE p.subscription_renewal_date IS NULL
      AND p.subscription_period_end IS NOT NULL;
  END IF;

  -- Mirror tier/status from user_subscriptions when profiles columns were missing.
  IF EXISTS (
    SELECT 1
    FROM information_schema.tables
    WHERE table_schema = 'public'
      AND table_name = 'user_subscriptions'
  ) THEN
    UPDATE public.profiles p
    SET
      subscription_tier = CASE lower(COALESCE(us.tier::text, 'free'))
        WHEN 'enterprise' THEN 'unlimited'
        WHEN 'pro' THEN 'premium'
        ELSE lower(COALESCE(us.tier::text, 'free'))
      END,
      subscription_status = COALESCE(p.subscription_status, us.status::text),
      subscription_period_end = COALESCE(p.subscription_period_end, us.subscription_ends_at)
    FROM public.user_subscriptions us
    WHERE us.user_id = p.id
      AND (
        p.subscription_tier IS NULL
        OR p.subscription_tier = 'free'
        OR p.subscription_period_end IS NULL
      );
  END IF;
END;
$migrate$;

CREATE TABLE IF NOT EXISTS public.early_adopter_conversion (
  user_id uuid PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
  access_expired_at timestamptz,
  modal_last_shown_at timestamptz,
  modal_dismissed_permanently boolean NOT NULL DEFAULT false,
  reminder_count integer NOT NULL DEFAULT 0,
  converted_to_paid boolean NOT NULL DEFAULT false,
  converted_at timestamptz,
  push_pre_7d_sent_at timestamptz,
  push_pre_1d_sent_at timestamptz,
  push_post_7d_sent_at timestamptz,
  push_post_14d_sent_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.early_adopter_conversion IS
  'Tracks early-adopter free Premium grant expiry and paid conversion (mobile modal + push cadence).';

CREATE INDEX IF NOT EXISTS idx_early_adopter_conversion_expired_unconverted
  ON public.early_adopter_conversion (access_expired_at)
  WHERE converted_to_paid = false AND modal_dismissed_permanently = false;

INSERT INTO public.early_adopter_conversion (user_id, access_expired_at)
SELECT p.id, p.subscription_period_end
FROM public.profiles p
WHERE p.early_adopter = true
  AND lower(COALESCE(p.subscription_tier::text, 'free')) = 'free'
  AND p.subscription_period_end IS NOT NULL
  AND p.subscription_period_end < now()
ON CONFLICT (user_id) DO NOTHING;

ALTER TABLE public.early_adopter_conversion ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS early_adopter_conversion_select_own ON public.early_adopter_conversion;
CREATE POLICY early_adopter_conversion_select_own ON public.early_adopter_conversion
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());

GRANT SELECT ON public.early_adopter_conversion TO authenticated;
