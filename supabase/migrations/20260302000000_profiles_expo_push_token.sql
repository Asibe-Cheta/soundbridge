-- Ensure profiles has expo_push_token for push notifications (WEB_TEAM_PUSH_NOTIFICATIONS_REQUIRED.MD)
-- Mobile app may write token here; backend should prefer this then fallback to user_push_tokens
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS expo_push_token TEXT;

COMMENT ON COLUMN profiles.expo_push_token IS 'Expo push token for mobile push notifications; preferred over user_push_tokens when sending.';
