-- ============================================
-- COMPLETE EASBASE SETUP SQL
-- Run this file in Supabase SQL Editor to set up all tables
-- ============================================

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================
-- PART 1: USER PROFILES AND AUTHENTICATION
-- ============================================

-- User Profiles table
CREATE TABLE IF NOT EXISTS user_profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT,
  company_name TEXT,
  avatar_url TEXT,
  phone TEXT,
  subscription_plan TEXT DEFAULT 'free',
  subscription_status TEXT DEFAULT 'active',
  subscription_id TEXT,
  customer_id TEXT,
  billing_period TEXT DEFAULT 'monthly',
  current_period_end TIMESTAMPTZ,
  trial_end TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '14 days'),
  total_requests INTEGER DEFAULT 0,
  projects_count INTEGER DEFAULT 0,
  team_members_count INTEGER DEFAULT 0,
  sms_sent INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Function to handle new user creation
CREATE OR REPLACE FUNCTION handle_new_user() 
RETURNS TRIGGER 
SECURITY DEFINER
AS $$
BEGIN
  INSERT INTO user_profiles (
    id,
    full_name,
    created_at,
    updated_at
  ) VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    NOW(),
    NOW()
  );
  RETURN NEW;
EXCEPTION
  WHEN others THEN
    RAISE LOG 'Error in handle_new_user: %', SQLERRM;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for new user creation
CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION handle_new_user();

-- ============================================
-- PART 2: ORGANIZATIONS AND TEAMS
-- ============================================

-- Organizations table
CREATE TABLE IF NOT EXISTS organizations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  owner_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  subscription_plan TEXT DEFAULT 'free',
  subscription_status TEXT DEFAULT 'active',
  subscription_id TEXT,
  customer_id TEXT,
  settings JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Organization Members table
CREATE TABLE IF NOT EXISTS organization_members (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT DEFAULT 'member' CHECK (role IN ('owner', 'admin', 'member')),
  joined_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(organization_id, user_id)
);

-- ============================================
-- PART 3: BACKEND-AS-A-SERVICE CORE TABLES
-- ============================================

-- Function to generate API keys
CREATE OR REPLACE FUNCTION generate_api_key() RETURNS TEXT AS $$
BEGIN
  RETURN 'easbase_' || encode(gen_random_bytes(32), 'hex');
END;
$$ LANGUAGE plpgsql;

-- Customer Projects table
CREATE TABLE IF NOT EXISTS customer_projects (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  customer_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  project_name TEXT NOT NULL,
  business_type TEXT CHECK (business_type IN ('ecommerce', 'saas', 'marketplace', 'booking', 'custom')),
  supabase_project_id TEXT UNIQUE,
  supabase_url TEXT,
  supabase_anon_key TEXT,
  supabase_service_key_encrypted TEXT,
  api_key TEXT UNIQUE DEFAULT generate_api_key(),
  status TEXT DEFAULT 'provisioning' CHECK (status IN ('provisioning', 'active', 'suspended', 'deleted')),
  features JSONB DEFAULT '{}',
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(customer_id, project_name)
);

-- Project Schemas table
CREATE TABLE IF NOT EXISTS project_schemas (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID REFERENCES customer_projects(id) ON DELETE CASCADE,
  schema_definition JSONB NOT NULL,
  schema_version INTEGER DEFAULT 1,
  sql_migrations TEXT[],
  ai_generated BOOLEAN DEFAULT false,
  applied_at TIMESTAMPTZ,
  rolled_back_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Project Features configuration
CREATE TABLE IF NOT EXISTS project_features (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID REFERENCES customer_projects(id) ON DELETE CASCADE,
  feature_type TEXT NOT NULL CHECK (feature_type IN ('auth', 'email', 'storage', 'payments', 'sms', 'analytics', 'webhooks')),
  enabled BOOLEAN DEFAULT true,
  configuration JSONB DEFAULT '{}',
  usage_limit INTEGER,
  usage_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(project_id, feature_type)
);

-- API Usage tracking
CREATE TABLE IF NOT EXISTS api_usage (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID REFERENCES customer_projects(id) ON DELETE CASCADE,
  endpoint TEXT NOT NULL,
  method TEXT NOT NULL,
  status_code INTEGER,
  response_time_ms INTEGER,
  request_size_bytes INTEGER,
  response_size_bytes INTEGER,
  ip_address INET,
  user_agent TEXT,
  timestamp TIMESTAMPTZ DEFAULT NOW()
);

-- Project Templates
CREATE TABLE IF NOT EXISTS project_templates (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL UNIQUE,
  business_type TEXT NOT NULL,
  description TEXT,
  schema_template JSONB NOT NULL,
  features_template JSONB NOT NULL,
  is_public BOOLEAN DEFAULT true,
  created_by UUID REFERENCES auth.users(id),
  times_used INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Project Deployments tracking
CREATE TABLE IF NOT EXISTS project_deployments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID REFERENCES customer_projects(id) ON DELETE CASCADE,
  deployment_type TEXT CHECK (deployment_type IN ('schema', 'function', 'trigger', 'policy', 'feature')),
  deployment_data JSONB NOT NULL,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'deploying', 'success', 'failed', 'rolled_back')),
  error_message TEXT,
  deployed_by UUID REFERENCES auth.users(id),
  deployed_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- PART 4: BILLING AND SUBSCRIPTIONS
