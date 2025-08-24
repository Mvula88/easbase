-- Check the structure of user_profiles table
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_name = 'user_profiles'
ORDER BY ordinal_position;

-- Check onboarding status for all users (with proper join to get email)
SELECT 
  p.id,
  u.email,
  p.full_name,
  p.company_name,
  p.onboarding_completed,
  p.onboarding_completed_at,
  p.created_at
FROM user_profiles p
LEFT JOIN auth.users u ON p.id = u.id
ORDER BY p.created_at DESC
LIMIT 10;

-- Check if there are any users with onboarding_completed = true
SELECT COUNT(*) as completed_count
FROM user_profiles
WHERE onboarding_completed = true;

-- Check if there are any users with onboarding_completed = false or NULL
SELECT COUNT(*) as not_completed_count
FROM user_profiles
WHERE onboarding_completed = false OR onboarding_completed IS NULL;