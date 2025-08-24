-- =====================================================
-- OPTIONAL CLEANUP SCRIPT
-- Run this ONLY if you want to remove old AI schema generation tables
-- These tables are not needed for Backend-in-a-Box
-- =====================================================

-- WARNING: This will permanently delete these tables and their data!
-- Make sure you have backups if you need any of this data

-- Drop old AI schema generation specific tables
DROP TABLE IF EXISTS schema_generations CASCADE;
DROP TABLE IF EXISTS cache CASCADE;
DROP TABLE IF EXISTS schema_versions CASCADE;
DROP TABLE IF EXISTS auth_templates CASCADE; -- Optional: keep if you want auth templates
DROP TABLE IF EXISTS auth_template_deployments CASCADE;
DROP TABLE IF EXISTS health_check CASCADE;

-- Drop old projects table if not using project-based organization
-- Only drop if you're using organizations instead
-- DROP TABLE IF EXISTS projects CASCADE;

-- Drop webhooks if not using (you might want to keep this for the future)
-- DROP TABLE IF EXISTS webhooks CASCADE;

-- Drop the vector extension if not using embeddings
-- DROP EXTENSION IF EXISTS vector CASCADE;

-- Drop old functions related to AI features
DROP FUNCTION IF EXISTS find_similar_schemas CASCADE;
DROP FUNCTION IF EXISTS exec_sql CASCADE; -- Be careful, might be needed

-- Clean up old indexes that reference dropped tables
-- These will be automatically dropped with CASCADE, but listing for clarity

-- =====================================================
-- TABLES TO DEFINITELY KEEP
-- =====================================================
-- ✅ user_profiles - User management
-- ✅ organizations - Team organizations
-- ✅ organization_members - Team members
-- ✅ organization_invitations - Team invites
-- ✅ email_logs - Email tracking
-- ✅ sms_logs - SMS/OTP tracking
-- ✅ otp_verifications - OTP codes
-- ✅ storage_logs - File tracking
-- ✅ usage_logs - Billing usage
-- ✅ auth_configurations - Auth settings
-- ✅ api_keys - API access
-- ✅ activity_logs - Audit trail
-- ✅ storage_access_logs - Bandwidth tracking

-- =====================================================
-- VERIFICATION QUERY
-- Run this to see what tables you have after cleanup
-- =====================================================
/*
SELECT table_name, 
       CASE 
         WHEN table_name IN (
           'user_profiles', 'organizations', 'organization_members',
           'organization_invitations', 'email_logs', 'sms_logs',
           'otp_verifications', 'storage_logs', 'usage_logs',
           'auth_configurations', 'api_keys', 'activity_logs',
           'storage_access_logs'
         ) THEN '✅ KEEP - Backend-in-a-Box'
         WHEN table_name IN (
           'schema_generations', 'cache', 'schema_versions',
           'auth_templates', 'auth_template_deployments', 'health_check'
         ) THEN '❌ REMOVE - AI Schema Gen'
         ELSE '❓ Review'
       END as status
FROM information_schema.tables
WHERE table_schema = 'public'
ORDER BY status, table_name;
*/