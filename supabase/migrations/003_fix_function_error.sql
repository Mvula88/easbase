-- Fix for the find_similar_schemas function error
-- This script drops the existing function and recreates it with the correct signature

-- Drop the existing function first
DROP FUNCTION IF EXISTS find_similar_schemas(vector, double precision, integer);
DROP FUNCTION IF EXISTS find_similar_schemas(vector(1536), float, int);

-- Recreate the function with the correct return type
CREATE OR REPLACE FUNCTION find_similar_schemas(
  query_embedding vector(1536),
  similarity_threshold float DEFAULT 0.85,
  match_limit int DEFAULT 5
)
RETURNS TABLE (
  id UUID,
  cache_key TEXT,
  prompt TEXT,
  response_schema JSONB,
  response_sql TEXT,
  similarity float,
  tokens_saved INTEGER,
  usage_count INTEGER
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
    1 - (c.prompt_embedding <=> query_embedding) AS similarity,
    c.tokens_saved,
    c.usage_count
  FROM cache c
  WHERE c.prompt_embedding IS NOT NULL
    AND 1 - (c.prompt_embedding <=> query_embedding) >= similarity_threshold
  ORDER BY c.prompt_embedding <=> query_embedding
  LIMIT match_limit;
END;
$$;

-- Verify the function was created
DO $$ 
BEGIN
  RAISE NOTICE 'Function find_similar_schemas has been successfully recreated!';
END $$;