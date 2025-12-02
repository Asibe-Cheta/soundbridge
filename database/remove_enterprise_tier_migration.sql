-- ============================================================================
-- Remove Enterprise Tier Migration Script
-- Date: December 2, 2025
-- Purpose: Remove Enterprise tier from all database constraints and functions
-- Status: Ready for Production
--
-- IMPORTANT: 
-- 1. Run this in Supabase SQL Editor
-- 2. This script is idempotent (safe to run multiple times)
-- 3. Any existing Enterprise users will be converted to Pro tier
-- 4. Backup your database before running in production
-- ============================================================================

BEGIN;

-- ============================================================================
-- STEP 1: Handle Existing Enterprise Users
-- ============================================================================
-- Convert any existing Enterprise users to Pro tier
-- This preserves their subscription status while removing Enterprise tier

DO $$
DECLARE
  enterprise_count INTEGER;
BEGIN
  -- Count existing Enterprise users
  SELECT COUNT(*) INTO enterprise_count
  FROM user_subscriptions
  WHERE tier = 'enterprise' AND status = 'active';
  
  IF enterprise_count > 0 THEN
    RAISE NOTICE 'Found % active Enterprise subscription(s). Converting to Pro tier...', enterprise_count;
    
    -- Convert Enterprise to Pro
    UPDATE user_subscriptions
    SET tier = 'pro', updated_at = NOW()
    WHERE tier = 'enterprise';
    
    RAISE NOTICE 'Successfully converted % Enterprise subscription(s) to Pro', enterprise_count;
  ELSE
    RAISE NOTICE 'No Enterprise subscriptions found. Proceeding with constraint updates...';
  END IF;
END $$;

-- ============================================================================
-- STEP 2: Update user_subscriptions Table
-- ============================================================================

-- Drop existing tier constraint
ALTER TABLE user_subscriptions
DROP CONSTRAINT IF EXISTS user_subscriptions_tier_check;

-- Add new constraint without Enterprise
ALTER TABLE user_subscriptions
ADD CONSTRAINT user_subscriptions_tier_check 
CHECK (tier IN ('free', 'pro'));

-- Update any remaining Enterprise values (shouldn't be any after Step 1, but just in case)
UPDATE user_subscriptions
SET tier = 'pro', updated_at = NOW()
WHERE tier = 'enterprise';

-- ============================================================================
-- STEP 3: Update audio_tracks Table
-- ============================================================================

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables 
             WHERE table_name = 'audio_tracks') THEN
    -- Drop existing constraint on uploaded_during_tier
    ALTER TABLE audio_tracks
    DROP CONSTRAINT IF EXISTS audio_tracks_uploaded_during_tier_check;
    
    -- Add new constraint without Enterprise
    ALTER TABLE audio_tracks
    ADD CONSTRAINT audio_tracks_uploaded_during_tier_check 
    CHECK (uploaded_during_tier IN ('free', 'pro') OR uploaded_during_tier IS NULL);
    
    -- Update any existing Enterprise values to Pro
    UPDATE audio_tracks
    SET uploaded_during_tier = 'pro'
    WHERE uploaded_during_tier = 'enterprise';
    
    RAISE NOTICE 'Updated audio_tracks table';
  ELSE
    RAISE NOTICE 'Table audio_tracks does not exist - skipping';
  END IF;
END $$;

-- ============================================================================
-- STEP 4: Update downgrade_track_selections Table
-- ============================================================================

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables 
             WHERE table_name = 'downgrade_track_selections') THEN
    -- Drop existing constraints
    ALTER TABLE downgrade_track_selections
    DROP CONSTRAINT IF EXISTS downgrade_track_selections_from_tier_check;
    ALTER TABLE downgrade_track_selections
    DROP CONSTRAINT IF EXISTS downgrade_track_selections_to_tier_check;
    
    -- Add new constraints without Enterprise
    ALTER TABLE downgrade_track_selections
    ADD CONSTRAINT downgrade_track_selections_from_tier_check 
    CHECK (from_tier IN ('free', 'pro'));
    
    ALTER TABLE downgrade_track_selections
    ADD CONSTRAINT downgrade_track_selections_to_tier_check 
    CHECK (to_tier IN ('free', 'pro'));
    
    -- Update any existing Enterprise values
    UPDATE downgrade_track_selections
    SET from_tier = 'pro'
    WHERE from_tier = 'enterprise';
    
    UPDATE downgrade_track_selections
    SET to_tier = 'pro'
    WHERE to_tier = 'enterprise';
    
    RAISE NOTICE 'Updated downgrade_track_selections table';
  ELSE
    RAISE NOTICE 'Table downgrade_track_selections does not exist - skipping';
  END IF;
