-- Social / wallet push toggles (WEB_TEAM_PUSH_NOTIFICATIONS_GAPS.md). Default true = existing behaviour.

ALTER TABLE public.notification_preferences
  ADD COLUMN IF NOT EXISTS comments_on_posts BOOLEAN DEFAULT true,
  ADD COLUMN IF NOT EXISTS likes_on_posts BOOLEAN DEFAULT true,
  ADD COLUMN IF NOT EXISTS new_followers BOOLEAN DEFAULT true,
  ADD COLUMN IF NOT EXISTS content_sales BOOLEAN DEFAULT true;

COMMENT ON COLUMN public.notification_preferences.comments_on_posts IS 'Push/in-app: comments on my posts';
COMMENT ON COLUMN public.notification_preferences.likes_on_posts IS 'Push/in-app: reactions/likes on my posts';
COMMENT ON COLUMN public.notification_preferences.new_followers IS 'Push/in-app: new followers';
COMMENT ON COLUMN public.notification_preferences.content_sales IS 'Push/in-app: paid content purchases';
