-- Step 2 of 2 — run after demand_led_events_1_enum.sql

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
    'event_reminder', 'creator_post', 'share', 'repost',
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

-- ─── Tables ───────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.poll_campaigns (
  id                 uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  creator_id         uuid        NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  message_body       text        NOT NULL,
  date_options       text[]      NOT NULL DEFAULT '{}',
  location_options   text[]      NOT NULL DEFAULT '{}',
  combined_options   jsonb       NOT NULL DEFAULT '[]'::jsonb,
  total_recipients   integer     NOT NULL DEFAULT 0,
  total_responses    integer     NOT NULL DEFAULT 0,
  sent_at            timestamptz NOT NULL DEFAULT now(),
  expires_at         timestamptz NOT NULL,
  status             text        NOT NULL DEFAULT 'active'
                     CHECK (status IN ('active', 'expired', 'completed')),
  created_at         timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_poll_campaigns_creator_status
  ON public.poll_campaigns (creator_id, status, created_at DESC);

CREATE TABLE IF NOT EXISTS public.poll_responses (
  id               uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id      uuid        NOT NULL REFERENCES public.poll_campaigns(id) ON DELETE CASCADE,
  user_id          uuid        NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  selected_option  text        NOT NULL,
  selected_date    text,
  selected_location text,
  responded_at     timestamptz NOT NULL DEFAULT now(),
  UNIQUE (campaign_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_poll_responses_campaign
  ON public.poll_responses (campaign_id);

CREATE TABLE IF NOT EXISTS public.live_interest_push_sent (
  id         uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    uuid        NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  track_id   uuid        NOT NULL REFERENCES public.audio_tracks(id) ON DELETE CASCADE,
  sent_at    timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, track_id)
);

CREATE TABLE IF NOT EXISTS public.interest_threshold_notifications (
  creator_id  uuid        PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
  yes_count   integer     NOT NULL DEFAULT 0,
  notified_at timestamptz NOT NULL DEFAULT now()
);

-- ─── RLS ──────────────────────────────────────────────────────────────────────

ALTER TABLE public.poll_campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.poll_responses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.live_interest_push_sent ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.interest_threshold_notifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS poll_campaigns_creator_select ON public.poll_campaigns;
CREATE POLICY poll_campaigns_creator_select ON public.poll_campaigns
  FOR SELECT USING (creator_id = auth.uid());

DROP POLICY IF EXISTS poll_campaigns_recipient_select ON public.poll_campaigns;
CREATE POLICY poll_campaigns_recipient_select ON public.poll_campaigns
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.poll_responses pr
      WHERE pr.campaign_id = poll_campaigns.id AND pr.user_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM public.messages m
      WHERE m.sender_id = poll_campaigns.creator_id
        AND m.recipient_id = auth.uid()
        AND m.message_type = 'event_poll'
        AND m.content LIKE ('%' || poll_campaigns.id::text || '%')
    )
  );

DROP POLICY IF EXISTS poll_responses_own_select ON public.poll_responses;
CREATE POLICY poll_responses_own_select ON public.poll_responses
  FOR SELECT USING (user_id = auth.uid());

DROP POLICY IF EXISTS poll_responses_creator_select ON public.poll_responses;
CREATE POLICY poll_responses_creator_select ON public.poll_responses
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.poll_campaigns pc
      WHERE pc.id = poll_responses.campaign_id AND pc.creator_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS live_interest_push_sent_own ON public.live_interest_push_sent;
CREATE POLICY live_interest_push_sent_own ON public.live_interest_push_sent
  FOR ALL USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS interest_threshold_creator_select ON public.interest_threshold_notifications;
CREATE POLICY interest_threshold_creator_select ON public.interest_threshold_notifications
  FOR SELECT USING (creator_id = auth.uid());

-- ─── Helpers ──────────────────────────────────────────────────────────────────

DROP FUNCTION IF EXISTS public.creator_live_interest_yes_count(uuid);

