-- =====================================================
-- BACKEND-IN-A-BOX SIMPLE MIGRATION
-- Direct and simple approach
-- =====================================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- =====================================================
-- STEP 1: CREATE USER_PROFILES TABLE
-- =====================================================

-- Drop and recreate user_profiles
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
  backend_status JSONB,
  default_project_id UUID,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  verified_at TIMESTAMPTZ,
  last_sign_in_at TIMESTAMPTZ
);

-- Migrate data from profiles if it exists (simplified)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'profiles') THEN
    -- Simple migration - only copy what we know exists
    INSERT INTO user_profiles (id, email, avatar_url, created_at)
    SELECT 
      COALESCE(
        CASE WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'user_id')
        THEN (SELECT user_id FROM profiles p2 WHERE p2.id = profiles.id)
        ELSE profiles.id 
        END,
        profiles.id
      ) as id,
      COALESCE(profiles.email, '') as email,
      profiles.avatar_url,
      profiles.created_at
    FROM profiles
    WHERE profiles.id IS NOT NULL
    ON CONFLICT (id) DO NOTHING;
    
    -- Drop the old profiles table
    DROP TABLE profiles CASCADE;
  END IF;
END $$;

-- If no profiles existed or migration failed, ensure auth users have profiles
INSERT INTO user_profiles (id, email)
SELECT 
  id,
  COALESCE(email, 'user_' || id::text || '@example.com')
FROM auth.users
WHERE id NOT IN (SELECT id FROM user_profiles)
ON CONFLICT (id) DO NOTHING;

-- =====================================================
-- STEP 2: ORGANIZATIONS AND MEMBERS
-- =====================================================

-- Handle team_members to organization_members
DO $$ 
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'team_members') 
     AND NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'organization_members') THEN
    ALTER TABLE team_members RENAME TO organization_members;
  END IF;
END $$;

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
-- STEP 3: CREATE ALL BACKEND TABLES
-- =====================================================

CREATE TABLE IF NOT EXISTS organization_invitations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  role TEXT DEFAULT 'member',
  token TEXT UNIQUE DEFAULT encode(gen_random_bytes(32), 'hex'),
  invited_by UUID REFERENCES auth.users(id),
  expires_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '7 days'),
  accepted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS email_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  recipients TEXT[] NOT NULL,
  subject TEXT,
  template TEXT,
  status TEXT DEFAULT 'pending',
  provider TEXT,
  message_id TEXT,
  error TEXT,
  metadata JSONB,
  sent_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS sms_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  recipient TEXT NOT NULL,
  body TEXT,
  type TEXT DEFAULT 'sms',
  status TEXT DEFAULT 'pending',
  provider TEXT DEFAULT 'twilio',
  message_sid TEXT,
  error TEXT,
  sent_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS otp_verifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  phone TEXT,
  email TEXT,
  code TEXT NOT NULL,
  channel TEXT DEFAULT 'sms',
  verified BOOLEAN DEFAULT false,
  verified_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '10 minutes'),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  CHECK (phone IS NOT NULL OR email IS NOT NULL)
);

CREATE TABLE IF NOT EXISTS storage_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  bucket TEXT NOT NULL,
  path TEXT NOT NULL,
  size BIGINT,
  type TEXT,
  action TEXT DEFAULT 'upload',
  is_public BOOLEAN DEFAULT false,
  accessed_at TIMESTAMPTZ,
  uploaded_at TIMESTAMPTZ DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS usage_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id),
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  customer_id TEXT,
  metric TEXT NOT NULL,
  quantity INTEGER DEFAULT 1,
  metadata JSONB,
  timestamp TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS auth_configurations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  enable_oauth BOOLEAN DEFAULT true,
  enable_magic_links BOOLEAN DEFAULT true,
  enable_2fa BOOLEAN DEFAULT false,
  oauth_providers TEXT[] DEFAULT ARRAY['google', 'github'],
  settings JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

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

CREATE TABLE IF NOT EXISTS activity_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  action TEXT NOT NULL,
  resource_type TEXT,
  resource_id TEXT,
  metadata JSONB,
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS storage_access_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id),
  bucket TEXT NOT NULL,
  path TEXT NOT NULL,
  bytes_transferred BIGINT,
  accessed_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- STEP 4: INDEXES
-- =====================================================

CREATE INDEX IF NOT EXISTS idx_user_profiles_email ON user_profiles(email);
CREATE INDEX IF NOT EXISTS idx_user_profiles_stripe ON user_profiles(stripe_customer_id);
CREATE INDEX IF NOT EXISTS idx_org_members_org ON organization_members(organization_id);
CREATE INDEX IF NOT EXISTS idx_org_members_user ON organization_members(user_id);
CREATE INDEX IF NOT EXISTS idx_email_logs_user ON email_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_sms_logs_user ON sms_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_usage_logs_user ON usage_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_api_keys_user ON api_keys(user_id);
CREATE INDEX IF NOT EXISTS idx_activity_logs_user ON activity_logs(user_id);

-- =====================================================
-- STEP 5: ENABLE RLS
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
-- STEP 6: RLS POLICIES
-- =====================================================

-- User Profiles
DROP POLICY IF EXISTS "Users can view own profile" ON user_profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON user_profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON user_profiles;

CREATE POLICY "Users can view own profile" ON user_profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON user_profiles
  FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile" ON user_profiles
  FOR INSERT WITH CHECK (auth.uid() = id);

-- Organizations (check if exists first)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'organizations' AND policyname = 'Members can view their organizations') THEN
    CREATE POLICY "Members can view their organizations" ON organizations
      FOR SELECT USING (
        EXISTS (
          SELECT 1 FROM organization_members
          WHERE organization_members.organization_id = organizations.id
          AND organization_members.user_id = auth.uid()
        )
      );
  END IF;
END $$;

-- Simple policies for logs
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'email_logs' AND policyname = 'Users can view own email logs') THEN
    CREATE POLICY "Users can view own email logs" ON email_logs FOR SELECT USING (user_id = auth.uid());
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'sms_logs' AND policyname = 'Users can view own sms logs') THEN
    CREATE POLICY "Users can view own sms logs" ON sms_logs FOR SELECT USING (user_id = auth.uid());
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'storage_logs' AND policyname = 'Users can view own storage logs') THEN
    CREATE POLICY "Users can view own storage logs" ON storage_logs FOR SELECT USING (user_id = auth.uid());
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'activity_logs' AND policyname = 'Users can view own activity') THEN
    CREATE POLICY "Users can view own activity" ON activity_logs FOR SELECT USING (user_id = auth.uid());
  END IF;
END $$;

-- =====================================================
-- STEP 7: TRIGGERS
-- =====================================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_user_profiles_updated_at ON user_profiles;
CREATE TRIGGER update_user_profiles_updated_at BEFORE UPDATE ON user_profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- DONE!
-- =====================================================

DO $$
BEGIN
  RAISE NOTICE '✅ Backend-in-a-Box migration complete!';
END $$;