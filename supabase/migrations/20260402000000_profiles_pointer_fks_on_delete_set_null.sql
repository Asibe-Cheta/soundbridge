-- Remaining FKs to public.profiles(id) with NO ACTION block auth user deletion
-- (profile row cannot be removed while another row points at it). These columns
-- are admin/moderator/system pointers — ON DELETE SET NULL is appropriate.
--
-- Postgres rejects ON DELETE SET NULL if the column is still NOT NULL; relax first.
DO $pre$
DECLARE
  pair RECORD;
BEGIN
  FOR pair IN
    SELECT * FROM (
      VALUES
        ('audio_tracks'::text, 'removed_by'::text),
        ('events', 'removed_by'),
        ('profiles', 'banned_by'),
        ('ticket_purchases', 'checked_in_by'),
        ('copyright_strikes', 'resolved_by'),
        ('flagged_content', 'reviewer_id'),
        ('dmca_takedowns', 'processed_by'),
        ('content_reports', 'reviewed_by'),
        ('platform_qualifications', 'verified_by'),
        ('platform_readiness', 'assigned_to'),
        ('account_linking_evidence', 'reviewed_by'),
        ('suspicious_account_patterns', 'resolved_by'),
        ('upload_abuse_tracking', 'confirmed_by'),
        ('content_similarity_detection', 'reviewed_by'),
        ('fraud_detection_rules', 'created_by'),
        ('abuse_prevention_actions', 'created_by'),
        ('user_reconstruction_attempts', 'confirmed_by'),
        ('purchased_event_tickets', 'validated_by')
    ) AS v(tbl, col)
  LOOP
    IF EXISTS (
      SELECT 1
      FROM information_schema.columns c
      WHERE c.table_schema = 'public'
        AND c.table_name = pair.tbl
        AND c.column_name = pair.col
        AND c.is_nullable = 'NO'
    ) THEN
      EXECUTE format(
        'ALTER TABLE public.%I ALTER COLUMN %I DROP NOT NULL',
        pair.tbl,
        pair.col
      );
    END IF;
  END LOOP;
END $pre$;

ALTER TABLE public.audio_tracks
  DROP CONSTRAINT IF EXISTS audio_tracks_removed_by_fkey;
ALTER TABLE public.audio_tracks
  ADD CONSTRAINT audio_tracks_removed_by_fkey
  FOREIGN KEY (removed_by) REFERENCES public.profiles(id) ON DELETE SET NULL;

ALTER TABLE public.events
  DROP CONSTRAINT IF EXISTS events_removed_by_fkey;
ALTER TABLE public.events
  ADD CONSTRAINT events_removed_by_fkey
  FOREIGN KEY (removed_by) REFERENCES public.profiles(id) ON DELETE SET NULL;

ALTER TABLE public.profiles
  DROP CONSTRAINT IF EXISTS profiles_banned_by_fkey;
ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_banned_by_fkey
  FOREIGN KEY (banned_by) REFERENCES public.profiles(id) ON DELETE SET NULL;

ALTER TABLE public.ticket_purchases
  DROP CONSTRAINT IF EXISTS ticket_purchases_checked_in_by_fkey;
ALTER TABLE public.ticket_purchases
  ADD CONSTRAINT ticket_purchases_checked_in_by_fkey
  FOREIGN KEY (checked_in_by) REFERENCES public.profiles(id) ON DELETE SET NULL;

ALTER TABLE public.copyright_strikes
  DROP CONSTRAINT IF EXISTS copyright_strikes_resolved_by_fkey;
ALTER TABLE public.copyright_strikes
  ADD CONSTRAINT copyright_strikes_resolved_by_fkey
  FOREIGN KEY (resolved_by) REFERENCES public.profiles(id) ON DELETE SET NULL;

ALTER TABLE public.flagged_content
  DROP CONSTRAINT IF EXISTS flagged_content_reviewer_id_fkey;
ALTER TABLE public.flagged_content
  ADD CONSTRAINT flagged_content_reviewer_id_fkey
  FOREIGN KEY (reviewer_id) REFERENCES public.profiles(id) ON DELETE SET NULL;

ALTER TABLE public.dmca_takedowns
  DROP CONSTRAINT IF EXISTS dmca_takedowns_processed_by_fkey;
