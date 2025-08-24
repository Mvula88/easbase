-- =====================================================
-- BACKEND-IN-A-BOX SAFE MIGRATION
-- This handles existing tables and migrations safely
-- =====================================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- =====================================================
-- HANDLE USER PROFILES TABLE
-- =====================================================

-- First check if profiles table exists (old name)
DO $$ 
BEGIN
  -- If old 'profiles' table exists, check its structure
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'profiles') THEN
    -- Check if user_profiles already exists
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'user_profiles') THEN
      -- Rename profiles to user_profiles
      ALTER TABLE profiles RENAME TO user_profiles;
      
      -- Check if the table has user_id column and rename it to id if needed
      IF EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'user_profiles' AND column_name = 'user_id') THEN
        -- Check if id column doesn't exist
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                       WHERE table_name = 'user_profiles' AND column_name = 'id') THEN
          ALTER TABLE user_profiles RENAME COLUMN user_id TO id;
        END IF;
      END IF;
      
      -- Rename display_name to full_name if it exists
      IF EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'user_profiles' AND column_name = 'display_name') THEN
        ALTER TABLE user_profiles RENAME COLUMN display_name TO full_name;
      END IF;
    ELSE
      -- Both tables exist, just drop the old profiles table
      -- Don't try to merge as it might have conflicting data
      DROP TABLE IF EXISTS profiles CASCADE;
    END IF;
  END IF;
END $$;

-- Now ensure user_profiles has all needed columns
DO $$
BEGIN
  -- Check if user_profiles exists
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'user_profiles') THEN
    -- Add missing columns if they don't exist
    ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS email TEXT;
    ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS full_name TEXT;
    ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS company_name TEXT;
    ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS avatar_url TEXT;
    ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS phone TEXT;
    ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS phone_verified BOOLEAN DEFAULT false;
    ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS email_verified BOOLEAN DEFAULT false;
    
    -- Subscription fields
    ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS subscription_plan TEXT DEFAULT 'starter';
    ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS subscription_status TEXT DEFAULT 'trialing';
    ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS billing_period TEXT DEFAULT 'monthly';
    ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS stripe_customer_id TEXT;
    ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS stripe_subscription_id TEXT;
    ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS trial_end TIMESTAMPTZ;
    ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS current_period_end TIMESTAMPTZ;
    
    -- Usage tracking
    ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS mau_used INTEGER DEFAULT 0;
    ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS emails_sent INTEGER DEFAULT 0;
    ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS sms_sent INTEGER DEFAULT 0;
    ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS storage_used BIGINT DEFAULT 0;
    ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS projects_count INTEGER DEFAULT 0;
    ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS team_members_count INTEGER DEFAULT 0;
    
    -- Backend status
    ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS backend_initialized BOOLEAN DEFAULT false;
    ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS backend_status JSONB;
    ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS default_project_id UUID;
    
    -- Timestamps
    ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();
    ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();
    ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS verified_at TIMESTAMPTZ;
    ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS last_sign_in_at TIMESTAMPTZ;
    
    -- Add unique constraint on email if not exists
    DO $unique_constraint$
    BEGIN
      IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'user_profiles_email_unique'
      ) THEN
        ALTER TABLE user_profiles ADD CONSTRAINT user_profiles_email_unique UNIQUE (email);
      END IF;
    END $unique_constraint$;
    
  ELSE
    -- Create the table fresh
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
      trial_end TIMESTAMPTZ,
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
  END IF;
END $$;

-- =====================================================
-- HANDLE TEAM_MEMBERS TO ORGANIZATION_MEMBERS
-- =====================================================

DO $$ 
BEGIN
  -- If team_members exists but organization_members doesn't, rename it
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'team_members') 
     AND NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'organization_members') THEN
    ALTER TABLE team_members RENAME TO organization_members;
    -- Add any missing columns
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
-- CREATE NEW TABLES FOR BACKEND-IN-A-BOX
-- =====================================================

-- Organization Invitations
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

-- Email Logs (using 'recipients' instead of 'to')
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

-- SMS Logs (using 'recipient' instead of 'to')
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

-- OTP Verifications
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

-- Storage Logs
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

-- Usage Logs
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

-- Auth Configurations
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
  metadata JSONB,
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Storage Access Logs
CREATE TABLE IF NOT EXISTS storage_access_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id),
  bucket TEXT NOT NULL,
  path TEXT NOT NULL,
  bytes_transferred BIGINT,
  accessed_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- CREATE INDEXES
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
-- ENABLE ROW LEVEL SECURITY
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

-- =====================================================
-- CREATE RLS POLICIES (DROP EXISTING FIRST)
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
DROP POLICY IF EXISTS "Members can view their organizations" ON organizations;
DROP POLICY IF EXISTS "Owners can update their organizations" ON organizations;
DROP POLICY IF EXISTS "Users can create organizations" ON organizations;

CREATE POLICY "Members can view their organizations" ON organizations
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM organization_members
      WHERE organization_members.organization_id = organizations.id
      AND organization_members.user_id = auth.uid()
    )
  );

CREATE POLICY "Owners can update their organizations" ON organizations
  FOR UPDATE USING (owner_id = auth.uid());

CREATE POLICY "Users can create organizations" ON organizations
  FOR INSERT WITH CHECK (owner_id = auth.uid());

-- Organization Members policies
DROP POLICY IF EXISTS "Members can view organization members" ON organization_members;
DROP POLICY IF EXISTS "Admins can manage members" ON organization_members;

CREATE POLICY "Members can view organization members" ON organization_members
  FOR SELECT USING (
    organization_id IN (
      SELECT organization_id FROM organization_members WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Admins can manage members" ON organization_members
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM organization_members om
      WHERE om.organization_id = organization_members.organization_id
      AND om.user_id = auth.uid()
      AND om.role IN ('owner', 'admin')
    )
  );

-- Simple policies for other tables
CREATE POLICY "Users can view own email logs" ON email_logs
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Users can view own sms logs" ON sms_logs
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Users can manage own OTP" ON otp_verifications
  FOR ALL USING (user_id = auth.uid() OR user_id IS NULL);

CREATE POLICY "Users can view own storage logs" ON storage_logs
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Users can view own usage" ON usage_logs
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Users can manage own API keys" ON api_keys
  FOR ALL USING (user_id = auth.uid());

CREATE POLICY "Users can view own activity" ON activity_logs
  FOR SELECT USING (user_id = auth.uid());

-- =====================================================
-- HELPER FUNCTIONS
-- =====================================================

-- Update timestamp function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply triggers
DROP TRIGGER IF EXISTS update_user_profiles_updated_at ON user_profiles;
CREATE TRIGGER update_user_profiles_updated_at BEFORE UPDATE ON user_profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_organizations_updated_at ON organizations;
CREATE TRIGGER update_organizations_updated_at BEFORE UPDATE ON organizations
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_org_members_updated_at ON organization_members;
CREATE TRIGGER update_org_members_updated_at BEFORE UPDATE ON organization_members
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- VERIFICATION
-- =====================================================

-- Run this to verify tables are created:
/*
SELECT table_name, 
       CASE 
         WHEN table_name IN (
           'user_profiles', 'organizations', 'organization_members',
           'organization_invitations', 'email_logs', 'sms_logs',
           'otp_verifications', 'storage_logs', 'usage_logs',
           'auth_configurations', 'api_keys', 'activity_logs',
           'storage_access_logs'
         ) THEN '✅ Backend-in-a-Box Table'
         ELSE '❓ Other Table'
       END as status
FROM information_schema.tables
WHERE table_schema = 'public'
ORDER BY status, table_name;
*/