-- Ensure venue_notification_preferences exists for all users, not just specific accounts.
-- 1) Backfill all existing auth.users
-- 2) Auto-create defaults for future auth.users inserts

INSERT INTO public.venue_notification_preferences (user_id)
SELECT u.id
FROM auth.users u
LEFT JOIN public.venue_notification_preferences vnp ON vnp.user_id = u.id
WHERE vnp.user_id IS NULL;

CREATE OR REPLACE FUNCTION public.ensure_venue_notification_preferences_for_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.venue_notification_preferences (user_id)
  VALUES (NEW.id)
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created_venue_notification_preferences ON auth.users;
CREATE TRIGGER on_auth_user_created_venue_notification_preferences
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.ensure_venue_notification_preferences_for_new_user();

