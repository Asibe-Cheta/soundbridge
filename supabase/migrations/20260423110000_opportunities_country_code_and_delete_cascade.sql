-- Opportunities reconciliation:
-- 1) Structured country filter support
-- 2) Cleaner delete cascade semantics for child tables
-- 3) RPC country-aware filtering

ALTER TABLE public.opportunity_posts
  ADD COLUMN IF NOT EXISTS country_code CHAR(2);

-- Normalize existing values where already 2-letter lowercase/uppercase text.
UPDATE public.opportunity_posts
SET country_code = UPPER(TRIM(country_code))
WHERE country_code IS NOT NULL;

-- Clean historical orphans before recreating FK constraints (prevents 23503 on migration).
DELETE FROM public.opportunity_interests oi
WHERE NOT EXISTS (
  SELECT 1
  FROM public.opportunity_posts op
  WHERE op.id = oi.opportunity_id
);

DELETE FROM public.opportunity_projects pr
WHERE NOT EXISTS (
  SELECT 1
  FROM public.opportunity_posts op
  WHERE op.id = pr.opportunity_id
);

ALTER TABLE public.opportunity_projects
  DROP CONSTRAINT IF EXISTS opportunity_projects_opportunity_id_fkey,
  ADD CONSTRAINT opportunity_projects_opportunity_id_fkey
    FOREIGN KEY (opportunity_id)
    REFERENCES public.opportunity_posts(id)
    ON DELETE CASCADE;

ALTER TABLE public.opportunity_interests
  DROP CONSTRAINT IF EXISTS opportunity_interests_opportunity_id_fkey,
  ADD CONSTRAINT opportunity_interests_opportunity_id_fkey
    FOREIGN KEY (opportunity_id)
    REFERENCES public.opportunity_posts(id)
    ON DELETE CASCADE;

CREATE OR REPLACE FUNCTION public.get_recommended_opportunities(
  p_user_id UUID,
  p_limit INT DEFAULT 20,
  p_offset INT DEFAULT 0,
  p_type TEXT DEFAULT NULL,
  p_country_code CHAR(2) DEFAULT NULL
)
RETURNS TABLE (
  id UUID,
  type TEXT,
  title TEXT,
  description TEXT,
  skills_needed TEXT[],
  location TEXT,
  country_code CHAR(2),
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
    op.country_code,
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
    AND (
      op.country_code IS NULL
      OR op.is_remote = TRUE
      OR p_country_code IS NULL
      OR op.country_code = p_country_code
    )
  ORDER BY relevance_score DESC, op.created_at DESC
  LIMIT p_limit
  OFFSET p_offset;
$$;

