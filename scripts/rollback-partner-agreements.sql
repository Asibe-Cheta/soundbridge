-- Rollback for supabase/migrations/20261126120000_partner_agreements.sql
DROP FUNCTION IF EXISTS public.sign_partner_agreement(TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT);
DROP TABLE IF EXISTS public.agreement_rate_limit_hits;
DROP TABLE IF EXISTS public.agreement_signatures;
DROP TABLE IF EXISTS public.agreements;
-- Storage bucket and its files are left in place deliberately -- dropping
-- the bucket would delete any already-signed PDFs. Remove it manually via
-- the Supabase dashboard if you're sure nothing in it is needed.
