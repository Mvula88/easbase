-- Create missing profile for user
INSERT INTO user_profiles (
  id,
  full_name,
  company_name,
  onboarding_completed,
  subscription_plan,
  subscription_status,
  billing_period,
  trial_end,
  created_at,
  updated_at
) VALUES (
  'ccd7559e-91bd-4176-8a81-e7390bf3ec9a',  -- Your user ID
  'User Name',  -- Update with your name
  'Company Name',  -- Update with your company
  false,  -- Set to false so you go through onboarding
  'free',
  'active',
  'monthly',
  NOW() + INTERVAL '14 days',
  NOW(),
  NOW()
)
ON CONFLICT (id) DO UPDATE SET
  updated_at = NOW();

-- Verify the profile was created
SELECT 
  u.id,
  u.email,
  p.full_name,
  p.onboarding_completed,
  p.created_at
FROM auth.users u
LEFT JOIN user_profiles p ON u.id = p.id
WHERE u.id = 'ccd7559e-91bd-4176-8a81-e7390bf3ec9a';