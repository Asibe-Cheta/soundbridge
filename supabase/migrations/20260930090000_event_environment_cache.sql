-- Cache for the post-entry weather/transport check on event creation (WEATHER_IN_EVENTS.MD).
-- Server-side only (accessed via the service-role client in
-- apps/web/app/api/events/weather-check/route.ts) — rounded lat/lng + date as the key so
-- organisers checking the same venue/date share one set of upstream API calls instead of
-- each triggering a fresh OpenWeatherMap/TomTom/rail lookup.

CREATE TABLE IF NOT EXISTS event_environment_cache (
  cache_key   TEXT PRIMARY KEY,
  data        JSONB NOT NULL,
  fetched_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE event_environment_cache ENABLE ROW LEVEL SECURITY;

-- No public policies — service-role only, matching how the route reads/writes it.
