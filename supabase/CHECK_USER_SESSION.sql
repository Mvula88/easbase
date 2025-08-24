-- Check if you're logged in as a specific user
-- Replace the ID below with your user ID from auth.users
SELECT 
  u.id,
  u.email,
  u.created_at as user_created,
  p.id as profile_id,
  p.full_name,
  p.onboarding_completed,
  p.created_at as profile_created
FROM auth.users u
LEFT JOIN user_profiles p ON u.id = p.id
WHERE u.email = 'YOUR_EMAIL_HERE'  -- Replace with your email
ORDER BY u.created_at DESC;

-- Check for any orphaned profiles (profiles without matching auth.users)
SELECT 
  p.id,
  p.full_name,
  p.onboarding_completed,
  'No matching auth.user' as issue
FROM user_profiles p
WHERE NOT EXISTS (
  SELECT 1 FROM auth.users u WHERE u.id = p.id
);

-- Check for any users without profiles
SELECT 
  u.id,
  u.email,
  'No profile created' as issue
FROM auth.users u
WHERE NOT EXISTS (
  SELECT 1 FROM user_profiles p WHERE p.id = u.id
);