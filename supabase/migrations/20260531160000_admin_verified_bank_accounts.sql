-- Admin: paginated list of creators with completed bank verification (all countries/currencies).

-- Ensure optional columns exist on older creator_bank_accounts schemas.
ALTER TABLE public.creator_bank_accounts
  ADD COLUMN IF NOT EXISTS verified_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS stripe_account_status VARCHAR(50),
  ADD COLUMN IF NOT EXISTS account_last4 VARCHAR(4);

UPDATE public.creator_bank_accounts
SET verified_at = updated_at
WHERE verified_at IS NULL
  AND (
    COALESCE(is_verified, false) = true
    OR lower(COALESCE(verification_status::text, '')) = 'verified'
  );

CREATE OR REPLACE FUNCTION public.admin_list_verified_bank_accounts(
  p_limit int DEFAULT 50,
  p_offset int DEFAULT 0,
  p_search text DEFAULT NULL,
  p_currency text DEFAULT NULL
)
RETURNS TABLE (
  bank_account_id uuid,
  user_id uuid,
  email text,
  username text,
  display_name text,
  account_holder_name text,
  bank_name text,
  currency text,
  country_code text,
  verification_rail text,
  is_verified boolean,
  verification_status text,
  verified_at timestamptz,
  stripe_account_id text,
  stripe_account_status text,
  account_last4 text,
  created_at timestamptz,
  updated_at timestamptz,
  total_count bigint
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, auth
AS $$
  WITH base AS (
    SELECT
      cba.id AS b_id,
      cba.user_id AS b_user_id,
      u.email::text AS b_email,
      COALESCE(p.username::text, '') AS b_username,
      COALESCE(p.display_name::text, '') AS b_display_name,
      COALESCE(cba.account_holder_name::text, '') AS b_account_holder_name,
      COALESCE(cba.bank_name::text, '') AS b_bank_name,
      upper(COALESCE(cba.currency::text, '')) AS b_currency,
      CASE upper(COALESCE(cba.currency::text, ''))
        WHEN 'NGN' THEN 'NG'
        WHEN 'GHS' THEN 'GH'
        WHEN 'KES' THEN 'KE'
        WHEN 'USD' THEN 'US'
        WHEN 'GBP' THEN 'GB'
        WHEN 'EUR' THEN 'EU'
        WHEN 'CAD' THEN 'CA'
        WHEN 'AUD' THEN 'AU'
        WHEN 'ZAR' THEN 'ZA'
        ELSE NULL
      END AS b_country_code,
      CASE
        WHEN cba.stripe_account_id IS NOT NULL AND btrim(cba.stripe_account_id) <> '' THEN 'stripe'
        WHEN upper(COALESCE(cba.currency::text, '')) IN ('NGN', 'GHS', 'KES') THEN 'fincra'
        ELSE 'bank'
      END AS b_verification_rail,
      COALESCE(cba.is_verified, false) AS b_is_verified,
      COALESCE(cba.verification_status::text, '') AS b_verification_status,
      COALESCE(cba.verified_at, cba.updated_at) AS b_verified_at,
      cba.stripe_account_id::text AS b_stripe_account_id,
      cba.stripe_account_status::text AS b_stripe_account_status,
      cba.account_last4::text AS b_account_last4,
      cba.created_at AS b_created_at,
      cba.updated_at AS b_updated_at
    FROM public.creator_bank_accounts cba
    JOIN auth.users u ON u.id = cba.user_id
    LEFT JOIN public.profiles p ON p.id = cba.user_id
    WHERE
      (
        COALESCE(cba.is_verified, false) = true
        OR lower(COALESCE(cba.verification_status::text, '')) = 'verified'
      )
      AND (
        p_currency IS NULL
        OR btrim(p_currency) = ''
        OR upper(COALESCE(cba.currency::text, '')) = upper(btrim(p_currency))
      )
  ),
  filtered AS (
    SELECT *
    FROM base
    WHERE
      p_search IS NULL
      OR btrim(p_search) = ''
      OR b_email ILIKE '%' || btrim(p_search) || '%'
      OR b_username ILIKE '%' || btrim(p_search) || '%'
      OR b_display_name ILIKE '%' || btrim(p_search) || '%'
      OR b_account_holder_name ILIKE '%' || btrim(p_search) || '%'
      OR b_bank_name ILIKE '%' || btrim(p_search) || '%'
      OR b_currency ILIKE '%' || btrim(p_search) || '%'
  ),
  with_total AS (
    SELECT
      f.*,
      (SELECT COUNT(*)::bigint FROM filtered) AS b_total_count
    FROM filtered f
  )
  SELECT
    wt.b_id,
    wt.b_user_id,
    wt.b_email,
    NULLIF(wt.b_username, ''),
    NULLIF(wt.b_display_name, ''),
    NULLIF(wt.b_account_holder_name, ''),
    NULLIF(wt.b_bank_name, ''),
    NULLIF(wt.b_currency, ''),
    wt.b_country_code,
    wt.b_verification_rail,
    wt.b_is_verified,
    NULLIF(wt.b_verification_status, ''),
    wt.b_verified_at,
    wt.b_stripe_account_id,
    wt.b_stripe_account_status,
    wt.b_account_last4,
    wt.b_created_at,
    wt.b_updated_at,
    wt.b_total_count
  FROM with_total wt
  ORDER BY COALESCE(wt.b_verified_at, wt.b_updated_at, wt.b_created_at) DESC NULLS LAST
  LIMIT GREATEST(COALESCE(p_limit, 50), 1)
  OFFSET GREATEST(COALESCE(p_offset, 0), 0);
$$;

CREATE OR REPLACE FUNCTION public.admin_verified_bank_accounts_summary()
RETURNS TABLE (
  total_verified bigint,
  by_currency jsonb
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  WITH verified AS (
    SELECT upper(COALESCE(currency::text, 'UNKNOWN')) AS cur
    FROM public.creator_bank_accounts
    WHERE
      COALESCE(is_verified, false) = true
      OR lower(COALESCE(verification_status::text, '')) = 'verified'
  )
  SELECT
    (SELECT COUNT(*)::bigint FROM verified) AS total_verified,
    COALESCE(
      (
        SELECT jsonb_object_agg(cur, cnt ORDER BY cur)
        FROM (
          SELECT cur, COUNT(*)::bigint AS cnt
          FROM verified
          GROUP BY cur
        ) grouped
      ),
      '{}'::jsonb
    ) AS by_currency;
$$;

REVOKE ALL ON FUNCTION public.admin_list_verified_bank_accounts(int, int, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_list_verified_bank_accounts(int, int, text, text) TO service_role;

REVOKE ALL ON FUNCTION public.admin_verified_bank_accounts_summary() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_verified_bank_accounts_summary() TO service_role;
