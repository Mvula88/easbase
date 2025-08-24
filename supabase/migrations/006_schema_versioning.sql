-- Schema versions table
CREATE TABLE IF NOT EXISTS schema_versions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  version TEXT NOT NULL,
  schema JSONB NOT NULL,
  sql TEXT NOT NULL,
  changes JSONB,
  migration_up TEXT,
  migration_down TEXT,
  checksum TEXT NOT NULL,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(project_id, version)
);

-- Schema migrations table
CREATE TABLE IF NOT EXISTS schema_migrations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  from_version TEXT NOT NULL,
  to_version TEXT NOT NULL,
  migration_sql TEXT NOT NULL,
  rollback_sql TEXT,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'running', 'completed', 'failed', 'rolled_back')),
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  started_by UUID REFERENCES auth.users(id),
  error_message TEXT,
  execution_time_ms INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add current schema version to projects table
ALTER TABLE projects ADD COLUMN IF NOT EXISTS current_schema_version TEXT DEFAULT '1.0.0';

-- Create indexes
CREATE INDEX idx_schema_versions_project ON schema_versions(project_id);
CREATE INDEX idx_schema_versions_version ON schema_versions(version);
CREATE INDEX idx_schema_versions_created ON schema_versions(created_at DESC);
CREATE INDEX idx_schema_migrations_project ON schema_migrations(project_id);
CREATE INDEX idx_schema_migrations_status ON schema_migrations(status);

-- Enable RLS
ALTER TABLE schema_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE schema_migrations ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view schema versions for their projects" ON schema_versions
  FOR SELECT USING (
    project_id IN (
      SELECT id FROM projects 
      WHERE customer_id IN (
        SELECT id FROM customers WHERE user_id = auth.uid()
      )
    )
  );

CREATE POLICY "Users can create schema versions for their projects" ON schema_versions
  FOR INSERT WITH CHECK (
    project_id IN (
      SELECT id FROM projects 
      WHERE customer_id IN (
        SELECT id FROM customers WHERE user_id = auth.uid()
      )
    )
  );

CREATE POLICY "Users can view migrations for their projects" ON schema_migrations
  FOR SELECT USING (
    project_id IN (
      SELECT id FROM projects 
      WHERE customer_id IN (
        SELECT id FROM customers WHERE user_id = auth.uid()
      )
    )
  );

-- Service role policies
CREATE POLICY "Service role can manage all schema versions" ON schema_versions
  FOR ALL USING (auth.jwt()->>'role' = 'service_role');

CREATE POLICY "Service role can manage all migrations" ON schema_migrations
  FOR ALL USING (auth.jwt()->>'role' = 'service_role');