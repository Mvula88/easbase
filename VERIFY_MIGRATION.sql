-- ============================================
-- VERIFY MIGRATION SUCCESS
-- Run these queries to confirm everything is set up
-- ============================================

-- 1. Check if all tables were created
SELECT table_name, 
       CASE 
         WHEN table_name IS NOT NULL THEN '✅ Created'
         ELSE '❌ Missing'
       END as status
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN (
  'notifications', 
  'support_tickets', 
  'two_factor_backup_codes', 
  'api_keys'
)
ORDER BY table_name;

-- 2. Check if user_profiles has 2FA columns
SELECT column_name,
       data_type,
       CASE 
         WHEN column_name IS NOT NULL THEN '✅ Added'
         ELSE '❌ Missing'
       END as status
FROM information_schema.columns 
WHERE table_name = 'user_profiles' 
AND column_name IN (
  'two_factor_enabled',
  'two_factor_secret', 
  'two_factor_temp_secret'
);

-- 3. Check Row Level Security is enabled
SELECT tablename, 
       rowsecurity,
       CASE 
         WHEN rowsecurity = true THEN '✅ RLS Enabled'
         ELSE '❌ RLS Disabled'
       END as security_status
FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename IN (
  'notifications',
  'support_tickets', 
  'two_factor_backup_codes',
  'api_keys'
);

-- 4. Count policies for each table
SELECT schemaname, 
       tablename, 
       COUNT(*) as policy_count,
       CASE 
         WHEN COUNT(*) > 0 THEN '✅ Has Policies'
         ELSE '⚠️ No Policies'
       END as policy_status
FROM pg_policies 
WHERE schemaname = 'public' 
AND tablename IN (
  'notifications',
  'support_tickets',
  'two_factor_backup_codes',
  'api_keys'
)
GROUP BY schemaname, tablename
ORDER BY tablename;

-- 5. Quick test: Check if you can insert a test notification (will be rolled back)
-- This tests if the table structure is correct
DO $$
DECLARE
  test_user_id UUID;
BEGIN
  -- Get first user ID for testing (or use a specific one)
  SELECT id INTO test_user_id FROM auth.users LIMIT 1;
  
  IF test_user_id IS NOT NULL THEN
    -- Try to insert
    INSERT INTO public.notifications (user_id, type, title, message)
    VALUES (test_user_id, 'info', 'Test', 'Migration test')
    RETURNING id;
    
    -- Immediately delete it
    DELETE FROM public.notifications WHERE title = 'Test' AND message = 'Migration test';
    
    RAISE NOTICE '✅ Notifications table is working correctly';
  ELSE
    RAISE NOTICE '⚠️ No users found for testing';
  END IF;
EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE '❌ Error testing notifications table: %', SQLERRM;
END $$;