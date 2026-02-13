-- Insert a Conference test event for 28 Feb 2026 (same location & title as before)
-- Run this in Supabase SQL Editor to trigger event notifications and test in-app list.
-- Creator: d8b347cc-1800-496f-b895-fb489ceff5bd
-- Location: 2 Cedar Grove, Wokingham, UK (with city + lat/lng for notifications)

INSERT INTO events (
  creator_id,
  title,
  description,
  event_date,
  location,
  venue,
  category,
  city,
  country,
  latitude,
  longitude,
  current_attendees,
  price_gbp,
  price_ngn,
  max_attendees,
  image_url
) VALUES (
  'd8b347cc-1800-496f-b895-fb489ceff5bd',
  'SoundBridge App Launch Event',
  'SoundBridge app launch – same event, 28 Feb 2026. Use this to test push and in-app notifications.',
  '2026-02-28 15:00:00+00',
  '2 Cedar Grove, Wokingham, UK',
  NULL,
  'Conference',  -- Use Conference so push shows "Conference" not "Other" (requires enum migration 20260211100000)
  'Wokingham',
  'UK',
  51.4112,
  -0.8333,
  0,
  NULL,
  NULL,
  NULL,
  NULL
);
