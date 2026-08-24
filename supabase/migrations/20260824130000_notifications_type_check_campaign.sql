-- Marketing campaign pushes (WEB_TEAM_IG_LIVE_CAMPAIGN.MD, WEB_TEAM_VIDEO_AND_EARNING_CAMPAIGNS.MD)
-- use notification type 'campaign', which notifications_type_check does not allow yet — any
-- insert attempt (mobile's own on-receive persistence, or a backend dual-write) is silently
-- rejected, so campaign pushes never appear in the in-app Notifications screen even though the
-- OS-level push itself is delivered fine. Must include every type from
-- 20260616120000_community_memberships.sql (the current constraint) plus 'campaign'.
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
    'live_interest_threshold',
    'campaign'
  ));
