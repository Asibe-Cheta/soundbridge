-- notifications.type CHECK constraint has no ticket/purchase-related value at all
-- ('ticket_sold', 'ticket_purchase', 'purchase', 'booking', 'sale' all rejected on probe),
-- but mobile already shipped real UI (icon/color/tap-navigation) specifically for
-- type: 'ticket_sold'. Adding it so confirm-ticket-purchase can actually notify the
-- organizer when someone buys a ticket — that notification has never fired for anyone.
--
-- Full exact current allow-list retrieved directly via
-- `SELECT pg_get_constraintdef(oid) FROM pg_constraint WHERE conname = 'notifications_type_check'`
-- (not guessed) — 'ticket_sold' is the only addition, nothing else changed.

ALTER TABLE notifications DROP CONSTRAINT IF EXISTS notifications_type_check;

ALTER TABLE notifications ADD CONSTRAINT notifications_type_check CHECK (
  (type)::text = ANY (ARRAY[
    'follow', 'new_follower', 'like', 'comment', 'event', 'collaboration',
    'collaboration_request', 'collaboration_accepted', 'collaboration_declined',
    'collaboration_confirmed', 'tip', 'message', 'system', 'content_purchase',
    'connection_request', 'connection_accepted', 'subscription', 'payout', 'moderation',
    'live_session', 'track', 'track_approved', 'track_featured', 'withdrawal',
    'event_reminder', 'creator_post', 'creator_goal', 'share', 'repost', 'post_reaction',
    'post_comment', 'comment_reply', 'opportunity_interest', 'opportunity_project_agreement',
    'opportunity_project_payment_required', 'opportunity_project_active',
    'opportunity_project_delivered', 'opportunity_project_completed',
    'opportunity_review_prompt', 'opportunity_project_declined',
    'opportunity_project_disputed', 'opportunity_expiring_no_interest',
    'opportunity_expiring_with_interest', 'opportunity_agreement_received',
    'identity_verified', 'verification_declined', 'live_interest_threshold', 'campaign',
    'ticket_sold'
  ]::character varying[])
);
