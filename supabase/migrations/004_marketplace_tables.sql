-- Marketplace Tables Migration

-- Template Purchases
CREATE TABLE IF NOT EXISTS template_purchases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  template_id TEXT NOT NULL,
  template_name TEXT NOT NULL,
  price DECIMAL(10,2) NOT NULL,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'failed', 'refunded')),
  stripe_session_id TEXT UNIQUE,
  stripe_payment_intent TEXT,
  completed_at TIMESTAMPTZ,
  failed_at TIMESTAMPTZ,
  failure_reason TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- User Templates (Templates owned by users)
CREATE TABLE IF NOT EXISTS user_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  template_id TEXT NOT NULL,
  template_name TEXT NOT NULL,
  purchased_at TIMESTAMPTZ DEFAULT NOW(),
  access_level TEXT DEFAULT 'full',
  UNIQUE(user_id, template_id)
);

-- Template Deployments
CREATE TABLE IF NOT EXISTS template_deployments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  template_id TEXT NOT NULL,
  backend_id UUID,
  project_name TEXT NOT NULL,
  deployed_at TIMESTAMPTZ DEFAULT NOW(),
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'paused', 'deleted'))
);

-- Revenue Tracking
CREATE TABLE IF NOT EXISTS revenue_tracking (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type TEXT NOT NULL CHECK (type IN ('template_sale', 'subscription', 'ai_generation')),
  amount DECIMAL(10,2) NOT NULL,
  platform_revenue DECIMAL(10,2) NOT NULL,
  author_revenue DECIMAL(10,2),
  template_id TEXT,
  user_id UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Template Stats (for tracking popularity)
CREATE TABLE IF NOT EXISTS template_stats (
  template_id TEXT PRIMARY KEY,
  total_sales INTEGER DEFAULT 0,
  total_revenue DECIMAL(10,2) DEFAULT 0,
  last_sold_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX idx_template_purchases_user_id ON template_purchases(user_id);
CREATE INDEX idx_template_purchases_status ON template_purchases(status);
CREATE INDEX idx_user_templates_user_id ON user_templates(user_id);
CREATE INDEX idx_template_deployments_user_id ON template_deployments(user_id);
CREATE INDEX idx_revenue_tracking_type ON revenue_tracking(type);
CREATE INDEX idx_revenue_tracking_created_at ON revenue_tracking(created_at);

-- RLS Policies
ALTER TABLE template_purchases ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE template_deployments ENABLE ROW LEVEL SECURITY;
ALTER TABLE revenue_tracking ENABLE ROW LEVEL SECURITY;
ALTER TABLE template_stats ENABLE ROW LEVEL SECURITY;

-- Users can view their own purchases
CREATE POLICY "Users can view own purchases" ON template_purchases
  FOR SELECT
  USING (user_id = auth.uid());

-- Users can view their own templates
CREATE POLICY "Users can view own templates" ON user_templates
  FOR SELECT
  USING (user_id = auth.uid());

-- Users can view their own deployments
CREATE POLICY "Users can view own deployments" ON template_deployments
  FOR SELECT
  USING (user_id = auth.uid());

-- Public can view template stats (for popularity display)
CREATE POLICY "Public can view template stats" ON template_stats
  FOR SELECT
  USING (true);

-- Only service role can update stats
CREATE POLICY "Service role can update stats" ON template_stats
  FOR ALL
  TO service_role
  USING (true);

-- Function to increment template sales
CREATE OR REPLACE FUNCTION increment_template_sales(
  p_template_id TEXT
)
RETURNS VOID AS $$
BEGIN
  INSERT INTO template_stats (template_id, total_sales, last_sold_at)
  VALUES (p_template_id, 1, NOW())
  ON CONFLICT (template_id) DO UPDATE
  SET 
    total_sales = template_stats.total_sales + 1,
    last_sold_at = NOW(),
    updated_at = NOW();
END;
$$ LANGUAGE plpgsql;

-- Function to get user's available templates count
CREATE OR REPLACE FUNCTION get_user_templates_count(p_user_id UUID)
RETURNS INTEGER AS $$
  SELECT COUNT(*)::INTEGER
  FROM user_templates
  WHERE user_id = p_user_id;
$$ LANGUAGE sql;

-- Function to check if user owns template
CREATE OR REPLACE FUNCTION user_owns_template(
  p_user_id UUID,
  p_template_id TEXT
)
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1
    FROM user_templates
    WHERE user_id = p_user_id AND template_id = p_template_id
  );
$$ LANGUAGE sql;