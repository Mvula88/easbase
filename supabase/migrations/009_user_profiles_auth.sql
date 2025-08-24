-- Create user profiles table that syncs with auth.users
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  full_name TEXT,
  avatar_url TEXT,
  company_name TEXT,
  role TEXT DEFAULT 'user' CHECK (role IN ('user', 'admin', 'super_admin')),
  
  -- Subscription details
  subscription_status TEXT DEFAULT 'trialing' CHECK (subscription_status IN ('trialing', 'active', 'canceled', 'past_due', 'paused')),
  subscription_plan TEXT DEFAULT 'free' CHECK (subscription_plan IN ('free', 'starter', 'growth', 'scale', 'enterprise')),
  billing_period TEXT DEFAULT 'monthly' CHECK (billing_period IN ('monthly', 'annual')),
  stripe_customer_id TEXT UNIQUE,
  stripe_subscription_id TEXT,
  current_period_start TIMESTAMPTZ,
  current_period_end TIMESTAMPTZ,
  trial_end TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '14 days'),
  
  -- Usage tracking
  ai_generations_used INTEGER DEFAULT 0,
  ai_generations_limit INTEGER DEFAULT 100, -- Free tier default
  projects_count INTEGER DEFAULT 0,
  projects_limit INTEGER DEFAULT 1, -- Free tier default
  team_members_count INTEGER DEFAULT 1,
  team_members_limit INTEGER DEFAULT 1, -- Free tier default
  cache_hits INTEGER DEFAULT 0,
  total_requests INTEGER DEFAULT 0,
  
  -- Metadata
  onboarding_completed BOOLEAN DEFAULT false,
  email_verified BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create organizations table for team management
CREATE TABLE IF NOT EXISTS public.organizations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  owner_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  
  -- Billing (organization level)
  stripe_customer_id TEXT UNIQUE,
  stripe_subscription_id TEXT,
  subscription_plan TEXT DEFAULT 'free' CHECK (subscription_plan IN ('free', 'starter', 'growth', 'scale', 'enterprise')),
  billing_period TEXT DEFAULT 'monthly' CHECK (billing_period IN ('monthly', 'annual')),
  
  -- Settings
  settings JSONB DEFAULT '{}',
  metadata JSONB DEFAULT '{}',
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create team members table
CREATE TABLE IF NOT EXISTS public.team_members (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  role TEXT DEFAULT 'member' CHECK (role IN ('owner', 'admin', 'member', 'viewer')),
  invited_by UUID REFERENCES public.profiles(id),
  invited_at TIMESTAMPTZ DEFAULT NOW(),
  joined_at TIMESTAMPTZ,
  
  UNIQUE(organization_id, user_id)
);

-- Create activity log for audit trail
CREATE TABLE IF NOT EXISTS public.activity_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE,
  action TEXT NOT NULL,
  resource_type TEXT,
  resource_id TEXT,
  metadata JSONB DEFAULT '{}',
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_profiles_email ON public.profiles(email);
CREATE INDEX IF NOT EXISTS idx_profiles_stripe_customer ON public.profiles(stripe_customer_id);
CREATE INDEX IF NOT EXISTS idx_organizations_owner ON public.organizations(owner_id);
CREATE INDEX IF NOT EXISTS idx_organizations_slug ON public.organizations(slug);
CREATE INDEX IF NOT EXISTS idx_team_members_org ON public.team_members(organization_id);
CREATE INDEX IF NOT EXISTS idx_team_members_user ON public.team_members(user_id);
CREATE INDEX IF NOT EXISTS idx_activity_logs_user ON public.activity_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_activity_logs_org ON public.activity_logs(organization_id);
CREATE INDEX IF NOT EXISTS idx_activity_logs_created ON public.activity_logs(created_at DESC);

-- Function to handle new user registration
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, avatar_url)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    COALESCE(NEW.raw_user_meta_data->>'avatar_url', '')
  );
  
  -- Log the registration
  INSERT INTO public.activity_logs (user_id, action, resource_type, resource_id, metadata)
  VALUES (
    NEW.id,
    'user.registered',
    'user',
    NEW.id::TEXT,
    jsonb_build_object('email', NEW.email, 'provider', NEW.raw_app_meta_data->>'provider')
  );
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger for new user registration
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Function to update profile updated_at
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers for updated_at
DROP TRIGGER IF EXISTS update_profiles_updated_at ON public.profiles;
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_organizations_updated_at ON public.organizations;
CREATE TRIGGER update_organizations_updated_at
  BEFORE UPDATE ON public.organizations
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- RLS Policies
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.team_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activity_logs ENABLE ROW LEVEL SECURITY;

-- Profiles policies
CREATE POLICY "Users can view their own profile"
  ON public.profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id);

-- Organizations policies
CREATE POLICY "Users can view organizations they belong to"
  ON public.organizations FOR SELECT
  USING (
    owner_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM public.team_members
      WHERE team_members.organization_id = organizations.id
      AND team_members.user_id = auth.uid()
    )
  );

CREATE POLICY "Owners can update their organizations"
  ON public.organizations FOR UPDATE
  USING (owner_id = auth.uid());

CREATE POLICY "Users can create organizations"
  ON public.organizations FOR INSERT
  WITH CHECK (owner_id = auth.uid());

-- Team members policies
CREATE POLICY "Users can view team members in their organizations"
  ON public.team_members FOR SELECT
  USING (
    user_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM public.organizations
      WHERE organizations.id = team_members.organization_id
      AND (
        organizations.owner_id = auth.uid() OR
        EXISTS (
          SELECT 1 FROM public.team_members tm
          WHERE tm.organization_id = organizations.id
          AND tm.user_id = auth.uid()
        )
      )
    )
  );

-- Activity logs policies
CREATE POLICY "Users can view their own activity"
  ON public.activity_logs FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Users can view activity in their organizations"
  ON public.activity_logs FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.organizations
      WHERE organizations.id = activity_logs.organization_id
      AND (
        organizations.owner_id = auth.uid() OR
        EXISTS (
          SELECT 1 FROM public.team_members
          WHERE team_members.organization_id = organizations.id
          AND team_members.user_id = auth.uid()
          AND team_members.role IN ('owner', 'admin')
        )
      )
    )
  );

-- Grant permissions
GRANT ALL ON public.profiles TO authenticated;
GRANT ALL ON public.organizations TO authenticated;
GRANT ALL ON public.team_members TO authenticated;
GRANT ALL ON public.activity_logs TO authenticated;
GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO authenticated;