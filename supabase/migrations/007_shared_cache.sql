-- Shared cache table (anonymized schemas shared across customers)
CREATE TABLE IF NOT EXISTS shared_cache (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  prompt_pattern TEXT NOT NULL,
  prompt_pattern_hash TEXT UNIQUE NOT NULL,
  prompt_embedding vector(1536),
  schema_pattern JSONB NOT NULL,
  sql TEXT NOT NULL,
  categories TEXT[] DEFAULT '{}',
  contributor_id UUID REFERENCES customers(id),
  anonymized BOOLEAN DEFAULT true,
  usage_count INTEGER DEFAULT 0,
  success_rate DECIMAL(3,2) DEFAULT 1.0,
  last_used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Shared cache statistics per customer
CREATE TABLE IF NOT EXISTS shared_cache_stats (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  customer_id UUID REFERENCES customers(id) ON DELETE CASCADE,
  schemas_contributed INTEGER DEFAULT 0,
  schemas_used INTEGER DEFAULT 0,
  tokens_earned INTEGER DEFAULT 0,
  tokens_saved INTEGER DEFAULT 0,
  top_categories TEXT[] DEFAULT '{}',
  last_contribution_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(customer_id)
);

-- Add opt-in flag to customers table
ALTER TABLE customers ADD COLUMN IF NOT EXISTS share_cache_enabled BOOLEAN DEFAULT false;

-- Function to search shared cache with vector similarity
CREATE OR REPLACE FUNCTION search_shared_cache(
  query_embedding vector(1536),
  similarity_threshold float DEFAULT 0.8,
  category_filter text[] DEFAULT NULL,
  limit_count int DEFAULT 10
)
RETURNS TABLE (
  id UUID,
  prompt_pattern TEXT,
  schema_pattern JSONB,
  sql TEXT,
  categories TEXT[],
  usage_count INTEGER,
  similarity float
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    sc.id,
    sc.prompt_pattern,
    sc.schema_pattern,
    sc.sql,
    sc.categories,
    sc.usage_count,
    1 - (sc.prompt_embedding <=> query_embedding) AS similarity
  FROM shared_cache sc
  WHERE 
    (1 - (sc.prompt_embedding <=> query_embedding)) >= similarity_threshold
    AND (category_filter IS NULL OR sc.categories && category_filter)
  ORDER BY similarity DESC
  LIMIT limit_count;
END;
$$;

-- Function to add bonus tokens
CREATE OR REPLACE FUNCTION add_bonus_tokens(
  customer_id UUID,
  tokens INTEGER,
  reason TEXT
)
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
  -- Add to customer's token balance
  UPDATE customers
  SET bonus_tokens = COALESCE(bonus_tokens, 0) + tokens
  WHERE id = customer_id;
  
  -- Update statistics
  UPDATE shared_cache_stats
  SET 
    tokens_earned = COALESCE(tokens_earned, 0) + tokens,
    updated_at = NOW()
  WHERE customer_id = customer_id;
  
  -- Log the bonus
  INSERT INTO token_bonuses (customer_id, tokens, reason, created_at)
  VALUES (customer_id, tokens, reason, NOW());
END;
$$;

-- Table for tracking token bonuses
CREATE TABLE IF NOT EXISTS token_bonuses (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  customer_id UUID REFERENCES customers(id) ON DELETE CASCADE,
  tokens INTEGER NOT NULL,
  reason TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add bonus tokens column to customers
ALTER TABLE customers ADD COLUMN IF NOT EXISTS bonus_tokens INTEGER DEFAULT 0;

-- Create indexes
CREATE INDEX idx_shared_cache_pattern_hash ON shared_cache(prompt_pattern_hash);
CREATE INDEX idx_shared_cache_categories ON shared_cache USING GIN(categories);
CREATE INDEX idx_shared_cache_usage ON shared_cache(usage_count DESC);
CREATE INDEX idx_shared_cache_embedding ON shared_cache USING ivfflat (prompt_embedding vector_cosine_ops);

-- Enable RLS
ALTER TABLE shared_cache ENABLE ROW LEVEL SECURITY;
ALTER TABLE shared_cache_stats ENABLE ROW LEVEL SECURITY;
ALTER TABLE token_bonuses ENABLE ROW LEVEL SECURITY;

-- RLS Policies
-- Everyone can read shared cache (it's anonymized)
CREATE POLICY "Anyone can read shared cache" ON shared_cache
  FOR SELECT USING (true);

-- Only service role can insert/update shared cache
CREATE POLICY "Service role manages shared cache" ON shared_cache
  FOR ALL USING (auth.jwt()->>'role' = 'service_role');

-- Customers can view their own stats
CREATE POLICY "Customers can view their stats" ON shared_cache_stats
  FOR SELECT USING (
    customer_id IN (
      SELECT id FROM customers WHERE user_id = auth.uid()
    )
  );

-- Customers can view their own bonuses
CREATE POLICY "Customers can view their bonuses" ON token_bonuses
  FOR SELECT USING (
    customer_id IN (
      SELECT id FROM customers WHERE user_id = auth.uid()
    )
  );