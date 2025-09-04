-- Step 3: Update existing users to skip onboarding
UPDATE profiles 
SET onboarding_completed = TRUE, 
    onboarding_step = 'completed',
    onboarding_completed_at = NOW()
WHERE onboarding_completed IS NULL OR onboarding_completed = FALSE;
