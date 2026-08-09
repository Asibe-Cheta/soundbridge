-- WITHDRAWAL_VERIFICATION_BUG_WEB_TEAM.MD / WEB_TEAM_WITHDRAWAL_VERIFICATION_BUG_RESPONSE.MD
--
-- "Fincra-rail currencies (NGN/GHS/KES) auto-verify on creation" was previously implemented
-- client-side, only in the web save path (apps/web/app/api/user/revenue/bank-account/route.ts).
-- Mobile's own save path never replicated it, so every Fincra-rail creator who signed up via
-- mobile got stuck at verification_status='pending' forever, with nothing server-side ever
-- revisiting the row (this is what blocked a real creator's withdrawal, see the docs above).
--
-- Moving the rule into a trigger makes it apply uniformly regardless of which client (or
-- future client) writes the row, so this class of bug can't recur. This does not change the
-- underlying policy — Fincra-rail accounts are still trusted on currency alone, no live
-- Fincra account-name check — that's a separate, larger decision tracked in the response doc.
--
-- Checked for conflicts before adding this: no existing admin/fraud flow ever sets
-- is_verified=false on a creator_bank_accounts row to revoke verification, so an
-- unconditional INSERT/UPDATE trigger has nothing to fight today. If a revoke/reject flow is
-- built later, it will need to account for this trigger re-asserting verified on next update.

CREATE OR REPLACE FUNCTION public.apply_fincra_rail_auto_verification()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF upper(COALESCE(NEW.currency, '')) IN ('NGN', 'GHS', 'KES') THEN
    NEW.is_verified := true;
    NEW.verification_status := 'verified';
    NEW.verified_at := COALESCE(NEW.verified_at, now());
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_fincra_rail_auto_verification ON public.creator_bank_accounts;
CREATE TRIGGER trg_fincra_rail_auto_verification
  BEFORE INSERT OR UPDATE ON public.creator_bank_accounts
  FOR EACH ROW
  EXECUTE FUNCTION public.apply_fincra_rail_auto_verification();

-- Self-heal any existing Fincra-rail rows still stuck at pending (Matthew's specific row was
-- already fixed by hand; this catches every other creator in the same state).
UPDATE public.creator_bank_accounts
SET is_verified = true,
    verification_status = 'verified',
    verified_at = COALESCE(verified_at, updated_at, now())
WHERE upper(COALESCE(currency, '')) IN ('NGN', 'GHS', 'KES')
  AND (is_verified IS DISTINCT FROM true OR verification_status IS DISTINCT FROM 'verified');
