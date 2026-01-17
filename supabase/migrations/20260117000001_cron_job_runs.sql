-- Cron Job Run Logs
-- Date: January 17, 2026
-- Purpose: Track scheduled job executions for debugging

CREATE TABLE IF NOT EXISTS cron_job_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_name TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'running', -- running, success, failed
  processed_count INTEGER DEFAULT 0,
  error_message TEXT,
  started_at TIMESTAMPTZ DEFAULT NOW(),
  finished_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_cron_job_runs_job_name ON cron_job_runs(job_name);
CREATE INDEX IF NOT EXISTS idx_cron_job_runs_started_at ON cron_job_runs(started_at DESC);
