-- UNIFY_FAN_PAGE_AND_REF.MD: attribute a signup to a Partner when the last page visited
-- was that Partner's fan page (/[username]/home), even without an explicit ?ref= code.
-- Only applies to designated Partners (a partners row must exist for the visited creator) —
-- the general Audio Lover referral system stays explicit-link-only (Item 23 tiered
-- commission decision is untouched by this migration).
--
-- Backward compatible: p_fan_page_creator_id is a new optional (default NULL) parameter,
-- so every existing caller (web, mobile) that only passes p_referred_user_id/p_referral_code
-- keeps working unchanged until it's updated to also pass the fan-page creator id.
--
-- CREATE OR REPLACE cannot change a function's argument list in place — adding a
-- parameter creates a second overload instead of replacing it, which would make every
-- existing 2-arg call (uuid, text) ambiguous against Postgres's overload resolution.
-- Drop the old signature first so only the new 3-arg version exists.
DROP FUNCTION IF EXISTS public.record_referral_signup(uuid, text);

CREATE OR REPLACE FUNCTION public.record_referral_signup(
  p_referred_user_id uuid,
  p_referral_code text DEFAULT NULL,
  p_fan_page_creator_id uuid DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_code text;
  v_partner_id uuid;
  v_partner_user_id uuid;
  v_row_count integer;
BEGIN
  v_code := lower(trim(COALESCE(p_referral_code, '')));

  IF v_code <> '' THEN
    -- Explicit ?ref= code is the source of truth whenever present — never combined
    -- with fan-page attribution, so a signup can only ever be credited once.
    SELECT id, user_id INTO v_partner_id, v_partner_user_id
    FROM partners
    WHERE referral_code = v_code;
  ELSIF p_fan_page_creator_id IS NOT NULL THEN
    SELECT id, user_id, referral_code INTO v_partner_id, v_partner_user_id, v_code
    FROM partners
    WHERE user_id = p_fan_page_creator_id;
  END IF;

  IF v_code <> '' THEN
    -- Always persist the code on the profile (first-write wins), matching prior behaviour.
    UPDATE profiles
    SET referred_by_code = v_code, updated_at = now()
    WHERE id = p_referred_user_id AND referred_by_code IS NULL;
  END IF;

  IF v_partner_id IS NULL THEN
    RETURN;
  END IF;

  -- Don't track self-referrals.
  IF v_partner_user_id = p_referred_user_id THEN
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
  SET community_entry_creator_id = v_partner_user_id, updated_at = now()
  WHERE id = p_referred_user_id
    AND community_entry_creator_id IS NULL
    AND v_partner_user_id <> p_referred_user_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.record_referral_signup(uuid, text, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.record_referral_signup(uuid, text, uuid) TO service_role;
