-- =====================================================
-- FIX USER PROFILES - Simple and safe approach
-- =====================================================

-- Step 1: Drop the trigger first (if it exists)
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- Step 2: Drop the function (if it exists)
DROP FUNCTION IF EXISTS handle_new_user() CASCADE;

-- Step 3: Create user_profiles table if it doesn't exist
CREATE TABLE IF NOT EXISTS user_profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT UNIQUE NOT NULL,
  full_name TEXT,
  company_name TEXT,
  avatar_url TEXT,
  phone TEXT,
  phone_verified BOOLEAN DEFAULT false,
  email_verified BOOLEAN DEFAULT false,
  subscription_plan TEXT DEFAULT 'starter',
  subscription_status TEXT DEFAULT 'trialing',
  billing_period TEXT DEFAULT 'monthly',
  stripe_customer_id TEXT,
  stripe_subscription_id TEXT,
  trial_end TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '14 days'),
  current_period_end TIMESTAMPTZ,
  mau_used INTEGER DEFAULT 0,
  emails_sent INTEGER DEFAULT 0,
  sms_sent INTEGER DEFAULT 0,
  storage_used BIGINT DEFAULT 0,
  projects_count INTEGER DEFAULT 0,
  team_members_count INTEGER DEFAULT 0,
  backend_initialized BOOLEAN DEFAULT false,
  backend_status JSONB DEFAULT '{}',
  default_project_id UUID,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  verified_at TIMESTAMPTZ,
  last_sign_in_at TIMESTAMPTZ
);

-- Step 4: Create profiles for existing users
INSERT INTO user_profiles (id, email, full_name, company_name, created_at)
SELECT 
  id,
  COALESCE(email, 'user_' || id::text || '@example.com'),
  raw_user_meta_data->>'full_name',
  raw_user_meta_data->>'company_name',
  COALESCE(created_at, NOW())
FROM auth.users
WHERE NOT EXISTS (
  SELECT 1 FROM user_profiles WHERE user_profiles.id = auth.users.id
);

-- Step 5: Enable RLS
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;

-- Step 6: Drop existing policies
DROP POLICY IF EXISTS "Users can view own profile" ON user_profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON user_profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON user_profiles;

-- Step 7: Create RLS policies
CREATE POLICY "Users can view own profile" ON user_profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON user_profiles
  FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile" ON user_profiles
  FOR INSERT WITH CHECK (auth.uid() = id);

-- Step 8: Create the trigger function
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.user_profiles (
    id, 
    email, 
    full_name,
    company_name,
    created_at
  )
  VALUES (
    NEW.id, 
    NEW.email,
    NEW.raw_user_meta_data->>'full_name',
    NEW.raw_user_meta_data->>'company_name',
    NOW()
  )
  ON CONFLICT (id) DO UPDATE SET
    full_name = COALESCE(user_profiles.full_name, EXCLUDED.full_name),
    company_name = COALESCE(user_profiles.company_name, EXCLUDED.company_name);
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  -- Log error but don't fail user creation
  RAISE WARNING 'Error creating user profile: %', SQLERRM;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Step 9: Create the trigger
CREATE TRIGGER on_auth_user_created 
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- Step 10: Success message
DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '✅ User Profiles Fixed!';
  RAISE NOTICE '';
  RAISE NOTICE 'The user_profiles table is now ready.';
  RAISE NOTICE 'New users will automatically get a profile.';
  RAISE NOTICE 'Existing users have been given profiles.';
END $$;