-- Fix opportunity_posts.interest_count: ensure triggers and use live count in RPC
-- See WEB_TEAM_OPPORTUNITY_INTEREST_COUNT_FIX.md

-- 1. Ensure increment trigger exists (idempotent)
CREATE OR REPLACE FUNCTION increment_opportunity_interest_count()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE opportunity_posts
  SET interest_count = interest_count + 1
  WHERE id = NEW.opportunity_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_increment_opportunity_interest ON opportunity_interests;
DROP TRIGGER IF EXISTS trg_increment_interest_count ON opportunity_interests;
CREATE TRIGGER trg_increment_opportunity_interest
  AFTER INSERT ON opportunity_interests
  FOR EACH ROW EXECUTE FUNCTION increment_opportunity_interest_count();

-- 2. Decrement on DELETE (interests withdrawn)
CREATE OR REPLACE FUNCTION decrement_opportunity_interest_count()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE opportunity_posts
  SET interest_count = GREATEST(interest_count - 1, 0)
  WHERE id = OLD.opportunity_id;
  RETURN OLD;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_decrement_opportunity_interest ON opportunity_interests;
DROP TRIGGER IF EXISTS trg_decrement_interest_count ON opportunity_interests;
CREATE TRIGGER trg_decrement_opportunity_interest
  AFTER DELETE ON opportunity_interests
  FOR EACH ROW EXECUTE FUNCTION decrement_opportunity_interest_count();

-- 3. Backfill interest_count from actual counts
UPDATE opportunity_posts op
SET interest_count = (
  SELECT COUNT(*)::INT
  FROM opportunity_interests oi
  WHERE oi.opportunity_id = op.id
);

-- 4. RPC: use live count so feed never shows stale interest_count
CREATE OR REPLACE FUNCTION get_recommended_opportunities(
  p_user_id UUID,
  p_limit INT DEFAULT 20,
  p_offset INT DEFAULT 0,
  p_type TEXT DEFAULT NULL
)
RETURNS TABLE (
  id UUID,
  type TEXT,
  title TEXT,
  description TEXT,
  skills_needed TEXT[],
  location TEXT,
  is_remote BOOLEAN,
  date_from DATE,
  date_to DATE,
  budget_min NUMERIC,
  budget_max NUMERIC,
  budget_currency TEXT,
  visibility TEXT,
  is_featured BOOLEAN,
  interest_count INT,
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ,
  posted_by JSONB,
  has_expressed_interest BOOLEAN,
  relevance_score FLOAT
)
LANGUAGE sql STABLE AS $$
  SELECT
    op.id,
    op.type,
    op.title,
    op.description,
    op.skills_needed,
    op.location,
    op.is_remote,
    op.date_from,
    op.date_to,
    op.budget_min,
    op.budget_max,
    op.budget_currency,
    op.visibility,
    op.is_featured,
    (SELECT COUNT(*)::INT FROM opportunity_interests oi2 WHERE oi2.opportunity_id = op.id) AS interest_count,
    op.expires_at,
    op.created_at,
    jsonb_build_object(
      'id', p.id,
      'username', p.username,
      'display_name', p.display_name,
      'avatar_url', p.avatar_url
    ) AS posted_by,
    EXISTS (
      SELECT 1 FROM opportunity_interests oi
      WHERE oi.opportunity_id = op.id AND oi.interested_user_id = p_user_id
    ) AS has_expressed_interest,
    (
      (CASE WHEN op.is_featured THEN 3.0 ELSE 0.0 END) +
      GREATEST(0, 1.0 - EXTRACT(EPOCH FROM (NOW() - op.created_at)) / (14 * 86400)) * 1.5 +
      LOG(1 + (SELECT COUNT(*)::INT FROM opportunity_interests oi2 WHERE oi2.opportunity_id = op.id)) * 0.5
    ) AS relevance_score
  FROM opportunity_posts op
  JOIN profiles p ON p.id = op.user_id
  WHERE
    op.is_active = TRUE
    AND (op.expires_at IS NULL OR op.expires_at > NOW())
    AND op.user_id <> p_user_id
    AND (p_type IS NULL OR op.type = p_type)
    AND op.visibility = 'public'
  ORDER BY relevance_score DESC, op.created_at DESC
  LIMIT p_limit
  OFFSET p_offset;
$$;
