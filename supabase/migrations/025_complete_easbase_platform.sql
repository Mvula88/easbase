-- ============================================
-- COMPLETE EASBASE PLATFORM SETUP
-- This migration consolidates all required tables for the full BaaS platform
-- ============================================

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "vector";

-- ============================================
-- CORE USER MANAGEMENT
-- ============================================

-- User Profiles (extends Supabase auth.users)
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
  onboarding_completed BOOLEAN DEFAULT false,
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
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION handle_new_user();

-- ============================================
-- CUSTOMER PROJECTS (CORE BaaS FUNCTIONALITY)
-- ============================================

-- Customer Projects table
CREATE TABLE IF NOT EXISTS customer_projects (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  customer_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  project_name TEXT NOT NULL,
  business_type TEXT,
  description TEXT,
  supabase_project_id TEXT UNIQUE,
  supabase_url TEXT,
  supabase_anon_key TEXT,
  supabase_service_key_encrypted TEXT,
  api_key TEXT UNIQUE DEFAULT encode(gen_random_bytes(32), 'hex'),
  database_url TEXT,
  status TEXT DEFAULT 'provisioning' CHECK (status IN ('provisioning', 'ready', 'failed', 'suspended')),
  features JSONB DEFAULT '{"auth": true, "database": true, "storage": false, "email": false, "payments": false}'::jsonb,
  region TEXT DEFAULT 'us-east-1',
  plan TEXT DEFAULT 'free' CHECK (plan IN ('free', 'pro', 'enterprise')),
  usage_stats JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Project Schemas table
CREATE TABLE IF NOT EXISTS project_schemas (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID REFERENCES customer_projects(id) ON DELETE CASCADE,
  schema_definition JSONB NOT NULL,
  sql_migrations TEXT[],
  version INTEGER DEFAULT 1,
  applied_at TIMESTAMPTZ,
  rolled_back_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Project Features configuration
CREATE TABLE IF NOT EXISTS project_features (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID REFERENCES customer_projects(id) ON DELETE CASCADE,
  feature_type TEXT NOT NULL CHECK (feature_type IN ('auth', 'email', 'storage', 'payments', 'realtime', 'functions')),
  configuration JSONB DEFAULT '{}'::jsonb,
  enabled BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(project_id, feature_type)
);

-- Project API Keys
CREATE TABLE IF NOT EXISTS project_api_keys (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID REFERENCES customer_projects(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  key_hash TEXT NOT NULL,
  key_prefix TEXT NOT NULL,
  permissions JSONB DEFAULT '["read", "write"]'::jsonb,
  last_used_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  revoked_at TIMESTAMPTZ
);

-- ============================================
-- AI SCHEMA GENERATION & CACHING
-- ============================================

-- Generated Schemas cache
CREATE TABLE IF NOT EXISTS generated_schemas (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  business_type TEXT NOT NULL,
  description TEXT,
  features TEXT[],
  schema_definition JSONB NOT NULL,
  sql_text TEXT,
  embedding vector(1536),
  usage_count INTEGER DEFAULT 1,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Schema Templates
CREATE TABLE IF NOT EXISTS schema_templates (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL UNIQUE,
  category TEXT NOT NULL,
  description TEXT,
  schema_definition JSONB NOT NULL,
  default_features JSONB DEFAULT '{}'::jsonb,
  popularity_score INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- PROJECT USAGE TRACKING
-- ============================================

-- API Usage tracking
CREATE TABLE IF NOT EXISTS api_usage (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID REFERENCES customer_projects(id) ON DELETE CASCADE,
  endpoint TEXT NOT NULL,
  method TEXT NOT NULL,
  status_code INTEGER,
  response_time_ms INTEGER,
  ip_address INET,
  user_agent TEXT,
  timestamp TIMESTAMPTZ DEFAULT NOW()
);

-- Storage Usage
CREATE TABLE IF NOT EXISTS storage_usage (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID REFERENCES customer_projects(id) ON DELETE CASCADE,
  bucket_name TEXT NOT NULL,
  file_count INTEGER DEFAULT 0,
  total_size_bytes BIGINT DEFAULT 0,
  bandwidth_used_bytes BIGINT DEFAULT 0,
  measured_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- SDK GENERATION
-- ============================================

-- Generated SDKs
CREATE TABLE IF NOT EXISTS generated_sdks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID REFERENCES customer_projects(id) ON DELETE CASCADE,
  language TEXT NOT NULL CHECK (language IN ('typescript', 'javascript', 'python', 'go', 'java')),
  version TEXT NOT NULL,
  sdk_code TEXT NOT NULL,
  npm_package TEXT,
  download_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- BILLING & SUBSCRIPTIONS
-- ============================================

-- Subscription Usage
CREATE TABLE IF NOT EXISTS subscription_usage (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  project_id UUID REFERENCES customer_projects(id) ON DELETE CASCADE,
  metric_name TEXT NOT NULL,
  usage_value BIGINT NOT NULL,
  unit TEXT NOT NULL,
  period_start TIMESTAMPTZ NOT NULL,
  period_end TIMESTAMPTZ NOT NULL,
  reported_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- TEAM COLLABORATION
-- ============================================

-- Project Members
CREATE TABLE IF NOT EXISTS project_members (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID REFERENCES customer_projects(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('owner', 'admin', 'developer', 'viewer')),
  permissions JSONB DEFAULT '{}'::jsonb,
  invited_by UUID REFERENCES auth.users(id),
  joined_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(project_id, user_id)
);

-- Project Invitations
CREATE TABLE IF NOT EXISTS project_invitations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID REFERENCES customer_projects(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('admin', 'developer', 'viewer')),
  token TEXT UNIQUE NOT NULL DEFAULT encode(gen_random_bytes(32), 'hex'),
  invited_by UUID REFERENCES auth.users(id),
  accepted_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '7 days'),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- DEPLOYMENT & VERSIONING
-- ============================================

-- Deployments
CREATE TABLE IF NOT EXISTS deployments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID REFERENCES customer_projects(id) ON DELETE CASCADE,
  version TEXT NOT NULL,
  deployment_type TEXT CHECK (deployment_type IN ('schema', 'function', 'config')),
  deployment_data JSONB NOT NULL,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'deploying', 'success', 'failed', 'rolled_back')),
  deployed_by UUID REFERENCES auth.users(id),
  deployed_at TIMESTAMPTZ,
  rolled_back_at TIMESTAMPTZ,
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- STORED PROCEDURES
-- ============================================

-- Create project schema
CREATE OR REPLACE FUNCTION create_project_schema(
  schema_name TEXT,
  project_id UUID
) RETURNS VOID AS $$
BEGIN
  EXECUTE format('CREATE SCHEMA IF NOT EXISTS %I', schema_name);
  
  -- Set up basic tables in the schema
  EXECUTE format('
    CREATE TABLE IF NOT EXISTS %I.users (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      email TEXT UNIQUE NOT NULL,
      created_at TIMESTAMPTZ DEFAULT NOW()
    )', schema_name);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Execute SQL in project context
CREATE OR REPLACE FUNCTION execute_sql(
  sql TEXT,
  project_id UUID
) RETURNS VOID AS $$
DECLARE
  schema_name TEXT;
BEGIN
  -- Get the schema name for the project
  schema_name := 'project_' || replace(project_id::text, '-', '_');
  
  -- Set the search path and execute
  EXECUTE format('SET search_path TO %I', schema_name);
  EXECUTE sql;
  
  -- Reset search path
  SET search_path TO public;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Get project usage statistics
CREATE OR REPLACE FUNCTION get_project_stats(p_project_id UUID)
RETURNS TABLE (
  api_calls_today BIGINT,
  api_calls_month BIGINT,
  storage_used_mb NUMERIC,
  active_users BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COUNT(*) FILTER (WHERE timestamp > NOW() - INTERVAL '24 hours') as api_calls_today,
    COUNT(*) FILTER (WHERE timestamp > NOW() - INTERVAL '30 days') as api_calls_month,
    COALESCE(SUM(s.total_size_bytes) / 1048576.0, 0) as storage_used_mb,
    0::BIGINT as active_users -- Placeholder
  FROM api_usage a
  LEFT JOIN storage_usage s ON s.project_id = p_project_id
  WHERE a.project_id = p_project_id;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- ROW LEVEL SECURITY
-- ============================================

-- Enable RLS on all tables
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE customer_projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_schemas ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_features ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_api_keys ENABLE ROW LEVEL SECURITY;
ALTER TABLE generated_schemas ENABLE ROW LEVEL SECURITY;
ALTER TABLE api_usage ENABLE ROW LEVEL SECURITY;
ALTER TABLE storage_usage ENABLE ROW LEVEL SECURITY;
ALTER TABLE generated_sdks ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_invitations ENABLE ROW LEVEL SECURITY;
ALTER TABLE deployments ENABLE ROW LEVEL SECURITY;

-- User Profiles policies
CREATE POLICY "Users can view own profile" ON user_profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON user_profiles
  FOR UPDATE USING (auth.uid() = id);

-- Customer Projects policies
CREATE POLICY "Users can view own projects" ON customer_projects
  FOR SELECT USING (
    customer_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM project_members 
      WHERE project_id = customer_projects.id 
      AND user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create projects" ON customer_projects
  FOR INSERT WITH CHECK (customer_id = auth.uid());

CREATE POLICY "Project owners can update" ON customer_projects
  FOR UPDATE USING (customer_id = auth.uid());

CREATE POLICY "Project owners can delete" ON customer_projects
  FOR DELETE USING (customer_id = auth.uid());

-- Project Members policies
CREATE POLICY "Project members can view members" ON project_members
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM project_members pm
      WHERE pm.project_id = project_members.project_id
      AND pm.user_id = auth.uid()
    )
  );

-- ============================================
-- INDEXES FOR PERFORMANCE
-- ============================================

CREATE INDEX IF NOT EXISTS idx_customer_projects_customer_id ON customer_projects(customer_id);
CREATE INDEX IF NOT EXISTS idx_customer_projects_api_key ON customer_projects(api_key);
CREATE INDEX IF NOT EXISTS idx_project_schemas_project_id ON project_schemas(project_id);
CREATE INDEX IF NOT EXISTS idx_api_usage_project_id_timestamp ON api_usage(project_id, timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_project_members_user_id ON project_members(user_id);
CREATE INDEX IF NOT EXISTS idx_project_members_project_id ON project_members(project_id);
CREATE INDEX IF NOT EXISTS idx_generated_schemas_embedding ON generated_schemas USING ivfflat (embedding vector_cosine_ops);

-- ============================================
-- INITIAL DATA
-- ============================================

-- Insert default schema templates
INSERT INTO schema_templates (name, category, description, schema_definition, default_features) VALUES
  ('ecommerce', 'business', 'E-commerce platform with products, orders, and customers', 
   '{"tables": ["products", "orders", "customers", "cart", "reviews"]}'::jsonb,
   '{"auth": true, "payments": true, "storage": true}'::jsonb),
  ('saas', 'business', 'SaaS application with teams and subscriptions',
   '{"tables": ["organizations", "teams", "subscriptions", "features"]}'::jsonb,
   '{"auth": true, "payments": true, "email": true}'::jsonb),
  ('marketplace', 'business', 'Two-sided marketplace with buyers and sellers',
   '{"tables": ["sellers", "buyers", "listings", "transactions", "messages"]}'::jsonb,
   '{"auth": true, "payments": true, "storage": true, "email": true}'::jsonb),
  ('social', 'social', 'Social network with profiles and content',
   '{"tables": ["profiles", "posts", "comments", "likes", "followers"]}'::jsonb,
   '{"auth": true, "storage": true, "realtime": true}'::jsonb),
  ('booking', 'business', 'Booking and reservation system',
   '{"tables": ["services", "providers", "bookings", "availability", "customers"]}'::jsonb,
   '{"auth": true, "payments": true, "email": true}'::jsonb)
ON CONFLICT (name) DO NOTHING;

-- Grant necessary permissions
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL FUNCTIONS IN SCHEMA public TO authenticated;