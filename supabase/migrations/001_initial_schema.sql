-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "vector";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Customers table (our users)
CREATE TABLE customers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email TEXT UNIQUE NOT NULL,
  full_name TEXT,
  company_name TEXT,
  api_key TEXT UNIQUE DEFAULT encode(gen_random_bytes(32), 'hex'),
  anthropic_api_key TEXT, -- Encrypted, optional if they want to use their own
  plan TEXT DEFAULT 'free' CHECK (plan IN ('free', 'pro', 'scale', 'enterprise')),
  stripe_customer_id TEXT,
  stripe_subscription_id TEXT,
  usage_limit INTEGER DEFAULT 100, -- Monthly API calls limit
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Customer's Supabase projects
CREATE TABLE projects (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  supabase_project_url TEXT,
  supabase_anon_key TEXT, -- Encrypted
  supabase_service_key TEXT, -- Encrypted
  deployment_status TEXT DEFAULT 'pending',
  last_deployed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(customer_id, name)
);

-- Generated schemas history
CREATE TABLE schemas (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  project_id UUID REFERENCES projects(id) ON DELETE SET NULL,
  prompt TEXT NOT NULL,
  prompt_tokens INTEGER,
  generated_schema JSONB NOT NULL,
  generated_sql TEXT NOT NULL,
  deployment_status TEXT DEFAULT 'draft',
  is_cached BOOLEAN DEFAULT false,
  cache_key TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- AI response cache with vector embeddings
CREATE TABLE cache (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  cache_key TEXT UNIQUE NOT NULL,
  prompt TEXT NOT NULL,
  prompt_embedding vector(1536), -- For Claude embeddings
  response_schema JSONB NOT NULL,
  response_sql TEXT NOT NULL,
  model_used TEXT DEFAULT 'claude-3-opus-20240229',
  tokens_saved INTEGER DEFAULT 0,
  usage_count INTEGER DEFAULT 1,
  quality_score FLOAT DEFAULT 1.0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  last_used_at TIMESTAMPTZ DEFAULT NOW()
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

-- Usage tracking for billing
CREATE TABLE usage_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  endpoint TEXT NOT NULL,
  method TEXT NOT NULL,
  tokens_used INTEGER DEFAULT 0,
  cache_hit BOOLEAN DEFAULT false,
  cost_cents INTEGER DEFAULT 0,
  response_time_ms INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Deployment history
CREATE TABLE deployments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  schema_id UUID NOT NULL REFERENCES schemas(id) ON DELETE CASCADE,
  deployment_type TEXT CHECK (deployment_type IN ('create', 'update', 'rollback')),
  status TEXT DEFAULT 'pending',
  started_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  error_message TEXT,
  rollback_sql TEXT
);

-- Create indexes for performance
CREATE INDEX idx_cache_embedding ON cache USING ivfflat (prompt_embedding vector_cosine_ops);
CREATE INDEX idx_usage_customer_created ON usage_logs(customer_id, created_at DESC);
CREATE INDEX idx_schemas_customer ON schemas(customer_id);
CREATE INDEX idx_deployments_project ON deployments(project_id);

-- RLS Policies
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE schemas ENABLE ROW LEVEL SECURITY;
ALTER TABLE usage_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE deployments ENABLE ROW LEVEL SECURITY;

-- Customers can only see their own data
CREATE POLICY "Customers can view own data" ON customers
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Customers can update own data" ON customers
  FOR UPDATE USING (auth.uid() = id);

-- Projects policies
CREATE POLICY "Users can view own projects" ON projects
  FOR SELECT USING (customer_id = auth.uid());

CREATE POLICY "Users can create own projects" ON projects
  FOR INSERT WITH CHECK (customer_id = auth.uid());

CREATE POLICY "Users can update own projects" ON projects
  FOR UPDATE USING (customer_id = auth.uid());

CREATE POLICY "Users can delete own projects" ON projects
  FOR DELETE USING (customer_id = auth.uid());

-- Schemas policies
CREATE POLICY "Users can view own schemas" ON schemas
  FOR SELECT USING (customer_id = auth.uid());

CREATE POLICY "Users can create own schemas" ON schemas
  FOR INSERT WITH CHECK (customer_id = auth.uid());

-- Usage logs policies
CREATE POLICY "Users can view own usage" ON usage_logs
  FOR SELECT USING (customer_id = auth.uid());

-- Functions for vector similarity search
CREATE OR REPLACE FUNCTION find_similar_schemas(
  query_embedding vector(1536),
  similarity_threshold float,
  match_limit int
)
RETURNS TABLE (
  id uuid,
  cache_key text,
  prompt text,
  response_schema jsonb,
  response_sql text,
  similarity float
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
    1 - (c.prompt_embedding <=> query_embedding) as similarity
  FROM cache c
  WHERE 1 - (c.prompt_embedding <=> query_embedding) > similarity_threshold
  ORDER BY c.prompt_embedding <=> query_embedding
  LIMIT match_limit;
END;
$$;

-- Function to execute SQL safely
CREATE OR REPLACE FUNCTION exec_sql(sql text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  EXECUTE sql;
END;
$$;