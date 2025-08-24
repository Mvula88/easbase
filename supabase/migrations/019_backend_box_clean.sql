-- =====================================================
-- BACKEND-IN-A-BOX CLEAN MIGRATION
-- Simplified approach that avoids column reference issues
-- =====================================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- =====================================================
-- STEP 1: BACKUP OLD PROFILES
-- =====================================================

DO $$
BEGIN
  -- First drop any existing backup
  DROP TABLE IF EXISTS profiles_backup_old CASCADE;
  
  -- Check if profiles table exists
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'profiles' AND table_schema = 'public') THEN
    -- Create backup by renaming
    ALTER TABLE public.profiles RENAME TO profiles_backup_old;
    RAISE NOTICE 'Backed up profiles table to profiles_backup_old';
  END IF;
END $$;

-- =====================================================
-- STEP 2: CREATE USER_PROFILES
-- =====================================================

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
  backend_status JSONB DEFAULT '{}',
  default_project_id UUID,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  verified_at TIMESTAMPTZ,
  last_sign_in_at TIMESTAMPTZ
);

-- Create profiles for all auth users
INSERT INTO user_profiles (id, email, full_name, company_name, created_at)
SELECT 
  id,
  COALESCE(email, 'user_' || id::text || '@example.com'),
  raw_user_meta_data->>'full_name',
  raw_user_meta_data->>'company_name',
  COALESCE(created_at, NOW())
FROM auth.users
ON CONFLICT (id) DO NOTHING;

-- Skip data migration from old profiles - just note it exists
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'profiles_backup_old') THEN
    RAISE NOTICE 'Old profiles table backed up as profiles_backup_old';
    RAISE NOTICE 'To manually migrate data, first check available columns with:';
    RAISE NOTICE 'SELECT column_name FROM information_schema.columns WHERE table_name = ''profiles_backup_old'';';
  END IF;
END $$;

-- =====================================================
-- STEP 3: ORGANIZATIONS
-- =====================================================

CREATE TABLE IF NOT EXISTS organizations (
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

-- =====================================================
-- STEP 4: ORGANIZATION MEMBERS
-- =====================================================

DROP TABLE IF EXISTS organization_members CASCADE;

CREATE TABLE organization_members (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT CHECK (role IN ('owner', 'admin', 'member')),
  joined_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(organization_id, user_id)
);

-- =====================================================
-- STEP 5: BACKEND TABLES
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
  metadata JSONB DEFAULT '{}',
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
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  customer_id TEXT,
  metric TEXT NOT NULL,
  quantity INTEGER DEFAULT 1,
  metadata JSONB DEFAULT '{}',
  timestamp TIMESTAMPTZ DEFAULT NOW()
);

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
  metadata JSONB DEFAULT '{}',
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS storage_access_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  bucket TEXT NOT NULL,
  path TEXT NOT NULL,
  bytes_transferred BIGINT,
  accessed_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- STEP 6: INDEXES
-- =====================================================

CREATE INDEX IF NOT EXISTS idx_user_profiles_email ON user_profiles(email);
CREATE INDEX IF NOT EXISTS idx_user_profiles_stripe ON user_profiles(stripe_customer_id);
CREATE INDEX IF NOT EXISTS idx_organizations_slug ON organizations(slug);
CREATE INDEX IF NOT EXISTS idx_org_members_org ON organization_members(organization_id);
CREATE INDEX IF NOT EXISTS idx_org_members_user ON organization_members(user_id);
CREATE INDEX IF NOT EXISTS idx_email_logs_user ON email_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_sms_logs_user ON sms_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_usage_logs_user ON usage_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_api_keys_user ON api_keys(user_id);
CREATE INDEX IF NOT EXISTS idx_activity_logs_user ON activity_logs(user_id);

-- =====================================================
-- STEP 7: ENABLE RLS
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
-- STEP 8: RLS POLICIES
-- =====================================================

-- User Profiles
CREATE POLICY "Users can view own profile" ON user_profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON user_profiles
  FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile" ON user_profiles
  FOR INSERT WITH CHECK (auth.uid() = id);

-- Organizations
CREATE POLICY "Members can view organizations" ON organizations
  FOR SELECT USING (
    auth.uid() = owner_id OR
    EXISTS (
      SELECT 1 FROM organization_members
      WHERE organization_members.organization_id = organizations.id
      AND organization_members.user_id = auth.uid()
    )
  );

CREATE POLICY "Owners can update organizations" ON organizations
  FOR UPDATE USING (auth.uid() = owner_id);

CREATE POLICY "Users can create organizations" ON organizations
  FOR INSERT WITH CHECK (auth.uid() = owner_id);

-- Organization Members
CREATE POLICY "Members can view members" ON organization_members
  FOR SELECT USING (
    user_id = auth.uid() OR
    organization_id IN (
      SELECT organization_id FROM organization_members WHERE user_id = auth.uid()
    )
  );

-- Simple policies for logs
CREATE POLICY "Users view own email logs" ON email_logs
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Users view own sms logs" ON sms_logs
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Users manage own OTP" ON otp_verifications
  FOR ALL USING (user_id = auth.uid() OR user_id IS NULL);

CREATE POLICY "Users view own storage logs" ON storage_logs
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Users view own usage" ON usage_logs
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Users manage own API keys" ON api_keys
  FOR ALL USING (user_id = auth.uid());

CREATE POLICY "Users view own activity" ON activity_logs
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Users view own storage access" ON storage_access_logs
  FOR SELECT USING (user_id = auth.uid());

-- =====================================================
-- STEP 9: TRIGGERS
-- =====================================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

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
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Update triggers
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

-- New user trigger
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created 
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- =====================================================
-- FINAL MESSAGE
-- =====================================================

DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '✅ Backend-in-a-Box Clean Migration Complete!';
  RAISE NOTICE '';
  RAISE NOTICE 'Tables created: user_profiles, organizations, organization_members, and all backend tables';
  RAISE NOTICE '';
  RAISE NOTICE '⚠️  Your old profiles table is backed up as: profiles_backup_old';
  RAISE NOTICE '';
  RAISE NOTICE 'To check what columns exist in the backup:';
  RAISE NOTICE 'SELECT column_name FROM information_schema.columns WHERE table_name = ''profiles_backup_old'';';
  RAISE NOTICE '';
  RAISE NOTICE 'After verification, remove backup with: DROP TABLE profiles_backup_old CASCADE;';
END $$;