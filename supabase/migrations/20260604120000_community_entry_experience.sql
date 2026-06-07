-- Community entry experience: welcome screen after onboarding for referred / fan-landing users

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS community_entry_creator_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS community_entry_shown_at timestamptz;

CREATE INDEX IF NOT EXISTS profiles_community_entry_creator_id_idx
  ON public.profiles(community_entry_creator_id)
  WHERE community_entry_creator_id IS NOT NULL;

COMMENT ON COLUMN public.profiles.community_entry_creator_id IS
  'Creator the user arrived through (referral partner or fan landing). Null for organic signup.';
COMMENT ON COLUMN public.profiles.community_entry_shown_at IS
  'When the one-time community welcome screen was dismissed. Null until shown.';

-- Partner referral signup also tags community entry (partner user_id is the creator face of the referral)
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
BEGIN
  SELECT id, user_id INTO v_partner_id, v_partner_user_id
  FROM partners
  WHERE referral_code = lower(trim(p_referral_code));

  IF NOT FOUND THEN RETURN; END IF;

  IF EXISTS (SELECT 1 FROM partners WHERE id = v_partner_id AND user_id = p_referred_user_id) THEN
    RETURN;
  END IF;

  INSERT INTO referral_signups (partner_id, referred_user_id)
  VALUES (v_partner_id, p_referred_user_id)
  ON CONFLICT (partner_id, referred_user_id) DO NOTHING;

  UPDATE partners
  SET total_referrals = total_referrals + 1
  WHERE id = v_partner_id;

  UPDATE profiles
  SET community_entry_creator_id = v_partner_user_id,
      updated_at = now()
  WHERE id = p_referred_user_id
    AND community_entry_creator_id IS NULL
    AND v_partner_user_id IS NOT NULL
    AND v_partner_user_id <> p_referred_user_id;
END;
$$;