-- ============================================

-- Subscriptions table
CREATE TABLE IF NOT EXISTS subscriptions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  stripe_subscription_id TEXT UNIQUE,
  stripe_customer_id TEXT,
  status TEXT,
  price_id TEXT,
  quantity INTEGER DEFAULT 1,
  cancel_at_period_end BOOLEAN DEFAULT false,
  current_period_start TIMESTAMPTZ,
  current_period_end TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Usage Records table
CREATE TABLE IF NOT EXISTS usage_records (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  subscription_id UUID REFERENCES subscriptions(id) ON DELETE CASCADE,
  metric_name TEXT NOT NULL,
  quantity INTEGER NOT NULL,
  timestamp TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- PART 5: ACTIVITY AND LOGS
-- ============================================

-- Activity Logs table
CREATE TABLE IF NOT EXISTS activity_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  action TEXT NOT NULL,
  resource_type TEXT,
  resource_id TEXT,
  metadata JSONB DEFAULT '{}',
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Email Logs table
CREATE TABLE IF NOT EXISTS email_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id),
  to_email TEXT NOT NULL,
  from_email TEXT,
  subject TEXT,
  template_id TEXT,
  status TEXT DEFAULT 'pending',
  sent_at TIMESTAMPTZ,
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- PART 6: CONTACT AND SUPPORT
-- ============================================

-- Contact Submissions table
CREATE TABLE IF NOT EXISTS contact_submissions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  company TEXT,
  message TEXT NOT NULL,
  type TEXT DEFAULT 'general',
  status TEXT DEFAULT 'new',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- PART 7: CREATE INDEXES
-- ============================================

-- Indexes for user_profiles
CREATE INDEX idx_user_profiles_subscription_plan ON user_profiles(subscription_plan);
CREATE INDEX idx_user_profiles_customer_id ON user_profiles(customer_id);

-- Indexes for organizations
CREATE INDEX idx_organizations_owner_id ON organizations(owner_id);

-- Indexes for customer_projects
CREATE INDEX idx_customer_projects_customer_id ON customer_projects(customer_id);
CREATE INDEX idx_customer_projects_status ON customer_projects(status);

-- Indexes for project_schemas
CREATE INDEX idx_project_schemas_project_id ON project_schemas(project_id);

-- Indexes for project_features
CREATE INDEX idx_project_features_project_id ON project_features(project_id);

-- Indexes for api_usage
CREATE INDEX idx_api_usage_project_id ON api_usage(project_id);
CREATE INDEX idx_api_usage_timestamp ON api_usage(timestamp);

-- Indexes for project_deployments
CREATE INDEX idx_project_deployments_project_id ON project_deployments(project_id);

-- Indexes for subscriptions
CREATE INDEX idx_subscriptions_user_id ON subscriptions(user_id);
CREATE INDEX idx_subscriptions_stripe_customer_id ON subscriptions(stripe_customer_id);

-- Indexes for activity_logs
CREATE INDEX idx_activity_logs_user_id ON activity_logs(user_id);
CREATE INDEX idx_activity_logs_created_at ON activity_logs(created_at);

-- ============================================
-- PART 8: ROW LEVEL SECURITY (RLS)
-- ============================================

-- Enable RLS on all tables
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE organization_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE customer_projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_schemas ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_features ENABLE ROW LEVEL SECURITY;
ALTER TABLE api_usage ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_deployments ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE usage_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE activity_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE contact_submissions ENABLE ROW LEVEL SECURITY;