END $$;

-- ============================================================================
-- STEP 5: Update persistent_user_memory Table
-- ============================================================================

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables 
             WHERE table_name = 'persistent_user_memory') THEN
    -- Drop existing constraint
    ALTER TABLE persistent_user_memory
    DROP CONSTRAINT IF EXISTS persistent_user_memory_subscription_tier_check;
    
    -- Add new constraint without Enterprise
    ALTER TABLE persistent_user_memory
    ADD CONSTRAINT persistent_user_memory_subscription_tier_check 
    CHECK (subscription_tier IN ('free', 'pro'));
    
    -- Update any existing Enterprise values
    UPDATE persistent_user_memory
    SET subscription_tier = 'pro'
    WHERE subscription_tier = 'enterprise';
    
    RAISE NOTICE 'Updated persistent_user_memory table';
  ELSE
    RAISE NOTICE 'Table persistent_user_memory does not exist - skipping';
  END IF;
END $$;

-- ============================================================================
-- STEP 6: Update Tipping Tables
-- ============================================================================

-- Update tips table (if exists)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns 
             WHERE table_name = 'tips' AND column_name = 'tipper_tier') THEN
    ALTER TABLE tips
    DROP CONSTRAINT IF EXISTS tips_tipper_tier_check;
    
    ALTER TABLE tips
    ADD CONSTRAINT tips_tipper_tier_check 
    CHECK (tipper_tier IN ('free', 'pro'));
    
    UPDATE tips
    SET tipper_tier = 'pro'
    WHERE tipper_tier = 'enterprise';
  END IF;
END $$;

-- Update user_upload_stats table (if exists)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns 
             WHERE table_name = 'user_upload_stats' AND column_name = 'current_tier') THEN
    ALTER TABLE user_upload_stats
    DROP CONSTRAINT IF EXISTS user_upload_stats_current_tier_check;
    
    ALTER TABLE user_upload_stats
    ADD CONSTRAINT user_upload_stats_current_tier_check 
    CHECK (current_tier IN ('free', 'pro'));
    
    UPDATE user_upload_stats
    SET current_tier = 'pro'
    WHERE current_tier = 'enterprise';
  END IF;
END $$;

-- Update creator_bank_accounts table (if exists)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns 
             WHERE table_name = 'creator_bank_accounts' AND column_name = 'tipper_tier') THEN
    ALTER TABLE creator_bank_accounts
    DROP CONSTRAINT IF EXISTS creator_bank_accounts_tipper_tier_check;
    
    ALTER TABLE creator_bank_accounts
    ADD CONSTRAINT creator_bank_accounts_tipper_tier_check 
    CHECK (tipper_tier IN ('free', 'pro'));
    
    UPDATE creator_bank_accounts
    SET tipper_tier = 'pro'
    WHERE tipper_tier = 'enterprise';
  END IF;
END $$;

-- ============================================================================
-- STEP 7: Update upload_validation Tables
-- ============================================================================

-- Update upload_validation_logs table (if exists)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns 
             WHERE table_name = 'upload_validation_logs' AND column_name = 'tier') THEN
    ALTER TABLE upload_validation_logs
    DROP CONSTRAINT IF EXISTS upload_validation_logs_tier_check;
    
    ALTER TABLE upload_validation_logs
    ADD CONSTRAINT upload_validation_logs_tier_check 
    CHECK (tier IN ('free', 'pro'));
    
    UPDATE upload_validation_logs
    SET tier = 'pro'
    WHERE tier = 'enterprise';
  END IF;
