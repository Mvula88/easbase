-- Create customer_backends table
CREATE TABLE IF NOT EXISTS customer_backends (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  project_id TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'paused', 'deleted')),
  plan TEXT NOT NULL DEFAULT 'free' CHECK (plan IN ('free', 'pro', 'enterprise')),
  
  -- Endpoints configuration
  endpoints JSONB NOT NULL DEFAULT '{}'::jsonb,
  
  -- API Credentials (encrypted in production)
  credentials JSONB NOT NULL DEFAULT '{}'::jsonb,
  
  -- Usage tracking
  usage JSONB NOT NULL DEFAULT '{"database": 0, "storage": 0, "bandwidth": 0, "requests": 0}'::jsonb,
  
  -- Plan limits
  limits JSONB NOT NULL DEFAULT '{"database": 500, "storage": 1024, "bandwidth": 2048, "requests": 50000}'::jsonb,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  deleted_at TIMESTAMPTZ,
  
  -- Indexes
  CONSTRAINT unique_customer_project UNIQUE(customer_id, project_id)
);

-- Create indexes for performance
CREATE INDEX idx_customer_backends_customer_id ON customer_backends(customer_id);
CREATE INDEX idx_customer_backends_project_id ON customer_backends(project_id);
CREATE INDEX idx_customer_backends_status ON customer_backends(status);
CREATE INDEX idx_customer_backends_credentials_keys ON customer_backends USING GIN ((credentials->'anonKey'), (credentials->'serviceRoleKey'));

-- Create API usage logs table
CREATE TABLE IF NOT EXISTS api_usage_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  backend_id UUID NOT NULL REFERENCES customer_backends(id) ON DELETE CASCADE,
  method TEXT NOT NULL,
  path TEXT NOT NULL,
  response_time_ms INTEGER,
  status_code INTEGER,
  timestamp TIMESTAMPTZ DEFAULT NOW()
);

-- Create index for efficient queries
CREATE INDEX idx_api_usage_logs_backend_id ON api_usage_logs(backend_id);
CREATE INDEX idx_api_usage_logs_timestamp ON api_usage_logs(timestamp);

-- Create function to increment API usage
CREATE OR REPLACE FUNCTION increment_api_usage(
  backend_id UUID,
  request_count INTEGER DEFAULT 1
)
RETURNS VOID AS $$
BEGIN
  UPDATE customer_backends
  SET 
    usage = jsonb_set(
      usage,
      '{requests}',
      to_jsonb((usage->>'requests')::integer + request_count)
    ),
    updated_at = NOW()
  WHERE id = backend_id;
END;
$$ LANGUAGE plpgsql;

-- Create function to reset monthly usage
CREATE OR REPLACE FUNCTION reset_monthly_usage()
RETURNS VOID AS $$
BEGIN
  UPDATE customer_backends
  SET 
    usage = jsonb_set(
      jsonb_set(
        jsonb_set(
          jsonb_set(usage, '{database}', '0'),
          '{storage}', '0'
        ),
        '{bandwidth}', '0'
      ),
      '{requests}', '0'
    ),
    updated_at = NOW()
  WHERE status = 'active';
END;
$$ LANGUAGE plpgsql;

-- Create RLS policies
ALTER TABLE customer_backends ENABLE ROW LEVEL SECURITY;

-- Customers can only see their own backends
CREATE POLICY "Customers can view own backends" ON customer_backends
  FOR SELECT
  USING (customer_id = auth.uid());

-- Customers can create backends (with limits checked in application)
CREATE POLICY "Customers can create backends" ON customer_backends
  FOR INSERT
  WITH CHECK (customer_id = auth.uid());

-- Customers can update their own backends
CREATE POLICY "Customers can update own backends" ON customer_backends
  FOR UPDATE
  USING (customer_id = auth.uid());

-- Customers can delete their own backends
CREATE POLICY "Customers can delete own backends" ON customer_backends
  FOR DELETE
  USING (customer_id = auth.uid());

-- RLS for api_usage_logs
ALTER TABLE api_usage_logs ENABLE ROW LEVEL SECURITY;

-- Only allow inserts through service role
CREATE POLICY "Service role can insert usage logs" ON api_usage_logs
  FOR INSERT
  TO service_role
  WITH CHECK (true);

-- Customers can view logs for their backends
CREATE POLICY "Customers can view own usage logs" ON api_usage_logs
  FOR SELECT
  USING (
    backend_id IN (
      SELECT id FROM customer_backends WHERE customer_id = auth.uid()
    )
  );