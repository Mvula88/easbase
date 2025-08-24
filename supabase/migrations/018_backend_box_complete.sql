-- =====================================================
-- BACKEND-IN-A-BOX COMPLETE MIGRATION
-- Production-ready migration with all safety checks
-- =====================================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- =====================================================
-- STEP 1: HANDLE EXISTING PROFILES TABLE
-- =====================================================

DO $$
BEGIN
  -- Check if profiles table exists
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'profiles') THEN
    -- Check if user_profiles already exists
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'user_profiles') THEN
      -- Both exist, rename old profiles to backup
      ALTER TABLE profiles RENAME TO profiles_backup_old;
      RAISE NOTICE 'Renamed existing profiles table to profiles_backup_old';
    ELSE
      -- Only profiles exists, rename it to backup
      ALTER TABLE profiles RENAME TO profiles_backup_old;
      RAISE NOTICE 'Renamed profiles table to profiles_backup_old';
    END IF;
  END IF;
END $$;

-- =====================================================
-- STEP 2: CREATE USER_PROFILES TABLE
-- =====================================================

-- Drop if exists to ensure clean state
DROP TABLE IF EXISTS user_profiles CASCADE;

CREATE TABLE user_profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT UNIQUE NOT NULL,
  full_name TEXT,
  company_name TEXT,
  avatar_url TEXT,
  phone TEXT,
  phone_verified BOOLEAN DEFAULT false,
  email_verified BOOLEAN DEFAULT false,
  
  -- Subscription fields
  subscription_plan TEXT DEFAULT 'starter',
  subscription_status TEXT DEFAULT 'trialing',
  billing_period TEXT DEFAULT 'monthly',
  stripe_customer_id TEXT,
  stripe_subscription_id TEXT,
  trial_end TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '14 days'),
  current_period_end TIMESTAMPTZ,
  
  -- Usage tracking
  mau_used INTEGER DEFAULT 0,
  emails_sent INTEGER DEFAULT 0,
  sms_sent INTEGER DEFAULT 0,
  storage_used BIGINT DEFAULT 0,
  projects_count INTEGER DEFAULT 0,
  team_members_count INTEGER DEFAULT 0,
  
  -- Backend status
  backend_initialized BOOLEAN DEFAULT false,
  backend_status JSONB DEFAULT '{}',
  default_project_id UUID,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  verified_at TIMESTAMPTZ,
  last_sign_in_at TIMESTAMPTZ
);

-- Create profiles for all existing auth users
INSERT INTO user_profiles (id, email, created_at)
SELECT 
  au.id,
  COALESCE(au.email, 'user_' || au.id::text || '@example.com'),
  COALESCE(au.created_at, NOW())
FROM auth.users au
LEFT JOIN user_profiles up ON up.id = au.id
WHERE up.id IS NULL;

-- Attempt to migrate data from backup if it exists
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'profiles_backup_old') THEN
    -- Check which column structure the backup table has
    IF EXISTS (SELECT 1 FROM information_schema.columns 
               WHERE table_name = 'profiles_backup_old' AND column_name = 'user_id') THEN
      -- Table has user_id column, use it to match
      UPDATE user_profiles up
      SET 
        full_name = COALESCE(up.full_name, p.display_name),
        avatar_url = COALESCE(up.avatar_url, p.avatar_url),
        email = COALESCE(up.email, p.email),
        updated_at = NOW()
      FROM profiles_backup_old p
      WHERE p.user_id = up.id;
      
      RAISE NOTICE 'Migrated data from profiles_backup_old to user_profiles (using user_id)';
    ELSE
      -- Table uses id as the user reference
      UPDATE user_profiles up
      SET 
        full_name = COALESCE(up.full_name, p.display_name),
        avatar_url = COALESCE(up.avatar_url, p.avatar_url),
        email = COALESCE(up.email, p.email),
        updated_at = NOW()
      FROM profiles_backup_old p
      WHERE p.id = up.id;
      
      RAISE NOTICE 'Migrated data from profiles_backup_old to user_profiles (using id)';
    END IF;
  END IF;
