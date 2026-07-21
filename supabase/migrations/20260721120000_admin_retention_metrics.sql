-- Returning-user retention metrics for /admin/dashboard.
-- For each window (1, 7, 30 days), a user is counted "retained" if they have
-- an app_session_log entry at or after (signup date + window), i.e. they were
-- still opening the app that far out from signup (rolling/unbounded retention,
-- not strict same-day). Only callable by service role from admin API routes.

CREATE OR REPLACE FUNCTION public.admin_retention_metrics()
RETURNS TABLE (
  window_days     integer,
  cohort_size     bigint,
  retained_count  bigint,
  retention_rate  numeric
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  WITH windows(window_days) AS (
    VALUES (1), (7), (30)
  ),
  cohort AS (
    SELECT w.window_days, p.id, p.created_at
    FROM windows w
    JOIN public.profiles p
      ON p.created_at <= now() - (w.window_days || ' days')::interval
  ),
  retained AS (
    SELECT DISTINCT c.window_days, c.id
    FROM cohort c
    WHERE EXISTS (
      SELECT 1
      FROM public.app_session_log l
      WHERE l.user_id = c.id
        AND l.opened_at >= c.created_at + (c.window_days || ' days')::interval
    )
  )
  SELECT
    w.window_days,
    count(DISTINCT c.id) AS cohort_size,
    count(DISTINCT r.id) AS retained_count,
    CASE
      WHEN count(DISTINCT c.id) = 0 THEN 0
      ELSE round(100.0 * count(DISTINCT r.id) / count(DISTINCT c.id), 1)
    END AS retention_rate
  FROM windows w
  LEFT JOIN cohort c ON c.window_days = w.window_days
  LEFT JOIN retained r ON r.window_days = w.window_days AND r.id = c.id
  GROUP BY w.window_days
  ORDER BY w.window_days;
$$;

REVOKE ALL ON FUNCTION public.admin_retention_metrics() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_retention_metrics() TO service_role;

COMMENT ON FUNCTION public.admin_retention_metrics() IS
  'Rolling Day 1/7/30 retention: % of users old enough for each window who opened the app on or after signup + window_days. Service-role only.';
