-- ============================================
-- EASBASE PLATFORM - SIMPLE SETUP
-- Run this to add the core Backend-as-a-Service tables
-- ============================================

-- Enable extensions if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================
-- CORE TABLES FOR BACKEND-AS-A-SERVICE
-- ============================================

-- 1. Customer Projects (stores each user's backend projects)
CREATE TABLE IF NOT EXISTS customer_projects (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  customer_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  project_name TEXT NOT NULL,
  business_type TEXT,
  description TEXT,
  api_key TEXT UNIQUE DEFAULT encode(gen_random_bytes(32), 'hex'),
  status TEXT DEFAULT 'provisioning',
  features JSONB DEFAULT '{"auth": true, "database": true, "storage": false, "email": false, "payments": false}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Generated Schemas (AI-generated schema cache)
CREATE TABLE IF NOT EXISTS generated_schemas (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  business_type TEXT NOT NULL,
  description TEXT,
  features TEXT[],
  schema_definition JSONB NOT NULL,
  sql_text TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Project Schemas (deployed schemas for each project)
CREATE TABLE IF NOT EXISTS project_schemas (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID REFERENCES customer_projects(id) ON DELETE CASCADE,
  schema_definition JSONB NOT NULL,
  sql_migrations TEXT[],
  applied_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Project Features (feature configurations)
CREATE TABLE IF NOT EXISTS project_features (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID REFERENCES customer_projects(id) ON DELETE CASCADE,
  feature_type TEXT NOT NULL,
  configuration JSONB DEFAULT '{}'::jsonb,
  enabled BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. API Usage (track API calls)
CREATE TABLE IF NOT EXISTS api_usage (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID REFERENCES customer_projects(id) ON DELETE CASCADE,
  customer_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  endpoint TEXT,
  method TEXT,
  request_count INTEGER DEFAULT 1,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. Project Deployments (track deployments)
CREATE TABLE IF NOT EXISTS project_deployments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID REFERENCES customer_projects(id) ON DELETE CASCADE,
  deployment_type TEXT,
  status TEXT DEFAULT 'pending',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- ENABLE ROW LEVEL SECURITY
-- ============================================

ALTER TABLE customer_projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE generated_schemas ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_schemas ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_features ENABLE ROW LEVEL SECURITY;
ALTER TABLE api_usage ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_deployments ENABLE ROW LEVEL SECURITY;

-- ============================================
-- CREATE SIMPLE POLICIES
-- ============================================

-- Allow users to see and manage their own projects
CREATE POLICY "users_own_projects" ON customer_projects
  FOR ALL USING (customer_id = auth.uid());

-- Allow users to see their generated schemas
CREATE POLICY "users_own_schemas" ON generated_schemas
  FOR ALL USING (user_id = auth.uid());

-- Allow users to manage their project schemas
CREATE POLICY "users_project_schemas" ON project_schemas
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM customer_projects 
      WHERE customer_projects.id = project_schemas.project_id 
      AND customer_projects.customer_id = auth.uid()
    )
  );

-- Allow users to manage their project features
CREATE POLICY "users_project_features" ON project_features
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM customer_projects 
      WHERE customer_projects.id = project_features.project_id 
      AND customer_projects.customer_id = auth.uid()
    )
  );

-- Allow users to see their API usage
CREATE POLICY "users_api_usage" ON api_usage
  FOR ALL USING (customer_id = auth.uid());

-- Allow users to see their deployments
CREATE POLICY "users_project_deployments" ON project_deployments
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM customer_projects 
      WHERE customer_projects.id = project_deployments.project_id 
      AND customer_projects.customer_id = auth.uid()
    )
  );

-- ============================================
-- CREATE INDEXES FOR PERFORMANCE
-- ============================================

CREATE INDEX IF NOT EXISTS idx_projects_customer ON customer_projects(customer_id);
CREATE INDEX IF NOT EXISTS idx_projects_api_key ON customer_projects(api_key);
CREATE INDEX IF NOT EXISTS idx_schemas_user ON generated_schemas(user_id);
CREATE INDEX IF NOT EXISTS idx_api_usage_customer ON api_usage(customer_id);

-- ============================================
-- HELPER FUNCTIONS
-- ============================================

-- Function to create a project schema (simplified)
CREATE OR REPLACE FUNCTION create_project_schema(
  schema_name TEXT,
  project_id UUID
) RETURNS VOID AS $$
BEGIN
  -- Create a namespace for the project (in production, this would create actual schemas)
  -- For now, we just log the intent
  RAISE NOTICE 'Would create schema % for project %', schema_name, project_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to execute SQL in project context (simplified)
CREATE OR REPLACE FUNCTION execute_sql(
  sql TEXT,
  project_id UUID
) RETURNS VOID AS $$
BEGIN
  -- In production, this would execute SQL in the project's schema
  -- For now, we just log the intent
  RAISE NOTICE 'Would execute SQL for project %', project_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- GRANT PERMISSIONS
-- ============================================

GRANT ALL ON customer_projects TO authenticated;
GRANT ALL ON generated_schemas TO authenticated;
GRANT ALL ON project_schemas TO authenticated;
GRANT ALL ON project_features TO authenticated;
GRANT ALL ON api_usage TO authenticated;
GRANT ALL ON project_deployments TO authenticated;

-- ============================================
-- SUCCESS MESSAGE
-- ============================================

DO $$
BEGIN
  RAISE NOTICE 'Easbase platform tables created successfully!';
  RAISE NOTICE 'You can now create backend projects for your users.';
END $$;