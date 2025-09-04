-- Step 4: Verify the setup
SELECT 
  'Setup completed successfully!' as status,
  COUNT(*) as total_profiles,
  COUNT(CASE WHEN onboarding_completed = TRUE THEN 1 END) as completed_onboarding,
  COUNT(CASE WHEN onboarding_completed = FALSE THEN 1 END) as needs_onboarding
FROM profiles;
