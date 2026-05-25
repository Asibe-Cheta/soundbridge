-- Align partner referral RPC permissions with the web/mobile handoff.
-- Signup attribution can be called in authenticated signup flows, but paid
-- conversion attribution must only run from trusted backend webhook code.

revoke execute on function public.record_referral_conversion(uuid, text, decimal) from public;
revoke execute on function public.record_referral_conversion(uuid, text, decimal) from anon;
revoke execute on function public.record_referral_conversion(uuid, text, decimal) from authenticated;
grant execute on function public.record_referral_conversion(uuid, text, decimal) to service_role;

grant execute on function public.record_referral_signup(uuid, text) to authenticated;
grant execute on function public.grant_institutional_access(uuid, text, text) to authenticated;
