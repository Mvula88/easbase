-- Customer Projects and Infrastructure Tracking
-- This migration adds support for isolated customer projects with white-label infrastructure

-- Customer projects table (each customer gets their own Supabase project)
CREATE TABLE customer_projects (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  customer_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Supabase project details
  supabase_project_id TEXT UNIQUE,
  supabase_project_ref TEXT UNIQUE, -- Used in URLs (e.g., abcdefghijk)
  supabase_url TEXT NOT NULL,
  supabase_anon_key TEXT NOT NULL,
  supabase_service_key TEXT, -- Encrypted with pgcrypto
  
  -- Project metadata
  project_name TEXT NOT NULL,
  project_status TEXT CHECK (project_status IN ('provisioning', 'active', 'suspended', 'deleted')) DEFAULT 'provisioning',
  tier TEXT CHECK (tier IN ('starter', 'growth', 'scale', 'enterprise')) DEFAULT 'starter',
  
  -- Billing
  billing_period TEXT CHECK (billing_period IN ('monthly', 'annual')) DEFAULT 'monthly',
  stripe_subscription_id TEXT,
  next_billing_date TIMESTAMPTZ,
  trial_ends_at TIMESTAMPTZ,
  
  -- Resource limits (based on tier)
  storage_limit_gb INTEGER DEFAULT 1,
  bandwidth_limit_gb INTEGER DEFAULT 2,
  database_size_limit_mb INTEGER DEFAULT 500,
  api_calls_limit INTEGER DEFAULT 100000,
  ai_tokens_limit INTEGER DEFAULT 10000,
  
  -- Usage tracking
  storage_used_mb INTEGER DEFAULT 0,
  bandwidth_used_mb INTEGER DEFAULT 0,
  database_size_mb INTEGER DEFAULT 0,
  api_calls_count INTEGER DEFAULT 0,
  ai_tokens_used INTEGER DEFAULT 0,
  last_usage_reset TIMESTAMPTZ DEFAULT NOW(),
  
  -- White-label endpoints
  custom_domain TEXT,
  api_subdomain TEXT UNIQUE, -- e.g., customer-name.api.easbase.dev
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  last_deployment_at TIMESTAMPTZ,
  last_active_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(customer_id) -- One project per customer for now
);

-- Usage history for billing and analytics
CREATE TABLE usage_history (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID REFERENCES customer_projects(id) ON DELETE CASCADE,
  period_start TIMESTAMPTZ NOT NULL,
  period_end TIMESTAMPTZ NOT NULL,
  
  -- Usage metrics
  storage_gb_hours DECIMAL(10,2) DEFAULT 0,
  bandwidth_gb DECIMAL(10,2) DEFAULT 0,
  database_size_gb_hours DECIMAL(10,2) DEFAULT 0,
  api_calls INTEGER DEFAULT 0,
  ai_tokens INTEGER DEFAULT 0,
  
  -- Costs (for internal tracking)
  storage_cost DECIMAL(10,2) DEFAULT 0,
  bandwidth_cost DECIMAL(10,2) DEFAULT 0,
  compute_cost DECIMAL(10,2) DEFAULT 0,
  ai_cost DECIMAL(10,2) DEFAULT 0,
  total_cost DECIMAL(10,2) DEFAULT 0,
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Provisioning queue for async project creation
CREATE TABLE provisioning_queue (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  customer_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  tier TEXT NOT NULL,
  billing_period TEXT NOT NULL,
  status TEXT CHECK (status IN ('pending', 'processing', 'completed', 'failed')) DEFAULT 'pending',
  attempts INTEGER DEFAULT 0,
  error_message TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  processed_at TIMESTAMPTZ
);

-- Deployment history
CREATE TABLE deployment_history (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID REFERENCES customer_projects(id) ON DELETE CASCADE,
  schema_id UUID REFERENCES schema_generations(id),
  deployment_type TEXT CHECK (deployment_type IN ('initial', 'update', 'rollback')),
  status TEXT CHECK (status IN ('pending', 'deploying', 'success', 'failed')) DEFAULT 'pending',
  sql_executed TEXT,
  error_message TEXT,
  deployed_by UUID REFERENCES auth.users(id),
  started_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);

-- White-label routing table
CREATE TABLE white_label_routes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID REFERENCES customer_projects(id) ON DELETE CASCADE,
  route_type TEXT CHECK (route_type IN ('api', 'auth', 'storage', 'realtime')),
  source_url TEXT NOT NULL,
  target_url TEXT NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(source_url)
);

