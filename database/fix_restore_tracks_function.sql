-- Fix restore_tracks_on_upgrade function
-- The function was using user_id but audio_tracks table uses creator_id
-- Date: December 3, 2025

-- Fix the function to use creator_id instead of user_id
CREATE OR REPLACE FUNCTION restore_tracks_on_upgrade(p_user_id UUID)
RETURNS INTEGER AS $$
DECLARE
  restored_count INTEGER;
BEGIN
  -- Restore all private tracks that were uploaded during Pro tier
  -- Use creator_id (not user_id) as that's the column name in audio_tracks
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
