-- Read-only report for survey_key = 'notifications_interest_2026_11'.
-- Run any section independently in the Supabase SQL Editor.

-- Overall: total started vs completed.
SELECT
  COUNT(*) AS total_started,
  COUNT(completed_at) AS total_completed
FROM public.survey_responses
WHERE survey_key = 'notifications_interest_2026_11';

-- Q1 (multi-select): counts per option.
SELECT option, COUNT(*) AS count
FROM public.survey_responses, jsonb_array_elements_text(answers->'q1') AS option
WHERE survey_key = 'notifications_interest_2026_11'
GROUP BY option
ORDER BY count DESC;

-- Q2 (single): counts per option.
SELECT answers->>'q2' AS option, COUNT(*) AS count
FROM public.survey_responses
WHERE survey_key = 'notifications_interest_2026_11' AND answers ? 'q2'
GROUP BY option
ORDER BY count DESC;

-- Q3 (single): counts per option.
SELECT answers->>'q3' AS option, COUNT(*) AS count
FROM public.survey_responses
WHERE survey_key = 'notifications_interest_2026_11' AND answers ? 'q3'
GROUP BY option
ORDER BY count DESC;

-- Q4 (multi-select, only shown after Q3 = Yes): counts per option.
SELECT option, COUNT(*) AS count
FROM public.survey_responses, jsonb_array_elements_text(answers->'q4') AS option
WHERE survey_key = 'notifications_interest_2026_11'
GROUP BY option
ORDER BY count DESC;

-- Q5 (multi-select): counts per option.
SELECT option, COUNT(*) AS count
FROM public.survey_responses, jsonb_array_elements_text(answers->'q5') AS option
WHERE survey_key = 'notifications_interest_2026_11'
GROUP BY option
ORDER BY count DESC;

-- Q6 (single): counts per option.
SELECT answers->>'q6' AS option, COUNT(*) AS count
FROM public.survey_responses
WHERE survey_key = 'notifications_interest_2026_11' AND answers ? 'q6'
GROUP BY option
ORDER BY count DESC;

-- Q7, split by branch (positive = Definitely/Probably on Q6, negative = everything else).
SELECT
  CASE WHEN answers->>'q6' IN ('Definitely', 'Probably') THEN 'positive' ELSE 'negative' END AS q7_branch,
  answers->>'q7' AS option,
  COUNT(*) AS count
FROM public.survey_responses
WHERE survey_key = 'notifications_interest_2026_11' AND answers ? 'q7'
GROUP BY q7_branch, option
ORDER BY q7_branch, count DESC;

-- Q6 split by country.
SELECT COALESCE(country, '(unknown)') AS country, answers->>'q6' AS option, COUNT(*) AS count
FROM public.survey_responses
WHERE survey_key = 'notifications_interest_2026_11' AND answers ? 'q6'
GROUP BY country, option
ORDER BY country, count DESC;

-- Q6 split by ref (referral/campaign source).
SELECT COALESCE(ref, '(none)') AS ref, answers->>'q6' AS option, COUNT(*) AS count
FROM public.survey_responses
WHERE survey_key = 'notifications_interest_2026_11' AND answers ? 'q6'
GROUP BY ref, option
ORDER BY ref, count DESC;

-- Completion rate by country.
SELECT
  COALESCE(country, '(unknown)') AS country,
  COUNT(*) AS started,
  COUNT(completed_at) AS completed,
  ROUND(COUNT(completed_at)::numeric / NULLIF(COUNT(*), 0) * 100, 1) AS completion_pct
FROM public.survey_responses
WHERE survey_key = 'notifications_interest_2026_11'
GROUP BY country
ORDER BY started DESC;