END $$;

-- Update tier_limits table (if exists)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables 
             WHERE table_name = 'tier_limits') THEN
    ALTER TABLE tier_limits
    DROP CONSTRAINT IF EXISTS tier_limits_tier_check;
    
    ALTER TABLE tier_limits
    ADD CONSTRAINT tier_limits_tier_check 
    CHECK (tier IN ('free', 'pro'));
    
    -- Delete Enterprise tier limits if they exist
    DELETE FROM tier_limits
    WHERE tier = 'enterprise';
  END IF;
END $$;

-- Update user_upload_stats table (if exists) - already handled above, but check for other columns
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns 
             WHERE table_name = 'user_upload_stats' AND column_name = 'tier') THEN
    ALTER TABLE user_upload_stats
    DROP CONSTRAINT IF EXISTS user_upload_stats_tier_check;
    
    ALTER TABLE user_upload_stats
    ADD CONSTRAINT user_upload_stats_tier_check 
    CHECK (tier IN ('free', 'pro'));
    
    UPDATE user_upload_stats
    SET tier = 'pro'
    WHERE tier = 'enterprise';
  END IF;
END $$;

-- ============================================================================
-- STEP 8: Update Database Functions
-- ============================================================================

-- Update has_premium_feature function
CREATE OR REPLACE FUNCTION has_premium_feature(user_uuid UUID, feature_name TEXT)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN (
    SELECT CASE 
      WHEN tier = 'pro' THEN true
      ELSE false
    END
    FROM user_subscriptions 
    WHERE user_id = user_uuid AND status = 'active'
    ORDER BY created_at DESC 
    LIMIT 1
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Update restore_tracks_on_upgrade function
CREATE OR REPLACE FUNCTION restore_tracks_on_upgrade(p_user_id UUID)
RETURNS INTEGER AS $$
DECLARE
  restored_count INTEGER := 0;
BEGIN
  -- Restore tracks that were uploaded during Pro subscription
  -- (Enterprise removed, so only Pro tracks need restoration)
  UPDATE audio_tracks
  SET visibility = 'public'
  WHERE user_id = p_user_id
    AND visibility = 'private'
    AND uploaded_during_tier IN ('pro');
  
  GET DIAGNOSTICS restored_count = ROW_COUNT;
  
  RETURN restored_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Update any functions that check for Enterprise tier
-- Check upload limit function (if exists)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'check_upload_limit') THEN
    -- The function body will be updated by the tier_restructure_schema.sql
    -- This is just a placeholder to note it needs updating
    RAISE NOTICE 'Function check_upload_limit exists - ensure it does not reference Enterprise';
  END IF;
END $$;

-- ============================================================================
-- STEP 9: Update Triggers
-- ============================================================================

-- Update restore_tracks_on_upgrade trigger (if exists)
-- Note: The trigger uses auto_restore_tracks_on_upgrade() function which calls restore_tracks_on_upgrade()
DO $$
BEGIN
  -- Check if the trigger function exists (created by restore_tracks_on_upgrade.sql)
  IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'auto_restore_tracks_on_upgrade') THEN
    -- Drop existing trigger if it exists
    DROP TRIGGER IF EXISTS trigger_restore_tracks_on_upgrade ON user_subscriptions;
    DROP TRIGGER IF EXISTS restore_tracks_on_upgrade_trigger ON user_subscriptions;
    
    -- Recreate trigger with updated logic (Pro only, no Enterprise)
    CREATE TRIGGER trigger_restore_tracks_on_upgrade
    AFTER UPDATE OF tier, status ON user_subscriptions
    FOR EACH ROW
    WHEN (OLD.tier = 'free' AND NEW.tier = 'pro' AND NEW.status = 'active')
    EXECUTE FUNCTION auto_restore_tracks_on_upgrade();
    
    RAISE NOTICE 'Updated trigger_restore_tracks_on_upgrade trigger';
  ELSE
    RAISE NOTICE 'Function auto_restore_tracks_on_upgrade does not exist - trigger not created. Run restore_tracks_on_upgrade.sql first.';
  END IF;
