-- Account deletion, creator ratings, and verification support
-- Date: January 26, 2026

-- ==============================================
-- 1. ACCOUNT DELETION REQUESTS
-- ==============================================
CREATE TABLE IF NOT EXISTS account_deletion_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  reason TEXT NOT NULL,
  detail TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  processed_at TIMESTAMPTZ,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processed', 'cancelled')),
  requested_by_ip TEXT
);

CREATE INDEX IF NOT EXISTS idx_account_deletion_requests_user
  ON account_deletion_requests(user_id);

ALTER TABLE account_deletion_requests ENABLE ROW LEVEL SECURITY;

DO $policy$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'account_deletion_requests'
      AND policyname = 'Users can view their deletion requests'
  ) THEN
    CREATE POLICY "Users can view their deletion requests"
      ON account_deletion_requests
      FOR SELECT
      USING (auth.role() = 'service_role' OR user_id = auth.uid());
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'account_deletion_requests'
      AND policyname = 'Users can request account deletion'
  ) THEN
    CREATE POLICY "Users can request account deletion"
      ON account_deletion_requests
      FOR INSERT
      WITH CHECK (auth.role() = 'service_role' OR user_id = auth.uid());
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'account_deletion_requests'
      AND policyname = 'Service role manages deletion requests'
  ) THEN
    CREATE POLICY "Service role manages deletion requests"
      ON account_deletion_requests
      FOR ALL
      USING (auth.role() = 'service_role')
      WITH CHECK (auth.role() = 'service_role');
  END IF;
END
$policy$;

-- ==============================================
-- 2. VERIFICATION + RATINGS ON PROFILES
-- ==============================================
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS is_verified BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS rating_avg NUMERIC(3,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS rating_count INTEGER NOT NULL DEFAULT 0;

-- ==============================================
-- 3. CREATOR RATINGS
-- ==============================================
CREATE TABLE IF NOT EXISTS creator_ratings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  rated_user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  rater_user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  rating SMALLINT NOT NULL CHECK (rating BETWEEN 1 AND 5),
  comment TEXT,
  context TEXT NOT NULL DEFAULT 'general' CHECK (context IN ('event', 'service', 'collaboration', 'general')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (rated_user_id, rater_user_id, context)
);

CREATE INDEX IF NOT EXISTS idx_creator_ratings_rated_user
  ON creator_ratings(rated_user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_creator_ratings_rater_user
  ON creator_ratings(rater_user_id, created_at DESC);

ALTER TABLE creator_ratings ENABLE ROW LEVEL SECURITY;

DO $policy$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'creator_ratings'
      AND policyname = 'Public can view creator ratings'
  ) THEN
    CREATE POLICY "Public can view creator ratings"
      ON creator_ratings
      FOR SELECT
      USING (true);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'creator_ratings'
      AND policyname = 'Users can manage their ratings'
  ) THEN
    CREATE POLICY "Users can manage their ratings"
      ON creator_ratings
      FOR ALL
      USING (auth.role() = 'service_role' OR rater_user_id = auth.uid())
      WITH CHECK (auth.role() = 'service_role' OR rater_user_id = auth.uid());
  END IF;
END
$policy$;

CREATE OR REPLACE FUNCTION refresh_creator_rating(p_user_id UUID)
RETURNS VOID AS $$
DECLARE
  rating_record RECORD;
BEGIN
  SELECT
    COALESCE(AVG(rating), 0)::NUMERIC(3,2) AS avg_rating,
    COUNT(*)::INTEGER AS review_count
  INTO rating_record
  FROM creator_ratings
  WHERE rated_user_id = p_user_id;

  UPDATE profiles
  SET rating_avg = COALESCE(rating_record.avg_rating, 0),
      rating_count = COALESCE(rating_record.review_count, 0),
      updated_at = NOW()
  WHERE id = p_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

GRANT EXECUTE ON FUNCTION refresh_creator_rating(UUID) TO authenticated;

CREATE OR REPLACE FUNCTION trg_refresh_creator_rating()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    PERFORM refresh_creator_rating(OLD.rated_user_id);
    RETURN OLD;
  ELSE
    NEW.updated_at := NOW();
    PERFORM refresh_creator_rating(NEW.rated_user_id);
    RETURN NEW;
  END IF;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_creator_ratings_refresh ON creator_ratings;
CREATE TRIGGER trg_creator_ratings_refresh
AFTER INSERT OR UPDATE OR DELETE ON creator_ratings
FOR EACH ROW EXECUTE FUNCTION trg_refresh_creator_rating();

-- ==============================================
-- 4. ACCOUNT DELETION RETENTION PROCESS
-- ==============================================
CREATE OR REPLACE FUNCTION process_account_deletion_retention()
RETURNS INTEGER AS $$
DECLARE
  v_count INTEGER;
BEGIN
  WITH target AS (
    SELECT user_id
    FROM account_deletion_requests
    WHERE status = 'pending'
      AND created_at <= NOW() - INTERVAL '14 days'
  ),
  profile_update AS (
    UPDATE profiles p
    SET
      display_name = 'Deleted User',
      username = CONCAT('deleted_', p.id),
      bio = NULL,
      avatar_url = NULL,
      banner_url = NULL,
      website = NULL,
      phone = NULL,
      social_links = '{}'::jsonb,
      is_active = FALSE,
      is_public = FALSE,
      deleted_at = COALESCE(p.deleted_at, NOW()),
      updated_at = NOW()
    FROM target t
    WHERE p.id = t.user_id
    RETURNING p.id
  ),
  request_update AS (
    UPDATE account_deletion_requests adr
    SET status = 'processed',
        processed_at = NOW()
    WHERE adr.user_id IN (SELECT user_id FROM target)
    RETURNING adr.id
  )
  SELECT COUNT(*) INTO v_count FROM request_update;

  RETURN COALESCE(v_count, 0);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;
