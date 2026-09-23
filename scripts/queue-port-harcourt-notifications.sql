-- Backfill: queue promotion notifications for the Port Harcourt event that got
-- stuck at Sent: 0 because find_nearby_users_for_event was throwing a SQL error
-- for every event (fixed in 20260923100000_fix_find_nearby_users_for_event_varchar_cast.sql).
--
-- This queues real rows into event_notifications (status='queued', scheduled_for=now()).
-- The already-running send-event-push-queue cron (every ~30-60s) will pick these up
-- and send REAL push notifications to the matched users within a minute of this running.
-- Run only once you're ready for that to actually happen.
--
-- 1) PREVIEW — should return 2 rows (confirmed via RPC before this was written)
SELECT * FROM get_matching_users_for_event('03621828-f029-44a0-b0b5-ad33f57f3fb2');

-- 2) APPLY — queue notifications for anyone matched above who isn't already notified
INSERT INTO event_notifications (user_id, event_id, notification_type, notification_style, title, body, status, scheduled_for)
SELECT
  m.user_id,
  '03621828-f029-44a0-b0b5-ad33f57f3fb2',
  'event_announcement',
  'standard',
  e.title,
  to_char(e.event_date, 'Mon DD, YYYY') || ' at ' || COALESCE(e.venue, e.location),
  'queued',
  NOW()
FROM get_matching_users_for_event('03621828-f029-44a0-b0b5-ad33f57f3fb2') m
CROSS JOIN (SELECT title, event_date, venue, location FROM events WHERE id = '03621828-f029-44a0-b0b5-ad33f57f3fb2') e
WHERE NOT EXISTS (
  SELECT 1 FROM event_notifications en
  WHERE en.user_id = m.user_id
    AND en.event_id = '03621828-f029-44a0-b0b5-ad33f57f3fb2'
    AND en.notification_type = 'event_announcement'
);

-- 3) Update the event's own notification_sent bookkeeping to match
UPDATE events
SET notification_sent = true,
    notification_sent_at = NOW(),
    notification_count = (
      SELECT COUNT(*) FROM event_notifications
      WHERE event_id = '03621828-f029-44a0-b0b5-ad33f57f3fb2'
    )
WHERE id = '03621828-f029-44a0-b0b5-ad33f57f3fb2';

-- 4) VERIFY
SELECT id, user_id, status, scheduled_for, sent_at FROM event_notifications
WHERE event_id = '03621828-f029-44a0-b0b5-ad33f57f3fb2';