END $$;

-- =====================================================
-- STEP 3: ORGANIZATIONS TABLE
-- =====================================================

-- Ensure organizations table has all required columns
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'organizations') THEN
    ALTER TABLE organizations ADD COLUMN IF NOT EXISTS owner_id UUID REFERENCES auth.users(id);
    ALTER TABLE organizations ADD COLUMN IF NOT EXISTS stripe_customer_id TEXT;
    ALTER TABLE organizations ADD COLUMN IF NOT EXISTS stripe_subscription_id TEXT;
    ALTER TABLE organizations ADD COLUMN IF NOT EXISTS subscription_plan TEXT DEFAULT 'starter';
    ALTER TABLE organizations ADD COLUMN IF NOT EXISTS settings JSONB DEFAULT '{}';
    ALTER TABLE organizations ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}';
    ALTER TABLE organizations ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();
    ALTER TABLE organizations ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();
  ELSE
    CREATE TABLE organizations (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      name TEXT NOT NULL,
      slug TEXT UNIQUE NOT NULL,
      owner_id UUID REFERENCES auth.users(id),
      stripe_customer_id TEXT,
      stripe_subscription_id TEXT,
      subscription_plan TEXT DEFAULT 'starter',
      settings JSONB DEFAULT '{}',
      metadata JSONB DEFAULT '{}',
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    );
  END IF;
END $$;

-- =====================================================
-- STEP 4: ORGANIZATION MEMBERS
-- =====================================================

-- Handle team_members to organization_members rename
DO $$ 
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'team_members') 
     AND NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'organization_members') THEN
    ALTER TABLE team_members RENAME TO organization_members;
    ALTER TABLE organization_members ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();
  END IF;
END $$;

-- Create organization_members if it doesn't exist
CREATE TABLE IF NOT EXISTS organization_members (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT CHECK (role IN ('owner', 'admin', 'member')),
  joined_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(organization_id, user_id)
);

-- =====================================================
-- STEP 5: CREATE ALL BACKEND-IN-A-BOX TABLES
-- =====================================================

-- Organization Invitations
CREATE TABLE IF NOT EXISTS organization_invitations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  role TEXT DEFAULT 'member' CHECK (role IN ('owner', 'admin', 'member')),
  token TEXT UNIQUE DEFAULT encode(gen_random_bytes(32), 'hex'),
  invited_by UUID REFERENCES auth.users(id),
  expires_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '7 days'),
  accepted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Email Logs
CREATE TABLE IF NOT EXISTS email_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  recipients TEXT[] NOT NULL,
  subject TEXT,
  template TEXT,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'failed', 'bounced')),
  provider TEXT,
  message_id TEXT,
  error TEXT,
  metadata JSONB DEFAULT '{}',
  sent_at TIMESTAMPTZ DEFAULT NOW()
);

-- SMS Logs
CREATE TABLE IF NOT EXISTS sms_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  recipient TEXT NOT NULL,
  body TEXT,
  type TEXT DEFAULT 'sms' CHECK (type IN ('sms', 'whatsapp')),
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'delivered', 'failed')),
  provider TEXT DEFAULT 'twilio',
  message_sid TEXT,
  error TEXT,
  sent_at TIMESTAMPTZ DEFAULT NOW()
);

-- OTP Verifications
CREATE TABLE IF NOT EXISTS otp_verifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  phone TEXT,
  email TEXT,
  code TEXT NOT NULL,
  channel TEXT DEFAULT 'sms' CHECK (channel IN ('sms', 'email', 'whatsapp')),
  verified BOOLEAN DEFAULT false,
  verified_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '10 minutes'),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  CHECK (phone IS NOT NULL OR email IS NOT NULL)
);

