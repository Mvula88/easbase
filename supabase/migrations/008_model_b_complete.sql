-- Migration for Model B: Complete Reseller Implementation
-- This adds all missing columns and tables for automatic Supabase project provisioning

-- Add missing columns to projects table for Model B
ALTER TABLE public.projects 
ADD COLUMN IF NOT EXISTS supabase_project_id TEXT UNIQUE,
ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'pending',
ADD COLUMN IF NOT EXISTS plan TEXT DEFAULT 'free',
ADD COLUMN IF NOT EXISTS region TEXT DEFAULT 'us-east-1',
ADD COLUMN IF NOT EXISTS suspended_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS reactivated_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS upgraded_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS provisioned_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS last_health_check TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS database_url TEXT,
ADD COLUMN IF NOT EXISTS jwt_secret TEXT;

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_projects_supabase_id ON public.projects(supabase_project_id);
CREATE INDEX IF NOT EXISTS idx_projects_status ON public.projects(status);
CREATE INDEX IF NOT EXISTS idx_projects_customer_id ON public.projects(customer_id);

-- Project provisioning queue (for async provisioning)
CREATE TABLE IF NOT EXISTS public.provisioning_queue (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  customer_id UUID NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
  action TEXT NOT NULL, -- 'create', 'delete', 'suspend', 'resume'
  status TEXT DEFAULT 'pending', -- 'pending', 'processing', 'completed', 'failed'
  metadata JSONB,
  attempts INTEGER DEFAULT 0,
  max_attempts INTEGER DEFAULT 3,
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  next_retry_at TIMESTAMPTZ
);

-- Supabase billing tracking (to track our costs)
CREATE TABLE IF NOT EXISTS public.supabase_billing (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE,
  customer_id UUID REFERENCES public.customers(id) ON DELETE CASCADE,
  billing_period_start DATE NOT NULL,
  billing_period_end DATE NOT NULL,
  base_cost DECIMAL(10,2) DEFAULT 0, -- What we pay Supabase
  customer_price DECIMAL(10,2) DEFAULT 0, -- What customer pays us
  profit DECIMAL(10,2) GENERATED ALWAYS AS (customer_price - base_cost) STORED,
  status TEXT DEFAULT 'pending', -- 'pending', 'paid', 'overdue'
  supabase_invoice_id TEXT,
  stripe_invoice_id TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Project health monitoring
CREATE TABLE IF NOT EXISTS public.project_health (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  status TEXT NOT NULL, -- 'healthy', 'degraded', 'down'
  database_size_mb INTEGER,
  storage_used_mb INTEGER,
  bandwidth_used_gb DECIMAL(10,2),
  api_calls_count INTEGER,
  error_rate DECIMAL(5,2),
  response_time_ms INTEGER,
  checked_at TIMESTAMPTZ DEFAULT NOW()
);

-- Customer notifications (for project status updates)
CREATE TABLE IF NOT EXISTS public.customer_notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  customer_id UUID NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
  project_id UUID REFERENCES public.projects(id) ON DELETE SET NULL,
  type TEXT NOT NULL, -- 'project_ready', 'project_suspended', 'payment_failed', etc.
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  read_at TIMESTAMPTZ
);

-- API keys for customer authentication (no Supabase exposure)
CREATE TABLE IF NOT EXISTS public.customer_api_keys (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  customer_id UUID NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
  project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE,
  key_hash TEXT NOT NULL, -- Store hashed version
  key_prefix TEXT NOT NULL, -- First 8 chars for identification
  name TEXT,
  last_used_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  revoked_at TIMESTAMPTZ
);

