-- Persona KYC: allow mobile to persist push payload type in notifications (WEB_TEAM_PERSONA_VERIFICATION_FIXES.md)
-- Also allow declined flow payload type used by web Persona webhook.

ALTER TABLE notifications DROP CONSTRAINT IF EXISTS notifications_type_check;
ALTER TABLE notifications ADD CONSTRAINT notifications_type_check
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
    'verification_declined'
  ));