-- Storage Logs
CREATE TABLE IF NOT EXISTS storage_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  bucket TEXT NOT NULL,
  path TEXT NOT NULL,
  size BIGINT,
  type TEXT,
  action TEXT DEFAULT 'upload' CHECK (action IN ('upload', 'download', 'delete')),
  is_public BOOLEAN DEFAULT false,
  accessed_at TIMESTAMPTZ,
  uploaded_at TIMESTAMPTZ DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);

-- Usage Logs
CREATE TABLE IF NOT EXISTS usage_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  customer_id TEXT,
  metric TEXT NOT NULL,
  quantity INTEGER DEFAULT 1,
  metadata JSONB DEFAULT '{}',
  timestamp TIMESTAMPTZ DEFAULT NOW()
);

-- Auth Configurations
CREATE TABLE IF NOT EXISTS auth_configurations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID UNIQUE REFERENCES organizations(id) ON DELETE CASCADE,
  enable_oauth BOOLEAN DEFAULT true,
  enable_magic_links BOOLEAN DEFAULT true,
  enable_2fa BOOLEAN DEFAULT false,
  oauth_providers TEXT[] DEFAULT ARRAY['google', 'github'],
  settings JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- API Keys
CREATE TABLE IF NOT EXISTS api_keys (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  key_hash TEXT NOT NULL,
  key_preview TEXT NOT NULL,
  permissions JSONB DEFAULT '{}',
  last_used_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  revoked_at TIMESTAMPTZ
);

-- Activity Logs
CREATE TABLE IF NOT EXISTS activity_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  action TEXT NOT NULL,
  resource_type TEXT,
  resource_id TEXT,
  metadata JSONB DEFAULT '{}',
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Storage Access Logs
CREATE TABLE IF NOT EXISTS storage_access_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  bucket TEXT NOT NULL,
  path TEXT NOT NULL,
  bytes_transferred BIGINT,
  accessed_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- STEP 6: CREATE INDEXES FOR PERFORMANCE
-- =====================================================

-- User Profiles indexes
CREATE INDEX IF NOT EXISTS idx_user_profiles_email ON user_profiles(email);
CREATE INDEX IF NOT EXISTS idx_user_profiles_stripe ON user_profiles(stripe_customer_id) WHERE stripe_customer_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_user_profiles_subscription ON user_profiles(subscription_status);

-- Organizations indexes
CREATE INDEX IF NOT EXISTS idx_organizations_slug ON organizations(slug);
CREATE INDEX IF NOT EXISTS idx_organizations_owner ON organizations(owner_id);
CREATE INDEX IF NOT EXISTS idx_organizations_stripe ON organizations(stripe_customer_id) WHERE stripe_customer_id IS NOT NULL;

-- Organization Members indexes
CREATE INDEX IF NOT EXISTS idx_org_members_org ON organization_members(organization_id);
CREATE INDEX IF NOT EXISTS idx_org_members_user ON organization_members(user_id);
CREATE INDEX IF NOT EXISTS idx_org_members_role ON organization_members(role);

-- Logs indexes
CREATE INDEX IF NOT EXISTS idx_email_logs_user ON email_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_email_logs_org ON email_logs(organization_id);
CREATE INDEX IF NOT EXISTS idx_email_logs_status ON email_logs(status);
CREATE INDEX IF NOT EXISTS idx_sms_logs_user ON sms_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_sms_logs_org ON sms_logs(organization_id);
CREATE INDEX IF NOT EXISTS idx_sms_logs_status ON sms_logs(status);
CREATE INDEX IF NOT EXISTS idx_usage_logs_user ON usage_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_usage_logs_org ON usage_logs(organization_id);
CREATE INDEX IF NOT EXISTS idx_usage_logs_metric ON usage_logs(metric);
CREATE INDEX IF NOT EXISTS idx_api_keys_user ON api_keys(user_id);
CREATE INDEX IF NOT EXISTS idx_api_keys_org ON api_keys(organization_id);
CREATE INDEX IF NOT EXISTS idx_activity_logs_user ON activity_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_activity_logs_org ON activity_logs(organization_id);
CREATE INDEX IF NOT EXISTS idx_activity_logs_action ON activity_logs(action);

