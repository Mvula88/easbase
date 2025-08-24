-- Run this FIRST in Supabase SQL Editor before running the main migration
-- This enables the required PostgreSQL extensions

-- Enable UUID generation
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Enable cryptographic functions
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Enable vector similarity search (CRITICAL for AI caching)
-- If this fails, go to Database → Extensions in Supabase Dashboard and enable "vector" manually
CREATE EXTENSION IF NOT EXISTS "vector";

-- Verify extensions are enabled
SELECT 
    extname, 
    extversion 
FROM pg_extension 
WHERE extname IN ('uuid-ossp', 'pgcrypto', 'vector');