CREATE OR REPLACE FUNCTION public.creator_live_interest_yes_count(p_creator_id uuid)
RETURNS integer
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COUNT(DISTINCT lir.user_id)::integer
  FROM public.live_interest_responses lir
  INNER JOIN public.audio_tracks t ON t.id = lir.track_id
  WHERE t.creator_id = p_creator_id
    AND lir.responded_yes = true;
$$;

-- ─── dispatch_poll_campaign ───────────────────────────────────────────────────

DROP FUNCTION IF EXISTS public.dispatch_poll_campaign(uuid, text, text[], text[], jsonb);

CREATE OR REPLACE FUNCTION public.dispatch_poll_campaign(
  p_creator_id       uuid,
  p_message_body     text,
  p_date_options     text[],
  p_location_options text[],
  p_combined_options jsonb
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_campaign_id uuid;
  v_recipient   uuid;
  v_payload     jsonb;
  v_content     text;
  v_count       integer := 0;
BEGIN
  IF auth.uid() IS DISTINCT FROM p_creator_id THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.poll_campaigns
    WHERE creator_id = p_creator_id AND status = 'active' AND expires_at > now()
  ) THEN
    RAISE EXCEPTION 'Creator already has an active poll campaign';
  END IF;

  INSERT INTO public.poll_campaigns (
    creator_id,
    message_body,
    date_options,
    location_options,
    combined_options,
    total_recipients,
    expires_at,
    status
  )
  VALUES (
    p_creator_id,
    p_message_body,
    COALESCE(p_date_options, '{}'),
    COALESCE(p_location_options, '{}'),
    COALESCE(p_combined_options, '[]'::jsonb),
    0,
    now() + interval '14 days',
    'active'
  )
  RETURNING id INTO v_campaign_id;

  v_payload := jsonb_build_object(
    'type', 'event_poll',
    'campaign_id', v_campaign_id,
    'body', p_message_body,
    'options', COALESCE(p_combined_options, '[]'::jsonb)
  );
  v_content := v_payload::text;

  FOR v_recipient IN
    SELECT DISTINCT lir.user_id
    FROM public.live_interest_responses lir
    INNER JOIN public.audio_tracks t ON t.id = lir.track_id
    WHERE t.creator_id = p_creator_id
      AND lir.responded_yes = true
      AND lir.user_id IS NOT NULL
      AND lir.user_id <> p_creator_id
  LOOP
    INSERT INTO public.messages (sender_id, recipient_id, content, message_type)
    VALUES (p_creator_id, v_recipient, v_content, 'event_poll');
    v_count := v_count + 1;
  END LOOP;

  UPDATE public.poll_campaigns
  SET total_recipients = v_count
  WHERE id = v_campaign_id;

  RETURN v_campaign_id;
END;
$$;

-- ─── respond_to_poll ──────────────────────────────────────────────────────────

DROP FUNCTION IF EXISTS public.respond_to_poll(uuid, uuid, text, text, text);

CREATE OR REPLACE FUNCTION public.respond_to_poll(
  p_campaign_id      uuid,
  p_user_id          uuid,
  p_selected_option  text,
  p_selected_date    text DEFAULT NULL,
  p_selected_location text DEFAULT NULL
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_row_count integer := 0;
BEGIN
  IF auth.uid() IS DISTINCT FROM p_user_id THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.poll_campaigns
    WHERE id = p_campaign_id AND status = 'active' AND expires_at > now()
  ) THEN
    RAISE EXCEPTION 'Poll campaign is not active';
  END IF;

  INSERT INTO public.poll_responses (
    campaign_id,
    user_id,
    selected_option,
    selected_date,
    selected_location
  )
  VALUES (
    p_campaign_id,
    p_user_id,
    p_selected_option,
    p_selected_date,
    p_selected_location
  )
  ON CONFLICT (campaign_id, user_id) DO NOTHING;

  GET DIAGNOSTICS v_row_count = ROW_COUNT;

  IF v_row_count > 0 THEN
    UPDATE public.poll_campaigns
    SET total_responses = total_responses + 1
    WHERE id = p_campaign_id;
  END IF;

  RETURN v_row_count > 0;
