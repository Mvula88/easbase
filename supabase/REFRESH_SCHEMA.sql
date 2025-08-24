-- Refresh Supabase schema cache
-- Run this to make new columns available immediately

-- Force schema cache refresh by calling reload_schema_cache
NOTIFY pgrst, 'reload schema';

-- Verify the new columns exist
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'user_profiles' 
AND column_name IN ('team_size', 'use_case', 'role', 'goals', 'onboarding_completed', 'onboarding_completed_at')
ORDER BY column_name;