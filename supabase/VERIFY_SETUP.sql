-- ============================================
-- VERIFY EASBASE SETUP
-- Run this to check if all tables were created
-- ============================================

-- Check all tables
SELECT 
  table_name,
  CASE 
    WHEN table_name IN (
      'user_profiles',
      'organizations',
      'organization_members',
      'customer_projects',
      'project_schemas',
      'project_features',
      'api_usage',
      'project_templates',
      'project_deployments',
      'subscriptions',
      'usage_records',
      'activity_logs',
      'email_logs',
      'contact_submissions'
    ) THEN '✅ Core Table'
    ELSE '📦 Other Table'
  END as table_type
FROM information_schema.tables
WHERE table_schema = 'public'
ORDER BY 
  CASE 
    WHEN table_name IN (
      'user_profiles',
      'organizations',
      'organization_members',
      'customer_projects',
      'project_schemas',
      'project_features',
      'api_usage',
      'project_templates',
      'project_deployments',
      'subscriptions',
      'usage_records',
      'activity_logs',
      'email_logs',
      'contact_submissions'
    ) THEN 0
    ELSE 1
  END,
  table_name;

-- Count tables
SELECT 
  COUNT(*) as total_tables,
  SUM(CASE WHEN table_name IN (
    'user_profiles',
    'organizations',
    'organization_members',
    'customer_projects',
    'project_schemas',
    'project_features',
    'api_usage',
    'project_templates',
    'project_deployments',
    'subscriptions',
    'usage_records',
    'activity_logs',
    'email_logs',
    'contact_submissions'
  ) THEN 1 ELSE 0 END) as easbase_tables
FROM information_schema.tables
WHERE table_schema = 'public';

-- Check RLS is enabled
SELECT 
  schemaname,
  tablename,
  CASE 
    WHEN rowsecurity = true THEN '✅ RLS Enabled'
    ELSE '❌ RLS Disabled'
  END as rls_status
FROM pg_tables
WHERE schemaname = 'public'
AND tablename IN (
  'user_profiles',
  'organizations',
  'organization_members',
  'customer_projects',
  'project_schemas',
  'project_features',
  'api_usage',
  'project_deployments',
  'subscriptions',
  'usage_records',
  'activity_logs',
  'email_logs',
  'contact_submissions'
)
ORDER BY tablename;

-- Check if project templates were inserted
SELECT 
  name,
  business_type,
  description
FROM project_templates
ORDER BY name;

-- Check if there are any users who need profiles created
SELECT 
  u.id,
  u.email,
  CASE 
    WHEN p.id IS NULL THEN '❌ Missing Profile'
    ELSE '✅ Has Profile'
  END as profile_status
FROM auth.users u
LEFT JOIN user_profiles p ON u.id = p.id
ORDER BY u.created_at DESC
LIMIT 10;