END;
$$;

-- ─── get_poll_results ─────────────────────────────────────────────────────────

DROP FUNCTION IF EXISTS public.get_poll_results(uuid);

CREATE OR REPLACE FUNCTION public.get_poll_results(p_campaign_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_campaign public.poll_campaigns%ROWTYPE;
  v_options  jsonb := '[]'::jsonb;
  v_locations jsonb := '[]'::jsonb;
  v_winning  jsonb;
  v_top_avail text;
  v_rate     numeric;
BEGIN
  SELECT * INTO v_campaign FROM public.poll_campaigns WHERE id = p_campaign_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Campaign not found';
  END IF;

  IF v_campaign.creator_id IS DISTINCT FROM auth.uid()
     AND NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = true) THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  SELECT COALESCE(
    jsonb_agg(
      jsonb_build_object(
        'label', opt.label,
        'date', opt.date,
        'location', opt.location,
        'votes', opt.votes,
        'percentage', CASE WHEN v_campaign.total_responses > 0
          THEN ROUND((opt.votes::numeric / v_campaign.total_responses) * 100, 1)
          ELSE 0 END
      )
      ORDER BY opt.votes DESC, opt.label
    ),
    '[]'::jsonb
  )
  INTO v_options
  FROM (
    SELECT
      pr.selected_option AS label,
      MAX(pr.selected_date) AS date,
      MAX(pr.selected_location) AS location,
      COUNT(*)::integer AS votes
    FROM public.poll_responses pr
    WHERE pr.campaign_id = p_campaign_id
    GROUP BY pr.selected_option
  ) opt;

  SELECT COALESCE(
    jsonb_agg(
      jsonb_build_object(
        'location', loc.location,
        'votes', loc.votes
      )
      ORDER BY loc.votes DESC
    ),
    '[]'::jsonb
  )
  INTO v_locations
  FROM (
    SELECT
      COALESCE(NULLIF(TRIM(pr.selected_location), ''), 'Unknown') AS location,
      COUNT(*)::integer AS votes
    FROM public.poll_responses pr
    WHERE pr.campaign_id = p_campaign_id
    GROUP BY 1
  ) loc;

  SELECT elem INTO v_winning
  FROM jsonb_array_elements(v_options) elem
  ORDER BY (elem->>'votes')::integer DESC
  LIMIT 1;

  SELECT lir.availability_preference
  INTO v_top_avail
  FROM public.live_interest_responses lir
  INNER JOIN public.audio_tracks t ON t.id = lir.track_id
  WHERE t.creator_id = v_campaign.creator_id
    AND lir.responded_yes = true
    AND lir.availability_preference IS NOT NULL
    AND TRIM(lir.availability_preference) <> ''
  GROUP BY lir.availability_preference
  ORDER BY COUNT(*) DESC
  LIMIT 1;

  v_rate := CASE
    WHEN v_campaign.total_recipients > 0
      THEN ROUND((v_campaign.total_responses::numeric / v_campaign.total_recipients) * 100, 1)
    ELSE 0
  END;

  RETURN jsonb_build_object(
    'campaign_id', v_campaign.id,
    'status', v_campaign.status,
    'total_recipients', v_campaign.total_recipients,
    'total_responses', v_campaign.total_responses,
    'response_rate_percent', v_rate,
    'options', v_options,
    'location_totals', v_locations,
    'winning_option', v_winning,
    'availability_insight', CASE
      WHEN v_top_avail IS NOT NULL THEN
        'Most of your interested listeners prefer ' || v_top_avail || '.'
      ELSE NULL
    END,
    'sent_at', v_campaign.sent_at,
    'expires_at', v_campaign.expires_at
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.dispatch_poll_campaign(uuid, text, text[], text[], jsonb) TO authenticated;
GRANT EXECUTE ON FUNCTION public.respond_to_poll(uuid, uuid, text, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_poll_results(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.creator_live_interest_yes_count(uuid) TO authenticated;
