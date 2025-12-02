-- Function to restore private tracks when user re-upgrades to Pro
-- When user upgrades from Free to Pro, restore all tracks that were hidden during downgrade
-- Date: December 2024

CREATE OR REPLACE FUNCTION restore_tracks_on_upgrade(p_user_id UUID)
RETURNS INTEGER AS $$
DECLARE
  restored_count INTEGER;
BEGIN
  -- Restore all private tracks that were uploaded during Pro tier
  UPDATE audio_tracks
  SET visibility = 'public'
  WHERE creator_id = p_user_id
    AND visibility = 'private'
    AND uploaded_during_tier = 'pro'
    AND deleted_at IS NULL;
  
  GET DIAGNOSTICS restored_count = ROW_COUNT;
  
  RETURN restored_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION restore_tracks_on_upgrade(UUID) IS 
  'Restores private tracks to public when user upgrades to Pro tier';

-- Trigger to automatically restore tracks when subscription tier changes to Pro
CREATE OR REPLACE FUNCTION auto_restore_tracks_on_upgrade()
RETURNS TRIGGER AS $$
BEGIN
  -- If tier changed from free to pro, restore tracks
  IF OLD.tier = 'free' AND NEW.tier = 'pro' AND NEW.status = 'active' THEN
    PERFORM restore_tracks_on_upgrade(NEW.user_id);
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger
DROP TRIGGER IF EXISTS trigger_restore_tracks_on_upgrade ON user_subscriptions;

CREATE TRIGGER trigger_restore_tracks_on_upgrade
  AFTER UPDATE OF tier, status ON user_subscriptions
  FOR EACH ROW
  WHEN (OLD.tier = 'free' AND NEW.tier = 'pro' AND NEW.status = 'active')
  EXECUTE FUNCTION auto_restore_tracks_on_upgrade();
