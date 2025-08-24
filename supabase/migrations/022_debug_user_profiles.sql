-- =====================================================
-- DEBUG AND FIX USER PROFILES CREATION
-- =====================================================

-- First, let's check if the trigger exists and is working
DO $$
BEGIN
  RAISE NOTICE 'Checking trigger status...';
  
  IF EXISTS (
    SELECT 1 FROM pg_trigger 
    WHERE tgname = 'on_auth_user_created'
  ) THEN
    RAISE NOTICE 'Trigger on_auth_user_created EXISTS';
  ELSE
    RAISE NOTICE 'Trigger on_auth_user_created DOES NOT EXIST';
  END IF;
END $$;

-- Drop and recreate the trigger function with better logging
DROP FUNCTION IF EXISTS handle_new_user() CASCADE;

CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  profile_exists boolean;
BEGIN
  -- Log the attempt
  RAISE LOG 'handle_new_user triggered for user ID: %, email: %', NEW.id, NEW.email;
  
  -- Check if profile already exists
  SELECT EXISTS (
    SELECT 1 FROM public.user_profiles WHERE id = NEW.id
  ) INTO profile_exists;
  
  IF profile_exists THEN
    RAISE LOG 'Profile already exists for user %', NEW.id;
    RETURN NEW;
  END IF;
  
  -- Try to insert the profile
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
      COALESCE(NEW.email, 'user_' || NEW.id::text || '@example.com'),
      COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
      COALESCE(NEW.raw_user_meta_data->>'company_name', ''),
      NOW()
    );
    
    RAISE LOG 'Successfully created profile for user %', NEW.id;
  EXCEPTION WHEN OTHERS THEN
    RAISE LOG 'Error creating profile for user %: %', NEW.id, SQLERRM;
    -- Still return NEW to not block user creation
  END;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Recreate the trigger
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created 
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- Create profiles for any existing users that don't have one
INSERT INTO user_profiles (id, email, full_name, company_name, created_at)
SELECT 
  u.id,
  COALESCE(u.email, 'user_' || u.id::text || '@example.com'),
  COALESCE(u.raw_user_meta_data->>'full_name', ''),
  COALESCE(u.raw_user_meta_data->>'company_name', ''),
  COALESCE(u.created_at, NOW())
FROM auth.users u
LEFT JOIN user_profiles p ON u.id = p.id
WHERE p.id IS NULL;

-- Show how many profiles were created
DO $$
DECLARE
  profile_count integer;
  user_count integer;
BEGIN
  SELECT COUNT(*) INTO user_count FROM auth.users;
  SELECT COUNT(*) INTO profile_count FROM user_profiles;
  
  RAISE NOTICE '';
  RAISE NOTICE '✅ Debug Complete!';
  RAISE NOTICE 'Total users: %', user_count;
  RAISE NOTICE 'Total profiles: %', profile_count;
  
  IF user_count = profile_count THEN
    RAISE NOTICE 'All users have profiles!';
  ELSE
    RAISE NOTICE 'Missing profiles: %', user_count - profile_count;
  END IF;
END $$;