-- Project templates for quick setup
CREATE TABLE IF NOT EXISTS public.project_templates (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  description TEXT,
  category TEXT NOT NULL, -- 'saas', 'marketplace', 'social', 'enterprise'
  schema_sql TEXT NOT NULL,
  seed_sql TEXT,
  features JSONB,
  estimated_cost DECIMAL(10,2),
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insert default templates
INSERT INTO public.project_templates (name, slug, category, description, schema_sql, features, estimated_cost)
VALUES 
  ('SaaS Starter', 'saas-starter', 'saas', 'Multi-tenant SaaS application template', 
   '-- SaaS schema here', 
   '["Multi-tenancy", "User management", "Billing", "API"]'::jsonb, 
   25.00),
  ('Marketplace', 'marketplace', 'marketplace', 'E-commerce marketplace template',
   '-- Marketplace schema here',
   '["Vendors", "Products", "Orders", "Payments"]'::jsonb,
   25.00),
  ('Social Network', 'social-network', 'social', 'Social networking platform template',
   '-- Social schema here',
   '["Profiles", "Posts", "Following", "Messaging"]'::jsonb,
   25.00)
ON CONFLICT (slug) DO NOTHING;

-- RLS Policies for Model B tables
ALTER TABLE public.provisioning_queue ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.supabase_billing ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_health ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customer_notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customer_api_keys ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_templates ENABLE ROW LEVEL SECURITY;

-- Policies for customer access (they can only see their own data)
CREATE POLICY "Customers can view own notifications" ON public.customer_notifications
  FOR SELECT USING (auth.uid() = customer_id);

CREATE POLICY "Customers can update own notifications" ON public.customer_notifications
  FOR UPDATE USING (auth.uid() = customer_id);

CREATE POLICY "Customers can view own API keys" ON public.customer_api_keys
  FOR SELECT USING (auth.uid() = customer_id);

CREATE POLICY "Customers can view own billing" ON public.supabase_billing
  FOR SELECT USING (auth.uid() = customer_id);

CREATE POLICY "Anyone can view active templates" ON public.project_templates
  FOR SELECT USING (is_active = true);

-- Function to handle automatic project provisioning on signup
CREATE OR REPLACE FUNCTION public.queue_project_provisioning()
RETURNS TRIGGER AS $$
BEGIN
  -- When a new customer is created, queue project provisioning
  INSERT INTO public.provisioning_queue (
    customer_id,
    action,
    metadata
  ) VALUES (
    NEW.id,
    'create',
    jsonb_build_object(
      'email', NEW.email,
      'plan', NEW.subscription_tier,
      'template', 'saas-starter'
    )
  );
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for automatic provisioning
DROP TRIGGER IF EXISTS on_customer_created_provision ON public.customers;
CREATE TRIGGER on_customer_created_provision
  AFTER INSERT ON public.customers
  FOR EACH ROW
  EXECUTE FUNCTION public.queue_project_provisioning();

-- Function to calculate monthly costs
CREATE OR REPLACE FUNCTION public.calculate_monthly_costs()
RETURNS TABLE (
  total_revenue DECIMAL,
  total_supabase_cost DECIMAL,
  total_profit DECIMAL,
  active_projects BIGINT,
  suspended_projects BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COALESCE(SUM(CASE WHEN p.status = 'active' THEN 
      CASE c.subscription_tier
        WHEN 'starter' THEN 99.00
        WHEN 'growth' THEN 299.00
        WHEN 'enterprise' THEN 999.00
        ELSE 0
      END
    ELSE 0 END), 0) as total_revenue,
    COALESCE(SUM(CASE WHEN p.status = 'active' THEN 
      CASE p.plan
        WHEN 'pro' THEN 25.00
        ELSE 0
      END
    ELSE 0 END), 0) as total_supabase_cost,
    COALESCE(SUM(CASE WHEN p.status = 'active' THEN 
      CASE c.subscription_tier
        WHEN 'starter' THEN 74.00  -- 99 - 25
        WHEN 'growth' THEN 274.00  -- 299 - 25
        WHEN 'enterprise' THEN 974.00  -- 999 - 25
        ELSE 0
      END
    ELSE 0 END), 0) as total_profit,
    COUNT(CASE WHEN p.status = 'active' THEN 1 END) as active_projects,
    COUNT(CASE WHEN p.status = 'suspended' THEN 1 END) as suspended_projects
  FROM public.customers c
  LEFT JOIN public.projects p ON c.id = p.customer_id;
END;
$$ LANGUAGE plpgsql;

-- Create a view for easy monitoring
CREATE OR REPLACE VIEW public.platform_metrics AS
SELECT * FROM public.calculate_monthly_costs();

-- Grant appropriate permissions
GRANT SELECT ON public.platform_metrics TO authenticated;

COMMENT ON TABLE public.provisioning_queue IS 'Queue for asynchronous Supabase project provisioning';
COMMENT ON TABLE public.supabase_billing IS 'Track Supabase costs vs customer revenue for profit calculation';
COMMENT ON TABLE public.project_health IS 'Monitor health and usage of customer Supabase projects';
COMMENT ON TABLE public.customer_notifications IS 'In-app notifications for customers about their projects';
COMMENT ON TABLE public.customer_api_keys IS 'API keys for customers to access their projects without seeing Supabase';
COMMENT ON TABLE public.project_templates IS 'Pre-built database templates for quick project setup';
COMMENT ON VIEW public.platform_metrics IS 'Real-time platform revenue and cost metrics';