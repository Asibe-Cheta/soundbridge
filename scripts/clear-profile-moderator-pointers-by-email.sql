-- One-off: clear moderator/admin pointer columns that reference these users' profiles.
-- Run in Supabase SQL Editor if user delete still fails after FK migrations.
-- Edit the email list to match the accounts you are removing.

WITH doomed AS (
  SELECT id
  FROM auth.users
  WHERE email IN (
    'n07211732@gmail.com',
    'numberate20@gmail.com',
    'numberate820@gmail.com',
    'numberive94@gmail.com'
  )
)
UPDATE public.audio_tracks t SET removed_by = NULL WHERE t.removed_by IN (SELECT id FROM doomed);

WITH doomed AS (
  SELECT id FROM auth.users
  WHERE email IN (
    'n07211732@gmail.com',
    'numberate20@gmail.com',
    'numberate820@gmail.com',
    'numberive94@gmail.com'
  )
)
UPDATE public.events e SET removed_by = NULL WHERE e.removed_by IN (SELECT id FROM doomed);

WITH doomed AS (
  SELECT id FROM auth.users
  WHERE email IN (
    'n07211732@gmail.com',
    'numberate20@gmail.com',
    'numberate820@gmail.com',
    'numberive94@gmail.com'
  )
)
UPDATE public.profiles p SET banned_by = NULL WHERE p.banned_by IN (SELECT id FROM doomed);

WITH doomed AS (
  SELECT id FROM auth.users
  WHERE email IN (
    'n07211732@gmail.com',
    'numberate20@gmail.com',
    'numberate820@gmail.com',
    'numberive94@gmail.com'
  )
)
UPDATE public.ticket_purchases x SET checked_in_by = NULL WHERE x.checked_in_by IN (SELECT id FROM doomed);

WITH doomed AS (
  SELECT id FROM auth.users
  WHERE email IN (
    'n07211732@gmail.com',
    'numberate20@gmail.com',
    'numberate820@gmail.com',
    'numberive94@gmail.com'
  )
)
UPDATE public.copyright_strikes x SET resolved_by = NULL WHERE x.resolved_by IN (SELECT id FROM doomed);

WITH doomed AS (
  SELECT id FROM auth.users
  WHERE email IN (
    'n07211732@gmail.com',
    'numberate20@gmail.com',
    'numberate820@gmail.com',
    'numberive94@gmail.com'
  )
)
UPDATE public.flagged_content x SET reviewer_id = NULL WHERE x.reviewer_id IN (SELECT id FROM doomed);

WITH doomed AS (
  SELECT id FROM auth.users
  WHERE email IN (
    'n07211732@gmail.com',
    'numberate20@gmail.com',
    'numberate820@gmail.com',
    'numberive94@gmail.com'
  )
)
UPDATE public.dmca_takedowns x SET processed_by = NULL WHERE x.processed_by IN (SELECT id FROM doomed);

WITH doomed AS (
  SELECT id FROM auth.users
  WHERE email IN (
    'n07211732@gmail.com',
    'numberate20@gmail.com',
    'numberate820@gmail.com',
    'numberive94@gmail.com'
  )
)
UPDATE public.content_reports x SET reviewed_by = NULL WHERE x.reviewed_by IN (SELECT id FROM doomed);

WITH doomed AS (
  SELECT id FROM auth.users
  WHERE email IN (
    'n07211732@gmail.com',
    'numberate20@gmail.com',
    'numberate820@gmail.com',
    'numberive94@gmail.com'
  )
)
UPDATE public.platform_qualifications x SET verified_by = NULL WHERE x.verified_by IN (SELECT id FROM doomed);

WITH doomed AS (
  SELECT id FROM auth.users
  WHERE email IN (
    'n07211732@gmail.com',
    'numberate20@gmail.com',
    'numberate820@gmail.com',
    'numberive94@gmail.com'
  )
)
UPDATE public.platform_readiness x SET assigned_to = NULL WHERE x.assigned_to IN (SELECT id FROM doomed);

WITH doomed AS (
  SELECT id FROM auth.users
  WHERE email IN (
    'n07211732@gmail.com',
    'numberate20@gmail.com',
    'numberate820@gmail.com',
    'numberive94@gmail.com'
  )
)
UPDATE public.account_linking_evidence x SET reviewed_by = NULL WHERE x.reviewed_by IN (SELECT id FROM doomed);

WITH doomed AS (
  SELECT id FROM auth.users
  WHERE email IN (
    'n07211732@gmail.com',
    'numberate20@gmail.com',
    'numberate820@gmail.com',
    'numberive94@gmail.com'
  )
)
UPDATE public.suspicious_account_patterns x SET resolved_by = NULL WHERE x.resolved_by IN (SELECT id FROM doomed);

WITH doomed AS (
  SELECT id FROM auth.users
  WHERE email IN (
    'n07211732@gmail.com',
    'numberate20@gmail.com',
    'numberate820@gmail.com',
    'numberive94@gmail.com'
  )
)
UPDATE public.upload_abuse_tracking x SET confirmed_by = NULL WHERE x.confirmed_by IN (SELECT id FROM doomed);

WITH doomed AS (
  SELECT id FROM auth.users
  WHERE email IN (
    'n07211732@gmail.com',
    'numberate20@gmail.com',
    'numberate820@gmail.com',
    'numberive94@gmail.com'
  )
)
UPDATE public.content_similarity_detection x SET reviewed_by = NULL WHERE x.reviewed_by IN (SELECT id FROM doomed);

WITH doomed AS (
  SELECT id FROM auth.users
  WHERE email IN (
    'n07211732@gmail.com',
    'numberate20@gmail.com',
    'numberate820@gmail.com',
    'numberive94@gmail.com'
  )
)
UPDATE public.fraud_detection_rules x SET created_by = NULL WHERE x.created_by IN (SELECT id FROM doomed);

WITH doomed AS (
  SELECT id FROM auth.users
  WHERE email IN (
    'n07211732@gmail.com',
    'numberate20@gmail.com',
    'numberate820@gmail.com',
    'numberive94@gmail.com'
  )
)
UPDATE public.abuse_prevention_actions x SET created_by = NULL WHERE x.created_by IN (SELECT id FROM doomed);

WITH doomed AS (
  SELECT id FROM auth.users
  WHERE email IN (
    'n07211732@gmail.com',
    'numberate20@gmail.com',
    'numberate820@gmail.com',
    'numberive94@gmail.com'
  )
)
UPDATE public.user_reconstruction_attempts x SET confirmed_by = NULL WHERE x.confirmed_by IN (SELECT id FROM doomed);

WITH doomed AS (
  SELECT id FROM auth.users
  WHERE email IN (
    'n07211732@gmail.com',
    'numberate20@gmail.com',
    'numberate820@gmail.com',
    'numberive94@gmail.com'
  )
)
UPDATE public.purchased_event_tickets x SET validated_by = NULL WHERE x.validated_by IN (SELECT id FROM doomed);