-- Indexes for performance
CREATE INDEX idx_customer_projects_customer ON customer_projects(customer_id);
CREATE INDEX idx_customer_projects_status ON customer_projects(project_status);
CREATE INDEX idx_customer_projects_tier ON customer_projects(tier);
CREATE INDEX idx_customer_projects_subdomain ON customer_projects(api_subdomain);
CREATE INDEX idx_usage_history_project ON usage_history(project_id, period_start);
CREATE INDEX idx_provisioning_queue_status ON provisioning_queue(status, created_at);
CREATE INDEX idx_deployment_history_project ON deployment_history(project_id, started_at DESC);

-- RLS Policies
ALTER TABLE customer_projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE usage_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE deployment_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE white_label_routes ENABLE ROW LEVEL SECURITY;

-- Customers can only see their own projects
CREATE POLICY "Customers view own projects" ON customer_projects
  FOR SELECT USING (customer_id = auth.uid());

CREATE POLICY "Customers view own usage" ON usage_history
  FOR SELECT USING (
    project_id IN (SELECT id FROM customer_projects WHERE customer_id = auth.uid())
  );

CREATE POLICY "Customers view own deployments" ON deployment_history
  FOR SELECT USING (
    project_id IN (SELECT id FROM customer_projects WHERE customer_id = auth.uid())
  );

-- Functions for usage tracking
CREATE OR REPLACE FUNCTION update_project_usage(
  p_project_id UUID,
  p_storage_mb INTEGER DEFAULT 0,
  p_bandwidth_mb INTEGER DEFAULT 0,
  p_api_calls INTEGER DEFAULT 0,
  p_ai_tokens INTEGER DEFAULT 0
)
RETURNS void AS $$
BEGIN
  UPDATE customer_projects
  SET 
    storage_used_mb = storage_used_mb + p_storage_mb,
    bandwidth_used_mb = bandwidth_used_mb + p_bandwidth_mb,
    api_calls_count = api_calls_count + p_api_calls,
    ai_tokens_used = ai_tokens_used + p_ai_tokens,
    last_active_at = NOW()
  WHERE id = p_project_id;
END;
$$ LANGUAGE plpgsql;

-- Function to reset monthly usage
CREATE OR REPLACE FUNCTION reset_monthly_usage()
RETURNS void AS $$
BEGIN
  -- Archive current usage to history
  INSERT INTO usage_history (
    project_id, period_start, period_end,
    storage_gb_hours, bandwidth_gb, api_calls, ai_tokens
  )
  SELECT 
    id,
    last_usage_reset,
    NOW(),
    storage_used_mb / 1024.0 * EXTRACT(EPOCH FROM (NOW() - last_usage_reset)) / 3600,
    bandwidth_used_mb / 1024.0,
    api_calls_count,
    ai_tokens_used
  FROM customer_projects
  WHERE last_usage_reset < NOW() - INTERVAL '30 days';
  
  -- Reset counters
  UPDATE customer_projects
  SET 
    bandwidth_used_mb = 0,
    api_calls_count = 0,
    ai_tokens_used = 0,
    last_usage_reset = NOW()
  WHERE last_usage_reset < NOW() - INTERVAL '30 days';
END;
$$ LANGUAGE plpgsql;

-- Trigger to update updated_at
CREATE TRIGGER update_customer_projects_updated_at
  BEFORE UPDATE ON customer_projects
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();