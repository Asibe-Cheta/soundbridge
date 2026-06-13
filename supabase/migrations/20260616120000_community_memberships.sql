-- Explicit community membership (separate from follows).
-- Mobile reads profiles!community_memberships_creator_id_fkey for joins.

CREATE TABLE IF NOT EXISTS public.community_memberships (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  creator_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  joined_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  join_source TEXT NOT NULL CHECK (join_source IN ('manual', 'post_tip_prompt')),
  UNIQUE (user_id, creator_id)
);

CREATE INDEX IF NOT EXISTS community_memberships_creator_id_idx
  ON public.community_memberships (creator_id);

CREATE INDEX IF NOT EXISTS community_memberships_user_id_idx
  ON public.community_memberships (user_id);

COMMENT ON TABLE public.community_memberships IS
  'Deliberate community opt-in. Never auto-populated from follows.';

ALTER TABLE public.community_memberships ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS community_memberships_read ON public.community_memberships;
CREATE POLICY community_memberships_read ON public.community_memberships
  FOR SELECT USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS community_memberships_insert ON public.community_memberships;
CREATE POLICY community_memberships_insert ON public.community_memberships
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS community_memberships_delete ON public.community_memberships;
CREATE POLICY community_memberships_delete ON public.community_memberships
  FOR DELETE USING (auth.uid() = user_id);

-- Posts marked as community updates notify members only (not all followers).
ALTER TABLE public.posts
  ADD COLUMN IF NOT EXISTS is_community_update BOOLEAN NOT NULL DEFAULT false;

COMMENT ON COLUMN public.posts.is_community_update IS
  'When true, push notifications go to community_memberships only.';

-- Allow creator_goal inbox type for community-only goal launches.
-- Must include every type from 20260531120000_demand_led_events.sql plus creator_goal.
ALTER TABLE public.notifications DROP CONSTRAINT IF EXISTS notifications_type_check;
ALTER TABLE public.notifications ADD CONSTRAINT notifications_type_check
  CHECK (type IN (
    'follow', 'new_follower', 'like', 'comment', 'event',
    'collaboration', 'collaboration_request', 'collaboration_accepted',
    'collaboration_declined', 'collaboration_confirmed',
    'tip', 'message', 'system', 'content_purchase',
    'connection_request', 'connection_accepted', 'subscription',
    'payout', 'moderation', 'live_session', 'track',
    'track_approved', 'track_featured', 'withdrawal',
    'event_reminder', 'creator_post', 'creator_goal', 'share', 'repost',
    'post_reaction', 'post_comment', 'comment_reply',
    'opportunity_interest', 'opportunity_project_agreement', 'opportunity_project_payment_required',
    'opportunity_project_active', 'opportunity_project_delivered', 'opportunity_project_completed',
    'opportunity_review_prompt', 'opportunity_project_declined', 'opportunity_project_disputed',
    'opportunity_expiring_no_interest', 'opportunity_expiring_with_interest',
    'opportunity_agreement_received',
    'identity_verified',
    'verification_declined',
    'live_interest_threshold'
  ));

-- Track release notifications: followers of the creator only (not all genre-matched users).
CREATE OR REPLACE FUNCTION public.get_matching_users_for_track(p_track_id UUID)
RETURNS TABLE (
  user_id UUID,
  push_token TEXT,
  quiet_hours_enabled BOOLEAN,
  quiet_hours_start TIME,
  quiet_hours_end TIME
)
LANGUAGE plpgsql
AS $$
DECLARE
  v_track_genre TEXT;
  v_track_creator UUID;
BEGIN
  SELECT at.genre, at.creator_id
  INTO v_track_genre, v_track_creator
  FROM audio_tracks at
  WHERE at.id = p_track_id;

  IF v_track_creator IS NULL THEN
    RETURN;
  END IF;

  RETURN QUERY
  SELECT
    p.id AS user_id,
    COALESCE(upt.push_token, p.expo_push_token) AS push_token,
    COALESCE(np.quiet_hours_enabled, false) AS quiet_hours_enabled,
    COALESCE(np.quiet_hours_start, '22:00'::TIME) AS quiet_hours_start,
    COALESCE(np.quiet_hours_end, '08:00'::TIME) AS quiet_hours_end
  FROM profiles p
  INNER JOIN follows f ON f.follower_id = p.id AND f.following_id = v_track_creator
  LEFT JOIN user_notification_preferences np ON np.user_id = p.id
  LEFT JOIN LATERAL (
    SELECT upt_src.push_token
    FROM user_push_tokens upt_src
    WHERE upt_src.user_id = p.id
      AND COALESCE(
        (to_jsonb(upt_src)->>'active')::BOOLEAN,
        (to_jsonb(upt_src)->>'is_active')::BOOLEAN,
        true
      ) = true
    ORDER BY upt_src.last_used_at DESC NULLS LAST
    LIMIT 1
  ) upt ON TRUE
  WHERE
    p.id <> v_track_creator
    AND COALESCE(np.event_notifications_enabled, true) = true
    AND COALESCE(upt.push_token, p.expo_push_token) IS NOT NULL;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_matching_users_for_track(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_matching_users_for_track(UUID) TO service_role;

-- 48-hour event reminders for community members who have not bookmarked or purchased.
CREATE OR REPLACE FUNCTION public.schedule_community_member_event_reminders(p_event_id UUID)
RETURNS INTEGER AS $$
DECLARE
  v_event RECORD;
  v_scheduled_count INTEGER := 0;
BEGIN
  SELECT id, creator_id, event_date INTO v_event
  FROM events
  WHERE id = p_event_id;

  IF v_event IS NULL OR v_event.creator_id IS NULL THEN
    RETURN 0;
  END IF;

  IF v_event.event_date <= NOW() + INTERVAL '48 hours' THEN
    RETURN 0;
  END IF;

  INSERT INTO scheduled_notifications (user_id, event_id, notification_type, scheduled_for)
  SELECT
    cm.user_id,
    p_event_id,
    '48_hours',
    v_event.event_date - INTERVAL '48 hours'
  FROM community_memberships cm
  WHERE cm.creator_id = v_event.creator_id
    AND cm.user_id <> v_event.creator_id
    AND NOT EXISTS (
      SELECT 1 FROM event_bookmarks eb
      WHERE eb.event_id = p_event_id AND eb.user_id = cm.user_id
    )
    AND NOT EXISTS (
      SELECT 1 FROM purchased_event_tickets pet
      WHERE pet.event_id = p_event_id AND pet.user_id = cm.user_id
    )
  ON CONFLICT (user_id, event_id, notification_type) DO NOTHING;

  GET DIAGNOSTICS v_scheduled_count = ROW_COUNT;
  RETURN v_scheduled_count;
EXCEPTION WHEN OTHERS THEN
  RETURN v_scheduled_count;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION public.trigger_schedule_community_event_reminders()
RETURNS TRIGGER AS $$
BEGIN
  BEGIN
    PERFORM schedule_community_member_event_reminders(NEW.id);
  EXCEPTION WHEN OTHERS THEN
    NULL;
  END;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_schedule_community_event_reminders ON public.events;
CREATE TRIGGER trg_schedule_community_event_reminders
  AFTER INSERT ON public.events
  FOR EACH ROW
  EXECUTE FUNCTION trigger_schedule_community_event_reminders();