-- RLS Policies for user_profiles
CREATE POLICY "Users can view own profile" ON user_profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON user_profiles
  FOR UPDATE USING (auth.uid() = id);

-- RLS Policies for organizations
CREATE POLICY "Users can view organizations they belong to" ON organizations
  FOR SELECT USING (
    auth.uid() = owner_id OR 
    EXISTS (
      SELECT 1 FROM organization_members 
      WHERE organization_members.organization_id = organizations.id 
      AND organization_members.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create organizations" ON organizations
  FOR INSERT WITH CHECK (auth.uid() = owner_id);

CREATE POLICY "Owners can update organizations" ON organizations
  FOR UPDATE USING (auth.uid() = owner_id);

-- RLS Policies for customer_projects
CREATE POLICY "Users can view own projects" ON customer_projects
  FOR SELECT USING (auth.uid() = customer_id);

CREATE POLICY "Users can create own projects" ON customer_projects
  FOR INSERT WITH CHECK (auth.uid() = customer_id);

CREATE POLICY "Users can update own projects" ON customer_projects
  FOR UPDATE USING (auth.uid() = customer_id);

CREATE POLICY "Users can delete own projects" ON customer_projects
  FOR DELETE USING (auth.uid() = customer_id);

-- RLS Policies for project_schemas
CREATE POLICY "Users can manage own project schemas" ON project_schemas
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM customer_projects 
      WHERE customer_projects.id = project_schemas.project_id 
      AND customer_projects.customer_id = auth.uid()
    )
  );

-- RLS Policies for project_features
CREATE POLICY "Users can manage own project features" ON project_features
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM customer_projects 
      WHERE customer_projects.id = project_features.project_id 
      AND customer_projects.customer_id = auth.uid()
    )
  );

-- RLS Policies for api_usage (read-only)
CREATE POLICY "Users can view own API usage" ON api_usage
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM customer_projects 
      WHERE customer_projects.id = api_usage.project_id 
      AND customer_projects.customer_id = auth.uid()
    )
  );

-- RLS Policies for subscriptions
CREATE POLICY "Users can view own subscriptions" ON subscriptions
  FOR SELECT USING (auth.uid() = user_id);

-- RLS Policies for activity_logs
CREATE POLICY "Users can view own activity" ON activity_logs
  FOR SELECT USING (auth.uid() = user_id);

-- ============================================
-- PART 9: HELPER FUNCTIONS
-- ============================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply updated_at triggers
CREATE TRIGGER update_user_profiles_updated_at
  BEFORE UPDATE ON user_profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_organizations_updated_at
  BEFORE UPDATE ON organizations
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_customer_projects_updated_at
  BEFORE UPDATE ON customer_projects
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_project_features_updated_at
  BEFORE UPDATE ON project_features
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_subscriptions_updated_at
  BEFORE UPDATE ON subscriptions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- PART 10: DEFAULT PROJECT TEMPLATES
-- ============================================

