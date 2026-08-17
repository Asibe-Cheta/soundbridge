-- =============================================================================
-- Fix grant_institutional_access() — remove the ::text cast on
-- subscription_period_end that breaks every institutional Premium grant
-- (Sound Academy, Abbey Road Institute, Logic Church).
-- =============================================================================
-- Root cause: supabase/migrations/partner_referral_system.sql (no numeric
-- timestamp prefix) defines this function with:
--     subscription_period_end = (now() + interval '1 year')::text,
-- profiles.subscription_period_end is `timestamp without time zone`, not
-- text, so every call to grant_institutional_access() has been failing with:
--     column "subscription_period_end" is of type timestamp without time
--     zone but expression is of type text
-- The correct version was already written once in
-- 20260525154946_fix_institutional_access_updated_at.sql, but Supabase
-- applies migrations in filename order, and ASCII digits sort before
-- letters — so partner_referral_system.sql (starting with 'p') runs AFTER
-- every 2026-prefixed migration and silently re-overwrites the fix via
-- CREATE OR REPLACE FUNCTION.
--
-- This file is deliberately named to start with 'z' so it sorts after
-- partner_referral_system.sql alphabetically, guaranteeing this is the
-- version left standing after a full migration replay.
-- =============================================================================

create or replace function public.grant_institutional_access(
  p_user_id     uuid,
  p_institution text,
  p_access_tier text default 'premium'
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into institutional_access (user_id, institution, access_tier, expires_at)
  values (p_user_id, p_institution, p_access_tier, now() + interval '1 year')
  on conflict (user_id, institution) do update
    set access_tier = excluded.access_tier,
        granted_at  = now(),
        expires_at  = now() + interval '1 year',
        is_active   = true;

  update profiles
  set subscription_tier       = p_access_tier,
      subscription_status     = 'active',
      subscription_period_end = now() + interval '1 year',
      updated_at              = now()
  where id = p_user_id;
end;
$$;

grant execute on function public.grant_institutional_access(uuid, text, text) to authenticated;
