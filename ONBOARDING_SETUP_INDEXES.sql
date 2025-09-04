-- Step 2: Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_profiles_onboarding_completed ON profiles(onboarding_completed);
CREATE INDEX IF NOT EXISTS idx_profiles_onboarding_step ON profiles(onboarding_step);