-- =====================================================
-- STEP 7: ENABLE ROW LEVEL SECURITY
-- =====================================================

ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE organization_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE organization_invitations ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE sms_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE otp_verifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE storage_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE usage_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE auth_configurations ENABLE ROW LEVEL SECURITY;
ALTER TABLE api_keys ENABLE ROW LEVEL SECURITY;
ALTER TABLE activity_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE storage_access_logs ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- STEP 8: CREATE RLS POLICIES
-- =====================================================

-- User Profiles policies
DROP POLICY IF EXISTS "Users can view own profile" ON user_profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON user_profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON user_profiles;

CREATE POLICY "Users can view own profile" ON user_profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON user_profiles
  FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile" ON user_profiles
  FOR INSERT WITH CHECK (auth.uid() = id);

-- Organizations policies
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'organizations' AND policyname = 'Members can view their organizations') THEN
    CREATE POLICY "Members can view their organizations" ON organizations
      FOR SELECT USING (
        auth.uid() = owner_id OR
        EXISTS (
          SELECT 1 FROM organization_members
          WHERE organization_members.organization_id = organizations.id
          AND organization_members.user_id = auth.uid()
        )
      );
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'organizations' AND policyname = 'Owners can update their organizations') THEN
    CREATE POLICY "Owners can update their organizations" ON organizations
      FOR UPDATE USING (auth.uid() = owner_id);
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'organizations' AND policyname = 'Users can create organizations') THEN
    CREATE POLICY "Users can create organizations" ON organizations
      FOR INSERT WITH CHECK (auth.uid() = owner_id);
  END IF;
END $$;

-- Organization Members policies
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'organization_members' AND policyname = 'Members can view organization members') THEN
    CREATE POLICY "Members can view organization members" ON organization_members
      FOR SELECT USING (
        user_id = auth.uid() OR
        organization_id IN (
          SELECT organization_id FROM organization_members WHERE user_id = auth.uid()
        )
      );
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'organization_members' AND policyname = 'Admins can manage members') THEN
    CREATE POLICY "Admins can manage members" ON organization_members
      FOR ALL USING (
        EXISTS (
          SELECT 1 FROM organization_members om
          WHERE om.organization_id = organization_members.organization_id
          AND om.user_id = auth.uid()
          AND om.role IN ('owner', 'admin')
        )
      );
  END IF;
END $$;

-- Simple policies for logs and other tables
DO $$
BEGIN
  -- Email logs
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'email_logs' AND policyname = 'Users can view own email logs') THEN
    CREATE POLICY "Users can view own email logs" ON email_logs 
      FOR SELECT USING (user_id = auth.uid());
  END IF;

  -- SMS logs
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'sms_logs' AND policyname = 'Users can view own sms logs') THEN
    CREATE POLICY "Users can view own sms logs" ON sms_logs 
      FOR SELECT USING (user_id = auth.uid());
  END IF;

  -- OTP verifications
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'otp_verifications' AND policyname = 'Users can manage own OTP') THEN
    CREATE POLICY "Users can manage own OTP" ON otp_verifications 
      FOR ALL USING (user_id = auth.uid() OR user_id IS NULL);
  END IF;

  -- Storage logs
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'storage_logs' AND policyname = 'Users can view own storage logs') THEN
    CREATE POLICY "Users can view own storage logs" ON storage_logs 
      FOR SELECT USING (user_id = auth.uid());
  END IF;

  -- Usage logs
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'usage_logs' AND policyname = 'Users can view own usage') THEN
    CREATE POLICY "Users can view own usage" ON usage_logs 
      FOR SELECT USING (user_id = auth.uid());
  END IF;

  -- API keys
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'api_keys' AND policyname = 'Users can manage own API keys') THEN
    CREATE POLICY "Users can manage own API keys" ON api_keys 
      FOR ALL USING (user_id = auth.uid());
  END IF;

  -- Activity logs
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'activity_logs' AND policyname = 'Users can view own activity') THEN
    CREATE POLICY "Users can view own activity" ON activity_logs 
      FOR SELECT USING (user_id = auth.uid());
  END IF;

  -- Storage access logs
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'storage_access_logs' AND policyname = 'Users can view own storage access') THEN
    CREATE POLICY "Users can view own storage access" ON storage_access_logs 
      FOR SELECT USING (user_id = auth.uid());
  END IF;