INSERT INTO project_templates (name, business_type, description, schema_template, features_template) VALUES
(
  'E-commerce Starter',
  'ecommerce',
  'Complete e-commerce backend with products, orders, and customers',
  '{
    "tables": [
      {
        "name": "products",
        "columns": [
          {"name": "id", "type": "uuid", "primary": true},
          {"name": "name", "type": "text", "required": true},
          {"name": "description", "type": "text"},
          {"name": "price", "type": "decimal"},
          {"name": "inventory", "type": "integer"},
          {"name": "category", "type": "text"},
          {"name": "images", "type": "jsonb"}
        ]
      },
      {
        "name": "orders",
        "columns": [
          {"name": "id", "type": "uuid", "primary": true},
          {"name": "customer_id", "type": "uuid", "references": "customers.id"},
          {"name": "status", "type": "text"},
          {"name": "total", "type": "decimal"},
          {"name": "items", "type": "jsonb"}
        ]
      },
      {
        "name": "customers",
        "columns": [
          {"name": "id", "type": "uuid", "primary": true},
          {"name": "email", "type": "text", "required": true},
          {"name": "name", "type": "text"},
          {"name": "shipping_address", "type": "jsonb"},
          {"name": "billing_address", "type": "jsonb"}
        ]
      }
    ]
  }'::JSONB,
  '{
    "auth": true,
    "storage": true,
    "email": true,
    "payments": true
  }'::JSONB
),
(
  'SaaS Application',
  'saas',
  'Multi-tenant SaaS backend with teams and subscriptions',
  '{
    "tables": [
      {
        "name": "teams",
        "columns": [
          {"name": "id", "type": "uuid", "primary": true},
          {"name": "name", "type": "text", "required": true},
          {"name": "owner_id", "type": "uuid", "references": "auth.users.id"},
          {"name": "subscription_tier", "type": "text"},
          {"name": "settings", "type": "jsonb"}
        ]
      },
      {
        "name": "team_members",
        "columns": [
          {"name": "id", "type": "uuid", "primary": true},
          {"name": "team_id", "type": "uuid", "references": "teams.id"},
          {"name": "user_id", "type": "uuid", "references": "auth.users.id"},
          {"name": "role", "type": "text"}
        ]
      }
    ]
  }'::JSONB,
  '{
    "auth": true,
    "email": true,
    "payments": true,
    "analytics": true
  }'::JSONB
),
(
  'Marketplace',
  'marketplace',
  'Two-sided marketplace with vendors and customers',
  '{
    "tables": [
      {
        "name": "vendors",
        "columns": [
          {"name": "id", "type": "uuid", "primary": true},
          {"name": "name", "type": "text", "required": true},
          {"name": "description", "type": "text"},
          {"name": "owner_id", "type": "uuid", "references": "auth.users.id"},
          {"name": "rating", "type": "decimal"},
          {"name": "commission_rate", "type": "decimal"}
        ]
      },
      {
        "name": "listings",
        "columns": [
          {"name": "id", "type": "uuid", "primary": true},
          {"name": "vendor_id", "type": "uuid", "references": "vendors.id"},
          {"name": "title", "type": "text", "required": true},
          {"name": "description", "type": "text"},
          {"name": "price", "type": "decimal"},
          {"name": "category", "type": "text"},
          {"name": "status", "type": "text"}
        ]
      }
    ]
  }'::JSONB,
  '{
    "auth": true,
    "storage": true,
    "email": true,
    "payments": true
  }'::JSONB
)
ON CONFLICT (name) DO NOTHING;

-- ============================================
-- PART 11: GRANT PERMISSIONS
-- ============================================

-- Grant necessary permissions to authenticated users
GRANT ALL ON user_profiles TO authenticated;
GRANT ALL ON organizations TO authenticated;
GRANT ALL ON organization_members TO authenticated;
GRANT ALL ON customer_projects TO authenticated;
GRANT ALL ON project_schemas TO authenticated;
GRANT ALL ON project_features TO authenticated;
GRANT SELECT ON api_usage TO authenticated;
GRANT ALL ON project_deployments TO authenticated;
GRANT SELECT ON project_templates TO authenticated;
GRANT ALL ON subscriptions TO authenticated;
GRANT ALL ON usage_records TO authenticated;
GRANT ALL ON activity_logs TO authenticated;
GRANT ALL ON email_logs TO authenticated;
GRANT ALL ON contact_submissions TO authenticated;

-- ============================================
-- VERIFICATION: Check if everything was created
-- ============================================

DO $$
DECLARE
  table_count INTEGER;
  missing_tables TEXT[];
  required_tables TEXT[] := ARRAY[
    'user_profiles',
    'organizations',
    'organization_members',
    'customer_projects',
    'project_schemas',
    'project_features',
    'api_usage',
    'project_templates',
    'project_deployments',
    'subscriptions',
    'usage_records',
    'activity_logs',
    'email_logs',
    'contact_submissions'
  ];
  tbl_name TEXT;
BEGIN
  -- Check each required table
  FOREACH tbl_name IN ARRAY required_tables
  LOOP
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.tables t
      WHERE t.table_schema = 'public' AND t.table_name = tbl_name
    ) THEN
      missing_tables := array_append(missing_tables, tbl_name);
    END IF;
  END LOOP;
  
  -- Report results
  IF missing_tables IS NOT NULL THEN
    RAISE WARNING 'Missing tables: %', array_to_string(missing_tables, ', ');
  ELSE
    RAISE NOTICE 'All tables created successfully!';
  END IF;
  
  -- Count total tables
  SELECT COUNT(*) INTO table_count
  FROM information_schema.tables 
  WHERE table_schema = 'public' 
  AND table_name = ANY(required_tables);
  
  RAISE NOTICE 'Total tables created: %', table_count;
END $$;

-- ============================================
-- SUCCESS MESSAGE
-- ============================================
-- All tables and RLS policies have been created!
-- Your EasBase Backend-as-a-Service platform is ready.
-- Users can now create backends in 60 seconds!