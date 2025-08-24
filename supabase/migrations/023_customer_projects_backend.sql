-- Migration: Customer Projects and Backend-as-a-Service Tables
-- Description: Core tables for managing customer projects, schemas, and features

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

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

-- Project Schemas table for tracking database schemas
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

-- Project Templates for quick setup
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

-- Create indexes for performance
CREATE INDEX idx_customer_projects_customer_id ON customer_projects(customer_id);
CREATE INDEX idx_customer_projects_status ON customer_projects(status);
CREATE INDEX idx_project_schemas_project_id ON project_schemas(project_id);
CREATE INDEX idx_project_features_project_id ON project_features(project_id);
CREATE INDEX idx_api_usage_project_id ON api_usage(project_id);
CREATE INDEX idx_api_usage_timestamp ON api_usage(timestamp);
CREATE INDEX idx_project_deployments_project_id ON project_deployments(project_id);

-- Row Level Security policies
ALTER TABLE customer_projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_schemas ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_features ENABLE ROW LEVEL SECURITY;
ALTER TABLE api_usage ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_deployments ENABLE ROW LEVEL SECURITY;

-- Policies for customer_projects
CREATE POLICY "Users can view own projects" ON customer_projects
  FOR SELECT USING (auth.uid() = customer_id);

CREATE POLICY "Users can create own projects" ON customer_projects
  FOR INSERT WITH CHECK (auth.uid() = customer_id);

CREATE POLICY "Users can update own projects" ON customer_projects
  FOR UPDATE USING (auth.uid() = customer_id);

CREATE POLICY "Users can delete own projects" ON customer_projects
  FOR DELETE USING (auth.uid() = customer_id);

-- Policies for project_schemas
CREATE POLICY "Users can view own project schemas" ON project_schemas
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM customer_projects 
      WHERE customer_projects.id = project_schemas.project_id 
      AND customer_projects.customer_id = auth.uid()
    )
  );

CREATE POLICY "Users can manage own project schemas" ON project_schemas
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM customer_projects 
      WHERE customer_projects.id = project_schemas.project_id 
      AND customer_projects.customer_id = auth.uid()
    )
  );

-- Policies for project_features
CREATE POLICY "Users can view own project features" ON project_features
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM customer_projects 
      WHERE customer_projects.id = project_features.project_id 
      AND customer_projects.customer_id = auth.uid()
    )
  );

CREATE POLICY "Users can manage own project features" ON project_features
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM customer_projects 
      WHERE customer_projects.id = project_features.project_id 
      AND customer_projects.customer_id = auth.uid()
    )
  );

-- Policies for api_usage (read-only for users)
CREATE POLICY "Users can view own API usage" ON api_usage
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM customer_projects 
      WHERE customer_projects.id = api_usage.project_id 
      AND customer_projects.customer_id = auth.uid()
    )
  );

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers for updated_at
CREATE TRIGGER update_customer_projects_updated_at
  BEFORE UPDATE ON customer_projects
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_project_features_updated_at
  BEFORE UPDATE ON project_features
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Function to track API usage
CREATE OR REPLACE FUNCTION track_api_usage(
  p_project_id UUID,
  p_endpoint TEXT,
  p_method TEXT,
  p_status_code INTEGER DEFAULT NULL,
  p_response_time_ms INTEGER DEFAULT NULL
) RETURNS UUID AS $$
DECLARE
  v_usage_id UUID;
BEGIN
  INSERT INTO api_usage (
    project_id,
    endpoint,
    method,
    status_code,
    response_time_ms
  ) VALUES (
    p_project_id,
    p_endpoint,
    p_method,
    p_status_code,
    p_response_time_ms
  ) RETURNING id INTO v_usage_id;
  
  RETURN v_usage_id;
END;
$$ LANGUAGE plpgsql;

-- Insert default templates
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
        "name": "organizations",
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
          {"name": "organization_id", "type": "uuid", "references": "organizations.id"},
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
)
ON CONFLICT (name) DO NOTHING;

-- Grant necessary permissions
GRANT ALL ON customer_projects TO authenticated;
GRANT ALL ON project_schemas TO authenticated;
GRANT ALL ON project_features TO authenticated;
GRANT SELECT ON api_usage TO authenticated;
GRANT ALL ON project_deployments TO authenticated;
GRANT SELECT ON project_templates TO authenticated;