END $$;

-- ============================================================================
-- STEP 10: Verification Queries
-- ============================================================================

-- Verify no Enterprise tiers remain
DO $$
DECLARE
  remaining_enterprise INTEGER;
BEGIN
  -- Check user_subscriptions
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'user_subscriptions') THEN
    SELECT COUNT(*) INTO remaining_enterprise
    FROM user_subscriptions
    WHERE tier = 'enterprise';
    
    IF remaining_enterprise > 0 THEN
      RAISE WARNING 'Found % Enterprise subscription(s) remaining in user_subscriptions', remaining_enterprise;
    ELSE
      RAISE NOTICE '✓ No Enterprise subscriptions in user_subscriptions';
    END IF;
  END IF;
  
  -- Check audio_tracks
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'audio_tracks') THEN
    SELECT COUNT(*) INTO remaining_enterprise
    FROM audio_tracks
    WHERE uploaded_during_tier = 'enterprise';
    
    IF remaining_enterprise > 0 THEN
      RAISE WARNING 'Found % track(s) with Enterprise tier in audio_tracks', remaining_enterprise;
    ELSE
      RAISE NOTICE '✓ No Enterprise tiers in audio_tracks';
    END IF;
  END IF;
  
  -- Check downgrade_track_selections
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'downgrade_track_selections') THEN
    SELECT COUNT(*) INTO remaining_enterprise
    FROM downgrade_track_selections
    WHERE from_tier = 'enterprise' OR to_tier = 'enterprise';
    
    IF remaining_enterprise > 0 THEN
      RAISE WARNING 'Found % Enterprise tier(s) in downgrade_track_selections', remaining_enterprise;
    END IF;
  END IF;
  
  RAISE NOTICE 'Migration verification complete';
END $$;

-- ============================================================================
-- STEP 11: Add Comments for Documentation
-- ============================================================================

COMMENT ON CONSTRAINT user_subscriptions_tier_check ON user_subscriptions IS 
'Only Free and Pro tiers are supported. Enterprise tier has been removed.';

COMMENT ON CONSTRAINT audio_tracks_uploaded_during_tier_check ON audio_tracks IS 
'Only Free and Pro tiers are supported. Enterprise tier has been removed.';

-- ============================================================================
-- Migration Complete
-- ============================================================================

COMMIT;

-- ============================================================================
-- POST-MIGRATION VERIFICATION
-- ============================================================================
-- Run these queries to verify the migration:

-- 1. Check all tier constraints
-- SELECT 
--   table_name, 
--   constraint_name, 
--   check_clause 
-- FROM information_schema.check_constraints 
-- WHERE constraint_name LIKE '%tier%' 
-- ORDER BY table_name;

-- 2. Verify no Enterprise values remain
-- SELECT 'user_subscriptions' as table_name, COUNT(*) as enterprise_count
-- FROM user_subscriptions WHERE tier = 'enterprise'
-- UNION ALL
-- SELECT 'audio_tracks', COUNT(*)
-- FROM audio_tracks WHERE uploaded_during_tier = 'enterprise'
-- UNION ALL
-- SELECT 'downgrade_track_selections', COUNT(*)
-- FROM downgrade_track_selections WHERE from_tier = 'enterprise' OR to_tier = 'enterprise';

-- 3. Test constraint enforcement
-- INSERT INTO user_subscriptions (user_id, tier) 
-- VALUES (gen_random_uuid(), 'enterprise');
-- -- Should fail with constraint violation

-- ============================================================================
-- ROLLBACK INSTRUCTIONS (if needed)
-- ============================================================================
-- If you need to rollback this migration:
-- 1. Restore from database backup
-- 2. Or manually add 'enterprise' back to all CHECK constraints
-- 3. Note: This is not recommended as Enterprise tier is no longer supported
