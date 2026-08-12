-- events has update_events_updated_at trigger but column was missing in production.
ALTER TABLE public.events
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

UPDATE public.events
SET updated_at = COALESCE(updated_at, created_at, NOW())
WHERE updated_at IS NULL;
