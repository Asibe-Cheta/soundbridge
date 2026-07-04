-- Store partner referral code on the referred user's profile (SOUNDBRIDGE_REF_MBG).
-- Commission tracking still uses partners + referral_signups; this column is the
-- durable per-user attribution stamp for admin visibility and later commission work.

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS referred_by_code text;

CREATE INDEX IF NOT EXISTS profiles_referred_by_code_idx
  ON public.profiles (referred_by_code)
  WHERE referred_by_code IS NOT NULL;

COMMENT ON COLUMN public.profiles.referred_by_code IS
  'Partner referral code from ?ref= at signup (e.g. jbenitez). Null when no partner link.';

-- Stamp profiles.referred_by_code even when the partner row is missing, so attribution
-- is never lost. Partner commission + community entry only when a partners match exists.
CREATE OR REPLACE FUNCTION public.record_referral_signup(
  p_referred_user_id uuid,
  p_referral_code    text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_partner_id uuid;
  v_partner_user_id uuid;
  v_code text;
  v_row_count integer;
BEGIN
  v_code := lower(trim(COALESCE(p_referral_code, '')));
  IF v_code = '' THEN
    RETURN;
  END IF;

  -- Always persist the code on the profile (first-write wins).
  UPDATE profiles
  SET
    referred_by_code = v_code,
    updated_at = now()
  WHERE id = p_referred_user_id
    AND referred_by_code IS NULL;

  SELECT id, user_id INTO v_partner_id, v_partner_user_id
  FROM partners
  WHERE referral_code = v_code;

  IF NOT FOUND THEN
    RETURN;
  END IF;

  -- Don't track self-referrals
  IF EXISTS (SELECT 1 FROM partners WHERE id = v_partner_id AND user_id = p_referred_user_id) THEN
    RETURN;
  END IF;

  INSERT INTO referral_signups (partner_id, referred_user_id)
  VALUES (v_partner_id, p_referred_user_id)
  ON CONFLICT (partner_id, referred_user_id) DO NOTHING;

  GET DIAGNOSTICS v_row_count = ROW_COUNT;
  IF v_row_count > 0 THEN
    UPDATE partners
    SET total_referrals = total_referrals + 1
    WHERE id = v_partner_id;
  END IF;

  -- Partner is also the community face of the referral (existing behaviour).
  UPDATE profiles
  SET
    community_entry_creator_id = v_partner_user_id,
    updated_at = now()
  WHERE id = p_referred_user_id
    AND community_entry_creator_id IS NULL
    AND v_partner_user_id IS NOT NULL
    AND v_partner_user_id <> p_referred_user_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.record_referral_signup(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.record_referral_signup(uuid, text) TO service_role;