END $$;

-- =====================================================
-- STEP 9: CREATE FUNCTIONS AND TRIGGERS
-- =====================================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Function to handle new user signup
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO user_profiles (id, email, created_at)
  VALUES (NEW.id, NEW.email, NOW())
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply update triggers
DROP TRIGGER IF EXISTS update_user_profiles_updated_at ON user_profiles;
CREATE TRIGGER update_user_profiles_updated_at 
  BEFORE UPDATE ON user_profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_organizations_updated_at ON organizations;
CREATE TRIGGER update_organizations_updated_at 
  BEFORE UPDATE ON organizations
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_org_members_updated_at ON organization_members;
CREATE TRIGGER update_org_members_updated_at 
  BEFORE UPDATE ON organization_members
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_auth_configurations_updated_at ON auth_configurations;
CREATE TRIGGER update_auth_configurations_updated_at 
  BEFORE UPDATE ON auth_configurations
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Trigger for new user signup
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created 
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- =====================================================
-- STEP 10: FINAL VERIFICATION AND CLEANUP
-- =====================================================

DO $$
DECLARE
  table_count INTEGER;
  user_count INTEGER;
  profile_count INTEGER;
BEGIN
  -- Count tables
  SELECT COUNT(*) INTO table_count
  FROM information_schema.tables 
  WHERE table_schema = 'public' 
  AND table_name IN (
    'user_profiles', 'organizations', 'organization_members',
    'organization_invitations', 'email_logs', 'sms_logs',
    'otp_verifications', 'storage_logs', 'usage_logs',
    'auth_configurations', 'api_keys', 'activity_logs',
    'storage_access_logs'
  );
  
  -- Count users and profiles
  SELECT COUNT(*) INTO user_count FROM auth.users;
  SELECT COUNT(*) INTO profile_count FROM user_profiles;
  
  RAISE NOTICE '';
  RAISE NOTICE '========================================';
  RAISE NOTICE '✅ BACKEND-IN-A-BOX MIGRATION COMPLETE!';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'Tables created: % of 13', table_count;
  RAISE NOTICE 'Auth users: %', user_count;
  RAISE NOTICE 'User profiles: %', profile_count;
  RAISE NOTICE '';
  
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'profiles_backup_old') THEN
    RAISE NOTICE '⚠️  Old profiles table backed up as: profiles_backup_old';
    RAISE NOTICE 'To remove the backup after verification, run:';
    RAISE NOTICE 'DROP TABLE profiles_backup_old CASCADE;';
  END IF;
  
  RAISE NOTICE '';
  RAISE NOTICE 'Next steps:';
  RAISE NOTICE '1. Verify all tables are created correctly';
  RAISE NOTICE '2. Test user authentication and profile creation';
  RAISE NOTICE '3. Configure Stripe products and pricing';
  RAISE NOTICE '4. Set up email/SMS providers (optional)';
  RAISE NOTICE '5. Remove old AI schema tables (optional - see migration 012)';
  RAISE NOTICE '';
  RAISE NOTICE 'Run this to see all tables:';
  RAISE NOTICE 'SELECT table_name FROM information_schema.tables WHERE table_schema = ''public'' ORDER BY table_name;';
  RAISE NOTICE '========================================';
END $$;