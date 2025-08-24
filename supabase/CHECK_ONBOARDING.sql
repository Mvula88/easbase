-- Check onboarding status for all users
SELECT 
  id,
  email,
  full_name,
  company_name,
  onboarding_completed,
  onboarding_completed_at,
  created_at
FROM user_profiles
ORDER BY created_at DESC
LIMIT 10;

-- Check if the onboarding_completed column exists and its properties
SELECT 
  column_name, 
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_name = 'user_profiles'
AND column_name = 'onboarding_completed';