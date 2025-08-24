-- Migration to add missing tables and update schema
-- Run this AFTER enabling pgvector extension

-- 1. Create profiles table (links to auth.users)
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT,
  display_name TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id)
);

-- 2. Create organizations table
CREATE TABLE IF NOT EXISTS organizations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
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

-- 3. Create team_members table
CREATE TABLE IF NOT EXISTS team_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT CHECK (role IN ('owner', 'admin', 'member', 'viewer')),
  joined_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(organization_id, user_id)
);

-- 4. Add organization_id to projects if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'projects' AND column_name = 'organization_id'
  ) THEN
    ALTER TABLE projects ADD COLUMN organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE;
  END IF;
END $$;

-- 5. Create schema_generations table
CREATE TABLE IF NOT EXISTS schema_generations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
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

-- 6. Update cache table to add vector embedding if not exists
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'cache' AND column_name = 'prompt_embedding'
  ) THEN
    ALTER TABLE cache ADD COLUMN prompt_embedding vector(1536);
    ALTER TABLE cache ADD COLUMN embedding_model TEXT;
    ALTER TABLE cache ADD COLUMN last_used_at TIMESTAMPTZ DEFAULT NOW();
  END IF;
END $$;

-- 7. Create webhooks table
CREATE TABLE IF NOT EXISTS webhooks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  url TEXT NOT NULL,
  secret TEXT NOT NULL,
  events TEXT[] DEFAULT ARRAY['schema.generated', 'deployment.completed'],
  active BOOLEAN DEFAULT true,
  last_triggered_at TIMESTAMPTZ,
  failure_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 8. Create api_activity table
CREATE TABLE IF NOT EXISTS api_activity (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
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

-- 9. Create schema_versions table
CREATE TABLE IF NOT EXISTS schema_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
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

-- 10. Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_profiles_user_id ON profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_organizations_owner ON organizations(owner_id);
CREATE INDEX IF NOT EXISTS idx_team_members_org ON team_members(organization_id);
CREATE INDEX IF NOT EXISTS idx_team_members_user ON team_members(user_id);
CREATE INDEX IF NOT EXISTS idx_projects_org ON projects(organization_id);
CREATE INDEX IF NOT EXISTS idx_schema_generations_project ON schema_generations(project_id);
CREATE INDEX IF NOT EXISTS idx_webhooks_org ON webhooks(organization_id);
CREATE INDEX IF NOT EXISTS idx_api_activity_org ON api_activity(organization_id);
CREATE INDEX IF NOT EXISTS idx_api_activity_created ON api_activity(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_schema_versions_project ON schema_versions(project_id);

-- 11. Enable RLS on new tables
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE team_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE schema_generations ENABLE ROW LEVEL SECURITY;
ALTER TABLE webhooks ENABLE ROW LEVEL SECURITY;
ALTER TABLE api_activity ENABLE ROW LEVEL SECURITY;
ALTER TABLE schema_versions ENABLE ROW LEVEL SECURITY;

-- 12. Create RLS policies for profiles
CREATE POLICY "Users can view own profile" ON profiles
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update own profile" ON profiles
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own profile" ON profiles
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- 13. Create RLS policies for organizations
CREATE POLICY "Members can view their organizations" ON organizations
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM team_members
      WHERE team_members.organization_id = organizations.id
      AND team_members.user_id = auth.uid()
    ) OR owner_id = auth.uid()
  );

CREATE POLICY "Owners can update organizations" ON organizations
  FOR UPDATE USING (owner_id = auth.uid());

CREATE POLICY "Users can create organizations" ON organizations
  FOR INSERT WITH CHECK (owner_id = auth.uid());

-- 14. Create RLS policies for team_members
CREATE POLICY "Members can view team" ON team_members
  FOR SELECT USING (
    organization_id IN (
      SELECT organization_id FROM team_members WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Admins can manage team" ON team_members
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM team_members tm
      WHERE tm.organization_id = team_members.organization_id
      AND tm.user_id = auth.uid()
      AND tm.role IN ('owner', 'admin')
    )
  );

-- 15. Update the find_similar_schemas function if needed
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

-- 16. Create trigger for updated_at if not exists
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add triggers to tables that need them
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger 
    WHERE tgname = 'update_profiles_updated_at'
  ) THEN
    CREATE TRIGGER update_profiles_updated_at 
      BEFORE UPDATE ON profiles
      FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger 
    WHERE tgname = 'update_organizations_updated_at'
  ) THEN
    CREATE TRIGGER update_organizations_updated_at 
      BEFORE UPDATE ON organizations
      FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger 
    WHERE tgname = 'update_projects_updated_at'
  ) THEN
    CREATE TRIGGER update_projects_updated_at 
      BEFORE UPDATE ON projects
      FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  END IF;
END $$;

-- 17. Add test data for development (optional)
-- Uncomment if you want test data
/*
INSERT INTO organizations (name, slug, subscription_status)
VALUES ('Demo Organization', 'demo-org', 'trial')
ON CONFLICT (slug) DO NOTHING;

INSERT INTO projects (name, description, deployment_status)
VALUES 
  ('Test Project', 'A test project for development', 'pending'),
  ('Production Project', 'Main production database', 'deployed')
ON CONFLICT DO NOTHING;
*/

-- Success message
DO $$ 
BEGIN
  RAISE NOTICE 'Migration completed successfully! Missing tables have been added.';
END $$;