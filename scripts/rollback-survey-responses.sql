-- Rollback for supabase/migrations/20261123100000_survey_responses.sql
-- Both tables are brand new (no prior data), so this simply drops them --
-- there is nothing to restore from.

DROP TABLE IF EXISTS public.survey_responses;
DROP TABLE IF EXISTS public.survey_rate_limit_hits;
