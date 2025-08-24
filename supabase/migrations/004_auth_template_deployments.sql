-- Create table to track auth template deployments
CREATE TABLE IF NOT EXISTS auth_template_deployments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  customer_id UUID REFERENCES customers(id) ON DELETE CASCADE,
  template_type TEXT NOT NULL CHECK (template_type IN ('saas', 'marketplace', 'social', 'enterprise')),
  deployment_id UUID REFERENCES deployments(id),
  customization JSONB DEFAULT '{}',
  features TEXT[] DEFAULT '{}',
  tables_created TEXT[] DEFAULT '{}',
  deployed_at TIMESTAMPTZ DEFAULT NOW(),
  deployed_by UUID REFERENCES auth.users(id),
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'deprecated', 'failed')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes
CREATE INDEX idx_auth_template_deployments_project ON auth_template_deployments(project_id);
CREATE INDEX idx_auth_template_deployments_customer ON auth_template_deployments(customer_id);
CREATE INDEX idx_auth_template_deployments_template ON auth_template_deployments(template_type);
CREATE INDEX idx_auth_template_deployments_status ON auth_template_deployments(status);

-- Enable RLS
ALTER TABLE auth_template_deployments ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Customers can view their own template deployments" ON auth_template_deployments
  FOR SELECT USING (
    customer_id IN (
      SELECT id FROM customers WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Service role can manage all template deployments" ON auth_template_deployments
  FOR ALL USING (auth.jwt()->>'role' = 'service_role');

-- Add trigger to update updated_at
CREATE OR REPLACE FUNCTION update_auth_template_deployments_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_auth_template_deployments_updated_at
  BEFORE UPDATE ON auth_template_deployments
  FOR EACH ROW
  EXECUTE FUNCTION update_auth_template_deployments_updated_at();