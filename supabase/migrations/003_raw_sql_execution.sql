-- Create a function to execute raw SQL (requires service role key)
-- This function should be used with extreme caution and proper validation

CREATE OR REPLACE FUNCTION execute_raw_sql(sql text)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  result json;
BEGIN
  -- Only allow execution with service role
  IF current_setting('request.jwt.claims', true)::json->>'role' != 'service_role' THEN
    RAISE EXCEPTION 'Unauthorized: Service role required';
  END IF;

  -- Log the execution attempt
  INSERT INTO deployment_logs (
    executed_at,
    sql_statement,
    executed_by
  ) VALUES (
    NOW(),
    sql,
    current_setting('request.jwt.claims', true)::json->>'sub'
  );

  -- Execute the SQL and return result
  BEGIN
    EXECUTE sql;
    result := json_build_object(
      'success', true,
      'message', 'SQL executed successfully'
    );
  EXCEPTION WHEN OTHERS THEN
    -- Log the error
    INSERT INTO deployment_errors (
      occurred_at,
      sql_statement,
      error_message,
      error_detail
    ) VALUES (
      NOW(),
      sql,
      SQLERRM,
      SQLSTATE
    );
    
    -- Return error
    result := json_build_object(
      'success', false,
      'error', SQLERRM,
      'detail', SQLSTATE
    );
  END;

  RETURN result;
END;
$$;

-- Create tables for logging
CREATE TABLE IF NOT EXISTS deployment_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  executed_at TIMESTAMPTZ NOT NULL,
  sql_statement TEXT NOT NULL,
  executed_by UUID,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS deployment_errors (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  occurred_at TIMESTAMPTZ NOT NULL,
  sql_statement TEXT NOT NULL,
  error_message TEXT NOT NULL,
  error_detail TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create RLS policies for the logging tables
ALTER TABLE deployment_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE deployment_errors ENABLE ROW LEVEL SECURITY;

-- Only service role can view logs
CREATE POLICY "Service role can view deployment logs" ON deployment_logs
  FOR ALL
  USING (auth.jwt()->>'role' = 'service_role');

CREATE POLICY "Service role can view deployment errors" ON deployment_errors
  FOR ALL
  USING (auth.jwt()->>'role' = 'service_role');

-- Grant necessary permissions
GRANT EXECUTE ON FUNCTION execute_raw_sql TO service_role;
GRANT ALL ON deployment_logs TO service_role;
GRANT ALL ON deployment_errors TO service_role;