-- Create gig_ratings table for opportunity project reviews (POST /api/gig-ratings).
-- Run this on production if PGRST205 "Could not find table 'public.gig_ratings'" occurs.
-- Requires: opportunity_projects, profiles.

CREATE TABLE IF NOT EXISTS gig_ratings (
  id                          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id                  UUID NOT NULL REFERENCES opportunity_projects(id) ON DELETE CASCADE,
  rater_id                    UUID NOT NULL REFERENCES profiles(id),
  ratee_id                    UUID NOT NULL REFERENCES profiles(id),
  overall_rating              SMALLINT NOT NULL CHECK (overall_rating BETWEEN 1 AND 5),
  professionalism_rating      SMALLINT NOT NULL CHECK (professionalism_rating BETWEEN 1 AND 5),
  punctuality_rating          SMALLINT NOT NULL CHECK (punctuality_rating BETWEEN 1 AND 5),
  quality_rating              SMALLINT CHECK (quality_rating IS NULL OR (quality_rating BETWEEN 1 AND 5)),
  payment_promptness_rating   SMALLINT CHECK (payment_promptness_rating IS NULL OR (payment_promptness_rating BETWEEN 1 AND 5)),
  review_text                 TEXT CHECK (review_text IS NULL OR char_length(review_text) <= 1000),
  created_at                  TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (project_id, rater_id),
  CHECK (rater_id != ratee_id)
);

CREATE INDEX IF NOT EXISTS idx_gig_ratings_ratee ON gig_ratings (ratee_id);
CREATE INDEX IF NOT EXISTS idx_gig_ratings_project ON gig_ratings (project_id);

ALTER TABLE gig_ratings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Ratings visible after both parties submit" ON gig_ratings;
CREATE POLICY "Ratings visible after both parties submit"
  ON gig_ratings FOR SELECT
  USING (
    (SELECT COUNT(*) FROM gig_ratings gr2 WHERE gr2.project_id = gig_ratings.project_id) = 2
    OR rater_id = auth.uid()
  );

DROP POLICY IF EXISTS "Only rater can insert" ON gig_ratings;
CREATE POLICY "Only rater can insert"
  ON gig_ratings FOR INSERT
  WITH CHECK (rater_id = auth.uid());
