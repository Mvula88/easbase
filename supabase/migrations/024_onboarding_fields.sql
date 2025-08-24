-- Add onboarding fields to user_profiles table
ALTER TABLE user_profiles 
ADD COLUMN IF NOT EXISTS team_size TEXT DEFAULT '1-5',
ADD COLUMN IF NOT EXISTS use_case TEXT,
ADD COLUMN IF NOT EXISTS role TEXT,
ADD COLUMN IF NOT EXISTS goals JSONB DEFAULT '[]',
ADD COLUMN IF NOT EXISTS onboarding_completed BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS onboarding_completed_at TIMESTAMPTZ;