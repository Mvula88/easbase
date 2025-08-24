-- API Keys table for customer API access
CREATE TABLE IF NOT EXISTS api_keys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  customer_id UUID NOT NULL,
  name TEXT NOT NULL,
  key_hash TEXT UNIQUE NOT NULL,
  key_prefix TEXT NOT NULL, -- First 7 chars for display
  last_used_at TIMESTAMPTZ,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ
);

-- Usage tracking table for monitoring API and generation usage
CREATE TABLE IF NOT EXISTS usage_tracking (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID NOT NULL,
  usage_type TEXT NOT NULL CHECK (usage_type IN (
    'schema_generation', 
    'deployment', 
    'api_call',
    'rate_limit_schema',
    'rate_limit_deploy',
    'rate_limit_api'
  )),
  count INTEGER DEFAULT 1,
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Customer projects table for Model B (storing customer database instances)
CREATE TABLE IF NOT EXISTS customer_projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID NOT NULL,
  supabase_project_id TEXT UNIQUE NOT NULL,
  project_name TEXT NOT NULL,
  project_url TEXT NOT NULL,
  project_status TEXT DEFAULT 'active' CHECK (project_status IN ('active', 'paused', 'deleted')),
  anon_key TEXT,
  service_role_key_encrypted TEXT, -- Encrypted with app secret
  database_url_encrypted TEXT, -- Encrypted with app secret
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Deployment history table
CREATE TABLE IF NOT EXISTS deployment_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID NOT NULL,
  project_id UUID REFERENCES customer_projects(id) ON DELETE SET NULL,
  schema_id UUID,
  deployment_type TEXT CHECK (deployment_type IN ('schema', 'auth_template', 'migration')),
  sql_content TEXT,
  status TEXT CHECK (status IN ('pending', 'in_progress', 'completed', 'failed', 'rolled_back')),
  error_message TEXT,
  deployed_at TIMESTAMPTZ,
  rolled_back_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_api_keys_user ON api_keys(user_id);
CREATE INDEX IF NOT EXISTS idx_api_keys_customer ON api_keys(customer_id);
CREATE INDEX IF NOT EXISTS idx_api_keys_hash ON api_keys(key_hash);
CREATE INDEX IF NOT EXISTS idx_api_keys_active ON api_keys(is_active) WHERE is_active = true;

CREATE INDEX IF NOT EXISTS idx_usage_tracking_customer ON usage_tracking(customer_id);
CREATE INDEX IF NOT EXISTS idx_usage_tracking_type ON usage_tracking(usage_type);
CREATE INDEX IF NOT EXISTS idx_usage_tracking_created ON usage_tracking(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_usage_tracking_customer_type_date ON usage_tracking(customer_id, usage_type, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_customer_projects_customer ON customer_projects(customer_id);
CREATE INDEX IF NOT EXISTS idx_customer_projects_status ON customer_projects(project_status);

CREATE INDEX IF NOT EXISTS idx_deployment_history_customer ON deployment_history(customer_id);
CREATE INDEX IF NOT EXISTS idx_deployment_history_project ON deployment_history(project_id);
CREATE INDEX IF NOT EXISTS idx_deployment_history_status ON deployment_history(status);

-- Enable RLS
ALTER TABLE api_keys ENABLE ROW LEVEL SECURITY;
ALTER TABLE usage_tracking ENABLE ROW LEVEL SECURITY;
ALTER TABLE customer_projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE deployment_history ENABLE ROW LEVEL SECURITY;

-- RLS Policies for api_keys
CREATE POLICY "Users can view their own API keys" ON api_keys
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Users can create their own API keys" ON api_keys
  FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their own API keys" ON api_keys
  FOR UPDATE USING (user_id = auth.uid());

CREATE POLICY "Users can delete their own API keys" ON api_keys
  FOR DELETE USING (user_id = auth.uid());

-- RLS Policies for usage_tracking
CREATE POLICY "Users can view their own usage" ON usage_tracking
  FOR SELECT USING (customer_id = auth.uid());

-- Service role can insert usage tracking
CREATE POLICY "Service role can track usage" ON usage_tracking
  FOR INSERT WITH CHECK (true);

-- RLS Policies for customer_projects
CREATE POLICY "Users can view their own projects" ON customer_projects
  FOR SELECT USING (customer_id = auth.uid());

CREATE POLICY "Service role can manage projects" ON customer_projects
  FOR ALL USING (true);

-- RLS Policies for deployment_history
CREATE POLICY "Users can view their own deployments" ON deployment_history
  FOR SELECT USING (customer_id = auth.uid());

CREATE POLICY "Service role can manage deployments" ON deployment_history
  FOR ALL USING (true);

-- Function to clean up expired API keys
CREATE OR REPLACE FUNCTION cleanup_expired_api_keys()
RETURNS void AS $$
BEGIN
  UPDATE api_keys 
  SET is_active = false 
  WHERE expires_at < NOW() AND is_active = true;
END;
$$ LANGUAGE plpgsql;

-- Function to get monthly usage stats
CREATE OR REPLACE FUNCTION get_monthly_usage(p_customer_id UUID, p_usage_type TEXT)
RETURNS INTEGER AS $$
DECLARE
  v_count INTEGER;
BEGIN
  SELECT COALESCE(SUM(count), 0)::INTEGER INTO v_count
  FROM usage_tracking
  WHERE customer_id = p_customer_id
    AND usage_type = p_usage_type
    AND created_at >= date_trunc('month', CURRENT_DATE)
    AND created_at < date_trunc('month', CURRENT_DATE) + INTERVAL '1 month';
  
  RETURN v_count;
END;
$$ LANGUAGE plpgsql;