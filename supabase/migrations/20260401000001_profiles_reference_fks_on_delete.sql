-- Deleting auth.users cascades to profiles (profiles.id -> auth.users). Any public
-- table that references profiles(id) with NO ACTION or ON DELETE RESTRICT will
-- still raise "Database error deleting user". This migration aligns those FKs with
-- account deletion (CASCADE for ownership/participation rows, SET NULL for optional pointers).

-- Tips (mobile) — was REFERENCES profiles(id) with no ON DELETE
ALTER TABLE public.tips
  DROP CONSTRAINT IF EXISTS tips_sender_id_fkey;
ALTER TABLE public.tips
  ADD CONSTRAINT tips_sender_id_fkey
  FOREIGN KEY (sender_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

ALTER TABLE public.tips
  DROP CONSTRAINT IF EXISTS tips_recipient_id_fkey;
ALTER TABLE public.tips
  ADD CONSTRAINT tips_recipient_id_fkey
  FOREIGN KEY (recipient_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

-- Opportunity projects — was ON DELETE RESTRICT for poster/creator
ALTER TABLE public.opportunity_projects
  DROP CONSTRAINT IF EXISTS opportunity_projects_poster_user_id_fkey;
ALTER TABLE public.opportunity_projects
  ADD CONSTRAINT opportunity_projects_poster_user_id_fkey
  FOREIGN KEY (poster_user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

ALTER TABLE public.opportunity_projects
  DROP CONSTRAINT IF EXISTS opportunity_projects_creator_user_id_fkey;
ALTER TABLE public.opportunity_projects
  ADD CONSTRAINT opportunity_projects_creator_user_id_fkey
  FOREIGN KEY (creator_user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

-- Gig ratings
ALTER TABLE public.gig_ratings
  DROP CONSTRAINT IF EXISTS gig_ratings_rater_id_fkey;
ALTER TABLE public.gig_ratings
  ADD CONSTRAINT gig_ratings_rater_id_fkey
  FOREIGN KEY (rater_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

ALTER TABLE public.gig_ratings
  DROP CONSTRAINT IF EXISTS gig_ratings_ratee_id_fkey;
ALTER TABLE public.gig_ratings
  ADD CONSTRAINT gig_ratings_ratee_id_fkey
  FOREIGN KEY (ratee_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

-- Disputes (optional — table may not exist on all projects)
DO $migration$
BEGIN
  IF to_regclass('public.disputes') IS NOT NULL THEN
    ALTER TABLE public.disputes
      DROP CONSTRAINT IF EXISTS disputes_raised_by_fkey;
    ALTER TABLE public.disputes
      ADD CONSTRAINT disputes_raised_by_fkey
      FOREIGN KEY (raised_by) REFERENCES public.profiles(id) ON DELETE CASCADE;

    ALTER TABLE public.disputes
      DROP CONSTRAINT IF EXISTS disputes_against_fkey;
    ALTER TABLE public.disputes
      ADD CONSTRAINT disputes_against_fkey
      FOREIGN KEY (against) REFERENCES public.profiles(id) ON DELETE CASCADE;
  END IF;
END $migration$;

-- DMCA takedowns — optional (migration may not be applied)
DO $migration$
BEGIN
  IF to_regclass('public.takedowns') IS NOT NULL THEN
    ALTER TABLE public.takedowns
      DROP CONSTRAINT IF EXISTS takedowns_uploader_id_fkey;
    ALTER TABLE public.takedowns
      ADD CONSTRAINT takedowns_uploader_id_fkey
      FOREIGN KEY (uploader_id) REFERENCES public.profiles(id) ON DELETE SET NULL;

    ALTER TABLE public.takedowns
      DROP CONSTRAINT IF EXISTS takedowns_reviewed_by_fkey;
    ALTER TABLE public.takedowns
      ADD CONSTRAINT takedowns_reviewed_by_fkey
      FOREIGN KEY (reviewed_by) REFERENCES public.profiles(id) ON DELETE SET NULL;
  END IF;
END $migration$;

-- Urgent gig posts — selected provider (nullable; column only exists after urgent-gigs migration)
DO $migration$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'opportunity_posts'
      AND column_name = 'selected_provider_id'
  ) THEN
    ALTER TABLE public.opportunity_posts
      DROP CONSTRAINT IF EXISTS opportunity_posts_selected_provider_id_fkey;
    ALTER TABLE public.opportunity_posts
      ADD CONSTRAINT opportunity_posts_selected_provider_id_fkey
      FOREIGN KEY (selected_provider_id) REFERENCES public.profiles(id) ON DELETE SET NULL;
  END IF;
END $migration$;
