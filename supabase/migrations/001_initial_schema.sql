-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "vector";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Core user profiles table (links to auth.users)
CREATE TABLE profiles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT,
  display_name TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id)
);

-- Organizations for multi-tenancy
CREATE TABLE organizations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  owner_id UUID REFERENCES auth.users(id),
  subscription_status TEXT DEFAULT 'trial',
  stripe_customer_id TEXT,
  stripe_subscription_id TEXT,
  api_calls_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Team members
CREATE TABLE team_members (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT CHECK (role IN ('owner', 'admin', 'member', 'viewer')),
  joined_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(organization_id, user_id)
);

-- Projects
CREATE TABLE projects (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  database_url TEXT,
  api_key_hash TEXT,
  deployment_status TEXT DEFAULT 'pending',
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Schema generations history
CREATE TABLE schema_generations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  prompt TEXT NOT NULL,
  generated_schema JSONB NOT NULL,
  generated_sql TEXT NOT NULL,
  version INTEGER DEFAULT 1,
  tokens_used INTEGER,
  model_used TEXT,
  cache_hit BOOLEAN DEFAULT false,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Cache table with vector embeddings
CREATE TABLE cache (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  cache_key TEXT UNIQUE NOT NULL,
  prompt TEXT NOT NULL,
  prompt_embedding vector(1536),
  response_schema JSONB,
  response_sql TEXT,
  model_used TEXT,
  tokens_saved INTEGER DEFAULT 0,
  usage_count INTEGER DEFAULT 1,
  embedding_model TEXT,
  last_used_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Health check table
CREATE TABLE health_check (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  status TEXT DEFAULT 'ok',
  checked_at TIMESTAMPTZ DEFAULT NOW()
);

-- Auth templates library
CREATE TABLE auth_templates (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  slug TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  category TEXT CHECK (category IN ('saas', 'marketplace', 'social', 'ecommerce', 'custom')),
  schema JSONB NOT NULL,
  sql_template TEXT NOT NULL,
  rls_policies TEXT NOT NULL,
  edge_functions JSONB,
  popularity INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- API activity logs
CREATE TABLE api_activity (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  endpoint TEXT NOT NULL,
  method TEXT NOT NULL,
  status_code INTEGER,
  response_time_ms INTEGER,
  error_message TEXT,
  ip_address TEXT,
  user_agent TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Webhooks configuration
CREATE TABLE webhooks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  url TEXT NOT NULL,
  secret TEXT NOT NULL,
  events TEXT[] DEFAULT ARRAY['schema.generated', 'deployment.completed'],
  active BOOLEAN DEFAULT true,
  last_triggered_at TIMESTAMPTZ,
  failure_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Schema versions for migration tracking
CREATE TABLE schema_versions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  version_number INTEGER NOT NULL,
  schema_data JSONB NOT NULL,
  sql_data TEXT NOT NULL,
  migration_up TEXT,
  migration_down TEXT,
  breaking_changes JSONB,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(project_id, version_number)
);

-- Create indexes for performance
CREATE INDEX idx_profiles_user_id ON profiles(user_id);
CREATE INDEX idx_team_members_org ON team_members(organization_id);
CREATE INDEX idx_team_members_user ON team_members(user_id);
CREATE INDEX idx_projects_org ON projects(organization_id);
CREATE INDEX idx_schema_generations_project ON schema_generations(project_id);
CREATE INDEX idx_cache_key ON cache(cache_key);
CREATE INDEX idx_cache_embedding ON cache USING ivfflat (prompt_embedding vector_cosine_ops) WITH (lists = 100);
CREATE INDEX idx_api_activity_org ON api_activity(organization_id);
CREATE INDEX idx_api_activity_created ON api_activity(created_at DESC);

-- Row Level Security (RLS) policies
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE team_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE schema_generations ENABLE ROW LEVEL SECURITY;
ALTER TABLE webhooks ENABLE ROW LEVEL SECURITY;
ALTER TABLE api_activity ENABLE ROW LEVEL SECURITY;
ALTER TABLE schema_versions ENABLE ROW LEVEL SECURITY;

-- Profiles policies
CREATE POLICY "Users can view own profile" ON profiles
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update own profile" ON profiles
  FOR UPDATE USING (auth.uid() = user_id);

-- Organizations policies
CREATE POLICY "Members can view their organizations" ON organizations
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM team_members
      WHERE team_members.organization_id = organizations.id
      AND team_members.user_id = auth.uid()
    )
  );

CREATE POLICY "Owners can update organizations" ON organizations
  FOR UPDATE USING (owner_id = auth.uid());

-- Team members policies
CREATE POLICY "Members can view team" ON team_members
  FOR SELECT USING (
    organization_id IN (
      SELECT organization_id FROM team_members WHERE user_id = auth.uid()
    )
  );

-- Projects policies
CREATE POLICY "Team members can view projects" ON projects
  FOR SELECT USING (
    organization_id IN (
      SELECT organization_id FROM team_members WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Admins can manage projects" ON projects
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM team_members
      WHERE team_members.organization_id = projects.organization_id
      AND team_members.user_id = auth.uid()
      AND team_members.role IN ('owner', 'admin')
    )
  );

-- Schema generations policies
CREATE POLICY "Team members can view schemas" ON schema_generations
  FOR SELECT USING (
    project_id IN (
      SELECT id FROM projects WHERE organization_id IN (
        SELECT organization_id FROM team_members WHERE user_id = auth.uid()
      )
    )
  );

-- Functions for vector similarity search
CREATE OR REPLACE FUNCTION find_similar_schemas(
  query_embedding vector(1536),
  similarity_threshold float DEFAULT 0.85,
  match_limit int DEFAULT 5
)
RETURNS TABLE (
  id UUID,
  cache_key TEXT,
  prompt TEXT,
  response_schema JSONB,
  response_sql TEXT,
  similarity float,
  tokens_saved INTEGER,
  usage_count INTEGER
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    c.id,
    c.cache_key,
    c.prompt,
    c.response_schema,
    c.response_sql,
    1 - (c.prompt_embedding <=> query_embedding) AS similarity,
    c.tokens_saved,
    c.usage_count
  FROM cache c
  WHERE c.prompt_embedding IS NOT NULL
    AND 1 - (c.prompt_embedding <=> query_embedding) >= similarity_threshold
  ORDER BY c.prompt_embedding <=> query_embedding
  LIMIT match_limit;
END;
$$;

-- Function to execute SQL (for deployment)
CREATE OR REPLACE FUNCTION exec_sql(sql text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  EXECUTE sql;
END;
$$;

-- Trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_organizations_updated_at BEFORE UPDATE ON organizations
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_projects_updated_at BEFORE UPDATE ON projects
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Insert initial health check record
INSERT INTO health_check (status) VALUES ('ok');