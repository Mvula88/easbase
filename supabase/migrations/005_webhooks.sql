-- Webhook subscriptions table
CREATE TABLE IF NOT EXISTS webhook_subscriptions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  customer_id UUID REFERENCES customers(id) ON DELETE CASCADE,
  url TEXT NOT NULL,
  events TEXT[] NOT NULL,
  secret TEXT NOT NULL,
  headers JSONB DEFAULT '{}',
  active BOOLEAN DEFAULT true,
  last_triggered_at TIMESTAMPTZ,
  failure_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Webhook events table
CREATE TABLE IF NOT EXISTS webhook_events (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  type TEXT NOT NULL,
  customer_id UUID REFERENCES customers(id) ON DELETE CASCADE,
  payload JSONB NOT NULL,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'delivered', 'failed')),
  error TEXT,
  timestamp TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Webhook deliveries table (tracks individual delivery attempts)
CREATE TABLE IF NOT EXISTS webhook_deliveries (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  event_id UUID REFERENCES webhook_events(id) ON DELETE CASCADE,
  subscription_id UUID REFERENCES webhook_subscriptions(id) ON DELETE CASCADE,
  attempt INTEGER NOT NULL,
  status_code INTEGER,
  success BOOLEAN DEFAULT false,
  response_body TEXT,
  error TEXT,
  delivered_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes
CREATE INDEX idx_webhook_subscriptions_customer ON webhook_subscriptions(customer_id);
CREATE INDEX idx_webhook_subscriptions_active ON webhook_subscriptions(active) WHERE active = true;
CREATE INDEX idx_webhook_events_customer ON webhook_events(customer_id);
CREATE INDEX idx_webhook_events_type ON webhook_events(type);
CREATE INDEX idx_webhook_events_status ON webhook_events(status);
CREATE INDEX idx_webhook_deliveries_event ON webhook_deliveries(event_id);
CREATE INDEX idx_webhook_deliveries_subscription ON webhook_deliveries(subscription_id);

-- Enable RLS
ALTER TABLE webhook_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE webhook_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE webhook_deliveries ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Customers can manage their webhook subscriptions" ON webhook_subscriptions
  FOR ALL USING (
    customer_id IN (
      SELECT id FROM customers WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Customers can view their webhook events" ON webhook_events
  FOR SELECT USING (
    customer_id IN (
      SELECT id FROM customers WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Customers can view their webhook deliveries" ON webhook_deliveries
  FOR SELECT USING (
    subscription_id IN (
      SELECT id FROM webhook_subscriptions 
      WHERE customer_id IN (
        SELECT id FROM customers WHERE user_id = auth.uid()
      )
    )
  );

-- Service role policies
CREATE POLICY "Service role can manage all webhooks" ON webhook_subscriptions
  FOR ALL USING (auth.jwt()->>'role' = 'service_role');

CREATE POLICY "Service role can manage all events" ON webhook_events
  FOR ALL USING (auth.jwt()->>'role' = 'service_role');

CREATE POLICY "Service role can manage all deliveries" ON webhook_deliveries
  FOR ALL USING (auth.jwt()->>'role' = 'service_role');