ALTER TABLE public.dmca_takedowns
  ADD CONSTRAINT dmca_takedowns_processed_by_fkey
  FOREIGN KEY (processed_by) REFERENCES public.profiles(id) ON DELETE SET NULL;

ALTER TABLE public.content_reports
  DROP CONSTRAINT IF EXISTS content_reports_reviewed_by_fkey;
ALTER TABLE public.content_reports
  ADD CONSTRAINT content_reports_reviewed_by_fkey
  FOREIGN KEY (reviewed_by) REFERENCES public.profiles(id) ON DELETE SET NULL;

ALTER TABLE public.platform_qualifications
  DROP CONSTRAINT IF EXISTS platform_qualifications_verified_by_fkey;
ALTER TABLE public.platform_qualifications
  ADD CONSTRAINT platform_qualifications_verified_by_fkey
  FOREIGN KEY (verified_by) REFERENCES public.profiles(id) ON DELETE SET NULL;

ALTER TABLE public.platform_readiness
  DROP CONSTRAINT IF EXISTS platform_readiness_assigned_to_fkey;
ALTER TABLE public.platform_readiness
  ADD CONSTRAINT platform_readiness_assigned_to_fkey
  FOREIGN KEY (assigned_to) REFERENCES public.profiles(id) ON DELETE SET NULL;

ALTER TABLE public.account_linking_evidence
  DROP CONSTRAINT IF EXISTS account_linking_evidence_reviewed_by_fkey;
ALTER TABLE public.account_linking_evidence
  ADD CONSTRAINT account_linking_evidence_reviewed_by_fkey
  FOREIGN KEY (reviewed_by) REFERENCES public.profiles(id) ON DELETE SET NULL;

ALTER TABLE public.suspicious_account_patterns
  DROP CONSTRAINT IF EXISTS suspicious_account_patterns_resolved_by_fkey;
ALTER TABLE public.suspicious_account_patterns
  ADD CONSTRAINT suspicious_account_patterns_resolved_by_fkey
  FOREIGN KEY (resolved_by) REFERENCES public.profiles(id) ON DELETE SET NULL;

ALTER TABLE public.upload_abuse_tracking
  DROP CONSTRAINT IF EXISTS upload_abuse_tracking_confirmed_by_fkey;
ALTER TABLE public.upload_abuse_tracking
  ADD CONSTRAINT upload_abuse_tracking_confirmed_by_fkey
  FOREIGN KEY (confirmed_by) REFERENCES public.profiles(id) ON DELETE SET NULL;

ALTER TABLE public.content_similarity_detection
  DROP CONSTRAINT IF EXISTS content_similarity_detection_reviewed_by_fkey;
ALTER TABLE public.content_similarity_detection
  ADD CONSTRAINT content_similarity_detection_reviewed_by_fkey
  FOREIGN KEY (reviewed_by) REFERENCES public.profiles(id) ON DELETE SET NULL;

ALTER TABLE public.fraud_detection_rules
  DROP CONSTRAINT IF EXISTS fraud_detection_rules_created_by_fkey;
ALTER TABLE public.fraud_detection_rules
  ADD CONSTRAINT fraud_detection_rules_created_by_fkey
  FOREIGN KEY (created_by) REFERENCES public.profiles(id) ON DELETE SET NULL;

ALTER TABLE public.abuse_prevention_actions
  DROP CONSTRAINT IF EXISTS abuse_prevention_actions_created_by_fkey;
ALTER TABLE public.abuse_prevention_actions
  ADD CONSTRAINT abuse_prevention_actions_created_by_fkey
  FOREIGN KEY (created_by) REFERENCES public.profiles(id) ON DELETE SET NULL;

ALTER TABLE public.user_reconstruction_attempts
  DROP CONSTRAINT IF EXISTS user_reconstruction_attempts_confirmed_by_fkey;
ALTER TABLE public.user_reconstruction_attempts
  ADD CONSTRAINT user_reconstruction_attempts_confirmed_by_fkey
  FOREIGN KEY (confirmed_by) REFERENCES public.profiles(id) ON DELETE SET NULL;

ALTER TABLE public.purchased_event_tickets
  DROP CONSTRAINT IF EXISTS purchased_event_tickets_validated_by_fkey;
ALTER TABLE public.purchased_event_tickets
  ADD CONSTRAINT purchased_event_tickets_validated_by_fkey
  FOREIGN KEY (validated_by) REFERENCES public.profiles(id) ON DELETE SET NULL;
